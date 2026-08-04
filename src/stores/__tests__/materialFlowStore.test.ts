/**
 * Material Flow Store Tests
 *
 * Tests for the mill material-flow network: machine processing tick,
 * conveyor transit, grain deliveries, buffer capacity limits, and
 * jam/back-pressure recovery.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useMaterialFlowStore } from '../materialFlowStore';

describe('MaterialFlowStore', () => {
  beforeEach(() => {
    useMaterialFlowStore.getState().resetMaterialFlow();
  });

  describe('Initial State', () => {
    it('should initialize silos with 20 tons of grain each', () => {
      const { getTotalOutputBuffer } = useMaterialFlowStore.getState();
      expect(getTotalOutputBuffer('silo-0')).toBe(20000);
      expect(getTotalOutputBuffer('silo-4')).toBe(20000);
    });

    it('should alternate wheat/corn across silo indices', () => {
      const { getMachineBuffer } = useMaterialFlowStore.getState();
      expect(getMachineBuffer('silo-0')?.outputBuffer[0].type).toBe('wheat_grain');
      expect(getMachineBuffer('silo-1')?.outputBuffer[0].type).toBe('corn_grain');
    });

    it('should start with zero cumulative stats', () => {
      const state = useMaterialFlowStore.getState();
      expect(state.totalMaterialProcessed).toBe(0);
      expect(state.totalFlourProduced).toBe(0);
      expect(state.simulationTime).toBe(0);
      expect(state.initialInventoryKg).toBe(103500);
      expect(state.receivedKg).toBe(0);
      expect(state.wasteKg).toBe(0);
      expect(state.shippedKg).toBe(0);
      expect(state.manifests).toEqual([]);
    });

    it('should create one unique physical segment per network connection', () => {
      const segmentIds = useMaterialFlowStore.getState().network.segments.map(({ id }) => id);
      expect(new Set(segmentIds).size).toBe(segmentIds.length);
    });
  });

  describe('tickMaterialFlow', () => {
    it('should be a no-op when production speed is 0', () => {
      const { tickMaterialFlow } = useMaterialFlowStore.getState();
      tickMaterialFlow(1, 0);

      const state = useMaterialFlowStore.getState();
      expect(state.simulationTime).toBe(0);
      expect(state.totalMaterialProcessed).toBe(0);
    });

    it('should report zero live flow while production is paused', () => {
      const { tickMaterialFlow } = useMaterialFlowStore.getState();
      tickMaterialFlow(1, 1);
      expect(useMaterialFlowStore.getState().currentFlowRate).toBeGreaterThan(0);
      expect(useMaterialFlowStore.getState().currentPackerFlowRate).toBeGreaterThan(0);

      const simulationTime = useMaterialFlowStore.getState().simulationTime;
      tickMaterialFlow(1, 0);

      const paused = useMaterialFlowStore.getState();
      expect(paused.simulationTime).toBe(simulationTime);
      expect(paused.currentFlowRate).toBe(0);
      expect(paused.currentPackerFlowRate).toBe(0);
    });

    it('should be a no-op for non-positive delta', () => {
      const { tickMaterialFlow } = useMaterialFlowStore.getState();
      tickMaterialFlow(0, 1);
      tickMaterialFlow(-1, 1);

      expect(useMaterialFlowStore.getState().simulationTime).toBe(0);
    });

    it('should advance simulation time by delta * productionSpeed', () => {
      const { tickMaterialFlow } = useMaterialFlowStore.getState();
      tickMaterialFlow(1, 2);
      expect(useMaterialFlowStore.getState().simulationTime).toBe(2);
    });

    it('should convert mill input grain into flour/bran/middlings at extraction ratios', () => {
      const { tickMaterialFlow } = useMaterialFlowStore.getState();
      // rm-101 starts with 500kg wheat, processingRate 50 kg/s
      tickMaterialFlow(1, 1);

      const rm = useMaterialFlowStore.getState().getMachineBuffer('rm-101');
      const wheat = rm?.inputBuffer.find((m) => m.type === 'wheat_grain');
      expect(wheat?.amount).toBeCloseTo(450, 5); // 500 - 50 processed

      const flour = rm?.outputBuffer.find((m) => m.type === 'flour');
      const bran = rm?.outputBuffer.find((m) => m.type === 'bran');
      const middlings = rm?.outputBuffer.find((m) => m.type === 'middlings');
      // 50kg processed: 72% flour, 18% bran, 10% middlings (before conveyor pickup)
      // The mill->sifter conveyor may already have pulled flour, so check totals:
      const flourOnBelt = useMaterialFlowStore
        .getState()
        .network.segments.find((s) => s.id === 'conv-rm-101-sifter-a')?.currentLoad;
      expect((flour?.amount ?? 0) + (flourOnBelt ?? 0)).toBeCloseTo(36, 5);
      expect(bran?.amount).toBeCloseTo(9, 5);
      expect(middlings?.amount).toBeCloseTo(5, 5);
    });

    it('should track packer flow rate separately from total flow rate', () => {
      const { tickMaterialFlow } = useMaterialFlowStore.getState();
      tickMaterialFlow(1, 1);

      const state = useMaterialFlowStore.getState();
      // 3 packers each process 25 kg/s from their 200kg starting hoppers
      expect(state.currentPackerFlowRate).toBeCloseTo(75, 5);
      // Total flow includes mills + sifters + packers, so is strictly larger
      expect(state.currentFlowRate).toBeGreaterThan(state.currentPackerFlowRate);
    });

    it('should accumulate flour production from plansifters', () => {
      const { tickMaterialFlow } = useMaterialFlowStore.getState();
      tickMaterialFlow(1, 1);

      // 3 sifters process 80 kg/s each at 95% flour pass-through = 228 kg
      expect(useMaterialFlowStore.getState().totalFlourProduced).toBeCloseTo(228, 5);
      // The remaining 5% is explicitly accounted for as dust extraction waste.
      expect(useMaterialFlowStore.getState().wasteKg).toBeCloseTo(12, 5);
    });

    it('should move material onto conveyors and deliver it after transit time', () => {
      const { tickMaterialFlow, getConveyorLoad, getMachineBuffer } =
        useMaterialFlowStore.getState();

      // rm-101 starts with only wheat; corn arrives via conv-silo-3-rm-101
      expect(
        getMachineBuffer('rm-101')?.inputBuffer.find((m) => m.type === 'corn_grain')
      ).toBeUndefined();

      tickMaterialFlow(1, 1);
      // Silo discharge is on the belt (40 kg/s flow rate, 3s transit)
      expect(getConveyorLoad('conv-silo-3-rm-101')).toBeGreaterThan(0);

      // Advance past the 3s transit time
      tickMaterialFlow(3.5, 1);

      const corn = useMaterialFlowStore
        .getState()
        .getMachineBuffer('rm-101')
        ?.inputBuffer.find((m) => m.type === 'corn_grain');
      expect(corn).toBeDefined();
      expect(corn!.amount).toBeGreaterThan(0);
    });

    it('should never exceed input capacity and should recover from a jam', () => {
      const { syncMachineProcessing } = useMaterialFlowStore.getState();

      // Jam packer-0: it stops processing but sifter-a keeps feeding it
      syncMachineProcessing([{ id: 'packer-0', status: 'idle' }]);

      for (let i = 0; i < 60; i++) {
        useMaterialFlowStore.getState().tickMaterialFlow(1, 1);
      }

      const state = useMaterialFlowStore.getState();
      const packer = state.getMachineBuffer('packer-0')!;
      const totalInput = state.getTotalInputBuffer('packer-0');
      const segment = state.network.segments.find((s) => s.id === 'conv-sifter-a-packer-0')!;

      // Buffer clamped at capacity; belt backed up but within its own capacity
      expect(totalInput).toBeLessThanOrEqual(packer.inputCapacity + 0.001);
      expect(totalInput).toBeGreaterThan(900); // Effectively full (capacity 1000)
      expect(segment.currentLoad).toBeGreaterThan(0);
      expect(segment.currentLoad).toBeLessThanOrEqual(segment.capacity + 0.001);
      // Jammed packer produced nothing while idle
      expect(state.getTotalOutputBuffer('packer-0')).toBe(0);

      // Un-jam: packer resumes processing and works through the backlog
      useMaterialFlowStore
        .getState()
        .syncMachineProcessing([{ id: 'packer-0', status: 'running' }]);
      for (let i = 0; i < 30; i++) {
        useMaterialFlowStore.getState().tickMaterialFlow(1, 1);
      }

      const after = useMaterialFlowStore.getState();
      // Packer output accumulates again (25 kg/s for 30s from a full hopper)
      expect(after.getTotalOutputBuffer('packer-0')).toBeGreaterThan(700);
      // Input still respects capacity while the belt keeps feeding it
      expect(after.getTotalInputBuffer('packer-0')).toBeLessThanOrEqual(
        after.getMachineBuffer('packer-0')!.inputCapacity + 0.001
      );
    });

    it.each([
      { delta: 1 / 60, speed: 0.25, ticks: 240 },
      { delta: 0.1, speed: 1, ticks: 120 },
      { delta: 0.5, speed: 2, ticks: 40 },
      { delta: 1, speed: 4, ticks: 20 },
    ])(
      'should conserve material across ticks at $speed times speed and $delta second steps',
      ({ delta, speed, ticks }) => {
        for (let index = 0; index < ticks; index += 1) {
          useMaterialFlowStore.getState().tickMaterialFlow(delta, speed);
          expect(
            Math.abs(useMaterialFlowStore.getState().getMaterialBalance().errorKg)
          ).toBeLessThan(0.001);
        }
      }
    );
  });

  describe('syncMachineProcessing', () => {
    it('should stop processing for idle/critical machines and resume for running/warning', () => {
      const { syncMachineProcessing, getMachineBuffer } = useMaterialFlowStore.getState();

      syncMachineProcessing([
        { id: 'rm-101', status: 'idle' },
        { id: 'rm-102', status: 'critical' },
        { id: 'rm-103', status: 'warning' },
      ]);

      expect(getMachineBuffer('rm-101')?.isProcessing).toBe(false);
      expect(getMachineBuffer('rm-102')?.isProcessing).toBe(false);
      expect(getMachineBuffer('rm-103')?.isProcessing).toBe(true);

      syncMachineProcessing([{ id: 'rm-101', status: 'running' }]);
      expect(useMaterialFlowStore.getState().getMachineBuffer('rm-101')?.isProcessing).toBe(true);
    });

    it('should ignore unknown machine ids', () => {
      const before = useMaterialFlowStore.getState().machineBuffers;
      useMaterialFlowStore.getState().syncMachineProcessing([{ id: 'no-such', status: 'idle' }]);
      expect(useMaterialFlowStore.getState().machineBuffers).toBe(before); // No state change
    });

    it('should stop a stopped mill from consuming input on tick', () => {
      const { syncMachineProcessing, tickMaterialFlow, getTotalInputBuffer } =
        useMaterialFlowStore.getState();

      syncMachineProcessing([{ id: 'rm-101', status: 'idle' }]);
      const before = getTotalInputBuffer('rm-101');
      tickMaterialFlow(1, 1);

      // Input may only grow (upstream deliveries), never shrink via processing
      expect(useMaterialFlowStore.getState().getTotalInputBuffer('rm-101')).toBeGreaterThanOrEqual(
        before
      );
      const rm = useMaterialFlowStore.getState().getMachineBuffer('rm-101');
      expect(rm?.outputBuffer.find((m) => m.type === 'bran')).toBeUndefined();
    });
  });

  describe('receiveGrainDelivery', () => {
    it('should top up the emptiest silo with its matching grain type', () => {
      const { receiveGrainDelivery, getTotalOutputBuffer } = useMaterialFlowStore.getState();

      // All silos equal (20000) -> first silo (silo-0, wheat) receives
      receiveGrainDelivery(5000);
      expect(getTotalOutputBuffer('silo-0')).toBe(25000);
      const silo0 = useMaterialFlowStore.getState().getMachineBuffer('silo-0');
      expect(silo0?.outputBuffer.find((m) => m.type === 'wheat_grain')?.amount).toBe(25000);

      // Now silo-1 (corn, 20000) is the emptiest
      receiveGrainDelivery(3000);
      const silo1 = useMaterialFlowStore.getState().getMachineBuffer('silo-1');
      expect(silo1?.outputBuffer.find((m) => m.type === 'corn_grain')?.amount).toBe(23000);
    });

    it('should clamp delivery to silo capacity', () => {
      const { receiveGrainDelivery } = useMaterialFlowStore.getState();
      const received = receiveGrainDelivery(1_000_000); // Way over the 50-ton capacity

      expect(useMaterialFlowStore.getState().getTotalOutputBuffer('silo-0')).toBe(50000);
      expect(received).toBe(30000);
    });

    it('should ignore non-positive amounts', () => {
      const { receiveGrainDelivery, getTotalOutputBuffer } = useMaterialFlowStore.getState();
      receiveGrainDelivery(0);
      receiveGrainDelivery(-100);
      expect(getTotalOutputBuffer('silo-0')).toBe(20000);
    });

    it('should record actual delivery mass in a deterministic manifest and ledger', () => {
      const actual = useMaterialFlowStore.getState().receiveGrainDelivery(5000);
      const state = useMaterialFlowStore.getState();

      expect(actual).toBe(5000);
      expect(state.receivedKg).toBe(5000);
      expect(state.manifests).toEqual([
        expect.objectContaining({
          id: 'receiving-0001',
          kind: 'receiving',
          dock: 'receiving',
          requestedKg: 5000,
          actualKg: 5000,
          materials: [{ type: 'wheat_grain', amount: 5000 }],
          simulationTime: 0,
        }),
      ]);
      expect(Math.abs(state.getMaterialBalance().errorKg)).toBeLessThan(0.001);
    });
  });

  describe('shipFinishedGoods', () => {
    it('should remove only available packer output and record the actual shipment', () => {
      useMaterialFlowStore.getState().tickMaterialFlow(1, 1);
      const shipped = useMaterialFlowStore.getState().shipFinishedGoods(100);
      const state = useMaterialFlowStore.getState();

      // Three packers make 25 kg each during the first second.
      expect(shipped).toBeCloseTo(75, 5);
      expect(state.shippedKg).toBeCloseTo(75, 5);
      expect(state.manifests.at(-1)).toEqual(
        expect.objectContaining({
          id: 'shipping-0001',
          kind: 'shipping',
          dock: 'shipping',
          requestedKg: 100,
          actualKg: 75,
          materials: [{ type: 'flour', amount: 75 }],
          simulationTime: 1,
        })
      );
      expect(Math.abs(state.getMaterialBalance().errorKg)).toBeLessThan(0.001);
    });

    it('should preserve conservation across receiving, production, waste, and shipping', () => {
      expect(useMaterialFlowStore.getState().receiveGrainDelivery(8000)).toBe(8000);
      for (let index = 0; index < 90; index += 1) {
        useMaterialFlowStore.getState().tickMaterialFlow(0.25, 1.5);
      }
      const shipped = useMaterialFlowStore.getState().shipFinishedGoods(2500);
      const balance = useMaterialFlowStore.getState().getMaterialBalance();

      expect(shipped).toBeGreaterThan(0);
      expect(balance.receivedKg).toBe(8000);
      expect(balance.wasteKg).toBeGreaterThan(0);
      expect(balance.shippedKg).toBeCloseTo(shipped, 5);
      expect(Math.abs(balance.errorKg)).toBeLessThan(0.001);
    });
  });

  describe('resetMaterialFlow', () => {
    it('should restore initial buffers and clear cumulative stats', () => {
      const { tickMaterialFlow, receiveGrainDelivery, resetMaterialFlow } =
        useMaterialFlowStore.getState();
      tickMaterialFlow(5, 1);
      receiveGrainDelivery(1000);

      resetMaterialFlow();

      const state = useMaterialFlowStore.getState();
      expect(state.simulationTime).toBe(0);
      expect(state.totalMaterialProcessed).toBe(0);
      expect(state.totalFlourProduced).toBe(0);
      expect(state.receivedKg).toBe(0);
      expect(state.wasteKg).toBe(0);
      expect(state.shippedKg).toBe(0);
      expect(state.manifests).toEqual([]);
      expect(state.getTotalOutputBuffer('silo-0')).toBe(20000);
      expect(state.network.segments.every((s) => s.currentLoad === 0)).toBe(true);
      expect(Math.abs(state.getMaterialBalance().errorKg)).toBeLessThan(0.001);
    });
  });
});
