/**
 * InstancedFoliage - alpha-cut card vegetation for the village, the farm and
 * the exterior parkland.
 *
 * Replaces solid-polyhedron canopies (three spheres of flat `#3b7638`) with a
 * cage of alpha-tested leaf cards. From any viewing angle four to six cards
 * are visible, so the canopy has a ragged silhouette and real inter-card
 * parallax while costing FEWER triangles than the spheres it replaces, and
 * one draw call for every tree of a species instead of one per blob.
 *
 * KEY DECISIONS
 *
 * - `alphaTest`, never blending. Alpha-tested materials write depth and sort
 *   as opaque, so there is no transparency-ordering flicker (the failure mode
 *   CLAUDE.md warns about) and no per-frame sort.
 * - Cards are emitted with BOTH windings and the material stays `FrontSide`.
 *   The obvious alternative, `DoubleSide`, makes three negate the normal on
 *   back faces (`normal *= faceDirection`), which would invert the outward-bent
 *   canopy normals and light the far side of every tree from inside. Two
 *   windings cost nothing: exactly one of each pair survives back-face culling
 *   from any given view, so nothing is rasterised twice and nothing z-fights.
 * - Canopy vertex normals are blended toward the canopy centre-to-vertex
 *   direction. Flat card normals make a canopy read as a stack of plates; a
 *   spherical bend makes it read as a volume. This is free.
 * - Per-instance colour from the shared `treeJitterFromPosition` hash, so a
 *   given tree looks identical whether the village, the farm or the exterior
 *   draws it, and "every tree is the same green" is fixed for one float3.
 * - `alphaToCoverage` is deliberately OFF: `COMPOSER_MULTISAMPLING === 0`
 *   (src/constants/colorGrade.ts) and the composer owns the render target from
 *   the medium tier up, so there is no MSAA for coverage to modulate. Turning
 *   it on would imply an anti-aliased cut edge that does not exist. SMAA
 *   handles the silhouette instead.
 */

import React, { useMemo, useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TREE_MATERIALS } from '../../utils/sharedMaterials';
import { shouldRunThisFrame } from '../../utils/frameThrottle';
import { useGraphicsStore } from '../../stores/graphicsStore';
import { EXTERIOR_LAYERS, POLYGON_OFFSET, RENDER_ORDER } from '../../constants/renderLayers';
import {
  generateLeafAtlas,
  generateLeafNormal,
  generateLeafRoughness,
  generateGrassBladeAtlas,
  generateMulchDecal,
  type FoliageKind,
} from '../../textures/foliage';
import { applyWindShader } from './WindDriver';

export type TreeSpecies = 'oak' | 'pine' | 'birch';

// ============================================================
// MODULE-LEVEL SCRATCH (never allocate inside useFrame)
// ============================================================

const _obj = new THREE.Object3D();
const _color = new THREE.Color();
const _worldPos = new THREE.Vector3();

// ============================================================
// CARD CAGE GEOMETRY
// ============================================================

interface CardBuilder {
  position: number[];
  normal: number[];
  uv: number[];
}

/**
 * Push one quad as two triangles in BOTH windings, sharing vertex normals.
 * `sphericalOrigin` is the point normals are bent away from; pass null to keep
 * the card's own plane normal (used for ground clutter, which should light
 * like the ground it sits on).
 */
const pushCard = (
  b: CardBuilder,
  corners: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3],
  uvRect: [number, number, number, number],
  sphericalOrigin: THREE.Vector3 | null,
  sphericalBlend: number,
  flatNormal: THREE.Vector3
): void => {
  const [u0, v0, u1, v1] = uvRect;
  const uvs: [number, number][] = [
    [u0, v0],
    [u1, v0],
    [u1, v1],
    [u0, v1],
  ];

  const normalFor = (p: THREE.Vector3): [number, number, number] => {
    if (!sphericalOrigin) return [flatNormal.x, flatNormal.y, flatNormal.z];
    const n = p.clone().sub(sphericalOrigin);
    if (n.lengthSq() < 1e-6) n.copy(flatNormal);
    n.normalize().multiplyScalar(sphericalBlend);
    n.addScaledVector(flatNormal, 1 - sphericalBlend);
    if (n.lengthSq() < 1e-6) n.copy(flatNormal);
    n.normalize();
    return [n.x, n.y, n.z];
  };

  const tri = (a: number, c: number, d: number) => {
    for (const idx of [a, c, d]) {
      const p = corners[idx];
      b.position.push(p.x, p.y, p.z);
      const n = normalFor(p);
      b.normal.push(n[0], n[1], n[2]);
      b.uv.push(uvs[idx][0], uvs[idx][1]);
    }
  };

  // Front winding, then the mirrored winding so FrontSide culling always
  // leaves exactly one of the pair visible.
  tri(0, 1, 2);
  tri(0, 2, 3);
  tri(0, 2, 1);
  tri(0, 3, 2);
};

/** Atlas cell rect for cell 0..3 of a 2x2 atlas, optionally mirrored in u. */
const cellUv = (cell: number, mirror: boolean): [number, number, number, number] => {
  const cx = (cell % 2) * 0.5;
  const cy = (cell >> 1) * 0.5;
  return mirror ? [cx + 0.5, cy, cx, cy + 0.5] : [cx, cy, cx + 0.5, cy + 0.5];
};

interface CanopyOptions {
  /** Horizontal half-extent of the canopy. */
  radius: number;
  /** Vertical half-extent. */
  height: number;
  /** Canopy centre height in tree-local space. */
  centerY: number;
  /** 0 = rectangular cards (broadleaf), 1 = fully tapered (conifer). */
  taper: number;
}

/**
 * Eight-card cage: four vertical quads through the axis at 45 degree yaw
 * steps, two tilted quads for oblique parallax, and two horizontal caps that
 * stop the canopy looking hollow from above or below.
 *
 * ~32 triangles (16 after back-face culling) against ~288 for the three
 * spheres this replaces.
 */
export const createCanopyCage = ({
  radius,
  height,
  centerY,
  taper,
}: CanopyOptions): THREE.BufferGeometry => {
  const b: CardBuilder = { position: [], normal: [], uv: [] };
  const origin = new THREE.Vector3(0, centerY, 0);
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();

  const addQuad = (
    yaw: number,
    tilt: number,
    scale: number,
    offsetY: number,
    cell: number,
    mirror: boolean,
    horizontal: boolean
  ) => {
    const r = radius * scale;
    const h = height * scale;
    // Bottom corners keep full width; top corners taper for conifers.
    const topR = horizontal ? r : r * (1 - taper * 0.85);
    const local: THREE.Vector3[] = horizontal
      ? [
          new THREE.Vector3(-r, 0, -r),
          new THREE.Vector3(r, 0, -r),
          new THREE.Vector3(r, 0, r),
          new THREE.Vector3(-r, 0, r),
        ]
      : [
          new THREE.Vector3(-r, -h, 0),
          new THREE.Vector3(r, -h, 0),
          new THREE.Vector3(topR, h, 0),
          new THREE.Vector3(-topR, h, 0),
        ];

    euler.set(tilt, yaw, 0);
    quat.setFromEuler(euler);
    const corners = local.map((v) =>
      v.applyQuaternion(quat).add(new THREE.Vector3(0, centerY + offsetY * height, 0))
    ) as [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3];

    const flat = new THREE.Vector3(0, horizontal ? 1 : 0, horizontal ? 0 : 1).applyQuaternion(quat);
    pushCard(b, corners, cellUv(cell, mirror), origin, 0.8, flat);
  };

  // Four vertical cards through the axis.
  addQuad(0, 0, 1.0, 0, 0, false, false);
  addQuad(Math.PI / 4, 0, 0.96, 0.04, 1, true, false);
  addQuad(Math.PI / 2, 0, 1.0, -0.03, 2, false, false);
  addQuad((Math.PI * 3) / 4, 0, 0.94, 0.06, 3, true, false);
  // Two tilted cards: these are what give the silhouette depth when the
  // camera is above or below the canopy midline.
  addQuad(Math.PI / 8, 0.44, 0.82, 0.18, 1, false, false);
  addQuad((Math.PI * 5) / 8, -0.44, 0.8, -0.16, 3, true, false);
  // Caps, so the canopy is not see-through from directly above.
  addQuad(0.35, 0, 0.78, 0.5, 2, true, true);
  addQuad(1.15, 0, 0.9, -0.34, 0, false, true);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(b.position, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.normal, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
  geo.computeBoundingSphere();
  return geo;
};

/** Three crossed vertical quads rooted at y=0, for ground tufts. */
const createClutterTuft = (width: number, tall: number): THREE.BufferGeometry => {
  const b: CardBuilder = { position: [], normal: [], uv: [] };
  // Grass lights like the ground it grows from: normals straight up rather
  // than out of the card plane.
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();

  for (let i = 0; i < 3; i++) {
    const yaw = (i / 3) * Math.PI;
    const hw = width * 0.5 * (0.85 + i * 0.12);
    const h = tall * (0.82 + i * 0.14);
    euler.set(0, yaw, 0);
    quat.setFromEuler(euler);
    const corners = [
      new THREE.Vector3(-hw, 0, 0),
      new THREE.Vector3(hw, 0, 0),
      new THREE.Vector3(hw, h, 0),
      new THREE.Vector3(-hw, h, 0),
    ].map((v) => v.applyQuaternion(quat)) as [
      THREE.Vector3,
      THREE.Vector3,
      THREE.Vector3,
      THREE.Vector3,
    ];
    // The atlas roots its blades on the cell's v=0 edge, which is exactly
    // where y=0 of this card sits, so the standard rect maps straight across.
    pushCard(b, corners, cellUv(i % 4, i % 2 === 1), null, 0, up);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(b.position, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.normal, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
  geo.computeBoundingSphere();
  return geo;
};

// ============================================================
// MATERIALS
// ============================================================

/** Base level stays binary at this threshold; the atlas writes a
 *  sub-threshold halo so mip reduction does not erode the canopy. */
const FOLIAGE_ALPHA_TEST = 0.4;

const leafRoughness = generateLeafRoughness(256);

/**
 * Build a foliage material.
 *
 * `tint` only drives the `diffuse` UNIFORM, never a define, and every variant
 * shares one `customProgramCacheKey`, so any number of tinted variants still
 * compile to a single shader program.
 */
export const createFoliageMaterial = (
  kind: FoliageKind,
  tint: string = '#ffffff'
): THREE.MeshStandardMaterial => {
  const atlasSize = kind === 'needle' ? 256 : 512;
  const material = new THREE.MeshStandardMaterial({
    color: tint,
    map: generateLeafAtlas(atlasSize, kind),
    normalMap: generateLeafNormal(atlasSize, kind),
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughnessMap: leafRoughness,
    roughness: 1.0,
    metalness: 0,
    alphaTest: FOLIAGE_ALPHA_TEST,
    side: THREE.FrontSide,
    // Both windings are already in the geometry, so FrontSide culling leaves
    // complete coverage in the shadow pass at HALF the fragment cost of
    // DoubleSide. (three's default for a FrontSide material is BackSide
    // shadows, an acne workaround for solids that thin cards do not need.)
    shadowSide: THREE.FrontSide,
    // NOTE: `vertexColors` stays FALSE on purpose. Per-instance colour rides
    // `instanceColor`, and WebGLProgram.js:735 already defines USE_COLOR in the
    // fragment prefix when `instancingColor` is set. Turning `vertexColors` on
    // would additionally define USE_COLOR in the VERTEX prefix (line 566),
    // whose `vColor *= color;` reads a `color` attribute this geometry does not
    // have - an absent attribute reads (0,0,0,1) and every leaf goes black.
  });
  applyWindShader(material, {
    heightRef: 6.0,
    strengthScale: 1.0,
    cacheKey: `millos_foliage_${kind}_v1`,
  });
  return material;
};

const createFoliageDepthMaterial = (
  kind: FoliageKind,
  source: THREE.MeshStandardMaterial
): THREE.MeshDepthMaterial => {
  const depth = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map: source.map,
    alphaTest: FOLIAGE_ALPHA_TEST,
    side: THREE.FrontSide,
  });
  // The depth material must sway in lockstep or the shadow stays rigid while
  // the leaves move, which reads as a lighting bug rather than as wind.
  applyWindShader(depth, {
    heightRef: 6.0,
    strengthScale: 1.0,
    cacheKey: `millos_foliage_${kind}_v1_depth`,
  });
  return depth;
};

export const BROADLEAF_MATERIAL = createFoliageMaterial('broadleaf');
export const NEEDLE_MATERIAL = createFoliageMaterial('needle');
/** Shared wind-synced depth materials. three copies `map`/`alphaTest`/`side`
 *  onto whatever depth material it uses (WebGLShadowMap.getDepthMaterial), so
 *  the only thing these have to add is the matching vertex sway - without it
 *  the leaves move and their shadow does not. */
export const BROADLEAF_DEPTH = createFoliageDepthMaterial('broadleaf', BROADLEAF_MATERIAL);
export const NEEDLE_DEPTH = createFoliageDepthMaterial('needle', NEEDLE_MATERIAL);

const CLUTTER_ALPHA_TEST = 0.45;

const CLUTTER_MATERIAL = new THREE.MeshStandardMaterial({
  map: generateGrassBladeAtlas(256),
  roughness: 0.92,
  metalness: 0,
  alphaTest: CLUTTER_ALPHA_TEST,
  side: THREE.FrontSide,
  // See the note on the foliage material: instanceColor alone, never
  // `vertexColors`, or the missing `color` attribute blackens every tuft.
});
applyWindShader(CLUTTER_MATERIAL, {
  heightRef: 0.5,
  strengthScale: 0.9,
  cacheKey: 'millos_clutter_v1',
});

// Lit, not basic: an unlit decal would still read as daylight dirt at night
// and would ignore the canopy shadow falling across it.
const MULCH_MATERIAL = new THREE.MeshStandardMaterial({
  map: generateMulchDecal(128),
  roughness: 1,
  metalness: 0,
  transparent: true,
  opacity: 0.85,
  // Floor-level transparent overlay: never writes depth, always offset toward
  // the camera, per the CLAUDE.md z-fighting decision tree.
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: POLYGON_OFFSET.exteriorOverlay.factor,
  polygonOffsetUnits: POLYGON_OFFSET.exteriorOverlay.units,
});

// ============================================================
// SPECIES
// ============================================================

interface SpeciesDef {
  trunk: THREE.BufferGeometry;
  canopy: THREE.BufferGeometry;
  trunkMaterial: THREE.MeshStandardMaterial;
  kind: FoliageKind;
}

const makeTrunk = (
  topRadius: number,
  bottomRadius: number,
  height: number
): THREE.BufferGeometry => {
  const geo = new THREE.CylinderGeometry(topRadius, bottomRadius, height, 8);
  geo.translate(0, height * 0.5, 0);
  return geo;
};

const SPECIES: Record<TreeSpecies, SpeciesDef> = {
  oak: {
    trunk: makeTrunk(0.18, 0.32, 2.6),
    canopy: createCanopyCage({ radius: 1.85, height: 1.55, centerY: 3.3, taper: 0 }),
    trunkMaterial: TREE_MATERIALS.trunk,
    kind: 'broadleaf',
  },
  birch: {
    trunk: makeTrunk(0.1, 0.16, 3.1),
    canopy: createCanopyCage({ radius: 1.25, height: 1.5, centerY: 3.6, taper: 0.15 }),
    trunkMaterial: TREE_MATERIALS.birchTrunk,
    kind: 'broadleaf',
  },
  pine: {
    trunk: makeTrunk(0.12, 0.24, 3.0),
    canopy: createCanopyCage({ radius: 1.45, height: 1.9, centerY: 3.1, taper: 1 }),
    // Pine reuses the oak bark map; there is no dedicated pine trunk material
    // in sharedMaterials and adding one is not this domain's file.
    trunkMaterial: TREE_MATERIALS.trunk,
    kind: 'needle',
  },
};

// ============================================================
// PER-INSTANCE JITTER
// ============================================================

/**
 * Deterministic per-tree jitter from world position. Intentionally the same
 * hash as `exterior/ExteriorVegetation.treeJitterFromPosition`, so a tree at a
 * given spot looks the same whichever system draws it.
 */
export const foliageJitter = (position: readonly [number, number, number]) => {
  const h = Math.abs(Math.sin(position[0] * 12.9898 + position[2] * 78.233) * 43758.5453);
  const frac = h - Math.floor(h);
  const h2 = Math.abs(Math.sin(position[0] * 39.3467 + position[2] * 11.135) * 24634.6345);
  const frac2 = h2 - Math.floor(h2);
  return { frac, frac2, rotY: frac * Math.PI * 2, scaleJitter: 0.88 + frac2 * 0.26 };
};

/** Hue/lightness spread so a stand of trees is not one flat green. */
const canopyTint = (frac: number, frac2: number): THREE.Color => {
  // ~15% of trees shift yellow; the rest ride a narrow hue band.
  const yellowed = frac2 > 0.85;
  const hue = yellowed ? 0.13 + frac * 0.03 : 0.26 + (frac - 0.5) * 0.06;
  const sat = yellowed ? 0.5 : 0.36 + frac2 * 0.18;
  const light = 0.42 * (0.82 + frac2 * 0.33);
  return _color.setHSL(hue, sat, light);
};

// ============================================================
// TREE FIELD
// ============================================================

export interface TreeInstance {
  position: [number, number, number];
  scale?: number;
  type?: TreeSpecies;
}

interface SpeciesBucket {
  species: TreeSpecies;
  items: TreeInstance[];
}

const SpeciesGroup: React.FC<{ bucket: SpeciesBucket }> = ({ bucket }) => {
  const def = SPECIES[bucket.species];
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const canopyRef = useRef<THREE.InstancedMesh>(null);
  const count = bucket.items.length;

  useLayoutEffect(() => {
    const trunk = trunkRef.current;
    const canopy = canopyRef.current;
    if (!trunk || !canopy) return;

    bucket.items.forEach((item, i) => {
      const jit = foliageJitter(item.position);
      const scale = (item.scale ?? 1) * jit.scaleJitter;
      _obj.position.set(item.position[0], item.position[1], item.position[2]);
      _obj.rotation.set(0, jit.rotY, 0);
      _obj.scale.setScalar(scale);
      _obj.updateMatrix();
      trunk.setMatrixAt(i, _obj.matrix);
      canopy.setMatrixAt(i, _obj.matrix);
      canopy.setColorAt(i, canopyTint(jit.frac, jit.frac2));
    });

    trunk.instanceMatrix.needsUpdate = true;
    canopy.instanceMatrix.needsUpdate = true;
    if (canopy.instanceColor) canopy.instanceColor.needsUpdate = true;
    trunk.computeBoundingSphere();
    canopy.computeBoundingSphere();
  }, [bucket]);

  // The alpha-tested canopy needs a matching custom depth material or its
  // shadow is a solid card silhouette instead of dappled leaf shade.
  useLayoutEffect(() => {
    const canopy = canopyRef.current;
    if (!canopy) return;
    canopy.customDepthMaterial = def.kind === 'needle' ? NEEDLE_DEPTH : BROADLEAF_DEPTH;
  }, [def.kind]);

  if (count === 0) return null;

  return (
    <group>
      <instancedMesh
        ref={trunkRef}
        args={[def.trunk, def.trunkMaterial, count]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={canopyRef}
        args={[def.canopy, def.kind === 'needle' ? NEEDLE_MATERIAL : BROADLEAF_MATERIAL, count]}
        castShadow
        receiveShadow
      />
    </group>
  );
};
SpeciesGroup.displayName = 'SpeciesGroup';

/**
 * Renders a whole stand of trees in two draw calls per species (trunks +
 * canopies) regardless of tree count.
 */
export const InstancedTreeField: React.FC<{ trees: readonly TreeInstance[] }> = React.memo(
  ({ trees }) => {
    const buckets = useMemo<SpeciesBucket[]>(() => {
      const map = new Map<TreeSpecies, TreeInstance[]>();
      trees.forEach((t) => {
        const species = t.type ?? 'oak';
        const list = map.get(species);
        if (list) list.push(t);
        else map.set(species, [t]);
      });
      return Array.from(map.entries()).map(([species, items]) => ({ species, items }));
    }, [trees]);

    return (
      <>
        {buckets.map((bucket) => (
          <SpeciesGroup key={bucket.species} bucket={bucket} />
        ))}
      </>
    );
  }
);
InstancedTreeField.displayName = 'InstancedTreeField';

// ============================================================
// GROUND CLUTTER
// ============================================================

const CLUTTER_GEOMETRY = createClutterTuft(0.42, 0.52);

/**
 * Tier density for ground clutter. Alpha-tested cards are fill-rate work, not
 * triangle work, so the low tier drops them entirely and medium runs a third
 * of the budget. Derived from the existing `quality` field rather than a new
 * graphics setting, so nothing needs to be added to the persisted store.
 */
const VEGETATION_DENSITY: Record<string, number> = {
  low: 0,
  medium: 0.35,
  high: 1,
  ultra: 1,
};

export const useVegetationDensity = (): number => {
  const quality = useGraphicsStore((state) => state.graphics.quality);
  return VEGETATION_DENSITY[quality] ?? 1;
};

/** Halton low-discrepancy sequence: even coverage without clumping, and
 *  deterministic, so clutter never moves between sessions. */
const halton = (index: number, base: number): number => {
  let result = 0;
  let f = 1 / base;
  let i = index;
  while (i > 0) {
    result += f * (i % base);
    i = Math.floor(i / base);
    f /= base;
  }
  return result;
};

export interface ClutterRect {
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
}

export interface ClutterSpec {
  /** Instance budget at full density (tier scaling is applied on top). */
  count: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Footprints to keep clear of every tuft (buildings, ponds). */
  exclude?: readonly ClutterRect[];
  /**
   * Footprints that suppress only the OPEN-GROUND fill, not the tufts pulled
   * in by an attractor. This is how weeds still creep up a wall standing in
   * the middle of a paved square while the square itself stays swept.
   */
  openExclude?: readonly ClutterRect[];
  /** Wall bases, fence lines and trunks to concentrate tufts around, which is
   *  exactly where the missing contact-occlusion cue shows most. */
  attractors?: readonly (readonly [number, number])[];
  /** Ground height in the parent group's local space. */
  y?: number;
  /** Camera distance beyond which the whole field is skipped. */
  cullDistance?: number;
  /** 0..1 tier density multiplier. */
  density?: number;
}

/**
 * One instanced draw call of alpha-tested grass tufts.
 *
 * Fill rate, not triangles, is the cost here: cards are only ~0.5 m tall and
 * the instance count is prefixed by camera distance on a throttled frame, so
 * the field collapses to zero long before it can matter to a distant scene.
 * Never casts or receives shadows - shadow-pass fragment work on alpha-tested
 * cards is the single most likely way to blow the farm's draw budget.
 */
export const InstancedGrassClutter: React.FC<{ spec: ClutterSpec }> = React.memo(({ spec }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const placements = useMemo(() => {
    const density = Math.max(0, Math.min(1, spec.density ?? 1));
    const budget = Math.floor(spec.count * density);
    const { minX, maxX, minZ, maxZ } = spec.bounds;
    const y = spec.y ?? 0;
    const attractors = spec.attractors ?? [];
    const exclude = spec.exclude ?? [];
    const openExclude = spec.openExclude ?? [];
    const cx = (minX + maxX) * 0.5;
    const cz = (minZ + maxZ) * 0.5;

    const out: { x: number; y: number; z: number; s: number; rot: number; tint: number }[] = [];
    for (let i = 0; i < budget * 2 && out.length < budget; i++) {
      const h1 = halton(i + 7, 2);
      const h2 = halton(i + 7, 3);
      const h3 = halton(i + 7, 5);
      let x: number;
      let z: number;
      // Three of every five tufts hug an attractor; the rest fill open ground.
      const nearAttractor = attractors.length > 0 && i % 5 < 3;
      if (nearAttractor) {
        const a = attractors[i % attractors.length];
        const ang = h1 * Math.PI * 2;
        const rad = 0.5 + h2 * 2.1;
        x = a[0] + Math.cos(ang) * rad;
        z = a[1] + Math.sin(ang) * rad;
      } else {
        x = minX + h1 * (maxX - minX);
        z = minZ + h2 * (maxZ - minZ);
      }
      if (x < minX || x > maxX || z < minZ || z > maxZ) continue;

      const hits = (rects: readonly ClutterRect[]): boolean =>
        rects.some((r) => Math.abs(x - r.x) < r.halfX && Math.abs(z - r.z) < r.halfZ);
      if (hits(exclude)) continue;
      if (!nearAttractor && hits(openExclude)) continue;

      out.push({
        x,
        y,
        z,
        s: 0.72 + h3 * 0.75,
        rot: h3 * Math.PI * 2,
        tint: halton(i + 7, 7),
      });
    }

    // Near-to-centre first, so a count prefix is also a distance prefix.
    out.sort((a, b) => (a.x - cx) ** 2 + (a.z - cz) ** 2 - ((b.x - cx) ** 2 + (b.z - cz) ** 2));
    return out;
  }, [spec]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || placements.length === 0) return;
    placements.forEach((p, i) => {
      _obj.position.set(p.x, p.y, p.z);
      _obj.rotation.set(0, p.rot, 0);
      _obj.scale.set(p.s, p.s * (0.8 + p.tint * 0.5), p.s);
      _obj.updateMatrix();
      mesh.setMatrixAt(i, _obj.matrix);
      // ~20% browned-off tufts, the rest a lightness spread.
      const browned = p.tint > 0.8;
      _color.setHSL(
        browned ? 0.11 : 0.27 + (p.tint - 0.5) * 0.05,
        browned ? 0.42 : 0.4,
        0.36 * (0.7 + p.tint * 0.45)
      );
      mesh.setColorAt(i, _color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [placements]);

  const cullDistance = spec.cullDistance ?? 120;

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh || placements.length === 0) return;
    if (!shouldRunThisFrame(12)) return;
    mesh.getWorldPosition(_worldPos);
    const dist = _worldPos.distanceTo(state.camera.position);
    const next =
      dist > cullDistance
        ? 0
        : dist > cullDistance * 0.5
          ? Math.floor(placements.length * 0.4)
          : placements.length;
    if (mesh.count !== next) mesh.count = next;
  });

  if (placements.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[CLUTTER_GEOMETRY, CLUTTER_MATERIAL, placements.length]}
      // Never CASTS: shadow-pass fragment work on alpha-tested cards is the
      // fastest way to blow the farm's budget. Does RECEIVE - `receiveShadow`
      // is a bool uniform, not a define, so it costs no extra program, and
      // without it every tuft glows inside a building's shadow.
      castShadow={false}
      receiveShadow
    />
  );
});
InstancedGrassClutter.displayName = 'InstancedGrassClutter';

// ============================================================
// MULCH DECALS
// ============================================================

const MULCH_GEOMETRY = new THREE.CircleGeometry(1, 14);
MULCH_GEOMETRY.rotateX(-Math.PI / 2);

/**
 * Soft dirt rings that put a trunk or a wall base in contact with the ground.
 *
 * `y` is the caller's problem: the village square sits on its own cobble sheet
 * at local y=0.12 and the farm barnyard at 0.08, so a single shared
 * EXTERIOR_LAYERS constant would sink under them. Callers pass a height just
 * above whatever surface they are decorating; the material never writes depth
 * and carries `exteriorOverlay` polygon offset so it cannot z-fight.
 */
export const InstancedMulch: React.FC<{
  spots: readonly (readonly [number, number])[];
  radius?: number;
  y?: number;
}> = React.memo(({ spots, radius = 1.9, y = EXTERIOR_LAYERS.groundOverlay }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    spots.forEach((s, i) => {
      const jitter = halton(i + 3, 2);
      _obj.position.set(s[0], y, s[1]);
      _obj.rotation.set(0, jitter * Math.PI * 2, 0);
      _obj.scale.setScalar(radius * (0.82 + jitter * 0.4));
      _obj.updateMatrix();
      mesh.setMatrixAt(i, _obj.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [spots, radius, y]);

  if (spots.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[MULCH_GEOMETRY, MULCH_MATERIAL, spots.length]}
      renderOrder={RENDER_ORDER.floorEffects}
      receiveShadow
    />
  );
});
InstancedMulch.displayName = 'InstancedMulch';
