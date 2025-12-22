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
  trailerAngle: number;
  cabRoll: number;
  cabPitch: number;
  throttle: number;
  doorsOpen: boolean;
}

// =============================================================================
// EASING FUNCTIONS
// =============================================================================

const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const easeOutQuad = (t: number): number => {
  return 1 - (1 - t) * (1 - t);
};

const easeInQuad = (t: number): number => {
  return t * t;
};

const easeInOutQuad = (t: number): number => {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// =============================================================================
// PATH HELPERS
// =============================================================================

/**
 * Calculate position on a circular arc
 * @param cx - Arc center X
 * @param cz - Arc center Z
 * @param radius - Arc radius
 * @param startAngle - Start angle (0 = +X direction)
 * @param sweepAngle - Sweep angle (positive = counterclockwise)
 * @param t - Progress 0-1
 */
const arcPosition = (
  cx: number,
  cz: number,
  radius: number,
  startAngle: number,
  sweepAngle: number,
  t: number
): { x: number; z: number; rotation: number } => {
  const angle = startAngle + sweepAngle * t;
  return {
    x: cx + Math.cos(angle) * radius,
    z: cz + Math.sin(angle) * radius,
    // Truck faces tangent to arc (perpendicular to radius)
    rotation: sweepAngle > 0 ? angle + Math.PI / 2 : angle - Math.PI / 2,
  };
};

/**
 * Calculate trailer articulation from arc curvature
 * Trailer lags behind cab during turns
 */
const calculateTrailerLag = (
  curvature: number,
  speed: number,
  maxLag: number = 0.15
): number => {
  return Math.max(-maxLag, Math.min(maxLag, curvature * speed * 0.5));
};

// =============================================================================
// SHIPPING DOCK (Front of building, z=53)
// Truck enters from +Z, does 180° buttonhook arc, backs into dock
// =============================================================================

export const calculateShippingTruckState = (cycle: number, time: number): TruckAnimState => {
  const ROAD_Z = 200;
  const ROAD_X = 20;
  const DOCK_Z = 53;
  const DOCK_X = 0;
  const ARC_RADIUS = 15;
  const ARC_CENTER_X = 5;
  const ARC_CENTER_Z = 75;

  // Phase durations
  const T_ENTER = 6;
  const T_ARC = 8;
  const T_SETTLE = 2;
  const T_REVERSE = 10;
  const T_DOCK = 2;
  const T_LOAD = 12;
  const T_PREP = 2;
  const T_PULLOUT = 4;
  const T_EXIT_ARC = 6;
  const T_ACCEL = 5;

  const signalBlink = Math.sin(time * 8) > 0;

  // PHASE 1: Approach from road
  if (cycle < T_ENTER) {
    const t = smoothstep(cycle / T_ENTER);
    return {
      phase: 'entering',
      x: ROAD_X,
      z: lerp(ROAD_Z, ARC_CENTER_Z + ARC_RADIUS, t),
      rotation: Math.PI,
      speed: lerp(1.0, 0.5, t),
      steeringAngle: 0,
      brakeLights: t > 0.8,
      reverseLights: false,
      leftSignal: t > 0.5 && signalBlink,
      rightSignal: false,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: t > 0.8 ? 0.02 : 0,
      throttle: lerp(0.7, 0.3, t),
      doorsOpen: false,
    };
  }

  // PHASE 2: 180° buttonhook arc (left turn)
  if (cycle < T_ENTER + T_ARC) {
    const t = easeInOutCubic((cycle - T_ENTER) / T_ARC);
    const arc = arcPosition(ARC_CENTER_X, ARC_CENTER_Z, ARC_RADIUS, 0, Math.PI, t);
    const trailerLag = calculateTrailerLag(1 / ARC_RADIUS, 0.4) * Math.sin(t * Math.PI);
    return {
      phase: 'turning_in',
      x: arc.x,
      z: arc.z,
      rotation: arc.rotation + Math.PI,
      speed: 0.35,
      steeringAngle: -0.5 * (1 - Math.abs(2 * t - 1)),
      brakeLights: false,
      reverseLights: false,
      leftSignal: signalBlink,
      rightSignal: false,
      trailerAngle: trailerLag,
      cabRoll: -0.03 * Math.sin(t * Math.PI),
      cabPitch: 0,
      throttle: 0.4,
      doorsOpen: false,
    };
  }

  // PHASE 3: Settle and prepare to reverse
  if (cycle < T_ENTER + T_ARC + T_SETTLE) {
    const t = easeOutQuad((cycle - T_ENTER - T_ARC) / T_SETTLE);
    return {
      phase: 'stopping_to_back',
      x: lerp(ARC_CENTER_X - ARC_RADIUS, DOCK_X, t),
      z: ARC_CENTER_Z,
      rotation: lerp(Math.PI * 0.05, 0, t),
      speed: lerp(0.1, 0, t),
      steeringAngle: 0,
      brakeLights: true,
      reverseLights: t > 0.7,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: lerp(0.05, 0, t),
      cabRoll: 0,
      cabPitch: t < 0.5 ? 0.02 : 0,
      throttle: 0.15,
      doorsOpen: false,
    };
  }

  // PHASE 4: Reverse toward dock
  if (cycle < T_ENTER + T_ARC + T_SETTLE + T_REVERSE) {
    const t = easeInOutQuad((cycle - T_ENTER - T_ARC - T_SETTLE) / T_REVERSE);
    const wobble = Math.sin(cycle * 3) * 0.005 * (1 - t);
    return {
      phase: 'backing',
      x: DOCK_X + wobble * 2,
      z: lerp(ARC_CENTER_Z, DOCK_Z + 1, t),
      rotation: wobble,
      speed: -0.25,
      steeringAngle: wobble * 4,
      brakeLights: false,
      reverseLights: true,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: wobble * 0.8,
      cabRoll: 0,
      cabPitch: -0.01,
      throttle: 0.25,
      doorsOpen: false,
    };
  }

  // PHASE 5: Final dock adjustment
  if (cycle < T_ENTER + T_ARC + T_SETTLE + T_REVERSE + T_DOCK) {
    const t = easeOutQuad((cycle - T_ENTER - T_ARC - T_SETTLE - T_REVERSE) / T_DOCK);
    return {
      phase: 'final_adjustment',
      x: DOCK_X,
      z: lerp(DOCK_Z + 1, DOCK_Z, t),
      rotation: 0,
      speed: -0.05 * (1 - t),
      steeringAngle: 0,
      brakeLights: t > 0.5,
      reverseLights: t < 0.8,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: t > 0.5 ? 0.02 : 0,
      throttle: 0.1,
      doorsOpen: false,
    };
  }

  // PHASE 6: Docked (loading)
  if (cycle < T_ENTER + T_ARC + T_SETTLE + T_REVERSE + T_DOCK + T_LOAD) {
    const phaseTime = cycle - (T_ENTER + T_ARC + T_SETTLE + T_REVERSE + T_DOCK);
    return {
      phase: 'docked',
      x: DOCK_X,
      z: DOCK_Z,
      rotation: 0,
      speed: 0,
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: 0,
      throttle: 0.1,
      doorsOpen: phaseTime > 1 && phaseTime < T_LOAD - 1,
    };
  }

  // PHASE 7: Prepare to leave
  if (cycle < T_ENTER + T_ARC + T_SETTLE + T_REVERSE + T_DOCK + T_LOAD + T_PREP) {
    return {
      phase: 'preparing_to_leave',
      x: DOCK_X,
      z: DOCK_Z,
      rotation: 0,
      speed: 0,
      steeringAngle: 0,
      brakeLights: true,
      reverseLights: false,
      leftSignal: false,
      rightSignal: signalBlink,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: 0,
      throttle: 0.3,
      doorsOpen: false,
    };
  }

  // PHASE 8: Pull forward
  const pulloutStart = T_ENTER + T_ARC + T_SETTLE + T_REVERSE + T_DOCK + T_LOAD + T_PREP;
  if (cycle < pulloutStart + T_PULLOUT) {
    const t = easeInQuad((cycle - pulloutStart) / T_PULLOUT);
    return {
      phase: 'pulling_out',
      x: DOCK_X,
      z: lerp(DOCK_Z, ARC_CENTER_Z, t),
      rotation: 0,
      speed: lerp(0, 0.5, t),
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: signalBlink,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: -0.03 * t,
      throttle: 0.5,
      doorsOpen: false,
    };
  }

  // PHASE 9: Exit arc (90° right to road lane)
  const exitArcStart = pulloutStart + T_PULLOUT;
  if (cycle < exitArcStart + T_EXIT_ARC) {
    const t = easeInOutCubic((cycle - exitArcStart) / T_EXIT_ARC);
    const arc = arcPosition(ARC_CENTER_X, ARC_CENTER_Z, ARC_RADIUS, Math.PI, -Math.PI / 2, t);
    const blendT = Math.max(0, (t - 0.7) / 0.3);
    const finalX = lerp(ARC_CENTER_X + ARC_RADIUS, ROAD_X, smoothstep(blendT));
    const finalZ = lerp(arc.z, ARC_CENTER_Z + 20, blendT);
    const arcRotation = t < 0.7 ? arc.rotation : lerp(arc.rotation, 0, smoothstep(blendT));
    const trailerLag = calculateTrailerLag(1 / ARC_RADIUS, 0.5) * Math.sin(t * Math.PI * 0.7);
    return {
      phase: 'turning_out',
      x: t < 0.7 ? arc.x : finalX,
      z: t < 0.7 ? arc.z : finalZ,
      rotation: arcRotation,
      speed: 0.5 + t * 0.2,
      steeringAngle: 0.3 * (1 - Math.abs(2 * Math.min(t, 0.5) - 0.5)),
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: signalBlink,
      trailerAngle: -trailerLag,
      cabRoll: 0.02 * Math.sin(t * Math.PI * 0.7),
      cabPitch: -0.02,
      throttle: 0.6,
      doorsOpen: false,
    };
  }

  // PHASE 10: Accelerate away
  const accelStart = exitArcStart + T_EXIT_ARC;
  if (cycle < accelStart + T_ACCEL) {
    const t = easeInQuad((cycle - accelStart) / T_ACCEL);
    return {
      phase: 'accelerating',
      x: ROAD_X,
      z: lerp(ARC_CENTER_Z + 20, ROAD_Z, t),
      rotation: 0,
      speed: 0.8 + t * 0.4,
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: -0.02,
      throttle: 0.8,
      doorsOpen: false,
    };
  }

  // PHASE 11: Leaving (hold state)
  return {
    phase: 'leaving',
    x: ROAD_X,
    z: ROAD_Z,
    rotation: 0,
    speed: 1.0,
    steeringAngle: 0,
    brakeLights: false,
    reverseLights: false,
    leftSignal: false,
    rightSignal: false,
    trailerAngle: 0,
    cabRoll: 0,
    cabPitch: 0,
    throttle: 0,
    doorsOpen: false,
  };
};

// =============================================================================
// RECEIVING DOCK (Back of building, z=-53)
// Mirror of shipping - approaches from -Z, does 180° right arc
// =============================================================================

export const calculateReceivingTruckState = (cycle: number, time: number): TruckAnimState => {
  const ROAD_Z = -200;
  const ROAD_X = -20;
  const DOCK_Z = -53;
  const DOCK_X = 0;
  const ARC_RADIUS = 15;
  const ARC_CENTER_X = -5;
  const ARC_CENTER_Z = -75;

  const T_ENTER = 6;
  const T_ARC = 8;
  const T_SETTLE = 2;
  const T_REVERSE = 10;
  const T_DOCK = 2;
  const T_LOAD = 12;
  const T_PREP = 2;
  const T_PULLOUT = 4;
  const T_EXIT_ARC = 6;
  const T_ACCEL = 5;

  const signalBlink = Math.sin(time * 8) > 0;

  // PHASE 1: Approach
  if (cycle < T_ENTER) {
    const t = smoothstep(cycle / T_ENTER);
    return {
      phase: 'entering',
      x: ROAD_X,
      z: lerp(ROAD_Z, ARC_CENTER_Z - ARC_RADIUS, t),
      rotation: 0,
      speed: lerp(1.0, 0.5, t),
      steeringAngle: 0,
      brakeLights: t > 0.8,
      reverseLights: false,
      leftSignal: false,
      rightSignal: t > 0.5 && signalBlink,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: t > 0.8 ? 0.02 : 0,
      throttle: lerp(0.7, 0.3, t),
      doorsOpen: false,
    };
  }

  // PHASE 2: 180° arc (right turn)
  if (cycle < T_ENTER + T_ARC) {
    const t = easeInOutCubic((cycle - T_ENTER) / T_ARC);
    const arc = arcPosition(ARC_CENTER_X, ARC_CENTER_Z, ARC_RADIUS, Math.PI, -Math.PI, t);
    const trailerLag = calculateTrailerLag(1 / ARC_RADIUS, 0.4) * Math.sin(t * Math.PI);
    return {
      phase: 'turning_in',
      x: arc.x,
      z: arc.z,
      rotation: arc.rotation,
      speed: 0.35,
      steeringAngle: 0.5 * (1 - Math.abs(2 * t - 1)),
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: signalBlink,
      trailerAngle: -trailerLag,
      cabRoll: 0.03 * Math.sin(t * Math.PI),
      cabPitch: 0,
      throttle: 0.4,
      doorsOpen: false,
    };
  }

  // PHASE 3: Settle
  if (cycle < T_ENTER + T_ARC + T_SETTLE) {
    const t = easeOutQuad((cycle - T_ENTER - T_ARC) / T_SETTLE);
    return {
      phase: 'stopping_to_back',
      x: lerp(ARC_CENTER_X + ARC_RADIUS, DOCK_X, t),
      z: ARC_CENTER_Z,
      rotation: lerp(Math.PI - 0.05, Math.PI, t),
      speed: lerp(0.1, 0, t),
      steeringAngle: 0,
      brakeLights: true,
      reverseLights: t > 0.7,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: lerp(-0.05, 0, t),
      cabRoll: 0,
      cabPitch: t < 0.5 ? 0.02 : 0,
      throttle: 0.15,
      doorsOpen: false,
    };
  }

  // PHASE 4: Reverse
  if (cycle < T_ENTER + T_ARC + T_SETTLE + T_REVERSE) {
    const t = easeInOutQuad((cycle - T_ENTER - T_ARC - T_SETTLE) / T_REVERSE);
    const wobble = Math.sin(cycle * 3) * 0.005 * (1 - t);
    return {
      phase: 'backing',
      x: DOCK_X + wobble * 2,
      z: lerp(ARC_CENTER_Z, DOCK_Z - 1, t),
      rotation: Math.PI + wobble,
      speed: -0.25,
      steeringAngle: -wobble * 4,
      brakeLights: false,
      reverseLights: true,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: -wobble * 0.8,
      cabRoll: 0,
      cabPitch: -0.01,
      throttle: 0.25,
      doorsOpen: false,
    };
  }

  // PHASE 5: Final dock
  if (cycle < T_ENTER + T_ARC + T_SETTLE + T_REVERSE + T_DOCK) {
    const t = easeOutQuad((cycle - T_ENTER - T_ARC - T_SETTLE - T_REVERSE) / T_DOCK);
    return {
      phase: 'final_adjustment',
      x: DOCK_X,
      z: lerp(DOCK_Z - 1, DOCK_Z, t),
      rotation: Math.PI,
      speed: -0.05 * (1 - t),
      steeringAngle: 0,
      brakeLights: t > 0.5,
      reverseLights: t < 0.8,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: t > 0.5 ? 0.02 : 0,
      throttle: 0.1,
      doorsOpen: false,
    };
  }

  // PHASE 6: Docked
  if (cycle < T_ENTER + T_ARC + T_SETTLE + T_REVERSE + T_DOCK + T_LOAD) {
    const phaseTime = cycle - (T_ENTER + T_ARC + T_SETTLE + T_REVERSE + T_DOCK);
    return {
      phase: 'docked',
      x: DOCK_X,
      z: DOCK_Z,
      rotation: Math.PI,
      speed: 0,
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: 0,
      throttle: 0.1,
      doorsOpen: phaseTime > 1 && phaseTime < T_LOAD - 1,
    };
  }

  // PHASE 7: Prepare to leave
  if (cycle < T_ENTER + T_ARC + T_SETTLE + T_REVERSE + T_DOCK + T_LOAD + T_PREP) {
    return {
      phase: 'preparing_to_leave',
      x: DOCK_X,
      z: DOCK_Z,
      rotation: Math.PI,
      speed: 0,
      steeringAngle: 0,
      brakeLights: true,
      reverseLights: false,
      leftSignal: signalBlink,
      rightSignal: false,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: 0,
      throttle: 0.3,
      doorsOpen: false,
    };
  }

  // PHASE 8: Pull forward
  const pulloutStart = T_ENTER + T_ARC + T_SETTLE + T_REVERSE + T_DOCK + T_LOAD + T_PREP;
  if (cycle < pulloutStart + T_PULLOUT) {
    const t = easeInQuad((cycle - pulloutStart) / T_PULLOUT);
    return {
      phase: 'pulling_out',
      x: DOCK_X,
      z: lerp(DOCK_Z, ARC_CENTER_Z, t),
      rotation: Math.PI,
      speed: lerp(0, 0.5, t),
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: signalBlink,
      rightSignal: false,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: -0.03 * t,
      throttle: 0.5,
      doorsOpen: false,
    };
  }

  // PHASE 9: Exit arc (90° left)
  const exitArcStart = pulloutStart + T_PULLOUT;
  if (cycle < exitArcStart + T_EXIT_ARC) {
    const t = easeInOutCubic((cycle - exitArcStart) / T_EXIT_ARC);
    const arc = arcPosition(ARC_CENTER_X, ARC_CENTER_Z, ARC_RADIUS, 0, Math.PI / 2, t);
    const blendT = Math.max(0, (t - 0.7) / 0.3);
    const finalX = lerp(ARC_CENTER_X - ARC_RADIUS, ROAD_X, smoothstep(blendT));
    const finalZ = lerp(arc.z, ARC_CENTER_Z - 20, blendT);
    const arcRotation = t < 0.7 ? arc.rotation : lerp(arc.rotation, Math.PI, smoothstep(blendT));
    const trailerLag = calculateTrailerLag(1 / ARC_RADIUS, 0.5) * Math.sin(t * Math.PI * 0.7);
    return {
      phase: 'turning_out',
      x: t < 0.7 ? arc.x : finalX,
      z: t < 0.7 ? arc.z : finalZ,
      rotation: arcRotation,
      speed: 0.5 + t * 0.2,
      steeringAngle: -0.3 * (1 - Math.abs(2 * Math.min(t, 0.5) - 0.5)),
      brakeLights: false,
      reverseLights: false,
      leftSignal: signalBlink,
      rightSignal: false,
      trailerAngle: trailerLag,
      cabRoll: -0.02 * Math.sin(t * Math.PI * 0.7),
      cabPitch: -0.02,
      throttle: 0.6,
      doorsOpen: false,
    };
  }

  // PHASE 10: Accelerate
  const accelStart = exitArcStart + T_EXIT_ARC;
  if (cycle < accelStart + T_ACCEL) {
    const t = easeInQuad((cycle - accelStart) / T_ACCEL);
    return {
      phase: 'accelerating',
      x: ROAD_X,
      z: lerp(ARC_CENTER_Z - 20, ROAD_Z, t),
      rotation: Math.PI,
      speed: 0.8 + t * 0.4,
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: -0.02,
      throttle: 0.8,
      doorsOpen: false,
    };
  }

  // PHASE 11: Leaving
  return {
    phase: 'leaving',
    x: ROAD_X,
    z: ROAD_Z,
    rotation: Math.PI,
    speed: 1.0,
    steeringAngle: 0,
    brakeLights: false,
    reverseLights: false,
    leftSignal: false,
    rightSignal: false,
    trailerAngle: 0,
    cabRoll: 0,
    cabPitch: 0,
    throttle: 0,
    doorsOpen: false,
  };
};
