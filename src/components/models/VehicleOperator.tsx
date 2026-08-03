import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const OPERATOR_GEOMETRY = {
  torso: new RoundedBoxGeometry(0.42, 0.44, 0.24, 3, 0.07),
  vestPanel: new RoundedBoxGeometry(0.35, 0.34, 0.035, 2, 0.012),
  stripe: new THREE.BoxGeometry(1, 1, 1),
  head: new THREE.SphereGeometry(0.12, 16, 12),
  hatCrown: new THREE.CylinderGeometry(0.13, 0.145, 0.1, 18),
  hatBrim: new THREE.CylinderGeometry(0.18, 0.18, 0.025, 18),
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
