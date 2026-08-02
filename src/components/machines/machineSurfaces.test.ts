/**
 * Invariants for the machine surface set.
 *
 * These are the checks a screenshot would otherwise have to catch. The rules
 * encoded here are the exact ones the previous material set broke:
 *
 *   - metalness in the physically invalid 0.05-0.5 band
 *   - a roughnessMap whose green channel is not roughness
 *   - a metalnessMap that multiplies by a constant and does nothing
 *   - a normalScale so low the map is inert
 *   - a non-deterministic `customProgramCacheKey`
 *   - decals facing into the object they are stuck to
 */

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  MACHINE_MATERIALS,
  MACHINE_ORM_MEAN_ROUGHNESS,
  MACHINE_ORM_ROUGHNESS_RANGE,
  MACHINE_WEAR_CACHE_KEY,
  SIFTER_DECK_Y,
  machineHash01,
  machineInstanceTint,
  setMachineScreenGlow,
} from './machineSurfaces';
import {
  DECAL_ATLAS_SIZE,
  DECAL_CELL,
  getMachineDecalAtlas,
  planMachineDecals,
  writeDecalUvRects,
  MACHINE_DECAL_GEOMETRY,
} from './machineDecals';
import { MachineData, MachineType } from '../../types';
import { generateMachineORM, generateMachinePanelNormal } from '../../textures';

const standardMaterials = Object.entries(MACHINE_MATERIALS).filter(
  (entry): entry is [string, THREE.MeshStandardMaterial] =>
    (entry[1] as THREE.Material).type === 'MeshStandardMaterial'
);

describe('machine material physics', () => {
  it('authors metalness as a hard binary - never the invalid half-metal band', () => {
    for (const [name, material] of standardMaterials) {
      expect([0, 1], `${name} metalness ${material.metalness}`).toContain(material.metalness);
    }
  });

  it('only assigns metalness 1 to hexes bright enough to be a real conductor F0', () => {
    // A metal's albedo IS its specular reflectance. Below ~0.3 linear nothing
    // in nature reflects that way, and the surface renders as a dim mirror.
    // `Color` already stores the working (linear) value - `set('#c2c9c7')` runs
    // the sRGB transfer function on assignment - so do NOT convert again here.
    for (const [name, material] of standardMaterials) {
      if (material.metalness !== 1) continue;
      const { r, g, b } = material.color;
      expect((r + g + b) / 3, `${name} F0`).toBeGreaterThan(0.3);
    }
  });

  it('never pairs an albedo map with a tint - the double-hue trap', () => {
    for (const [name, material] of standardMaterials) {
      if (!material.map) continue;
      expect(material.color.getHexString(), `${name} tint over a map`).toBe('ffffff');
    }
  });
});

describe('machine ORM channel wiring', () => {
  it('drives aoMap and roughnessMap from the same ORM texture', () => {
    for (const [name, material] of standardMaterials) {
      if (!material.roughnessMap) continue;
      expect(material.aoMap, `${name} aoMap`).toBe(material.roughnessMap);
      expect(material.aoMapIntensity, `${name} aoMapIntensity`).toBeGreaterThan(0);
    }
  });

  it('never assigns a metalnessMap', () => {
    // generateMachineORM writes a constant 1 into B, so a metalnessMap is a
    // no-op on conductors (1 x 1) AND dielectrics (0 x 1) while still costing a
    // fetch and a shader permutation.
    for (const [name, material] of standardMaterials) {
      expect(material.metalnessMap, `${name} metalnessMap`).toBeNull();
    }
  });

  it('keeps final roughness inside a plausible band once the map multiplies', () => {
    for (const [name, material] of standardMaterials) {
      if (!material.roughnessMap) continue;
      const low = material.roughness * MACHINE_ORM_ROUGHNESS_RANGE.min;
      const high = material.roughness * MACHINE_ORM_ROUGHNESS_RANGE.max;
      const mean = material.roughness * MACHINE_ORM_MEAN_ROUGHNESS;
      expect(low, `${name} min roughness`).toBeGreaterThan(0.1);
      expect(high, `${name} max roughness`).toBeLessThanOrEqual(1);
      expect(mean, `${name} mean roughness`).toBeGreaterThan(0.15);
    }
  });

  it('bands every detail map off a clone, never off the shared generator output', () => {
    // `getTexture` hands the SAME instance to every caller with the same
    // parameters - two of these keys are also used by the factory shell - so
    // setting `repeat` on the source would re-tile the whole site.
    const sharedSources = new Set<THREE.Texture>([
      generateMachineORM(512, 'vertical', 96),
      generateMachineORM(512, 'horizontal', 128),
      generateMachinePanelNormal(512, 4, 7),
    ]);
    for (const source of sharedSources) {
      expect(source.repeat.x, 'shared source repeat').toBe(1);
      expect(source.repeat.y, 'shared source repeat').toBe(1);
    }
    for (const [name, material] of standardMaterials) {
      for (const [label, map] of [
        ['roughnessMap', material.roughnessMap],
        ['normalMap', material.normalMap],
      ] as const) {
        if (!map) continue;
        expect(sharedSources.has(map), `${name} ${label} uses the shared source`).toBe(false);
        expect(map.wrapS, `${name} ${label} wrapS`).toBe(THREE.RepeatWrapping);
        expect(map.colorSpace, `${name} ${label} colorSpace`).toBe(THREE.NoColorSpace);
        expect(map.repeat.x, `${name} ${label} repeatX`).toBeGreaterThan(0);
        expect(map.repeat.y, `${name} ${label} repeatY`).toBeGreaterThan(0);
      }
    }
  });

  it('applies normal maps at a scale that can actually be seen', () => {
    for (const [name, material] of standardMaterials) {
      if (!material.normalMap) continue;
      expect(material.normalScale.x, `${name} normalScale`).toBeGreaterThanOrEqual(0.5);
    }
  });
});

describe('ORM generator, measured rather than assumed', () => {
  it('matches the declared mean and range of the roughness (green) channel', () => {
    // Twelve materials are authored against MACHINE_ORM_MEAN_ROUGHNESS. If the
    // generator ever changes, that constant must move with it - so measure it
    // instead of trusting a hand-copied number.
    const orm = generateMachineORM(512, 'horizontal', 128);
    const data = orm.image.data as Uint8Array;
    let total = 0;
    let min = 255;
    let max = 0;
    let count = 0;
    for (let i = 1; i < data.length; i += 4) {
      const g = data[i];
      total += g;
      if (g < min) min = g;
      if (g > max) max = g;
      count += 1;
    }
    const mean = total / count / 255;
    expect(Math.abs(mean - MACHINE_ORM_MEAN_ROUGHNESS)).toBeLessThan(0.03);
    expect(min / 255).toBeGreaterThanOrEqual(MACHINE_ORM_ROUGHNESS_RANGE.min - 0.01);
    expect(max / 255).toBeLessThanOrEqual(MACHINE_ORM_ROUGHNESS_RANGE.max + 0.01);
    // The failure this whole file exists to prevent: a channel that is a
    // near-constant, so the "map" multiplies by a fixed number and does nothing.
    expect(max / 255 - min / 255).toBeGreaterThan(0.2);
  });
});

describe('grime datum', () => {
  it('measures dirt from the deck the parts stand on, not from world zero', () => {
    // The plansifters live on the elevated deck at y = 9. Measuring from zero
    // saturates the smoothstep and silently zeroes the grime term on the three
    // largest sifter surfaces.
    for (const name of ['sifter', 'sifterTray', 'platform'] as const) {
      expect(MACHINE_MATERIALS[name].userData.machineWear.deck, `${name} deck`).toBe(SIFTER_DECK_Y);
    }
    for (const name of ['mill', 'packer', 'silo', 'siloLeg'] as const) {
      expect(MACHINE_MATERIALS[name].userData.machineWear.deck, `${name} deck`).toBe(0);
    }
    // Every worn material must resolve a datum, or the uniform is undefined.
    for (const [name, material] of standardMaterials) {
      if (material.customProgramCacheKey() !== MACHINE_WEAR_CACHE_KEY) continue;
      const wear = material.userData.machineWear as { deck: number; grimeHeight: number };
      expect(Number.isFinite(wear.deck), `${name} deck`).toBe(true);
      expect(wear.grimeHeight, `${name} grimeHeight`).toBeGreaterThan(0);
    }
  });
});

describe('thin-plate geometry', () => {
  it('builds a valid single-segment rounded box with per-face 0-1 UVs', () => {
    // CompactMachines swaps 14 plate-shaped parts onto
    // `RoundedBoxGeometry(1, 1, 1, 1, 0.02)`. Every texel-density band assumes
    // UVs still run 0-1 per face, and this repo has a documented history of NaN
    // geometry from off-by-one constructor arguments.
    const plate = new RoundedBoxGeometry(1, 1, 1, 1, 0.02);
    const position = plate.getAttribute('position');
    const uv = plate.getAttribute('uv');
    expect(position.count).toBeGreaterThan(0);
    expect(uv.count).toBe(position.count);
    for (let i = 0; i < position.count; i += 1) {
      expect(Number.isFinite(position.getX(i))).toBe(true);
      expect(Number.isFinite(position.getY(i))).toBe(true);
      expect(Number.isFinite(position.getZ(i))).toBe(true);
      expect(uv.getX(i)).toBeGreaterThanOrEqual(0);
      expect(uv.getX(i)).toBeLessThanOrEqual(1);
      expect(uv.getY(i)).toBeGreaterThanOrEqual(0);
      expect(uv.getY(i)).toBeLessThanOrEqual(1);
    }
    plate.computeBoundingSphere();
    expect(Number.isFinite(plate.boundingSphere!.radius)).toBe(true);
    expect(plate.boundingSphere!.radius).toBeGreaterThan(0);
    plate.dispose();
  });
});

describe('shader cache keys', () => {
  it('returns a constant program cache key', () => {
    // CLAUDE.md: a key containing Date.now() recompiles the shader 60x a second.
    let worn = 0;
    for (const [name, material] of standardMaterials) {
      const first = material.customProgramCacheKey();
      const second = material.customProgramCacheKey();
      expect(second, `${name} cache key`).toBe(first);
      if (first === MACHINE_WEAR_CACHE_KEY) worn += 1;
    }
    expect(worn, 'materials carrying the wear shader').toBeGreaterThan(5);
  });

  it('injects byte-identical GLSL into every worn material', () => {
    const compile = (material: THREE.MeshStandardMaterial): string => {
      const shader = {
        uniforms: {},
        vertexShader: '#include <common>\n#include <project_vertex>',
        fragmentShader: '#include <common>\n#include <normal_fragment_maps>',
      };
      material.onBeforeCompile(
        shader as unknown as THREE.WebGLProgramParametersWithUniforms,
        null as unknown as THREE.WebGLRenderer
      );
      return `${shader.vertexShader}|${shader.fragmentShader}`;
    };
    const worn = standardMaterials.filter(
      ([, m]) => m.customProgramCacheKey?.() === MACHINE_WEAR_CACHE_KEY
    );
    expect(worn.length).toBeGreaterThan(5);
    const reference = compile(worn[0][1]);
    for (const [name, material] of worn) {
      expect(compile(material), `${name} injected source`).toBe(reference);
    }
    // The worldPosition it computes must not depend on three's guarded chunk.
    expect(reference).toContain('vMachineWorldPos = ( modelMatrix * machineWorld ).xyz;');
    expect(reference).not.toContain('worldPosition');
  });
});

describe('screen emissive gating', () => {
  it('only pushes emissive above 1.0 when the composer is mounted', () => {
    setMachineScreenGlow(false);
    expect(MACHINE_MATERIALS.screen.emissiveIntensity).toBeLessThanOrEqual(1);
    setMachineScreenGlow(true);
    expect(MACHINE_MATERIALS.screen.emissiveIntensity).toBeGreaterThan(1);
    setMachineScreenGlow(false);
  });
});

describe('per-instance tint', () => {
  it('is deterministic and stays subtle', () => {
    const a = machineInstanceTint(new THREE.Color(), 'SILO-01', 1);
    const b = machineInstanceTint(new THREE.Color(), 'SILO-01', 1);
    expect(a.getHex()).toBe(b.getHex());
    for (const id of ['SILO-01', 'RM-104', 'PLANSIFTER-C', 'PACKER-3']) {
      const tint = machineInstanceTint(new THREE.Color(), id, 1);
      for (const channel of [tint.r, tint.g, tint.b]) {
        expect(Math.abs(channel - 1)).toBeLessThan(0.06);
      }
    }
  });

  it('collapses to white when variation is disabled', () => {
    const tint = machineInstanceTint(new THREE.Color(), 'SILO-01', 0);
    expect(tint.r).toBe(1);
    expect(tint.g).toBe(1);
    expect(tint.b).toBe(1);
  });

  it('spreads ids across the hash range', () => {
    const values = ['a', 'b', 'c', 'SILO-01', 'SILO-02', 'SILO-03'].map((id) =>
      machineHash01(id, 17)
    );
    expect(new Set(values).size).toBe(values.length);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

const machine = (
  id: string,
  type: MachineType,
  position: [number, number, number]
): MachineData => ({
  id,
  name: id,
  type,
  position,
  size: [1, 1, 1],
  rotation: 0,
  status: 'running',
  metrics: { rpm: 0, temperature: 0, vibration: 0, load: 50, wear: 0, efficiency: 100 },
  lastMaintenance: '',
  nextMaintenance: '',
});

describe('machine decals', () => {
  const subsets = {
    silos: [machine('S1', MachineType.SILO, [0, 0, -22])],
    mills: [machine('M1', MachineType.ROLLER_MILL, [10, 0, -6])],
    sifters: [machine('P1', MachineType.PLANSIFTER, [-10, 9, 6])],
    packers: [machine('K1', MachineType.PACKER, [4, 0, 20])],
  };

  it('builds an atlas with a transparent gutter around every cell', () => {
    const atlas = getMachineDecalAtlas();
    expect(atlas.image.width).toBe(DECAL_ATLAS_SIZE.width);
    expect(atlas.image.height).toBe(DECAL_ATLAS_SIZE.height);
    expect(atlas.colorSpace).toBe(THREE.SRGBColorSpace);

    const data = atlas.image.data as Uint8Array;
    const cellPx = DECAL_ATLAS_SIZE.width / 4;
    for (let cell = 0; cell < DECAL_ATLAS_SIZE.cells; cell += 1) {
      const col = cell % 4;
      const row = Math.floor(cell / 4);
      // Gutter texel: must be fully transparent so mips do not bleed.
      const gx = col * cellPx + 1;
      const gy = row * cellPx + 1;
      expect(data[(gy * DECAL_ATLAS_SIZE.width + gx) * 4 + 3], `cell ${cell} gutter`).toBe(0);
      // Centre texel: must carry ink, or the cell painted nothing.
      const cx = col * cellPx + cellPx / 2;
      const cy = row * cellPx + cellPx / 2;
      expect(
        data[(cy * DECAL_ATLAS_SIZE.width + cx) * 4 + 3],
        `cell ${cell} centre`
      ).toBeGreaterThan(0);
    }
  });

  it('places every placard proud of its host face, on the +Z side', () => {
    const placements = planMachineDecals(subsets);
    expect(placements).toHaveLength(2 + 3 + 3 + 3);
    const hosts = [...subsets.silos, ...subsets.mills, ...subsets.sifters, ...subsets.packers];
    for (const placement of placements) {
      const host = hosts.find(
        (candidate) =>
          Math.abs(candidate.position[0] - placement.position[0]) < 4 &&
          Math.abs(candidate.position[2] - placement.position[2]) < 4
      );
      expect(host, `no host for decal at ${placement.position.join(',')}`).toBeDefined();
      // Facing +Z with no rotation means the quad must sit in front of its host.
      expect(placement.position[2] - host!.position[2]).toBeGreaterThan(0);
      expect(placement.size[0]).toBeGreaterThan(0);
      expect(placement.size[1]).toBeGreaterThan(0);
      expect(Object.values(DECAL_CELL)).toContain(placement.cell);
    }
  });

  it('writes one uv rect per placard and reuses the attribute when the count holds', () => {
    const placements = planMachineDecals(subsets);
    writeDecalUvRects(MACHINE_DECAL_GEOMETRY, placements);
    const first = MACHINE_DECAL_GEOMETRY.getAttribute('aDecalUvRect');
    expect(first.count).toBe(placements.length);
    writeDecalUvRects(MACHINE_DECAL_GEOMETRY, placements);
    expect(MACHINE_DECAL_GEOMETRY.getAttribute('aDecalUvRect')).toBe(first);

    // Every rect must land inside 0-1 and cover exactly one cell.
    for (let i = 0; i < first.count; i += 1) {
      expect(first.getX(i)).toBeGreaterThanOrEqual(0);
      expect(first.getY(i)).toBeGreaterThanOrEqual(0);
      expect(first.getX(i) + first.getZ(i)).toBeLessThanOrEqual(1);
      expect(first.getY(i) + first.getW(i)).toBeLessThanOrEqual(1);
    }
  });
});
