import { describe, expect, it } from 'vitest';
import {
  FORKLIFT_MAXIMUM_STEERING_RADIANS,
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

  it('preserves route progress across common and degraded rendering frequencies', () => {
    const plan = createForkliftRoutePlan(points, actions);
    const simulate = (framesPerSecond: number) => {
      let state = createInitialForkliftMotion(plan, [0, 0, 0]);
      for (let frame = 0; frame < framesPerSecond * 20; frame += 1) {
        state = stepForkliftMotion(state, plan, {
          targetSpeed: 2,
          stopReason: 'none',
          loaded: false,
          deltaSeconds: 1 / framesPerSecond,
        });
      }
      return state;
    };

    const results = [15, 30, 60, 120].map(simulate);
    const wheelTravel = results.map((state) => state.wheelTravel);
    expect(Math.max(...wheelTravel) - Math.min(...wheelTravel)).toBeLessThan(0.05);
    for (const state of results) {
      expect(Number.isFinite(state.x)).toBe(true);
      expect(Number.isFinite(state.z)).toBe(true);
      expect(Math.abs(state.steeringAngle)).toBeLessThanOrEqual(FORKLIFT_MAXIMUM_STEERING_RADIANS);
    }
  });

  it('stops for an emergency, holds position, and resumes without a jump', () => {
    const plan = createForkliftRoutePlan(points, actions);
    let state = createInitialForkliftMotion(plan, [0, 0, 0]);
    for (let frame = 0; frame < 180; frame += 1) {
      state = stepForkliftMotion(state, plan, {
        targetSpeed: 2,
        stopReason: 'none',
        loaded: false,
        deltaSeconds: 1 / 60,
      });
    }

    const emergencyStart = state.wheelTravel;
    for (let frame = 0; frame < 180; frame += 1) {
      state = stepForkliftMotion(state, plan, {
        targetSpeed: 2,
        stopReason: 'emergency-stop',
        loaded: false,
        deltaSeconds: 1 / 60,
      });
    }
    const stoppedAt = state.wheelTravel;
    expect(stoppedAt - emergencyStart).toBeLessThan(3);
    expect(state.speed).toBe(0);
    expect(state.stopReason).toBe('emergency-stop');

    for (let frame = 0; frame < 120; frame += 1) {
      state = stepForkliftMotion(state, plan, {
        targetSpeed: 2,
        stopReason: 'none',
        loaded: false,
        deltaSeconds: 1 / 60,
      });
    }
    expect(state.wheelTravel).toBeGreaterThan(stoppedAt);
    expect(state.stopReason).toBe('none');
  });

  it('honours a finite movement authority without overshoot', () => {
    const plan = createForkliftRoutePlan(points, actions);
    let state = createInitialForkliftMotion(plan, [0, 0, 0]);
    for (let frame = 0; frame < 180; frame += 1) {
      state = stepForkliftMotion(state, plan, {
        targetSpeed: 2,
        stopReason: 'none',
        loaded: false,
        deltaSeconds: 1 / 60,
      });
    }

    const wheelTravel = state.wheelTravel;
    state = stepForkliftMotion(state, plan, {
      targetSpeed: 2,
      stopReason: 'none',
      loaded: false,
      deltaSeconds: 1 / 60,
      maximumTravelDistance: 0.01,
    });
    expect(state.wheelTravel - wheelTravel).toBeCloseTo(0.01);
    expect(state.speed).toBe(0);
  });

  it('substeps a dropped frame without violating a nearby movement authority', () => {
    const plan = createForkliftRoutePlan(points, actions);
    let state = createInitialForkliftMotion(plan, [0, 0, 0]);
    for (let frame = 0; frame < 180; frame += 1) {
      state = stepForkliftMotion(state, plan, {
        targetSpeed: 2,
        stopReason: 'none',
        loaded: false,
        deltaSeconds: 1 / 60,
      });
    }

    const wheelTravel = state.wheelTravel;
    state = stepForkliftMotion(state, plan, {
      targetSpeed: 2,
      stopReason: 'none',
      loaded: false,
      deltaSeconds: 0.2,
      maximumTravelDistance: 0.08,
    });
    expect(state.wheelTravel - wheelTravel).toBeCloseTo(0.08);
    expect(state.speed).toBe(0);
  });
});
