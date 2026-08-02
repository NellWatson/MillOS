import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  FIXTURE_GRID_X,
  FIXTURE_GRID_Z,
  REDUCED_ZONE_LIGHT_POSITIONS,
  ZONE_LIGHT_DISTANCE,
  ZONE_LIGHT_HEIGHT,
  ZONE_LIGHT_INTENSITY,
  ZONE_LIGHT_POSITIONS,
  createLightPoolTexture,
  floorPoolPositions,
  zoneLightPositions,
} from './InteriorLightRig';
import { SITE_LAYOUT } from '../../constants/siteLayout';
import { sampleAtmosphere, sampleCelestial } from '../../simulation/atmosphere';

/** Three's `getDistanceAttenuation` for `decay` 2 with a cutoff distance. */
function pointLightIrradiance(intensity: number, distance: number, cutoff: number): number {
  const falloff = intensity / Math.max(distance * distance, 0.01);
  const window = Math.pow(Math.max(0, Math.min(1, 1 - Math.pow(distance / cutoff, 4))), 2);
  return falloff * window;
}

describe('zone lights', () => {
  it('places one light per production zone and no more', () => {
    // Four is a hard ceiling, not a starting point: three's forward renderer
    // puts every point light in every lit material's uniform block with no
    // per-object culling, so each one is fragment cost on the exterior cameras
    // too, where they contribute nothing.
    expect(ZONE_LIGHT_POSITIONS).toHaveLength(4);
    const zones = Object.values(SITE_LAYOUT.factory.zones);
    expect(ZONE_LIGHT_POSITIONS.map((position) => position[2]).sort((a, b) => a - b)).toEqual(
      [...zones].sort((a, b) => a - b)
    );
    for (const position of ZONE_LIGHT_POSITIONS) {
      expect(position[0]).toBe(0);
      expect(position[1]).toBe(ZONE_LIGHT_HEIGHT);
    }
  });

  it('lands a readable pool on the floor without a hotspot', () => {
    const floorDrop = ZONE_LIGHT_HEIGHT - SITE_LAYOUT.datum.interiorFloor;
    const irradiance = pointLightIrradiance(ZONE_LIGHT_INTENSITY, floorDrop, ZONE_LIGHT_DISTANCE);
    const ambient = sampleCelestial(sampleAtmosphere(0, 12, 'clear')).ambientLightIntensity;

    expect(irradiance).toBeGreaterThan(ambient * 3);
    expect(irradiance).toBeLessThan(ambient * 6);
    // Below the direct sun, so an interior lit only by fixtures never reads
    // brighter than the yard outside the door.
    expect(irradiance).toBeLessThan(
      sampleCelestial(sampleAtmosphere(0, 12, 'clear')).sunLightIntensity
    );
  });

  it('reaches zero at the cutoff instead of clipping to a visible edge', () => {
    expect(
      pointLightIrradiance(ZONE_LIGHT_INTENSITY, ZONE_LIGHT_DISTANCE, ZONE_LIGHT_DISTANCE)
    ).toBe(0);
    const nearCutoff = pointLightIrradiance(
      ZONE_LIGHT_INTENSITY,
      ZONE_LIGHT_DISTANCE * 0.95,
      ZONE_LIGHT_DISTANCE
    );
    expect(nearCutoff).toBeGreaterThan(0);
    expect(nearCutoff).toBeLessThan(0.05);
  });
});

/** Floor irradiance on the hall centre line from a set of zone lights. */
function centreLineIrradiance(
  lights: readonly (readonly [number, number, number])[],
  z: number
): number {
  return lights.reduce(
    (total, light) =>
      total +
      pointLightIrradiance(
        ZONE_LIGHT_INTENSITY,
        Math.hypot(ZONE_LIGHT_HEIGHT, z - light[2]),
        ZONE_LIGHT_DISTANCE
      ),
    0
  );
}

describe('zone light count by quality tier', () => {
  it('keeps all four above medium and halves them at or below', () => {
    // The count is a program define (`NUM_POINT_LIGHTS`), so it can only move
    // when something that already rebuilds programs moves. The tier is that
    // thing; a per-frame or per-camera toggle is not.
    expect(zoneLightPositions('ultra')).toBe(ZONE_LIGHT_POSITIONS);
    expect(zoneLightPositions('high')).toBe(ZONE_LIGHT_POSITIONS);
    expect(zoneLightPositions('medium')).toBe(REDUCED_ZONE_LIGHT_POSITIONS);
    expect(zoneLightPositions('low')).toBe(REDUCED_ZONE_LIGHT_POSITIONS);
    expect(REDUCED_ZONE_LIGHT_POSITIONS).toHaveLength(2);
  });

  it('puts each surviving light between the pair of zones it now serves', () => {
    const zones = SITE_LAYOUT.factory.zones;
    expect(REDUCED_ZONE_LIGHT_POSITIONS.map((position) => position[2])).toEqual([
      (zones.silos + zones.milling) / 2,
      (zones.sifting + zones.packing) / 2,
    ]);
    for (const position of REDUCED_ZONE_LIGHT_POSITIONS) {
      expect(position[0]).toBe(0);
      expect(position[1]).toBe(ZONE_LIGHT_HEIGHT);
    }
  });

  it('keeps intensity and cutoff untouched, so the trade is only the count', () => {
    // Deliberately not retuned. A brighter pair would sit against the hotspot
    // cap the irradiance test above asserts, and the outcome of a retune is not
    // something the arithmetic here can check.
    const full = pointLightIrradiance(ZONE_LIGHT_INTENSITY, ZONE_LIGHT_HEIGHT, ZONE_LIGHT_DISTANCE);
    expect(centreLineIrradiance(REDUCED_ZONE_LIGHT_POSITIONS, -14)).toBeGreaterThan(full * 0.8);
  });

  it('dims the hall by about half without opening a hole in it', () => {
    const zones = Object.values(SITE_LAYOUT.factory.zones);
    for (const z of zones) {
      const ratio =
        centreLineIrradiance(REDUCED_ZONE_LIGHT_POSITIONS, z) /
        centreLineIrradiance(ZONE_LIGHT_POSITIONS, z);
      // This IS the fidelity trade, stated as a number: `low` and `medium` get
      // roughly half the fixture light at every zone centre.
      expect(ratio).toBeGreaterThan(0.45);
      expect(ratio).toBeLessThan(0.8);
    }

    // And the gap between the two survivors is not the dark spot - it is
    // brighter than the dimmest zone centre, because both lights reach it.
    const midpoint = (REDUCED_ZONE_LIGHT_POSITIONS[0][2] + REDUCED_ZONE_LIGHT_POSITIONS[1][2]) / 2;
    const dimmestZone = Math.min(
      ...zones.map((z) => centreLineIrradiance(REDUCED_ZONE_LIGHT_POSITIONS, z))
    );
    expect(centreLineIrradiance(REDUCED_ZONE_LIGHT_POSITIONS, midpoint)).toBeGreaterThan(
      dimmestZone
    );

    // Still well clear of the ambient term everywhere the machinery is, which
    // is what stops the reduced tier reading as an unlit shed.
    const ambient = sampleCelestial(sampleAtmosphere(0, 12, 'clear')).ambientLightIntensity;
    for (const z of zones) {
      expect(centreLineIrradiance(REDUCED_ZONE_LIGHT_POSITIONS, z)).toBeGreaterThan(ambient * 2);
    }
  });
});

describe('floor pools', () => {
  it('covers every ceiling fixture, including the rows no zone light reaches', () => {
    const positions = floorPoolPositions();
    expect(positions).toHaveLength(FIXTURE_GRID_X.length * FIXTURE_GRID_Z.length);
    expect(positions).toHaveLength(15);

    // The outer x rows are past the cutoff of a light hanging on the centre
    // line, which is exactly why the pools exist as well as the lights.
    const outer = positions.filter(([x]) => Math.abs(x) === 42);
    expect(outer.length).toBeGreaterThan(0);
    // On BOTH tiers: moving to two lights shifts them along z, so the outer
    // rows have to still be past the cutoff or the premise changes.
    for (const lights of [ZONE_LIGHT_POSITIONS, REDUCED_ZONE_LIGHT_POSITIONS]) {
      for (const [x, z] of outer) {
        const nearest = Math.min(
          ...lights.map((light) => Math.hypot(x - light[0], ZONE_LIGHT_HEIGHT, z - light[2]))
        );
        expect(nearest).toBeGreaterThan(ZONE_LIGHT_DISTANCE);
      }
    }
  });

  it('keeps every pool inside the building footprint', () => {
    const bounds = SITE_LAYOUT.factory.bounds;
    for (const [x, z] of floorPoolPositions()) {
      expect(x).toBeGreaterThan(bounds.minX);
      expect(x).toBeLessThan(bounds.maxX);
      expect(z).toBeGreaterThan(bounds.minZ);
      expect(z).toBeLessThan(bounds.maxZ);
    }
  });
});

describe('createLightPoolTexture', () => {
  it('falls off to nothing at the edge so the quad has no visible border', () => {
    const texture = createLightPoolTexture();
    const width = texture.image.width;
    const height = texture.image.height;
    const data = texture.image.data as Uint8Array;
    const alphaAt = (x: number, y: number): number => data[(y * width + x) * 4 + 3];

    expect(alphaAt(0, 0)).toBe(0);
    expect(alphaAt(width - 1, height - 1)).toBe(0);
    expect(alphaAt(width >> 1, height >> 1)).toBeGreaterThan(200);
    texture.dispose();
  });

  it('reaches further along the fixture than across it', () => {
    const texture = createLightPoolTexture();
    const width = texture.image.width;
    const height = texture.image.height;
    const data = texture.image.data as Uint8Array;
    const alphaAt = (x: number, y: number): number => data[(y * width + x) * 4 + 3];

    // Same fractional distance from centre: 30% along U versus 30% along V.
    const along = alphaAt(Math.round(width * 0.8), height >> 1);
    const across = alphaAt(width >> 1, Math.round(height * 0.8));
    expect(along).toBeGreaterThan(across);
    texture.dispose();
  });

  it('is an opaque white tint carrying its shape in alpha, for additive blending', () => {
    const texture = createLightPoolTexture();
    const data = texture.image.data as Uint8Array;
    for (let index = 0; index < data.length; index += 4) {
      expect(data[index]).toBe(255);
      expect(data[index + 1]).toBe(255);
      expect(data[index + 2]).toBe(255);
    }
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(texture.generateMipmaps).toBe(false);
    texture.dispose();
  });
});
