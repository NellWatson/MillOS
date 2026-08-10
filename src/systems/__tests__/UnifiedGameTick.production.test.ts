import { describe, expect, it } from 'vitest';
import { calculateBagsProducedForTick } from '../UnifiedGameTick';

describe('UnifiedGameTick bag cadence', () => {
  it('emits small half-second increments at the default simulation speed', () => {
    const bags = calculateBagsProducedForTick(0.5, 0.8, 180, 3, 1);
    expect(bags).toBeCloseTo(14.4);
    expect(bags).toBeLessThan(20);
  });

  it('tracks packer availability and flow health', () => {
    expect(calculateBagsProducedForTick(0.5, 0.8, 180, 1, 0.5)).toBeCloseTo(2.4);
    expect(calculateBagsProducedForTick(0.5, 0.8, 180, 0, 1)).toBe(0);
  });

  it('rejects invalid values instead of contaminating the counter', () => {
    expect(calculateBagsProducedForTick(Number.NaN, 1, 180, 3, 1)).toBe(0);
    expect(calculateBagsProducedForTick(0.5, 1, 180, 3, Number.POSITIVE_INFINITY)).toBe(0);
  });
});
