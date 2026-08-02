import { describe, expect, it } from 'vitest';
import type { MachineBuffer } from '../../stores/materialFlowStore';
import { getMachineOperationalState } from '../machineMotion';

const createBuffer = (overrides: Partial<MachineBuffer> = {}): MachineBuffer => ({
  machineId: 'rm-101',
  machineType: 'roller_mill',
  inputBuffer: [{ type: 'wheat_grain', amount: 100 }],
  outputBuffer: [{ type: 'flour', amount: 20 }],
  inputCapacity: 2000,
  outputCapacity: 2000,
  processingRate: 50,
  conversionRatios: [],
  isProcessing: true,
  ...overrides,
});

describe('machine motion semantics', () => {
  it('distinguishes operating, stopped, and faulted state', () => {
    expect(getMachineOperationalState('running', createBuffer())).toBe('operating');
    expect(getMachineOperationalState('idle', createBuffer())).toBe('stopped');
    expect(getMachineOperationalState('critical', createBuffer())).toBe('faulted');
    expect(getMachineOperationalState('running', createBuffer({ isProcessing: false }))).toBe(
      'stopped'
    );
  });

  it('identifies starved processing equipment', () => {
    expect(
      getMachineOperationalState('running', createBuffer({ inputBuffer: [], outputBuffer: [] }))
    ).toBe('starved');
  });

  it('identifies downstream blockage', () => {
    expect(
      getMachineOperationalState(
        'warning',
        createBuffer({
          outputBuffer: [{ type: 'flour', amount: 2000 }],
        })
      )
    ).toBe('blocked');
  });

  it('uses silo output as its source inventory', () => {
    expect(
      getMachineOperationalState(
        'running',
        createBuffer({
          machineType: 'silo',
          inputBuffer: [],
          outputBuffer: [],
        })
      )
    ).toBe('starved');
  });
});
