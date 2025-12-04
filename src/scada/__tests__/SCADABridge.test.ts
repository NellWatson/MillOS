/**
 * Unit Tests for SCADABridge
 */

import { describe, it, expect } from 'vitest';
import {
  temperatureToColor,
  vibrationToColor,
  levelToColor,
  calculateMachineVisuals,
  scadaToStoreMetrics,
  getAlarmVisualConfig,
} from '../SCADABridge';
import { TagValue, Alarm } from '../types';

describe('SCADABridge', () => {
  describe('temperatureToColor', () => {
    it('should return blue for cold temperatures', () => {
      expect(temperatureToColor(15)).toBe('#3b82f6');
      expect(temperatureToColor(20)).toBe('#3b82f6');
    });

    it('should return green for normal temperatures', () => {
      const color = temperatureToColor(35);
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('should return yellow/orange for warm temperatures', () => {
      const color = temperatureToColor(60);
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('should return red for hot temperatures', () => {
      const color = temperatureToColor(85);
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('should respect custom thresholds', () => {
      const color = temperatureToColor(30, 10, 30, 50);
      expect(color).not.toBe('#3b82f6'); // Should not be cold blue
    });
  });

  describe('vibrationToColor', () => {
    it('should return green for low vibration', () => {
      expect(vibrationToColor(1)).toBe('#22c55e');
      expect(vibrationToColor(2.5)).toBe('#22c55e');
    });

    it('should return warning colors for medium vibration', () => {
      const color = vibrationToColor(4);
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('should return red for critical vibration', () => {
      expect(vibrationToColor(10)).toBe('#ef4444');
    });
  });

  describe('levelToColor', () => {
    it('should return red for critical low levels', () => {
      expect(levelToColor(3)).toBe('#ef4444');
    });

    it('should return orange for warning low levels', () => {
      expect(levelToColor(10)).toBe('#f59e0b');
    });

    it('should return green for normal levels', () => {
      expect(levelToColor(50)).toBe('#22c55e');
    });

    it('should return yellow for warning high levels', () => {
      expect(levelToColor(90)).toBe('#eab308');
    });

    it('should return red for critical high levels', () => {
      expect(levelToColor(98)).toBe('#ef4444');
    });
  });

  describe('calculateMachineVisuals', () => {
    const createTagValue = (tagId: string, value: number): TagValue => ({
      tagId,
      value,
      quality: 'GOOD',
      timestamp: Date.now(),
    });

    it('should return default properties for unknown machine', () => {
      const values = new Map<string, TagValue>();
      const alarms: Alarm[] = [];

      const visuals = calculateMachineVisuals('unknown-machine', values, alarms);

      expect(visuals.derivedStatus).toBe('running');
      expect(visuals.statusColor).toBe('#22c55e');
      expect(visuals.rpmMultiplier).toBe(1);
    });

    it('should calculate temperature color from SCADA values', () => {
      const values = new Map<string, TagValue>();
      values.set('RM101.TT001.PV', createTagValue('RM101.TT001.PV', 70));

      const visuals = calculateMachineVisuals('rm-101', values, []);

      expect(visuals.tagValues.temperature).toBe(70);
      expect(visuals.temperatureColor).toMatch(/^#[0-9a-f]{6}$/);
      expect(visuals.temperatureGlow).toBeGreaterThan(0);
    });

    it('should calculate vibration intensity from SCADA values', () => {
      const values = new Map<string, TagValue>();
      values.set('RM101.VT001.PV', createTagValue('RM101.VT001.PV', 4.0));

      const visuals = calculateMachineVisuals('rm-101', values, []);

      expect(visuals.tagValues.vibration).toBe(4.0);
      expect(visuals.vibrationIntensity).toBeGreaterThan(1);
    });

    it('should calculate RPM multiplier from SCADA values', () => {
      const values = new Map<string, TagValue>();
      values.set('RM101.ST001.PV', createTagValue('RM101.ST001.PV', 1000));

      const visuals = calculateMachineVisuals('rm-101', values, []);

      expect(visuals.tagValues.rpm).toBe(1000);
      expect(visuals.rpmMultiplier).toBeGreaterThan(0);
      expect(visuals.rpmMultiplier).toBeLessThanOrEqual(1);
    });

    it('should detect active alarms', () => {
      const values = new Map<string, TagValue>();
      const alarms: Alarm[] = [
        {
          id: 'alarm-1',
          tagId: 'RM101.TT001.PV',
          tagName: 'RM101 Temperature',
          type: 'HIHI',
          state: 'UNACK',
          priority: 'CRITICAL',
          value: 85,
          threshold: 80,
          timestamp: Date.now(),
          machineId: 'rm-101',
        },
      ];

      const visuals = calculateMachineVisuals('rm-101', values, alarms);

      expect(visuals.hasActiveAlarm).toBe(true);
      expect(visuals.alarmPriority).toBe('CRITICAL');
      expect(visuals.derivedStatus).toBe('critical');
      expect(visuals.alarmPulseSpeed).toBe(4);
    });

    it('should calculate fill level for silos', () => {
      const values = new Map<string, TagValue>();
      values.set('SILO_ALPHA.LT001.PV', createTagValue('SILO_ALPHA.LT001.PV', 75));

      const visuals = calculateMachineVisuals('silo-0', values, []);

      expect(visuals.fillLevel).toBe(75);
      expect(visuals.fillColor).toBe('#22c55e');
    });
  });

  describe('scadaToStoreMetrics', () => {
    const createTagValue = (tagId: string, value: number): TagValue => ({
      tagId,
      value,
      quality: 'GOOD',
      timestamp: Date.now(),
    });

    it('should return null for unknown machine', () => {
      const values = new Map<string, TagValue>();
      const result = scadaToStoreMetrics('unknown-machine', values, []);
      expect(result).toBeNull();
    });

    it('should extract metrics from SCADA values', () => {
      const values = new Map<string, TagValue>();
      values.set('RM101.TT001.PV', createTagValue('RM101.TT001.PV', 55));
      values.set('RM101.VT001.PV', createTagValue('RM101.VT001.PV', 2.5));
      values.set('RM101.ST001.PV', createTagValue('RM101.ST001.PV', 1400));

      const result = scadaToStoreMetrics('rm-101', values, []);

      expect(result).not.toBeNull();
      expect(result!.machineId).toBe('rm-101');
      expect(result!.metrics.temperature).toBe(55);
      expect(result!.metrics.vibration).toBe(2.5);
      expect(result!.metrics.rpm).toBe(1400);
    });

    it('should derive status from alarms', () => {
      const values = new Map<string, TagValue>();
      const alarms: Alarm[] = [
        {
          id: 'alarm-1',
          tagId: 'RM101.TT001.PV',
          tagName: 'RM101 Temperature',
          type: 'HIHI',
          state: 'UNACK',
          priority: 'CRITICAL',
          value: 85,
          threshold: 80,
          timestamp: Date.now(),
          machineId: 'rm-101',
        },
      ];

      const result = scadaToStoreMetrics('rm-101', values, alarms);

      expect(result!.status).toBe('critical');
    });
  });

  describe('getAlarmVisualConfig', () => {
    it('should return correct config for CRITICAL alarms', () => {
      const config = getAlarmVisualConfig('CRITICAL', 'UNACK');

      expect(config.color).toBe('#ef4444');
      expect(config.pulseSpeed).toBe(4);
      expect(config.icon).toBe('alert-octagon');
      expect(config.size).toBe(1.2);
      expect(config.opacity).toBe(1);
    });

    it('should return correct config for HIGH alarms', () => {
      const config = getAlarmVisualConfig('HIGH', 'UNACK');

      expect(config.color).toBe('#f97316');
      expect(config.pulseSpeed).toBe(2.5);
      expect(config.icon).toBe('alert-triangle');
    });

    it('should not pulse for acknowledged alarms', () => {
      const config = getAlarmVisualConfig('CRITICAL', 'ACKED');

      expect(config.pulseSpeed).toBe(0);
      expect(config.opacity).toBe(1);
    });

    it('should pulse for return-to-normal unacknowledged', () => {
      const config = getAlarmVisualConfig('HIGH', 'RTN_UNACK');

      expect(config.pulseSpeed).toBe(2.5);
      expect(config.opacity).toBe(0.5);
    });

    it('should reduce opacity for normal state alarms', () => {
      const config = getAlarmVisualConfig('MEDIUM', 'NORMAL');

      expect(config.pulseSpeed).toBe(0);
      expect(config.opacity).toBe(0.5);
    });
  });
});
