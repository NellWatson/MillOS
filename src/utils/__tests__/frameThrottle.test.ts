/**
 * Frame Throttle Tests
 *
 * Tests for frame throttling utilities used in animation optimization.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  getGlobalFrameCount,
  getThrottleLevel,
  incrementGlobalFrame,
  shouldRunThisFrame,
} from '../frameThrottle';

describe('Frame Throttle', () => {
  beforeEach(() => {
    // Bound setup so a regression in wrapping fails rather than hanging.
    for (let attempts = 0; attempts < 60 && getGlobalFrameCount() !== 0; attempts += 1) {
      incrementGlobalFrame();
    }
    expect(getGlobalFrameCount()).toBe(0);
  });

  it('increments and wraps at the exact 60-frame boundary', () => {
    incrementGlobalFrame();
    expect(getGlobalFrameCount()).toBe(1);

    for (let i = 1; i < 59; i++) {
      incrementGlobalFrame();
    }
    expect(getGlobalFrameCount()).toBe(59);

    incrementGlobalFrame();
    expect(getGlobalFrameCount()).toBe(0);
  });

  it.each([
    { throttle: 1, expected: [true, true, true, true] },
    { throttle: 2, expected: [true, false, true, false] },
    { throttle: 3, expected: [true, false, false, true, false, false] },
    { throttle: 4, expected: [true, false, false, false, true, false, false, false] },
  ])('runs the exact throttle $throttle sequence', ({ throttle, expected }) => {
    const actual = expected.map(() => {
      const shouldRun = shouldRunThisFrame(throttle);
      incrementGlobalFrame();
      return shouldRun;
    });

    expect(actual).toEqual(expected);
  });

  it('defaults to throttle 2 when no throttle is specified', () => {
    const actual = Array.from({ length: 4 }, () => {
      const shouldRun = shouldRunThisFrame();
      incrementGlobalFrame();
      return shouldRun;
    });

    expect(actual).toEqual([true, false, true, false]);
  });

  it.each([
    ['low', 4],
    ['medium', 3],
    ['high', 2],
    ['ultra', 1],
    ['unknown', 2],
    ['', 2],
    ['invalid', 2],
  ])('maps quality %j to throttle %i', (quality, expected) => {
    expect(getThrottleLevel(quality)).toBe(expected);
  });

  it('repeats the same throttle sequence after the frame counter wraps', () => {
    const collectCycle = () =>
      Array.from({ length: 60 }, () => {
        const shouldRun = shouldRunThisFrame(3);
        incrementGlobalFrame();
        return shouldRun;
      });

    expect(collectCycle()).toEqual(collectCycle());
  });
});
