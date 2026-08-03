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

    water.dispose();
    bank.dispose();
  });

  it('closes the shoreline seam exactly', () => {
    const segments = 24;
    const water = createOrganicLakeSurfaceGeometry(12, 8, segments);
    const positions = water.getAttribute('position');
    const boundaryOffset = 1;

    expect(positions.getX(boundaryOffset)).toBeCloseTo(
      positions.getX(boundaryOffset + segments),
      6
    );
    expect(positions.getY(boundaryOffset)).toBeCloseTo(
      positions.getY(boundaryOffset + segments),
      6
    );

    water.dispose();
  });
});
