import type { AtmosphereWeather } from './atmosphere';

export interface WanderBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export interface AnimalWanderPlan {
  readonly x: number;
  readonly z: number;
  readonly idleSeconds: number;
}

const UINT32_RANGE = 0x1_0000_0000;

/** Stable pseudo-random sample for authored ambient motion and replay capture. */
export function sampleAmbientSequence(seed: number, step: number): number {
  let value = (Math.imul(seed + 1, 0x45d9f3b) ^ Math.imul(step + 1, 0x119de1f3)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  return ((value ^ (value >>> 16)) >>> 0) / UINT32_RANGE;
}

/** One deterministic target and rest interval for a farm animal. */
export function createAnimalWanderPlan(
  seed: number,
  step: number,
  bounds: WanderBounds
): AnimalWanderPlan {
  return {
    x: bounds.minX + sampleAmbientSequence(seed, step * 3) * (bounds.maxX - bounds.minX),
    z: bounds.minZ + sampleAmbientSequence(seed, step * 3 + 1) * (bounds.maxZ - bounds.minZ),
    idleSeconds: 2 + sampleAmbientSequence(seed, step * 3 + 2) * 4,
  };
}

/**
 * Animals remain present in poor weather and at night, while roaming less.
 * This keeps the farm alive without making livestock ignore the shared world.
 */
export function getAnimalActivityMultiplier(weather: AtmosphereWeather, hour: number): number {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const daylightActivity =
    normalizedHour < 6 || normalizedHour >= 21
      ? 0.25
      : normalizedHour < 8 || normalizedHour >= 19
        ? 0.65
        : 1;
  const weatherActivity = weather === 'storm' ? 0.2 : weather === 'rain' ? 0.55 : 1;
  return daylightActivity * weatherActivity;
}

/** Windmill speed in radians per second, driven by the canonical atmosphere wind scalar. */
export function getWindmillAngularSpeed(wind: number): number {
  return 0.3 + Math.max(0, Math.min(1, wind));
}

/** Local water height within a culvert, from dry-weather trickle to storm discharge. */
export function getCulvertWaterHeight(
  radius: number,
  wetness: number,
  precipitation: number
): number {
  const response = Math.max(0, Math.min(1, wetness * 0.55 + precipitation * 0.45));
  return -radius * (0.52 - response * 0.34);
}
