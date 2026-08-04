/**
 * Physics debug visualization component
 *
 * Shows wireframe outlines of static colliders when performance diagnostics
 * are explicitly enabled. Visual quality alone never exposes debug geometry.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { useGraphicsStore } from '../../stores/graphicsStore';
import { WORLD_RADIUS } from '../../physics/PhysicsConfig';
import { createMachineObstacles } from '../../constants/factoryObstacles';

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
  return createMachineObstacles();
}

/**
 * Conditionally renders wireframe debug visualization.
 */
export const PhysicsDebug: React.FC = () => {
  const quality = useGraphicsStore((state) => state.graphics.quality);
  const showPerfOverlay = useGraphicsStore((state) => state.graphics.perfDebug.showPerfOverlay);

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

  // Create circular boundary ring geometry
  const boundaryRingGeometry = useMemo(() => {
    const segments = 64;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(Math.cos(angle) * WORLD_RADIUS, 0, Math.sin(angle) * WORLD_RADIUS)
      );
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  // Keep hook order stable while requiring an explicit diagnostics opt-in.
  if (quality !== 'ultra' || !showPerfOverlay) return null;

  return (
    <group name="physics-debug">
      {/* Circular world boundary wireframe (bottom ring) */}
      <primitive object={new THREE.Line(boundaryRingGeometry, wireframeMaterial)} />

      {/* Circular world boundary wireframe (top ring at height 35) */}
      <primitive
        object={new THREE.Line(boundaryRingGeometry, wireframeMaterial)}
        position={[0, 35, 0]}
      />

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
