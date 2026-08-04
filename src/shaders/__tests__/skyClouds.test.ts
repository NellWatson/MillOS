import { describe, expect, it } from 'vitest';
import {
  CLOUD_NOISE_SIZE,
  SKY_CLOUD_GLSL,
  cloudCoverThreshold,
  sampleCloudNoise,
} from '../skyClouds';

describe('sky cloud noise', () => {
  it('tiles seamlessly on both axes', () => {
    // THE DEFECT THIS GUARDS. The dome projection walks off the edge of the
    // texture, so the sampler wraps. A field that does not tile puts a straight
    // line across the sky - the same class of artefact commit ff00221 removed
    // when it replaced the atan branch cut.
    for (let step = 0; step < 32; step += 1) {
      const t = step / 32;
      expect(sampleCloudNoise(0, t)).toBeCloseTo(sampleCloudNoise(1, t), 6);
      expect(sampleCloudNoise(t, 0)).toBeCloseTo(sampleCloudNoise(t, 1), 6);
      expect(sampleCloudNoise(-0.25, t)).toBeCloseTo(sampleCloudNoise(0.75, t), 6);
    }
  });

  it('is deterministic and spans the full unit range', () => {
    expect(sampleCloudNoise(0.31, 0.62)).toBe(sampleCloudNoise(0.31, 0.62));

    let minimum = Infinity;
    let maximum = -Infinity;
    for (let y = 0; y < CLOUD_NOISE_SIZE; y += 1) {
      for (let x = 0; x < CLOUD_NOISE_SIZE; x += 1) {
        const value = sampleCloudNoise(x / CLOUD_NOISE_SIZE, y / CLOUD_NOISE_SIZE);
        if (value < minimum) minimum = value;
        if (value > maximum) maximum = value;
      }
    }
    // Range matters: the coverage threshold slides across this distribution, so
    // a field clustered around 0.5 would make weather all-or-nothing.
    expect(minimum).toBeLessThan(0.02);
    expect(maximum).toBeGreaterThan(0.98);
  });

  it('turns cloud amount into coverage, so clear weather is sparse and opaque', () => {
    const clear = cloudCoverThreshold(0.2);
    const storm = cloudCoverThreshold(0.9);
    expect(storm).toBeLessThan(clear);

    const total = CLOUD_NOISE_SIZE * CLOUD_NOISE_SIZE;
    const coveredFraction = (threshold: number): number => {
      let covered = 0;
      for (let y = 0; y < CLOUD_NOISE_SIZE; y += 1) {
        for (let x = 0; x < CLOUD_NOISE_SIZE; x += 1) {
          if (sampleCloudNoise(x / CLOUD_NOISE_SIZE, y / CLOUD_NOISE_SIZE) > threshold) {
            covered += 1;
          }
        }
      }
      return covered / total;
    };

    // Clear weather must show real, separated clouds - not the 15% uniform
    // tint the six-term sin lattice produced - and a storm must close the sky.
    const clearCover = coveredFraction(clear);
    expect(clearCover).toBeGreaterThan(0.05);
    expect(clearCover).toBeLessThan(0.45);
    expect(coveredFraction(storm)).toBeGreaterThan(0.6);
  });

  it('keeps the branch-cut-free dome projection', () => {
    expect(SKY_CLOUD_GLSL).toContain('dir.xz / ( abs( dir.y ) + 0.5 )');
    expect(SKY_CLOUD_GLSL).not.toContain('atan(');
  });
});
