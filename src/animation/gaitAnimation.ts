/**
 * Gait Animation System
 *
 * Realistic human walking animation based on biomechanical gait cycle.
 * Uses sinusoidal motion with proper phase offsets for natural movement.
 *
 * Gait Cycle Phases:
 * 0.0 - Right heel strike (left toe off)
 * 0.25 - Right mid-stance (left mid-swing)
 * 0.5 - Left heel strike (right toe off)
 * 0.75 - Left mid-stance (right mid-swing)
 * 1.0 - Back to right heel strike
 */

import { damp } from 'maath/easing';
import * as THREE from 'three';

// Animation parameters for different movement speeds
export interface GaitParams {
  // Leg motion
  hipSwing: number; // Forward/back hip rotation (radians)
  kneeFlexion: number; // Maximum knee bend during swing
  ankleRoll: number; // Ankle rotation during step

  // Arm motion
  shoulderSwing: number; // Forward/back shoulder rotation
  elbowBend: number; // Elbow flexion during swing

  // Body motion
  hipRotation: number; // Pelvis rotation around vertical axis
  hipDrop: number; // Lateral hip tilt (Trendelenburg)
  torsoLean: number; // Forward lean
  torsoSway: number; // Side-to-side sway
  shoulderCounter: number; // Counter-rotation to hips

  // Vertical motion
  verticalBob: number; // Up/down during step
  headBob: number; // Additional head bob

  // Timing
  cycleSpeed: number; // Multiplier for walk cycle
}

// Presets for different movement types
export const GAIT_PRESETS: Record<string, GaitParams> = {
  idle: {
    hipSwing: 0,
    kneeFlexion: 0,
    ankleRoll: 0,
    shoulderSwing: 0.05,
    elbowBend: 0,
    hipRotation: 0,
    hipDrop: 0,
    torsoLean: 0,
    torsoSway: 0.01,
    shoulderCounter: 0,
    verticalBob: 0,
    headBob: 0,
    cycleSpeed: 0.5,
  },

  walk: {
    hipSwing: 0.25, // ~14 degrees - reduced to prevent leg overlap
    kneeFlexion: 0.3, // ~17 degrees - subtle knee bend
    ankleRoll: 0.08, // ~5 degrees
    shoulderSwing: 0.2, // ~11 degrees - subtle arm swing
    elbowBend: 0.15, // ~9 degrees
    hipRotation: 0.04, // ~2 degrees pelvis rotation
    hipDrop: 0.015, // ~1 degree Trendelenburg
    torsoLean: 0.02, // Very slight forward lean
    torsoSway: 0.01, // Minimal side sway
    shoulderCounter: 0.03, // Counter to hip rotation
    verticalBob: 0.015, // Subtle vertical displacement
    headBob: 0.005, // Minimal head motion
    cycleSpeed: 2.0,
  },

  run: {
    hipSwing: 0.4, // ~23 degrees - reduced for less overlap
    kneeFlexion: 0.6, // ~34 degrees knee bend
    ankleRoll: 0.12, // ~7 degrees
    shoulderSwing: 0.35, // ~20 degrees
    elbowBend: 0.8, // Arms bent
    hipRotation: 0.06, // Pelvis rotation
    hipDrop: 0.02, // Lateral tilt
    torsoLean: 0.08, // Forward lean
    torsoSway: 0.015, // Side sway
    shoulderCounter: 0.05, // Counter-rotation
    verticalBob: 0.03, // Vertical motion
    headBob: 0.01, // Head bob
    cycleSpeed: 4.0,
  },

  sneak: {
    hipSwing: 0.3, // Reduced swing
    kneeFlexion: 0.8, // More bent knees
    ankleRoll: 0.1, // Careful foot placement
    shoulderSwing: 0.15, // Minimal arm swing
    elbowBend: 0.2,
    hipRotation: 0.04, // Less rotation
    hipDrop: 0.02,
    torsoLean: 0.1, // More forward lean (crouching)
    torsoSway: 0.01,
    shoulderCounter: 0.03,
    verticalBob: 0.01, // Minimal bounce
    headBob: 0.005,
    cycleSpeed: 3,
  },

  tired: {
    hipSwing: 0.18, // Reduced shuffling stride
    kneeFlexion: 0.2, // Less knee lift
    ankleRoll: 0.05, // Shuffling
    shoulderSwing: 0.1, // Limp arms
    elbowBend: 0.1,
    hipRotation: 0.02,
    hipDrop: 0.02, // More pronounced drop (fatigue)
    torsoLean: 0.04, // Slouching forward
    torsoSway: 0.015, // More sway (balance issues)
    shoulderCounter: 0.02,
    verticalBob: 0.008, // Less spring in step
    headBob: 0.01, // Head hangs more
    cycleSpeed: 1.5, // Slower when tired
  },
};

/**
 * Calculate smooth easing curve for leg swing
 * Uses combination of sine waves for natural motion
 */
function legSwingCurve(phase: number): number {
  // Primary swing motion
  const primary = Math.sin(phase * Math.PI * 2);

  // Add slight asymmetry (push-off is faster than swing)
  const asymmetry = Math.sin(phase * Math.PI * 4) * 0.1;

  return primary + asymmetry;
}

/**
 * Calculate knee flexion curve
 * Knee bends more during swing phase, straightens during stance
 */
function kneeFlexionCurve(phase: number): number {
  // Knee bends during swing (phase 0-0.5 for right leg)
  // Peak bend at ~0.35 (mid-swing)
  const swingPhase = (phase + 0.15) % 1; // Offset for proper timing
  const bend = Math.max(0, Math.sin(swingPhase * Math.PI * 2));

  return bend * bend; // Squared for sharper peak
}

/**
 * Calculate vertical bob curve
 * Two peaks per cycle (once per step)
 */
function verticalBobCurve(phase: number): number {
  // Double frequency - bob happens twice per cycle
  const bob = Math.abs(Math.sin(phase * Math.PI * 2));

  // Lowest point at heel strike (0 and 0.5)
  return bob;
}

/**
 * Calculate hip rotation curve
 * Pelvis rotates to advance the swinging leg
 */
function hipRotationCurve(phase: number): number {
  return Math.sin(phase * Math.PI * 2);
}

/**
 * Calculate arm swing curve (opposite to leg)
 * Arms have slight delay and asymmetry
 */
function armSwingCurve(phase: number): number {
  // Arms swing opposite to legs with slight phase offset
  const armPhase = (phase + 0.52) % 1; // Slight offset for natural look
  return Math.sin(armPhase * Math.PI * 2);
}

/**
 * Gait pose data structure
 */
export interface GaitPose {
  // Leg rotations (x = forward/back)
  leftHip: { x: number; z: number };
  rightHip: { x: number; z: number };
  leftKnee: number;
  rightKnee: number;

  // Arm rotations
  leftShoulder: { x: number; z: number };
  rightShoulder: { x: number; z: number };
  leftElbow: number;
  rightElbow: number;

  // Body
  pelvisRotation: { x: number; y: number; z: number };
  torsoRotation: { x: number; y: number; z: number };
  headRotation: { x: number; y: number };

  // Position offsets
  verticalOffset: number;
  lateralOffset: number;
}

/**
 * Calculate gait pose for a given cycle phase
 */
export function calculateGaitPose(
  cyclePhase: number,
  params: GaitParams,
  blendFactor: number = 1
): GaitPose {
  // Normalize phase to 0-1
  const phase = cyclePhase % 1;

  // Calculate base curves
  const legSwing = legSwingCurve(phase);
  const rightKneeFlex = kneeFlexionCurve(phase);
  const leftKneeFlex = kneeFlexionCurve((phase + 0.5) % 1);
  const verticalBob = verticalBobCurve(phase);
  const hipRot = hipRotationCurve(phase);
  const armSwing = armSwingCurve(phase);

  // Apply blend factor for smooth transitions
  const blend = blendFactor;

  return {
    // Legs - opposite phase
    leftHip: {
      x: -legSwing * params.hipSwing * blend,
      z: Math.sin(phase * Math.PI * 2) * params.hipDrop * blend,
    },
    rightHip: {
      x: legSwing * params.hipSwing * blend,
      z: -Math.sin(phase * Math.PI * 2) * params.hipDrop * blend,
    },
    leftKnee: leftKneeFlex * params.kneeFlexion * blend,
    rightKnee: rightKneeFlex * params.kneeFlexion * blend,

    // Arms - opposite to legs
    leftShoulder: {
      x: armSwing * params.shoulderSwing * blend,
      z: 0,
    },
    rightShoulder: {
      x: -armSwing * params.shoulderSwing * blend,
      z: 0,
    },
    leftElbow: Math.max(0, armSwing) * params.elbowBend * blend,
    rightElbow: Math.max(0, -armSwing) * params.elbowBend * blend,

    // Pelvis - rotates with stride
    pelvisRotation: {
      x: 0,
      y: hipRot * params.hipRotation * blend,
      z: Math.sin(phase * Math.PI * 2) * params.hipDrop * blend,
    },

    // Torso - counter-rotates to pelvis
    torsoRotation: {
      x: params.torsoLean * blend,
      y: -hipRot * params.shoulderCounter * blend,
      z: Math.sin(phase * Math.PI * 2) * params.torsoSway * blend,
    },

    // Head - stabilizes gaze with slight bob
    headRotation: {
      x: verticalBob * params.headBob * blend,
      y: 0,
    },

    // Position offsets
    verticalOffset: verticalBob * params.verticalBob * blend,
    lateralOffset: Math.sin(phase * Math.PI * 2) * params.torsoSway * 0.5 * blend,
  };
}

/**
 * Apply gait pose to worker refs using maath damp for smoothing
 */
export function applyGaitPose(
  pose: GaitPose,
  refs: {
    leftLeg?: THREE.Group | null;
    rightLeg?: THREE.Group | null;
    leftArm?: THREE.Group | null;
    rightArm?: THREE.Group | null;
    torso?: THREE.Group | null;
    hips?: THREE.Mesh | null;
    head?: THREE.Group | null;
  },
  delta: number,
  smoothing: number = 0.15
): void {
  // Left leg
  if (refs.leftLeg) {
    damp(refs.leftLeg.rotation, 'x', pose.leftHip.x, smoothing, delta);
  }

  // Right leg
  if (refs.rightLeg) {
    damp(refs.rightLeg.rotation, 'x', pose.rightHip.x, smoothing, delta);
  }

  // Left arm - shoulder swing
  if (refs.leftArm) {
    damp(refs.leftArm.rotation, 'x', pose.leftShoulder.x, smoothing, delta);
  }

  // Right arm - shoulder swing
  if (refs.rightArm) {
    damp(refs.rightArm.rotation, 'x', pose.rightShoulder.x, smoothing, delta);
  }

  // Torso lean and sway
  if (refs.torso) {
    damp(refs.torso.rotation, 'x', pose.torsoRotation.x, smoothing, delta);
    damp(refs.torso.rotation, 'y', pose.torsoRotation.y, smoothing, delta);
    damp(refs.torso.rotation, 'z', pose.torsoRotation.z, smoothing * 0.5, delta);
    damp(refs.torso.position, 'y', pose.verticalOffset, smoothing, delta);
  }

  // Hips rotation (pelvis)
  if (refs.hips) {
    damp(refs.hips.rotation, 'y', pose.pelvisRotation.y, smoothing, delta);
    damp(refs.hips.position, 'x', pose.lateralOffset, smoothing * 0.5, delta);
  }

  // Head stabilization
  if (refs.head) {
    damp(refs.head.rotation, 'x', pose.headRotation.x, smoothing, delta);
  }
}

/**
 * Blend between two gait presets
 */
export function blendGaitParams(from: GaitParams, to: GaitParams, t: number): GaitParams {
  const lerp = (a: number, b: number) => a + (b - a) * t;

  return {
    hipSwing: lerp(from.hipSwing, to.hipSwing),
    kneeFlexion: lerp(from.kneeFlexion, to.kneeFlexion),
    ankleRoll: lerp(from.ankleRoll, to.ankleRoll),
    shoulderSwing: lerp(from.shoulderSwing, to.shoulderSwing),
    elbowBend: lerp(from.elbowBend, to.elbowBend),
    hipRotation: lerp(from.hipRotation, to.hipRotation),
    hipDrop: lerp(from.hipDrop, to.hipDrop),
    torsoLean: lerp(from.torsoLean, to.torsoLean),
    torsoSway: lerp(from.torsoSway, to.torsoSway),
    shoulderCounter: lerp(from.shoulderCounter, to.shoulderCounter),
    verticalBob: lerp(from.verticalBob, to.verticalBob),
    headBob: lerp(from.headBob, to.headBob),
    cycleSpeed: lerp(from.cycleSpeed, to.cycleSpeed),
  };
}

/**
 * Get gait params based on movement state and fatigue
 */
export function getGaitParamsForState(
  state: 'idle' | 'walking' | 'running' | 'sitting',
  fatigueLevel: number = 0
): GaitParams {
  let baseParams: GaitParams;

  switch (state) {
    case 'running':
      baseParams = GAIT_PRESETS.run;
      break;
    case 'walking':
      baseParams = GAIT_PRESETS.walk;
      break;
    case 'sitting':
    case 'idle':
    default:
      baseParams = GAIT_PRESETS.idle;
      break;
  }

  // Blend with tired preset based on fatigue
  if (fatigueLevel > 0.2 && state === 'walking') {
    const fatigueBlend = Math.min(1, (fatigueLevel - 0.2) / 0.6);
    return blendGaitParams(baseParams, GAIT_PRESETS.tired, fatigueBlend);
  }

  return baseParams;
}
