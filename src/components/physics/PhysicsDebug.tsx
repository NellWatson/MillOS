/**
 * Physics debug visualization component
 *
 * Shows wireframe outlines of static colliders when enabled.
 * Only active on ultra quality for debugging collision geometry.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { useGraphicsStore } from '../../stores/graphicsStore';
import { FACTORY_BOUNDS } from '../../physics/PhysicsConfig';

// Obstacle definition for visualization
interface DebugObstacle {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY?: number;
  maxY?: number;
}

// Generate obstacle data matching FactoryColliders definitions
function generateDebugObstacles(): DebugObstacle[] {
  const obstacles: DebugObstacle[] = [];
  const WORKER_PADDING = 1.0;

  // SILOS (Zone 1, z=-22) - 5 silos
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

  // ROLLER MILLS (Zone 2, z=-6) - 4 mills
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

  // PACKERS (Zone 4, z=25) - 3 packers
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

  return obstacles;
}

/**
 * Conditionally renders wireframe debug visualization
 * Only active when quality is 'ultra'
 */
export const PhysicsDebug: React.FC = () => {
  const quality = useGraphicsStore((state) => state.graphics.quality);

  // Only show debug on ultra quality
  if (quality !== 'ultra') return null;

  const obstacles = useMemo(() => generateDebugObstacles(), []);

  // Create wireframe material
  const wireframeMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.5,
        depthTest: false,
      }),
    []
  );

  return (
    <group name="physics-debug">
      {/* Factory boundary wireframes */}
      <lineSegments>
        <edgesGeometry
          args={[
            new THREE.BoxGeometry(
              FACTORY_BOUNDS.maxX * 2,
              FACTORY_BOUNDS.height,
              FACTORY_BOUNDS.maxZ * 2
            ),
          ]}
        />
        <primitive object={wireframeMaterial} attach="material" />
      </lineSegments>

      {/* Obstacle wireframes */}
      {obstacles.map((obs) => {
        const width = obs.maxX - obs.minX;
        const height = (obs.maxY ?? 5) - (obs.minY ?? 0);
        const depth = obs.maxZ - obs.minZ;
        const centerX = (obs.minX + obs.maxX) / 2;
        const centerY = ((obs.minY ?? 0) + (obs.maxY ?? 5)) / 2;
        const centerZ = (obs.minZ + obs.maxZ) / 2;

        return (
          <lineSegments key={obs.id} position={[centerX, centerY, centerZ]}>
            <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
            <primitive object={wireframeMaterial} attach="material" />
          </lineSegments>
        );
      })}
    </group>
  );
};

export default PhysicsDebug;
