import { describe, expect, it } from 'vitest';
import { getExteriorLampLevel } from './ExteriorLighting';

describe('exterior lamp schedule', () => {
  it('is fully lit at night and off at clear noon', () => {
    expect(getExteriorLampLevel(23, 'clear')).toBe(1);
    expect(getExteriorLampLevel(12, 'clear')).toBe(0);
  });

  it('fades smoothly at dawn and dusk', () => {
    expect(getExteriorLampLevel(6, 'clear')).toBeCloseTo(0.5);
    expect(getExteriorLampLevel(18, 'clear')).toBeCloseTo(0.5);
  });

  it('raises a daytime minimum in severe weather', () => {
    expect(getExteriorLampLevel(12, 'storm')).toBe(0.7);
  });
});
