import { beforeEach, describe, expect, it } from 'vitest';
import { vehicleTelemetryRegistry } from './vehicleTelemetryRegistry';

describe('vehicle telemetry registry', () => {
  beforeEach(() => vehicleTelemetryRegistry.clear());

  it('publishes immutable numeric snapshots and unregisters vehicles', () => {
    const source = {
      id: 'forklift-1',
      type: 'forklift' as const,
      speedMps: 1.2,
      steeringRadians: 0.1,
      phase: 'carrying',
      stopReason: 'none',
      articulationRadians: 0,
      transferReady: false,
    };
    vehicleTelemetryRegistry.publish(source);
    source.speedMps = 0;

    expect(vehicleTelemetryRegistry.get('forklift-1')?.speedMps).toBe(1.2);
    vehicleTelemetryRegistry.unregister('forklift-1');
    expect(vehicleTelemetryRegistry.getAll()).toEqual([]);
  });

  it('rejects non-finite motion values', () => {
    vehicleTelemetryRegistry.publish({
      id: 'shipping-truck',
      type: 'truck',
      speedMps: Number.NaN,
      steeringRadians: 0,
      phase: 'entering',
      stopReason: 'none',
      articulationRadians: 0,
      transferReady: false,
    });
    expect(vehicleTelemetryRegistry.getAll()).toEqual([]);
  });
});
