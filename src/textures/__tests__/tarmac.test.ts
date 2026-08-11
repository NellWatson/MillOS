import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { generateTarmac, generateTarmacRoughness } from '../tarmac';

const meanRgb = (data: Uint8Array): [number, number, number] => {
  let red = 0;
  let green = 0;
  let blue = 0;
  const pixels = data.length / 4;
  for (let offset = 0; offset < data.length; offset += 4) {
    red += data[offset];
    green += data[offset + 1];
    blue += data[offset + 2];
  }
  return [red / pixels, green / pixels, blue / pixels];
};

describe('procedural tarmac', () => {
  it('declares colour space and retains visible weathered-asphalt albedo', () => {
    const texture = generateTarmac(64, { oilStains: false });
    const mean = meanRgb(texture.image.data as Uint8Array);

    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(mean[0]).toBeGreaterThan(96);
    expect(mean[0]).toBeLessThan(140);
    expect(mean[1]).toBeGreaterThanOrEqual(mean[0]);
    expect(mean[2]).toBeGreaterThan(mean[1]);
  });

  it('keeps roughness data linear and writes every sampled channel', () => {
    const texture = generateTarmacRoughness(32);
    const data = texture.image.data as Uint8Array;

    expect(texture.colorSpace).toBe(THREE.NoColorSpace);
    for (let offset = 0; offset < data.length; offset += 4) {
      expect(data[offset + 1]).toBe(data[offset]);
      expect(data[offset + 2]).toBe(data[offset]);
    }
  });
});
