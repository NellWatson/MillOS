import { beforeEach, describe, expect, it } from 'vitest';
import { unifiedGameTick } from '../UnifiedGameTick';
import type { TickContext } from '../CentralTickSystem';
import { useGameSimulationStore } from '../../stores/gameSimulationStore';

const ctx = (over: Partial<TickContext> = {}): TickContext => ({
  deltaSeconds: 1.0,
  gameTime: 0,
  gameSpeed: 180,
  elapsedTime: 0,
  tickCount: 0,
  ...over,
});

describe('UnifiedGameTick run-window reconciliation', () => {
  beforeEach(() => {
    useGameSimulationStore.getState().resetGameState();
  });

  it('advances the run window with the clock across a boundary', () => {
    // Regression: the unified tick advanced gameTime but left the run window
    // frozen, so the HUD showed e.g. "afternoon" at 23:59.
    const store = useGameSimulationStore.getState();
    store.setGameTime(21.9); // late afternoon, just before the 22:00 -> night boundary
    expect(useGameSimulationStore.getState().currentShift).toBe('afternoon');

    unifiedGameTick(ctx({ gameSpeed: 1800 }));

    const s = useGameSimulationStore.getState();
    expect(s.gameTime).toBeGreaterThanOrEqual(22);
    expect(s.currentShift).toBe('night');
  });

  it.each([
    [180, 0.05],
    [1800, 0.5],
    [10800, 3],
  ])('advances the canonical clock at advertised speed %i', (gameSpeed, expectedHours) => {
    useGameSimulationStore.getState().setGameTime(10);

    unifiedGameTick(ctx({ gameSpeed }));

    expect(useGameSimulationStore.getState().gameTime).toBeCloseTo(10 + expectedHours);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])(
    'ignores malformed tick delta %s without corrupting canonical time',
    (deltaSeconds) => {
      useGameSimulationStore.getState().setGameTime(10);

      unifiedGameTick(ctx({ deltaSeconds }));

      expect(useGameSimulationStore.getState().gameTime).toBe(10);
    }
  );

  it('saturates the canonical day counter at the safe integer boundary', () => {
    useGameSimulationStore.setState({
      gameTime: 23.99,
      gameDay: Number.MAX_SAFE_INTEGER,
    });

    unifiedGameTick(ctx({ gameSpeed: 10800 }));

    expect(useGameSimulationStore.getState()).toMatchObject({
      gameDay: Number.MAX_SAFE_INTEGER,
      currentShift: 'night',
    });
    expect(useGameSimulationStore.getState().gameTime).toBeCloseTo(2.99);
  });

  it('leaves the run window unchanged inside its clock range', () => {
    const store = useGameSimulationStore.getState();
    store.setGameTime(15); // mid-afternoon
    unifiedGameTick(ctx({ gameSpeed: 180 })); // tiny advance, stays inside afternoon
    expect(useGameSimulationStore.getState().currentShift).toBe('afternoon');
  });
});

describe('setGameTime run-window reconciliation', () => {
  beforeEach(() => {
    useGameSimulationStore.getState().resetGameState();
  });

  it('keeps the run window in sync when the clock is set directly', () => {
    // Direct clock sets must not leave the run window stale.
    const store = useGameSimulationStore.getState();
    store.setShift('morning');
    store.setGameTime(23); // night
    const s = useGameSimulationStore.getState();
    expect(s.currentShift).toBe('night');
  });
});
