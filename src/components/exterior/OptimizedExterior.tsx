import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EXTERIOR_LAYERS, POLYGON_OFFSET, RENDER_ORDER } from '../../constants/renderLayers';
import { SITE_LAYOUT } from '../../constants/siteLayout';
import { useGameSimulationStore } from '../../stores/gameSimulationStore';
import { sampleAtmosphere } from '../../simulation/atmosphere';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);
const UNIT_SPHERE = new THREE.IcosahedronGeometry(1, 1);
const LAKE_GEOMETRY = new THREE.CircleGeometry(1, 48);
const LAKE_BANK_GEOMETRY = new THREE.TorusGeometry(1, 0.055, 6, 48);

const createSurfaceMaterial = (
  color: string,
  factor: number,
  roughness: number = 0.92
): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: factor,
    polygonOffsetUnits: factor,
  });

const MATERIALS = {
  grass: createSurfaceMaterial('#365844', POLYGON_OFFSET.exteriorBase.factor, 1),
  asphalt: createSurfaceMaterial('#354147', POLYGON_OFFSET.exteriorMid.factor, 0.9),
  road: createSurfaceMaterial('#28343a', POLYGON_OFFSET.exteriorTop.factor, 0.86),
  waterBed: new THREE.MeshStandardMaterial({
    color: '#233f3b',
    roughness: 1,
    metalness: 0,
  }),
  waterBank: new THREE.MeshStandardMaterial({
    color: '#52614b',
    roughness: 1,
    metalness: 0,
  }),
  concrete: createSurfaceMaterial('#68737b', POLYGON_OFFSET.exteriorMid.factor, 0.95),
  farmA: createSurfaceMaterial('#806633', POLYGON_OFFSET.exteriorMid.factor, 1),
  farmB: createSurfaceMaterial('#6e7b37', POLYGON_OFFSET.exteriorMid.factor, 1),
  marking: new THREE.MeshBasicMaterial({
    color: '#f6e8a7',
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: POLYGON_OFFSET.exteriorOverlay.factor,
    polygonOffsetUnits: POLYGON_OFFSET.exteriorOverlay.units,
  }),
  trunk: new THREE.MeshStandardMaterial({ color: '#503b2a', roughness: 1 }),
  foliage: new THREE.MeshStandardMaterial({ color: '#315c3c', roughness: 0.95 }),
  crop: new THREE.MeshStandardMaterial({ color: '#a98a3d', roughness: 1 }),
  fence: new THREE.MeshStandardMaterial({ color: '#81909a', roughness: 0.58, metalness: 0.45 }),
  office: new THREE.MeshStandardMaterial({ color: '#a7b0b3', roughness: 0.88 }),
  roof: new THREE.MeshStandardMaterial({ color: '#34454e', roughness: 0.78, metalness: 0.18 }),
  glass: new THREE.MeshStandardMaterial({
    color: '#7dc5d5',
    emissive: '#183d48',
    emissiveIntensity: 0.25,
    roughness: 0.22,
    metalness: 0.12,
  }),
} as const;

interface SurfaceProps {
  readonly position: readonly [number, number, number];
  readonly size: readonly [number, number];
  readonly material: THREE.Material;
  readonly renderOrder?: number;
}

function Surface({ position, size, material, renderOrder = 0 }: SurfaceProps) {
  return (
    <mesh
      geometry={UNIT_PLANE}
      material={material}
      position={[...position]}
      scale={[size[0], size[1], 1]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      renderOrder={renderOrder}
    />
  );
}

interface BoxInstance {
  readonly position: readonly [number, number, number];
  readonly scale: readonly [number, number, number];
  readonly rotationY?: number;
}

function InstancedBoxes({
  instances,
  material,
  castShadow = false,
}: {
  readonly instances: readonly BoxInstance[];
  readonly material: THREE.Material;
  readonly castShadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const object = new THREE.Object3D();
    instances.forEach((instance, index) => {
      object.position.set(...instance.position);
      object.scale.set(...instance.scale);
      object.rotation.set(0, instance.rotationY ?? 0, 0);
      object.updateMatrix();
      ref.current?.setMatrixAt(index, object.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [instances]);

  return (
    <instancedMesh
      ref={ref}
      args={[UNIT_BOX, material, instances.length]}
      castShadow={castShadow}
      receiveShadow
    />
  );
}

function Landscaping() {
  const treePositions = useMemo(
    () =>
      [
        [-105, 0, -80],
        [-118, 0, -45],
        [-110, 0, 10],
        [-122, 0, 55],
        [-108, 0, 95],
        [-72, 0, 116],
        [-35, 0, 122],
        [12, 0, 126],
        [55, 0, 122],
        [92, 0, 105],
        [112, 0, 70],
        [118, 0, 32],
        [116, 0, -20],
        [108, 0, -68],
        [82, 0, -108],
        [42, 0, -120],
        [-4, 0, -124],
        [-52, 0, -118],
      ] as const,
    []
  );
  const trunks = useMemo(
    () =>
      treePositions.map(([x, , z], index) => ({
        position: [x, 2.1 + (index % 3) * 0.15, z] as const,
        scale: [0.45, 4.2 + (index % 3) * 0.3, 0.45] as const,
      })),
    [treePositions]
  );
  const crowns = useMemo(
    () =>
      treePositions.map(([x, , z], index) => ({
        position: [x, 5.4 + (index % 3) * 0.2, z] as const,
        scale: [2.5 + (index % 2) * 0.35, 3.1, 2.5 + (index % 2) * 0.35] as const,
      })),
    [treePositions]
  );
  const crownRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!crownRef.current) return;
    const object = new THREE.Object3D();
    crowns.forEach((crown, index) => {
      object.position.set(...crown.position);
      object.scale.set(...crown.scale);
      object.rotation.y = (index * 1.91) % Math.PI;
      object.updateMatrix();
      crownRef.current?.setMatrixAt(index, object.matrix);
    });
    crownRef.current.instanceMatrix.needsUpdate = true;
    crownRef.current.computeBoundingSphere();
  }, [crowns]);

  return (
    <>
      <InstancedBoxes instances={trunks} material={MATERIALS.trunk} castShadow />
      <instancedMesh
        ref={crownRef}
        args={[UNIT_SPHERE, MATERIALS.foliage, crowns.length]}
        castShadow
      />
    </>
  );
}

interface WaterPreset {
  readonly name: string;
  readonly deep: string;
  readonly shallow: string;
  readonly reflection: string;
  readonly flowDirection: readonly [number, number];
  readonly flowSpeed: number;
  readonly roughness: number;
}

const WATER_PRESETS = {
  canal: {
    name: 'still-canal',
    deep: '#143b48',
    shallow: '#4a8790',
    reflection: '#a8d2dc',
    flowDirection: [0, 1],
    flowSpeed: 0.24,
    roughness: 0.62,
  },
  river: {
    name: 'slow-river',
    deep: '#123746',
    shallow: '#3b7d8a',
    reflection: '#b4dbe3',
    flowDirection: [1, 0.16],
    flowSpeed: 0.42,
    roughness: 0.5,
  },
  lake: {
    name: 'lake',
    deep: '#163b49',
    shallow: '#4d8790',
    reflection: '#c0dfe4',
    flowDirection: [0.38, 0.18],
    flowSpeed: 0.12,
    roughness: 0.68,
  },
} as const satisfies Record<string, WaterPreset>;

function createWaterMaterial(preset: WaterPreset): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    name: `MillOS Water: ${preset.name}`,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uDeep: { value: new THREE.Color(preset.deep) },
        uShallow: { value: new THREE.Color(preset.shallow) },
        uReflection: { value: new THREE.Color(preset.reflection) },
        uFlowDirection: { value: new THREE.Vector2(...preset.flowDirection).normalize() },
        uFlowSpeed: { value: preset.flowSpeed },
        uRoughness: { value: preset.roughness },
        uWetness: { value: 0 },
        uDaylight: { value: 1 },
      },
    ]),
    vertexShader: `
          #include <fog_pars_vertex>
          uniform float uTime;
          uniform vec2 uFlowDirection;
          uniform float uFlowSpeed;
          varying vec2 vUv;
          varying float vWave;
          varying vec3 vWorldPosition;
          varying vec3 vWorldNormal;
          void main() {
            vUv = uv;
            float alongFlow = dot(position.xy, uFlowDirection);
            float acrossFlow = dot(position.xy, vec2(-uFlowDirection.y, uFlowDirection.x));
            float waveA = sin(alongFlow * 0.18 + uTime * uFlowSpeed);
            float waveB = cos(acrossFlow * 0.27 - uTime * uFlowSpeed * 0.73);
            vWave = (waveA + waveB) * 0.5;
            vec3 displaced = position;
            displaced.z += vWave * 0.045;
            vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
            vWorldPosition = worldPosition.xyz;
            vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
            vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
          }
        `,
    fragmentShader: `
          #include <fog_pars_fragment>
          uniform vec3 uDeep;
          uniform vec3 uShallow;
          uniform vec3 uReflection;
          uniform vec2 uFlowDirection;
          uniform float uTime;
          uniform float uFlowSpeed;
          uniform float uRoughness;
          uniform float uWetness;
          uniform float uDaylight;
          varying vec2 vUv;
          varying float vWave;
          varying vec3 vWorldPosition;
          varying vec3 vWorldNormal;
          void main() {
            float edgeDistance = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
            float shoreFade = smoothstep(0.0, 0.12, edgeDistance);
            vec2 crossFlow = vec2(-uFlowDirection.y, uFlowDirection.x);
            float normalA = sin(dot(vWorldPosition.xz, uFlowDirection) * 0.72 + uTime * uFlowSpeed * 1.7);
            float normalB = cos(dot(vWorldPosition.xz, crossFlow) * 1.06 - uTime * uFlowSpeed * 1.19);
            float rainRipple =
              sin(length(fract(vWorldPosition.xz * 0.17) - 0.5) * 42.0 - uTime * 1.8) *
              uWetness;
            vec3 normal = normalize(
              vWorldNormal +
              vec3(normalA, 0.0, normalB) * (0.08 + (1.0 - uRoughness) * 0.11) +
              vec3(rainRipple, 0.0, -rainRipple) * 0.025
            );
            vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
            float normalView = clamp(abs(dot(viewDirection, normal)), 0.0, 1.0);
            float grazingReflection = pow(1.0 - normalView, 2.0);
            float depthBlend = clamp(0.48 + vWave * 0.12 + vUv.y * 0.1, 0.0, 1.0);
            vec3 body = mix(uDeep, uShallow, depthBlend);
            float daylightReflection = mix(0.1, 0.24, clamp(uDaylight, 0.0, 1.0));
            float reflectionStrength = clamp(
              daylightReflection +
              grazingReflection * (0.14 + (1.0 - uRoughness) * 0.12),
              0.08,
              0.42
            );
            vec3 colour = mix(body, uReflection, reflectionStrength);
            float rippleLight = (normalA + normalB + rainRipple * 0.35) * 0.014;
            colour += uReflection * rippleLight;
            float foam = (1.0 - shoreFade) * (0.3 + abs(vWave) * 0.24);
            colour = mix(colour, vec3(0.75, 0.84, 0.8), foam);
            float alpha = mix(0.74, 0.88, shoreFade);
            gl_FragColor = vec4(colour, alpha);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
            #include <fog_fragment>
          }
        `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
  material.customProgramCacheKey = () => 'millos-water-family-v3';
  return material;
}

function WaterNetwork() {
  const materials = useMemo(
    () => ({
      canal: createWaterMaterial(WATER_PRESETS.canal),
      river: createWaterMaterial(WATER_PRESETS.river),
      lake: createWaterMaterial(WATER_PRESETS.lake),
    }),
    []
  );

  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose());
    },
    [materials]
  );

  useFrame(() => {
    const { gameDay, gameTime, weather, isTabVisible } = useGameSimulationStore.getState();
    if (!isTabVisible) return;
    const atmosphere = sampleAtmosphere(gameDay, gameTime, weather);
    Object.values(materials).forEach((material) => {
      material.uniforms.uTime.value = atmosphere.simulationMinutes * 0.42;
      material.uniforms.uWetness.value = atmosphere.wetness;
      material.uniforms.uDaylight.value = atmosphere.daylight * atmosphere.lightMultiplier;
    });
  });

  return (
    <group name="optimized-water-network" dispose={null}>
      <Surface
        position={[-145, SITE_LAYOUT.datum.waterBed, 0]}
        size={[15.8, 180]}
        material={MATERIALS.waterBed}
      />
      <Surface
        position={[0, SITE_LAYOUT.datum.waterBed, -145]}
        size={[250, 18.8]}
        material={MATERIALS.waterBed}
      />
      <mesh
        geometry={LAKE_GEOMETRY}
        material={MATERIALS.waterBed}
        position={[118, SITE_LAYOUT.datum.waterBed, 116]}
        scale={[22.8, 16.8, 1]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <InstancedBoxes
        instances={[
          { position: [-153.2, 0.025, 0], scale: [0.65, 0.09, 180] },
          { position: [-136.8, 0.025, 0], scale: [0.65, 0.09, 180] },
          { position: [0, 0.025, -154.7], scale: [250, 0.09, 0.65] },
          { position: [0, 0.025, -135.3], scale: [250, 0.09, 0.65] },
        ]}
        material={MATERIALS.waterBank}
      />
      <mesh
        geometry={LAKE_BANK_GEOMETRY}
        material={MATERIALS.waterBank}
        position={[118, 0.025, 116]}
        scale={[22.8, 16.8, 1]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <mesh
        geometry={UNIT_PLANE}
        material={materials.canal}
        position={[-145, SITE_LAYOUT.datum.water, 0]}
        scale={[15, 180, 1]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={RENDER_ORDER.waterSurface}
      />
      <mesh
        geometry={UNIT_PLANE}
        material={materials.river}
        position={[0, SITE_LAYOUT.datum.water, -145]}
        scale={[250, 18, 1]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={RENDER_ORDER.waterSurface}
      />
      <mesh
        geometry={LAKE_GEOMETRY}
        material={materials.lake}
        position={[118, SITE_LAYOUT.datum.water, 116]}
        scale={[22, 16, 1]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={RENDER_ORDER.waterSurface}
      />
    </group>
  );
}

function RuralContext() {
  const cropRows = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        position: [-90 + index * 2.6, 0.12, 83] as const,
        scale: [0.65, 0.24, 42] as const,
      })),
    []
  );
  const houses = useMemo(
    () =>
      [
        [-105, 1.8, 25],
        [-96, 1.8, 36],
        [-110, 1.8, 48],
        [-91, 1.8, 55],
        [-102, 1.8, 66],
      ].map(([x, y, z], index) => ({
        position: [x, y, z] as const,
        scale: [6 + (index % 2), 3.6, 5] as const,
        rotationY: index % 2 ? 0.12 : -0.08,
      })),
    []
  );

  return (
    <>
      <Surface
        position={[-88, EXTERIOR_LAYERS.ground, 84]}
        size={[62, 52]}
        material={MATERIALS.farmA}
      />
      <Surface
        position={[-88, EXTERIOR_LAYERS.ground, -78]}
        size={[58, 42]}
        material={MATERIALS.farmB}
      />
      <InstancedBoxes instances={cropRows} material={MATERIALS.crop} />
      <InstancedBoxes instances={houses} material={MATERIALS.office} castShadow />
      {houses.map((house, index) => (
        <mesh
          key={index}
          geometry={UNIT_BOX}
          material={MATERIALS.roof}
          position={[house.position[0], house.position[1] + 2.25, house.position[2]]}
          rotation={[0, house.rotationY ?? 0, Math.PI / 4]}
          scale={[4.3, 4.3, house.scale[2] + 0.4]}
          castShadow
        />
      ))}
    </>
  );
}

function SiteFurniture() {
  const fencePosts = useMemo(() => {
    const posts: BoxInstance[] = [];
    for (let x = -60; x <= 60; x += 8) {
      posts.push({ position: [x, 1.2, 98], scale: [0.16, 2.4, 0.16] });
      posts.push({ position: [x, 1.2, -98], scale: [0.16, 2.4, 0.16] });
    }
    for (let z = -90; z <= 90; z += 8) {
      posts.push({ position: [68, 1.2, z], scale: [0.16, 2.4, 0.16] });
      posts.push({ position: [-68, 1.2, z], scale: [0.16, 2.4, 0.16] });
    }
    return posts;
  }, []);
  const roadMarks = useMemo(
    () =>
      Array.from({ length: 22 }, (_, index) => ({
        position: [20, EXTERIOR_LAYERS.groundOverlay + 0.006, 92 + index * 7] as const,
        scale: [0.18, 0.02, 3.2] as const,
      })),
    []
  );

  return (
    <>
      <InstancedBoxes instances={fencePosts} material={MATERIALS.fence} />
      <InstancedBoxes instances={roadMarks} material={MATERIALS.marking} />
      <mesh
        geometry={UNIT_BOX}
        material={MATERIALS.office}
        position={[82, 3, 28]}
        scale={[18, 6, 14]}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={UNIT_BOX}
        material={MATERIALS.roof}
        position={[82, 6.25, 28]}
        scale={[19, 0.5, 15]}
        castShadow
      />
      <mesh
        geometry={UNIT_BOX}
        material={MATERIALS.glass}
        position={[82, 3.4, 35.03]}
        scale={[12, 2.2, 0.08]}
      />
    </>
  );
}

export function OptimizedExterior() {
  return (
    <group name="optimized-rural-industrial-site" dispose={null}>
      <Surface
        position={[0, EXTERIOR_LAYERS.ground, 0]}
        size={[500, 500]}
        material={MATERIALS.grass}
        renderOrder={RENDER_ORDER.default}
      />
      <Surface
        position={[0, EXTERIOR_LAYERS.ground, 70]}
        size={[74, 44]}
        material={MATERIALS.asphalt}
      />
      <Surface
        position={[0, EXTERIOR_LAYERS.ground, -70]}
        size={[64, 44]}
        material={MATERIALS.asphalt}
      />
      <Surface
        position={[20, EXTERIOR_LAYERS.ground, 166]}
        size={[16, 150]}
        material={MATERIALS.road}
      />
      <Surface
        position={[-20, EXTERIOR_LAYERS.ground, -166]}
        size={[16, 150]}
        material={MATERIALS.road}
      />
      <Surface
        position={[88, EXTERIOR_LAYERS.ground, 12]}
        size={[48, 68]}
        material={MATERIALS.asphalt}
      />
      <Surface
        position={[-95, EXTERIOR_LAYERS.ground, 42]}
        size={[38, 68]}
        material={MATERIALS.concrete}
      />
      <WaterNetwork />
      <RuralContext />
      <Landscaping />
      <SiteFurniture />
    </group>
  );
}
