import { beforeEach, describe, expect, it } from 'vitest';
import { getDeterministicNextArrivalMinutes, useTruckScheduleStore } from '../truckScheduleStore';

describe('TruckScheduleStore', () => {
  beforeEach(() => {
    useTruckScheduleStore.getState().resetTruckSchedule();
  });

  it('uses a stable, dock-specific arrival cadence', () => {
    expect(
      [1, 2, 3, 4, 5].map((count) => getDeterministicNextArrivalMinutes('receiving', count))
    ).toEqual([12, 18, 24, 15, 12]);
    expect(
      [1, 2, 3, 4, 5].map((count) => getDeterministicNextArrivalMinutes('shipping', count))
    ).toEqual([20, 14, 26, 17, 20]);
  });

  it('records departures without randomizing the replay contract', () => {
    useTruckScheduleStore.getState().setTruckDocked('receiving', true);
    useTruckScheduleStore.getState().recordTruckDeparture('receiving', 480);
    let receiving = useTruckScheduleStore.getState().truckSchedule.receiving;
    expect(receiving).toMatchObject({
      truckActive: false,
      arrivalReady: false,
      truckDocked: false,
      transferReady: false,
      lifecyclePhase: 'scheduled',
      departureCount: 1,
      nextArrivalMinutes: 12,
      lastDepartureSimulationMinutes: 480,
    });

    useTruckScheduleStore.getState().recordTruckDeparture('receiving', 540);
    receiving = useTruckScheduleStore.getState().truckSchedule.receiving;
    expect(receiving.departureCount).toBe(2);
    expect(receiving.nextArrivalMinutes).toBe(18);
    expect(receiving.lastDepartureSimulationMinutes).toBe(540);
  });

  it('releases scheduled arrivals without reporting a false physical docking', () => {
    useTruckScheduleStore.getState().setTruckActive('receiving', false);
    useTruckScheduleStore.getState().updateNextArrival('receiving', 1.5);
    useTruckScheduleStore.getState().setTruckDocked('shipping', true);
    useTruckScheduleStore.getState().tickArrivals(2);

    const schedule = useTruckScheduleStore.getState().truckSchedule;
    expect(schedule.receiving.truckActive).toBe(true);
    expect(schedule.receiving.arrivalReady).toBe(true);
    expect(schedule.receiving.truckDocked).toBe(false);
    expect(schedule.receiving.transferReady).toBe(false);
    expect(schedule.receiving.lifecyclePhase).toBe('approaching');
    expect(schedule.receiving.nextArrivalMinutes).toBe(0);
    expect(schedule.shipping.truckDocked).toBe(true);
    expect(schedule.shipping.nextArrivalMinutes).toBe(20);
  });

  it('consumes an arrival and tracks the physical lifecycle separately', () => {
    useTruckScheduleStore.getState().setTruckActive('shipping', false);
    useTruckScheduleStore.getState().updateNextArrival('shipping', 0);
    useTruckScheduleStore.getState().tickArrivals(0.1);
    expect(useTruckScheduleStore.getState().truckSchedule.shipping.arrivalReady).toBe(true);

    useTruckScheduleStore.getState().consumeTruckArrival('shipping');
    useTruckScheduleStore.getState().setTruckLifecycle('shipping', 'servicing');
    useTruckScheduleStore.getState().setTruckDocked('shipping', true);
    useTruckScheduleStore.getState().setTruckTransferReady('shipping', true);

    expect(useTruckScheduleStore.getState().truckSchedule.shipping).toMatchObject({
      truckActive: true,
      arrivalReady: false,
      truckDocked: true,
      transferReady: true,
      lifecyclePhase: 'docked',
    });
  });

  it('rejects invalid time deltas and clamps manual arrival times', () => {
    useTruckScheduleStore.getState().updateNextArrival('shipping', -4);
    expect(useTruckScheduleStore.getState().truckSchedule.shipping.nextArrivalMinutes).toBe(0);

    useTruckScheduleStore.getState().tickArrivals(Number.NaN);
    useTruckScheduleStore.getState().tickArrivals(-1);
    expect(useTruckScheduleStore.getState().truckSchedule.receiving.nextArrivalMinutes).toBe(15);
  });

  it('resets mutable schedule state without sharing stale departures', () => {
    useTruckScheduleStore.getState().recordTruckDeparture('shipping', 600);
    useTruckScheduleStore.getState().resetTruckSchedule();

    expect(useTruckScheduleStore.getState().truckSchedule).toEqual({
      receiving: {
        truckActive: true,
        arrivalReady: false,
        truckDocked: false,
        transferReady: false,
        lifecyclePhase: 'approaching',
        nextArrivalMinutes: 15,
        lastDepartureSimulationMinutes: null,
        departureCount: 0,
      },
      shipping: {
        truckActive: true,
        arrivalReady: false,
        truckDocked: false,
        transferReady: false,
        lifecyclePhase: 'approaching',
        nextArrivalMinutes: 20,
        lastDepartureSimulationMinutes: null,
        departureCount: 0,
      },
    });
  });
});
