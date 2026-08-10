import { describe, expect, it } from 'vitest';
import { CHECKPOINT_HOLD_DISTANCE, shouldCheckpointOpen } from './checkpointLogic';

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
});
