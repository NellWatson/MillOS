import { describe, expect, it } from 'vitest';

import {
  createAnimalWanderPlan,
  getAnimalActivityMultiplier,
  getCulvertWaterHeight,
  getWindmillAngularSpeed,
  sampleAmbientSequence,
} from '../ambientWorld';

describe('ambient world simulation', () => {
  it('generates deterministic, bounded animal movement plans', () => {
    const bounds = { minX: 9, maxX: 15, minZ: -8, maxZ: -2 };
    const first = createAnimalWanderPlan(101, 4, bounds);

    expect(createAnimalWanderPlan(101, 4, bounds)).toEqual(first);
    expect(first.x).toBeGreaterThanOrEqual(bounds.minX);
    expect(first.x).toBeLessThanOrEqual(bounds.maxX);
    expect(first.z).toBeGreaterThanOrEqual(bounds.minZ);
    expect(first.z).toBeLessThanOrEqual(bounds.maxZ);
    expect(first.idleSeconds).toBeGreaterThanOrEqual(2);
    expect(first.idleSeconds).toBeLessThanOrEqual(6);
    expect(createAnimalWanderPlan(101, 5, bounds)).not.toEqual(first);
  });

  it('keeps scalar sequence samples inside the unit interval', () => {
    for (let step = 0; step < 100; step += 1) {
      expect(sampleAmbientSequence(73, step)).toBeGreaterThanOrEqual(0);
      expect(sampleAmbientSequence(73, step)).toBeLessThan(1);
    }
  });

  it('reduces roaming at night and in precipitation', () => {
    expect(getAnimalActivityMultiplier('clear', 12)).toBe(1);
    expect(getAnimalActivityMultiplier('rain', 12)).toBe(0.55);
    expect(getAnimalActivityMultiplier('storm', 12)).toBe(0.2);
    expect(getAnimalActivityMultiplier('clear', 23)).toBe(0.25);
    expect(getAnimalActivityMultiplier('storm', 23)).toBeCloseTo(0.05);
    expect(getAnimalActivityMultiplier('cloudy', -1)).toBe(0.25);
  });

  it('maps wind and rainfall to finite mechanical and drainage responses', () => {
    expect(getWindmillAngularSpeed(0.2)).toBeCloseTo(0.5);
    expect(getWindmillAngularSpeed(0.92)).toBeCloseTo(1.22);
    expect(getWindmillAngularSpeed(5)).toBe(1.3);

    const dry = getCulvertWaterHeight(0.6, 0, 0);
    const damp = getCulvertWaterHeight(0.6, 0.82, 0.62);
    const storm = getCulvertWaterHeight(0.6, 1, 1);
    expect(dry).toBeCloseTo(-0.312);
    expect(damp).toBeGreaterThan(dry);
    expect(storm).toBeGreaterThan(damp);
    expect(storm).toBeCloseTo(-0.108);
  });
});
