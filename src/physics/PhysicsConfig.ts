/**
 * Physics configuration for Rapier physics engine integration
 *
 * Uses @react-three/rapier for physics simulation of workers, forklifts, and player
 */

// Physics world configuration
export const PHYSICS_CONFIG = {
  gravity: [0, -9.81, 0] as const,
  timestep: 1 / 60,

  // Worker physics properties
  worker: {
    mass: 70,
    linearDamping: 8, // High damping for responsive stop
    angularDamping: 5,
    maxLinearVelocity: 3, // Normal walk speed
    maxEvacuationVelocity: 6, // Fire drill run speed
    moveForce: 800, // Force applied for movement
    evacuationForce: 1200, // Force for emergency evacuation
    // Soft collision avoidance (worker-to-worker)
    avoidanceRadius: 2.0, // Distance at which workers start avoiding each other
    avoidanceForce: 400, // Force applied to separate overlapping workers
    personalSpace: 1.2, // Minimum comfortable distance between workers
  },

  // Forklift physics properties
  forklift: {
    mass: 2000,
    linearDamping: 4,
    angularDamping: 10,
    maxLinearVelocity: 4, // Normal speed
    maxSlowVelocity: 2, // Crossing zone speed
    moveForce: 6000,
  },

  // First-person player properties
  player: {
    mass: 80,
    linearDamping: 12, // Very high for responsive feel
    angularDamping: 1,
    maxLinearVelocity: 12, // Walk speed
    maxSprintVelocity: 36, // Sprint speed (3x walk)
    moveForce: 1500,
    sprintForce: 4500,
    height: 1.7, // Eye height
    capsuleRadius: 0.4,
    capsuleHalfHeight: 0.5,
  },
} as const;

// Collision groups using bit masks for efficient filtering
// Workers and forklifts don't collide with each other for performance
export const COLLISION_GROUPS = {
  NONE: 0x0000,
  STATIC: 0x0001, // Walls, machines, obstacles
  WORKER: 0x0002, // Worker NPCs
  FORKLIFT: 0x0004, // Forklifts
  PLAYER: 0x0008, // First-person player
  SENSOR: 0x0010, // Trigger zones (exits, crossings)
  ALL: 0xffff,
} as const;

// Collision filters: [membership, filter]
// membership = what group this body belongs to
// filter = what groups this body collides with
export const COLLISION_FILTERS = {
  // Static objects collide with everything except sensors
  static: {
    memberships: COLLISION_GROUPS.STATIC,
    filter:
      COLLISION_GROUPS.WORKER |
      COLLISION_GROUPS.FORKLIFT |
      COLLISION_GROUPS.PLAYER,
  },

  // Workers collide with static and player, not other workers or forklifts
  // This prevents crowding issues and improves performance
  worker: {
    memberships: COLLISION_GROUPS.WORKER,
    filter: COLLISION_GROUPS.STATIC | COLLISION_GROUPS.PLAYER,
  },

  // Forklifts collide with static and player only
  forklift: {
    memberships: COLLISION_GROUPS.FORKLIFT,
    filter: COLLISION_GROUPS.STATIC | COLLISION_GROUPS.PLAYER,
  },

  // Player collides with everything physical
  player: {
    memberships: COLLISION_GROUPS.PLAYER,
    filter:
      COLLISION_GROUPS.STATIC |
      COLLISION_GROUPS.WORKER |
      COLLISION_GROUPS.FORKLIFT,
  },

  // Sensors detect workers for fire drill exits
  sensor: {
    memberships: COLLISION_GROUPS.SENSOR,
    filter: COLLISION_GROUPS.WORKER,
  },
} as const;

// Factory bounds for physics world
export const FACTORY_BOUNDS = {
  minX: -60,
  maxX: 60,
  minZ: -80,
  maxZ: 80,
  height: 35,
} as const;

// Helper to create collision groups value for Rapier
// Returns a number encoding both membership and filter
export function createCollisionGroups(
  membership: number,
  filter: number
): number {
  // Rapier expects: (membership << 16) | filter
  return (membership << 16) | filter;
}
