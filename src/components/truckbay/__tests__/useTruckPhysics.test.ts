import { describe, expect, it } from 'vitest';
import { SITE_LAYOUT } from '../../../constants/siteLayout';
import {
  TRUCK_CYCLE_SECONDS,
  TRUCK_PHASE_DURATIONS,
  applyTruckSafetyHold,
  calculateReceivingTruckState,
  calculateShippingTruckState,
  getTruckBenchmarkControllerStart,
  getTruckPhase,
  getTruckScheduleStatus,
  isTruckDockedPhase,
  isTruckGuidingPhase,
  resolveTrailerLoadSettle,
} from '../useTruckPhysics';

const angleDistance = (a: number, b: number): number =>
  Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

describe('deterministic truck service controller', () => {
  it('settles the trailer progressively without accepting invalid load telemetry', () => {
    expect(resolveTrailerLoadSettle(0)).toBe(0);
    expect(resolveTrailerLoadSettle(0.5)).toBeCloseTo(0.04);
    expect(resolveTrailerLoadSettle(1)).toBeCloseTo(0.08);
    expect(resolveTrailerLoadSettle(2)).toBeCloseTo(0.08);
    expect(resolveTrailerLoadSettle(Number.NaN)).toBe(0);
  });
  it('starts benchmark cameras on visible near-dock manoeuvres', () => {
    const shippingStart = getTruckBenchmarkControllerStart('shipping');
    const receivingStart = getTruckBenchmarkControllerStart('receiving');

    expect(shippingStart).not.toBeNull();
    expect(receivingStart).not.toBeNull();
    expect(calculateShippingTruckState(shippingStart ?? 0, shippingStart ?? 0).phase).toBe(
      'turning_in'
    );
    const receivingCycle = ((receivingStart ?? 0) + TRUCK_CYCLE_SECONDS / 2) % TRUCK_CYCLE_SECONDS;
    expect(calculateReceivingTruckState(receivingCycle, receivingStart ?? 0).phase).toBe('backing');
    expect(getTruckBenchmarkControllerStart('overview')).toBeNull();
  });

  it('allocates one complete 60 second service cycle', () => {
    expect(Object.values(TRUCK_PHASE_DURATIONS).reduce((sum, duration) => sum + duration, 0)).toBe(
      TRUCK_CYCLE_SECONDS
    );
    expect(
      new Set(
        Array.from({ length: TRUCK_CYCLE_SECONDS * 10 }, (_, index) => getTruckPhase(index / 10))
      )
    ).toEqual(new Set(Object.keys(TRUCK_PHASE_DURATIONS)));
  });

  it('keeps motion finite, bounded, and position-continuous', () => {
    let prior = calculateShippingTruckState(0, 0);
    for (let sample = 1; sample <= TRUCK_CYCLE_SECONDS * 20; sample++) {
      const cycle = sample / 20;
      const state = calculateShippingTruckState(cycle, cycle);
      Object.values(state)
        .filter((value): value is number => typeof value === 'number')
        .forEach((value) => expect(Number.isFinite(value)).toBe(true));
      expect(Math.hypot(state.x, state.z)).toBeLessThan(SITE_LAYOUT.world.radius);
      expect(Math.hypot(state.x - prior.x, state.z - prior.z)).toBeLessThan(2);
      prior = state;
    }
  });

  it('mirrors receiving logistics across the site without state drift', () => {
    for (let cycle = 0; cycle < TRUCK_CYCLE_SECONDS; cycle += 0.5) {
      const shipping = calculateShippingTruckState(cycle, cycle);
      const receiving = calculateReceivingTruckState(cycle, cycle);

      expect(receiving.phase).toBe(shipping.phase);
      expect(receiving.x).toBeCloseTo(-shipping.x);
      expect(receiving.z).toBeCloseTo(-shipping.z);
      expect(angleDistance(receiving.rotation, shipping.rotation + Math.PI)).toBeLessThan(1e-8);
      expect(receiving.speed).toBe(shipping.speed);
    }
  });

  it('docks at the canonical bay and exposes coherent lamps and doors', () => {
    const docked = calculateShippingTruckState(32, 32);
    const reversing = calculateShippingTruckState(23, 23);

    expect(docked.phase).toBe('docked');
    expect([docked.x, 0, docked.z]).toEqual(SITE_LAYOUT.docks.shipping.bayCentre);
    expect(docked.speed).toBe(0);
    expect(docked.doorsOpen).toBe(true);
    expect(docked.doorOpenAmount).toBeGreaterThan(0.95);
    expect(reversing.speed).toBeLessThan(0);
    expect(reversing.reverseLights).toBe(true);
    expect(reversing.doorsOpen).toBe(false);
    expect(reversing.doorOpenAmount).toBe(0);
  });

  it('opens and closes service doors continuously inside the docked phase', () => {
    const start = calculateShippingTruckState(28.01, 28.01);
    const opening = calculateShippingTruckState(29.5, 29.5);
    const open = calculateShippingTruckState(34, 34);
    const closing = calculateShippingTruckState(40.5, 40.5);
    const departed = calculateShippingTruckState(42.01, 42.01);

    expect(start.doorOpenAmount).toBe(0);
    expect(opening.doorOpenAmount).toBeGreaterThan(start.doorOpenAmount);
    expect(open.doorOpenAmount).toBe(1);
    expect(closing.doorOpenAmount).toBeLessThan(open.doorOpenAmount);
    expect(departed.doorOpenAmount).toBe(0);
  });

  it('deploys landing gear at the dock and retracts it before pull-out', () => {
    const arrival = calculateShippingTruckState(28.01, 28.01);
    const lowering = calculateShippingTruckState(29.2, 29.2);
    const serviced = calculateShippingTruckState(34, 34);
    const retracting = calculateShippingTruckState(43, 43);
    const pullout = calculateShippingTruckState(44.01, 44.01);

    expect(arrival.landingGearAmount).toBe(0);
    expect(lowering.landingGearAmount).toBeGreaterThan(0);
    expect(serviced.landingGearAmount).toBe(1);
    expect(retracting.landingGearAmount).toBeGreaterThan(0);
    expect(retracting.landingGearAmount).toBeLessThan(1);
    expect(pullout.landingGearAmount).toBe(0);
  });

  it('mirrors the same landing gear sequence at receiving', () => {
    for (const cycle of [28.01, 29.2, 34, 43, 44.01]) {
      expect(calculateReceivingTruckState(cycle, cycle).landingGearAmount).toBeCloseTo(
        calculateShippingTruckState(cycle, cycle).landingGearAmount
      );
    }
  });

  it('derives schedule copy from the same controller timeline', () => {
    expect(getTruckScheduleStatus(0).status).toBe('arriving');
    expect(getTruckScheduleStatus(30).status).toBe('loading');
    expect(getTruckScheduleStatus(50)).toEqual({ status: 'departing', etaMinutes: 0 });
  });

  it('applies a legible safety hold without changing pose or service phase', () => {
    const moving = calculateShippingTruckState(23, 23);
    const held = applyTruckSafetyHold(moving);

    expect(held.phase).toBe(moving.phase);
    expect([held.x, held.z, held.rotation]).toEqual([moving.x, moving.z, moving.rotation]);
    expect(held.speed).toBe(0);
    expect(held.throttle).toBe(0);
    expect(held.brakeLights).toBe(true);
    expect(held.reverseLights).toBe(false);
    expect(held.leftSignal).toBe(false);
    expect(held.rightSignal).toBe(false);
  });

  it('derives dock and spotter visuals from explicit service phases', () => {
    expect(isTruckDockedPhase('backing')).toBe(false);
    expect(isTruckDockedPhase('final_adjustment')).toBe(true);
    expect(isTruckDockedPhase('docked')).toBe(true);
    expect(isTruckDockedPhase('preparing_to_leave')).toBe(true);
    expect(isTruckDockedPhase('pulling_out')).toBe(false);

    expect(isTruckGuidingPhase('backing')).toBe(true);
    expect(isTruckGuidingPhase('final_adjustment')).toBe(true);
    expect(isTruckGuidingPhase('docked')).toBe(false);
  });
});
