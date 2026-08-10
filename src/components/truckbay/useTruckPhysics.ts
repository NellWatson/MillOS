import { SITE_LAYOUT } from '../../constants/siteLayout';

export type TruckPhase =
  | 'entering'
  | 'slowing'
  | 'turning_in'
  | 'straightening'
  | 'positioning'
  | 'stopping_to_back'
  | 'backing'
  | 'final_adjustment'
  | 'docked'
  | 'preparing_to_leave'
  | 'pulling_out'
  | 'turning_out'
  | 'accelerating'
  | 'leaving';

export type TruckServicePhase =
  | 'approach'
  | 'parking-brake'
  | 'chocking'
  | 'dock-locking'
  | 'leveler-deploying'
  | 'door-opening'
  | 'transfer'
  | 'door-closing'
  | 'leveler-stowing'
  | 'dock-unlocking'
  | 'unchocking'
  | 'departure-ready';

export interface TruckAnimState {
  phase: TruckPhase;
  x: number;
  z: number;
  rotation: number;
  speed: number;
  steeringAngle: number;
  brakeLights: boolean;
  reverseLights: boolean;
  leftSignal: boolean;
  rightSignal: boolean;
  trailerAngle: number;
  cabRoll: number;
  cabPitch: number;
  throttle: number;
  doorsOpen: boolean;
  doorOpenAmount: number;
  landingGearAmount: number;
  servicePhase: TruckServicePhase;
  active: boolean;
  parkingBrake: boolean;
  chocksDeployed: boolean;
  dockLocked: boolean;
  levelerDeployed: boolean;
  articulation: number;
}

export function isTruckDockedPhase(phase: TruckPhase): boolean {
  return phase === 'final_adjustment' || phase === 'docked' || phase === 'preparing_to_leave';
}

export function isTruckGuidingPhase(phase: TruckPhase): boolean {
  return phase === 'backing' || phase === 'final_adjustment';
}

/** Gate motion follows the truck cycle rather than an unrelated decorative timer. */
export function isTruckGateOpenPhase(phase: TruckPhase): boolean {
  return (
    phase === 'entering' || phase === 'slowing' || phase === 'accelerating' || phase === 'leaving'
  );
}

/** Subtle loaded-trailer suspension compression, bounded against bad telemetry. */
export function resolveTrailerLoadSettle(loadRatio: number): number {
  if (!Number.isFinite(loadRatio)) return 0;
  return Math.max(0, Math.min(1, loadRatio)) * 0.08;
}

export function applyTruckSafetyHold(state: TruckAnimState): TruckAnimState {
  return {
    ...state,
    speed: 0,
    steeringAngle: 0,
    brakeLights: true,
    reverseLights: false,
    leftSignal: false,
    rightSignal: false,
    cabRoll: 0,
    cabPitch: 0,
    throttle: 0,
  };
}

export const TRUCK_CYCLE_SECONDS = 60;

export const TRUCK_PHASE_DURATIONS = {
  entering: 7,
  slowing: 3,
  turning_in: 5,
  straightening: 2,
  positioning: 2,
  stopping_to_back: 1,
  backing: 6,
  final_adjustment: 2,
  docked: 14,
  preparing_to_leave: 2,
  pulling_out: 4,
  turning_out: 5,
  accelerating: 4,
  leaving: 3,
} as const satisfies Record<TruckPhase, number>;

const PHASE_ORDER = Object.keys(TRUCK_PHASE_DURATIONS) as TruckPhase[];

export const TRUCK_PHASE_STARTS = PHASE_ORDER.reduce(
  (starts, phase) => {
    const priorPhase = PHASE_ORDER[PHASE_ORDER.indexOf(phase) - 1];
    starts[phase] = priorPhase ? starts[priorPhase] + TRUCK_PHASE_DURATIONS[priorPhase] : 0;
    return starts;
  },
  {} as Record<TruckPhase, number>
);

const BENCHMARK_PHASE_OFFSET_SECONDS = 0.5;

/**
 * Starts fixed-camera captures with the featured truck performing a visible,
 * safety-relevant manoeuvre near its dock. The ordinary simulation clock is
 * untouched; this is used only when the deterministic benchmark runtime names
 * a shipping or receiving scene.
 */
export function getTruckBenchmarkControllerStart(scene: string): number | null {
  if (scene === 'shipping') {
    return TRUCK_PHASE_STARTS.turning_in + BENCHMARK_PHASE_OFFSET_SECONDS;
  }
  if (scene === 'receiving') {
    return (
      (TRUCK_PHASE_STARTS.backing +
        BENCHMARK_PHASE_OFFSET_SECONDS -
        TRUCK_CYCLE_SECONDS / 2 +
        TRUCK_CYCLE_SECONDS) %
      TRUCK_CYCLE_SECONDS
    );
  }
  return null;
}

const DOCK_START_SECONDS = TRUCK_PHASE_STARTS.docked;
const DEPARTURE_SECONDS = TRUCK_PHASE_STARTS.preparing_to_leave;

interface Pose {
  readonly x: number;
  readonly z: number;
  readonly rotation: number;
}

const SHIPPING_DOCK = SITE_LAYOUT.docks.shipping.bayCentre;
const SHIPPING_POSES = {
  tunnelIncoming: { x: 20, z: 238, rotation: Math.PI },
  highway: { x: 20, z: 118, rotation: Math.PI },
  approach: { x: 20, z: 94, rotation: Math.PI },
  turnEnd: { x: -10, z: 78, rotation: 0 },
  straightEnd: { x: -7, z: 74, rotation: 0 },
  positioningEnd: { x: -4, z: 70, rotation: 0 },
  backingEnd: { x: 0, z: 64, rotation: 0 },
  dock: { x: SHIPPING_DOCK[0], z: SHIPPING_DOCK[2], rotation: 0 },
  pullout: { x: 0, z: 80, rotation: 0 },
  exitRoad: { x: 20, z: 108, rotation: 0 },
  acceleratingEnd: { x: 20, z: 165, rotation: 0 },
  tunnelOutgoing: { x: 20, z: 238, rotation: 0 },
} as const satisfies Record<string, Pose>;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const smoothstep = (value: number): number => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const smootherstep = (value: number): number => {
  const t = clamp01(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const lerp = (start: number, end: number, t: number): number => start + (end - start) * t;
const normalizeAngle = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));
const lerpAngle = (start: number, end: number, t: number): number =>
  start + normalizeAngle(end - start) * t;

const linearPose = (start: Pose, end: Pose, t: number): Pose => ({
  x: lerp(start.x, end.x, t),
  z: lerp(start.z, end.z, t),
  rotation: lerpAngle(start.rotation, end.rotation, t),
});

const cubicBezier = (
  start: Pose,
  controlA: readonly [number, number],
  controlB: readonly [number, number],
  end: Pose,
  t: number
): Pose => {
  const inverse = 1 - t;
  return {
    x:
      inverse ** 3 * start.x +
      3 * inverse * inverse * t * controlA[0] +
      3 * inverse * t * t * controlB[0] +
      t ** 3 * end.x,
    z:
      inverse ** 3 * start.z +
      3 * inverse * inverse * t * controlA[1] +
      3 * inverse * t * t * controlB[1] +
      t ** 3 * end.z,
    rotation: lerpAngle(start.rotation, end.rotation, smootherstep(t)),
  };
};

const baseState = (
  phase: TruckPhase,
  pose: Pose,
  speed: number,
  overrides: Partial<TruckAnimState> = {}
): TruckAnimState => ({
  phase,
  x: pose.x,
  z: pose.z,
  rotation: normalizeAngle(pose.rotation),
  speed,
  steeringAngle: 0,
  brakeLights: false,
  reverseLights: false,
  leftSignal: false,
  rightSignal: false,
  trailerAngle: 0,
  cabRoll: 0,
  cabPitch: 0,
  throttle: speed === 0 ? 0 : Math.min(1, Math.abs(speed) / 18),
  doorsOpen: false,
  doorOpenAmount: 0,
  landingGearAmount: 0,
  servicePhase: 'approach',
  active: true,
  parkingBrake: false,
  chocksDeployed: false,
  dockLocked: false,
  levelerDeployed: false,
  articulation: 0,
  ...overrides,
});

const getPhaseProgress = (cycle: number, phase: TruckPhase): number =>
  (cycle - TRUCK_PHASE_STARTS[phase]) / TRUCK_PHASE_DURATIONS[phase];

export function getTruckPhase(cycleSeconds: number): TruckPhase {
  const cycle = ((cycleSeconds % TRUCK_CYCLE_SECONDS) + TRUCK_CYCLE_SECONDS) % TRUCK_CYCLE_SECONDS;
  return (
    PHASE_ORDER.find((phase) => cycle < TRUCK_PHASE_STARTS[phase] + TRUCK_PHASE_DURATIONS[phase]) ??
    'leaving'
  );
}

/**
 * BODY ATTITUDE. `cabPitch` and `cabRoll` were authored at +/-0.025 and
 * `steeringAngle * 0.055` - under 1.5 degrees, which is below the threshold at
 * which a viewer reads a lean as suspension at all, so the tractor looked
 * rigidly bolted to the road. They are roughly doubled here, which is still
 * well inside the range a loaded combination actually travels.
 *
 * These coefficients belong to the CANONICAL shipping state only. The receiving
 * truck is derived by `mirrorForReceiving`, which negates `cabRoll` and
 * `steeringAngle`; changing a coefficient there instead would make the
 * receiving truck lean into its turns the wrong way.
 *
 * The trailer is only ever yawed (`trailerAngle`), never pitched, so raising
 * pitch cannot drive the trailer's rear corner at z = -11.35 through the
 * ground - the geometry that would clip is on a sibling group.
 */
const calculateCanonicalShippingState = (
  cycleSeconds: number,
  timeSeconds: number
): TruckAnimState => {
  const cycle = ((cycleSeconds % TRUCK_CYCLE_SECONDS) + TRUCK_CYCLE_SECONDS) % TRUCK_CYCLE_SECONDS;
  const phase = getTruckPhase(cycle);
  const t = clamp01(getPhaseProgress(cycle, phase));
  const eased = smoothstep(t);
  const signalBlink = Math.sin(timeSeconds * 8) > 0;
  const poses = SHIPPING_POSES;

  switch (phase) {
    case 'entering':
      return baseState(phase, linearPose(poses.tunnelIncoming, poses.highway, eased), 17, {
        throttle: lerp(0.72, 0.48, eased),
      });
    case 'slowing':
      return baseState(
        phase,
        linearPose(poses.highway, poses.approach, eased),
        lerp(11, 5, eased),
        {
          brakeLights: t > 0.18,
          leftSignal: t > 0.45 && signalBlink,
          cabPitch: lerp(0, 0.055, eased),
          throttle: lerp(0.35, 0.16, eased),
        }
      );
    case 'turning_in': {
      const pose = cubicBezier(poses.approach, [20, 80], [-13, 66], poses.turnEnd, eased);
      const steeringAngle = -0.42 * Math.sin(t * Math.PI);
      return baseState(phase, pose, 5.8, {
        steeringAngle,
        leftSignal: signalBlink,
        trailerAngle: -steeringAngle * 0.42,
        cabRoll: steeringAngle * 0.1,
        throttle: 0.28,
      });
    }
    case 'straightening':
      return baseState(phase, linearPose(poses.turnEnd, poses.straightEnd, eased), 3.2, {
        steeringAngle: lerp(-0.18, 0, eased),
        trailerAngle: lerp(0.12, 0, eased),
        brakeLights: t > 0.65,
        throttle: 0.16,
      });
    case 'positioning':
      return baseState(
        phase,
        linearPose(poses.straightEnd, poses.positioningEnd, eased),
        lerp(2.5, 0.6, eased),
        {
          brakeLights: t > 0.45,
          cabPitch: 0.038 * eased,
          throttle: 0.1,
        }
      );
    case 'stopping_to_back':
      return baseState(phase, poses.positioningEnd, 0, {
        brakeLights: true,
        throttle: 0.06,
      });
    case 'backing': {
      const pose = cubicBezier(poses.positioningEnd, [-4, 67], [-1, 65], poses.backingEnd, eased);
      const steeringAngle = 0.12 * Math.sin(t * Math.PI) * (1 - t);
      return baseState(phase, pose, -1.8, {
        steeringAngle,
        reverseLights: true,
        trailerAngle: steeringAngle * 0.35,
        cabPitch: -0.03,
        throttle: 0.14,
      });
    }
    case 'final_adjustment':
      return baseState(phase, linearPose(poses.backingEnd, poses.dock, eased), -0.7, {
        reverseLights: true,
        brakeLights: t > 0.72,
        throttle: 0.08,
      });
    case 'docked': {
      const opening = smoothstep(clamp01((t - 0.06) / 0.14));
      const closing = 1 - smoothstep(clamp01((t - 0.76) / 0.16));
      const doorOpenAmount = Math.min(opening, closing);
      const landingGearAmount = smoothstep(clamp01((t - 0.03) / 0.12));
      return baseState(phase, poses.dock, 0, {
        brakeLights: t < 0.08,
        doorsOpen: doorOpenAmount > 0.02,
        doorOpenAmount,
        landingGearAmount,
        throttle: 0.04,
      });
    }
    case 'preparing_to_leave':
      return baseState(phase, poses.dock, 0, {
        brakeLights: true,
        rightSignal: signalBlink,
        landingGearAmount: 1 - smootherstep(t),
        throttle: lerp(0.06, 0.18, eased),
      });
    case 'pulling_out':
      return baseState(phase, linearPose(poses.dock, poses.pullout, eased), lerp(0.8, 4.5, eased), {
        rightSignal: signalBlink,
        cabPitch: -0.038 * eased,
        throttle: lerp(0.18, 0.38, eased),
      });
    case 'turning_out': {
      const pose = cubicBezier(poses.pullout, [0, 97], [20, 94], poses.exitRoad, eased);
      const steeringAngle = 0.38 * Math.sin(t * Math.PI);
      return baseState(phase, pose, 5.5, {
        steeringAngle,
        rightSignal: t < 0.72 && signalBlink,
        trailerAngle: -steeringAngle * 0.34,
        cabRoll: steeringAngle * 0.095,
        throttle: 0.42,
      });
    }
    case 'accelerating':
      return baseState(
        phase,
        linearPose(poses.exitRoad, poses.acceleratingEnd, smootherstep(t)),
        lerp(6, 16, eased),
        {
          cabPitch: -0.045 * (1 - t),
          throttle: lerp(0.5, 0.78, eased),
        }
      );
    case 'leaving':
      return baseState(phase, linearPose(poses.acceleratingEnd, poses.tunnelOutgoing, t), 24.3, {
        throttle: 0.82,
      });
  }
};

const mirrorForReceiving = (state: TruckAnimState): TruckAnimState => ({
  ...state,
  x: -state.x,
  z: -state.z,
  rotation: normalizeAngle(state.rotation + Math.PI),
  steeringAngle: -state.steeringAngle,
  leftSignal: state.rightSignal,
  rightSignal: state.leftSignal,
  trailerAngle: -state.trailerAngle,
  cabRoll: -state.cabRoll,
});

export const calculateShippingTruckState = (cycle: number, time: number): TruckAnimState =>
  calculateCanonicalShippingState(cycle, time);

export const calculateReceivingTruckState = (cycle: number, time: number): TruckAnimState =>
  mirrorForReceiving(calculateCanonicalShippingState(cycle, time));

export function getTruckScheduleStatus(cycleSeconds: number): {
  status: 'arriving' | 'loading' | 'departing' | 'clear';
  etaMinutes: number;
} {
  const cycle = ((cycleSeconds % TRUCK_CYCLE_SECONDS) + TRUCK_CYCLE_SECONDS) % TRUCK_CYCLE_SECONDS;
  if (cycle < DOCK_START_SECONDS) {
    return {
      status: 'arriving',
      etaMinutes: Math.ceil((DOCK_START_SECONDS - cycle) / 3),
    };
  }
  if (cycle < DEPARTURE_SECONDS) {
    return {
      status: 'loading',
      etaMinutes: Math.ceil((DEPARTURE_SECONDS - cycle) / 3),
    };
  }
  return { status: 'departing', etaMinutes: 0 };
}
