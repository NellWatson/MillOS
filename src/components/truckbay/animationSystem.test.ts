import { describe, expect, it } from 'vitest';
import { getAnimationDampingAlpha } from './animationSystem';

const dampForOneSecond = (framesPerSecond: number, perFrameAlpha: number): number => {
  let value = 0;
  for (let frame = 0; frame < framesPerSecond; frame += 1) {
    const alpha = getAnimationDampingAlpha(perFrameAlpha, 1 / framesPerSecond);
    value += (1 - value) * alpha;
  }
  return value;
};

describe('truck bay animation damping', () => {
  it('converges identically at 30, 60 and 120 fps', () => {
    const at30 = dampForOneSecond(30, 0.1);
    const at60 = dampForOneSecond(60, 0.1);
    const at120 = dampForOneSecond(120, 0.1);
    expect(at30).toBeCloseTo(at60, 12);
    expect(at120).toBeCloseTo(at60, 12);
  });

  it('guards invalid deltas and clamps authored fractions', () => {
    expect(getAnimationDampingAlpha(0.1, 0)).toBe(0);
    expect(getAnimationDampingAlpha(2, 1 / 60)).toBe(1);
    expect(getAnimationDampingAlpha(-1, 1 / 60)).toBe(0);
  });
});
