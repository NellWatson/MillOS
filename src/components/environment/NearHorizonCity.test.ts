import { describe, expect, it } from 'vitest';
import { buildNearCitySpecs } from './NearHorizonCity';

describe('near horizon city layout', () => {
  it('is deterministic, finite, and outside the operational yard', () => {
    const first = buildNearCitySpecs();
    expect(buildNearCitySpecs()).toEqual(first);
    expect(first).toHaveLength(32);
    first.forEach((building) => {
      expect(Object.values(building).every(Number.isFinite)).toBe(true);
      expect(Math.hypot(building.x, building.z)).toBeGreaterThanOrEqual(225);
      expect(Math.hypot(building.x, building.z)).toBeLessThanOrEqual(240);
    });
  });

  it('stays clear of the authored castle footprint', () => {
    buildNearCitySpecs().forEach((building) => {
      expect(Math.hypot(building.x - 45, building.z + 200)).toBeGreaterThan(45);
    });
  });
});
