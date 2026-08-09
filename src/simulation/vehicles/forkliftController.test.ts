import { describe, expect, it } from 'vitest';
import {
  createForkliftRoutePlan,
  createInitialForkliftMotion,
  distanceAheadOnClosedPath,
  sampleForkliftLoadPose,
  stepForkliftMotion,
} from './forkliftController';

const points = [
  [0, 0, 0],
  [10, 0, 0],
  [10, 0, 10],
  [0, 0, 10],
] as const;
const actions = [
  { type: 'pickup', duration: 4 },
  { type: 'none', duration: 0 },
  { type: 'dropoff', duration: 4 },
  { type: 'none', duration: 0 },
] as const;

describe('forklift controller', () => {
  it('builds a closed measured route with operational markers', () => {
    const plan = createForkliftRoutePlan(points, actions);
    expect(plan.path.totalLength).toBeCloseTo(40);
    expect(plan.markers).toHaveLength(2);
    expect(plan.markers[0].action.type).toBe('pickup');
    expect(plan.markers[1].action.type).toBe('dropoff');
  });

  it('moves by arc length and produces steering on a corner', () => {
    const plan = createForkliftRoutePlan(points, actions);
    let state = createInitialForkliftMotion(plan, [0, 0, 0]);
    let maximumSteering = 0;
    for (let index = 0; index < 600; index += 1) {
      state = stepForkliftMotion(state, plan, {
        targetSpeed: 2,
        stopReason: 'none',
        loaded: false,
        deltaSeconds: 1 / 60,
      });
      maximumSteering = Math.max(maximumSteering, Math.abs(state.steeringAngle));
    }
    expect(state.wheelTravel).toBeGreaterThan(10);
    expect(maximumSteering).toBeGreaterThan(0);
    expect(Number.isFinite(state.heading)).toBe(true);
  });

  it('decelerates under a safety hold without advancing indefinitely', () => {
    const plan = createForkliftRoutePlan(points, actions);
    let state = createInitialForkliftMotion(plan, [0, 0, 0]);
    for (let index = 0; index < 180; index += 1) {
      state = stepForkliftMotion(state, plan, {
        targetSpeed: 2,
        stopReason: 'none',
        loaded: false,
        deltaSeconds: 1 / 60,
      });
    }
    const holdStart = state.routeDistance;
    for (let index = 0; index < 180; index += 1) {
      state = stepForkliftMotion(state, plan, {
        targetSpeed: 2,
        stopReason: 'route-blocked',
        loaded: false,
        deltaSeconds: 1 / 60,
      });
    }
    expect(state.speed).toBeCloseTo(0);
    expect(distanceAheadOnClosedPath(plan.path, holdStart, state.routeDistance)).toBeLessThan(3);
    expect(state.stopReason).toBe('route-blocked');
  });

  it('uses a lower loaded speed envelope', () => {
    const plan = createForkliftRoutePlan(points, actions);
    let state = createInitialForkliftMotion(plan, [0, 0, 0]);
    for (let index = 0; index < 600; index += 1) {
      state = stepForkliftMotion(state, plan, {
        targetSpeed: 3.5,
        stopReason: 'none',
        loaded: true,
        deltaSeconds: 1 / 60,
      });
    }
    expect(state.speed).toBeCloseTo(1.8);
  });

  it('publishes explicit pickup phases and attaches cargo only after engagement', () => {
    expect(sampleForkliftLoadPose('pickup', 0.05, 1.2).phase).toBe('aligning');
    expect(sampleForkliftLoadPose('pickup', 0.4, 1.2).cargoEngaged).toBe(true);
    expect(sampleForkliftLoadPose('pickup', 0.7, 1.2).mastTilt).toBeLessThan(0);
    expect(sampleForkliftLoadPose('pickup', 1, 1.2).operationComplete).toBe(true);
  });

  it('places and disengages a carried pallet in distinct phases', () => {
    const placing = sampleForkliftLoadPose('dropoff', 0.4, 1.2);
    const disengaged = sampleForkliftLoadPose('dropoff', 0.65, 1.2);
    expect(placing.phase).toBe('placing');
    expect(placing.cargoEngaged).toBe(true);
    expect(disengaged.phase).toBe('disengaging');
    expect(disengaged.cargoEngaged).toBe(false);
  });
});
