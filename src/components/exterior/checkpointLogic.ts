import type { EntityPosition } from '../../utils/positionRegistry';

export interface CheckpointPosition {
  readonly x: number;
  readonly z: number;
}

const OPEN_DISTANCE = 48;
const HOLD_OPEN_DISTANCE = 56;

const isWithin = (
  vehicle: EntityPosition | undefined,
  checkpoint: CheckpointPosition,
  distance: number
): boolean => {
  if (!vehicle) return false;
  const dx = vehicle.x - checkpoint.x;
  const dz = vehicle.z - checkpoint.z;
  return dx * dx + dz * dz <= distance * distance;
};

/**
 * Checkpoint hysteresis based on the live tractor and trailer positions.
 * The larger hold radius prevents an articulated vehicle near the threshold
 * from making the boom chatter while its trailer follows through the turn.
 */
export const shouldCheckpointOpen = (
  wasOpen: boolean,
  checkpoint: CheckpointPosition,
  cab: EntityPosition | undefined,
  trailer: EntityPosition | undefined
): boolean => {
  const distance = wasOpen ? HOLD_OPEN_DISTANCE : OPEN_DISTANCE;
  return isWithin(cab, checkpoint, distance) || isWithin(trailer, checkpoint, distance);
};

export const CHECKPOINT_OPEN_DISTANCE = OPEN_DISTANCE;
export const CHECKPOINT_HOLD_DISTANCE = HOLD_OPEN_DISTANCE;
