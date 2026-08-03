import { describe, expect, it } from 'vitest';
import { calculateOutdoorAmbientMix } from './audioManager';

describe('calculateOutdoorAmbientMix', () => {
  it('occludes the exterior soundscape inside the factory', () => {
    const inside = calculateOutdoorAmbientMix({ x: 0, z: 0 }, 'day', 'clear');
    const outside = calculateOutdoorAmbientMix({ x: -190, z: 0 }, 'day', 'clear');
    expect(inside.birds).toBeLessThan(outside.birds);
    expect(inside.wind).toBeLessThan(outside.wind);
  });

  it('locates water and farm animals in their authored world areas', () => {
    const village = calculateOutdoorAmbientMix({ x: -190, z: 0 }, 'day', 'clear');
    const farm = calculateOutdoorAmbientMix({ x: 75, z: 120 }, 'day', 'clear');
    expect(village.water).toBeGreaterThan(0);
    expect(village.ducks).toBeGreaterThan(0);
    expect(farm.pigs).toBeGreaterThan(0);
    expect(farm.cows).toBeGreaterThan(0);
  });

  it('suppresses wildlife and strengthens weather layers in a storm', () => {
    const clear = calculateOutdoorAmbientMix({ x: 75, z: 120 }, 'day', 'clear');
    const storm = calculateOutdoorAmbientMix({ x: 75, z: 120 }, 'day', 'storm');
    expect(storm.birds).toBe(0);
    expect(storm.pigs).toBeLessThan(clear.pigs);
    expect(storm.wind).toBeGreaterThan(clear.wind);
    expect(storm.water).toBeGreaterThan(clear.water);
  });
});
