/**
 * Shared-geometry personnel hair silhouettes.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { SHARED_WORKER_MATERIALS, getHairMaterial } from './SharedWorkerMaterials';
import type { HairStyle } from './workerTypes';

const hairGeometry = {
  crown: new THREE.SphereGeometry(0.178, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.58),
  side: new THREE.CapsuleGeometry(0.038, 0.1, 3, 7),
  back: new THREE.SphereGeometry(0.13, 12, 8),
  curl: new THREE.SphereGeometry(0.052, 8, 7),
  ponytail: new THREE.CapsuleGeometry(0.045, 0.16, 4, 8),
  fringe: new THREE.SphereGeometry(0.065, 10, 7),
  tie: new THREE.TorusGeometry(0.035, 0.008, 6, 12),
};

export const Hair: React.FC<{ style: HairStyle; color: string }> = React.memo(
  ({ style, color }) => {
    const material = useMemo(() => getHairMaterial(color), [color]);

    if (style === 'bald') return null;

    return (
      <group>
        <mesh
          castShadow
          position={[0, 0.035, -0.005]}
          scale={[1.01, 0.9, 1.01]}
          geometry={hairGeometry.crown}
          material={material}
        />

        {style === 'short' && (
          <>
            {[-0.145, 0.145].map((x) => (
              <mesh
                key={x}
                castShadow
                position={[x, -0.02, -0.03]}
                scale={[0.75, 0.8, 0.72]}
                geometry={hairGeometry.side}
                material={material}
              />
            ))}
          </>
        )}

        {style === 'medium' && (
          <>
            {[-0.145, 0.145].map((x) => (
              <mesh
                key={x}
                castShadow
                position={[x, -0.075, -0.025]}
                scale={[0.82, 1.15, 0.8]}
                geometry={hairGeometry.side}
                material={material}
              />
            ))}
            <mesh
              castShadow
              position={[0, -0.075, -0.105]}
              scale={[1.15, 1.05, 0.72]}
              geometry={hairGeometry.back}
              material={material}
            />
          </>
        )}

        {style === 'curly' && (
          <group position={[0, 0.035, -0.01]}>
            {[
              [-0.13, 0.01, 0.01],
              [0.13, 0.01, 0.01],
              [-0.12, -0.06, -0.07],
              [0.12, -0.06, -0.07],
              [0, -0.065, -0.14],
              [-0.075, 0.07, -0.08],
              [0.075, 0.07, -0.08],
            ].map((position, index) => (
              <mesh
                key={index}
                castShadow
                position={position as [number, number, number]}
                geometry={hairGeometry.curl}
                material={material}
              />
            ))}
          </group>
        )}

        {style === 'ponytail' && (
          <group position={[0, -0.025, -0.145]}>
            <mesh
              castShadow
              position={[0, -0.105, -0.025]}
              rotation={[0.2, 0, 0]}
              geometry={hairGeometry.ponytail}
              material={material}
            />
            <mesh
              position={[0, -0.015, -0.015]}
              rotation={[Math.PI / 2, 0, 0]}
              geometry={hairGeometry.tie}
              material={SHARED_WORKER_MATERIALS.darkGray}
            />
          </group>
        )}

        {(style === 'medium' || style === 'ponytail') && (
          <mesh
            castShadow
            position={[-0.055, 0.065, 0.135]}
            scale={[1.3, 0.65, 0.45]}
            geometry={hairGeometry.fringe}
            material={material}
          />
        )}
      </group>
    );
  }
);

Hair.displayName = 'Hair';
