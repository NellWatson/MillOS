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
  cabRoll: number; // Chassis roll (cornering)
  cabPitch: number; // Chassis pitch (acceleration/braking)
  throttle: number; // 0-1 for exhaust intensity
  doorsOpen: boolean;
}

// Easing functions
export const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const easeOutQuad = (t: number): number => {
  return 1 - (1 - t) * (1 - t);
};

export const easeInQuad = (t: number): number => {
  return t * t;
};

export const easeInOutQuad = (t: number): number => {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

// Interpolate along a curved path (quadratic bezier)
export const bezierPoint = (
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
export const bezierTangentAngle = (
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  t: number
): number => {
  const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
  const dz = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
  return Math.atan2(dx, dz);
};

// Interpolate along a cubic bezier path (S-turns)
export const cubicBezierPoint = (
  p0: [number, number], // Start point
  p1: [number, number], // Control point 1
  p2: [number, number], // Control point 2
  p3: [number, number], // End point
  t: number
): [number, number] => {
  // B(t) = (1-t)^3 P0 + 3(1-t)^2 t P1 + 3(1-t) t^2 P2 + t^3 P3
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  const x = mt3 * p0[0] + 3 * mt2 * t * p1[0] + 3 * mt * t2 * p2[0] + t3 * p3[0];
  const z = mt3 * p0[1] + 3 * mt2 * t * p1[1] + 3 * mt * t2 * p2[1] + t3 * p3[1];

  return [x, z];
};

// Calculate tangent angle along cubic bezier curve
export const cubicBezierTangentAngle = (
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  t: number
): number => {
  // Derivative of Cubic Bezier:
  // B'(t) = 3(1-t)^2 (P1-P0) + 6(1-t)t (P2-P1) + 3t^2 (P3-P2)
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  const d1x = p1[0] - p0[0];
  const d1z = p1[1] - p0[1];
  const d2x = p2[0] - p1[0];
  const d2z = p2[1] - p1[1];
  const d3x = p3[0] - p2[0];
  const d3z = p3[1] - p2[1];

  const dx = 3 * mt2 * d1x + 6 * mt * t * d2x + 3 * t2 * d3x;
  const dz = 3 * mt2 * d1z + 6 * mt * t * d2z + 3 * t2 * d3z;

  return Math.atan2(dx, dz);
};

// Helper: Calculate accurate trailer angle by checking point slightly behind on curve
const calculateTrailerAngleOnCurve = (
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  t: number,
  truckAngle: number,
  lookback: number = 0.05
): number => {
  // Sample position slightly behind
  const tTrailer = Math.max(0, t - lookback);
  const angleAtTrailer = cubicBezierTangentAngle(p0, p1, p2, p3, tTrailer);

  // Angle difference between truck heading and curve tangent at trailer position
  let diff = angleAtTrailer - truckAngle;

  // Normalize to -PI to PI
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  return diff;
};

// Calculate truck state for SHIPPING dock (front of building, z=50)
export const calculateShippingTruckState = (cycle: number, time: number): TruckAnimState => {
  const ROAD_Z = 120; // Start further back
  const YARD_ENTRY_Z = 85; // Initial entry point
  const TURN_START_Z = 65; // Where to start the U-turn (go past dock)
  const ALIGN_Z = 78; // Setup point for backing (further out)
  const DOCK_Z = 53; // Dock position (stopped)

  const ENTRY_X = 20; // Road lane X
  const TURN_OUT_X = 25; // Swing out wide
  const ALIGN_X = 0; // Center of dock lane

  // Path Points for U-Turn Entry (Offset Backing)
  // Drive in, go past dock (Z~65), swing out (X~25), turn sharply to align (0, 78) facing AWAY from dock

  // 1. Approach and Swing out
  const approachP0: [number, number] = [ENTRY_X, YARD_ENTRY_Z];
  const approachP1: [number, number] = [ENTRY_X, 75];
  const approachP2: [number, number] = [TURN_OUT_X, 70]; // Swing wide right
  const approachP3: [number, number] = [TURN_OUT_X, TURN_START_Z]; // End of forward leg

  // 2. The U-Turn (swinging around to face away from dock)
  // From (25, 65) to (0, 78)
  const turnP0: [number, number] = [TURN_OUT_X, TURN_START_Z];
  const turnP1: [number, number] = [TURN_OUT_X, 60]; // Swing deeper
  const turnP2: [number, number] = [-5, 60]; // Cut across
  const turnP3: [number, number] = [ALIGN_X, ALIGN_Z]; // End aligned at Z=78

  const signalBlink = Math.sin(time * 8) > 0;

  if (cycle < 5) {
    // 1. Enter from Road
    const t = easeOutQuad(cycle / 5);
    return {
      phase: 'entering',
      x: ENTRY_X,
      z: THREE.MathUtils.lerp(ROAD_Z, YARD_ENTRY_Z, t),
      rotation: Math.PI, // Facing -Z (towards dock)
      speed: 1.0 - t * 0.3,
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: 0.02,
      throttle: 0.6,
      doorsOpen: false,
    };
  } else if (cycle < 10) {
    // 2. Drive Deep & Swing Wide (Positioning)
    const t = easeInOutCubic((cycle - 5) / 5);
    const [curveX, curveZ] = cubicBezierPoint(approachP0, approachP1, approachP2, approachP3, t);
    const angle = cubicBezierTangentAngle(approachP0, approachP1, approachP2, approachP3, t);

    // Trailer logic
    const trailerLag = calculateTrailerAngleOnCurve(
      approachP0,
      approachP1,
      approachP2,
      approachP3,
      t,
      angle,
      0.15
    );

    return {
      phase: 'positioning',
      x: curveX,
      z: curveZ,
      rotation: angle + Math.PI, // Forward motion
      speed: 0.6,
      steeringAngle: (angle + Math.PI - Math.PI) * 2, // steer into curve
      brakeLights: false,
      reverseLights: false,
      leftSignal: true && signalBlink, // Signal turn
      rightSignal: false,
      trailerAngle: trailerLag,
      cabRoll: -trailerLag * 0.1,
      cabPitch: 0,
      throttle: 0.5,
      doorsOpen: false,
    };
  } else if (cycle < 18) {
    // 3. The U-Turn Maneuver (Aligning)
    const t = easeInOutCubic((cycle - 10) / 8);
    const [x, z] = cubicBezierPoint(turnP0, turnP1, turnP2, turnP3, t);
    const angle = cubicBezierTangentAngle(turnP0, turnP1, turnP2, turnP3, t);

    // This is a tight turn
    const trailerLag = calculateTrailerAngleOnCurve(turnP0, turnP1, turnP2, turnP3, t, angle, 0.2);

    return {
      phase: 'turning_in',
      x,
      z,
      rotation: angle + Math.PI, // Still moving forward
      speed: 0.4,
      steeringAngle: -0.5, // Hard turn
      brakeLights: false,
      reverseLights: false,
      leftSignal: true && signalBlink,
      rightSignal: false,
      trailerAngle: trailerLag,
      cabRoll: 0.05, // Lean
      cabPitch: 0,
      throttle: 0.4,
      doorsOpen: false,
    };
  } else if (cycle < 21) {
    // 4. Stop & Straighten (Now facing AWAY from dock approx Z=78, facing +Z)
    // We want to end up Rotation = 0 (Facing +Z)
    const t = easeInOutCubic((cycle - 18) / 3);
    return {
      phase: 'straightening',
      x: 0,
      z: THREE.MathUtils.lerp(ALIGN_Z, ALIGN_Z + 1, t),
      rotation: THREE.MathUtils.lerp(Math.PI * 0.1, 0, t), // Correct any alignment
      speed: 0.2 - t * 0.2,
      steeringAngle: 0,
      brakeLights: t > 0.7,
      reverseLights: false,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: THREE.MathUtils.lerp(0.2, 0, t),
      cabRoll: 0,
      cabPitch: t > 0.7 ? 0.03 : 0,
      throttle: 0.2,
      doorsOpen: false,
    };
  } else if (cycle < 23) {
    // 5. Stop to reverse
    return {
      phase: 'stopping_to_back',
      x: 0,
      z: ALIGN_Z + 1,
      rotation: 0, // Perfectly aligned facing AWAY
      speed: 0,
      steeringAngle: 0,
      brakeLights: true,
      reverseLights: cycle > 22.5,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: 0,
      throttle: 0.15,
      doorsOpen: false,
    };
  } else if (cycle < 32) {
    // 6. Backing In (Straight Back towards DOCK_Z)
    // Moving from Z=79 to Z=53
    const t = easeInOutQuad((cycle - 23) / 9);
    const wobble = Math.sin(cycle * 4) * 0.003;

    return {
      phase: 'backing',
      x: wobble,
      z: THREE.MathUtils.lerp(ALIGN_Z + 1, DOCK_Z + 2, t),
      rotation: 0 + wobble, // Facing +Z (Away)
      speed: -0.2, // Negative speed = Reversing relative to facing
      steeringAngle: -wobble * 8, // Reverse steering logic
      brakeLights: false,
      reverseLights: true,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: -wobble,
      cabRoll: 0,
      cabPitch: -0.01,
      throttle: 0.3,
      doorsOpen: false,
    };
  } else if (cycle < 34) {
    // 7. Final Approach (Slow)
    const t = easeOutQuad((cycle - 32) / 2);
    return {
      phase: 'final_adjustment',
      x: 0,
      z: THREE.MathUtils.lerp(DOCK_Z + 2, DOCK_Z, t),
      rotation: 0,
      speed: -0.05,
      steeringAngle: 0,
      brakeLights: t > 0.8,
      reverseLights: true,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: t > 0.8 ? 0.02 : 0,
      throttle: 0.15,
      doorsOpen: false,
    };
  } else if (cycle < 36) {
    // 8. Docked - Doors Open
    const t = (cycle - 34) / 2;
    return {
      phase: 'docked',
      x: 0,
      z: DOCK_Z,
      rotation: 0, // Remains facing AWAY
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
      doorsOpen: t > 0.5,
    };
  } else if (cycle < 48) {
    // 9. Loading
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
      cabRoll: 0,
      cabPitch: 0,
      throttle: 0.1,
      doorsOpen: true,
    };
  } else if (cycle < 50) {
    // 10. Doors Close
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
      cabRoll: 0,
      cabPitch: 0,
      throttle: 0.1,
      doorsOpen: t < 0.5,
    };
  } else if (cycle < 52) {
    // 11. Prepare to Leave
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
      cabRoll: 0,
      cabPitch: 0,
      throttle: 0.3,
      doorsOpen: false,
    };
  } else if (cycle < 55) {
    // 12. Pull Out Straight (Drive Forward now!)
    const t = easeInQuad((cycle - 52) / 3);
    return {
      phase: 'pulling_out',
      x: 0,
      z: THREE.MathUtils.lerp(DOCK_Z, 80, t), // Driving AWAY from dock (+Z)
      rotation: 0,
      speed: t * 0.4,
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: true && signalBlink,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: -t * 0.05, // Acceleration squat
      throttle: 0.5,
      doorsOpen: false,
    };
  } else if (cycle < 60) {
    // 13. Exit to Road (S-Turn away)
    const t = easeInOutCubic((cycle - 55) / 5);

    return {
      phase: 'turning_out',
      x: THREE.MathUtils.lerp(0, ENTRY_X, t), // Simplified linear blend for now
      z: THREE.MathUtils.lerp(80, ROAD_Z, t),
      rotation: 0, // Should be calculating curve angle but linear is safer for quick fix
      speed: 0.5 + t * 0.4,
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: true && signalBlink,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: -0.02,
      throttle: 0.6,
      doorsOpen: false,
    };
  } else {
    // 14. Left
    return {
      phase: 'leaving',
      x: ENTRY_X,
      z: ROAD_Z,
      rotation: 0,
      speed: 0.9,
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
  }
};

// Calculate truck state for RECEIVING dock (back of building, z=-50)
export const calculateReceivingTruckState = (cycle: number, time: number): TruckAnimState => {
  const ROAD_Z = -120;
  const YARD_ENTRY_Z = -85;
  const TURN_START_Z = -65;
  const ALIGN_Z = -78;
  const DOCK_Z = -53;

  const ENTRY_X = -20;
  const TURN_OUT_X = -25;
  const ALIGN_X = 0;

  // 1. Approach and Swing out (Mirror of Shipping)
  // Drive from -120 to -65, swing X from -20 to -25
  const approachP0: [number, number] = [ENTRY_X, YARD_ENTRY_Z];
  const approachP1: [number, number] = [ENTRY_X, -75];
  const approachP2: [number, number] = [TURN_OUT_X, -70];
  const approachP3: [number, number] = [TURN_OUT_X, TURN_START_Z];

  // 2. The U-Turn (swinging around to face away from dock i.e. facing -Z)
  // From (-25, -65) to (0, -78)
  const turnP0: [number, number] = [TURN_OUT_X, TURN_START_Z];
  const turnP1: [number, number] = [TURN_OUT_X, -60];
  const turnP2: [number, number] = [5, -60]; // Cut across
  const turnP3: [number, number] = [ALIGN_X, ALIGN_Z];

  const signalBlink = Math.sin(time * 8) > 0;

  if (cycle < 5) {
    const t = easeOutQuad(cycle / 5);
    return {
      phase: 'entering',
      x: ENTRY_X,
      z: THREE.MathUtils.lerp(ROAD_Z, YARD_ENTRY_Z, t),
      rotation: 0, // Facing +Z (coming from -Z)
      speed: 1.0 - t * 0.3,
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: 0.02,
      throttle: 0.6,
      doorsOpen: false,
    };
  } else if (cycle < 10) {
    // 2. Drive Deep & Swing Wide
    const t = easeInOutCubic((cycle - 5) / 5);
    const [x, z] = cubicBezierPoint(approachP0, approachP1, approachP2, approachP3, t);
    const angle = cubicBezierTangentAngle(approachP0, approachP1, approachP2, approachP3, t);
    const trailerLag = calculateTrailerAngleOnCurve(
      approachP0,
      approachP1,
      approachP2,
      approachP3,
      t,
      angle,
      0.15
    );

    return {
      phase: 'positioning',
      x,
      z,
      rotation: angle, // Moving in +Z direction generally
      speed: 0.6,
      steeringAngle: angle * 2,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: true && signalBlink,
      trailerAngle: trailerLag,
      cabRoll: -trailerLag * 0.1,
      cabPitch: 0,
      throttle: 0.5,
      doorsOpen: false,
    };
  } else if (cycle < 18) {
    // 3. The U-Turn
    const t = easeInOutCubic((cycle - 10) / 8);
    const [x, z] = cubicBezierPoint(turnP0, turnP1, turnP2, turnP3, t);
    const angle = cubicBezierTangentAngle(turnP0, turnP1, turnP2, turnP3, t);
    const trailerLag = calculateTrailerAngleOnCurve(turnP0, turnP1, turnP2, turnP3, t, angle, 0.2);

    return {
      phase: 'turning_in',
      x,
      z,
      rotation: angle,
      speed: 0.4,
      steeringAngle: 0.5,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: true && signalBlink,
      trailerAngle: trailerLag,
      cabRoll: -0.05,
      cabPitch: 0,
      throttle: 0.4,
      doorsOpen: false,
    };
  } else if (cycle < 21) {
    // 4. Stop & Straighten (Facing -Z now, Rotation = PI)
    const t = easeInOutCubic((cycle - 18) / 3);
    return {
      phase: 'straightening',
      x: 0,
      z: THREE.MathUtils.lerp(ALIGN_Z, ALIGN_Z - 1, t),
      rotation: THREE.MathUtils.lerp(Math.PI * 0.9, Math.PI, t),
      speed: 0.2 - t * 0.2,
      steeringAngle: 0,
      brakeLights: t > 0.7,
      reverseLights: false,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: THREE.MathUtils.lerp(-0.2, 0, t),
      cabRoll: 0,
      cabPitch: t > 0.7 ? 0.03 : 0,
      throttle: 0.2,
      doorsOpen: false,
    };
  } else if (cycle < 23) {
    // 5. Stop to reverse
    return {
      phase: 'stopping_to_back',
      x: 0,
      z: ALIGN_Z - 1,
      rotation: Math.PI, // Facing -Z (Away from dock which is at -53)
      speed: 0,
      steeringAngle: 0,
      brakeLights: true,
      reverseLights: cycle > 22.5,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: 0,
      throttle: 0.15,
      doorsOpen: false,
    };
  } else if (cycle < 32) {
    // 6. Backing In
    // Moving from -79 to -53 (Positive Z direction, but reversing)
    const t = easeInOutQuad((cycle - 23) / 9);
    const wobble = Math.sin(cycle * 4) * 0.003;

    return {
      phase: 'backing',
      x: wobble,
      z: THREE.MathUtils.lerp(ALIGN_Z - 1, DOCK_Z - 2, t),
      rotation: Math.PI + wobble,
      speed: -0.2,
      steeringAngle: wobble * 8,
      brakeLights: false,
      reverseLights: true,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: wobble,
      cabRoll: 0,
      cabPitch: -0.01,
      throttle: 0.3,
      doorsOpen: false,
    };
  } else if (cycle < 34) {
    // 7. Final
    const t = easeOutQuad((cycle - 32) / 2);
    return {
      phase: 'final_adjustment',
      x: 0,
      z: THREE.MathUtils.lerp(DOCK_Z - 2, DOCK_Z, t),
      rotation: Math.PI,
      speed: -0.05,
      steeringAngle: 0,
      brakeLights: t > 0.8,
      reverseLights: true,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: t > 0.8 ? 0.02 : 0,
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
      cabRoll: 0,
      cabPitch: 0,
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
      cabRoll: 0,
      cabPitch: 0,
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
      cabRoll: 0,
      cabPitch: 0,
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
      cabRoll: 0,
      cabPitch: 0,
      throttle: 0.3,
      doorsOpen: false,
    };
  } else if (cycle < 55) {
    // 12. Pull Out
    const t = easeInQuad((cycle - 52) / 3);
    return {
      phase: 'pulling_out',
      x: 0,
      z: THREE.MathUtils.lerp(DOCK_Z, -80, t),
      rotation: Math.PI,
      speed: t * 0.4,
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: true && signalBlink,
      rightSignal: false,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: -t * 0.05,
      throttle: 0.5,
      doorsOpen: false,
    };
  } else if (cycle < 60) {
    // 13.
    const t = easeInOutCubic((cycle - 55) / 5);

    return {
      phase: 'turning_out',
      x: THREE.MathUtils.lerp(0, ENTRY_X, t),
      z: THREE.MathUtils.lerp(-80, ROAD_Z, t),
      rotation: Math.PI, // Simplified
      speed: 0.5 + t * 0.4,
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: true && signalBlink,
      rightSignal: false,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: -0.02,
      throttle: 0.6,
      doorsOpen: false,
    };
  } else {
    const t = easeInQuad((cycle - 59) / 1);
    return {
      phase: 'leaving',
      x: ENTRY_X,
      z: ROAD_Z,
      rotation: Math.PI,
      speed: 0.9,
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: -0.01 - t * 0.02,
      throttle: 0.8 + t * 0.2,
      doorsOpen: false,
    };
  }
};
