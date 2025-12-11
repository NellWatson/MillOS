/**
 * Frame Throttle Tests
 *
 * Tests for frame throttling utilities used in animation optimization.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  incrementGlobalFrame,
  shouldRunThisFrame,
  getGlobalFrameCount,
  getThrottleLevel,
} from '../frameThrottle';

describe('Frame Throttle', () => {
  beforeEach(() => {
    // Reset global frame count by incrementing until we wrap
    // (we can't directly set it, so we increment until it wraps to 0)
    while (getGlobalFrameCount() !== 0) {
      incrementGlobalFrame();
    }
  });

  describe('incrementGlobalFrame', () => {
    it('should increment frame count', () => {
      const initial = getGlobalFrameCount();
      incrementGlobalFrame();
      expect(getGlobalFrameCount()).toBe(initial + 1);
    });

    it('should wrap at 60 frames', () => {
      // Increment to 59
      for (let i = 0; i < 59; i++) {
        incrementGlobalFrame();
      }
      expect(getGlobalFrameCount()).toBe(59);

      // One more should wrap to 0
      incrementGlobalFrame();
      expect(getGlobalFrameCount()).toBe(0);
    });
  });

  describe('shouldRunThisFrame', () => {
    it('should return true every frame when throttle is 1', () => {
      for (let i = 0; i < 10; i++) {
        expect(shouldRunThisFrame(1)).toBe(true);
        incrementGlobalFrame();
      }
    });

    it('should return true every 2nd frame when throttle is 2', () => {
      const results: boolean[] = [];
      for (let i = 0; i < 10; i++) {
        results.push(shouldRunThisFrame(2));
        incrementGlobalFrame();
      }
      // Should be [true, false, true, false, ...]
      expect(results).toEqual([true, false, true, false, true, false, true, false, true, false]);
    });

    it('should return true every 3rd frame when throttle is 3', () => {
      const results: boolean[] = [];
      for (let i = 0; i < 9; i++) {
        results.push(shouldRunThisFrame(3));
        incrementGlobalFrame();
      }
      // Should be [true, false, false, true, false, false, ...]
      expect(results).toEqual([true, false, false, true, false, false, true, false, false]);
    });

    it('should return true every 4th frame when throttle is 4', () => {
      const results: boolean[] = [];
      for (let i = 0; i < 8; i++) {
        results.push(shouldRunThisFrame(4));
        incrementGlobalFrame();
      }
      // Should be [true, false, false, false, true, false, false, false]
      expect(results).toEqual([true, false, false, false, true, false, false, false]);
    });

    it('should default to throttle of 2 when not specified', () => {
      const results: boolean[] = [];
      for (let i = 0; i < 4; i++) {
        results.push(shouldRunThisFrame());
        incrementGlobalFrame();
      }
      expect(results).toEqual([true, false, true, false]);
    });
  });

  describe('getGlobalFrameCount', () => {
    it('should return current frame count', () => {
      const initial = getGlobalFrameCount();
      expect(typeof initial).toBe('number');
      expect(initial).toBeGreaterThanOrEqual(0);
      expect(initial).toBeLessThan(60);
    });

    it('should be consistent with increment', () => {
      const before = getGlobalFrameCount();
      incrementGlobalFrame();
      const after = getGlobalFrameCount();

      if (before === 59) {
        expect(after).toBe(0);
      } else {
        expect(after).toBe(before + 1);
      }
    });
  });

  describe('getThrottleLevel', () => {
    it('should return 4 for low quality', () => {
      expect(getThrottleLevel('low')).toBe(4);
    });

    it('should return 3 for medium quality', () => {
      expect(getThrottleLevel('medium')).toBe(3);
    });

    it('should return 2 for high quality', () => {
      expect(getThrottleLevel('high')).toBe(2);
    });

    it('should return 1 for ultra quality', () => {
      expect(getThrottleLevel('ultra')).toBe(1);
    });

    it('should return 2 as default for unknown quality', () => {
      expect(getThrottleLevel('unknown')).toBe(2);
      expect(getThrottleLevel('')).toBe(2);
      expect(getThrottleLevel('invalid')).toBe(2);
    });
  });

  describe('Frame Rate Calculation', () => {
    it('low quality should run at ~15 FPS (every 4th frame of 60)', () => {
      const throttle = getThrottleLevel('low');
      const effectiveFPS = 60 / throttle;
      expect(effectiveFPS).toBe(15);
    });

    it('medium quality should run at ~20 FPS (every 3rd frame of 60)', () => {
      const throttle = getThrottleLevel('medium');
      const effectiveFPS = 60 / throttle;
      expect(effectiveFPS).toBe(20);
    });

    it('high quality should run at ~30 FPS (every 2nd frame of 60)', () => {
      const throttle = getThrottleLevel('high');
      const effectiveFPS = 60 / throttle;
      expect(effectiveFPS).toBe(30);
    });

    it('ultra quality should run at ~60 FPS (every frame)', () => {
      const throttle = getThrottleLevel('ultra');
      const effectiveFPS = 60 / throttle;
      expect(effectiveFPS).toBe(60);
    });
  });

  describe('Throttle Pattern Consistency', () => {
    it('should produce consistent patterns over multiple cycles', () => {
      const throttle = 3;
      const pattern1: boolean[] = [];
      const pattern2: boolean[] = [];

      // Collect first cycle
      for (let i = 0; i < 60; i++) {
        pattern1.push(shouldRunThisFrame(throttle));
        incrementGlobalFrame();
      }

      // Now at frame 0 again, collect second cycle
      for (let i = 0; i < 60; i++) {
        pattern2.push(shouldRunThisFrame(throttle));
        incrementGlobalFrame();
      }

      // Patterns should be identical
      expect(pattern1).toEqual(pattern2);
    });

    it('should have correct number of true values per cycle', () => {
      const throttle = 4;
      let trueCount = 0;

      // One full cycle of 60 frames
      for (let i = 0; i < 60; i++) {
        if (shouldRunThisFrame(throttle)) {
          trueCount++;
        }
        incrementGlobalFrame();
      }

      // With throttle 4, we should have 60/4 = 15 true values
      expect(trueCount).toBe(15);
    });
  });

  describe('Integration Scenarios', () => {
    it('should work correctly for animation loops', () => {
      // Simulate animation loop with mixed throttle levels
      const lowThrottle = getThrottleLevel('low');
      const highThrottle = getThrottleLevel('high');

      let lowRunCount = 0;
      let highRunCount = 0;

      // Simulate 120 frames (2 seconds at 60fps)
      for (let i = 0; i < 120; i++) {
        if (shouldRunThisFrame(lowThrottle)) lowRunCount++;
        if (shouldRunThisFrame(highThrottle)) highRunCount++;
        incrementGlobalFrame();
      }

      // Low should run ~30 times (120 / 4)
      // High should run ~60 times (120 / 2)
      expect(lowRunCount).toBe(30);
      expect(highRunCount).toBe(60);
    });
  });
});
