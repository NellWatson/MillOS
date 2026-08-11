import { describe, expect, it } from 'vitest';
import {
  CHECKPOINT_CLEARANCE_DWELL_SECONDS,
  CHECKPOINT_HOLD_DISTANCE,
  createCheckpointGateState,
  shouldCheckpointOpen,
  stepCheckpointGate,
} from './checkpointLogic';

const checkpoint = { x: 20, z: 110 };

describe('shouldCheckpointOpen', () => {
  it('opens for the live cab before it reaches the barrier', () => {
    expect(shouldCheckpointOpen(false, checkpoint, { id: 'cab', x: 20, z: 150 }, undefined)).toBe(
      true
    );
  });

  it('holds for the articulated trailer after the cab clears', () => {
    expect(
      shouldCheckpointOpen(
        true,
        checkpoint,
        { id: 'cab', x: 20, z: 110 + CHECKPOINT_HOLD_DISTANCE + 1 },
        { id: 'trailer', x: 20, z: 154 }
      )
    ).toBe(true);
  });

  it('closes only after both tractor and trailer clear the hold radius', () => {
    expect(
      shouldCheckpointOpen(
        true,
        checkpoint,
        { id: 'cab', x: 20, z: 180 },
        { id: 'trailer', x: 20, z: 170 }
      )
    ).toBe(false);
  });

  it('does not react to a missing scheduled truck', () => {
    expect(shouldCheckpointOpen(false, checkpoint, undefined, undefined)).toBe(false);
  });

  it('holds the arm for a safety dwell after the trailer clears', () => {
    const opened = stepCheckpointGate(
      createCheckpointGateState(),
      checkpoint,
      { id: 'cab', x: 20, z: 150 },
      undefined,
      0.1
    );
    const clearing = stepCheckpointGate(
      opened,
      checkpoint,
      { id: 'cab', x: 20, z: 190 },
      { id: 'trailer', x: 20, z: 180 },
      CHECKPOINT_CLEARANCE_DWELL_SECONDS - 0.1
    );
    expect(clearing.open).toBe(true);
    expect(clearing.clearanceSecondsRemaining).toBeCloseTo(0.1);

    const closed = stepCheckpointGate(
      clearing,
      checkpoint,
      { id: 'cab', x: 20, z: 190 },
      { id: 'trailer', x: 20, z: 180 },
      0.11
    );
    expect(closed).toEqual({ open: false, clearanceSecondsRemaining: 0 });
  });

  it('refreshes the clearance dwell while either articulated section remains nearby', () => {
    const prior = { open: true, clearanceSecondsRemaining: 0.2 };
    const held = stepCheckpointGate(
      prior,
      checkpoint,
      { id: 'cab', x: 20, z: 180 },
      { id: 'trailer', x: 20, z: 154 },
      1
    );
    expect(held).toEqual({
      open: true,
      clearanceSecondsRemaining: CHECKPOINT_CLEARANCE_DWELL_SECONDS,
    });
  });
});
