import * as THREE from 'three';

// Shared geometries for worker body parts to reduce memory overhead
// and instantiation costs. These are reused across all worker instances.

export const SHARED_WORKER_GEOMETRY = {
  // Primitives
  box_small: new THREE.BoxGeometry(1, 1, 1), // Scalable unit box
  sphere_low: new THREE.SphereGeometry(1, 8, 8), // Low poly unit sphere
  sphere_med: new THREE.SphereGeometry(1, 12, 12),
  sphere_high: new THREE.SphereGeometry(1, 16, 16),
  cylinder_low: new THREE.CylinderGeometry(1, 1, 1, 8),
  cylinder_med: new THREE.CylinderGeometry(1, 1, 1, 12),
  capsule_med: new THREE.CapsuleGeometry(1, 1, 4, 8),

  // Specific pre-sized parts (to avoid scaling unit primitives if needed)
  torso: new THREE.BoxGeometry(0.48, 0.45, 0.24),
  head: new THREE.SphereGeometry(0.17, 16, 16),
  limb_capsule: new THREE.CapsuleGeometry(0.075, 0.28, 4, 8),
  boot: new THREE.BoxGeometry(0.1, 0.1, 0.16),

  // Billboard / LOD parts
  billboard_body: new THREE.BoxGeometry(0.4, 1.2, 0.25),
  billboard_head: new THREE.SphereGeometry(0.15, 8, 8),
};
