/**
 * WorkerBillboard - Low LOD Worker Model
 *
 * Minimal geometry for distant rendering (~3 meshes).
 * Static pose - no animation refs needed.
 * NO useFrame - purely static geometry.
 */

import React from 'react';
import { WorkerAppearance } from './workerTypes';

export interface WorkerBillboardProps {
  appearance: WorkerAppearance;
}

/**
 * WorkerBillboard - Lowest-fidelity worker model
 * ~3 meshes for distant rendering (50+ units)
 */
export const WorkerBillboard: React.FC<WorkerBillboardProps> = React.memo(({ appearance }) => {
  const { uniformColor, hasVest, hatColor } = appearance;

  return (
    <group scale={[0.85, 0.85, 0.85]} position={[0, 0.15, 0]}>
      {/* Simple body - single box */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[0.4, 1.2, 0.25]} />
        <meshStandardMaterial color={hasVest ? '#f97316' : uniformColor} roughness={0.8} />
      </mesh>

      {/* Head - sphere */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#f5d0c5" roughness={0.6} />
      </mesh>

      {/* Hard hat */}
      <mesh position={[0, 1.95, 0]}>
        <sphereGeometry args={[0.17, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={hatColor} roughness={0.5} />
      </mesh>
    </group>
  );
});

WorkerBillboard.displayName = 'WorkerBillboard';
