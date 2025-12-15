/**
 * MachineLOD.ts - Quality-based geometry variants for instanced machines
 *
 * Provides simplified geometries for lower quality settings to reduce triangle count.
 * Unlike traditional LOD (distance-based), this uses quality presets since
 * InstancedMesh doesn't support per-instance distance LOD efficiently.
 *
 * Triangle reduction:
 * - Ultra/High: Full detail (32 segments for cylinders)
 * - Medium: Reduced (16 segments)
 * - Low: Minimal (8 segments)
 */

import * as THREE from 'three';
import { GraphicsQuality } from '../../stores/graphicsStore';

// Cylinder segment counts by quality
const CYLINDER_SEGMENTS: Record<GraphicsQuality, number> = {
  low: 8,
  medium: 16,
  high: 32,
  ultra: 32,
};

/**
 * Get cylinder geometry with appropriate segment count for quality level
 */
export function getCylinderGeometry(
  quality: GraphicsQuality,
  radiusTop = 1,
  radiusBottom = 1,
  height = 1
): THREE.CylinderGeometry {
  const segments = CYLINDER_SEGMENTS[quality];
  return new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments);
}

/**
 * Get cone geometry with appropriate segment count for quality level
 */
export function getConeGeometry(
  quality: GraphicsQuality,
  radius = 1,
  height = 1
): THREE.ConeGeometry {
  const segments = CYLINDER_SEGMENTS[quality];
  return new THREE.ConeGeometry(radius, height, segments);
}

/**
 * Get sphere geometry with appropriate segment count for quality level
 */
export function getSphereGeometry(quality: GraphicsQuality, radius = 1): THREE.SphereGeometry {
  const segments = CYLINDER_SEGMENTS[quality];
  const rings = Math.max(4, Math.floor(segments / 2));
  return new THREE.SphereGeometry(radius, segments, rings);
}

/**
 * Get box geometry (segments don't vary much for boxes)
 */
export function getBoxGeometry(
  _quality: GraphicsQuality,
  width = 1,
  height = 1,
  depth = 1
): THREE.BoxGeometry {
  return new THREE.BoxGeometry(width, height, depth);
}

/**
 * Pre-built geometry sets for each machine type, keyed by quality.
 * These are created lazily and cached to avoid recreation.
 */
const geometryCache = new Map<string, THREE.BufferGeometry>();

function getCachedGeometry<T extends THREE.BufferGeometry>(key: string, factory: () => T): T {
  if (!geometryCache.has(key)) {
    geometryCache.set(key, factory());
  }
  return geometryCache.get(key) as T;
}

// Silo geometries
export function getSiloBodyGeometry(quality: GraphicsQuality): THREE.CylinderGeometry {
  return getCachedGeometry(`silo-body-${quality}`, () => getCylinderGeometry(quality));
}

export function getSiloConeGeometry(quality: GraphicsQuality): THREE.ConeGeometry {
  return getCachedGeometry(`silo-cone-${quality}`, () => getConeGeometry(quality));
}

export function getSiloLegGeometry(quality: GraphicsQuality): THREE.CylinderGeometry {
  return getCachedGeometry(`silo-leg-${quality}`, () => {
    const segments = Math.max(6, CYLINDER_SEGMENTS[quality] / 2);
    return new THREE.CylinderGeometry(0.15, 0.2, 1, segments);
  });
}

export function getSiloLadderGeometry(quality: GraphicsQuality, height: number): THREE.BoxGeometry {
  return getCachedGeometry(`silo-ladder-${quality}-${height}`, () => {
    return new THREE.BoxGeometry(0.6, height, 0.1);
  });
}

// Roller Mill geometries
export function getMillCylinderGeometry(quality: GraphicsQuality): THREE.CylinderGeometry {
  return getCachedGeometry(`mill-cylinder-${quality}`, () => getCylinderGeometry(quality));
}

export function getMillBoxGeometry(quality: GraphicsQuality): THREE.BoxGeometry {
  return getCachedGeometry(`mill-box-${quality}`, () => getBoxGeometry(quality));
}

// Packer geometries
export function getPackerCylinderGeometry(quality: GraphicsQuality): THREE.CylinderGeometry {
  return getCachedGeometry(`packer-cylinder-${quality}`, () => {
    const segments = CYLINDER_SEGMENTS[quality];
    return new THREE.CylinderGeometry(1, 1, 1, segments);
  });
}

export function getPackerBoxGeometry(quality: GraphicsQuality): THREE.BoxGeometry {
  return getCachedGeometry(`packer-box-${quality}`, () => getBoxGeometry(quality));
}

// Plansifter geometries
export function getPlansifterCylinderGeometry(quality: GraphicsQuality): THREE.CylinderGeometry {
  return getCachedGeometry(`plansifter-cylinder-${quality}`, () => {
    const segments = CYLINDER_SEGMENTS[quality];
    return new THREE.CylinderGeometry(1, 1, 1, segments);
  });
}

export function getPlansifterBoxGeometry(quality: GraphicsQuality): THREE.BoxGeometry {
  return getCachedGeometry(`plansifter-box-${quality}`, () => getBoxGeometry(quality));
}

/**
 * Cleanup function to dispose cached geometries (call on app unmount if needed)
 */
export function disposeGeometryCache(): void {
  geometryCache.forEach((geometry) => geometry.dispose());
  geometryCache.clear();
}

// =========================================================================
// DISTANCE-BASED INSTANCE CULLING
// =========================================================================

/**
 * Calculate squared distance between camera and a 3D position.
 * Uses squared distance to avoid expensive sqrt.
 */
export function getDistanceSquared(
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  posX: number,
  posY: number,
  posZ: number
): number {
  const dx = cameraX - posX;
  const dy = cameraY - posY;
  const dz = cameraZ - posZ;
  return dx * dx + dy * dy + dz * dz;
}

/**
 * Check if an instance should be visible based on camera distance.
 * @param cameraPos - Camera world position
 * @param instancePos - Instance position as [x, y, z]
 * @param cullDistanceSquared - Squared cull distance threshold
 * @returns true if instance should be visible, false if culled
 */
export function isInstanceVisible(
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  instancePos: [number, number, number],
  cullDistanceSquared: number
): boolean {
  const distSq = getDistanceSquared(
    cameraX,
    cameraY,
    cameraZ,
    instancePos[0],
    instancePos[1],
    instancePos[2]
  );
  return distSq < cullDistanceSquared;
}

/**
 * Get the appropriate cull distance squared for a quality level.
 * Far instances are culled to reduce GPU overdraw.
 *
 * Returns squared distance to avoid sqrt in hot path.
 */
export function getCullDistanceSquared(machineLodDistance: number): number {
  // Use 3.0x the LOD distance as the cull threshold
  // This gives a buffer zone where simplified geometry shows before complete culling
  const cullDist = machineLodDistance * 3.0;
  return cullDist * cullDist;
}
