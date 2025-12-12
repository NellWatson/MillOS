/**
 * Multiplayer module exports
 */

// Types
export * from './types';

// Services
export { SignalingService } from './SignalingService';
export { PeerConnection } from './PeerConnection';
export {
  MultiplayerManager,
  getMultiplayerManager,
  destroyMultiplayerManager,
} from './MultiplayerManager';
export {
  PlayerInterpolationBuffer,
  InterpolationManager,
  interpolationManager,
} from './PlayerInterpolation';

// Hooks
export { useMultiplayerSync, useMachineLockedByOther, useMachineLockHolder } from './hooks';
