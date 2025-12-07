import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { create } from 'zustand';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useCameraPositionStore, isPositionInsideFactory } from '../stores/useCameraPositionStore';

// Movement key tracking
const pressedKeys = new Set<string>();

// Movement configuration
const MOVE_SPEED = 20; // Units per second
const VERTICAL_SPEED = 15; // Units per second for up/down

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
    position: [70, 40, 70],
    target: [0, 5, 0],
    description: 'Full factory overview',
  },
  {
    name: 'Silos',
    position: [0, 18, -45],
    target: [0, 10, -22],
    description: 'Raw material storage (Zone 1)',
  },
  {
    name: 'Milling',
    position: [35, 15, -6],
    target: [0, 3, -6],
    description: 'Roller mills (Zone 2)',
  },
  {
    name: 'Sifting',
    position: [0, 20, 25],
    target: [0, 9, 6],
    description: 'Plansifters (Zone 3)',
  },
  {
    name: 'Packing',
    position: [-35, 12, 35],
    target: [0, 2, 25],
    description: 'Packaging lines (Zone 4)',
  },
  {
    name: 'Shipping',
    position: [30, 15, 60],
    target: [0, 2, 48],
    description: 'Shipping dock (front)',
  },
  {
    name: 'Receiving',
    position: [-30, 15, -60],
    target: [0, 2, -48],
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
  const currentSpeed = useRef(0);

  // Vectors for movement calculations (reused to avoid allocations)
  const moveDirection = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());

  // Set up keyboard listeners for WASD/Arrow movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();
      // Track movement keys
      if (
        ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'q', 'e'].includes(
          key
        )
      ) {
        pressedKeys.add(key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      pressedKeys.delete(key);
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
    // Handle WASD/Arrow key movement
    if (pressedKeys.size > 0 && orbitControlsRef?.current) {
      // Get forward direction (from camera to target, but flattened on XZ plane)
      forward.current.subVectors(orbitControlsRef.current.target, camera.position);
      forward.current.y = 0;
      forward.current.normalize();

      // Get right direction (perpendicular to forward)
      right.current.crossVectors(forward.current, camera.up).normalize();

      // Calculate movement vector
      moveDirection.current.set(0, 0, 0);

      // Forward/Backward (W/S or Up/Down arrows)
      if (pressedKeys.has('w') || pressedKeys.has('arrowup')) {
        moveDirection.current.add(forward.current);
      }
      if (pressedKeys.has('s') || pressedKeys.has('arrowdown')) {
        moveDirection.current.sub(forward.current);
      }

      // Left/Right strafe (A/D or Left/Right arrows)
      if (pressedKeys.has('a') || pressedKeys.has('arrowleft')) {
        moveDirection.current.sub(right.current);
      }
      if (pressedKeys.has('d') || pressedKeys.has('arrowright')) {
        moveDirection.current.add(right.current);
      }

      // Up/Down (Q/E for vertical movement)
      if (pressedKeys.has('q')) {
        moveDirection.current.y -= 1;
      }
      if (pressedKeys.has('e')) {
        moveDirection.current.y += 1;
      }

      // Apply movement if there's any
      if (moveDirection.current.length() > 0) {
        // Normalize horizontal movement but keep vertical separate
        const verticalMove = moveDirection.current.y;
        moveDirection.current.y = 0;

        if (moveDirection.current.length() > 0) {
          moveDirection.current.normalize();
          moveDirection.current.multiplyScalar(MOVE_SPEED * delta);
        }

        // Add vertical movement
        moveDirection.current.y = verticalMove * VERTICAL_SPEED * delta;

        // Move both camera and orbit target together
        camera.position.add(moveDirection.current);
        orbitControlsRef.current.target.add(moveDirection.current);
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

    // Handle preset animation
    if (!isAnimating || !targetPosition || !targetLookAt) return;

    // Smooth animation using lerp
    animationProgress.current += delta * 1.5; // Speed of animation
    const t = Math.min(animationProgress.current, 1);
    const easeT = 1 - Math.pow(1 - t, 3); // Ease out cubic

    // Lerp camera position
    camera.position.lerp(targetPosition, easeT * 0.1);

    // Update OrbitControls target instead of calling camera.lookAt directly
    if (orbitControlsRef?.current) {
      orbitControlsRef.current.target.lerp(targetLookAt, easeT * 0.1);
    }

    // Check if animation is complete
    const distanceToTarget = camera.position.distanceTo(targetPosition);
    if (distanceToTarget < 0.5 || t >= 1) {
      camera.position.copy(targetPosition);
      if (orbitControlsRef?.current) {
        orbitControlsRef.current.target.copy(targetLookAt);
      }
      animationProgress.current = 0;
      clearAnimation();
    }
  });

  // Reset animation progress when target changes
  useEffect(() => {
    if (isAnimating) {
      animationProgress.current = 0;
    }
  }, [targetPosition, isAnimating]);

  return null;
};

/**
 * Camera Bounds Tracker
 *
 * Tracks whether the camera is inside or outside the factory bounds.
 * Used to conditionally render interior vs exterior components for performance.
 * Throttled to every 10 frames (~6 checks/second at 60fps) to minimize overhead.
 */
export const CameraBoundsTracker: React.FC = () => {
  const { camera } = useThree();
  const setIsCameraInside = useCameraPositionStore((state) => state.setIsCameraInside);
  const frameCountRef = useRef(0);
  const lastInsideRef = useRef(true);

  useFrame(() => {
    // Throttle to every 10 frames for performance
    frameCountRef.current++;
    if (frameCountRef.current % 10 !== 0) return;

    const isInside = isPositionInsideFactory(
      camera.position.x,
      camera.position.y,
      camera.position.z
    );

    // Only update store if state changed (prevents unnecessary re-renders)
    if (isInside !== lastInsideRef.current) {
      lastInsideRef.current = isInside;
      setIsCameraInside(isInside);
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
              i === activePreset ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-500'
            }`}
          >
            {i + 1}
          </div>
        ))}
        <div className="w-4 h-4 rounded text-[9px] font-mono flex items-center justify-center bg-slate-800 text-slate-500 ml-1">
          0
        </div>
      </div>
    </div>
  );
};
