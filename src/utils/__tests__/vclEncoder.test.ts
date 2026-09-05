import { describe, expect, it } from 'vitest';
import { MachineType, type MachineData } from '../../types';
import {
  encodeFactoryContextVCL,
  encodeMachineVCL,
  encodeMachinesVCL,
  getVCLLegend,
} from '../vclEncoder';

const machine = (overrides: Partial<MachineData> = {}): MachineData => ({
  id: 'rm-101',
  name: 'Roller Mill 101',
  type: MachineType.ROLLER_MILL,
  position: [0, 0, 0],
  size: [2, 2, 2],
  rotation: 0,
  status: 'running',
  metrics: {
    rpm: 1200,
    temperature: 55,
    vibration: 2,
    load: 65,
    wear: 15,
    efficiency: 92,
  },
  lastMaintenance: '2026-08-01T00:00:00.000Z',
  nextMaintenance: '2026-08-08T00:00:00.000Z',
  ...overrides,
});

describe('autonomous VCL encoder', () => {
  it('encodes machine family, health, and load', () => {
    expect(encodeMachineVCL(machine())).toBe('⚙️✅🟡');
    expect(
      encodeMachineVCL(machine({ id: 'silo-alpha', type: MachineType.SILO, status: 'warning' }))
    ).toContain('🏛️⚠️');
    expect(
      encodeMachineVCL(
        machine({
          id: 'packer-1',
          type: MachineType.PACKER,
          status: 'critical',
          metrics: { ...machine().metrics, load: 97 },
        })
      )
    ).toBe('📦🔴🔴');
  });

  it('summarizes the complete production chain with stable empty groups', () => {
    const encoded = encodeMachinesVCL([
      machine({ id: 'silo-alpha', type: MachineType.SILO }),
      machine(),
      machine({ id: 'sifter-a', type: MachineType.PLANSIFTER, status: 'warning' }),
      machine({ id: 'packer-1', type: MachineType.PACKER }),
    ]);

    expect(encoded.split('→')).toHaveLength(5);
    expect(encoded).toContain('🏛️1/1');
    expect(encoded).toContain('🔀0/1');
    expect(encoded).toContain('⚠️');
    expect(encodeMachinesVCL([])).toContain('⚙️0/0');
  });

  it('encodes run window, weather, time, and critical alarm count', () => {
    const encoded = encodeFactoryContextVCL([machine()], 'night', 'storm', 2, [
      { type: 'warning' },
      { type: 'critical' },
      { type: 'safety' },
    ]);

    expect(encoded).toContain('🌙WC⛈️');
    expect(encoded).toContain('🚨2');
  });

  it('falls back safely for malformed machine telemetry', () => {
    const malformed = { id: 'unknown-unit', status: 'offline' } as unknown as MachineData;
    expect(() => encodeMachineVCL(malformed)).not.toThrow();
    expect(encodeMachineVCL(malformed)).toBe('❓⚫🟢');
  });

  it('documents only autonomous wire glyphs', () => {
    const legend = getVCLLegend();
    expect(legend).toContain('Run window');
    expect(legend).toContain('🧠Control');
    expect(legend).toContain('🚨N active critical alarms');
    expect(legend).not.toMatch(/worker|supervisor|fatigue/i);
  });
});
