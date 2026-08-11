export type Vec3Tuple = readonly [number, number, number];

export interface SiteBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export interface SitePortal {
  readonly id: 'shipping-dock' | 'receiving-dock' | 'east-service' | 'west-service';
  readonly label: string;
  readonly centre: Vec3Tuple;
  readonly normal: Vec3Tuple;
  readonly halfWidth: number;
  readonly height: number;
  readonly transitionDepth: number;
}

export interface MachineAnchor {
  readonly id: string;
  readonly position: Vec3Tuple;
}

export interface ServiceAssetAnchor {
  readonly id: string;
  readonly position: Vec3Tuple;
  readonly rotation: number;
  readonly footprint: readonly [number, number];
  readonly height: number;
  readonly clearance: number;
}

export interface VehicleRouteAnchor {
  readonly id: string;
  readonly vehicle: 'forklift' | 'truck';
  readonly points: readonly Vec3Tuple[];
  /** Half of the swept X/Z corridor, including the vehicle body and a safety margin. */
  readonly halfWidth: number;
  readonly closed: boolean;
}

export interface RouteHazardAnchor {
  readonly id: string;
  readonly type: 'conveyor' | 'intersection';
  readonly bounds: Pick<SiteBounds, 'minX' | 'maxX' | 'minZ' | 'maxZ'>;
}

export interface LandmarkAnchor {
  readonly id: string;
  readonly position: Vec3Tuple;
  readonly rotation: Vec3Tuple;
  readonly scale: number;
  /** Conservative X/Z footprint used by placement and regression checks. */
  readonly footprint: readonly [number, number];
  readonly height: number;
}

export const SITE_LAYOUT = {
  units: 'metres',
  axes: {
    east: '+X',
    up: '+Y',
    shipping: '+Z',
  },
  datum: {
    terrain: -0.02,
    yard: -0.02,
    interiorFloor: 0,
    dockPlatform: 1,
    mezzanine: 9,
    waterBed: 0.01,
    water: 0.08,
    groundOverlay: -0.01,
  },
  world: {
    radius: 255,
    horizonRadius: 260,
  },
  perimeter: {
    minX: -95,
    maxX: 95,
    minY: 0,
    maxY: 4,
    minZ: -85,
    maxZ: 85,
  } satisfies SiteBounds,
  factory: {
    bounds: {
      minX: -60,
      maxX: 60,
      minY: 0,
      maxY: 32,
      minZ: -50,
      maxZ: 50,
    } satisfies SiteBounds,
    floor: {
      width: 120,
      depth: 100,
    },
    zones: {
      silos: -22,
      milling: -6,
      sifting: 6,
      packing: 25,
    },
  },
  portals: {
    shipping: {
      id: 'shipping-dock',
      label: 'Shipping',
      centre: [0, 0, 50],
      normal: [0, 0, 1],
      halfWidth: 15,
      height: 14,
      transitionDepth: 18,
    },
    receiving: {
      id: 'receiving-dock',
      label: 'Receiving',
      centre: [0, 0, -50],
      normal: [0, 0, -1],
      halfWidth: 9,
      height: 14,
      transitionDepth: 18,
    },
    eastService: {
      id: 'east-service',
      label: 'East service exit',
      centre: [60, 0, -20],
      normal: [1, 0, 0],
      halfWidth: 2,
      height: 3,
      transitionDepth: 8,
    },
    westService: {
      id: 'west-service',
      label: 'West service exit',
      centre: [-60, 0, -20],
      normal: [-1, 0, 0],
      halfWidth: 2,
      height: 3,
      transitionDepth: 8,
    },
  } satisfies Record<string, SitePortal>,
  docks: {
    shipping: {
      bayCentre: [0, 0, 61] as Vec3Tuple,
      apron: {
        minX: -36,
        maxX: 36,
        minY: -0.02,
        maxY: 8,
        minZ: 48,
        maxZ: 92,
      } satisfies SiteBounds,
    },
    receiving: {
      bayCentre: [0, 0, -61] as Vec3Tuple,
      apron: {
        minX: -30,
        maxX: 30,
        minY: -0.02,
        maxY: 8,
        minZ: -92,
        maxZ: -48,
      } satisfies SiteBounds,
    },
  },
  serviceYard: {
    maintenanceGarage: {
      id: 'maintenance-garage',
      position: [83.5, 0, 36],
      rotation: -Math.PI / 2,
      footprint: [12.3, 10.8],
      height: 8,
      clearance: 6,
    },
    propaneCompound: {
      id: 'propane-compound',
      position: [83.5, 0, 14.5],
      rotation: 0,
      footprint: [12, 9],
      height: 5,
      clearance: 4,
    },
    utilityTankFarm: {
      id: 'utility-tank-farm',
      position: [75, 0, -15],
      rotation: 0,
      footprint: [22, 42],
      height: 12,
      clearance: 2,
    },
    trailerDropYard: {
      id: 'trailer-drop-yard',
      position: [-78, 0, 35],
      rotation: 0,
      footprint: [20, 30],
      height: 5,
      clearance: 4,
    },
    fleetTelemetryHub: {
      id: 'fleet-telemetry-hub',
      position: [42, 0, 75],
      rotation: -Math.PI / 2,
      footprint: [12, 10],
      height: 6,
      clearance: 3,
    },
  } satisfies Record<string, ServiceAssetAnchor>,
  routes: {
    forklifts: {
      shipping: {
        id: 'forklift-shipping',
        vehicle: 'forklift',
        points: [
          [28, 0, 20],
          [45, 0, 20],
          [45, 0, 42],
          [24, 0, 42],
          [24, 0, 44],
          [29, 0, 44],
          [45, 0, 42],
          [45, 0, 20],
        ],
        halfWidth: 1.35,
        closed: true,
      },
      receiving: {
        id: 'forklift-receiving',
        vehicle: 'forklift',
        points: [
          [-35, 0, -43],
          [-35, 0, -38],
          [-35, 0, -30],
          [-35, 0, -22],
          [-42, 0, -22],
          [-42, 0, -38],
        ],
        halfWidth: 1.35,
        closed: true,
      },
    },
  } satisfies Record<string, Record<string, VehicleRouteAnchor>>,
  routeHazards: {
    mainConveyor: {
      id: 'main-conveyor',
      type: 'conveyor',
      bounds: { minX: -28, maxX: 28, minZ: 22, maxZ: 26 },
    },
    rollerConveyor: {
      id: 'roller-conveyor',
      type: 'conveyor',
      bounds: { minX: -16, maxX: 16, minZ: 19, maxZ: 23 },
    },
    shippingDock: {
      id: 'shipping-dock',
      type: 'intersection',
      bounds: { minX: -20, maxX: 20, minZ: 40, maxZ: 50 },
    },
    receivingDock: {
      id: 'receiving-dock',
      type: 'intersection',
      bounds: { minX: -20, maxX: 20, minZ: -50, maxZ: -40 },
    },
  } satisfies Record<string, RouteHazardAnchor>,
  landmarks: {
    castle: {
      id: 'castle',
      position: [45, 0, -200],
      rotation: [0, -Math.PI / 4, 0],
      scale: 1.5,
      footprint: [72, 72],
      height: 58,
    },
    farm: {
      id: 'farm',
      position: [75, 0, 120],
      rotation: [0, Math.PI, 0],
      scale: 1,
      footprint: [82, 78],
      height: 20,
    },
    village: {
      id: 'village',
      position: [-190, 0, 0],
      rotation: [0, 0, 0],
      scale: 1,
      footprint: [64, 124],
      height: 26,
    },
  } satisfies Record<string, LandmarkAnchor>,
  machines: {
    silos: [
      { id: 'silo-0', position: [-18, 0, -22] },
      { id: 'silo-1', position: [-9, 0, -22] },
      { id: 'silo-2', position: [0, 0, -22] },
      { id: 'silo-3', position: [9, 0, -22] },
      { id: 'silo-4', position: [18, 0, -22] },
    ],
    rollerMills: [
      { id: 'rm-101', position: [-15, 0, -6] },
      { id: 'rm-102', position: [-7.5, 0, -6] },
      { id: 'rm-103', position: [7.5, 0, -6] },
      { id: 'rm-104', position: [15, 0, -6] },
    ],
    sifters: [
      { id: 'sifter-a', position: [-14, 9, 6] },
      { id: 'sifter-b', position: [0, 9, 6] },
      { id: 'sifter-c', position: [14, 9, 6] },
    ],
    packers: [
      { id: 'packer-0', position: [-8, 0, 25] },
      { id: 'packer-1', position: [0, 0, 25] },
      { id: 'packer-2', position: [8, 0, 25] },
    ],
  } satisfies Record<string, readonly MachineAnchor[]>,
  machineDimensions: {
    silo: [4.5, 16, 4.5],
    rollerMill: [3.5, 5, 3.5],
    sifter: [7, 4, 7],
    packer: [4, 6, 4],
  } satisfies Record<string, Vec3Tuple>,
  cameras: {
    overview: { position: [112, 74, 112], target: [0, 7, 2] },
    interior: { position: [36, 17, 32], target: [0, 3, 2] },
    silos: { position: [37, 18, -38], target: [0, 8, -22] },
    milling: { position: [34, 13, -7], target: [0, 3, -6] },
    sifting: { position: [34, 20, 18], target: [0, 9, 6] },
    packing: { position: [-34, 14, 34], target: [0, 3, 25] },
    processFloor: { position: [27, 5.5, -2], target: [-4, 2, -10], fov: 50 },
    tankFarm: { position: [102, 8.5, -15], target: [75, 3.5, -15], fov: 55 },
    logisticsClose: { position: [18, 3.8, 96], target: [14, 1.8, 82], fov: 45 },
    forklift: { position: [48, 3.8, 33], target: [40, 1.15, 24] },
    shipping: { position: [34, 9, 104], target: [5, 2.5, 82] },
    receiving: { position: [-34, 9, -104], target: [-5, 2.5, -82] },
    yard: { position: [110, 36, 58], target: [72, 1.5, 12] },
    water: { position: [158, 23, 154], target: [118, 0.08, 116] },
    village: { position: [-142, 28, 64], target: [-190, 5, 0] },
    farm: { position: [128, 26, 174], target: [75, 4, 120] },
    garage: { position: [66, 7, 36], target: [83.5, 3, 36] },
    celestial: { position: [90, 12, 72], target: [0, 12, 0] },
  },
  renderCells: {
    interior: {
      minX: -64,
      maxX: 64,
      minY: -1,
      maxY: 100,
      minZ: -54,
      maxZ: 54,
    },
    shipping: {
      minX: -48,
      maxX: 48,
      minY: -1,
      maxY: 100,
      minZ: 42,
      maxZ: 110,
    },
    receiving: {
      minX: -48,
      maxX: 48,
      minY: -1,
      maxY: 100,
      minZ: -110,
      maxZ: -42,
    },
    eastYard: {
      minX: 60,
      maxX: 150,
      minY: -4,
      maxY: 100,
      minZ: -100,
      maxZ: 100,
    },
    westYard: {
      minX: -150,
      maxX: -60,
      minY: -4,
      maxY: 100,
      minZ: -100,
      maxZ: 100,
    },
  } satisfies Record<string, SiteBounds>,
} as const;

export const FACTORY_ZONE_Z = SITE_LAYOUT.factory.zones;
export const FACTORY_BOUNDS = SITE_LAYOUT.factory.bounds;
export const WORLD_RADIUS = SITE_LAYOUT.world.radius;

export function containsPoint(
  bounds: SiteBounds,
  x: number,
  y: number,
  z: number,
  inset: number = 0
): boolean {
  return (
    x >= bounds.minX + inset &&
    x <= bounds.maxX - inset &&
    y >= bounds.minY + inset &&
    y <= bounds.maxY - inset &&
    z >= bounds.minZ + inset &&
    z <= bounds.maxZ - inset
  );
}

export function isPointInPortalTransition(portal: SitePortal, x: number, z: number): boolean {
  const [portalX, , portalZ] = portal.centre;
  const alongX = Math.abs(portal.normal[0]) > 0.5;
  const lateralDistance = alongX ? Math.abs(z - portalZ) : Math.abs(x - portalX);
  const normalDistance = alongX ? Math.abs(x - portalX) : Math.abs(z - portalZ);
  return lateralDistance <= portal.halfWidth + 2 && normalDistance <= portal.transitionDepth;
}

export function getVisibleSiteCells(
  x: number,
  y: number,
  z: number,
  preloadMargin: number = 16
): string[] {
  return Object.entries(SITE_LAYOUT.renderCells)
    .filter(([, bounds]) => containsPoint(bounds, x, y, z, -preloadMargin))
    .map(([id]) => id);
}

/**
 * Returns cells intersected by the camera's forward view corridor.
 * Position-only culling can hide the factory from exterior overview cameras, so
 * this samples a bounded ray toward the subject as well as the camera position.
 */
export function getVisibleSiteCellsForView(
  position: Vec3Tuple,
  direction: Vec3Tuple,
  viewDistance: number = 240,
  sampleStep: number = 32
): string[] {
  const length = Math.hypot(direction[0], direction[1], direction[2]);
  const safeDirection =
    length > 0.0001
      ? ([direction[0] / length, direction[1] / length, direction[2] / length] as Vec3Tuple)
      : ([0, 0, -1] as Vec3Tuple);
  const cells = new Set<string>();

  for (let distance = 0; distance <= viewDistance; distance += sampleStep) {
    getVisibleSiteCells(
      position[0] + safeDirection[0] * distance,
      position[1] + safeDirection[1] * distance,
      position[2] + safeDirection[2] * distance
    ).forEach((cell) => cells.add(cell));
  }

  return Object.keys(SITE_LAYOUT.renderCells).filter((cell) => cells.has(cell));
}

export function getServiceAssetBounds(
  anchor: ServiceAssetAnchor,
  includeClearance: boolean = false
): SiteBounds {
  const quarterTurn = Math.abs(Math.sin(anchor.rotation)) > 0.5;
  const width = quarterTurn ? anchor.footprint[1] : anchor.footprint[0];
  const depth = quarterTurn ? anchor.footprint[0] : anchor.footprint[1];
  const clearance = includeClearance ? anchor.clearance : 0;

  return {
    minX: anchor.position[0] - width / 2 - clearance,
    maxX: anchor.position[0] + width / 2 + clearance,
    minY: anchor.position[1],
    maxY: anchor.position[1] + anchor.height,
    minZ: anchor.position[2] - depth / 2 - clearance,
    maxZ: anchor.position[2] + depth / 2 + clearance,
  };
}

export function getLandmarkBounds(anchor: LandmarkAnchor): SiteBounds {
  const quarterTurn = Math.abs(Math.sin(anchor.rotation[1])) > 0.5;
  const scaledWidth = anchor.footprint[0] * anchor.scale;
  const scaledDepth = anchor.footprint[1] * anchor.scale;
  const width = quarterTurn ? scaledDepth : scaledWidth;
  const depth = quarterTurn ? scaledWidth : scaledDepth;

  return {
    minX: anchor.position[0] - width / 2,
    maxX: anchor.position[0] + width / 2,
    minY: anchor.position[1],
    maxY: anchor.position[1] + anchor.height * anchor.scale,
    minZ: anchor.position[2] - depth / 2,
    maxZ: anchor.position[2] + depth / 2,
  };
}

export function boundsOverlapXZ(a: SiteBounds, b: SiteBounds): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

const segmentIntersectsBoundsXZ = (
  start: Vec3Tuple,
  end: Vec3Tuple,
  bounds: Pick<SiteBounds, 'minX' | 'maxX' | 'minZ' | 'maxZ'>
): boolean => {
  const deltaX = end[0] - start[0];
  const deltaZ = end[2] - start[2];
  let minimumT = 0;
  let maximumT = 1;

  const clip = (origin: number, delta: number, minimum: number, maximum: number): boolean => {
    if (Math.abs(delta) < 1e-9) return origin >= minimum && origin <= maximum;
    const first = (minimum - origin) / delta;
    const second = (maximum - origin) / delta;
    const entry = Math.min(first, second);
    const exit = Math.max(first, second);
    minimumT = Math.max(minimumT, entry);
    maximumT = Math.min(maximumT, exit);
    return minimumT <= maximumT;
  };

  return (
    clip(start[0], deltaX, bounds.minX, bounds.maxX) &&
    clip(start[2], deltaZ, bounds.minZ, bounds.maxZ)
  );
};

/**
 * Tests a vehicle's complete swept corridor against an X/Z footprint. The
 * route data is the same data rendered by the vehicle controller, so a passing
 * check protects the visible path rather than a hand-maintained proxy.
 */
export function routeIntersectsBoundsXZ(
  route: VehicleRouteAnchor,
  bounds: Pick<SiteBounds, 'minX' | 'maxX' | 'minZ' | 'maxZ'>,
  additionalMargin: number = 0
): boolean {
  const padding = Math.max(0, route.halfWidth + additionalMargin);
  const expanded = {
    minX: bounds.minX - padding,
    maxX: bounds.maxX + padding,
    minZ: bounds.minZ - padding,
    maxZ: bounds.maxZ + padding,
  };
  const segmentCount = route.closed ? route.points.length : Math.max(0, route.points.length - 1);

  for (let index = 0; index < segmentCount; index += 1) {
    const start = route.points[index];
    const end = route.points[(index + 1) % route.points.length];
    if (segmentIntersectsBoundsXZ(start, end, expanded)) return true;
  }
  return false;
}
