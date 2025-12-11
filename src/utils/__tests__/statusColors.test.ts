/**
 * Status Colors Tests
 *
 * Tests for status color utility functions.
 */

import { describe, it, expect } from 'vitest';
import { getStatusColor, getForkliftWarningColor } from '../statusColors';

describe('Status Colors', () => {
  describe('getStatusColor', () => {
    it('should return green for running status', () => {
      expect(getStatusColor('running')).toBe('#22c55e');
    });

    it('should return yellow for idle status', () => {
      expect(getStatusColor('idle')).toBe('#eab308');
    });

    it('should return amber for maintenance status', () => {
      expect(getStatusColor('maintenance')).toBe('#f59e0b');
    });

    it('should return amber for warning status', () => {
      expect(getStatusColor('warning')).toBe('#f59e0b');
    });

    it('should return red for error status', () => {
      expect(getStatusColor('error')).toBe('#ef4444');
    });

    it('should return red for critical status', () => {
      expect(getStatusColor('critical')).toBe('#ef4444');
    });

    it('should return gray for unknown status', () => {
      expect(getStatusColor('unknown')).toBe('#6b7280');
      expect(getStatusColor('')).toBe('#6b7280');
      expect(getStatusColor('invalid')).toBe('#6b7280');
    });
  });

  describe('getForkliftWarningColor', () => {
    it('should return red when stopped', () => {
      expect(getForkliftWarningColor(true, false)).toBe('#ef4444');
      expect(getForkliftWarningColor(true, true)).toBe('#ef4444'); // Stopped takes priority
    });

    it('should return blue when in crossing (and not stopped)', () => {
      expect(getForkliftWarningColor(false, true)).toBe('#3b82f6');
    });

    it('should return amber when neither stopped nor in crossing', () => {
      expect(getForkliftWarningColor(false, false)).toBe('#f59e0b');
    });

    it('should prioritize stopped over crossing', () => {
      // When both stopped and in crossing, stopped takes priority
      expect(getForkliftWarningColor(true, true)).toBe('#ef4444');
    });
  });

  describe('Color Format', () => {
    it('all colors should be valid hex format', () => {
      const hexRegex = /^#[0-9a-f]{6}$/i;

      // Status colors
      expect(getStatusColor('running')).toMatch(hexRegex);
      expect(getStatusColor('idle')).toMatch(hexRegex);
      expect(getStatusColor('maintenance')).toMatch(hexRegex);
      expect(getStatusColor('warning')).toMatch(hexRegex);
      expect(getStatusColor('error')).toMatch(hexRegex);
      expect(getStatusColor('critical')).toMatch(hexRegex);
      expect(getStatusColor('unknown')).toMatch(hexRegex);

      // Forklift colors
      expect(getForkliftWarningColor(true, false)).toMatch(hexRegex);
      expect(getForkliftWarningColor(false, true)).toMatch(hexRegex);
      expect(getForkliftWarningColor(false, false)).toMatch(hexRegex);
    });
  });

  describe('Status Categories', () => {
    it('positive statuses should use green family', () => {
      const greenHex = getStatusColor('running');
      // Green typically has high G value
      expect(greenHex).toBe('#22c55e');
    });

    it('caution statuses should use yellow/amber family', () => {
      const idleColor = getStatusColor('idle');
      const maintenanceColor = getStatusColor('maintenance');
      const warningColor = getStatusColor('warning');

      // All should be warm colors (yellow/amber)
      expect(idleColor.startsWith('#e') || idleColor.startsWith('#f')).toBe(true);
      expect(maintenanceColor.startsWith('#f')).toBe(true);
      expect(warningColor.startsWith('#f')).toBe(true);
    });

    it('negative statuses should use red family', () => {
      const errorColor = getStatusColor('error');
      const criticalColor = getStatusColor('critical');

      // Both should be the same red
      expect(errorColor).toBe(criticalColor);
      expect(errorColor).toBe('#ef4444');
    });
  });
});
