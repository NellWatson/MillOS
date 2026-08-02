/**
 * Worker Animation System
 *
 * Centralized animation management for workers using maath.
 */

export {
  dampAngle,
  getInitialWorkerLod,
  WorkerAnimationManager,
  resolveWorkerLod,
  useWorkerAnimationManager,
} from './WorkerAnimationManager';

export type {
  WorkerAnimationData,
  WorkerAnimationConfig,
  WorkerPoseRefs,
  WorkerSecondarySignals,
  LODLevel,
  AnimationState,
  IdleVariation,
  AnimationManagerConfig,
} from './workerAnimationTypes';

export {
  createSecondarySignals,
  createWorkerAnimationData,
  DEFAULT_ANIMATION_CONFIG,
  normalizeWorkerSpeed,
} from './workerAnimationTypes';

export type { AnimationFeatures, GraphicsQuality } from './animationFeatures';

export { getFeaturesForQuality, isFeatureEnabled, FEATURE_PRESETS } from './animationFeatures';

// Gait animation system
export type { GaitParams, GaitPose } from './gaitAnimation';

export {
  GAIT_PRESETS,
  calculateGaitPose,
  applyGaitPose,
  blendGaitParams,
  getGaitParamsForState,
} from './gaitAnimation';
