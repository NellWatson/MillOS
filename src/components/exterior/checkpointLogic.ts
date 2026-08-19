import type { EntityPosition } from '../../utils/positionRegistry';

export interface CheckpointPosition {
  readonly x: number;
  readonly z: number;
}

export interface CheckpointGateState {
  readonly open: boolean;
  readonly clearanceSecondsRemaining: number;
}

const OPEN_DISTANCE = 48;
const HOLD_OPEN_DISTANCE = 56;
const CLEARANCE_DWELL_SECONDS = 1.25;

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

export const createCheckpointGateState = (): CheckpointGateState => ({
  open: false,
  clearanceSecondsRemaining: 0,
});

/**
 * Hold the boom after the articulated vehicle leaves the detection envelope.
 * This models the short safety-clearance dwell used by real powered barriers
 * and prevents the arm beginning to close directly behind the trailer tail.
 */
export const stepCheckpointGate = (
  prior: CheckpointGateState,
  checkpoint: CheckpointPosition,
  cab: EntityPosition | undefined,
  trailer: EntityPosition | undefined,
  deltaSeconds: number
): CheckpointGateState => {
  const vehicleDetected = shouldCheckpointOpen(prior.open, checkpoint, cab, trailer);
  if (vehicleDetected) {
    return { open: true, clearanceSecondsRemaining: CLEARANCE_DWELL_SECONDS };
  }

  const clearanceSecondsRemaining = Math.max(
    0,
    prior.clearanceSecondsRemaining - Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0)
  );
  return {
    open: clearanceSecondsRemaining > 0,
    clearanceSecondsRemaining,
  };
};

export const CHECKPOINT_OPEN_DISTANCE = OPEN_DISTANCE;
export const CHECKPOINT_HOLD_DISTANCE = HOLD_OPEN_DISTANCE;
export const CHECKPOINT_CLEARANCE_DWELL_SECONDS = CLEARANCE_DWELL_SECONDS;
