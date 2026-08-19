import { describe, expect, it } from 'vitest';
import { advanceBagPosition } from './ConveyorSystem';

describe('advanceBagPosition', () => {
  it('moves at belt speed and caps a resumed-frame delta', () => {
    expect(advanceBagPosition(0, 5, 1, 1)).toBeCloseTo(0.5);
  });

  it('preserves overflow when a bag wraps around the belt', () => {
    expect(advanceBagPosition(27.9, 5, 1, 0.1)).toBeCloseTo(-27.6);
  });

  it('does not reverse while production is stopped', () => {
    expect(advanceBagPosition(4, 5, -1, 0.1)).toBe(4);
  });
});
