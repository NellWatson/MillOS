import { describe, expect, it } from 'vitest';
import {
  createOrganicLakeBankGeometry,
  createOrganicLakeSurfaceGeometry,
} from './organicLakeGeometry';

function expectFiniteGeometry(geometry: ReturnType<typeof createOrganicLakeSurfaceGeometry>) {
  const positions = geometry.getAttribute('position');
  expect(positions.count).toBeGreaterThan(0);
  for (let index = 0; index < positions.array.length; index += 1) {
    expect(Number.isFinite(positions.array[index])).toBe(true);
  }
  expect(geometry.index?.count ?? 0).toBeGreaterThan(0);
  expect(Number.isFinite(geometry.boundingSphere?.radius)).toBe(true);
}

describe('organic lake geometry', () => {
  it('creates finite subdivided water and non-overlapping bank meshes', () => {
    const water = createOrganicLakeSurfaceGeometry(19, 13, 72);
    const bank = createOrganicLakeBankGeometry(19, 13, 22, 16, 72);

    expectFiniteGeometry(water);
    expectFiniteGeometry(bank);
    expect(water.getAttribute('uv').count).toBe(water.getAttribute('position').count);
    expect(bank.getAttribute('color').count).toBe(bank.getAttribute('position').count);
    expect(water.getAttribute('position').count).toBeGreaterThan(72 * 4);

    const bankPositions = bank.getAttribute('position');
    const bankHeights = Array.from({ length: bankPositions.count }, (_, index) =>
      bankPositions.getZ(index)
    );
    expect(Math.max(...bankHeights) - Math.min(...bankHeights)).toBeGreaterThan(0.1);

    water.dispose();
    bank.dispose();
  });

  it('closes the shoreline seam exactly', () => {
    const segments = 24;
    const water = createOrganicLakeSurfaceGeometry(12, 8, segments);
    const positions = water.getAttribute('position');
    const radialSegments = (positions.count - 1) / (segments + 1);
    expect(Number.isInteger(radialSegments)).toBe(true);
    for (let ring = 0; ring < radialSegments; ring += 1) {
      const first = 1 + ring * (segments + 1);
      const last = first + segments;
      expect(positions.getX(first)).toBeCloseTo(positions.getX(last), 6);
      expect(positions.getY(first)).toBeCloseTo(positions.getY(last), 6);
    }

    water.dispose();
  });
});
