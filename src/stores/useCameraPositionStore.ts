import { create } from 'zustand';

/**
 * Camera Position Store
 *
 * Tracks whether the camera is inside or outside the factory bounds.
 * Used for performance optimization - interior components are hidden when
 * camera is outside, and vice versa.
 *
 * Factory bounds (from Environment.tsx walls):
 * - X: -60 to +60 (left/right walls)
 * - Z: -50 to +50 (front/back walls)
 * - Y: 0 to 32 (floor to ceiling)
 */

// Factory boundary constants
export const FACTORY_BOUNDS = {
  minX: -60,
  maxX: 60,
  minZ: -50,
  maxZ: 50,
  minY: 0,
  maxY: 32,
} as const;

interface CameraPositionStore {
  /** Whether the camera is currently inside the factory bounds */
  isCameraInside: boolean;
  /** Update the camera inside/outside state */
  setIsCameraInside: (inside: boolean) => void;
}

export const useCameraPositionStore = create<CameraPositionStore>((set) => ({
  // Default to inside (most common starting position)
  isCameraInside: true,
  setIsCameraInside: (inside) => set({ isCameraInside: inside }),
}));

/**
 * Check if a position is inside the factory bounds
 * Includes a small buffer to prevent flickering at boundaries
 */
export const isPositionInsideFactory = (x: number, y: number, z: number): boolean => {
  const buffer = 2; // Small buffer to prevent boundary flickering
  return (
    x >= FACTORY_BOUNDS.minX + buffer &&
    x <= FACTORY_BOUNDS.maxX - buffer &&
    z >= FACTORY_BOUNDS.minZ + buffer &&
    z <= FACTORY_BOUNDS.maxZ - buffer &&
    y >= FACTORY_BOUNDS.minY &&
    y <= FACTORY_BOUNDS.maxY + buffer
  );
};
