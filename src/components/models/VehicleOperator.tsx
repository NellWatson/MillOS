import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { applyWorldSurface } from '../../utils/worldSurface';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * Operator head, 0.24 m across before the group scale.
 *
 * `SphereGeometry(0.12, 16, 12)` was a ball resting straight on the torso box -
 * no neck, no jaw, and its widest ring at eye level where the hat hides it.
 *
 * The occlusion is the whole design brief here. The brim mesh sits 0.06 above
 * the head origin and its underside cuts everything off from roughly local
 * y = +0.053 upward, so the only part of this head that is ever seen is the
 * lower two thirds: neck, jaw, cheek, temple. The profile spends its points
 * there - a short neck column rising off the shoulders, a 45 degree jaw flare,
 * a cheek, and the widest ring pulled down to +0.006 so the temple is the
 * widest VISIBLE point rather than a hidden one. Above the brim line the
 * cranium is deliberately coarse; nothing looks at it.
 *
 * The bottom still converges on the axis at y = -0.12, where the torso's top
 * face is. Giving the neck a flat bottom disc there would put two coplanar
 * surfaces in contact and z-fight; the 13 degree cone touches at a point and
 * opens to 4 mm of clearance by 20 mm out.
 *
 * Envelope unchanged: max radius 0.12, y in [-0.12, 0.12]. 16 segments carried
 * over from the sphere's widthSegments - it lands a vertex on each axis, so the
 * inscribed polygon's half-extents match the sphere's exactly, and 12 profile
 * points against the sphere's 13 rings makes this geometry CHEAPER than the one
 * it replaces (192 vs 208 vertices).
 *
 * Designed and previewed in scripts/blender/specs/forklift-vehicles.json,
 * rendered in situ against the torso and hat because the hat is what decides
 * which half of this profile matters.
 */
function createOperatorHeadGeometry(): THREE.LatheGeometry {
  const profile = [
    new THREE.Vector2(0.0, -0.12), // neck root, converging on the torso top
    new THREE.Vector2(0.0575, -0.1085),
    new THREE.Vector2(0.062, -0.093), // neck column
    new THREE.Vector2(0.081, -0.0765), // jaw underside
    new THREE.Vector2(0.1015, -0.053), // jaw angle
    new THREE.Vector2(0.1145, -0.027), // cheek
    new THREE.Vector2(0.12, 0.006), // temple - envelope max radius, still visible
    new THREE.Vector2(0.1185, 0.033),
    new THREE.Vector2(0.109, 0.062), // brow, where the brim starts to occlude
    new THREE.Vector2(0.093, 0.088), // cranium
    new THREE.Vector2(0.053, 0.113),
    new THREE.Vector2(0.0, 0.12), // crown apex - envelope max y
  ];
  return new THREE.LatheGeometry(profile, 16);
}

/**
 * Hard-hat crown, 0.29 m across and 0.1 m tall before the group scale.
 *
 * `CylinderGeometry(0.13, 0.145, 0.1, 18)` was a flat-topped truncated cone: a
 * bucket, and against the flat brim disc below it the pair read as a bowler.
 * The hat is the most identifiable thing about a figure sitting in a cab, so
 * this is where the operator's silhouette budget belongs.
 *
 * Three features: a steep skirt that seats down into the brim instead of
 * flaring away from it, a shoulder where the sidewall turns, and a dome. The
 * dome is the one that carries - previewed at 8 m and at the forklift's 0.68
 * operator scale, a 0.2 m hat is about thirty pixels tall and the rounded top
 * still separates cleanly from the flat-topped cylinder it replaces.
 *
 * The skirt's base rim stays at radius 0.145 and y = -0.05, which is below the
 * brim's top surface at that radius, so the crown still interpenetrates the
 * brim and no gap opens between them.
 *
 * Envelope unchanged: max radius 0.145, y in [-0.05, 0.05]. 18 segments are
 * kept, matching the brim so crown and brim share facet boundaries.
 */
function createOperatorHatCrownGeometry(): THREE.LatheGeometry {
  const profile = [
    new THREE.Vector2(0.0, -0.05), // underside cap centre
    new THREE.Vector2(0.145, -0.05), // base rim - envelope max radius
    new THREE.Vector2(0.144, -0.033), // steep skirt, seated into the brim
    new THREE.Vector2(0.1385, -0.008),
    new THREE.Vector2(0.13, 0.009), // shoulder where the dome starts
    new THREE.Vector2(0.113, 0.027),
    new THREE.Vector2(0.085, 0.04), // dome
    new THREE.Vector2(0.048, 0.048),
    new THREE.Vector2(0.018, 0.05), // crown apex - envelope max y
    new THREE.Vector2(0.0, 0.05),
  ];
  return new THREE.LatheGeometry(profile, 18);
}

/**
 * Hard-hat brim, 0.36 m across before the group scale.
 *
 * `CylinderGeometry(0.18, 0.18, 0.025, 18)` was a flat disc - a frisbee with a
 * dome parked on it. A full-brim hat's brim falls away from the crown as it
 * goes out, lifts slightly at the very edge, and carries its thickness in a
 * rolled rim. All three are in this profile, and the falling top surface is
 * what stops the hat reading as two stacked primitives.
 *
 * WOUND UNDERSIDE-CENTRE -> RIM -> TOP-CENTRE, i.e. increasing y, and that is
 * load-bearing rather than stylistic. `THREE.LatheGeometry` derives its normals
 * from the profile's own direction as (dy, -dx); a profile listed top-first
 * produces inward-facing normals and renders the brim inside-out on a FrontSide
 * material. Blender's Workbench preview draws backfaces, so it will not catch
 * this - the winding has to be right by construction.
 *
 * Envelope unchanged: max radius 0.18, y in [-0.0125, 0.0125], with the max
 * -y now carried by the rolled rim rather than by the whole underside.
 * 18 segments match the crown.
 */
function createOperatorHatBrimGeometry(): THREE.LatheGeometry {
  const profile = [
    new THREE.Vector2(0.0, -0.0035), // underside centre
    new THREE.Vector2(0.094, -0.005),
    new THREE.Vector2(0.138, -0.0095),
    new THREE.Vector2(0.172, -0.0125), // rolled rim underside - envelope max -y
    new THREE.Vector2(0.18, -0.0025), // edge turn-up - envelope max radius
    new THREE.Vector2(0.166, -0.0035), // top surface, falling away from the crown
    new THREE.Vector2(0.13, 0.0045),
    new THREE.Vector2(0.092, 0.0125), // crown seat
    new THREE.Vector2(0.0, 0.0125), // top centre - envelope max +y
  ];
  return new THREE.LatheGeometry(profile, 18);
}

const OPERATOR_GEOMETRY = {
  // Torso, vest panel and stripes stay boxes on purpose: the vest is a FLAT
  // panel standing 12 mm proud of the chest, and the two reflective stripes are
  // flat bars on top of that. Rounding the torso in plan would recede the chest
  // to 0.084 at the vest's own half-width and float the vest off the body by
  // 48 mm at its edges. The flat-fronted rounded box is what they mount against.
  torso: new RoundedBoxGeometry(0.42, 0.44, 0.24, 3, 0.07),
  vestPanel: new RoundedBoxGeometry(0.35, 0.34, 0.035, 2, 0.012),
  stripe: new THREE.BoxGeometry(1, 1, 1),
  head: createOperatorHeadGeometry(),
  hatCrown: createOperatorHatCrownGeometry(),
  hatBrim: createOperatorHatBrimGeometry(),
  // One capsule serves arms, thighs AND shins at three different orientations,
  // so it stays a capsule: any distal taper that is right for the forearm is
  // backwards for the shin, and a symmetric limb is the only honest shared form.
  limb: new THREE.CapsuleGeometry(0.045, 0.2, 4, 8),
  hand: new THREE.SphereGeometry(0.052, 10, 8),
  boot: new RoundedBoxGeometry(0.12, 0.09, 0.22, 2, 0.025),
} as const;

interface StaticTransform {
  readonly position: THREE.Vector3Tuple;
  readonly rotation?: THREE.EulerTuple;
  readonly scale?: THREE.Vector3Tuple;
}

const ARM_TRANSFORMS: readonly StaticTransform[] = [
  { position: [-0.17, 0.43, 0.1], rotation: [1.02, 0, -0.14] },
  { position: [0.17, 0.43, 0.1], rotation: [1.02, 0, 0.14] },
];
const HAND_TRANSFORMS: readonly StaticTransform[] = [
  { position: [-0.16, 0.31, 0.24] },
  { position: [0.16, 0.31, 0.24] },
];
const THIGH_TRANSFORMS: readonly StaticTransform[] = [
  { position: [-0.11, 0.12, 0.13], rotation: [1.12, 0, -0.04], scale: [1.12, 1.18, 1.12] },
  { position: [0.11, 0.12, 0.13], rotation: [1.12, 0, 0.04], scale: [1.12, 1.18, 1.12] },
];
const SHIN_TRANSFORMS: readonly StaticTransform[] = [
  { position: [-0.11, -0.08, 0.31], rotation: [0.18, 0, 0] },
  { position: [0.11, -0.08, 0.31], rotation: [0.18, 0, 0] },
];
const BOOT_TRANSFORMS: readonly StaticTransform[] = [
  { position: [-0.11, -0.24, 0.39] },
  { position: [0.11, -0.24, 0.39] },
];
const STRIPE_TRANSFORMS: readonly StaticTransform[] = [
  { position: [0, 0.38, 0.144], scale: [0.34, 0.035, 0.012] },
  { position: [0, 0.49, 0.144], scale: [0.34, 0.035, 0.012] },
];

/**
 * Cab-operator materials, cached by colour tuple and shared across every
 * vehicle rather than allocated per instance (four forklifts plus the truck-bay
 * drivers each built their own set of six). They carry the same per-semantic
 * PBR language as the floor personnel so an operator's hi-vis reflects like
 * hi-vis, not like every other surface at one flat roughness.
 */
interface OperatorMaterials {
  skin: THREE.MeshPhysicalMaterial;
  workwear: THREE.MeshStandardMaterial;
  vest: THREE.MeshPhysicalMaterial;
  reflective: THREE.MeshPhysicalMaterial;
  hat: THREE.MeshPhysicalMaterial;
  boot: THREE.MeshStandardMaterial;
}

const operatorMaterialCache = new Map<string, OperatorMaterials>();

function getOperatorMaterials(
  skinTone: string,
  workwearColor: string,
  vestColor: string,
  hatColor: string
): OperatorMaterials {
  const key = `${skinTone}|${workwearColor}|${vestColor}|${hatColor}`;
  const cached = operatorMaterialCache.get(key);
  if (cached) return cached;

  // SURFACE FINISH, matching the floor personnel semantic for semantic.
  //
  // These are PEOPLE, and every walking worker in the scene carries the
  // analytic finish while the three seated operators - two forklift drivers and
  // the truck-bay driver - carried none, which
  // `test-results/pass7/unfinished-models.mjs` names as 3.6 m of bare denim,
  // skin and hi-viz per cab. A cab operator sitting a metre from a finished
  // forklift body is the mismatch `SharedWorkerMaterials` warns about: "a body
  // finished next to unfinished accessories reads worse than neither being
  // finished, because the mismatch is what the eye picks up."
  //
  // OBJECT REST SPACE, which is what every profile below ships with. An
  // operator rides a vehicle across the yard, so a world-space field would
  // slide the weave over the body exactly as it would on a walking worker.
  //
  // `reflective` is DELIBERATELY ABSENT, on the same grounds
  // `SharedWorkerMaterials` records for its own: it is retroreflective banding
  // with an emissive term, `isOutOfSurfaceScope` declines emitters, and
  // weathering something that represents emitted light does nothing visible
  // while making no physical sense.
  //
  // COST. Both consumers are `InstancedMesh` or plain meshes under a vehicle
  // group, and every profile shares one `customProgramCacheKey`, so this adds
  // no draw calls and no shader permutations.
  const materials: OperatorMaterials = {
    skin: new THREE.MeshPhysicalMaterial({
      color: skinTone,
      roughness: 0.44,
      metalness: 0,
      sheen: 0.22,
      sheenColor: new THREE.Color('#ff9d7d'),
      sheenRoughness: 0.65,
      envMapIntensity: 1.4,
    }),
    workwear: new THREE.MeshStandardMaterial({
      color: workwearColor,
      roughness: 0.86,
      metalness: 0,
      envMapIntensity: 0.9,
    }),
    vest: new THREE.MeshPhysicalMaterial({
      color: vestColor,
      roughness: 0.6,
      metalness: 0,
      sheen: 0.35,
      sheenColor: new THREE.Color('#ffffff'),
      sheenRoughness: 0.55,
      envMapIntensity: 1.8,
    }),
    reflective: new THREE.MeshPhysicalMaterial({
      color: '#f2f7ea',
      emissive: '#cfe0d4',
      emissiveIntensity: 0.1,
      roughness: 0.26,
      metalness: 0,
      sheen: 1,
      sheenColor: new THREE.Color('#ffffff'),
      sheenRoughness: 0.12,
      envMapIntensity: 2.4,
    }),
    hat: new THREE.MeshPhysicalMaterial({
      color: hatColor,
      roughness: 0.3,
      metalness: 0,
      clearcoat: 0.35,
      clearcoatRoughness: 0.22,
      envMapIntensity: 1.2,
    }),
    boot: new THREE.MeshStandardMaterial({
      color: '#171c20',
      roughness: 0.88,
      metalness: 0.02,
      envMapIntensity: 0.7,
    }),
  };

  applyWorldSurface(materials.skin, 'skin');
  applyWorldSurface(materials.workwear, 'fabric');
  // `signage`, not `fabric`: a hi-viz vest and a hard hat are meant to read as
  // clean and legible, and a chevron weathered into the background has been
  // broken rather than finished.
  applyWorldSurface(materials.vest, 'signage');
  applyWorldSurface(materials.hat, 'signage');
  applyWorldSurface(materials.boot, 'fabric');

  operatorMaterialCache.set(key, materials);
  return materials;
}

const StaticInstances: React.FC<{
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  transforms: readonly StaticTransform[];
  castShadow?: boolean;
}> = ({ geometry, material, transforms, castShadow = false }) => {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const object = new THREE.Object3D();
    transforms.forEach((transform, index) => {
      object.position.set(...transform.position);
      object.rotation.set(...(transform.rotation ?? [0, 0, 0]));
      object.scale.set(...(transform.scale ?? [1, 1, 1]));
      object.updateMatrix();
      ref.current?.setMatrixAt(index, object.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [transforms]);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, transforms.length]}
      castShadow={castShadow}
    />
  );
};

export interface SeatedVehicleOperatorProps {
  readonly name: string;
  readonly skinTone?: string;
  readonly workwearColor?: string;
  readonly vestColor?: string;
  readonly hatColor?: string;
}

/**
 * Bounded seated personnel silhouette for vehicle cabs. It shares one adult
 * proportion and PPE language with the authored floor personnel while keeping
 * a bounded draw-call budget for the four moving vehicles.
 */
export const SeatedVehicleOperator = React.memo<SeatedVehicleOperatorProps>(
  ({
    name,
    skinTone = '#c68642',
    workwearColor = '#24364a',
    vestColor = '#e89018',
    hatColor = '#f5b91f',
  }) => {
    // Shared by colour tuple, so there is deliberately no per-instance dispose:
    // unmounting one forklift must not tear down the materials the others use.
    const materials = useMemo(
      () => getOperatorMaterials(skinTone, workwearColor, vestColor, hatColor),
      [hatColor, skinTone, vestColor, workwearColor]
    );

    return (
      <group name="seated-vehicle-operator" userData={{ operatorName: name }} dispose={null}>
        <mesh
          geometry={OPERATOR_GEOMETRY.torso}
          material={materials.workwear}
          position={[0, 0.42, 0]}
          rotation={[-0.08, 0, 0]}
          castShadow
        />
        <mesh
          geometry={OPERATOR_GEOMETRY.vestPanel}
          material={materials.vest}
          position={[0, 0.42, 0.132]}
          rotation={[-0.08, 0, 0]}
        />
        <StaticInstances
          geometry={OPERATOR_GEOMETRY.stripe}
          material={materials.reflective}
          transforms={STRIPE_TRANSFORMS}
        />
        <mesh
          geometry={OPERATOR_GEOMETRY.head}
          material={materials.skin}
          position={[0, 0.76, 0.025]}
          castShadow
        />
        <mesh
          geometry={OPERATOR_GEOMETRY.hatCrown}
          material={materials.hat}
          position={[0, 0.865, 0.012]}
          castShadow
        />
        <mesh
          geometry={OPERATOR_GEOMETRY.hatBrim}
          material={materials.hat}
          position={[0, 0.82, 0.035]}
        />
        <StaticInstances
          geometry={OPERATOR_GEOMETRY.limb}
          material={materials.workwear}
          transforms={ARM_TRANSFORMS}
          castShadow
        />
        <StaticInstances
          geometry={OPERATOR_GEOMETRY.hand}
          material={materials.skin}
          transforms={HAND_TRANSFORMS}
        />
        <StaticInstances
          geometry={OPERATOR_GEOMETRY.limb}
          material={materials.workwear}
          transforms={THIGH_TRANSFORMS}
          castShadow
        />
        <StaticInstances
          geometry={OPERATOR_GEOMETRY.limb}
          material={materials.workwear}
          transforms={SHIN_TRANSFORMS}
          castShadow
        />
        <StaticInstances
          geometry={OPERATOR_GEOMETRY.boot}
          material={materials.boot}
          transforms={BOOT_TRANSFORMS}
          castShadow
        />
      </group>
    );
  }
);

SeatedVehicleOperator.displayName = 'SeatedVehicleOperator';
