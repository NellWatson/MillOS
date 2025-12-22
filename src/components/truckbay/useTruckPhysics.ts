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

const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// =============================================================================
// PATH HELPERS
// =============================================================================

/**
 * Quadratic bezier curve for smooth S-curves
 */
const quadraticBezier = (
  p0: { x: number; z: number },
  p1: { x: number; z: number },
  p2: { x: number; z: number },
  t: number
): { x: number; z: number } => {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    z: mt * mt * p0.z + 2 * mt * t * p1.z + t * t * p2.z,
  };
};

/**
 * Get tangent angle from bezier curve derivative
 */
const bezierTangentAngle = (
  p0: { x: number; z: number },
  p1: { x: number; z: number },
  p2: { x: number; z: number },
  t: number
): number => {
  const mt = 1 - t;
  // Derivative: 2(1-t)(P1-P0) + 2t(P2-P1)
  const dx = 2 * mt * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const dz = 2 * mt * (p1.z - p0.z) + 2 * t * (p2.z - p1.z);
  return Math.atan2(dx, dz); // Returns angle where +Z is 0, +X is PI/2
};

/**
 * Calculate trailer articulation from steering and speed
 * Trailer lags behind cab during turns, creating jackknife effect
 */
const calculateTrailerLag = (
  steeringAngle: number,
  speed: number,
  maxLag: number = 0.15
): number => {
  // Positive steering = turning right, trailer swings left (negative angle relative to cab)
  return Math.max(-maxLag, Math.min(maxLag, -steeringAngle * Math.abs(speed) * 0.8));
};

/**
 * Calculate cab roll during turns (centripetal lean)
 */
const calculateCabRoll = (steeringAngle: number, speed: number): number => {
  return steeringAngle * Math.abs(speed) * 0.05;
};

// =============================================================================
// SHIPPING DOCK (Front of building, z=50)
// Truck enters from +Z road, does a wide left turn, backs into dock
// =============================================================================

export const calculateShippingTruckState = (cycle: number, time: number): TruckAnimState => {
  // Road and dock positions - corrected for trailer length
  // Trailer rear at local z=-10.5, so truck needs to be at z=61 for trailer at z=50.5
  // Tunnel entrance at z=220, extends 90 units deep to z=310
  const ROAD_Z = 270; // Inside tunnel (50 units from entrance at z=220)
  const ROAD_X = 20; // Road centerline
  const DOCK_Z = 61; // Corrected: places trailer rear at dock bumpers (~z=50.5)
  const DOCK_X = 0; // Centered on dock

  // Turn geometry - wide left buttonhook
  const APPROACH_Z = 95; // Where truck starts the turn
  const TURN_WIDE_X = -18; // How far left the truck swings
  const TURN_CENTER_Z = 78; // Center of the turn arc
  const BACKING_START_Z = 78; // Where backing begins
  const BACKING_START_X = -16; // Position after completing turn

  // Phase durations (total ~57s + 3s leaving = 60s cycle)
  const T_ENTER = 6; // Approach from road (slightly longer for tunnel distance)
  const T_TURN = 7; // Wide left turn (S-curve)
  const T_SETTLE = 1.5; // Stop and prepare to back
  const T_BACKING = 9; // Backing maneuver with corrections
  const T_FINAL = 1.5; // Final dock adjustment
  const T_DOCKED = 12; // Loading time
  const T_PREP = 1.5; // Prepare to leave
  const T_PULLOUT = 3.5; // Pull forward from dock
  const T_EXIT_TURN = 6; // Turn right to exit
  const T_ACCEL = 5; // Accelerate toward road

  const signalBlink = Math.sin(time * 8) > 0;

  // ==========================================================================
  // PHASE 1: ENTERING - Straight approach from road
  // ==========================================================================
  if (cycle < T_ENTER) {
    const t = smoothstep(cycle / T_ENTER);
    const speed = lerp(1.0, 0.45, easeOutQuad(t));
    return {
      phase: 'entering',
      x: ROAD_X,
      z: lerp(ROAD_Z, APPROACH_Z, t),
      rotation: Math.PI, // Facing -Z (toward building)
      speed,
      steeringAngle: 0,
      brakeLights: t > 0.85,
      reverseLights: false,
      leftSignal: t > 0.6 && signalBlink, // Signal left turn ahead
      rightSignal: false,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: t > 0.85 ? 0.015 : 0, // Nose dip when braking
      throttle: lerp(0.7, 0.25, t),
      doorsOpen: false,
    };
  }

  // ==========================================================================
  // PHASE 2: TURNING IN - Wide left S-curve to set up for backing
  // ==========================================================================
  if (cycle < T_ENTER + T_TURN) {
    const t = easeInOutCubic((cycle - T_ENTER) / T_TURN);

    // S-curve using quadratic bezier
    // Start: approaching from right side
    // Control: swing wide to the left
    // End: positioned to back straight in
    const p0 = { x: ROAD_X, z: APPROACH_Z };
    const p1 = { x: TURN_WIDE_X - 5, z: TURN_CENTER_Z + 8 }; // Control point - wide left
    const p2 = { x: BACKING_START_X, z: BACKING_START_Z };

    const pos = quadraticBezier(p0, p1, p2, t);

    // Rotation follows the path tangent, transitioning from PI (facing -Z) to 0 (facing +Z)
    // Use bezier tangent for natural rotation
    const tangentAngle = bezierTangentAngle(p0, p1, p2, t);
    // Adjust: tangent gives direction of travel, truck faces opposite when going forward
    const rotation = tangentAngle + Math.PI;

    // Steering follows the curvature
    const steeringAngle = -0.45 * Math.sin(t * Math.PI); // Left turn (negative)

    const trailerLag = calculateTrailerLag(steeringAngle, 0.35);
    const cabRoll = calculateCabRoll(steeringAngle, 0.35);

    return {
      phase: 'turning_in',
      x: pos.x,
      z: pos.z,
      rotation: rotation,
      speed: 0.35,
      steeringAngle,
      brakeLights: t > 0.9,
      reverseLights: false,
      leftSignal: signalBlink,
      rightSignal: false,
      trailerAngle: trailerLag,
      cabRoll,
      cabPitch: 0,
      throttle: 0.35,
      doorsOpen: false,
    };
  }

  // ==========================================================================
  // PHASE 3: STOPPING TO BACK - Brief pause to engage reverse
  // ==========================================================================
  if (cycle < T_ENTER + T_TURN + T_SETTLE) {
    const t = easeOutQuad((cycle - T_ENTER - T_TURN) / T_SETTLE);

    // Settle position and rotation
    const x = lerp(BACKING_START_X, BACKING_START_X + 1, t); // Small drift
    const z = BACKING_START_Z;
    const rotation = lerp(0.08, 0, smoothstep(t)); // Straighten out to face +Z

    return {
      phase: 'stopping_to_back',
      x,
      z,
      rotation,
      speed: lerp(0.08, 0, t),
      steeringAngle: lerp(-0.1, 0, t),
      brakeLights: true,
      reverseLights: t > 0.5,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: lerp(0.03, 0, t),
      cabRoll: 0,
      cabPitch: t < 0.4 ? 0.02 : 0,
      throttle: 0.15,
      doorsOpen: false,
    };
  }

  // ==========================================================================
  // PHASE 4: BACKING - S-curve backing maneuver with steering corrections
  // ==========================================================================
  if (cycle < T_ENTER + T_TURN + T_SETTLE + T_BACKING) {
    const phaseStart = T_ENTER + T_TURN + T_SETTLE;
    const t = easeInOutQuad((cycle - phaseStart) / T_BACKING);

    // Backing S-curve: start wide left, steer right to bring trailer to center
    // The key is that when backing, steering RIGHT swings the trailer LEFT
    const p0 = { x: BACKING_START_X + 1, z: BACKING_START_Z };
    const p1 = { x: -6, z: 70 }; // Control point - gradual approach
    const p2 = { x: DOCK_X, z: DOCK_Z + 1 };

    const pos = quadraticBezier(p0, p1, p2, t);

    // Rotation: start at ~0, make small corrections, end at 0
    // Add realistic wobble from steering corrections
    const correctionWobble = Math.sin(cycle * 2.5) * 0.02 * (1 - t);
    const rotationBase = lerp(0.05, 0, smoothstep(t));
    const rotation = rotationBase + correctionWobble;

    // Steering: turn right (positive) when backing to bring trailer left to center
    // More steering early in the maneuver, less as we approach dock
    const steerPhase = Math.sin(t * Math.PI * 0.8);
    const steeringAngle = 0.25 * steerPhase * (1 - t * 0.5) + correctionWobble * 3;

    const trailerLag = calculateTrailerLag(steeringAngle, -0.2); // Negative speed for backing

    return {
      phase: 'backing',
      x: pos.x,
      z: pos.z,
      rotation,
      speed: -0.22,
      steeringAngle,
      brakeLights: false,
      reverseLights: true,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: trailerLag + correctionWobble * 0.5,
      cabRoll: 0,
      cabPitch: -0.008, // Slight rear-down pitch when reversing
      throttle: 0.22,
      doorsOpen: false,
    };
  }

  // ==========================================================================
  // PHASE 5: FINAL ADJUSTMENT - Last few inches to dock
  // ==========================================================================
  if (cycle < T_ENTER + T_TURN + T_SETTLE + T_BACKING + T_FINAL) {
    const phaseStart = T_ENTER + T_TURN + T_SETTLE + T_BACKING;
    const t = easeOutCubic((cycle - phaseStart) / T_FINAL);

    return {
      phase: 'final_adjustment',
      x: lerp(DOCK_X + 0.1, DOCK_X, t),
      z: lerp(DOCK_Z + 1, DOCK_Z, t),
      rotation: lerp(0.01, 0, t),
      speed: -0.04 * (1 - t),
      steeringAngle: 0,
      brakeLights: t > 0.6,
      reverseLights: t < 0.7,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: lerp(0.01, 0, t),
      cabRoll: 0,
      cabPitch: t > 0.6 ? 0.015 : 0,
      throttle: 0.08,
      doorsOpen: false,
    };
  }

  // ==========================================================================
  // PHASE 6: DOCKED - Loading/unloading
  // ==========================================================================
  if (cycle < T_ENTER + T_TURN + T_SETTLE + T_BACKING + T_FINAL + T_DOCKED) {
    const phaseStart = T_ENTER + T_TURN + T_SETTLE + T_BACKING + T_FINAL;
    const phaseTime = cycle - phaseStart;

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
      throttle: 0.08, // Idle
      doorsOpen: phaseTime > 1 && phaseTime < T_DOCKED - 1.5,
    };
  }

  // ==========================================================================
  // PHASE 7: PREPARING TO LEAVE
  // ==========================================================================
  if (cycle < T_ENTER + T_TURN + T_SETTLE + T_BACKING + T_FINAL + T_DOCKED + T_PREP) {
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
      rightSignal: signalBlink, // Signal right turn
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: 0,
      throttle: 0.25,
      doorsOpen: false,
    };
  }

  // ==========================================================================
  // PHASE 8: PULLING OUT - Drive forward from dock
  // ==========================================================================
  const pulloutStart = T_ENTER + T_TURN + T_SETTLE + T_BACKING + T_FINAL + T_DOCKED + T_PREP;
  if (cycle < pulloutStart + T_PULLOUT) {
    const t = easeInQuad((cycle - pulloutStart) / T_PULLOUT);

    return {
      phase: 'pulling_out',
      x: DOCK_X,
      z: lerp(DOCK_Z, BACKING_START_Z - 2, t),
      rotation: 0,
      speed: lerp(0.05, 0.45, t),
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: signalBlink,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: -0.02 * t, // Nose down as accelerating
      throttle: lerp(0.3, 0.5, t),
      doorsOpen: false,
    };
  }

  // ==========================================================================
  // PHASE 9: TURNING OUT - Right turn toward road
  // ==========================================================================
  const exitTurnStart = pulloutStart + T_PULLOUT;
  if (cycle < exitTurnStart + T_EXIT_TURN) {
    const t = easeInOutCubic((cycle - exitTurnStart) / T_EXIT_TURN);

    // Exit S-curve: turn right to head toward road
    const p0 = { x: DOCK_X, z: BACKING_START_Z - 2 };
    const p1 = { x: ROAD_X - 8, z: APPROACH_Z - 5 }; // Control point
    const p2 = { x: ROAD_X, z: APPROACH_Z + 15 };

    const pos = quadraticBezier(p0, p1, p2, t);

    // Rotation: from 0 (facing +Z) to PI (facing -Z for exit)
    // Actually we want to face +Z to leave, so rotation goes from 0 toward 0
    // Wait - truck leaves toward +Z, so rotation should be near 0
    const tangentAngle = bezierTangentAngle(p0, p1, p2, t);
    const rotation = tangentAngle + Math.PI;

    const steeringAngle = 0.35 * Math.sin(t * Math.PI); // Right turn
    const trailerLag = calculateTrailerLag(steeringAngle, 0.5);

    return {
      phase: 'turning_out',
      x: pos.x,
      z: pos.z,
      rotation: Math.abs(rotation) < 0.1 ? 0 : rotation, // Snap to 0 when close
      speed: 0.5 + t * 0.15,
      steeringAngle,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: t < 0.8 && signalBlink,
      trailerAngle: trailerLag,
      cabRoll: calculateCabRoll(steeringAngle, 0.5),
      cabPitch: -0.015,
      throttle: 0.55,
      doorsOpen: false,
    };
  }

  // ==========================================================================
  // PHASE 10: ACCELERATING - Head toward road exit
  // ==========================================================================
  const accelStart = exitTurnStart + T_EXIT_TURN;
  if (cycle < accelStart + T_ACCEL) {
    const t = easeInQuad((cycle - accelStart) / T_ACCEL);

    return {
      phase: 'accelerating',
      x: ROAD_X,
      z: lerp(APPROACH_Z + 15, ROAD_Z, t),
      rotation: 0, // Facing +Z (away from building, toward tunnel)
      speed: 0.75 + t * 0.4,
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: -0.02,
      throttle: 0.75 + t * 0.15,
      doorsOpen: false,
    };
  }

  // ==========================================================================
  // PHASE 11: LEAVING - Hold at road position
  // ==========================================================================
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
// RECEIVING DOCK (Back of building, z=-50)
// Mirror of shipping - approaches from -Z, does wide right turn, backs in
// =============================================================================

export const calculateReceivingTruckState = (cycle: number, time: number): TruckAnimState => {
  // Road and dock positions - mirrored from shipping
  // Tunnel entrance at z=-220, extends 90 units deep to z=-310
  const ROAD_Z = -270; // Inside tunnel (50 units from entrance at z=-220)
  const ROAD_X = -20; // Mirrored: left side of road
  const DOCK_Z = -61; // Corrected: places trailer rear at dock bumpers (~z=-50.5)
  const DOCK_X = 0;

  // Turn geometry - wide right buttonhook (mirror of shipping's left turn)
  const APPROACH_Z = -95;
  const TURN_WIDE_X = 18; // Mirror: swing right instead of left
  const TURN_CENTER_Z = -78;
  const BACKING_START_Z = -78;
  const BACKING_START_X = 16; // Mirror of shipping

  // Same phase durations as shipping
  const T_ENTER = 6; // Match shipping
  const T_TURN = 7;
  const T_SETTLE = 1.5;
  const T_BACKING = 9;
  const T_FINAL = 1.5;
  const T_DOCKED = 12;
  const T_PREP = 1.5;
  const T_PULLOUT = 3.5;
  const T_EXIT_TURN = 6;
  const T_ACCEL = 5;

  const signalBlink = Math.sin(time * 8) > 0;

  // ==========================================================================
  // PHASE 1: ENTERING - Straight approach from road
  // ==========================================================================
  if (cycle < T_ENTER) {
    const t = smoothstep(cycle / T_ENTER);
    const speed = lerp(1.0, 0.45, easeOutQuad(t));

    return {
      phase: 'entering',
      x: ROAD_X,
      z: lerp(ROAD_Z, APPROACH_Z, t),
      rotation: 0, // Facing +Z (toward building, opposite of shipping)
      speed,
      steeringAngle: 0,
      brakeLights: t > 0.85,
      reverseLights: false,
      leftSignal: false,
      rightSignal: t > 0.6 && signalBlink, // Signal right turn ahead (mirror)
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: t > 0.85 ? 0.015 : 0,
      throttle: lerp(0.7, 0.25, t),
      doorsOpen: false,
    };
  }

  // ==========================================================================
  // PHASE 2: TURNING IN - Wide right S-curve (mirror of shipping's left)
  // ==========================================================================
  if (cycle < T_ENTER + T_TURN) {
    const t = easeInOutCubic((cycle - T_ENTER) / T_TURN);

    // S-curve mirrored: swing right instead of left
    const p0 = { x: ROAD_X, z: APPROACH_Z };
    const p1 = { x: TURN_WIDE_X + 5, z: TURN_CENTER_Z - 8 }; // Control point - wide right
    const p2 = { x: BACKING_START_X, z: BACKING_START_Z };

    const pos = quadraticBezier(p0, p1, p2, t);

    const tangentAngle = bezierTangentAngle(p0, p1, p2, t);
    const rotation = tangentAngle + Math.PI;

    // Steering: right turn (positive, mirror of shipping's negative)
    const steeringAngle = 0.45 * Math.sin(t * Math.PI);

    const trailerLag = calculateTrailerLag(steeringAngle, 0.35);
    const cabRoll = calculateCabRoll(steeringAngle, 0.35);

    return {
      phase: 'turning_in',
      x: pos.x,
      z: pos.z,
      rotation: rotation,
      speed: 0.35,
      steeringAngle,
      brakeLights: t > 0.9,
      reverseLights: false,
      leftSignal: false,
      rightSignal: signalBlink,
      trailerAngle: trailerLag,
      cabRoll,
      cabPitch: 0,
      throttle: 0.35,
      doorsOpen: false,
    };
  }

  // ==========================================================================
  // PHASE 3: STOPPING TO BACK
  // ==========================================================================
  if (cycle < T_ENTER + T_TURN + T_SETTLE) {
    const t = easeOutQuad((cycle - T_ENTER - T_TURN) / T_SETTLE);

    const x = lerp(BACKING_START_X, BACKING_START_X - 1, t); // Mirror drift
    const z = BACKING_START_Z;
    const rotation = lerp(Math.PI - 0.08, Math.PI, smoothstep(t)); // Settle to PI

    return {
      phase: 'stopping_to_back',
      x,
      z,
      rotation,
      speed: lerp(0.08, 0, t),
      steeringAngle: lerp(0.1, 0, t),
      brakeLights: true,
      reverseLights: t > 0.5,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: lerp(-0.03, 0, t),
      cabRoll: 0,
      cabPitch: t < 0.4 ? 0.02 : 0,
      throttle: 0.15,
      doorsOpen: false,
    };
  }

  // ==========================================================================
  // PHASE 4: BACKING - Mirrored S-curve backing
  // ==========================================================================
  if (cycle < T_ENTER + T_TURN + T_SETTLE + T_BACKING) {
    const phaseStart = T_ENTER + T_TURN + T_SETTLE;
    const t = easeInOutQuad((cycle - phaseStart) / T_BACKING);

    // Mirrored backing: start wide right, steer left to center
    const p0 = { x: BACKING_START_X - 1, z: BACKING_START_Z };
    const p1 = { x: 6, z: -70 }; // Mirror control point
    const p2 = { x: DOCK_X, z: DOCK_Z - 1 };

    const pos = quadraticBezier(p0, p1, p2, t);

    const correctionWobble = Math.sin(cycle * 2.5) * 0.02 * (1 - t);
    const rotationBase = lerp(Math.PI - 0.05, Math.PI, smoothstep(t));
    const rotation = rotationBase + correctionWobble;

    // Mirrored steering: turn left (negative) when backing
    const steerPhase = Math.sin(t * Math.PI * 0.8);
    const steeringAngle = -0.25 * steerPhase * (1 - t * 0.5) - correctionWobble * 3;

    const trailerLag = calculateTrailerLag(steeringAngle, -0.2);

    return {
      phase: 'backing',
      x: pos.x,
      z: pos.z,
      rotation,
      speed: -0.22,
      steeringAngle,
      brakeLights: false,
      reverseLights: true,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: trailerLag - correctionWobble * 0.5,
      cabRoll: 0,
      cabPitch: -0.008,
      throttle: 0.22,
      doorsOpen: false,
    };
  }

  // ==========================================================================
  // PHASE 5: FINAL ADJUSTMENT
  // ==========================================================================
  if (cycle < T_ENTER + T_TURN + T_SETTLE + T_BACKING + T_FINAL) {
    const phaseStart = T_ENTER + T_TURN + T_SETTLE + T_BACKING;
    const t = easeOutCubic((cycle - phaseStart) / T_FINAL);

    return {
      phase: 'final_adjustment',
      x: lerp(DOCK_X - 0.1, DOCK_X, t),
      z: lerp(DOCK_Z - 1, DOCK_Z, t),
      rotation: lerp(Math.PI - 0.01, Math.PI, t),
      speed: -0.04 * (1 - t),
      steeringAngle: 0,
      brakeLights: t > 0.6,
      reverseLights: t < 0.7,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: lerp(-0.01, 0, t),
      cabRoll: 0,
      cabPitch: t > 0.6 ? 0.015 : 0,
      throttle: 0.08,
      doorsOpen: false,
    };
  }

  // ==========================================================================
  // PHASE 6: DOCKED
  // ==========================================================================
  if (cycle < T_ENTER + T_TURN + T_SETTLE + T_BACKING + T_FINAL + T_DOCKED) {
    const phaseStart = T_ENTER + T_TURN + T_SETTLE + T_BACKING + T_FINAL;
    const phaseTime = cycle - phaseStart;

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
      throttle: 0.08,
      doorsOpen: phaseTime > 1 && phaseTime < T_DOCKED - 1.5,
    };
  }

  // ==========================================================================
  // PHASE 7: PREPARING TO LEAVE
  // ==========================================================================
  if (cycle < T_ENTER + T_TURN + T_SETTLE + T_BACKING + T_FINAL + T_DOCKED + T_PREP) {
    return {
      phase: 'preparing_to_leave',
      x: DOCK_X,
      z: DOCK_Z,
      rotation: Math.PI,
      speed: 0,
      steeringAngle: 0,
      brakeLights: true,
      reverseLights: false,
      leftSignal: signalBlink, // Mirror: signal left
      rightSignal: false,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: 0,
      throttle: 0.25,
      doorsOpen: false,
    };
  }

  // ==========================================================================
  // PHASE 8: PULLING OUT
  // ==========================================================================
  const pulloutStart = T_ENTER + T_TURN + T_SETTLE + T_BACKING + T_FINAL + T_DOCKED + T_PREP;
  if (cycle < pulloutStart + T_PULLOUT) {
    const t = easeInQuad((cycle - pulloutStart) / T_PULLOUT);

    return {
      phase: 'pulling_out',
      x: DOCK_X,
      z: lerp(DOCK_Z, BACKING_START_Z + 2, t),
      rotation: Math.PI,
      speed: lerp(0.05, 0.45, t),
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: signalBlink,
      rightSignal: false,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: -0.02 * t,
      throttle: lerp(0.3, 0.5, t),
      doorsOpen: false,
    };
  }

  // ==========================================================================
  // PHASE 9: TURNING OUT - Left turn toward road (mirror of shipping's right)
  // ==========================================================================
  const exitTurnStart = pulloutStart + T_PULLOUT;
  if (cycle < exitTurnStart + T_EXIT_TURN) {
    const t = easeInOutCubic((cycle - exitTurnStart) / T_EXIT_TURN);

    // Mirrored exit curve
    const p0 = { x: DOCK_X, z: BACKING_START_Z + 2 };
    const p1 = { x: ROAD_X + 8, z: APPROACH_Z + 5 }; // Mirror control
    const p2 = { x: ROAD_X, z: APPROACH_Z - 15 };

    const pos = quadraticBezier(p0, p1, p2, t);

    const tangentAngle = bezierTangentAngle(p0, p1, p2, t);
    const rotation = tangentAngle + Math.PI;

    const steeringAngle = -0.35 * Math.sin(t * Math.PI); // Left turn (mirror)
    const trailerLag = calculateTrailerLag(steeringAngle, 0.5);

    return {
      phase: 'turning_out',
      x: pos.x,
      z: pos.z,
      rotation: Math.abs(rotation - Math.PI) < 0.1 ? Math.PI : rotation,
      speed: 0.5 + t * 0.15,
      steeringAngle,
      brakeLights: false,
      reverseLights: false,
      leftSignal: t < 0.8 && signalBlink,
      rightSignal: false,
      trailerAngle: trailerLag,
      cabRoll: calculateCabRoll(steeringAngle, 0.5),
      cabPitch: -0.015,
      throttle: 0.55,
      doorsOpen: false,
    };
  }

  // ==========================================================================
  // PHASE 10: ACCELERATING
  // ==========================================================================
  const accelStart = exitTurnStart + T_EXIT_TURN;
  if (cycle < accelStart + T_ACCEL) {
    const t = easeInQuad((cycle - accelStart) / T_ACCEL);

    return {
      phase: 'accelerating',
      x: ROAD_X,
      z: lerp(APPROACH_Z - 15, ROAD_Z, t),
      rotation: Math.PI, // Facing -Z (toward tunnel)
      speed: 0.75 + t * 0.4,
      steeringAngle: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: false,
      trailerAngle: 0,
      cabRoll: 0,
      cabPitch: -0.02,
      throttle: 0.75 + t * 0.15,
      doorsOpen: false,
    };
  }

  // ==========================================================================
  // PHASE 11: LEAVING
  // ==========================================================================
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
