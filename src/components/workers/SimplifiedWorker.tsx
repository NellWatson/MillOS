/**
 * Medium-distance personnel.
 *
 * This LOD keeps an adult silhouette, separate hands and boots, role colours,
 * PPE, and a restrained face. It intentionally drops close facial layers,
 * garment seams, and most accessories.
 */

import React, { useMemo } from 'react';
import { ToolAccessory } from './WorkerTools';
import { SHARED_WORKER_GEOMETRY as GEO } from './SharedWorkerGeometries';
import {
  SHARED_WORKER_MATERIALS as MAT,
  getAccentMaterial,
  getHatMaterial,
  getPantsMaterial,
  getSkinMaterial,
  getUniformMaterial,
} from './SharedWorkerMaterials';
import type { SimplifiedPoseRefs, WorkerAppearance } from './workerTypes';

export interface SimplifiedWorkerProps {
  appearance: WorkerAppearance;
  poseRefs: SimplifiedPoseRefs;
}

export const SimplifiedWorker: React.FC<SimplifiedWorkerProps> = React.memo(
  ({ appearance, poseRefs }) => {
    const materials = useMemo(
      () => ({
        uniform: getUniformMaterial(appearance.uniformColor),
        skin: getSkinMaterial(appearance.skinTone),
        hat: getHatMaterial(appearance.hatColor),
        pants: getPantsMaterial(appearance.pantsColor),
        accent: getAccentMaterial(appearance.accentColor),
      }),
      [
        appearance.accentColor,
        appearance.hatColor,
        appearance.pantsColor,
        appearance.skinTone,
        appearance.uniformColor,
      ]
    );
    const handMaterial = appearance.hasGloves ? MAT.glove : materials.skin;
    const torsoMaterial = appearance.hasVest
      ? MAT.vestOrange
      : appearance.hasLabCoat
        ? MAT.offWhite
        : materials.uniform;

    return (
      <group
        position={[0, 0.12, 0]}
        scale={[
          0.92 * appearance.bodyScale,
          0.92 * appearance.heightScale,
          0.92 * appearance.bodyScale,
        ]}
        dispose={null}
      >
        <mesh
          castShadow
          position={[0, 1.21, 0]}
          scale={[1, 1, 0.56]}
          geometry={GEO.mediumTorso}
          material={torsoMaterial}
        />
        <mesh
          castShadow
          position={[0, 0.78, 0]}
          scale={[1, 1, 0.56]}
          geometry={GEO.mediumWaist}
          material={materials.pants}
        />

        {appearance.hasVest && (
          <>
            {/* Seated 7.4 mm further in than before: the redesigned
                `mediumTorso` narrows the chest from r 0.2507 to 0.2433 at this
                height, and the bars are flat plates pinned in z, so leaving
                them at 0.158 lifted them off the body the torso reshape was
                supposed to sit them on. */}
            {[1.34, 1.12].map((y) => (
              <mesh
                key={y}
                position={[0, y, 0.1506]}
                geometry={GEO.mediumStripe}
                material={MAT.reflective}
              />
            ))}
          </>
        )}

        <group position={[0, 1.78, 0]} scale={appearance.headScale}>
          <mesh
            castShadow
            scale={[0.94, 1.06, 0.9]}
            geometry={GEO.mediumHead}
            material={materials.skin}
          />
          <mesh
            position={[0, -0.02, 0.15]}
            scale={0.82}
            geometry={GEO.mediumNose}
            material={materials.skin}
          />
          <mesh
            position={[0, -0.075, 0.155]}
            scale={[0.55, 0.16, 0.4]}
            geometry={GEO.mouth}
            material={MAT.lips}
          />
          {appearance.hasHardHat && (
            <group position={[0, 0.1, 0]}>
              <mesh castShadow geometry={GEO.mediumHat} material={materials.hat} />
              <mesh
                position={[0, -0.01, 0.012]}
                geometry={GEO.mediumHatBrim}
                material={materials.hat}
              />
            </group>
          )}
          {appearance.hasSafetyGlasses && (
            <mesh
              position={[0, 0.025, 0.155]}
              scale={[0.135, 0.035, 0.012]}
              geometry={GEO.box_small}
              material={MAT.safetyLens}
              renderOrder={2}
            />
          )}
        </group>

        {(
          [
            ['left', -0.31, poseRefs.leftArm, true],
            ['right', 0.31, poseRefs.rightArm, false],
          ] as const
        ).map(([side, x, armRef, carriesTool]) => (
          <group key={side} ref={armRef} position={[x, 1.38, 0]}>
            <mesh
              castShadow
              position={[0, -0.23, 0]}
              geometry={GEO.mediumArm}
              material={materials.uniform}
            />
            <group position={[0, -0.52, 0.015]}>
              <mesh castShadow geometry={GEO.mediumHand} material={handMaterial} />
              {carriesTool && <ToolAccessory tool={appearance.tool} />}
            </group>
          </group>
        ))}

        {(
          [
            ['left', -0.12, poseRefs.leftLeg],
            ['right', 0.12, poseRefs.rightLeg],
          ] as const
        ).map(([side, x, legRef]) => (
          <group key={side} ref={legRef} position={[x, 0.68, 0]}>
            <mesh
              castShadow
              position={[0, -0.31, 0]}
              geometry={GEO.mediumLeg}
              material={materials.pants}
            />
            <mesh
              castShadow
              position={[0, -0.67, 0.055]}
              geometry={GEO.mediumBoot}
              material={MAT.boot}
            />
          </group>
        ))}

        <mesh
          position={[0.15, 1.33, 0.164]}
          scale={[0.08, 0.052, 0.01]}
          geometry={GEO.box_small}
          material={materials.accent}
        />
      </group>
    );
  }
);

SimplifiedWorker.displayName = 'SimplifiedWorker';
