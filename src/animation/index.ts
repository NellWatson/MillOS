/**
 * Worker Animation System
 *
 * Centralized animation management for workers using maath.
 */

export { WorkerAnimationManager, useWorkerAnimationManager } from './WorkerAnimationManager';

export type {
  WorkerAnimationData,
  WorkerAnimationConfig,
  WorkerPoseRefs,
  LODLevel,
  AnimationState,
  IdleVariation,
  AnimationManagerConfig,
} from './workerAnimationTypes';

export { createWorkerAnimationData, DEFAULT_ANIMATION_CONFIG } from './workerAnimationTypes';

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
