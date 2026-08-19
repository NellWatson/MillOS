import { describe, expect, it } from 'vitest';
import { SITE_LAYOUT } from '../../constants/siteLayout';
import { resolveCameraCollision } from '../cameraCollision';

describe('camera collision', () => {
  it('stops a camera before a canonical machine footprint', () => {
    const result = resolveCameraCollision([-18, 3, -30], [-18, 3, -15]);

    expect(result.collidedWith).toBe('silo-0');
    expect(result.position[2]).toBeLessThan(-24);
  });

  it('prevents crossing a solid factory wall', () => {
    const result = resolveCameraCollision([30, 5, 45], [30, 5, 55]);

    expect(result.collidedWith).toBe('shipping-wall');
    expect(result.position[2]).toBeLessThan(SITE_LAYOUT.factory.bounds.maxZ);
  });

  it('permits crossing through the shipping portal', () => {
    const result = resolveCameraCollision([0, 5, 45], [0, 5, 55]);

    expect(result.collidedWith).toBeNull();
    expect(result.position).toEqual([0, 5, 55]);
  });

  it('blocks a camera that is too tall for the shipping portal', () => {
    const result = resolveCameraCollision([0, 15, 45], [0, 15, 55]);

    expect(result.collidedWith).toBe('shipping-wall');
  });

  it('permits a low camera through a service portal', () => {
    const result = resolveCameraCollision([55, 2, -20], [65, 2, -20], 0.4);

    expect(result.collidedWith).toBeNull();
    expect(result.position[0]).toBe(65);
  });

  it('clamps camera height and world radius', () => {
    const result = resolveCameraCollision([200, 3, 0], [400, -5, 0]);

    expect(result.collidedWith).toBe('world-boundary');
    expect(result.position[1]).toBe(1.5);
    expect(Math.hypot(result.position[0], result.position[2])).toBeLessThan(
      SITE_LAYOUT.world.radius
    );
  });
});
