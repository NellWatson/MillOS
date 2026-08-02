/**
 * Close-range procedural personnel.
 *
 * The workers deliberately share a coherent low-poly art direction rather than
 * looking like stacked primitives. Rounded garment volumes, adult proportions,
 * restrained facial features, PPE, role equipment, and named appearance
 * profiles carry identity without requiring ten separate skinned assets.
 */

import React, { useMemo } from 'react';
import { Hair } from './WorkerHair';
import { ToolAccessory } from './WorkerTools';
import { SHARED_WORKER_GEOMETRY as GEO } from './SharedWorkerGeometries';
import {
  SHARED_WORKER_MATERIALS as MAT,
  getAccentMaterial,
  getHairMaterial,
  getHatMaterial,
  getPantsMaterial,
  getSkinMaterial,
  getSkinSoftMaterial,
  getUniformMaterial,
} from './SharedWorkerMaterials';
import type { WorkerAppearance, WorkerPoseRefs } from './workerTypes';

const SafetyGlasses: React.FC = React.memo(() => (
  <group position={[0, 0.025, 0.156]}>
    {[-0.054, 0.054].map((x) => (
      <mesh
        key={x}
        position={[x, 0, 0]}
        geometry={GEO.glassesLens}
        material={MAT.safetyLens}
        renderOrder={2}
      />
    ))}
    <mesh rotation={[0, 0, Math.PI / 2]} geometry={GEO.glassesBridge} material={MAT.darkGray} />
  </group>
));
SafetyGlasses.displayName = 'SafetyGlasses';

const HearingProtection: React.FC<{ material: ReturnType<typeof getAccentMaterial> }> = React.memo(
  ({ material }) => (
    <group position={[0, 0.012, 0]}>
      {[-0.19, 0.19].map((x) => (
        <mesh
          key={x}
          position={[x, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          geometry={GEO.earmuffCup}
          material={material}
        />
      ))}
      <mesh
        position={[0, 0.08, 0]}
        rotation={[0, 0, Math.PI]}
        geometry={GEO.earmuffBand}
        material={MAT.darkGray}
      />
    </group>
  )
);
HearingProtection.displayName = 'HearingProtection';

const HardHat: React.FC<{ material: ReturnType<typeof getHatMaterial> }> = React.memo(
  ({ material }) => (
    <group position={[0, 0.085, 0]}>
      <mesh castShadow geometry={GEO.hardHatDome} material={material} />
      <mesh
        castShadow
        position={[0, -0.012, 0.014]}
        geometry={GEO.hardHatBrim}
        material={material}
      />
      <mesh
        castShadow
        position={[0, 0.08, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        geometry={GEO.hardHatRidge}
        material={material}
      />
    </group>
  )
);
HardHat.displayName = 'HardHat';

const ShoulderRadio: React.FC = React.memo(() => (
  <group position={[0.23, 0.4, 0.15]} rotation={[0.08, 0, -0.12]}>
    <mesh geometry={GEO.radioBody} material={MAT.darkGray} />
    <mesh position={[0.012, 0.085, 0]} geometry={GEO.radioAntenna} material={MAT.mediumGray} />
    <mesh
      position={[0, 0.025, 0.018]}
      scale={0.006}
      geometry={GEO.sphere_low}
      material={MAT.safetyGreenBright}
    />
  </group>
));
ShoulderRadio.displayName = 'ShoulderRadio';

const ToolBelt: React.FC = React.memo(() => (
  <group position={[0, 0.74, 0]}>
    <mesh geometry={GEO.belt} material={MAT.darkGray} />
    <mesh position={[-0.18, -0.08, 0.1]} geometry={GEO.toolPouch} material={MAT.clipboardBrown} />
    <mesh position={[0.18, -0.08, 0.1]} geometry={GEO.toolPouch} material={MAT.clipboardBrown} />
    <mesh position={[0, -0.02, 0.126]} geometry={GEO.buckle} material={MAT.chromeShiny} />
  </group>
));
ToolBelt.displayName = 'ToolBelt';

const LabCoat: React.FC = React.memo(() => (
  <group position={[0, 0.92, 0]}>
    <mesh position={[-0.127, 0, 0.068]} geometry={GEO.coatPanel} material={MAT.offWhite} />
    <mesh position={[0.127, 0, 0.068]} geometry={GEO.coatPanel} material={MAT.offWhite} />
    <mesh
      position={[-0.073, 0.35, 0.148]}
      rotation={[0, 0, 0.45]}
      geometry={GEO.coatCollar}
      material={MAT.offWhite}
    />
    <mesh
      position={[0.073, 0.35, 0.148]}
      rotation={[0, 0, -0.45]}
      geometry={GEO.coatCollar}
      material={MAT.offWhite}
    />
    <mesh
      position={[-0.125, -0.1, 0.143]}
      scale={[0.85, 0.9, 1]}
      geometry={GEO.chestPocket}
      material={MAT.offWhite}
    />
  </group>
));
LabCoat.displayName = 'LabCoat';

export interface DetailedWorkerProps {
  appearance: WorkerAppearance;
  poseRefs: WorkerPoseRefs;
}

export const DetailedWorker: React.FC<DetailedWorkerProps> = React.memo(
  ({ appearance, poseRefs }) => {
    const materials = useMemo(
      () => ({
        uniform: getUniformMaterial(appearance.uniformColor),
        skin: getSkinMaterial(appearance.skinTone),
        skinSoft: getSkinSoftMaterial(appearance.skinTone),
        hair: getHairMaterial(appearance.hairColor),
        hat: getHatMaterial(appearance.hatColor),
        pants: getPantsMaterial(appearance.pantsColor),
        accent: getAccentMaterial(appearance.accentColor),
        iris: getAccentMaterial(appearance.eyeColor),
      }),
      [
        appearance.accentColor,
        appearance.eyeColor,
        appearance.hairColor,
        appearance.hatColor,
        appearance.pantsColor,
        appearance.skinTone,
        appearance.uniformColor,
      ]
    );

    const handMaterial = appearance.hasGloves ? MAT.glove : materials.skin;

    return (
      <group
        scale={[
          0.9 * appearance.bodyScale,
          0.9 * appearance.heightScale,
          0.9 * appearance.bodyScale,
        ]}
        position={[0, 0.17, 0]}
        dispose={null}
      >
        <group ref={poseRefs.torso} position={[0, 1.12, 0]}>
          <mesh
            ref={poseRefs.chest}
            castShadow
            position={[0, 0.2, 0]}
            scale={[1, 1, 0.5]}
            geometry={GEO.torso}
            material={materials.uniform}
          />
          {[-0.29, 0.29].map((x) => (
            <mesh
              key={x}
              castShadow
              position={[x, 0.32, 0]}
              scale={[0.9, 0.72, 0.82]}
              geometry={GEO.shoulder}
              material={materials.uniform}
            />
          ))}
          <mesh
            castShadow
            position={[0, -0.155, 0]}
            scale={[1, 1, 0.52]}
            geometry={GEO.waist}
            material={materials.uniform}
          />

          {appearance.hasVest ? (
            <group>
              <mesh
                castShadow
                position={[0, 0.15, 0.006]}
                scale={[1, 1, 0.5]}
                geometry={GEO.vest}
                material={MAT.vestOrange}
              />
              {[0.3, 0.06].map((y) => (
                <mesh
                  key={y}
                  position={[0, y, 0.153]}
                  geometry={GEO.vestStripe}
                  material={MAT.reflective}
                />
              ))}
              {[-0.13, 0.13].map((x) => (
                <mesh
                  key={x}
                  position={[x, 0.25, 0.153]}
                  geometry={GEO.vestShoulderStripe}
                  material={MAT.reflective}
                />
              ))}
            </group>
          ) : (
            <group>
              <mesh
                position={[0, 0.22, 0.149]}
                geometry={GEO.placket}
                material={materials.accent}
              />
              <mesh
                position={[0.15, 0.25, 0.149]}
                geometry={GEO.chestPocket}
                material={materials.uniform}
              />
            </group>
          )}

          <mesh
            castShadow
            position={[-0.075, 0.47, 0.045]}
            rotation={[0.1, 0, 0.48]}
            geometry={GEO.collar}
            material={materials.uniform}
          />
          <mesh
            castShadow
            position={[0.075, 0.47, 0.045]}
            rotation={[0.1, 0, -0.48]}
            geometry={GEO.collar}
            material={materials.uniform}
          />
          <mesh castShadow position={[0, 0.555, 0]} geometry={GEO.neck} material={materials.skin} />

          <group ref={poseRefs.head} position={[0, 0.755, 0]} scale={0.92 * appearance.headScale}>
            <mesh
              castShadow
              scale={[0.94, 1.04, 0.9]}
              geometry={GEO.head}
              material={materials.skinSoft}
            />
            <mesh
              castShadow
              position={[0, -0.09, 0.022]}
              scale={[1.08, 0.76, 0.9]}
              geometry={GEO.jaw}
              material={materials.skinSoft}
            />
            <mesh
              castShadow
              position={[0, -0.02, 0.148]}
              geometry={GEO.nose}
              material={materials.skinSoft}
            />
            <mesh
              castShadow
              position={[0, -0.021, 0.172]}
              geometry={GEO.noseTip}
              material={materials.skinSoft}
            />

            {[-0.055, 0.055].map((x) => (
              <React.Fragment key={x}>
                <mesh
                  position={[x, 0.025, 0.148]}
                  scale={[1, 0.62, 0.16]}
                  geometry={GEO.eye}
                  material={materials.iris}
                />
                <mesh
                  position={[x, 0.025, 0.151]}
                  scale={[1, 0.75, 0.18]}
                  geometry={GEO.pupil}
                  material={MAT.pupil}
                />
              </React.Fragment>
            ))}

            <mesh
              ref={poseRefs.leftEyelid}
              position={[-0.055, 0.043, 0.151]}
              geometry={GEO.eyelid}
              material={materials.skinSoft}
            />
            <mesh
              ref={poseRefs.rightEyelid}
              position={[0.055, 0.043, 0.151]}
              geometry={GEO.eyelid}
              material={materials.skinSoft}
            />
            <mesh
              position={[-0.055, 0.069, 0.147]}
              rotation={[0.1, 0, 0.12]}
              geometry={GEO.eyebrow}
              material={materials.hair}
            />
            <mesh
              position={[0.055, 0.069, 0.147]}
              rotation={[0.1, 0, -0.12]}
              geometry={GEO.eyebrow}
              material={materials.hair}
            />
            <mesh
              position={[0, -0.078, 0.145]}
              scale={[1, 0.42, 1]}
              geometry={GEO.mouth}
              material={MAT.lips}
            />
            {[-0.157, 0.157].map((x) => (
              <mesh
                key={x}
                castShadow
                position={[x, 0, 0]}
                scale={[0.6, 1, 0.72]}
                geometry={GEO.ear}
                material={materials.skinSoft}
              />
            ))}

            <Hair style={appearance.hairStyle} color={appearance.hairColor} />
            {appearance.hasSafetyGlasses && <SafetyGlasses />}
            {appearance.hasHearingProtection && <HearingProtection material={materials.accent} />}
            {appearance.hasHardHat && <HardHat material={materials.hat} />}
          </group>

          {appearance.hasRadio && <ShoulderRadio />}

          {(
            [
              ['left', -0.345, poseRefs.leftArm, poseRefs.leftFingers, true],
              ['right', 0.345, poseRefs.rightArm, poseRefs.rightFingers, false],
            ] as const
          ).map(([side, x, armRef, fingersRef, carriesTool]) => (
            <group key={side} ref={armRef} position={[x, 0.24, 0]}>
              <mesh
                castShadow
                position={[0, -0.15, 0]}
                geometry={GEO.upperArm}
                material={materials.uniform}
              />
              <mesh
                castShadow
                position={[0, -0.3, 0]}
                geometry={GEO.elbow}
                material={materials.uniform}
              />
              <mesh position={[0, -0.34, 0]} geometry={GEO.cuff} material={materials.uniform} />
              <mesh
                castShadow
                position={[0, -0.46, 0]}
                geometry={GEO.forearm}
                material={appearance.hasGloves ? MAT.glove : materials.skin}
              />
              <group position={[0, -0.64, 0.012]}>
                <mesh castShadow geometry={GEO.hand} material={handMaterial} />
                <mesh
                  ref={fingersRef}
                  castShadow
                  position={[0, -0.043, 0.006]}
                  geometry={GEO.fingers}
                  material={handMaterial}
                />
                {carriesTool && <ToolAccessory tool={appearance.tool} />}
              </group>
            </group>
          ))}
        </group>

        {appearance.hasLabCoat && <LabCoat />}

        <mesh
          ref={poseRefs.hips}
          castShadow
          position={[0, 0.72, 0]}
          geometry={GEO.hips}
          material={materials.pants}
        />
        <mesh castShadow position={[0, 0.79, 0]} geometry={GEO.belt} material={MAT.darkGray} />
        <mesh
          castShadow
          position={[0, 0.79, 0.126]}
          geometry={GEO.buckle}
          material={materials.accent}
        />
        {appearance.hasToolBelt && <ToolBelt />}

        {(
          [
            ['left', -0.11, poseRefs.leftLeg],
            ['right', 0.11, poseRefs.rightLeg],
          ] as const
        ).map(([side, x, legRef]) => (
          <group key={side} ref={legRef} position={[x, 0.64, 0]}>
            <mesh
              castShadow
              position={[0, -0.18, 0]}
              geometry={GEO.thigh}
              material={materials.pants}
            />
            <mesh
              castShadow
              position={[0, -0.38, 0.018]}
              geometry={GEO.knee}
              material={materials.pants}
            />
            <mesh
              castShadow
              position={[0, -0.57, 0]}
              geometry={GEO.calf}
              material={materials.pants}
            />
            <group position={[0, -0.77, 0.045]}>
              <mesh castShadow geometry={GEO.boot} material={MAT.boot} />
              <mesh
                castShadow
                position={[0, -0.065, 0]}
                geometry={GEO.bootSole}
                material={MAT.darkGray}
              />
              <mesh
                castShadow
                position={[0, -0.025, 0.075]}
                geometry={GEO.bootToe}
                material={MAT.mediumGray}
              />
            </group>
          </group>
        ))}

        <group position={[0.135, 1.3, 0.151]}>
          <mesh geometry={GEO.badge} material={MAT.badgeWhite} />
          <mesh
            position={[0, 0.017, 0.006]}
            scale={[0.075, 0.012, 0.004]}
            geometry={GEO.box_small}
            material={materials.accent}
          />
          <mesh
            position={[0, -0.016, 0.006]}
            scale={[0.06, 0.008, 0.004]}
            geometry={GEO.box_small}
            material={MAT.mediumGray}
          />
        </group>
      </group>
    );
  }
);

DetailedWorker.displayName = 'DetailedWorker';
