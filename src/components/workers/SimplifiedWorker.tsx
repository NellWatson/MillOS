/**
 * SimplifiedWorker - Medium LOD Worker Model
 *
 * Simplified geometry for medium distance (~9 meshes).
 * Receives refs from parent for basic limb animation.
 * NO useFrame - animations handled by WorkerAnimationManager.
 */

import React from 'react';
import { WorkerAppearance, SimplifiedPoseRefs } from './workerTypes';

export interface SimplifiedWorkerProps {
  appearance: WorkerAppearance;
  poseRefs: SimplifiedPoseRefs;
}

/**
 * SimplifiedWorker - Medium-fidelity worker model
 * ~9 meshes for medium distance rendering
 */
export const SimplifiedWorker: React.FC<SimplifiedWorkerProps> = React.memo(
  ({ appearance, poseRefs }) => {
    const { uniformColor, skinTone, hatColor, hasVest, pantsColor } = appearance;

    return (
      <group position={[0, 0.15, 0]}>
        {/* Torso - combined chest and hips */}
        <mesh position={[0, 1.1, 0]} castShadow>
          <boxGeometry args={[0.5, 0.9, 0.25]} />
          <meshStandardMaterial color={hasVest ? '#f97316' : uniformColor} roughness={0.7} />
        </mesh>

        {/* Head */}
        <mesh position={[0, 1.75, 0]} castShadow>
          <sphereGeometry args={[0.15, 12, 12]} />
          <meshStandardMaterial color={skinTone} roughness={0.6} />
        </mesh>

        {/* Hard hat */}
        <mesh position={[0, 1.9, 0]} castShadow>
          <sphereGeometry args={[0.17, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={hatColor} roughness={0.5} />
        </mesh>

        {/* Left arm */}
        <group ref={poseRefs.leftArm} position={[-0.3, 1.3, 0]}>
          <mesh position={[0, -0.25, 0]} castShadow>
            <boxGeometry args={[0.12, 0.5, 0.12]} />
            <meshStandardMaterial color={uniformColor} roughness={0.7} />
          </mesh>
        </group>

        {/* Right arm */}
        <group ref={poseRefs.rightArm} position={[0.3, 1.3, 0]}>
          <mesh position={[0, -0.25, 0]} castShadow>
            <boxGeometry args={[0.12, 0.5, 0.12]} />
            <meshStandardMaterial color={uniformColor} roughness={0.7} />
          </mesh>
        </group>

        {/* Hips */}
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[0.45, 0.3, 0.25]} />
          <meshStandardMaterial color={pantsColor} roughness={0.8} />
        </mesh>

        {/* Left leg */}
        <group ref={poseRefs.leftLeg} position={[-0.13, 0.55, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <boxGeometry args={[0.15, 0.6, 0.15]} />
            <meshStandardMaterial color={pantsColor} roughness={0.8} />
          </mesh>
        </group>

        {/* Right leg */}
        <group ref={poseRefs.rightLeg} position={[0.13, 0.55, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <boxGeometry args={[0.15, 0.6, 0.15]} />
            <meshStandardMaterial color={pantsColor} roughness={0.8} />
          </mesh>
        </group>
      </group>
    );
  }
);

SimplifiedWorker.displayName = 'SimplifiedWorker';
