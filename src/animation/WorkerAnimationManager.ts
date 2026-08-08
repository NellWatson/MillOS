/**
 * WorkerAnimationManager
 *
 * Centralized animation orchestrator for all workers.
 * Replaces per-worker useFrame hooks with a single manager.
 *
 * Based on v0.10.0 simple patterns with maath for smooth interpolation.
 */

import { useRef, useCallback, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { damp } from 'maath/easing';
import * as THREE from 'three';

import {
  WorkerAnimationData,
  WorkerAnimationConfig,
  WorkerPoseRefs,
  WorkerSecondarySignals,
  LODLevel,
  IdleVariation,
  DEFAULT_ANIMATION_CONFIG,
  createWorkerAnimationData,
  workerDeterministicFraction,
} from './workerAnimationTypes';
import type { WorkerWorkAction } from '../components/workers/workerTypes';
import { AnimationFeatures, GraphicsQuality, getFeaturesForQuality } from './animationFeatures';
import { positionRegistry, EntityPosition } from '../utils/positionRegistry';
import { getThrottleLevel } from '../utils/frameThrottle';
import { calculateGaitPose, getGaitParamsForState } from './gaitAnimation';

const WALK_STRIDE_METRES = 1.35;
const RUN_STRIDE_METRES = 1.7;

/** Seconds for a turn to converge; a 180 degree flip now takes ~0.4 s. */
const YAW_SMOOTH_TIME = 0.13;

/**
 * Shortest-arc exponential damping for an angle. maath's `damp` is already
 * imported here but does not wrap, so a turn from +3.0 to -3.0 rad would take
 * the long way round through zero.
 */
export function dampAngle(
  current: number,
  target: number,
  smoothTime: number,
  delta: number
): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) < 1e-5) return target;
  const alpha = 1 - Math.exp(-Math.max(0, delta) / Math.max(1e-4, smoothTime));
  return current + diff * alpha;
}

/** Shortest-arc signed error between two angles. */
function angleError(current: number, target: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

// Fire drill exit type (matches gameSimulationStore)
interface FireDrillExit {
  id: string;
  position: { x: number; z: number };
  label: string;
}

export interface ResolveWorkerLodOptions {
  quality: GraphicsQuality;
  current: LODLevel;
  distance: number;
  lodDistance: number;
  config?: Pick<
    typeof DEFAULT_ANIMATION_CONFIG,
    'lodHighThreshold' | 'lodMediumThreshold' | 'lodHysteresis'
  >;
}

/**
 * Select the lightweight first-render representation for each graphics tier.
 * Medium starts with the procedural model so the authored GLBs can stream
 * after the first useful frame, then ordinary camera-driven LOD immediately
 * promotes nearby personnel. High and Ultra retain eager close-detail models.
 */
export function getInitialWorkerLod(quality: GraphicsQuality): LODLevel {
  if (quality === 'low') return 'low';
  if (quality === 'medium') return 'medium';
  return 'high';
}

/**
 * Resolve a worker LOD with asymmetric thresholds so personnel do not pop
 * between models near a boundary. Low remains a deliberate billboard preset;
 * Medium and above may show the close model when the person is actually near.
 */
export function resolveWorkerLod({
  quality,
  current,
  distance,
  lodDistance,
  config = DEFAULT_ANIMATION_CONFIG,
}: ResolveWorkerLodOptions): LODLevel {
  if (quality === 'low') return 'low';

  const safeDistance = Number.isFinite(distance) ? Math.max(0, distance) : Number.POSITIVE_INFINITY;
  const safeLodDistance = Number.isFinite(lodDistance) && lodDistance > 0 ? lodDistance : 1;
  const highEntry = safeLodDistance * Math.max(0, config.lodHighThreshold - config.lodHysteresis);
  const highExit = safeLodDistance * (config.lodHighThreshold + config.lodHysteresis);
  const mediumEntry =
    safeLodDistance *
    Math.max(config.lodHighThreshold, config.lodMediumThreshold - config.lodHysteresis);
  const mediumExit = safeLodDistance * (config.lodMediumThreshold + config.lodHysteresis);

  if (current === 'high') {
    return safeDistance > highExit ? 'medium' : 'high';
  }
  if (current === 'medium') {
    if (safeDistance < highEntry) return 'high';
    if (safeDistance > mediumExit) return 'low';
    return 'medium';
  }
  return safeDistance < mediumEntry ? 'medium' : 'low';
}

/**
 * Worker Animation Manager Class
 * Manages animation state for all workers in a centralized loop
 */
export class WorkerAnimationManager {
  private workers: Map<string, WorkerAnimationData> = new Map();
  private config = DEFAULT_ANIMATION_CONFIG;
  private features: AnimationFeatures;
  private frameCount = 0;
  private pendingDelta = 0;
  private isTabVisible = true;
  private quality: GraphicsQuality = 'medium';
  private workerLodDistance = 100;
  private simulationActive = true;

  // Fire drill state (injected from store)
  private emergencyDrillMode = false;
  private safetyHoldActive = false;
  private getNearestExitFn: ((x: number, z: number) => FireDrillExit) | null = null;
  private markWorkerEvacuatedFn: ((id: string) => void) | null = null;

  // LOD change callbacks
  private lodChangeCallbacks: Map<string, (lod: LODLevel) => void> = new Map();

  constructor(quality: GraphicsQuality = 'medium') {
    this.quality = quality;
    this.features = getFeaturesForQuality(quality);
  }

  /**
   * Register a worker with the manager (call once on mount).
   *
   * `signals` is optional so existing two-argument callers (and the personnel
   * contract tests) keep working; when supplied it is the React-owned record
   * WorkerModel reads, and the manager mutates it in place.
   */
  register(
    config: WorkerAnimationConfig,
    refs: WorkerPoseRefs,
    signals?: WorkerSecondarySignals
  ): () => void {
    // New worker - create fresh animation data
    const data = createWorkerAnimationData(config);
    data.lodLevel = getInitialWorkerLod(this.quality);
    data.refs = refs;
    if (signals) {
      data.secondary = signals;
      signals.animationPhase = data.secondary.animationPhase || data.walkCycle;
    }

    // Set initial position on the group
    if (refs.group) {
      refs.group.position.set(...config.position);
      refs.group.rotation.y = data.currentYaw;
    }

    this.workers.set(config.id, data);

    // Return unregister function
    return () => this.unregister(config.id);
  }

  /**
   * Update refs for existing worker (for LOD changes)
   * Does NOT reset position or animation state
   */
  updateRefs(id: string, refs: WorkerPoseRefs): void {
    const data = this.workers.get(id);
    if (data) {
      // Preserve current position from old group
      const oldGroup = data.refs?.group;
      const currentPos = oldGroup ? oldGroup.position.clone() : null;
      const currentRot = oldGroup ? oldGroup.rotation.y : 0;

      // Update refs
      data.refs = refs;

      // Restore position to new group
      if (refs.group && currentPos) {
        refs.group.position.copy(currentPos);
        refs.group.rotation.y = currentRot;
      }
    }
  }

  /**
   * Unregister a worker
   */
  unregister(id: string): void {
    this.workers.delete(id);
    this.lodChangeCallbacks.delete(id);
    positionRegistry.unregister(id);
  }

  /**
   * Subscribe to LOD changes for a specific worker
   */
  onLodChange(id: string, callback: (lod: LODLevel) => void): () => void {
    this.lodChangeCallbacks.set(id, callback);
    return () => this.lodChangeCallbacks.delete(id);
  }

  /**
   * Get current LOD level for a worker
   */
  getLOD(id: string): LODLevel {
    return this.workers.get(id)?.lodLevel ?? 'high';
  }

  /**
   * Update settings from stores
   */
  updateSettings(
    isTabVisible: boolean,
    quality: GraphicsQuality,
    workerLodDistance: number,
    simulationActive: boolean,
    emergencyDrillMode: boolean,
    safetyHoldActive: boolean,
    getNearestExit: (x: number, z: number) => FireDrillExit,
    markWorkerEvacuated: (id: string) => void
  ): void {
    this.isTabVisible = isTabVisible;

    if (this.quality !== quality) {
      this.quality = quality;
      this.features = getFeaturesForQuality(quality);
    }

    this.workerLodDistance = workerLodDistance;
    this.simulationActive = simulationActive;
    this.emergencyDrillMode = emergencyDrillMode;
    this.safetyHoldActive = safetyHoldActive;
    this.getNearestExitFn = getNearestExit;
    this.markWorkerEvacuatedFn = markWorkerEvacuated;
  }

  /**
   * Update worker status (from external state)
   */
  updateWorkerStatus(id: string, status: WorkerAnimationData['status']): void {
    const data = this.workers.get(id);
    if (data) {
      data.status = status;
    }
  }

  /** Keep task-driven work gestures in sync without resetting position or gait. */
  updateWorkerAssignment(id: string, task: string, workAction: WorkerWorkAction): void {
    const data = this.workers.get(id);
    if (data) {
      data.task = task;
      data.workAction = workAction;
    }
  }

  /**
   * Reset evacuation state (when drill ends)
   */
  resetEvacuation(): void {
    this.workers.forEach((data) => {
      data.hasEvacuated = false;
      data.evacuationTarget = null;
    });
  }

  /**
   * Main update loop - called once per frame for ALL workers
   */
  update(delta: number, camera: THREE.Camera): void {
    // Skip if tab not visible
    if (!this.isTabVisible) return;

    // Throttle against this manager's own frame clock. The former shared
    // counter could stall forever when no other mounted system advanced it.
    this.pendingDelta += Math.min(delta, 0.1);
    this.frameCount += 1;
    const throttle = getThrottleLevel(this.quality);
    if (this.frameCount % throttle !== 0) return;

    // Preserve real movement speed across skipped render frames while keeping
    // a hard bound for tab resumes and debugger stalls.
    const cappedDelta = Math.min(this.pendingDelta, 0.25);
    this.pendingDelta = 0;

    // Process all workers
    this.workers.forEach((data) => {
      if (!data.refs?.group) return;

      // 1. Update LOD (throttled)
      if (this.frameCount % this.config.lodUpdateFrequency === 0) {
        this.updateLOD(data, camera);
      }

      if (!this.simulationActive && !this.emergencyDrillMode) {
        data.refs.group.position.y = 0;
        data.secondary.groundSpeed = 0;
        data.secondary.gait = 'idle';
        positionRegistry.register(
          data.id,
          data.refs.group.position.x,
          data.refs.group.position.z,
          'worker'
        );
        return;
      }

      // 2. Update position/movement. Sample before and after so the authored
      // model gets a real world ground speed instead of re-deriving it from
      // per-frame world deltas, which spike by the throttle factor because this
      // manager only advances every 2nd (high) or 3rd (medium) render frame.
      const previousX = data.refs.group.position.x;
      const previousZ = data.refs.group.position.z;
      this.updatePosition(data, cappedDelta);
      const movedX = data.refs.group.position.x - previousX;
      const movedZ = data.refs.group.position.z - previousZ;
      data.secondary.groundSpeed = cappedDelta > 0 ? Math.hypot(movedX, movedZ) / cappedDelta : 0;
      data.stateTransition = Math.min(1, data.stateTransition + cappedDelta * 4);

      // 3. Update limb animations (if not billboard LOD)
      if (data.lodLevel !== 'low') {
        this.updateLimbAnimation(data, cappedDelta);
      }

      // 4. Update Tier 2-3 features
      this.updateTier2Features(data, cappedDelta);
      if (data.lodLevel === 'high') {
        this.updateTier3Features(data, cappedDelta);
      }

      // 4b. Publish the secondary-animation channel for the authored model.
      this.updateSecondarySignals(data, cappedDelta);

      // 5. Register position in registry
      positionRegistry.register(
        data.id,
        data.refs.group.position.x,
        data.refs.group.position.z,
        'worker'
      );
    });
  }

  // =====================
  // POSITION UPDATE LOGIC
  // =====================

  private updatePosition(data: WorkerAnimationData, delta: number): void {
    if (!data.refs?.group) return;
    const group = data.refs.group;

    // Fire drill evacuation (highest priority)
    if (this.emergencyDrillMode && !data.hasEvacuated) {
      this.updateEvacuation(data, delta);
      return;
    }

    if (this.safetyHoldActive) {
      this.setAnimationState(data, 'idle');
      group.position.y = 0;
      data.isEvading = false;
      return;
    }

    // Reset evacuation target when drill ends
    if (!this.emergencyDrillMode && data.evacuationTarget) {
      data.evacuationTarget = null;
      data.hasEvacuated = false;
    }

    // Check for nearby forklifts (throttled)
    if (this.frameCount % this.config.forkliftCheckFrequency === 0) {
      this.checkForkliftProximity(data);
    }

    // Handle forklift evasion
    if (data.isEvading) {
      this.updateEvasion(data, delta);
      return;
    }

    // Handle evasion cooldown
    if (data.evadeCooldown > 0) {
      data.evadeCooldown -= delta;

      // Return to original path after cooldown
      if (data.evadeCooldown <= 0) {
        const diffX = data.baseX - group.position.x;
        if (Math.abs(diffX) > 0.1) {
          group.position.x += Math.sign(diffX) * this.config.evasionSpeed * 0.5 * delta;
        }
      }
    }

    // Resolve the heading before moving, so the turn-in slowdown below sees the
    // boundary flip on the same tick it happens rather than one tick later.
    data.targetYaw = data.direction > 0 ? 0 : Math.PI;

    // Update animation state based on status
    this.updateAnimationState(data, delta);

    // Movement based on state
    switch (data.currentState) {
      case 'idle':
        this.updateIdlePosition(data, delta);
        break;
      case 'working':
        data.workPhase += delta;
        break;
      case 'walking':
        this.updateWalkingPosition(data, delta);
        break;
      case 'sitting':
        // No movement when sitting
        break;
      case 'running':
        this.updateRunningPosition(data, delta);
        break;
    }

    // Apply bob height. The authored GLB carries its own 7.1 cm vertical Body
    // travel in every locomotion clip, so adding a second oscillator at a
    // different frequency reads as swimming and breaks foot contact. Only the
    // procedural LODs, which have no baked bob, get it.
    const isMoving =
      data.currentState === 'walking' ||
      data.currentState === 'running' ||
      data.currentState === 'evacuating';
    const bobHeight =
      isMoving && data.lodLevel !== 'high' ? Math.abs(Math.sin(data.walkCycle)) * 0.018 : 0;
    group.position.y = bobHeight;

    // Face the patrol heading, damped. This used to be a discrete assignment,
    // so every boundary flip teleported the worker through a half turn in one
    // frame while the walk clip kept cycling.
    data.currentYaw = dampAngle(data.currentYaw, data.targetYaw, YAW_SMOOTH_TIME, delta);
    group.rotation.y = data.currentYaw;

    // Boundary check - turn around at edges
    if (group.position.z > 25 || group.position.z < -25) {
      data.direction *= -1;
    }
  }

  private updateEvacuation(data: WorkerAnimationData, delta: number): void {
    if (!data.refs?.group || !this.getNearestExitFn || !this.markWorkerEvacuatedFn) return;

    const group = data.refs.group;

    // Get evacuation target
    if (!data.evacuationTarget) {
      const exit = this.getNearestExitFn(group.position.x, group.position.z);
      data.evacuationTarget = new THREE.Vector3(exit.position.x, 0, exit.position.z);
    }

    // Move toward exit (running speed)
    const dx = data.evacuationTarget.x - group.position.x;
    const dz = data.evacuationTarget.z - group.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance < 1.5) {
      // Reached exit
      data.hasEvacuated = true;
      this.markWorkerEvacuatedFn(data.id);
      return;
    }

    // Normalize and apply running speed
    const RUN_SPEED = 6;
    const nx = dx / distance;
    const nz = dz / distance;

    group.position.x += nx * RUN_SPEED * delta;
    group.position.z += nz * RUN_SPEED * delta;

    // Face direction of movement (damped, same as the patrol heading)
    data.targetYaw = Math.atan2(nx, nz);
    data.currentYaw = dampAngle(data.currentYaw, data.targetYaw, YAW_SMOOTH_TIME, delta);
    group.rotation.y = data.currentYaw;

    // Update walk cycle for running animation
    data.walkCycle += ((RUN_SPEED * delta) / RUN_STRIDE_METRES) * Math.PI * 2;
    this.setAnimationState(data, 'running');
  }

  private checkForkliftProximity(data: WorkerAnimationData): void {
    if (!data.refs?.group) return;

    const group = data.refs.group;
    const nearestForklift = positionRegistry.getNearestForklift(
      group.position.x,
      group.position.z,
      this.config.forkliftDetectionRange
    );

    if (
      nearestForklift &&
      positionRegistry.isForkliftApproaching(group.position.x, group.position.z, nearestForklift)
    ) {
      if (!data.isEvading) {
        // Start evasion - determine direction
        const toWorkerX = group.position.x - nearestForklift.x;
        const toWorkerZ = group.position.z - nearestForklift.z;
        const crossProduct =
          (nearestForklift.dirX ?? 0) * toWorkerZ - (nearestForklift.dirZ ?? 0) * toWorkerX;
        data.evadeDirection = crossProduct > 0 ? 1 : -1;
        data.isEvading = true;
      }

      // Check if startled (very close)
      const dist = Math.sqrt(
        Math.pow(group.position.x - nearestForklift.x, 2) +
          Math.pow(group.position.z - nearestForklift.z, 2)
      );
      data.isStartled = dist < 3;

      // Update head target to look at forklift
      this.updateHeadTarget(data, nearestForklift);
    } else {
      // Track when evasion ends for waving
      if (data.isEvading && !data.wasEvading) {
        // Was evading, now safe - trigger wave
        if (this.features.waving) {
          data.isWaving = true;
          data.waveTimer = 1.5;
        }
      }
      data.wasEvading = data.isEvading;
      data.isEvading = false;
      data.isStartled = false;

      // Decay head target
      data.headTarget *= 0.9;
    }
  }

  private updateHeadTarget(data: WorkerAnimationData, forklift: EntityPosition): void {
    if (!data.refs?.group) return;

    const group = data.refs.group;
    const dx = forklift.x - group.position.x;
    const dz = forklift.z - group.position.z;
    const angleToForklift = Math.atan2(dx, dz);
    const bodyAngle = data.direction > 0 ? 0 : Math.PI;
    let relativeAngle = angleToForklift - bodyAngle;

    // Clamp to realistic head rotation range
    relativeAngle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, relativeAngle));
    data.headTarget = relativeAngle;
  }

  private updateEvasion(data: WorkerAnimationData, delta: number): void {
    if (!data.refs?.group) return;

    const group = data.refs.group;
    const targetX = data.baseX + data.evadeDirection * this.config.evasionDistance;
    const diffX = targetX - group.position.x;

    if (Math.abs(diffX) > 0.1) {
      group.position.x += Math.sign(diffX) * this.config.evasionSpeed * delta;
    }

    const evasionDistance = this.config.evasionSpeed * delta;
    data.walkCycle += (evasionDistance / WALK_STRIDE_METRES) * Math.PI * 2;
  }

  private updateAnimationState(data: WorkerAnimationData, delta: number): void {
    if (data.status === 'break') {
      this.setAnimationState(data, 'sitting');
      return;
    }

    if (data.status === 'responding') {
      this.setAnimationState(data, 'running');
      return;
    }

    if (data.status === 'idle') {
      this.setAnimationState(data, 'idle');
      return;
    }

    if (data.currentState !== 'walking' && data.currentState !== 'working') {
      this.setAnimationState(data, 'walking');
      data.workTimer = this.getWorkStateDuration(data, false);
    }

    data.workTimer -= delta;
    if (data.workTimer <= 0) {
      const startWorking = data.currentState !== 'working';
      this.setAnimationState(data, startWorking ? 'working' : 'walking');
      data.workTimer = this.getWorkStateDuration(data, startWorking);
    }
  }

  private setAnimationState(
    data: WorkerAnimationData,
    nextState: WorkerAnimationData['currentState']
  ): void {
    if (data.currentState === nextState) return;
    data.previousState = data.currentState;
    data.currentState = nextState;
    data.stateTransition = 0;
  }

  private getWorkStateDuration(data: WorkerAnimationData, working: boolean): number {
    const identityOffset = data.id
      .split('')
      .reduce((total, character) => total + character.charCodeAt(0), 0);
    return working ? 5 + (identityOffset % 4) : 8 + (identityOffset % 6);
  }

  private updateIdlePosition(data: WorkerAnimationData, delta: number): void {
    // Just slow breathing animation
    data.walkCycle += delta * 0.5;
  }

  /**
   * Scale forward travel down while the body is still swinging round to face
   * the new heading, so a turn reads as a turn instead of a sideways slide.
   */
  private turnFactor(data: WorkerAnimationData): number {
    const error = Math.abs(angleError(data.currentYaw, data.targetYaw));
    if (error < 0.25) return 1;
    return Math.max(0.25, 1 - error / Math.PI);
  }

  private updateWalkingPosition(data: WorkerAnimationData, delta: number): void {
    if (!data.refs?.group) return;

    const group = data.refs.group;
    const distance = data.speed * this.turnFactor(data) * delta;
    group.position.z += distance * data.direction;
    data.walkCycle += (distance / WALK_STRIDE_METRES) * Math.PI * 2;
  }

  private updateRunningPosition(data: WorkerAnimationData, delta: number): void {
    if (!data.refs?.group) return;

    const group = data.refs.group;
    const distance = data.speed * 1.5 * this.turnFactor(data) * delta;
    group.position.z += distance * data.direction;
    data.walkCycle += (distance / RUN_STRIDE_METRES) * Math.PI * 2;
  }

  // =====================
  // LIMB ANIMATION LOGIC
  // =====================

  private updateLimbAnimation(data: WorkerAnimationData, delta: number): void {
    const { refs, walkCycle, currentState, isStartled, isWaving, fatigueLevel } = data;
    if (!refs) return;

    // Handle special animations first (these override normal gait)

    // STARTLED POSE - Defensive reaction to nearby forklift
    if (isStartled && this.features.startledReaction) {
      this.applyStartledPose(refs, delta);
      return;
    }

    // WAVING ANIMATION - After forklift passes
    if (isWaving && this.features.waving) {
      this.applyWavingAnimation(data, refs, delta);
      // Continue with normal lower body gait below
    }

    if (currentState === 'working' && !isWaving) {
      this.applyWorkingPose(data, refs, delta);
      return;
    }

    // =====================
    // BIOMECHANICAL GAIT SYSTEM
    // =====================

    // Determine gait state
    const gaitState: 'idle' | 'walking' | 'running' | 'sitting' =
      currentState === 'running'
        ? 'running'
        : currentState === 'walking'
          ? 'walking'
          : currentState === 'sitting'
            ? 'sitting'
            : 'idle';

    // Get gait parameters (blends with tired preset based on fatigue)
    const gaitParams = getGaitParamsForState(gaitState, fatigueLevel);

    // Calculate blend factor for smooth state transitions
    const blendFactor = data.stateTransition;

    // Normalize walk cycle (0-2π radians) to phase (0-1)
    const cyclePhase = (walkCycle / (Math.PI * 2)) % 1;

    // Calculate full body pose from gait cycle
    const pose = calculateGaitPose(cyclePhase, gaitParams, blendFactor);

    // =====================
    // APPLY POSE TO REFS
    // =====================

    const smoothing = gaitState === 'running' ? 0.12 : 0.15;

    // Left leg - hip swing and knee bend
    if (refs.leftLeg) {
      damp(refs.leftLeg.rotation, 'x', pose.leftHip.x, smoothing, delta);
    }

    // Right leg - hip swing and knee bend
    if (refs.rightLeg) {
      damp(refs.rightLeg.rotation, 'x', pose.rightHip.x, smoothing, delta);
    }

    // Left arm - shoulder swing (unless waving overrides)
    if (refs.leftArm) {
      damp(refs.leftArm.rotation, 'x', pose.leftShoulder.x, smoothing, delta);
    }

    // Right arm - shoulder swing (unless waving overrides)
    if (refs.rightArm && !isWaving) {
      damp(refs.rightArm.rotation, 'x', pose.rightShoulder.x, smoothing, delta);
      damp(refs.rightArm.rotation, 'z', 0, smoothing, delta);
    }

    // Torso - forward lean and counter-rotation to hips
    if (refs.torso) {
      damp(refs.torso.rotation, 'x', pose.torsoRotation.x, smoothing, delta);
      damp(refs.torso.rotation, 'y', pose.torsoRotation.y, smoothing, delta);
      damp(refs.torso.rotation, 'z', pose.torsoRotation.z, smoothing * 0.5, delta);
    }

    // Hips - pelvis rotation and lateral sway
    if (refs.hips) {
      damp(refs.hips.rotation, 'y', pose.pelvisRotation.y, smoothing, delta);
      damp(refs.hips.position, 'x', pose.lateralOffset, smoothing * 0.5, delta);
    }

    // Head - slight bob and look direction
    if (refs.head) {
      // Combine gait head bob with manual look target
      damp(refs.head.rotation, 'x', pose.headRotation.x, smoothing, delta);
      damp(refs.head.rotation, 'y', data.headTarget, smoothing, delta);
    }
  }

  private applyWorkingPose(data: WorkerAnimationData, refs: WorkerPoseRefs, delta: number): void {
    data.workPhase += delta * 2.4;
    const motion = Math.sin(data.workPhase);
    let leftArmX = -0.45;
    let rightArmX = -0.35;
    let leftArmZ = 0.08;
    let rightArmZ = -0.08;
    let torsoX = 0.03;
    let headX = 0;
    let headY = motion * 0.08;

    switch (data.workAction) {
      case 'supervise':
        leftArmX = -0.78;
        rightArmX = -0.22;
        headY = motion * 0.18;
        break;
      case 'inspect':
        leftArmX = -0.95;
        rightArmX = -0.72;
        torsoX = 0.08;
        headX = 0.12;
        headY = motion * 0.05;
        break;
      case 'operate':
        leftArmX = -1.05 + motion * 0.04;
        rightArmX = -1.05 - motion * 0.04;
        leftArmZ = 0.16;
        rightArmZ = -0.16;
        torsoX = 0.05;
        break;
      case 'sample':
        leftArmX = -0.92;
        rightArmX = -1.18 + motion * 0.12;
        leftArmZ = 0.14;
        rightArmZ = -0.22;
        torsoX = 0.12;
        headX = 0.14;
        break;
      case 'repair':
        leftArmX = -0.82;
        rightArmX = -1.28 + motion * 0.22;
        leftArmZ = 0.16;
        rightArmZ = -0.28;
        torsoX = 0.18;
        headX = 0.16;
        break;
      case 'radio':
        leftArmX = -0.35;
        rightArmX = -2.05;
        rightArmZ = -0.42;
        headY = 0.12 + motion * 0.04;
        break;
      case 'none':
      default:
        break;
    }

    if (refs.leftLeg) {
      damp(refs.leftLeg.rotation, 'x', 0, 0.16, delta);
    }
    if (refs.rightLeg) {
      damp(refs.rightLeg.rotation, 'x', 0, 0.16, delta);
    }
    if (refs.leftArm) {
      damp(refs.leftArm.rotation, 'x', leftArmX, 0.16, delta);
      damp(refs.leftArm.rotation, 'z', leftArmZ, 0.16, delta);
    }
    if (refs.rightArm) {
      damp(refs.rightArm.rotation, 'x', rightArmX, 0.16, delta);
      damp(refs.rightArm.rotation, 'z', rightArmZ, 0.16, delta);
    }
    if (refs.torso) {
      damp(refs.torso.rotation, 'x', torsoX, 0.18, delta);
      damp(refs.torso.rotation, 'y', 0, 0.18, delta);
      damp(refs.torso.rotation, 'z', 0, 0.18, delta);
    }
    if (refs.hips) {
      damp(refs.hips.rotation, 'y', 0, 0.18, delta);
      damp(refs.hips.position, 'x', 0, 0.18, delta);
    }
    if (refs.head) {
      damp(refs.head.rotation, 'x', headX, 0.16, delta);
      damp(refs.head.rotation, 'y', headY, 0.16, delta);
    }
  }

  /**
   * Apply startled/defensive pose when forklift is very close
   */
  private applyStartledPose(refs: WorkerPoseRefs, delta: number): void {
    // Arms raised defensively
    if (refs.leftArm) {
      damp(refs.leftArm.rotation, 'x', -1.2, 0.2, delta);
      damp(refs.leftArm.rotation, 'z', 0.3, 0.2, delta);
    }
    if (refs.rightArm) {
      damp(refs.rightArm.rotation, 'x', -1.2, 0.2, delta);
      damp(refs.rightArm.rotation, 'z', -0.3, 0.2, delta);
    }

    // Legs slightly bent (brace position)
    if (refs.leftLeg) {
      damp(refs.leftLeg.rotation, 'x', 0.15, 0.2, delta);
    }
    if (refs.rightLeg) {
      damp(refs.rightLeg.rotation, 'x', 0.15, 0.2, delta);
    }

    // Head jerks back slightly
    if (refs.head) {
      damp(refs.head.rotation, 'x', -0.3, 0.2, delta);
    }

    // Torso leans back
    if (refs.torso) {
      damp(refs.torso.rotation, 'x', -0.15, 0.2, delta);
    }
  }

  /**
   * Apply waving animation after forklift passes
   */
  private applyWavingAnimation(
    data: WorkerAnimationData,
    refs: WorkerPoseRefs,
    delta: number
  ): void {
    // Animate wave phase
    data.wavePhase += delta * 12;
    const waveAngle = Math.sin(data.wavePhase) * 0.4;

    // Right arm waves (raised and waving)
    if (refs.rightArm) {
      refs.rightArm.rotation.x = -2.2;
      refs.rightArm.rotation.z = -0.8 + waveAngle;
    }

    // Decrement wave timer
    data.waveTimer -= delta;
    if (data.waveTimer <= 0) {
      data.isWaving = false;
      data.wavePhase = 0;
    }
  }

  // =====================
  // TIER 2 FEATURES
  // =====================

  private updateTier2Features(data: WorkerAnimationData, delta: number): void {
    // Idle variations
    if (this.features.idleVariations && data.currentState === 'idle') {
      this.updateIdleVariations(data, delta);
    }

    // Fatigue
    if (this.features.fatigue) {
      this.updateFatigue(data, delta);
    }
  }

  private updateIdleVariations(data: WorkerAnimationData, delta: number): void {
    data.idleVariationTimer -= delta;

    if (data.idleVariationTimer <= 0) {
      // Pick new variation
      const variations: IdleVariation[] = ['breathing', 'looking', 'shifting'];
      data.idleVariation = variations[Math.floor(Math.random() * variations.length)];
      data.idleVariationTimer = Math.random() * 3 + 3;
    }

    const { refs } = data;
    if (!refs) return;

    switch (data.idleVariation) {
      case 'looking':
        if (refs.head) {
          const lookTarget = Math.sin(data.walkCycle * 0.3) * 0.5;
          damp(refs.head.rotation, 'y', lookTarget, 0.05, delta);
        }
        break;
      case 'shifting':
        if (refs.hips) {
          const shiftAmount = Math.sin(data.walkCycle * 0.8) * 0.03;
          damp(refs.hips.position, 'x', shiftAmount, 0.05, delta);
        }
        break;
      case 'breathing':
      default:
        // Just subtle breathing handled by base animation
        break;
    }
  }

  private updateFatigue(data: WorkerAnimationData, delta: number): void {
    // Accumulate fatigue while working, recover on breaks (cap at 0.8, ~1 hour
    // of animation time to max). Accumulator-based on the frame delta: the
    // previous version re-derived fatigue from wall-clock shift duration every
    // frame, which clobbered the break-recovery decrement one frame later
    // (breaks never visibly reduced fatigue) and kept accruing while paused.
    if (data.status === 'break') {
      data.fatigueLevel = Math.max(0, data.fatigueLevel - delta * 0.1);
    } else {
      data.fatigueLevel = Math.min(0.8, data.fatigueLevel + delta * (0.8 / 3600));
    }

    // Apply fatigue effects (head droop, slouch)
    const { refs } = data;
    if (!refs || data.fatigueLevel < 0.1) return;

    if (refs.head && data.currentState === 'idle') {
      const headDroop = data.fatigueLevel * 0.15;
      damp(refs.head.rotation, 'x', headDroop, 0.02, delta);
    }

    if (refs.torso && data.fatigueLevel > 0.3) {
      const slouch = (data.fatigueLevel - 0.3) * 0.1;
      damp(refs.torso.rotation, 'x', slouch, 0.02, delta);
    }
  }

  // =====================
  // TIER 3 FEATURES
  // =====================

  private updateTier3Features(data: WorkerAnimationData, delta: number): void {
    // Blinking
    if (this.features.blinking) {
      this.updateBlinking(data, delta);
    }

    // Secondary motion (high LOD only)
    if (this.features.headBob || this.features.shoulderRotation || this.features.hipSway) {
      this.updateSecondaryMotion(data, delta);
    }
  }

  private updateBlinking(data: WorkerAnimationData, delta: number): void {
    const { refs } = data;

    data.blinkTimer -= delta;

    if (data.blinkTimer <= 0) {
      // Start blink
      data.blinkPhase = 0.15;
      data.blinkCount += 1;
      data.blinkTimer = workerDeterministicFraction(data.id, 100 + data.blinkCount) * 4 + 2;
    }

    let blinkAmount = 0;
    if (data.blinkPhase > 0) {
      data.blinkPhase -= delta;

      // Calculate blink amount (close then open)
      blinkAmount =
        data.blinkPhase > 0.075
          ? (0.15 - data.blinkPhase) / 0.075 // Closing
          : data.blinkPhase / 0.075; // Opening

      const scaleY = 0.3 + (1 - blinkAmount) * 0.7;
      if (refs?.leftEyelid) refs.leftEyelid.scale.y = scaleY;
      if (refs?.rightEyelid) refs.rightEyelid.scale.y = scaleY;
    }
    data.secondary.blinkAmount = THREE.MathUtils.clamp(blinkAmount, 0, 1);
  }

  private updateSecondaryMotion(data: WorkerAnimationData, delta: number): void {
    if (data.currentState !== 'walking' && data.currentState !== 'running') return;

    const { refs, walkCycle } = data;
    if (!refs) return;

    // Head bob
    if (this.features.headBob && refs.torso) {
      const headBob = Math.abs(Math.sin(walkCycle * 2)) * 0.015;
      damp(refs.torso.position, 'y', headBob, 0.1, delta);
    }

    // Hip sway
    if (this.features.hipSway && refs.hips) {
      const hipSway = Math.sin(walkCycle) * 0.025;
      damp(refs.hips.position, 'x', hipSway, 0.1, delta);
    }
  }

  // =====================
  // SECONDARY ANIMATION CHANNEL (authored skinned model)
  // =====================

  /**
   * Publish the behaviour layer for WorkerModel.
   *
   * Everything below already existed as a `damp()` write into `refs.*`, which
   * is null whenever the authored GLB is mounted — so at the highest LOD the
   * whole Tier 2/3 behaviour set was a silent no-op. These are the same
   * behaviours expressed as joint-agnostic numbers that the skinned model
   * applies to real bones after its mixer has run.
   */
  private updateSecondarySignals(data: WorkerAnimationData, delta: number): void {
    const signals = data.secondary;

    signals.gait =
      data.currentState === 'running' || data.currentState === 'evacuating'
        ? 'run'
        : data.currentState === 'walking'
          ? 'walk'
          : 'idle';

    // Startle and idle blends, so nothing snaps on a state edge.
    const startleTarget = data.isStartled && this.features.startledReaction ? 1 : 0;
    data.startleBlend += (startleTarget - data.startleBlend) * Math.min(1, delta * 9);
    const idleTarget = data.currentState === 'idle' || data.currentState === 'working' ? 1 : 0;
    data.idleBlend += (idleTarget - data.idleBlend) * Math.min(1, delta * 3.5);

    // Head: look at whatever the manager last flagged, minus a fatigue droop,
    // minus a startle recoil. Clamped well inside cervical range.
    const lookYaw = THREE.MathUtils.clamp(data.headTarget, -1.05, 1.05);
    signals.headYaw += (lookYaw - signals.headYaw) * Math.min(1, delta * 6);
    const droop =
      this.features.fatigue && data.currentState === 'idle'
        ? Math.min(0.2, data.fatigueLevel * 0.18)
        : 0;
    const headTarget = droop - data.startleBlend * 0.24;
    signals.headPitch += (headTarget - signals.headPitch) * Math.min(1, delta * 5);

    // Chest: fatigue slouch forward, startle lean back.
    const slouch =
      this.features.fatigue && data.fatigueLevel > 0.3 ? (data.fatigueLevel - 0.3) * 0.16 : 0;
    const chestTarget = slouch - data.startleBlend * 0.13;
    signals.chestPitch += (chestTarget - signals.chestPitch) * Math.min(1, delta * 5);

    // Hips carry no animation channel in any of the nine clips, so these are
    // absolute writes: an asymmetric weight-bearing stance while standing, that
    // fades out completely once the person is walking (otherwise it would
    // persist through locomotion and fight the Torso's own run swing).
    const stance = data.stanceSign * data.idleBlend;
    const sway = Math.sin(data.walkCycle * 0.45) * 0.22;
    signals.hipRoll = stance * 0.052 * (0.82 + sway);
    signals.hipYaw = stance * 0.038;
    const shifting =
      this.features.idleVariations && data.idleVariation === 'shifting'
        ? Math.sin(data.walkCycle * 0.8) * 0.014
        : 0;
    signals.hipShiftX = stance * 0.021 + shifting * data.idleBlend;

    // Acknowledgement wave after a forklift has passed.
    const waveTarget = data.isWaving && this.features.waving ? 1 : 0;
    signals.waveAmount += (waveTarget - signals.waveAmount) * Math.min(1, delta * 7);
    signals.wavePhase = data.wavePhase;
    signals.breathAmount =
      data.idleBlend * Math.sin(data.walkCycle * 0.42 + signals.animationPhase) * 0.5;
  }

  // =====================
  // LOD MANAGEMENT
  // =====================

  private updateLOD(data: WorkerAnimationData, camera: THREE.Camera): void {
    if (!data.refs?.group) return;

    const distance = camera.position.distanceTo(data.refs.group.position);
    data.distanceToCamera = distance;

    const newLod = resolveWorkerLod({
      quality: this.quality,
      current: data.lodLevel,
      distance,
      lodDistance: this.workerLodDistance,
      config: this.config,
    });

    // Notify if LOD changed
    if (newLod !== data.lodLevel) {
      data.lodLevel = newLod;
      const callback = this.lodChangeCallbacks.get(data.id);
      if (callback) {
        callback(newLod);
      }
    }
  }
}

// =====================
// REACT HOOK
// =====================

/**
 * React hook to create and manage the WorkerAnimationManager
 */
export function useWorkerAnimationManager(
  isTabVisible: boolean,
  quality: GraphicsQuality,
  workerLodDistance: number,
  simulationActive: boolean,
  emergencyDrillMode: boolean,
  safetyHoldActive: boolean,
  getNearestExit: (x: number, z: number) => FireDrillExit,
  markWorkerEvacuated: (id: string) => void
) {
  const managerRef = useRef<WorkerAnimationManager | null>(null);

  // Create manager once
  if (!managerRef.current) {
    managerRef.current = new WorkerAnimationManager(quality);
  }

  const manager = managerRef.current;

  // Update settings each frame
  manager.updateSettings(
    isTabVisible,
    quality,
    workerLodDistance,
    simulationActive,
    emergencyDrillMode,
    safetyHoldActive,
    getNearestExit,
    markWorkerEvacuated
  );

  // Reset evacuation when drill ends (side effect runs at commit, not render)
  useEffect(() => {
    if (!emergencyDrillMode) {
      manager.resetEvacuation();
    }
  }, [emergencyDrillMode, manager]);

  // Single useFrame for ALL workers
  useFrame((state, delta) => {
    manager.update(delta, state.camera);
  });

  // Memoized callbacks
  const register = useCallback(
    (config: WorkerAnimationConfig, refs: WorkerPoseRefs, signals?: WorkerSecondarySignals) => {
      return manager.register(config, refs, signals);
    },
    [manager]
  );

  const getLOD = useCallback((id: string) => manager.getLOD(id), [manager]);

  const onLodChange = useCallback(
    (id: string, callback: (lod: LODLevel) => void) => {
      return manager.onLodChange(id, callback);
    },
    [manager]
  );

  const updateWorkerStatus = useCallback(
    (id: string, status: WorkerAnimationData['status']) => {
      manager.updateWorkerStatus(id, status);
    },
    [manager]
  );

  const updateWorkerAssignment = useCallback(
    (id: string, task: string, workAction: WorkerWorkAction) => {
      manager.updateWorkerAssignment(id, task, workAction);
    },
    [manager]
  );

  const updateRefs = useCallback(
    (id: string, refs: WorkerPoseRefs) => {
      manager.updateRefs(id, refs);
    },
    [manager]
  );

  // Memoize return object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      register,
      getLOD,
      onLodChange,
      updateWorkerStatus,
      updateWorkerAssignment,
      updateRefs,
    }),
    [register, getLOD, onLodChange, updateWorkerStatus, updateWorkerAssignment, updateRefs]
  );
}
