/**
 * Unit Tests for SimulationAdapter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SimulationAdapter } from '../adapters/SimulationAdapter';
import { TagDefinition } from '../types';

// Sample tag definitions for testing
const sampleTags: TagDefinition[] = [
  {
    id: 'TEST.TT001.PV',
    name: 'Test Temperature',
    description: 'Test temperature sensor',
    dataType: 'FLOAT32',
    accessMode: 'READ',
    engUnit: 'C',
    engLow: 0,
    engHigh: 100,
    machineId: 'test-1',
    group: 'TEMPERATURE',
    alarmHi: 80,
    alarmHiHi: 90,
    simulation: {
      baseValue: 45,
      noiseAmplitude: 2,
      driftRate: 0,
      statusDependent: true,
    },
  },
  {
    id: 'TEST.ST001.PV',
    name: 'Test Speed',
    description: 'Test speed sensor',
    dataType: 'FLOAT32',
    accessMode: 'READ',
    engUnit: 'RPM',
    engLow: 0,
    engHigh: 2000,
    machineId: 'test-1',
    group: 'SPEED',
    simulation: {
      baseValue: 1200,
      noiseAmplitude: 50,
      driftRate: 0,
      loadFactor: true,
    },
  },
  {
    id: 'TEST.SP001.SP',
    name: 'Test Setpoint',
    description: 'Test speed setpoint',
    dataType: 'FLOAT32',
    accessMode: 'READ_WRITE',
    engUnit: 'RPM',
    engLow: 0,
    engHigh: 2000,
    machineId: 'test-1',
    group: 'SETPOINT',
    simulation: {
      baseValue: 1500,
      noiseAmplitude: 0,
      driftRate: 0,
    },
  },
];

describe('SimulationAdapter', () => {
  let adapter: SimulationAdapter;

  beforeEach(() => {
    vi.useFakeTimers();
    adapter = new SimulationAdapter(sampleTags);
  });

  afterEach(async () => {
    await adapter.disconnect();
    vi.useRealTimers();
  });

  describe('Lifecycle', () => {
    it('should start disconnected', () => {
      expect(adapter.isConnected()).toBe(false);
    });

    it('should connect successfully', async () => {
      await adapter.connect();
      expect(adapter.isConnected()).toBe(true);
    });

    it('should disconnect successfully', async () => {
      await adapter.connect();
      await adapter.disconnect();
      expect(adapter.isConnected()).toBe(false);
    });

    it('should handle multiple connect calls gracefully', async () => {
      await adapter.connect();
      await adapter.connect();
      expect(adapter.isConnected()).toBe(true);
    });
  });

  describe('Read Operations', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should read a single tag', async () => {
      const value = await adapter.readTag('TEST.TT001.PV');
      expect(value.tagId).toBe('TEST.TT001.PV');
      expect(value.quality).toBe('GOOD');
      expect(typeof value.value).toBe('number');
    });

    it('should throw for unknown tag', async () => {
      await expect(adapter.readTag('UNKNOWN.TAG')).rejects.toThrow('Tag not found');
    });

    it('should read multiple tags', async () => {
      const values = await adapter.readTags(['TEST.TT001.PV', 'TEST.ST001.PV']);
      expect(values).toHaveLength(2);
      expect(values[0].tagId).toBe('TEST.TT001.PV');
      expect(values[1].tagId).toBe('TEST.ST001.PV');
    });

    it('should read all tags', async () => {
      const values = await adapter.readAllTags();
      expect(values.length).toBe(sampleTags.length);
    });
  });

  describe('Write Operations', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should write to a writable tag', async () => {
      const success = await adapter.writeTag('TEST.SP001.SP', 1800);
      expect(success).toBe(true);

      const value = await adapter.readTag('TEST.SP001.SP');
      expect(value.value).toBe(1800);
    });

    it('should reject writes to read-only tags', async () => {
      const success = await adapter.writeTag('TEST.TT001.PV', 100);
      expect(success).toBe(false);
    });

    it('should reject writes to unknown tags', async () => {
      const success = await adapter.writeTag('UNKNOWN.TAG', 100);
      expect(success).toBe(false);
    });
  });

  describe('Subscriptions', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should notify subscribers on value updates', async () => {
      const callback = vi.fn();
      const unsubscribe = adapter.subscribe(['TEST.TT001.PV'], callback);

      // Advance fake timers past simulation tick interval (1000ms)
      await vi.advanceTimersByTimeAsync(1100);

      expect(callback).toHaveBeenCalled();
      unsubscribe();
    });

    it('should stop notifying after unsubscribe', async () => {
      const callback = vi.fn();
      const unsubscribe = adapter.subscribe(['TEST.TT001.PV'], callback);

      // Advance to trigger first tick
      await vi.advanceTimersByTimeAsync(1100);
      const callCount = callback.mock.calls.length;

      unsubscribe();

      // Advance to trigger another tick
      await vi.advanceTimersByTimeAsync(1100);

      // Should not have received significantly more calls
      expect(callback.mock.calls.length).toBeLessThanOrEqual(callCount + 1);
    });
  });

  describe('Machine State Integration', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should update machine states', () => {
      adapter.updateMachineStates([
        {
          id: 'test-1',
          status: 'running',
          metrics: { load: 75, rpm: 1400 },
        },
      ]);

      expect(adapter.getPlantLoad()).toBe(75);
    });

    it('should calculate plant load from running machines', () => {
      adapter.updateMachineStates([
        { id: 'test-1', status: 'running', metrics: { load: 80, rpm: 1400 } },
        { id: 'test-2', status: 'running', metrics: { load: 60, rpm: 1200 } },
        { id: 'test-3', status: 'idle', metrics: { load: 100, rpm: 0 } },
      ]);

      expect(adapter.getPlantLoad()).toBe(70); // (80 + 60) / 2
    });
  });

  describe('Fault Injection', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should inject sensor failure fault', async () => {
      adapter.injectFault({
        tagId: 'TEST.TT001.PV',
        faultType: 'sensor_fail',
      });

      const faults = adapter.getActiveFaults();
      expect(faults).toHaveLength(1);
      expect(faults[0].faultType).toBe('sensor_fail');

      // Advance fake timers past simulation tick interval (1000ms)
      await vi.advanceTimersByTimeAsync(1100);

      const value = await adapter.readTag('TEST.TT001.PV');
      expect(value.quality).toBe('BAD');
    });

    it('should clear a specific fault', async () => {
      adapter.injectFault({
        tagId: 'TEST.TT001.PV',
        faultType: 'spike',
      });

      expect(adapter.getActiveFaults()).toHaveLength(1);

      adapter.clearFault('TEST.TT001.PV');
      expect(adapter.getActiveFaults()).toHaveLength(0);
    });

    it('should clear all faults', async () => {
      adapter.injectFault({ tagId: 'TEST.TT001.PV', faultType: 'spike' });
      adapter.injectFault({ tagId: 'TEST.ST001.PV', faultType: 'drift' });

      expect(adapter.getActiveFaults()).toHaveLength(2);

      adapter.clearAllFaults();
      expect(adapter.getActiveFaults()).toHaveLength(0);
    });

    it('should expire timed faults', async () => {
      adapter.injectFault({
        tagId: 'TEST.TT001.PV',
        faultType: 'spike',
        duration: 500,
      });

      expect(adapter.getActiveFaults()).toHaveLength(1);

      // Advance past fault duration AND past a simulation tick to trigger expiration check
      await vi.advanceTimersByTimeAsync(1100);

      expect(adapter.getActiveFaults()).toHaveLength(0);
    });
  });

  describe('Diagnostics', () => {
    it('should return connection status', async () => {
      const status = adapter.getConnectionStatus();
      expect(status.connected).toBe(false);
      expect(status.reconnectAttempts).toBe(0);

      await adapter.connect();
      const connectedStatus = adapter.getConnectionStatus();
      expect(connectedStatus.connected).toBe(true);
      expect(connectedStatus.lastConnectTime).toBeDefined();
    });

    it('should return statistics', async () => {
      await adapter.connect();
      await adapter.readTag('TEST.TT001.PV');
      await adapter.readTag('TEST.ST001.PV');

      const stats = adapter.getStatistics();
      expect(stats).toHaveProperty('readsPerSecond');
      expect(stats).toHaveProperty('writesPerSecond');
      expect(stats).toHaveProperty('avgReadLatency');
      expect(stats).toHaveProperty('errorCount');
      expect(stats).toHaveProperty('uptime');
      expect(stats.errorCount).toBe(0);
      expect(stats.uptime).toBeGreaterThanOrEqual(0);
    });
  });
});
