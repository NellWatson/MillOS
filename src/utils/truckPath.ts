/**
 * Naturalistic Truck Animation Path System
 *
 * Realistic "buttonhook" docking maneuver:
 * 1. Enter lot from road
 * 2. Swing wide, execute tight ~180° arc
 * 3. End up facing AWAY from dock, positioned forward of bay
 * 4. Reverse straight back into dock
 * 5. Depart: pull forward, 180° arc out, exit
 *
 * PATH OVERVIEW (bird's eye view, shipping dock at z=52):
 *
 *     Road (z=100)
 *          |
 *          v  ENTER (facing toward building)
 *          |
 *     -----+  (x=20, z=78)
 *           \
 *            \   SWING WIDE
 *             \
 *              +------+
 *                      \
 *                       \  TIGHT 180° ARC
 *                        |
 *              +---------+
 *              |
 *              |  (x=0, z=68) Now facing AWAY from dock
 *              |
 *              v  REVERSE STRAIGHT
 *              |
 *          [DOCK] (x=0, z=52)
 */

// =============================================================================
// TYPES
// =============================================================================

export type TruckPathPhase =
  | 'offscreen'
  | 'entering' // Driving into lot from road
  | 'swinging' // Swinging wide before the arc
  | 'arcing' // Tight 180° arc turn
  | 'settling' // Brief pause, engaging reverse
  | 'reversing' // Backing straight toward dock
  | 'docking' // Final dock adjustment
  | 'docked' // Stationary at dock
  | 'departing' // Pulling forward from dock
  | 'arcing_out' // 180° arc toward exit
  | 'exiting'; // Accelerating out of lot

export interface TruckPathState {
  phase: TruckPathPhase;
  position: { x: number; z: number };
  rotation: number;
  speed: number;
  brakeLights: boolean;
  reverseLights: boolean;
  leftSignal: boolean;
  rightSignal: boolean;
  doorsOpen: boolean;
}

export interface TruckPathConfig {
  // Road position (where truck spawns/despawns)
  roadZ: number;
  // Dock position (final backing target)
  dockX: number;
  dockZ: number;
  // Staging position (where truck stops before reversing, after 180° turn)
  stageX: number;
  stageZ: number;
  // Arc geometry
  arcCenterX: number; // Center of the 180° arc
  arcCenterZ: number;
  arcRadius: number; // Radius of the turn
  // Entry lane offset (which side truck enters from)
  entryOffsetX: number; // Positive = enters from right, negative = from left
  // Direction: 1 = dock at +Z side (shipping), -1 = dock at -Z side (receiving)
  direction: 1 | -1;
  // Timing
  timing: {
    enter: number;
    swing: number;
    arc: number;
    settle: number;
    reverse: number;
    dock: number;
    depart: number;
    arcOut: number;
    exit: number;
  };
}

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

export const SHIPPING_DOCK_CONFIG: TruckPathConfig = {
  roadZ: 105,
  dockX: 0,
  dockZ: 54,
  stageX: 0,
  stageZ: 72,
  arcCenterX: 12,
  arcCenterZ: 72,
  arcRadius: 12,
  entryOffsetX: 24,
  direction: 1,
  timing: {
    enter: 4,
    swing: 3,
    arc: 6,
    settle: 2,
    reverse: 8,
    dock: 14,
    depart: 3,
    arcOut: 6,
    exit: 4,
  },
};

export const RECEIVING_DOCK_CONFIG: TruckPathConfig = {
  roadZ: -105,
  dockX: 0,
  dockZ: -54,
  stageX: 0,
  stageZ: -72,
  arcCenterX: -12,
  arcCenterZ: -72,
  arcRadius: 12,
  entryOffsetX: -24,
  direction: -1,
  timing: {
    enter: 4,
    swing: 3,
    arc: 6,
    settle: 2,
    reverse: 8,
    dock: 14,
    depart: 3,
    arcOut: 6,
    exit: 4,
  },
};

// =============================================================================
// EASING FUNCTIONS
// =============================================================================

const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);

const easeIn = (t: number): number => t * t;

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// =============================================================================
// PATH HELPERS
// =============================================================================

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Calculate position on a circular arc
 * @param cx - Center X
 * @param cz - Center Z
 * @param radius - Arc radius
 * @param startAngle - Start angle in radians
 * @param endAngle - End angle in radians
 * @param t - Progress 0-1
 */
const arcPosition = (
  cx: number,
  cz: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  t: number
): { x: number; z: number; rotation: number } => {
  const angle = lerp(startAngle, endAngle, t);
  return {
    x: cx + Math.cos(angle) * radius,
    z: cz + Math.sin(angle) * radius,
    // Rotation is tangent to arc (perpendicular to radius)
    rotation: angle + Math.PI / 2,
  };
};

/**
 * Cubic bezier for smooth entry swing
 */
const cubicBezier = (
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  t: number
): [number, number] => {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return [
    uuu * p0[0] + 3 * uu * t * p1[0] + 3 * u * tt * p2[0] + ttt * p3[0],
    uuu * p0[1] + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + ttt * p3[1],
  ];
};

/**
 * Calculate tangent angle from cubic bezier derivative
 */
const cubicBezierTangent = (
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  t: number
): number => {
  const u = 1 - t;
  // Derivative of cubic bezier
  const dx =
    3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dz =
    3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  return Math.atan2(dx, dz);
};

// =============================================================================
// MAIN PATH CALCULATOR
// =============================================================================

export function calculateTruckPath(
  cycle: number,
  time: number,
  config: TruckPathConfig
): TruckPathState {
  const { timing, direction } = config;
  const d = direction; // shorthand

  // Cumulative timing thresholds
  const enterEnd = timing.enter;
  const swingEnd = enterEnd + timing.swing;
  const arcEnd = swingEnd + timing.arc;
  const settleEnd = arcEnd + timing.settle;
  const reverseEnd = settleEnd + timing.reverse;
  const dockEnd = reverseEnd + timing.dock;
  const departEnd = dockEnd + timing.depart;
  const arcOutEnd = departEnd + timing.arcOut;
  const cycleLength = arcOutEnd + timing.exit;

  const c = cycle % cycleLength;
  const signalOn = Math.sin(time * 6 * Math.PI) > 0;

  // Key positions
  const entryX = config.entryOffsetX;
  const entryStartZ = config.roadZ;
  const entryEndZ = config.arcCenterZ + config.arcRadius * d;

  // Arc angles (for 180° turn)
  // Shipping (d=1): truck enters from right, turns counterclockwise
  // Start at 0° (3 o'clock), end at π (9 o'clock)
  const arcStartAngle = d === 1 ? 0 : Math.PI;
  const arcEndAngle = d === 1 ? Math.PI : 0;

  // Swing path: from entry lane to start of arc (cubic bezier for smooth curve)
  const swingStart: [number, number] = [entryX, entryEndZ];
  const swingCtrl1: [number, number] = [entryX, config.arcCenterZ];
  const swingCtrl2: [number, number] = [
    config.arcCenterX + config.arcRadius * (d === 1 ? 1 : -1),
    config.arcCenterZ,
  ];
  const swingEnd_: [number, number] = [
    config.arcCenterX + config.arcRadius * (d === 1 ? 1 : -1),
    config.arcCenterZ,
  ];

  // =========================================================================
  // PHASE: ENTERING - straight approach from road
  // =========================================================================
  if (c < enterEnd) {
    const t = easeOut(c / timing.enter);
    const startZ = entryStartZ;
    const endZ = entryEndZ;

    return {
      phase: 'entering',
      position: {
        x: entryX,
        z: lerp(startZ, endZ, t),
      },
      rotation: d === 1 ? Math.PI : 0, // Facing toward dock
      speed: 0.8 - t * 0.2,
      brakeLights: false,
      reverseLights: false,
      leftSignal: d === 1 && signalOn,
      rightSignal: d === -1 && signalOn,
      doorsOpen: false,
    };
  }

  // =========================================================================
  // PHASE: SWINGING - curve from entry lane toward arc start
  // =========================================================================
  if (c < swingEnd) {
    const t = easeInOut((c - enterEnd) / timing.swing);
    const [x, z] = cubicBezier(swingStart, swingCtrl1, swingCtrl2, swingEnd_, t);
    const tangent = cubicBezierTangent(swingStart, swingCtrl1, swingCtrl2, swingEnd_, t);

    return {
      phase: 'swinging',
      position: { x, z },
      rotation: tangent + (d === 1 ? Math.PI : 0),
      speed: 0.5,
      brakeLights: false,
      reverseLights: false,
      leftSignal: d === 1 && signalOn,
      rightSignal: d === -1 && signalOn,
      doorsOpen: false,
    };
  }

  // =========================================================================
  // PHASE: ARCING - tight 180° circular arc
  // =========================================================================
  if (c < arcEnd) {
    const t = easeInOutCubic((c - swingEnd) / timing.arc);
    const arc = arcPosition(
      config.arcCenterX,
      config.arcCenterZ,
      config.arcRadius,
      arcStartAngle,
      arcEndAngle,
      t
    );

    // Adjust rotation for direction
    let rotation = arc.rotation;
    if (d === 1) {
      rotation = arc.rotation + Math.PI;
    }

    return {
      phase: 'arcing',
      position: { x: arc.x, z: arc.z },
      rotation: rotation,
      speed: 0.35,
      brakeLights: t > 0.8,
      reverseLights: false,
      leftSignal: d === 1 && signalOn,
      rightSignal: d === -1 && signalOn,
      doorsOpen: false,
    };
  }

  // =========================================================================
  // PHASE: SETTLING - stopped, shifting to reverse
  // =========================================================================
  if (c < settleEnd) {
    const t = (c - arcEnd) / timing.settle;

    // Final position after arc: facing away from dock
    const finalArcPos = arcPosition(
      config.arcCenterX,
      config.arcCenterZ,
      config.arcRadius,
      arcStartAngle,
      arcEndAngle,
      1
    );

    // Smoothly align to staging position
    const alignT = easeOut(t);
    const x = lerp(finalArcPos.x, config.stageX, alignT);
    const z = finalArcPos.z;

    return {
      phase: 'settling',
      position: { x, z },
      rotation: d === 1 ? 0 : Math.PI, // Facing away from dock
      speed: 0,
      brakeLights: true,
      reverseLights: t > 0.6,
      leftSignal: false,
      rightSignal: false,
      doorsOpen: false,
    };
  }

  // =========================================================================
  // PHASE: REVERSING - straight backup to dock
  // =========================================================================
  if (c < reverseEnd) {
    const t = easeInOut((c - settleEnd) / timing.reverse);
    // Subtle steering corrections for realism
    const wobble = Math.sin(c * 2.5) * 0.012 * (1 - t * 0.7);

    return {
      phase: 'reversing',
      position: {
        x: config.stageX + wobble * 1.5,
        z: lerp(config.stageZ, config.dockZ + 0.5, t),
      },
      rotation: (d === 1 ? 0 : Math.PI) + wobble,
      speed: -0.2,
      brakeLights: false,
      reverseLights: true,
      leftSignal: false,
      rightSignal: false,
      doorsOpen: false,
    };
  }

  // =========================================================================
  // PHASE: DOCKING - final creep + stationary
  // =========================================================================
  if (c < dockEnd) {
    const phaseTime = c - reverseEnd;
    const creepTime = 1.5;

    if (phaseTime < creepTime) {
      const t = easeOut(phaseTime / creepTime);
      return {
        phase: 'docking',
        position: {
          x: config.dockX,
          z: lerp(config.dockZ + 0.5, config.dockZ, t),
        },
        rotation: d === 1 ? 0 : Math.PI,
        speed: -0.03 * (1 - t),
        brakeLights: t > 0.5,
        reverseLights: t < 0.5,
        leftSignal: false,
        rightSignal: false,
        doorsOpen: false,
      };
    }

    // Stationary at dock
    const dockedTime = phaseTime - creepTime;
    const doorOpenDelay = 0.8;
    const doorCloseStart = timing.dock - creepTime - 1.5;

    return {
      phase: 'docked',
      position: { x: config.dockX, z: config.dockZ },
      rotation: d === 1 ? 0 : Math.PI,
      speed: 0,
      brakeLights: false,
      reverseLights: false,
      leftSignal: false,
      rightSignal: false,
      doorsOpen: dockedTime > doorOpenDelay && dockedTime < doorCloseStart,
    };
  }

  // =========================================================================
  // PHASE: DEPARTING - pull forward from dock
  // =========================================================================
  if (c < departEnd) {
    const t = easeIn((c - dockEnd) / timing.depart);

    return {
      phase: 'departing',
      position: {
        x: config.dockX,
        z: lerp(config.dockZ, config.stageZ, t),
      },
      rotation: d === 1 ? 0 : Math.PI, // Still facing away
      speed: t * 0.5,
      brakeLights: false,
      reverseLights: false,
      leftSignal: d === -1 && signalOn,
      rightSignal: d === 1 && signalOn,
      doorsOpen: false,
    };
  }

  // =========================================================================
  // PHASE: ARCING OUT - 180° arc back toward exit lane
  // =========================================================================
  if (c < arcOutEnd) {
    const t = easeInOutCubic((c - departEnd) / timing.arcOut);

    // Reverse the arc direction for departure
    const arc = arcPosition(
      config.arcCenterX,
      config.arcCenterZ,
      config.arcRadius,
      arcEndAngle, // Start where we ended
      arcStartAngle, // End where we started
      t
    );

    let rotation = arc.rotation;
    if (d === -1) {
      rotation = arc.rotation + Math.PI;
    }

    return {
      phase: 'arcing_out',
      position: { x: arc.x, z: arc.z },
      rotation: rotation,
      speed: 0.45,
      brakeLights: false,
      reverseLights: false,
      leftSignal: d === -1 && signalOn,
      rightSignal: d === 1 && signalOn,
      doorsOpen: false,
    };
  }

  // =========================================================================
  // PHASE: EXITING - accelerate out to road
  // =========================================================================
  const t = easeIn((c - arcOutEnd) / timing.exit);

  return {
    phase: 'exiting',
    position: {
      x: entryX,
      z: lerp(entryEndZ, entryStartZ, t),
    },
    rotation: d === 1 ? Math.PI : 0, // Facing toward road (away from building)
    speed: 0.6 + t * 0.5,
    brakeLights: false,
    reverseLights: false,
    leftSignal: false,
    rightSignal: false,
    doorsOpen: false,
  };
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

export function getCycleLength(config: TruckPathConfig): number {
  const { timing } = config;
  return (
    timing.enter +
    timing.swing +
    timing.arc +
    timing.settle +
    timing.reverse +
    timing.dock +
    timing.depart +
    timing.arcOut +
    timing.exit
  );
}

export function calculateShippingPath(cycle: number, time: number): TruckPathState {
  return calculateTruckPath(cycle, time, SHIPPING_DOCK_CONFIG);
}

export function calculateReceivingPath(cycle: number, time: number): TruckPathState {
  return calculateTruckPath(cycle, time, RECEIVING_DOCK_CONFIG);
}

export function isTruckDocked(state: TruckPathState): boolean {
  return state.phase === 'docked' || state.phase === 'docking';
}

export function isTruckApproaching(state: TruckPathState): boolean {
  return ['entering', 'swinging', 'arcing', 'settling', 'reversing'].includes(state.phase);
}
