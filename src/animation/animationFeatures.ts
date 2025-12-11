/**
 * Animation Feature Flags
 * Quality-based feature presets for selective animation complexity
 */

export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra';

/**
 * Animation features organized by tier
 * - Tier 1: Always enabled (core gameplay)
 * - Tier 2: Medium+ quality (immersion)
 * - Tier 3: High+ quality (polish)
 * - Tier 4: Removed (not worth the complexity)
 */
export interface AnimationFeatures {
  // === Tier 1: Always Enabled ===
  walking: true;
  running: true;
  sitting: true;
  breathing: true;
  position: true;
  forkliftEvasion: true;
  startledReaction: true;

  // === Tier 2: Medium+ Quality ===
  idleVariations: boolean;
  waving: boolean;
  fatigue: boolean;
  alertReactions: boolean;

  // === Tier 3: High+ Quality ===
  blinking: boolean;
  shoulderRotation: boolean;
  headBob: boolean;
  fingerGrips: boolean;
  hipSway: boolean;
}

// Tier 1 features (always on)
const TIER_1: Pick<
  AnimationFeatures,
  | 'walking'
  | 'running'
  | 'sitting'
  | 'breathing'
  | 'position'
  | 'forkliftEvasion'
  | 'startledReaction'
> = {
  walking: true,
  running: true,
  sitting: true,
  breathing: true,
  position: true,
  forkliftEvasion: true,
  startledReaction: true,
};

// Tier 2 features off
const TIER_2_OFF = {
  idleVariations: false,
  waving: false,
  fatigue: false,
  alertReactions: false,
};

// Tier 2 features on
const TIER_2_ON = {
  idleVariations: true,
  waving: true,
  fatigue: true,
  alertReactions: true,
};

// Tier 3 features off
const TIER_3_OFF = {
  blinking: false,
  shoulderRotation: false,
  headBob: false,
  fingerGrips: false,
  hipSway: false,
};

// Tier 3 features on
const TIER_3_ON = {
  blinking: true,
  shoulderRotation: true,
  headBob: true,
  fingerGrips: true,
  hipSway: true,
};

/**
 * Feature presets by quality level
 */
export const FEATURE_PRESETS: Record<GraphicsQuality, AnimationFeatures> = {
  low: {
    ...TIER_1,
    ...TIER_2_OFF,
    ...TIER_3_OFF,
  },
  medium: {
    ...TIER_1,
    ...TIER_2_ON,
    ...TIER_3_OFF,
  },
  high: {
    ...TIER_1,
    ...TIER_2_ON,
    ...TIER_3_ON,
  },
  ultra: {
    ...TIER_1,
    ...TIER_2_ON,
    ...TIER_3_ON,
  },
};

/**
 * Get features for a given quality level
 */
export function getFeaturesForQuality(quality: GraphicsQuality): AnimationFeatures {
  return FEATURE_PRESETS[quality] ?? FEATURE_PRESETS.medium;
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(
  features: AnimationFeatures,
  feature: keyof AnimationFeatures
): boolean {
  return features[feature] === true;
}
