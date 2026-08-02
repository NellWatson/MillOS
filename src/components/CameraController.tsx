import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { create } from 'zustand';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  useCameraPositionStore,
  isPositionInsideFactory,
  isPositionInDockZone,
} from '../stores/useCameraPositionStore';
import { useMobileControlStore } from '../stores/mobileControlStore';
import { SITE_LAYOUT, getVisibleSiteCellsForView } from '../constants/siteLayout';
import { resolveCameraCollision } from '../utils/cameraCollision';

// Movement key tracking
const pressedKeys = new Set<string>();

/**
 * Physical key codes this controller consumes.
 *
 * Keyed on `event.code`, not `event.key`: `key` reports the produced character,
 * which is layout dependent (AZERTY emits z/q/s/d for the WASD positions,
 * QWERTZ emits 'y' for W), so a character-keyed table leaves movement dead on
 * those keyboards. `code` is positional and identical everywhere.
 */
const MOVEMENT_CODES: ReadonlySet<string> = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyQ',
  'KeyE',
  'ShiftLeft',
  'ShiftRight',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

/** True when the event comes from somewhere the user is entering text. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

// Reusable vector for the D-pad look offset (avoids a per-frame Vector3
// allocation while the mobile look control is held).
const _lookOffset = new THREE.Vector3();
const _viewDirection = new THREE.Vector3();

// Movement configuration
const MOVE_SPEED = 20; // Units per second
const VERTICAL_SPEED = 15; // Units per second for up/down
const SPRINT_MULTIPLIER = 3.6; // Speed multiplier when holding Shift
const MIN_CAMERA_HEIGHT = 1.5; // Minimum camera Y to prevent ground clipping (25% lower than 2.0)
const MIN_TARGET_HEIGHT = 0.5; // Minimum orbit target Y (above floor level)

// Camera preset definitions based on MillOS factory zones
export interface CameraPreset {
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  description: string;
}

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    name: 'Overview',
    position: [...SITE_LAYOUT.cameras.overview.position],
    target: [...SITE_LAYOUT.cameras.overview.target],
    description: 'Whole mill and logistics site',
  },
  {
    name: 'Silos',
    position: [...SITE_LAYOUT.cameras.silos.position],
    target: [...SITE_LAYOUT.cameras.silos.target],
    description: 'Raw material storage (Zone 1)',
  },
  {
    name: 'Milling',
    position: [...SITE_LAYOUT.cameras.milling.position],
    target: [...SITE_LAYOUT.cameras.milling.target],
    description: 'Roller mills (Zone 2)',
  },
  {
    name: 'Sifting',
    position: [...SITE_LAYOUT.cameras.sifting.position],
    target: [...SITE_LAYOUT.cameras.sifting.target],
    description: 'Plansifters (Zone 3)',
  },
  {
    name: 'Packing',
    position: [...SITE_LAYOUT.cameras.packing.position],
    target: [...SITE_LAYOUT.cameras.packing.target],
    description: 'Packaging lines (Zone 4)',
  },
  {
    name: 'Shipping',
    position: [...SITE_LAYOUT.cameras.shipping.position],
    target: [...SITE_LAYOUT.cameras.shipping.target],
    description: 'Shipping dock (front)',
  },
  {
    name: 'Receiving',
    position: [...SITE_LAYOUT.cameras.receiving.position],
    target: [...SITE_LAYOUT.cameras.receiving.target],
    description: 'Receiving dock (back)',
  },
];

// Store for camera preset state
interface CameraStore {
  activePreset: number | null;
  targetPosition: THREE.Vector3 | null;
  targetLookAt: THREE.Vector3 | null;
  isAnimating: boolean;
  setPreset: (index: number) => void;
  focusOn: (position: [number, number, number], target: [number, number, number]) => void;
  clearAnimation: () => void;
}

export const useCameraStore = create<CameraStore>((set) => ({
  activePreset: null,
  targetPosition: null,
  targetLookAt: null,
  isAnimating: false,
  setPreset: (index) => {
    if (index >= 0 && index < CAMERA_PRESETS.length) {
      const preset = CAMERA_PRESETS[index];
      set({
        activePreset: index,
        targetPosition: new THREE.Vector3(...preset.position),
        targetLookAt: new THREE.Vector3(...preset.target),
        isAnimating: true,
      });
    }
  },
  focusOn: (position, target) =>
    set({
      activePreset: null,
      targetPosition: new THREE.Vector3(...position),
      targetLookAt: new THREE.Vector3(...target),
      isAnimating: true,
    }),
  clearAnimation: () => set({ isAnimating: false }),
}));

// Camera controller component - must be inside Canvas
interface CameraControllerProps {
  orbitControlsRef?: React.RefObject<OrbitControlsImpl | null>;
  autoRotateEnabled?: boolean;
  targetSpeed?: number;
}

export const CameraController: React.FC<CameraControllerProps> = ({
  orbitControlsRef,
  autoRotateEnabled = true,
  targetSpeed = 0.15,
}) => {
  const { camera } = useThree();
  const { targetPosition, targetLookAt, isAnimating, clearAnimation } = useCameraStore();
  const animationProgress = useRef(0);
  const animationStartPosition = useRef(new THREE.Vector3());
  const animationStartLookAt = useRef(new THREE.Vector3());
  const previousCameraPosition = useRef(new THREE.Vector3());
  const cameraPositionInitialized = useRef(false);
  const currentSpeed = useRef(0);

  // Vectors for movement calculations (reused to avoid allocations)
  const moveDirection = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());

  // Set up keyboard listeners for WASD/Arrow movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (MOVEMENT_CODES.has(e.code)) {
        pressedKeys.add(e.code);
        // Arrow keys scroll the page by default, which fights camera movement.
        if (e.code.startsWith('Arrow')) e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.code);
    };

    // Clear keys when window loses focus
    const handleBlur = () => {
      pressedKeys.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useFrame((_, delta) => {
    if (!cameraPositionInitialized.current) {
      previousCameraPosition.current.copy(camera.position);
      cameraPositionInitialized.current = true;
    }

    // Get D-pad state from mobile control store
    const { dpadDirection, dpadMode } = useMobileControlStore.getState();

    // Handle D-pad look mode (rotate camera around target)
    if (dpadDirection && dpadMode === 'look' && orbitControlsRef?.current) {
      const LOOK_SPEED = 1.5; // radians per second
      const target = orbitControlsRef.current.target;
      const offset = _lookOffset.copy(camera.position).sub(target);

      // Convert to spherical coordinates
      const radius = offset.length();
      let theta = Math.atan2(offset.x, offset.z); // azimuthal angle
      let phi = Math.acos(Math.max(-1, Math.min(1, offset.y / radius))); // polar angle

      // Apply rotation
      theta -= dpadDirection.x * LOOK_SPEED * delta;
      phi += dpadDirection.y * LOOK_SPEED * delta;

      // Clamp polar angle
      phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, phi));

      // Convert back to cartesian
      offset.x = radius * Math.sin(phi) * Math.sin(theta);
      offset.y = radius * Math.cos(phi);
      offset.z = radius * Math.sin(phi) * Math.cos(theta);

      camera.position.copy(target).add(offset);
      camera.lookAt(target);
    }

    // Combine keyboard and D-pad move input
    const hasDpadMoveInput = dpadDirection && dpadMode === 'move';
    // Shift is a modifier, not a direction: counting it would let a held sprint
    // key cancel a running preset animation without the camera moving at all.
    let hasKeyboardInput = false;
    for (const code of pressedKeys) {
      if (code !== 'ShiftLeft' && code !== 'ShiftRight') {
        hasKeyboardInput = true;
        break;
      }
    }
    const hasManualInput = Boolean(dpadDirection || hasKeyboardInput);

    if (hasManualInput && isAnimating) {
      clearAnimation();
    }

    // Handle WASD/Arrow key movement OR D-pad move mode
    if ((hasKeyboardInput || hasDpadMoveInput) && orbitControlsRef?.current) {
      // Get forward direction (from camera to target, but flattened on XZ plane)
      forward.current.subVectors(orbitControlsRef.current.target, camera.position);
      forward.current.y = 0;
      forward.current.normalize();

      // Get right direction (perpendicular to forward)
      right.current.crossVectors(forward.current, camera.up).normalize();

      // Calculate movement vector
      moveDirection.current.set(0, 0, 0);

      // Forward/Backward (W/S or Up/Down arrows or D-pad Y)
      if (pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp')) {
        moveDirection.current.add(forward.current);
      }
      if (pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown')) {
        moveDirection.current.sub(forward.current);
      }

      // Left/Right strafe (A/D or Left/Right arrows or D-pad X)
      if (pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft')) {
        moveDirection.current.sub(right.current);
      }
      if (pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')) {
        moveDirection.current.add(right.current);
      }

      // D-pad move input (when in move mode)
      if (hasDpadMoveInput && dpadDirection) {
        // D-pad Y: negative = up/forward, positive = down/backward
        if (dpadDirection.y < 0) {
          moveDirection.current.addScaledVector(forward.current, -dpadDirection.y);
        } else if (dpadDirection.y > 0) {
          moveDirection.current.addScaledVector(forward.current, -dpadDirection.y);
        }
        // D-pad X: negative = left, positive = right
        if (dpadDirection.x !== 0) {
          moveDirection.current.addScaledVector(right.current, dpadDirection.x);
        }
      }

      // Up/Down (Q/E for vertical movement)
      if (pressedKeys.has('KeyQ')) {
        moveDirection.current.y -= 1;
      }
      if (pressedKeys.has('KeyE')) {
        moveDirection.current.y += 1;
      }

      // Apply movement if there's any
      if (moveDirection.current.length() > 0) {
        // Apply sprint multiplier if shift is held
        const speedMultiplier =
          pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight') ? SPRINT_MULTIPLIER : 1;

        // Normalize horizontal movement but keep vertical separate
        const verticalMove = moveDirection.current.y;
        moveDirection.current.y = 0;

        if (moveDirection.current.length() > 0) {
          moveDirection.current.normalize();
          moveDirection.current.multiplyScalar(MOVE_SPEED * speedMultiplier * delta);
        }

        // Add vertical movement
        moveDirection.current.y = verticalMove * VERTICAL_SPEED * speedMultiplier * delta;

        // Move both camera and orbit target together
        camera.position.add(moveDirection.current);
        orbitControlsRef.current.target.add(moveDirection.current);

        // Clamp camera and target height to prevent ground clipping
        if (camera.position.y < MIN_CAMERA_HEIGHT) {
          camera.position.y = MIN_CAMERA_HEIGHT;
        }
        if (orbitControlsRef.current.target.y < MIN_TARGET_HEIGHT) {
          orbitControlsRef.current.target.y = MIN_TARGET_HEIGHT;
        }
      }
    }
    // Frame-rate independent exponential smoothing for perfectly smooth rotation
    if (orbitControlsRef?.current) {
      const target = autoRotateEnabled ? targetSpeed : 0;
      // Exponential decay smoothing - completely frame-rate independent
      // smoothTime controls how quickly we reach target (lower = faster)
      const smoothTime = 2.5; // seconds to reach ~63% of target
      const alpha = 1 - Math.exp(-delta / smoothTime);
      currentSpeed.current += (target - currentSpeed.current) * alpha;
      orbitControlsRef.current.autoRotateSpeed = currentSpeed.current;
    }

    // Handle preset animation from a fixed starting pose. The prior recursive
    // lerp never followed a predictable easing curve and could stop short.
    if (isAnimating && targetPosition && targetLookAt && !hasManualInput) {
      const animationDuration = 0.9;
      animationProgress.current += delta / animationDuration;
      const t = Math.min(animationProgress.current, 1);
      const easeT = t * t * (3 - 2 * t);

      camera.position.lerpVectors(animationStartPosition.current, targetPosition, easeT);
      if (orbitControlsRef?.current) {
        orbitControlsRef.current.target.lerpVectors(
          animationStartLookAt.current,
          targetLookAt,
          easeT
        );
      }

      if (t >= 1) {
        camera.position.copy(targetPosition);
        orbitControlsRef?.current?.target.copy(targetLookAt);
        animationProgress.current = 0;
        clearAnimation();
      }
    }

    if (camera.position.y < MIN_CAMERA_HEIGHT) camera.position.y = MIN_CAMERA_HEIGHT;
    if (orbitControlsRef?.current && orbitControlsRef.current.target.y < MIN_TARGET_HEIGHT) {
      orbitControlsRef.current.target.y = MIN_TARGET_HEIGHT;
    }

    const collision = resolveCameraCollision(
      [
        previousCameraPosition.current.x,
        previousCameraPosition.current.y,
        previousCameraPosition.current.z,
      ],
      [camera.position.x, camera.position.y, camera.position.z]
    );
    camera.position.set(...collision.position);
    camera.userData.lastCollision = collision.collidedWith;
    previousCameraPosition.current.copy(camera.position);
  });

  // Reset animation progress when target changes
  useEffect(() => {
    if (isAnimating) {
      animationProgress.current = 0;
      animationStartPosition.current.copy(camera.position);
      if (orbitControlsRef?.current) {
        animationStartLookAt.current.copy(orbitControlsRef.current.target);
      } else if (targetLookAt) {
        animationStartLookAt.current.copy(targetLookAt);
      }
    }
  }, [camera, isAnimating, orbitControlsRef, targetLookAt, targetPosition]);

  return null;
};

/**
 * Camera Bounds Tracker
 *
 * Tracks whether the camera is inside or outside the factory bounds.
 * Also tracks if camera is in a dock transition zone (near open dock openings).
 * Used to conditionally render interior vs exterior components for performance.
 * Throttled to every 10 frames (~6 checks/second at 60fps) to minimize overhead.
 */
export const CameraBoundsTracker: React.FC = () => {
  const { camera } = useThree();
  const setIsCameraInside = useCameraPositionStore((state) => state.setIsCameraInside);
  const setIsCameraInDockZone = useCameraPositionStore((state) => state.setIsCameraInDockZone);
  const setVisibleCells = useCameraPositionStore((state) => state.setVisibleCells);
  const frameCountRef = useRef(0);
  const lastInsideRef = useRef(true);
  const lastInDockZoneRef = useRef(false);
  const lastVisibleCellsRef = useRef('interior');

  useFrame(() => {
    // Throttle to every 10 frames for performance
    frameCountRef.current++;
    if (frameCountRef.current % 10 !== 0) return;

    // HYSTERESIS: Use a larger buffer when already inside to prevent rapid flipping
    // effectively creating a "dead zone" at the boundary
    const hysteresisBuffer = lastInsideRef.current ? -2 : 2; // -2 expands the "inside" zone, +2 shrinks it

    const isInside = isPositionInsideFactory(
      camera.position.x,
      camera.position.y,
      camera.position.z,
      hysteresisBuffer
    );

    const isInDockZone = isPositionInDockZone(camera.position.x, camera.position.z);
    camera.getWorldDirection(_viewDirection);
    const visibleCells = getVisibleSiteCellsForView(
      [camera.position.x, camera.position.y, camera.position.z],
      [_viewDirection.x, _viewDirection.y, _viewDirection.z]
    );
    const visibleCellsKey = visibleCells.join('|');

    // Only update store if state changed (prevents unnecessary re-renders)
    if (isInside !== lastInsideRef.current) {
      lastInsideRef.current = isInside;
      setIsCameraInside(isInside);
    }

    if (isInDockZone !== lastInDockZoneRef.current) {
      lastInDockZoneRef.current = isInDockZone;
      setIsCameraInDockZone(isInDockZone);
    }

    if (visibleCellsKey !== lastVisibleCellsRef.current) {
      lastVisibleCellsRef.current = visibleCellsKey;
      setVisibleCells(visibleCells);
    }
  });

  return null;
};

// Hook to get camera preset info for UI
export const useActivePreset = () => {
  const activePreset = useCameraStore((state) => state.activePreset);
  return activePreset !== null ? CAMERA_PRESETS[activePreset] : null;
};

// Camera preset indicator UI component
export const CameraPresetIndicator: React.FC = () => {
  const activePreset = useCameraStore((state) => state.activePreset);
  const isAnimating = useCameraStore((state) => state.isAnimating);

  if (activePreset === null) return null;

  const preset = CAMERA_PRESETS[activePreset];

  return (
    <div className="fixed bottom-4 right-4 z-40 pointer-events-none">
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 shadow-lg transition-all duration-300 ${isAnimating ? 'scale-105' : ''}`}
      >
        {/* Preset number badge */}
        <div className="w-6 h-6 rounded-md bg-cyan-600 flex items-center justify-center">
          <span className="text-white text-sm font-bold">{activePreset + 1}</span>
        </div>
        {/* Preset info */}
        <div className="flex flex-col">
          <span className="text-white text-xs font-semibold">{preset.name}</span>
          <span className="text-slate-400 text-[10px]">{preset.description}</span>
        </div>
        {/* Animating indicator */}
        {isAnimating && <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse ml-1" />}
      </div>
      {/* Keyboard hint */}
      <div className="flex justify-end gap-1 mt-1 opacity-50">
        {CAMERA_PRESETS.map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded text-[9px] font-mono flex items-center justify-center transition-colors ${
              i === activePreset ? 'bg-cyan-700 text-white' : 'bg-slate-800 text-white/70'
            }`}
          >
            {i + 1}
          </div>
        ))}
        <div className="w-4 h-4 rounded text-[9px] font-mono flex items-center justify-center bg-slate-800 text-white/70 ml-1">
          0
        </div>
      </div>
    </div>
  );
};
