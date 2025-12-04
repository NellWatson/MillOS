import * as THREE from 'three';

// Animation phases for realistic truck docking
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

// Truck animation state with full 2D position and detailed state
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
  trailerAngle: number; // Articulation angle relative to cab
  throttle: number; // 0-1 for exhaust intensity
  doorsOpen: boolean;
}

// Easing functions
const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const easeOutQuad = (t: number): number => {
  return 1 - (1 - t) * (1 - t);
};

const easeInQuad = (t: number): number => {
  return t * t;
};

// Interpolate along a curved path (quadratic bezier)
const bezierPoint = (
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  t: number
): [number, number] => {
  const x = (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
  const z = (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
  return [x, z];
};

// Calculate tangent angle along bezier curve
const bezierTangentAngle = (
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  t: number
): number => {
  const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
  const dz = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
  return Math.atan2(dx, dz);
};

// Calculate truck state for SHIPPING dock (front of building, z=50)
export const calculateShippingTruckState = (cycle: number, time: number): TruckAnimState => {
  const ROAD_Z = 110;
  const YARD_ENTRY_Z = 75;
  const TURN_START_Z = 70;
  const TURN_END_X = -18;
  const ALIGN_Z = 68;
  const DOCK_Z = 59;
  const ENTRY_X = 20;

  const turnStart: [number, number] = [ENTRY_X, TURN_START_Z];
  const turnControl: [number, number] = [-5, TURN_START_Z + 5];
  const turnEnd: [number, number] = [TURN_END_X, ALIGN_Z];

  const signalBlink = Math.sin(time * 8) > 0;

  if (cycle < 5) {
    const t = easeOutQuad(cycle / 5);
    return {
      phase: 'entering',
      x: ENTRY_X,
      z: THREE.MathUtils.lerp(ROAD_Z, YARD_ENTRY_Z, t),
      rotation: Math.PI,
      speed: 1.0 - t * 0.3,
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: true && signalBlink,
      rightSignal: false,
      trailerAngle: 0,
      throttle: 0.6,
      doorsOpen: false,
    };
  } else if (cycle < 8) {
    const t = easeInQuad((cycle - 5) / 3);
    return {
      phase: 'slowing',
      x: ENTRY_X,
      z: THREE.MathUtils.lerp(YARD_ENTRY_Z, TURN_START_Z, t),
      rotation: Math.PI,
      speed: 0.7 - t * 0.4,
      steeringAngle: -t * 0.3,
      brakeLights: true,
      reverseLights: false,
      leftSignal: true && signalBlink,
      rightSignal: false,
      trailerAngle: t * 0.02,
      throttle: 0.2,
      doorsOpen: false,
    };
  } else if (cycle < 16) {
    const t = easeInOutCubic((cycle - 8) / 8);
    const [x, z] = bezierPoint(turnStart, turnControl, turnEnd, t);
    const angle = bezierTangentAngle(turnStart, turnControl, turnEnd, t);
    // Trailer lags behind during turn - articulation angle
    const trailerLag = Math.sin(t * Math.PI) * 0.15;
    return {
      phase: 'turning_in',
      x,
      z,
      rotation: angle + Math.PI,
      speed: 0.3 + Math.sin(t * Math.PI) * 0.2,
      steeringAngle: -0.5 + t * 0.3,
      brakeLights: false,
      reverseLights: false,
      leftSignal: true && signalBlink,
      rightSignal: false,
      trailerAngle: trailerLag,
      throttle: 0.4 + Math.sin(t * Math.PI) * 0.3,
      doorsOpen: false,
    };
  } else if (cycle < 19) {
    const t = easeInOutCubic((cycle - 16) / 3);
    return {
      phase: 'straightening',
      x: THREE.MathUtils.lerp(TURN_END_X, 0, t),
      z: ALIGN_Z,
      rotation: THREE.MathUtils.lerp(Math.PI * 0.6, 0, t),
      speed: 0.3 - t * 0.2,
      steeringAngle: 0.3 - t * 0.3,
      brakeLights: t > 0.7,
      reverseLights: false,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: (1 - t) * 0.08,
      throttle: 0.3 - t * 0.2,
      doorsOpen: false,
    };
  } else if (cycle < 21) {
    return {
      phase: 'stopping_to_back',
      x: 0,
      z: ALIGN_Z,
      rotation: 0,
      speed: 0,
      steeringAngle: 0,
      brakeLights: true,
      reverseLights: cycle > 20,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      throttle: 0.15,
      doorsOpen: false,
    };
  } else if (cycle < 32) {
    const t = easeInOutCubic((cycle - 21) / 11);
    const wobble = Math.sin(cycle * 2) * 0.02 * (1 - t);
    return {
      phase: 'backing',
      x: wobble * 2,
      z: THREE.MathUtils.lerp(ALIGN_Z, DOCK_Z + 1, t),
      rotation: wobble,
      speed: -0.15,
      steeringAngle: wobble * 2,
      brakeLights: false,
      reverseLights: true,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: -wobble * 0.5,
      throttle: 0.25,
      doorsOpen: false,
    };
  } else if (cycle < 34) {
    const t = easeOutQuad((cycle - 32) / 2);
    return {
      phase: 'final_adjustment',
      x: 0,
      z: THREE.MathUtils.lerp(DOCK_Z + 1, DOCK_Z, t),
      rotation: 0,
      speed: -0.05,
      steeringAngle: 0,
      brakeLights: t > 0.8,
      reverseLights: true,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      throttle: 0.15,
      doorsOpen: false,
    };
  } else if (cycle < 36) {
    // Doors opening
    const t = (cycle - 34) / 2;
    return {
      phase: 'docked',
      x: 0,
      z: DOCK_Z,
      rotation: 0,
      speed: 0,
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      throttle: 0.1,
      doorsOpen: t > 0.5,
    };
  } else if (cycle < 48) {
    // Docked - loading/unloading
    return {
      phase: 'docked',
      x: 0,
      z: DOCK_Z,
      rotation: 0,
      speed: 0,
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      throttle: 0.1,
      doorsOpen: true,
    };
  } else if (cycle < 50) {
    // Doors closing
    const t = (cycle - 48) / 2;
    return {
      phase: 'docked',
      x: 0,
      z: DOCK_Z,
      rotation: 0,
      speed: 0,
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      throttle: 0.1,
      doorsOpen: t < 0.5,
    };
  } else if (cycle < 52) {
    return {
      phase: 'preparing_to_leave',
      x: 0,
      z: DOCK_Z,
      rotation: 0,
      speed: 0,
      steeringAngle: 0,
      brakeLights: true,
      reverseLights: false,
      leftSignal: false,
      rightSignal: true && signalBlink,
      trailerAngle: 0,
      throttle: 0.3,
      doorsOpen: false,
    };
  } else if (cycle < 55) {
    const t = easeInQuad((cycle - 52) / 3);
    return {
      phase: 'pulling_out',
      x: 0,
      z: THREE.MathUtils.lerp(DOCK_Z, ALIGN_Z, t),
      rotation: 0,
      speed: t * 0.4,
      steeringAngle: t * 0.2,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: true && signalBlink,
      trailerAngle: t * 0.03,
      throttle: 0.5,
      doorsOpen: false,
    };
  } else if (cycle < 58) {
    const t = easeInOutCubic((cycle - 55) / 3);
    return {
      phase: 'turning_out',
      x: THREE.MathUtils.lerp(0, ENTRY_X, t),
      z: THREE.MathUtils.lerp(ALIGN_Z, YARD_ENTRY_Z, t),
      rotation: THREE.MathUtils.lerp(0, Math.PI, t),
      speed: 0.5,
      steeringAngle: 0.4,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: true && signalBlink,
      trailerAngle: -Math.sin(t * Math.PI) * 0.1,
      throttle: 0.6,
      doorsOpen: false,
    };
  } else {
    const t = easeInQuad((cycle - 58) / 2);
    return {
      phase: 'leaving',
      x: ENTRY_X,
      z: THREE.MathUtils.lerp(YARD_ENTRY_Z, ROAD_Z, t),
      rotation: Math.PI,
      speed: 0.5 + t * 0.5,
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      throttle: 0.7 + t * 0.3,
      doorsOpen: false,
    };
  }
};

// Calculate truck state for RECEIVING dock (back of building, z=-50)
export const calculateReceivingTruckState = (cycle: number, time: number): TruckAnimState => {
  const ROAD_Z = -110;
  const YARD_ENTRY_Z = -75;
  const TURN_START_Z = -70;
  const TURN_END_X = 18;
  const ALIGN_Z = -68;
  const DOCK_Z = -59;
  const ENTRY_X = -20;

  const turnStart: [number, number] = [ENTRY_X, TURN_START_Z];
  const turnControl: [number, number] = [5, TURN_START_Z - 5];
  const turnEnd: [number, number] = [TURN_END_X, ALIGN_Z];

  const signalBlink = Math.sin(time * 8) > 0;

  if (cycle < 5) {
    const t = easeOutQuad(cycle / 5);
    return {
      phase: 'entering',
      x: ENTRY_X,
      z: THREE.MathUtils.lerp(ROAD_Z, YARD_ENTRY_Z, t),
      rotation: 0,
      speed: 1.0 - t * 0.3,
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: true && signalBlink,
      trailerAngle: 0,
      throttle: 0.6,
      doorsOpen: false,
    };
  } else if (cycle < 8) {
    const t = easeInQuad((cycle - 5) / 3);
    return {
      phase: 'slowing',
      x: ENTRY_X,
      z: THREE.MathUtils.lerp(YARD_ENTRY_Z, TURN_START_Z, t),
      rotation: 0,
      speed: 0.7 - t * 0.4,
      steeringAngle: t * 0.3,
      brakeLights: true,
      reverseLights: false,
      leftSignal: false,
      rightSignal: true && signalBlink,
      trailerAngle: -t * 0.02,
      throttle: 0.2,
      doorsOpen: false,
    };
  } else if (cycle < 16) {
    const t = easeInOutCubic((cycle - 8) / 8);
    const [x, z] = bezierPoint(turnStart, turnControl, turnEnd, t);
    const angle = bezierTangentAngle(turnStart, turnControl, turnEnd, t);
    const trailerLag = -Math.sin(t * Math.PI) * 0.15;
    return {
      phase: 'turning_in',
      x,
      z,
      rotation: angle,
      speed: 0.3 + Math.sin(t * Math.PI) * 0.2,
      steeringAngle: 0.5 - t * 0.3,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: true && signalBlink,
      trailerAngle: trailerLag,
      throttle: 0.4 + Math.sin(t * Math.PI) * 0.3,
      doorsOpen: false,
    };
  } else if (cycle < 19) {
    const t = easeInOutCubic((cycle - 16) / 3);
    return {
      phase: 'straightening',
      x: THREE.MathUtils.lerp(TURN_END_X, 0, t),
      z: ALIGN_Z,
      rotation: THREE.MathUtils.lerp(-Math.PI * 0.6, -Math.PI, t),
      speed: 0.3 - t * 0.2,
      steeringAngle: -0.3 + t * 0.3,
      brakeLights: t > 0.7,
      reverseLights: false,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: -(1 - t) * 0.08,
      throttle: 0.3 - t * 0.2,
      doorsOpen: false,
    };
  } else if (cycle < 21) {
    return {
      phase: 'stopping_to_back',
      x: 0,
      z: ALIGN_Z,
      rotation: Math.PI,
      speed: 0,
      steeringAngle: 0,
      brakeLights: true,
      reverseLights: cycle > 20,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      throttle: 0.15,
      doorsOpen: false,
    };
  } else if (cycle < 32) {
    const t = easeInOutCubic((cycle - 21) / 11);
    const wobble = Math.sin(cycle * 2) * 0.02 * (1 - t);
    return {
      phase: 'backing',
      x: wobble * 2,
      z: THREE.MathUtils.lerp(ALIGN_Z, DOCK_Z + 1, t),
      rotation: Math.PI + wobble,
      speed: -0.15,
      steeringAngle: wobble * 2,
      brakeLights: false,
      reverseLights: true,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: wobble * 0.5,
      throttle: 0.25,
      doorsOpen: false,
    };
  } else if (cycle < 34) {
    const t = easeOutQuad((cycle - 32) / 2);
    return {
      phase: 'final_adjustment',
      x: 0,
      z: THREE.MathUtils.lerp(DOCK_Z + 1, DOCK_Z, t),
      rotation: Math.PI,
      speed: -0.05,
      steeringAngle: 0,
      brakeLights: t > 0.8,
      reverseLights: true,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      throttle: 0.15,
      doorsOpen: false,
    };
  } else if (cycle < 36) {
    const t = (cycle - 34) / 2;
    return {
      phase: 'docked',
      x: 0,
      z: DOCK_Z,
      rotation: Math.PI,
      speed: 0,
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      throttle: 0.1,
      doorsOpen: t > 0.5,
    };
  } else if (cycle < 48) {
    return {
      phase: 'docked',
      x: 0,
      z: DOCK_Z,
      rotation: Math.PI,
      speed: 0,
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      throttle: 0.1,
      doorsOpen: true,
    };
  } else if (cycle < 50) {
    const t = (cycle - 48) / 2;
    return {
      phase: 'docked',
      x: 0,
      z: DOCK_Z,
      rotation: Math.PI,
      speed: 0,
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      throttle: 0.1,
      doorsOpen: t < 0.5,
    };
  } else if (cycle < 52) {
    return {
      phase: 'preparing_to_leave',
      x: 0,
      z: DOCK_Z,
      rotation: Math.PI,
      speed: 0,
      steeringAngle: 0,
      brakeLights: true,
      reverseLights: false,
      leftSignal: true && signalBlink,
      rightSignal: false,
      trailerAngle: 0,
      throttle: 0.3,
      doorsOpen: false,
    };
  } else if (cycle < 55) {
    const t = easeInQuad((cycle - 52) / 3);
    return {
      phase: 'pulling_out',
      x: 0,
      z: THREE.MathUtils.lerp(DOCK_Z, ALIGN_Z, t),
      rotation: Math.PI,
      speed: t * 0.4,
      steeringAngle: -t * 0.2,
      brakeLights: false,
      reverseLights: false,
      leftSignal: true && signalBlink,
      rightSignal: false,
      trailerAngle: -t * 0.03,
      throttle: 0.5,
      doorsOpen: false,
    };
  } else if (cycle < 58) {
    const t = easeInOutCubic((cycle - 55) / 3);
    return {
      phase: 'turning_out',
      x: THREE.MathUtils.lerp(0, ENTRY_X, t),
      z: THREE.MathUtils.lerp(ALIGN_Z, YARD_ENTRY_Z, t),
      rotation: THREE.MathUtils.lerp(Math.PI, 0, t),
      speed: 0.5,
      steeringAngle: -0.4,
      brakeLights: false,
      reverseLights: false,
      leftSignal: true && signalBlink,
      rightSignal: false,
      trailerAngle: Math.sin(t * Math.PI) * 0.1,
      throttle: 0.6,
      doorsOpen: false,
    };
  } else {
    const t = easeInQuad((cycle - 58) / 2);
    return {
      phase: 'leaving',
      x: ENTRY_X,
      z: THREE.MathUtils.lerp(YARD_ENTRY_Z, ROAD_Z, t),
      rotation: 0,
      speed: 0.5 + t * 0.5,
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      throttle: 0.7 + t * 0.3,
      doorsOpen: false,
    };
  }
};
