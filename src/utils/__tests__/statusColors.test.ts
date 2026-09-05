/**
 * Status Colors Tests
 *
 * Tests for status color utility functions.
 */

import { describe, it, expect } from 'vitest';
import { getStatusColor, getForkliftWarningColor } from '../statusColors';

describe('Status Colors', () => {
  describe('getStatusColor', () => {
    it.each([
      ['running', '#22c55e'],
      ['idle', '#eab308'],
      ['maintenance', '#f59e0b'],
      ['warning', '#f59e0b'],
      ['error', '#ef4444'],
      ['critical', '#ef4444'],
      ['unknown', '#6b7280'],
      ['', '#6b7280'],
      ['invalid', '#6b7280'],
    ])('maps %j to %s', (status, expected) => {
      expect(getStatusColor(status)).toBe(expected);
    });
  });

  describe('getForkliftWarningColor', () => {
    it.each([
      { isStopped: true, isInCrossing: false, expected: '#ef4444' },
      { isStopped: true, isInCrossing: true, expected: '#ef4444' },
      { isStopped: false, isInCrossing: true, expected: '#3b82f6' },
      { isStopped: false, isInCrossing: false, expected: '#f59e0b' },
    ])(
      'maps stopped=$isStopped and crossing=$isInCrossing to $expected',
      ({ isStopped, isInCrossing, expected }) => {
        expect(getForkliftWarningColor(isStopped, isInCrossing)).toBe(expected);
      }
    );
  });
});
