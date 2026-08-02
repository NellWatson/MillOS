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
  readonly id: 'shipping-dock' | 'receiving-dock' | 'east-personnel' | 'west-personnel';
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
  readonly clearance: number;
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
    eastPersonnel: {
      id: 'east-personnel',
      label: 'East personnel exit',
      centre: [60, 0, -20],
      normal: [1, 0, 0],
      halfWidth: 2,
      height: 3,
      transitionDepth: 8,
    },
    westPersonnel: {
      id: 'west-personnel',
      label: 'West personnel exit',
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
      position: [85, 0, 30],
      rotation: -Math.PI / 2,
      footprint: [12, 10],
      clearance: 6,
    },
    propaneCompound: {
      id: 'propane-compound',
      position: [92.5, 0, 8],
      rotation: 0,
      footprint: [9, 5],
      clearance: 5,
    },
    trailerDropYard: {
      id: 'trailer-drop-yard',
      position: [-60, 0, 35],
      rotation: 0,
      footprint: [20, 30],
      clearance: 4,
    },
    driverLounge: {
      id: 'driver-lounge',
      position: [42, 0, 75],
      rotation: -Math.PI / 2,
      footprint: [12, 10],
      clearance: 3,
    },
  } satisfies Record<string, ServiceAssetAnchor>,
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
    personnel: { position: [22, 5.5, -14], target: [0, 1.15, -14] },
    personnelClose: { position: [7.2, 2.05, -15.8], target: [10, 1.05, -18] },
    personnelFeminine: { position: [-7.2, 2.05, -11.8], target: [-10, 1.05, -14] },
    forklift: { position: [48, 3.8, 33], target: [40, 1.15, 24] },
    shipping: { position: [34, 9, 104], target: [5, 2.5, 82] },
    receiving: { position: [-34, 9, -104], target: [-5, 2.5, -82] },
    yard: { position: [110, 36, 58], target: [72, 1.5, 12] },
    water: { position: [158, 23, 154], target: [118, 0.08, 116] },
    village: { position: [-142, 28, 64], target: [-190, 5, 0] },
    farm: { position: [128, 26, 174], target: [75, 4, 120] },
    garage: { position: [69, 6.5, 30], target: [85, 3, 30] },
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
    maxY: anchor.position[1] + 16,
    minZ: anchor.position[2] - depth / 2 - clearance,
    maxZ: anchor.position[2] + depth / 2 + clearance,
  };
}

export function boundsOverlapXZ(a: SiteBounds, b: SiteBounds): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}
