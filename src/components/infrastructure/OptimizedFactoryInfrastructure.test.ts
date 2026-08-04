import { describe, expect, it } from 'vitest';
import { SITE_LAYOUT } from '../../constants/siteLayout';
import {
  FACTORY_ENVELOPE_SPEC,
  FLOOR_JOINT_PITCH,
  sampleFloorMacro,
} from './OptimizedFactoryInfrastructure';

describe('optimized factory envelope', () => {
  it('keeps a complete structural envelope around large glazed bays', () => {
    expect(FACTORY_ENVELOPE_SPEC.baseHeight).toBeGreaterThan(0);
    expect(FACTORY_ENVELOPE_SPEC.sideWindowSill).toBeGreaterThan(FACTORY_ENVELOPE_SPEC.baseHeight);
    expect(FACTORY_ENVELOPE_SPEC.windowHead).toBeGreaterThan(
      FACTORY_ENVELOPE_SPEC.sideWindowSill + 12
    );
    expect(FACTORY_ENVELOPE_SPEC.topBandBottom).toBeGreaterThanOrEqual(
      FACTORY_ENVELOPE_SPEC.windowHead
    );
    expect(FACTORY_ENVELOPE_SPEC.topBandTop).toBe(SITE_LAYOUT.factory.bounds.maxY);
  });

  it('keeps the dock openings clear below their glazed upper bays', () => {
    expect(FACTORY_ENVELOPE_SPEC.dockWindowSill).toBeGreaterThanOrEqual(
      SITE_LAYOUT.portals.shipping.height
    );
    expect(FACTORY_ENVELOPE_SPEC.dockWindowSill).toBeGreaterThanOrEqual(
      SITE_LAYOUT.portals.receiving.height
    );
  });

  it('uses broad, evenly spaced window bays on every facade', () => {
    expect(FACTORY_ENVELOPE_SPEC.frontBayCentres).toEqual([-50, -30, -10, 10, 30, 50]);
    expect(FACTORY_ENVELOPE_SPEC.sideBayCentres).toEqual([-40, -20, 0, 20, 40]);
  });
});

/**
 * The slab layout is asserted through its pure sampler rather than by reading
 * a megapixel back: the point of the macro layer is that the surface differs
 * from place to place, and every claim below is a place-to-place comparison.
 */
describe('interior slab macro surface', () => {
  /**
   * Open floor: clear of every lane, dock apron, machine, joint and wall.
   * (-4, -34.4) looks open and is not - it sits inside the receiving apron.
   */
  const OPEN_FLOOR = sampleFloorMacro(-22.5, -14.5);

  it('polishes the forklift routes and leaves the open floor matte', () => {
    const route = sampleFloorMacro(31, 12.3);
    expect(route.roughness).toBeLessThan(0.5);
    expect(OPEN_FLOOR.roughness).toBeGreaterThan(0.8);
    expect(route.roughness).toBeLessThan(OPEN_FLOOR.roughness - 0.3);
  });

  it('polishes the pedestrian walkways less than the forklift routes', () => {
    const walkway = sampleFloorMacro(-39, 12.3);
    const route = sampleFloorMacro(-31, 12.3);
    expect(walkway.roughness).toBeLessThan(OPEN_FLOOR.roughness);
    expect(walkway.roughness).toBeGreaterThan(route.roughness);
  });

  it('cuts a darker, rougher, more occluded expansion joint on the pitch', () => {
    const joint = sampleFloorMacro(FLOOR_JOINT_PITCH * 2, -34.4);
    const beside = sampleFloorMacro(FLOOR_JOINT_PITCH * 2 + 2.5, -34.4);
    expect(joint.tone).toBeLessThan(beside.tone - 0.08);
    expect(joint.roughness).toBeGreaterThan(beside.roughness);
    expect(joint.ao).toBeLessThan(beside.ao - 0.3);
  });

  it('darkens and occludes the wall line', () => {
    const wallLine = sampleFloorMacro(-58.6, -34.4);
    expect(wallLine.ao).toBeLessThan(OPEN_FLOOR.ao - 0.2);
    expect(wallLine.tone).toBeLessThan(OPEN_FLOOR.tone);
  });

  it('stains the mill line with oil and the packing line with flour dust', () => {
    const millCentre = SITE_LAYOUT.machines.rollerMills[0].position;
    const oil = sampleFloorMacro(millCentre[0], millCentre[2]);
    expect(oil.tone).toBeLessThan(OPEN_FLOOR.tone);
    expect(oil.roughness).toBeLessThan(0.55);

    const packerCentre = SITE_LAYOUT.machines.packers[1].position;
    const dust = sampleFloorMacro(packerCentre[0], packerCentre[2]);
    expect(dust.roughness).toBeGreaterThan(0.9);
  });

  it('never leaves a channel outside the byte range the texture writer needs', () => {
    for (let x = -60; x <= 60; x += 3.7) {
      for (let z = -50; z <= 50; z += 4.3) {
        const sample = sampleFloorMacro(x, z, 0.02, 0.98, 0.5);
        expect(sample.tone).toBeGreaterThanOrEqual(0);
        expect(sample.tone).toBeLessThanOrEqual(1);
        expect(sample.roughness).toBeGreaterThanOrEqual(0);
        expect(sample.roughness).toBeLessThanOrEqual(1);
        expect(sample.ao).toBeGreaterThanOrEqual(0);
        expect(sample.ao).toBeLessThanOrEqual(1);
      }
    }
  });
});
