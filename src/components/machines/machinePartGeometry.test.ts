import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { MACHINE_PART_GEOMETRY } from './CompactMachines';

/**
 * Machine parts are shared unit geometry instanced with hand-tuned non-uniform
 * scales, and they are positioned against each other in world space: the
 * stiffener rings stand proud of the silo shell, the roof eave overhangs it,
 * the fan grille sits buried in the mill body panel. Every one of those
 * relationships is expressed as a raw number in the instance matrices rather
 * than derived from the geometry, so reshaping a part is only safe while its
 * unit half-extents stay exactly where they were.
 *
 * These are the half-extents the instance matrices in CompactMachines assume.
 * A failure here means a geometry change moved a part relative to neighbours
 * that were never told about it - fix the geometry, not this table.
 */
const EXPECTED_HALF_EXTENTS: Record<
  keyof typeof MACHINE_PART_GEOMETRY,
  readonly [number, number, number]
> = {
  siloShell: [1, 0.5, 1],
  siloRoof: [1, 0.5, 1],
  siloOutlet: [1, 0.5, 1],
  siloRing: [1.03, 0.04, 1.03],
  hopper: [1, 0.5, 1],
  roller: [1, 0.5, 1],
  inlet: [1, 0.5, 1],
  beacon: [1, 1, 1],
  // Ring outline in XY, tube along Z - three.js orients a torus that way, and
  // the grille is instanced at [0.78, 0.52, 0.09], so Z is the squashed axis.
  fanGrille: [1.1, 1.1, 0.1],
};

const halfExtents = (geometry: THREE.BufferGeometry): [number, number, number] => {
  const position = geometry.getAttribute('position');
  let x = 0;
  let y = 0;
  let z = 0;
  for (let index = 0; index < position.count; index += 1) {
    x = Math.max(x, Math.abs(position.getX(index)));
    y = Math.max(y, Math.abs(position.getY(index)));
    z = Math.max(z, Math.abs(position.getZ(index)));
  }
  return [x, y, z];
};

describe('shared machine part geometry', () => {
  it('keeps every shared geometry finite', () => {
    for (const [name, geometry] of Object.entries(MACHINE_PART_GEOMETRY)) {
      const position = geometry.getAttribute('position');
      expect(position, `${name} should have position data`).toBeDefined();
      for (let index = 0; index < position.count; index += 1) {
        expect(Number.isFinite(position.getX(index)), `${name} x${index}`).toBe(true);
        expect(Number.isFinite(position.getY(index)), `${name} y${index}`).toBe(true);
        expect(Number.isFinite(position.getZ(index)), `${name} z${index}`).toBe(true);
      }
    }
  });

  it('holds the unit envelope every instance matrix is tuned against', () => {
    for (const [name, expected] of Object.entries(EXPECTED_HALF_EXTENTS)) {
      const geometry = MACHINE_PART_GEOMETRY[name as keyof typeof MACHINE_PART_GEOMETRY];
      const actual = halfExtents(geometry);
      for (let axis = 0; axis < 3; axis += 1) {
        expect(actual[axis], `${name} half-extent on ${'xyz'[axis]}`).toBeCloseTo(
          expected[axis],
          4
        );
      }
    }
  });

  it('keeps the stiffener rings standing proud of the corrugated shell', () => {
    // The shell corrugation cuts inward from radius 1.0 and the rings sit at
    // 1.03. If a shell change ever pushed past the rings they would be
    // swallowed by the wall instead of reading as bolted bands.
    const [shellX] = halfExtents(MACHINE_PART_GEOMETRY.siloShell);
    const [ringX] = halfExtents(MACHINE_PART_GEOMETRY.siloRing);
    expect(ringX).toBeGreaterThan(shellX);
  });

  it('gives the bin roof an eave lip and a peak collar', () => {
    // The silhouette features that make the roof read as a grain bin rather
    // than a cone: full radius at the rim, and a narrow collar still standing
    // at the very top instead of tapering to a point.
    const position = MACHINE_PART_GEOMETRY.siloRoof.getAttribute('position');
    let radiusAtRim = 0;
    let radiusAtPeak = 0;
    for (let index = 0; index < position.count; index += 1) {
      const y = position.getY(index);
      const radius = Math.hypot(position.getX(index), position.getZ(index));
      if (y <= -0.49) radiusAtRim = Math.max(radiusAtRim, radius);
      if (y >= 0.49) radiusAtPeak = Math.max(radiusAtPeak, radius);
    }
    expect(radiusAtRim).toBeCloseTo(1, 4);
    expect(radiusAtPeak).toBeGreaterThan(0.05);
    expect(radiusAtPeak).toBeLessThan(0.2);
  });

  it('matches the roof and ring facets to the shell so edges do not beat', () => {
    // Shared facet boundaries only line up when the segment counts agree.
    // Counting distinct angles is resolution-independent, unlike vertex counts.
    const distinctAngles = (geometry: THREE.BufferGeometry): number => {
      const position = geometry.getAttribute('position');
      const angles = new Set<string>();
      for (let index = 0; index < position.count; index += 1) {
        const x = position.getX(index);
        const z = position.getZ(index);
        if (Math.hypot(x, z) < 1e-6) continue; // poles and cap centres
        angles.add(Math.atan2(z, x).toFixed(4));
      }
      return angles.size;
    };

    const shell = distinctAngles(MACHINE_PART_GEOMETRY.siloShell);
    expect(distinctAngles(MACHINE_PART_GEOMETRY.siloRoof)).toBe(shell);
    expect(distinctAngles(MACHINE_PART_GEOMETRY.siloRing)).toBe(shell);
  });
});
