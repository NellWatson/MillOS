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
      truckDocked: false,
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

  it('ticks each undocked bay to arrival and leaves docked bays stable', () => {
    useTruckScheduleStore.getState().updateNextArrival('receiving', 1.5);
    useTruckScheduleStore.getState().setTruckDocked('shipping', true);
    useTruckScheduleStore.getState().tickArrivals(2);

    const schedule = useTruckScheduleStore.getState().truckSchedule;
    expect(schedule.receiving.truckDocked).toBe(true);
    expect(schedule.receiving.nextArrivalMinutes).toBe(0);
    expect(schedule.shipping.truckDocked).toBe(true);
    expect(schedule.shipping.nextArrivalMinutes).toBe(20);
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
        truckDocked: false,
        nextArrivalMinutes: 15,
        lastDepartureSimulationMinutes: null,
        departureCount: 0,
      },
      shipping: {
        truckDocked: false,
        nextArrivalMinutes: 20,
        lastDepartureSimulationMinutes: null,
        departureCount: 0,
      },
    });
  });
});
