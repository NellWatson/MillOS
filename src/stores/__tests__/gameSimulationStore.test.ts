import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSafetyStore } from '../safetyStore';
import {
  SERVICE_EGRESS_POINTS,
  getShiftForHour,
  selectSafetyHoldActive,
  useGameSimulationStore,
} from '../gameSimulationStore';

describe('autonomous game simulation store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-09T12:00:00.000Z'));
    useGameSimulationStore.getState().resetGameState();
    useSafetyStore.getState().setForkliftEmergencyStop(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps clock hours to deterministic run windows', () => {
    expect(getShiftForHour(5.99)).toBe('night');
    expect(getShiftForHour(6)).toBe('morning');
    expect(getShiftForHour(14)).toBe('afternoon');
    expect(getShiftForHour(22)).toBe('night');
    expect(getShiftForHour(30)).toBe('morning');
  });

  it('advances time, day, and run window together', () => {
    const store = useGameSimulationStore.getState();
    store.setGameTime(13.75);
    store.setGameSpeed(3600);
    store.tickGameTime(0.5);

    const state = useGameSimulationStore.getState();
    expect(state.gameTime).toBeCloseTo(14.25);
    expect(state.currentShift).toBe('afternoon');

    store.setGameTime(23.75);
    store.tickGameTime(0.5);
    expect(useGameSimulationStore.getState()).toMatchObject({ gameDay: 1, currentShift: 'night' });
  });

  it('records and clears a facility stop with the mobile fleet interlock', () => {
    const store = useGameSimulationStore.getState();
    store.triggerEmergency('rm-101');

    let state = useGameSimulationStore.getState();
    expect(selectSafetyHoldActive(state)).toBe(true);
    expect(useSafetyStore.getState().forkliftEmergencyStop).toBe(true);
    expect(state.safetyEvents.at(-1)).toMatchObject({
      kind: 'facility_stop',
      cause: 'rm-101 interlock',
      stage: 'active',
    });

    store.resolveEmergency();
    state = useGameSimulationStore.getState();
    expect(selectSafetyHoldActive(state)).toBe(false);
    expect(useSafetyStore.getState().forkliftEmergencyStop).toBe(false);
    expect(state.safetyEvents.at(-1)?.stage).toBe('cleared');
  });

  it('verifies each service egress zone once and records completion time', () => {
    const store = useGameSimulationStore.getState();
    store.startEmergencyDrill();
    SERVICE_EGRESS_POINTS.forEach((point, index) => {
      vi.advanceTimersByTime(1000);
      store.markZoneVerified(point.id);
      if (index === 0) store.markZoneVerified(point.id);
    });

    const metrics = useGameSimulationStore.getState().drillMetrics;
    expect(metrics.verifiedZoneIds).toHaveLength(SERVICE_EGRESS_POINTS.length);
    expect(metrics.verificationComplete).toBe(true);
    expect(metrics.finalTimeSeconds).toBe(4);
    expect(useSafetyStore.getState().forkliftEmergencyStop).toBe(true);

    store.endEmergencyDrill();
    expect(useGameSimulationStore.getState().drillMetrics.active).toBe(false);
  });

  it('isolates low-severity crises and interlocks high-severity crises', () => {
    const store = useGameSimulationStore.getState();
    store.triggerCrisis('weather', 'low');
    expect(useGameSimulationStore.getState().emergencyActive).toBe(false);
    expect(useGameSimulationStore.getState().safetyEvents.at(-1)?.response).toContain(
      'autonomous monitoring'
    );
    store.resolveCrisis();

    store.triggerCrisis('fire', 'high', { machineId: 'rm-102' });
    expect(useGameSimulationStore.getState().crisisState.affectedMachineId).toBe('rm-102');
    expect(useGameSimulationStore.getState().emergencyActive).toBe(true);
    expect(useSafetyStore.getState().forkliftEmergencyStop).toBe(true);
  });

  it('bounds the celebration queue and repairs incomplete persisted state', () => {
    useGameSimulationStore.setState((state) => ({
      celebrations: { ...state.celebrations, milestoneQueue: undefined as never },
    }));
    expect(() => useGameSimulationStore.getState().triggerCelebration('milestone')).not.toThrow();

    for (let index = 0; index < 9; index += 1) {
      useGameSimulationStore.getState().triggerCelebration('target_met', { value: index });
    }
    expect(useGameSimulationStore.getState().celebrations.milestoneQueue).toHaveLength(5);
  });
});
