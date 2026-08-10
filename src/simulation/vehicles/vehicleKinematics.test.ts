import { describe, expect, it } from 'vitest';
import {
  advanceLongitudinalMotion,
  calculateSignedTravel,
  createArcLengthPath,
  findNearestPathDistance,
  integrateTrailerYaw,
  resolveAckermannSteering,
  sampleArcLengthPath,
  shortestVehicleAngle,
} from './vehicleKinematics';

describe('vehicle kinematics', () => {
  it('addresses an authored path by measured distance', () => {
    const path = createArcLengthPath([
      { x: 0, z: 0 },
      { x: 3, z: 0 },
      { x: 3, z: 4 },
    ]);

    expect(path.totalLength).toBeCloseTo(7);
    expect(sampleArcLengthPath(path, 1.5)).toMatchObject({ x: 1.5, z: 0 });
    expect(sampleArcLengthPath(path, 5)).toMatchObject({ x: 3, z: 2 });
    expect(findNearestPathDistance(path, 2.9, 2)).toBeCloseTo(5);
  });

  it('wraps a closed path without introducing a pose discontinuity', () => {
    const path = createArcLengthPath(
      [
        { x: 0, z: 0 },
        { x: 2, z: 0 },
        { x: 2, z: 2 },
        { x: 0, z: 2 },
      ],
      true
    );
    const beforeWrap = sampleArcLengthPath(path, path.totalLength - 0.001);
    const afterWrap = sampleArcLengthPath(path, path.totalLength + 0.001);
    expect(Math.hypot(afterWrap.x - beforeWrap.x, afterWrap.z - beforeWrap.z)).toBeLessThan(0.01);
  });

  it('rejects bad paths instead of publishing non-finite motion', () => {
    expect(() => createArcLengthPath([{ x: 0, z: 0 }])).toThrow(/at least two/);
    expect(() =>
      createArcLengthPath([
        { x: 0, z: 0 },
        { x: Number.NaN, z: 1 },
      ])
    ).toThrow(/non-finite/);
  });

  it('limits acceleration and jerk while converging without overshoot', () => {
    const limits = {
      maximumForwardSpeed: 3.5,
      maximumReverseSpeed: 1.5,
      maximumAcceleration: 1.2,
      maximumDeceleration: 1.8,
      maximumJerk: 2.4,
    };
    let state = { speed: 0, acceleration: 0 };
    for (let index = 0; index < 600; index += 1) {
      const next = advanceLongitudinalMotion(state, 3, 1 / 60, limits);
      expect(Math.abs(next.acceleration - state.acceleration)).toBeLessThanOrEqual(2.4 / 60 + 1e-8);
      expect(next.speed).toBeLessThanOrEqual(3);
      state = next;
    }
    expect(state.speed).toBeCloseTo(3);
    expect(state.acceleration).toBeCloseTo(0);
  });

  it('supports controlled reverse without exceeding the reverse limit', () => {
    const limits = {
      maximumForwardSpeed: 5,
      maximumReverseSpeed: 1.5,
      maximumAcceleration: 1,
      maximumDeceleration: 2,
      maximumJerk: 4,
    };
    let state = { speed: 0, acceleration: 0 };
    for (let index = 0; index < 300; index += 1) {
      state = advanceLongitudinalMotion(state, -3, 1 / 60, limits);
    }
    expect(state.speed).toBeCloseTo(-1.5);
  });

  it('derives distinct inner and outer Ackermann angles', () => {
    const steering = resolveAckermannSteering(0.18, 1.55, 1.05, 0.56);
    expect(steering.inner).toBeGreaterThan(steering.centre);
    expect(steering.centre).toBeGreaterThan(steering.outer);
    expect(steering.inner).toBeLessThanOrEqual(0.56);
    const mirrored = resolveAckermannSteering(-0.18, 1.55, 1.05, 0.56);
    expect(mirrored.centre).toBeCloseTo(-steering.centre);
  });

  it('integrates trailer yaw toward a turning tractor and bounds articulation', () => {
    let trailerYaw = 0;
    for (let index = 0; index < 180; index += 1) {
      trailerYaw = integrateTrailerYaw(trailerYaw, 0.35, 4, 8.2, 0.7, 1 / 60);
    }
    expect(trailerYaw).toBeGreaterThan(0);
    expect(Math.abs(shortestVehicleAngle(trailerYaw, 0.35))).toBeLessThanOrEqual(0.7);
  });

  it('preserves signed wheel travel in forward and reverse', () => {
    expect(calculateSignedTravel({ x: 0, z: 0 }, { x: 0, z: 2 }, 0)).toBeCloseTo(2);
    expect(calculateSignedTravel({ x: 0, z: 0 }, { x: 0, z: -2 }, 0)).toBeCloseTo(-2);
  });
});
