import { describe, expect, it } from 'vitest';
import { rendererCounterPerFrame } from './RuntimeController';

describe('rendererCounterPerFrame', () => {
  it('normalizes cumulative composer counters to a per-frame value', () => {
    expect(rendererCounterPerFrame(12_160, 10, true)).toBe(1_216);
    expect(rendererCounterPerFrame(95, 10, true)).toBe(10);
  });

  it('preserves ordinary auto-reset counters', () => {
    expect(rendererCounterPerFrame(1_216, 600, false)).toBe(1_216);
  });

  it('handles empty and invalid samples defensively', () => {
    expect(rendererCounterPerFrame(12, 0, true)).toBe(12);
    expect(rendererCounterPerFrame(Number.NaN, 10, true)).toBe(0);
    expect(rendererCounterPerFrame(-1, 10, true)).toBe(0);
  });
});
