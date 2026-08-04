/**
 * Authored production-worker renderer for MillOS v0.41.
 *
 * The two CC0 Quaternius worker bodies arrive with complete industrial
 * workwear, compatible rigs, and a curated semantic animation set. Runtime
 * material variants carry identity and role cues without duplicating geometry.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { createPortal, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { useDracoGLTF } from '../../utils/dracoLoader';
import { WORKER_ASSET_PATHS } from '../../utils/modelLoader';
import { useGameSimulationStore } from '../../stores/gameSimulationStore';
import { useGraphicsStore } from '../../stores/graphicsStore';
import type { WorkerAppearance, WorkerBodyType, WorkerWorkAction } from '../workers/workerTypes';
import { ToolAccessory } from '../workers/WorkerTools';
import {
  getSkinSoftMaterial,
  getWorkerDetailMapVariant,
  requestWorkerDetailMaps,
} from '../workers/SharedWorkerMaterials';
import { SHARED_WORKER_GEOMETRY } from '../workers/SharedWorkerGeometries';
import type { WorkerSecondarySignals } from '../../animation';

export interface WorkerModelProps {
  appearance: WorkerAppearance;
  activity: 'working' | 'break' | 'responding' | 'idle';
  /**
   * Behaviour channel published by WorkerAnimationManager. Optional so the
   * model still renders standalone; without it the secondary-animation layer
   * is simply inert and the clip rate falls back to a world-position delta.
   */
  signals?: WorkerSecondarySignals;
}

type WorkerClipName =
  | 'worker-idle'
  | 'worker-walk'
  | 'worker-run'
  | 'worker-break'
  | 'worker-inspect'
  | 'worker-repair'
  | 'worker-supervise'
  | 'worker-radio'
  | 'worker-sample';

const WORKER_CLIPS: WorkerClipName[] = [
  'worker-idle',
  'worker-walk',
  'worker-run',
  'worker-break',
  'worker-inspect',
  'worker-repair',
  'worker-supervise',
  'worker-radio',
  'worker-sample',
];

const TASK_CLIPS: Record<WorkerWorkAction, WorkerClipName> = {
  supervise: 'worker-supervise',
  inspect: 'worker-inspect',
  operate: 'worker-inspect',
  sample: 'worker-sample',
  repair: 'worker-repair',
  radio: 'worker-radio',
  none: 'worker-idle',
};

/**
 * Ground speed that each locomotion clip depicts, in ARMATURE units per second,
 * measured offline from the contact-phase sweep of the Foot.L/Foot.R IK targets
 * in both GLBs (both clips are strictly in-place: Body translation Z is
 * constant across every key). The two files share identical foot keyframes; the
 * feminine clips are simply retimed 1.25x slower, so its speeds are exactly
 * 0.8x the masculine ones.
 *
 * These are NOT metres per second. The CharacterArmature node carries a 0.9215
 * (masculine) / 0.9244 (feminine) uniform scale, so the world figure is this
 * value times the rig scale read off the model at prepare time, times the
 * per-person bodyScale that the wrapper group applies to X/Z.
 *
 * The previous single pair of constants (1.35 / 2.25) was right for nothing:
 * the masculine walk was ~8% fast, the feminine walk ~25% slow (half the roster
 * moonwalked), and the masculine run ~30% slow so the feet skated forward.
 */
const CLIP_GROUND_SPEED: Record<WorkerBodyType, { walk: number; run: number }> = {
  masculine: { walk: 1.352, run: 2.935 },
  feminine: { walk: 1.082, run: 2.348 },
};

/** Multiple of natural walk speed at which the run clip takes over. */
const RUN_CROSSOVER = 1.45;

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const EAR_DEFENDER = new THREE.CylinderGeometry(0.038, 0.038, 0.025, 14);
const EAR_DEFENDER_BAND = new THREE.TorusGeometry(0.104, 0.008, 6, 18, Math.PI);
const SUPERVISOR_CABLE = new THREE.TorusGeometry(0.065, 0.005, 6, 18, Math.PI * 1.25);
const SUPERVISOR_RADIO_KNOB = new THREE.CylinderGeometry(0.009, 0.009, 0.012, 10);

/**
 * Conservative pose margin added to the bind-pose bounding volume, in metres.
 * The run clip swings Foot.L to y 0.560 / z 0.408 against a 1.87 m bind box, so
 * this covers the widest authored excursion without letting a mid-stride worker
 * pop out at a screen edge.
 */
const POSE_BOUNDS_MARGIN = 0.45;

// Module-scope scratch. Never allocate inside useFrame.
const _quat = new THREE.Quaternion();
const _quatB = new THREE.Quaternion();
const _euler = new THREE.Euler(0, 0, 0, 'XYZ');
const _box = new THREE.Box3();
const _bindBox = new THREE.Box3();
const _center = new THREE.Vector3();
const ROOT_FORWARD = new THREE.Vector3(0, 0, 1);
const ROOT_UP = new THREE.Vector3(0, 1, 0);

interface AccessoryMaterials {
  glasses: THREE.MeshPhysicalMaterial;
  dark: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
  badge: THREE.MeshStandardMaterial;
  reflective: THREE.MeshPhysicalMaterial;
}

function createAccessoryMaterials(appearance: WorkerAppearance): AccessoryMaterials {
  return {
    glasses: new THREE.MeshPhysicalMaterial({
      color: '#c6e6f5',
      roughness: 0.12,
      metalness: 0,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    }),
    dark: new THREE.MeshStandardMaterial({
      color: '#20272d',
      roughness: 0.7,
      metalness: 0.08,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: appearance.accentColor,
      roughness: 0.62,
      metalness: 0.06,
    }),
    badge: new THREE.MeshStandardMaterial({
      color: '#f4f7f8',
      roughness: 0.48,
      metalness: 0.02,
    }),
    // Retroreflective banding. The read comes from a very tight sheen lobe plus
    // an elevated environment contribution, not from an emissive cheat: at
    // 0.10 this stays below the 1.0 linear threshold that only behaves inside
    // the composer, so it looks the same on the 'low' tier where none exists.
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
  };
}

interface BoneMountProps {
  bone: THREE.Object3D | null;
  name: string;
  position?: THREE.Vector3Tuple;
  rotation?: THREE.EulerTuple;
  scale?: THREE.Vector3Tuple;
  children: React.ReactNode;
}

const BoneMount: React.FC<BoneMountProps> = ({
  bone,
  name,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  children,
}) => {
  if (!bone) return null;
  return createPortal(
    <group name={name} position={position} rotation={rotation} scale={scale}>
      {children}
    </group>,
    bone
  );
};

function shade(hex: string, multiplier: number): THREE.Color {
  const color = new THREE.Color(hex);
  color.multiplyScalar(multiplier);
  return color;
}

/**
 * Per-surface material semantics.
 *
 * The previous implementation was a regex else-if chain over lowercased source
 * names, which mis-resolved on the feminine body: its eye material is literally
 * called `Brown` (baseColor bit-identical to the masculine `Eye`), so the
 * head-hair branch matched first and painted all five feminine workers' irises
 * with their hair colour. Its trouser materials are `Brown_02` and `Brown2`, and
 * both matched `includes('2')`, so both took the 0.72 darkening and the cuff /
 * trouser tonal split was lost. An explicit table keyed on the exact names
 * dumped from each GLB removes the ambiguity entirely.
 */
type WorkerSurface =
  | 'skin'
  | 'hardHat'
  | 'hiVisStrap'
  | 'hiVis'
  | 'shirt'
  | 'denim'
  | 'denimDark'
  | 'bootUpper'
  | 'bootSole'
  | 'boot'
  | 'hair'
  | 'eye';

const SURFACE_BY_MATERIAL: Record<WorkerBodyType, Record<string, WorkerSurface>> = {
  masculine: {
    Skin: 'skin',
    Worker_Yellow: 'hardHat',
    Worker_Vest: 'hiVis',
    LightBrown: 'shirt',
    Grey: 'bootUpper',
    Black: 'bootSole',
    Eyebrows: 'hair',
    Moustache: 'hair',
    Eye: 'eye',
    Brown: 'denim',
    Brown2: 'denimDark',
  },
  feminine: {
    Skin: 'skin',
    Worker_Vest: 'hiVis',
    White: 'shirt',
    Worker_Yellow: 'hardHat',
    Black: 'boot',
    DarkBrown: 'hair',
    Brown: 'eye',
    Brown_02: 'denim',
    Brown2: 'denimDark',
  },
};

/**
 * Resolve the surface for one primitive. `Worker_Yellow` is the only material
 * that spans two body regions: the helmet shell on Worker_Head, and a narrow
 * pair of vertical torso straps on Worker_Body (208 verts, y 1.12-1.54,
 * x +/-0.13 on both bodies). The straps are hi-vis webbing, not moulded HDPE,
 * so they must not take the helmet's clearcoat.
 */
function resolveSurface(
  bodyType: WorkerBodyType,
  materialName: string,
  nodeName: string
): WorkerSurface | null {
  const surface = SURFACE_BY_MATERIAL[bodyType][materialName] ?? null;
  if (surface === 'hardHat' && !nodeName.includes('Worker_Head')) return 'hiVisStrap';
  return surface;
}

interface SurfaceProfile {
  /** MeshPhysicalMaterial is restricted to the surfaces whose read depends on it. */
  physical: boolean;
  roughness: number;
  metalness: number;
  envMapIntensity: number;
  sheen?: number;
  sheenColor?: string;
  sheenRoughness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  /** Tiling detail-map repeat, and normal strength. Omitted = no detail maps. */
  detailRepeat?: number;
  detailNormalScale?: number;
}

/**
 * Every worker surface previously collapsed to `roughness = 0.72, metalness = 0`
 * (0.28 eyes, 0.86 feet), so skin, HDPE helmet, hi-vis polyester, cotton drill,
 * denim and rubber sole all reflected identically. With `scene.environment` now
 * present these values finally separate.
 */
const SURFACE_PROFILES: Record<WorkerSurface, SurfaceProfile> = {
  skin: {
    physical: true,
    roughness: 0.44,
    metalness: 0,
    envMapIntensity: 1.4,
    sheen: 0.22,
    sheenColor: '#ff9d7d',
    sheenRoughness: 0.65,
    detailRepeat: 6,
    detailNormalScale: 0.28,
  },
  hardHat: {
    physical: true,
    roughness: 0.3,
    metalness: 0,
    envMapIntensity: 1.2,
    clearcoat: 0.35,
    clearcoatRoughness: 0.22,
  },
  hiVisStrap: {
    physical: true,
    roughness: 0.48,
    metalness: 0,
    envMapIntensity: 1.6,
    sheen: 0.3,
    sheenColor: '#ffffff',
    sheenRoughness: 0.5,
    detailRepeat: 10,
    detailNormalScale: 0.45,
  },
  hiVis: {
    physical: true,
    roughness: 0.6,
    metalness: 0,
    envMapIntensity: 1.8,
    sheen: 0.35,
    sheenColor: '#ffffff',
    sheenRoughness: 0.55,
    detailRepeat: 10,
    detailNormalScale: 0.55,
  },
  shirt: {
    physical: false,
    roughness: 0.86,
    metalness: 0,
    envMapIntensity: 0.9,
    detailRepeat: 10,
    detailNormalScale: 0.5,
  },
  denim: {
    physical: false,
    roughness: 0.9,
    metalness: 0,
    envMapIntensity: 0.8,
    detailRepeat: 4,
    detailNormalScale: 0.35,
  },
  denimDark: {
    physical: false,
    roughness: 0.88,
    metalness: 0,
    envMapIntensity: 0.8,
    detailRepeat: 4,
    detailNormalScale: 0.35,
  },
  bootUpper: { physical: false, roughness: 0.62, metalness: 0.02, envMapIntensity: 1 },
  bootSole: { physical: false, roughness: 0.88, metalness: 0, envMapIntensity: 0.7 },
  boot: { physical: false, roughness: 0.72, metalness: 0.02, envMapIntensity: 0.9 },
  hair: {
    physical: true,
    roughness: 0.55,
    metalness: 0,
    envMapIntensity: 1.1,
    sheen: 0.45,
    sheenRoughness: 0.35,
  },
  eye: {
    physical: true,
    roughness: 0.06,
    metalness: 0,
    envMapIntensity: 2,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
  },
};

function surfaceColor(surface: WorkerSurface, appearance: WorkerAppearance): THREE.Color {
  switch (surface) {
    case 'skin':
      return new THREE.Color(appearance.skinTone);
    case 'hardHat':
    case 'hiVisStrap':
      return new THREE.Color(appearance.hatColor);
    case 'hiVis':
      return new THREE.Color(appearance.hasVest ? appearance.accentColor : appearance.uniformColor);
    case 'shirt':
      return new THREE.Color(appearance.hasLabCoat ? '#eef2f4' : appearance.uniformColor);
    case 'eye':
      return new THREE.Color(appearance.eyeColor);
    case 'hair':
      return new THREE.Color(appearance.hairColor);
    case 'denim':
      return new THREE.Color(appearance.pantsColor);
    case 'denimDark':
      return shade(appearance.pantsColor, 0.72);
    case 'bootUpper':
      return new THREE.Color('#313b43');
    case 'bootSole':
      return new THREE.Color('#111820');
    case 'boot':
    default:
      return new THREE.Color('#232b33');
  }
}

/**
 * Build the runtime material for one primitive.
 *
 * Constructed rather than cloned, because half these surfaces need to be a
 * MeshPhysicalMaterial and the GLB ships MeshStandardMaterial. `side` is
 * deliberately carried over from the source: every material in both files is
 * authored `doubleSided: true`, and flipping to FrontSide without being able to
 * inspect the result risks an inside-out vest or hair for a shadow-pass saving
 * these scenes do not need.
 */
function createSurfaceMaterial(
  source: THREE.Material,
  surface: WorkerSurface,
  appearance: WorkerAppearance
): THREE.MeshStandardMaterial {
  const profile = SURFACE_PROFILES[surface];
  const base = {
    color: surfaceColor(surface, appearance),
    roughness: profile.roughness,
    metalness: profile.metalness,
    envMapIntensity: profile.envMapIntensity,
    side: (source as THREE.MeshStandardMaterial).side ?? THREE.FrontSide,
    transparent: (source as THREE.MeshStandardMaterial).transparent ?? false,
    opacity: (source as THREE.MeshStandardMaterial).opacity ?? 1,
    flatShading: false,
  };

  if (!profile.physical) return new THREE.MeshStandardMaterial(base);

  const physical = new THREE.MeshPhysicalMaterial(base);
  if (profile.sheen !== undefined) {
    physical.sheen = profile.sheen;
    physical.sheenRoughness = profile.sheenRoughness ?? 0.5;
    // Hair catches a lighter version of its own colour rather than a fixed tint.
    if (profile.sheenColor) {
      physical.sheenColor.set(profile.sheenColor);
    } else {
      physical.sheenColor.copy(shade(appearance.hairColor, 1.6));
    }
  }
  if (profile.clearcoat !== undefined) {
    physical.clearcoat = profile.clearcoat;
    physical.clearcoatRoughness = profile.clearcoatRoughness ?? 0.1;
  }
  return physical;
}

const WorkerAccessories: React.FC<{
  appearance: WorkerAppearance;
  model: THREE.Group;
  materials: AccessoryMaterials;
  leftEyelidRef: React.RefObject<THREE.Mesh | null>;
  rightEyelidRef: React.RefObject<THREE.Mesh | null>;
}> = ({ appearance, model, materials, leftEyelidRef, rightEyelidRef }) => {
  const head = model.getObjectByName('Head') ?? null;
  const chest = model.getObjectByName('Chest') ?? null;
  const hips = model.getObjectByName('Hips') ?? null;
  const wrist = model.getObjectByName('Wrist.L') ?? null;
  const isSupervisor = appearance.workAction === 'supervise';
  const faceSkinMaterial = useMemo(
    () => getSkinSoftMaterial(appearance.skinTone),
    [appearance.skinTone]
  );

  return (
    <>
      <BoneMount
        bone={head}
        name="worker-authored-face"
        scale={[appearance.headScale, appearance.headScale, appearance.headScale]}
      >
        {/* Both authored bodies already contain complete skinned faces. The
            runtime layer only supplies eyelids for the shared blink channel;
            a second nose and mouth floated above the authored profile. */}
        <mesh
          ref={leftEyelidRef}
          position={[-0.047, 0.067, 0.124]}
          geometry={SHARED_WORKER_GEOMETRY.eyelid}
          material={faceSkinMaterial}
        />
        <mesh
          ref={rightEyelidRef}
          position={[0.047, 0.067, 0.124]}
          geometry={SHARED_WORKER_GEOMETRY.eyelid}
          material={faceSkinMaterial}
        />
      </BoneMount>

      {appearance.hasSafetyGlasses && (
        <BoneMount bone={head} name="worker-safety-glasses" position={[0, 0.055, 0.12]}>
          {[-0.047, 0.047].map((x) => (
            <mesh
              key={x}
              position={[x, 0, 0]}
              geometry={SHARED_WORKER_GEOMETRY.glassesLens}
              material={materials.glasses}
              renderOrder={4}
            />
          ))}
          <mesh
            rotation={[0, 0, Math.PI / 2]}
            geometry={SHARED_WORKER_GEOMETRY.glassesBridge}
            material={materials.dark}
          />
          {[-0.084, 0.084].map((x) => (
            <mesh
              key={`temple-${x}`}
              position={[x, 0, -0.052]}
              geometry={UNIT_BOX}
              material={materials.dark}
              scale={[0.008, 0.008, 0.112]}
            />
          ))}
        </BoneMount>
      )}

      {appearance.hasHearingProtection && (
        <BoneMount bone={head} name="worker-hearing-protection" position={[0, 0.055, 0]}>
          {[-0.104, 0.104].map((x) => (
            <mesh
              key={x}
              position={[x, 0, 0]}
              rotation={[0, 0, Math.PI / 2]}
              geometry={EAR_DEFENDER}
              material={materials.accent}
            />
          ))}
          <mesh position={[0, 0.002, 0]} geometry={EAR_DEFENDER_BAND} material={materials.dark} />
        </BoneMount>
      )}

      <BoneMount bone={chest} name="worker-identity-badge" position={[0.105, 0.018, 0.142]}>
        <mesh geometry={UNIT_BOX} material={materials.badge} scale={[0.062, 0.082, 0.009]} />
        <mesh
          position={[0, 0.033, 0.006]}
          geometry={UNIT_BOX}
          material={materials.accent}
          scale={[0.052, 0.009, 0.004]}
        />
        <mesh
          position={[-0.017, -0.009, 0.006]}
          geometry={UNIT_BOX}
          material={materials.dark}
          scale={[0.018, 0.027, 0.004]}
        />
        {isSupervisor && (
          <>
            <mesh
              position={[0.015, 0.006, 0.006]}
              geometry={UNIT_BOX}
              material={materials.dark}
              scale={[0.021, 0.004, 0.004]}
            />
            <mesh
              position={[0.015, -0.008, 0.006]}
              geometry={UNIT_BOX}
              material={materials.dark}
              scale={[0.021, 0.004, 0.004]}
            />
            <mesh
              position={[0.015, -0.022, 0.006]}
              geometry={UNIT_BOX}
              material={materials.accent}
              scale={[0.021, 0.004, 0.004]}
            />
          </>
        )}
      </BoneMount>

      {isSupervisor && (
        <>
          <BoneMount bone={head} name="supervisor-hard-hat-identity-stripe">
            <mesh
              position={[0, 0.17, 0.125]}
              geometry={UNIT_BOX}
              material={materials.badge}
              scale={[0.025, 0.11, 0.008]}
            />
            <mesh
              position={[0, 0.222, 0.045]}
              geometry={UNIT_BOX}
              material={materials.badge}
              scale={[0.025, 0.008, 0.15]}
            />
          </BoneMount>
          <BoneMount
            bone={chest}
            name="supervisor-radio-and-lanyard"
            position={[-0.13, 0.055, 0.14]}
          >
            <mesh geometry={UNIT_BOX} material={materials.dark} scale={[0.052, 0.082, 0.026]} />
            <mesh
              position={[0.018, 0.048, 0]}
              rotation={[0, 0, Math.PI / 2]}
              geometry={SUPERVISOR_RADIO_KNOB}
              material={materials.accent}
            />
            <mesh
              position={[-0.021, 0.083, 0]}
              rotation={[0, 0, -0.14]}
              geometry={UNIT_BOX}
              material={materials.dark}
              scale={[0.006, 0.075, 0.006]}
            />
            <mesh
              position={[0.08, -0.035, -0.002]}
              rotation={[Math.PI / 2, 0, -0.55]}
              geometry={SUPERVISOR_CABLE}
              material={materials.dark}
            />
            <mesh
              position={[0.18, -0.045, 0.004]}
              rotation={[0, 0, -0.18]}
              geometry={UNIT_BOX}
              material={materials.accent}
              scale={[0.008, 0.12, 0.007]}
            />
          </BoneMount>
        </>
      )}

      {appearance.hasVest && (
        <>
          <BoneMount bone={chest} name="worker-reflective-vest-chest" position={[0, 0.008, 0.128]}>
            {[-0.078, 0.078].map((x) => (
              <mesh
                key={x}
                position={[x, 0, 0]}
                geometry={UNIT_BOX}
                material={materials.reflective}
                scale={[0.018, 0.135, 0.008]}
              />
            ))}
          </BoneMount>
          <BoneMount bone={hips} name="worker-reflective-vest-waist" position={[0, 0.12, 0.122]}>
            <mesh
              geometry={UNIT_BOX}
              material={materials.reflective}
              scale={[0.245, 0.019, 0.008]}
            />
          </BoneMount>
        </>
      )}

      {appearance.hasToolBelt && (
        <BoneMount bone={hips} name="worker-tool-belt" position={[0, 0.045, 0.075]}>
          <mesh
            position={[0, 0.012, -0.035]}
            geometry={UNIT_BOX}
            material={materials.dark}
            scale={[0.32, 0.026, 0.032]}
          />
          {[-0.14, 0.14].map((x) => (
            <mesh
              key={x}
              position={[x, 0, 0]}
              geometry={UNIT_BOX}
              material={materials.dark}
              scale={[0.075, 0.105, 0.045]}
            />
          ))}
        </BoneMount>
      )}

      {appearance.tool !== 'none' && (
        <BoneMount
          bone={wrist}
          name={`worker-tool-${appearance.tool}`}
          position={[0, 0.035, 0.025]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[0.88, 0.88, 0.88]}
        >
          <ToolAccessory tool={appearance.tool} />
        </BoneMount>
      )}
    </>
  );
};

export const WorkerModel: React.FC<WorkerModelProps> = ({ appearance, activity, signals }) => {
  const modelPath =
    appearance.bodyType === 'feminine' ? WORKER_ASSET_PATHS.feminine : WORKER_ASSET_PATHS.masculine;
  // The normalized v0.41 worker bodies use KHR_draco_mesh_compression. Keep
  // the decoder explicit here so a cold load never depends on another model
  // having configured Drei's shared GLTFLoader first.
  const { scene, animations } = useDracoGLTF(modelPath);
  const isTabVisible = useGameSimulationStore((state) => state.isTabVisible);
  const simulationRunning = useGameSimulationStore(
    (state) => Number.isFinite(state.gameSpeed) && state.gameSpeed > 0
  );
  const detailMapsEnabled = useGraphicsStore(
    (state) => state.graphics.quality === 'high' || state.graphics.quality === 'ultra'
  );
  const visualRootRef = useRef<THREE.Group>(null);
  const previousWorldPosition = useRef(new THREE.Vector3());
  const currentWorldPosition = useRef(new THREE.Vector3());
  const hasWorldSample = useRef(false);
  const actionsRef = useRef<Partial<Record<WorkerClipName, THREE.AnimationAction>>>({});
  const leftEyelidRef = useRef<THREE.Mesh>(null);
  const rightEyelidRef = useRef<THREE.Mesh>(null);
  const actionWeights = useRef<Record<WorkerClipName, number>>(
    Object.fromEntries(
      WORKER_CLIPS.map((clip) => [clip, clip === 'worker-idle' ? 1 : 0])
    ) as Record<WorkerClipName, number>
  );

  const prepared = useMemo(() => {
    const model = cloneSkeleton(scene) as THREE.Group;
    const materials: THREE.MeshStandardMaterial[] = [];
    const detailTargets: Array<{ material: THREE.MeshStandardMaterial; profile: SurfaceProfile }> =
      [];
    const skinned: THREE.Mesh[] = [];

    _bindBox.makeEmpty();

    model.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      // Boots contribute nothing to a silhouette shadow at ~5 cm shadow-map
      // texel density; the contact patch under the worker replaces them.
      const isFeet = (mesh.parent?.name ?? '').includes('Worker_Feet');
      mesh.castShadow = !isFeet;
      mesh.receiveShadow = true;
      skinned.push(mesh);

      const geometry = mesh.geometry;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      if (geometry.boundingBox) _bindBox.union(_box.copy(geometry.boundingBox));

      const sources = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      // glTFLoader splits multi-material nodes into generated Cube* primitives,
      // so the authored node name is the only remaining region cue.
      const nodeName = mesh.parent?.name ?? mesh.name;
      const built = sources.map((sourceMaterial) => {
        const surface = resolveSurface(appearance.bodyType, sourceMaterial.name, nodeName);
        if (!surface) return sourceMaterial as THREE.MeshStandardMaterial;
        const material = createSurfaceMaterial(sourceMaterial, surface, appearance);
        material.name = `${sourceMaterial.name}-${appearance.bodyType}`;
        materials.push(material);
        const profile = SURFACE_PROFILES[surface];
        if (profile.detailRepeat) detailTargets.push({ material, profile });
        return material;
      });
      mesh.material = Array.isArray(mesh.material) ? built : built[0];
    });

    // One conservative bind-pose volume shared by every primitive: all meshes
    // live in the same armature space, so a single character-sized sphere is
    // both correct and generous. Recompute-then-inflate (never scale in place)
    // so a remount cannot compound the margin.
    _bindBox.getCenter(_center);
    const radius = _bindBox.isEmpty() ? 1.6 : _center.distanceTo(_bindBox.max) + POSE_BOUNDS_MARGIN;
    for (const mesh of skinned) {
      // SkinnedMesh culling prefers `object.boundingSphere` and would otherwise
      // derive one from whatever pose happened to be current on first cull.
      (mesh as THREE.SkinnedMesh).boundingSphere = new THREE.Sphere(_center.clone(), radius);
      mesh.frustumCulled = true;
    }

    const bones = {
      head: model.getObjectByName('Head') ?? null,
      chest: model.getObjectByName('Chest') ?? null,
      hips: model.getObjectByName('Hips') ?? null,
      upperArmL: model.getObjectByName('UpperArm.L') ?? null,
    };
    // Hips carries no channel in any of the nine clips, so its rest transform is
    // the baseline for absolute writes rather than something the mixer restores.
    const hipsRest = bones.hips ? bones.hips.position.clone() : new THREE.Vector3();
    const hipsRestQuat = bones.hips ? bones.hips.quaternion.clone() : new THREE.Quaternion();

    // The Hips bone sits under Body, which carries a 27.25 degree bind yaw
    // (cancelled again at Torso). Rolling about raw local Z would therefore land
    // as a 27-degree-oblique tilt rather than a lateral weight shift, so derive
    // the axes that map onto the character's real forward/up in Root space.
    const bodyRest = model.getObjectByName('Body')?.quaternion.clone() ?? new THREE.Quaternion();
    const bodyRestInverse = bodyRest.clone().invert();
    const hipRollAxis = ROOT_FORWARD.clone().applyQuaternion(bodyRestInverse).normalize();
    const hipYawAxis = ROOT_UP.clone().applyQuaternion(bodyRestInverse).normalize();

    // Uniform armature scale. Stride length scales with it, so the clip's world
    // ground speed does too; reading it here keeps the constants valid if the
    // asset is ever re-exported at a different scale.
    const armatureScale = model.getObjectByName('CharacterArmature')?.scale.x ?? 1;
    const rigScale = Number.isFinite(armatureScale) && armatureScale > 0 ? armatureScale : 1;

    return {
      model,
      materials,
      detailTargets,
      bones,
      hipsRest,
      hipsRestQuat,
      hipRollAxis,
      hipYawAxis,
      rigScale,
    };
  }, [appearance, scene]);

  // Tiling surface detail. Loaded once for the whole roster and shared by
  // reference; a repeat variant is a clone, so it costs no extra GPU upload.
  useEffect(() => {
    if (prepared.detailTargets.length === 0) return;
    if (!detailMapsEnabled) {
      // Quality dropped below high at runtime: release the maps rather than
      // leaving the GLB workers holding detail the tier no longer asks for.
      for (const { material } of prepared.detailTargets) {
        if (!material.normalMap && !material.roughnessMap) continue;
        material.normalMap = null;
        material.roughnessMap = null;
        material.needsUpdate = true;
      }
      return;
    }
    let cancelled = false;

    requestWorkerDetailMaps().then((maps) => {
      if (cancelled || !maps) return;
      for (const { material, profile } of prepared.detailTargets) {
        const repeat = profile.detailRepeat ?? 6;
        const normal = getWorkerDetailMapVariant('normal', repeat);
        const roughness = getWorkerDetailMapVariant('roughness', repeat);
        if (normal) {
          material.normalMap = normal;
          material.normalScale.set(
            profile.detailNormalScale ?? 0.3,
            profile.detailNormalScale ?? 0.3
          );
        }
        // roughnessMap modulates material.roughness (three samples the green
        // channel), so the authored per-surface value stays the multiplier.
        if (roughness) material.roughnessMap = roughness;
        material.needsUpdate = true;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [detailMapsEnabled, prepared]);

  const accessoryMaterials = useMemo(() => createAccessoryMaterials(appearance), [appearance]);
  const mixer = useMemo(() => new THREE.AnimationMixer(prepared.model), [prepared.model]);

  useEffect(() => {
    const actions: Partial<Record<WorkerClipName, THREE.AnimationAction>> = {};
    for (const clipName of WORKER_CLIPS) {
      const clip = animations.find((candidate) => candidate.name === clipName);
      if (!clip) continue;
      const action = mixer.clipAction(clip);
      action.reset().setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY).play();
      const normalizedPhase = ((signals?.animationPhase ?? 0) / (Math.PI * 2) + 1) % 1;
      action.time = clip.duration * normalizedPhase;
      action.setEffectiveWeight(clipName === 'worker-idle' ? 1 : 0);
      actions[clipName] = action;
      actionWeights.current[clipName] = clipName === 'worker-idle' ? 1 : 0;
    }
    actionsRef.current = actions;
    mixer.update(0);

    return () => {
      actionsRef.current = {};
      mixer.stopAllAction();
      mixer.uncacheRoot(prepared.model);
    };
  }, [animations, mixer, prepared.model, signals]);

  useEffect(
    () => () => {
      prepared.materials.forEach((material) => material.dispose());
      Object.values(accessoryMaterials).forEach((material) => material.dispose());
    },
    [accessoryMaterials, prepared]
  );

  useFrame((_, delta) => {
    if (!isTabVisible || !visualRootRef.current) return;

    const safeDelta = Math.min(Math.max(delta, 1 / 240), 0.075);

    // Ground speed. The manager is authoritative when it is driving this
    // worker: it only advances every 2nd (high) or 3rd (medium) render frame,
    // so re-deriving speed from a per-frame world delta alternates between 0
    // and 2-3x the true value and makes the clip rate oscillate. The world
    // sample stays as the standalone fallback.
    let metresPerSecond = 0;
    if (signals) {
      metresPerSecond = Number.isFinite(signals.groundSpeed) ? signals.groundSpeed : 0;
    } else {
      visualRootRef.current.getWorldPosition(currentWorldPosition.current);
      if (!hasWorldSample.current) {
        previousWorldPosition.current.copy(currentWorldPosition.current);
        hasWorldSample.current = true;
      } else if (simulationRunning) {
        metresPerSecond =
          currentWorldPosition.current.distanceTo(previousWorldPosition.current) / safeDelta;
      }
      previousWorldPosition.current.copy(currentWorldPosition.current);
    }

    if (!simulationRunning) return;

    const clipSpeed = CLIP_GROUND_SPEED[appearance.bodyType];
    // Armature scale times the wrapper group's bodyScale: both scale the clip's
    // local-Z stride, so both scale the world speed the clip actually depicts.
    const scale =
      prepared.rigScale *
      (Number.isFinite(appearance.bodyScale) && appearance.bodyScale > 0
        ? appearance.bodyScale
        : 1);
    const walkSpeed = clipSpeed.walk * scale;
    const runSpeed = clipSpeed.run * scale;

    const waving = (signals?.waveAmount ?? 0) > 0.15;
    const moving = metresPerSecond > 0.05;
    const activeClip: WorkerClipName = moving
      ? activity === 'responding' || metresPerSecond > walkSpeed * RUN_CROSSOVER
        ? 'worker-run'
        : 'worker-walk'
      : waving
        ? // The radio clip is the one authored pose that lifts the left hand to
          // head height; the wave is an oscillation layered on top of it.
          'worker-radio'
        : activity === 'break'
          ? 'worker-break'
          : activity === 'working'
            ? TASK_CLIPS[appearance.workAction]
            : 'worker-idle';
    const supervisorFocus =
      appearance.workAction === 'supervise' && !moving && activity === 'working' ? -0.025 : 0;

    for (const clipName of WORKER_CLIPS) {
      const action = actionsRef.current[clipName];
      if (!action) continue;
      const nextWeight = THREE.MathUtils.damp(
        actionWeights.current[clipName],
        clipName === activeClip ? 1 : 0,
        11,
        safeDelta
      );
      actionWeights.current[clipName] = nextWeight;
      action.setEffectiveWeight(nextWeight);
    }

    const walkAction = actionsRef.current['worker-walk'];
    const runAction = actionsRef.current['worker-run'];
    if (walkAction) {
      walkAction.timeScale = THREE.MathUtils.clamp(metresPerSecond / walkSpeed, 0.55, 1.9);
    }
    if (runAction) {
      // Upper bound is a cadence guard, not a speed match: the fire drill pushes
      // 6 m/s against a clip that depicts ~2.7 (masculine) / ~2.17 (feminine)
      // world m/s, and no timeScale turns a jog stride into a sprint stride.
      runAction.timeScale = THREE.MathUtils.clamp(metresPerSecond / runSpeed, 0.7, 2.4);
    }

    mixer.update(safeDelta);

    // Secondary animation. This runs AFTER the mixer has rewritten every bone
    // from the clips, so the additive offsets below are non-accumulating and
    // need no save/restore. Ordering is guaranteed because both the clip
    // evaluation and the offsets happen inside this one callback.
    if (!signals) return;
    const { head, chest, hips, upperArmL } = prepared.bones;

    const eyelidScale = 0.18 + (1 - THREE.MathUtils.clamp(signals.blinkAmount, 0, 1)) * 0.82;
    if (leftEyelidRef.current) leftEyelidRef.current.scale.y = eyelidScale;
    if (rightEyelidRef.current) rightEyelidRef.current.scale.y = eyelidScale;

    if (head) {
      // The supervisor's close-LOD expression is a restrained gaze and posture
      // cue on the existing rig. No duplicate face or unavailable morph target
      // is introduced.
      _euler.set(signals.headPitch + supervisorFocus, signals.headYaw, 0, 'XYZ');
      _quat.setFromEuler(_euler);
      // Pre-multiply: the offset must read as an increment on the clip's own
      // parent-space rotation, not a rotation about the already-rotated bone.
      head.quaternion.premultiply(_quat);
    }

    const chestPitch = signals.chestPitch + signals.breathAmount * 0.008 - supervisorFocus * 0.35;
    if (chest && Math.abs(chestPitch) > 1e-4) {
      _euler.set(chestPitch, 0, 0, 'XYZ');
      _quat.setFromEuler(_euler);
      chest.quaternion.premultiply(_quat);
    }

    if (hips) {
      // No clip animates Hips, so this must be an absolute write from the rest
      // transform - a post-multiply here integrates without bound. Rotating
      // Hips leans the torso over the weight-bearing leg while the legs stay
      // planted (they hang off Body, not off Hips).
      _quat.setFromAxisAngle(prepared.hipYawAxis, signals.hipYaw);
      _quatB.setFromAxisAngle(prepared.hipRollAxis, signals.hipRoll);
      _quat.multiply(_quatB);
      hips.quaternion.copy(prepared.hipsRestQuat).premultiply(_quat);
      hips.position.set(
        prepared.hipsRest.x + signals.hipShiftX,
        prepared.hipsRest.y,
        prepared.hipsRest.z
      );
    }

    if (upperArmL && signals.waveAmount > 0.001) {
      const swing = 0.34 + Math.sin(signals.wavePhase) * 0.26;
      _euler.set(signals.waveAmount * swing, 0, 0, 'XYZ');
      _quat.setFromEuler(_euler);
      upperArmL.quaternion.premultiply(_quat);
    }
  });

  return (
    <group
      ref={visualRootRef}
      name="authored-worker-v5"
      scale={[appearance.bodyScale, appearance.heightScale, appearance.bodyScale]}
    >
      <primitive object={prepared.model} />
      <WorkerAccessories
        appearance={appearance}
        model={prepared.model}
        materials={accessoryMaterials}
        leftEyelidRef={leftEyelidRef}
        rightEyelidRef={rightEyelidRef}
      />
    </group>
  );
};

export default WorkerModel;
