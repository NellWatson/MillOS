import { describe, expect, it } from 'vitest';
import { CAMERA_DEPTH, EXTERIOR_LAYERS, WATER_LAYERS } from '../renderLayers';
import { DEPTH_REGISTRY } from '../depthRegistry';
import { SITE_LAYOUT } from '../siteLayout';

describe('depth policy', () => {
  it('keeps a finite, uniquely owned, resolved registry', () => {
    const ids = DEPTH_REGISTRY.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(DEPTH_REGISTRY.length).toBeGreaterThan(0);
    expect(
      DEPTH_REGISTRY.every(({ owner, surfaces }) => owner.length > 0 && surfaces.length > 1)
    ).toBe(true);
    expect(DEPTH_REGISTRY.every(({ status }) => status === 'resolved')).toBe(true);
  });

  it('prevents transparent overlays from occluding later transparency', () => {
    const overlays = DEPTH_REGISTRY.filter(
      ({ classification }) => classification === 'transparent-overlay'
    );
    expect(overlays.length).toBeGreaterThan(0);
    expect(overlays.every(({ depthWrite }) => depthWrite === false)).toBe(true);
  });

  it('keeps canonical terrain and water datums in lockstep with render layers', () => {
    expect(SITE_LAYOUT.datum.terrain).toBe(EXTERIOR_LAYERS.ground);
    expect(SITE_LAYOUT.datum.yard).toBe(EXTERIOR_LAYERS.ground);
    expect(SITE_LAYOUT.datum.groundOverlay).toBe(EXTERIOR_LAYERS.groundOverlay);
    expect(SITE_LAYOUT.datum.waterBed).toBe(WATER_LAYERS.bed);
    expect(SITE_LAYOUT.datum.water).toBe(WATER_LAYERS.surface);
  });

  it('uses a precise normal camera range without logarithmic depth', () => {
    expect(CAMERA_DEPTH.near).toBeGreaterThanOrEqual(0.5);
    expect(CAMERA_DEPTH.far).toBeLessThanOrEqual(360);
    expect(CAMERA_DEPTH.far / CAMERA_DEPTH.near).toBeLessThanOrEqual(CAMERA_DEPTH.recommendedRatio);
  });
});
