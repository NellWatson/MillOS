/**
 * Static physics colliders for factory machines, walls, and obstacles
 *
 * These are fixed rigid bodies that workers, forklifts, and player collide with.
 * Extracted from MillScene.tsx obstacle definitions for physics-based collision.
 */

import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { useMemo } from 'react';
import {
  FACTORY_BOUNDS,
  COLLISION_FILTERS,
  createCollisionGroups,
} from '../../physics/PhysicsConfig';

// Obstacle definition matching MillScene.tsx structure
interface ObstacleData {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY?: number;
  maxY?: number;
  forkliftOnly?: boolean;
}

// Generate obstacle data matching MillScene.tsx definitions
function generateObstacles(): ObstacleData[] {
  const obstacles: ObstacleData[] = [];
  const WORKER_PADDING = 1.0;

  // SILOS (Zone 1, z=-22) - 5 silos with size [4.5, 16, 4.5]
  for (let i = -2; i <= 2; i++) {
    const x = i * 9;
    obstacles.push({
      id: `silo-${i + 2}`,
      minX: x - 2.25 - WORKER_PADDING,
      maxX: x + 2.25 + WORKER_PADDING,
      minZ: -22 - 2.25 - WORKER_PADDING,
      maxZ: -22 + 2.25 + WORKER_PADDING,
      minY: 0,
      maxY: 16,
    });
  }

  // ROLLER MILLS (Zone 2, z=-6) - 4 mills with size [3.5, 5, 3.5]
  for (const i of [-3, -1.5, 1.5, 3]) {
    const x = i * 5;
    obstacles.push({
      id: `mill-${i}`,
      minX: x - 1.75 - WORKER_PADDING,
      maxX: x + 1.75 + WORKER_PADDING,
      minZ: -6 - 1.75 - WORKER_PADDING,
      maxZ: -6 + 1.75 + WORKER_PADDING,
      minY: 0,
      maxY: 5,
    });
  }

  // PLANSIFTERS (Zone 3, z=6) - Cable anchor points only (elevated machines)
  for (let i = -1; i <= 1; i++) {
    const x = i * 14;
    const cablePositions = [
      [-3.2, -3.2],
      [-3.2, 3.2],
      [3.2, -3.2],
      [3.2, 3.2],
    ];
    cablePositions.forEach(([dx, dz], idx) => {
      obstacles.push({
        id: `sifter-cable-${i}-${idx}`,
        minX: x + dx - 0.5,
        maxX: x + dx + 0.5,
        minZ: 6 + dz - 0.5,
        maxZ: 6 + dz + 0.5,
        minY: 0,
        maxY: 9, // Cable runs to elevated sifter
      });
    });
  }

  // PACKERS (Zone 4, z=25) - 3 packers with size [4, 6, 4]
  for (let i = -1; i <= 1; i++) {
    const x = i * 8;
    obstacles.push({
      id: `packer-${i + 1}`,
      minX: x - 2 - WORKER_PADDING,
      maxX: x + 2 + WORKER_PADDING,
      minZ: 25 - 2 - WORKER_PADDING,
      maxZ: 25 + 2 + WORKER_PADDING,
      minY: 0,
      maxY: 6,
    });
  }

  // CONVEYOR SYSTEM
  obstacles.push({
    id: 'main-conveyor',
    minX: -28,
    maxX: 28,
    minZ: 22.5,
    maxZ: 25.5,
    minY: 0,
    maxY: 1.5,
  });

  obstacles.push({
    id: 'roller-conveyor',
    minX: -15,
    maxX: 15,
    minZ: 19.5,
    maxZ: 22.5,
    minY: 0,
    maxY: 1,
  });

  // LOADING DOCKS
  obstacles.push({
    id: 'shipping-dock',
    minX: -18,
    maxX: 18,
    minZ: 44,
    maxZ: 54,
    minY: 0,
    maxY: 1.5,
  });

  obstacles.push({
    id: 'receiving-dock',
    minX: -10,
    maxX: 10,
    minZ: -54,
    maxZ: -44,
    minY: 0,
    maxY: 1.5,
  });

  // AMENITY BUILDINGS (forklift-only in legacy, but physics uses full collision)
  obstacles.push({
    id: 'break-room-left',
    minX: -53,
    maxX: -47,
    minZ: -22.5,
    maxZ: -17.5,
    minY: 0,
    maxY: 3,
    forkliftOnly: true,
  });

  obstacles.push({
    id: 'break-room-right',
    minX: 47,
    maxX: 53,
    minZ: -22.5,
    maxZ: -17.5,
    minY: 0,
    maxY: 3,
    forkliftOnly: true,
  });

  obstacles.push({
    id: 'toilet-block',
    minX: 31,
    maxX: 39,
    minZ: 32.5,
    maxZ: 37.5,
    minY: 0,
    maxY: 3,
    forkliftOnly: true,
  });

  obstacles.push({
    id: 'locker-room',
    minX: -54,
    maxX: -46,
    minZ: -38,
    maxZ: -32,
    minY: 0,
    maxY: 3,
    forkliftOnly: true,
  });

  obstacles.push({
    id: 'manager-office',
    minX: -24,
    maxX: -16,
    minZ: 27,
    maxZ: 33,
    minY: 0,
    maxY: 3,
    forkliftOnly: true,
  });

  return obstacles;
}

/**
 * Static factory colliders - machines, walls, and obstacles
 */
export const FactoryColliders: React.FC = () => {
  const obstacles = useMemo(() => generateObstacles(), []);
  const collisionGroups = useMemo(
    () =>
      createCollisionGroups(
        COLLISION_FILTERS.static.memberships,
        COLLISION_FILTERS.static.filter
      ),
    []
  );

  return (
    <>
      {/* Factory boundary walls - invisible physics walls */}
      <RigidBody type="fixed" collisionGroups={collisionGroups}>
        {/* Back wall (z = -80) */}
        <CuboidCollider
          args={[FACTORY_BOUNDS.maxX, FACTORY_BOUNDS.height / 2, 1]}
          position={[0, FACTORY_BOUNDS.height / 2, FACTORY_BOUNDS.minZ]}
        />
        {/* Front wall (z = 80) */}
        <CuboidCollider
          args={[FACTORY_BOUNDS.maxX, FACTORY_BOUNDS.height / 2, 1]}
          position={[0, FACTORY_BOUNDS.height / 2, FACTORY_BOUNDS.maxZ]}
        />
        {/* Left wall (x = -60) */}
        <CuboidCollider
          args={[1, FACTORY_BOUNDS.height / 2, FACTORY_BOUNDS.maxZ]}
          position={[FACTORY_BOUNDS.minX, FACTORY_BOUNDS.height / 2, 0]}
        />
        {/* Right wall (x = 60) */}
        <CuboidCollider
          args={[1, FACTORY_BOUNDS.height / 2, FACTORY_BOUNDS.maxZ]}
          position={[FACTORY_BOUNDS.maxX, FACTORY_BOUNDS.height / 2, 0]}
        />
      </RigidBody>

      {/* Floor - prevents falling through */}
      <RigidBody type="fixed" collisionGroups={collisionGroups}>
        <CuboidCollider
          args={[FACTORY_BOUNDS.maxX, 0.5, FACTORY_BOUNDS.maxZ]}
          position={[0, -0.5, 0]}
        />
      </RigidBody>

      {/* Machine and obstacle colliders */}
      {obstacles.map((obs) => {
        const width = (obs.maxX - obs.minX) / 2;
        const height = ((obs.maxY ?? 5) - (obs.minY ?? 0)) / 2;
        const depth = (obs.maxZ - obs.minZ) / 2;
        const centerX = (obs.minX + obs.maxX) / 2;
        const centerY = ((obs.minY ?? 0) + (obs.maxY ?? 5)) / 2;
        const centerZ = (obs.minZ + obs.maxZ) / 2;

        return (
          <RigidBody
            key={obs.id}
            type="fixed"
            collisionGroups={collisionGroups}
            userData={{ obstacleId: obs.id, forkliftOnly: obs.forkliftOnly }}
          >
            <CuboidCollider
              args={[width, height, depth]}
              position={[centerX, centerY, centerZ]}
            />
          </RigidBody>
        );
      })}
    </>
  );
};

export default FactoryColliders;
