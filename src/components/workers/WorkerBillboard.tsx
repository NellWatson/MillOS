/**
 * Lowest-cost personnel LOD with a stable identity silhouette.
 */

import React, { useMemo } from 'react';
import { SHARED_WORKER_GEOMETRY as GEO } from './SharedWorkerGeometries';
import {
  getAccentMaterial,
  getHatMaterial,
  getSkinMaterial,
  getUniformMaterial,
} from './SharedWorkerMaterials';
import type { WorkerAppearance } from './workerTypes';

export interface WorkerBillboardProps {
  appearance: WorkerAppearance;
}

export const WorkerBillboard: React.FC<WorkerBillboardProps> = React.memo(({ appearance }) => {
  const materials = useMemo(
    () => ({
      body: getUniformMaterial(appearance.hasVest ? '#f97316' : appearance.uniformColor),
      skin: getSkinMaterial(appearance.skinTone),
      hat: getHatMaterial(appearance.hatColor),
      accent: getAccentMaterial(appearance.accentColor),
    }),
    [
      appearance.accentColor,
      appearance.hasVest,
      appearance.hatColor,
      appearance.skinTone,
      appearance.uniformColor,
    ]
  );

  return (
    <group
      scale={[
        0.85 * appearance.bodyScale,
        0.85 * appearance.heightScale,
        0.85 * appearance.bodyScale,
      ]}
      position={[0, 0.04, 0]}
      dispose={null}
    >
      <mesh
        position={[0, 0.9, 0]}
        castShadow
        geometry={GEO.billboard_body}
        material={materials.body}
      />
      <mesh
        position={[0, 2, 0]}
        castShadow
        geometry={GEO.billboard_head}
        material={materials.skin}
      />
      <mesh position={[0, 2.15, 0]} geometry={GEO.billboard_hat} material={materials.hat} />
      <mesh
        position={[0, 1.15, 0.132]}
        geometry={GEO.billboard_stripe}
        material={materials.accent}
      />
    </group>
  );
});

WorkerBillboard.displayName = 'WorkerBillboard';
