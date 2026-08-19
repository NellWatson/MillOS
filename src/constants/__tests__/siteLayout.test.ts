import { describe, expect, it } from 'vitest';
import { createMachineObstacles } from '../factoryObstacles';
import { WATER_LAYERS } from '../renderLayers';
import {
  FACTORY_BOUNDS,
  SITE_LAYOUT,
  boundsOverlapXZ,
  containsPoint,
  getServiceAssetBounds,
  getLandmarkBounds,
  getVisibleSiteCells,
  getVisibleSiteCellsForView,
  isPointInPortalTransition,
} from '../siteLayout';

describe('canonical site layout', () => {
  it('defines 15 uniquely identified machines inside the factory envelope', () => {
    const anchors = Object.values(SITE_LAYOUT.machines).flat();
    const ids = anchors.map(({ id }) => id);

    expect(anchors).toHaveLength(15);
    expect(new Set(ids).size).toBe(ids.length);
    anchors.forEach(({ position }) => {
      expect(containsPoint(FACTORY_BOUNDS, ...position)).toBe(true);
    });
  });

  it('keeps each production group on its declared zone datum', () => {
    const expectedZones = [
      [SITE_LAYOUT.machines.silos, SITE_LAYOUT.factory.zones.silos],
      [SITE_LAYOUT.machines.rollerMills, SITE_LAYOUT.factory.zones.milling],
      [SITE_LAYOUT.machines.sifters, SITE_LAYOUT.factory.zones.sifting],
      [SITE_LAYOUT.machines.packers, SITE_LAYOUT.factory.zones.packing],
    ] as const;

    expectedZones.forEach(([anchors, expectedZ]) => {
      anchors.forEach(({ position }) => expect(position[2]).toBe(expectedZ));
    });
  });

  it('aligns portals to the corresponding factory boundary', () => {
    expect(SITE_LAYOUT.portals.shipping.centre[2]).toBe(FACTORY_BOUNDS.maxZ);
    expect(SITE_LAYOUT.portals.receiving.centre[2]).toBe(FACTORY_BOUNDS.minZ);
    expect(SITE_LAYOUT.portals.eastPersonnel.centre[0]).toBe(FACTORY_BOUNDS.maxX);
    expect(SITE_LAYOUT.portals.westPersonnel.centre[0]).toBe(FACTORY_BOUNDS.minX);

    expect(SITE_LAYOUT.docks.shipping.bayCentre[2]).toBeGreaterThan(FACTORY_BOUNDS.maxZ);
    expect(SITE_LAYOUT.docks.receiving.bayCentre[2]).toBeLessThan(FACTORY_BOUNDS.minZ);
  });

  it('keeps service-yard footprints separated and vehicle aprons clear', () => {
    const assets = Object.values(SITE_LAYOUT.serviceYard);
    const bounds = assets.map((asset) => ({
      id: asset.id,
      bounds: getServiceAssetBounds(asset),
    }));

    for (let left = 0; left < bounds.length; left += 1) {
      for (let right = left + 1; right < bounds.length; right += 1) {
        expect(
          boundsOverlapXZ(bounds[left].bounds, bounds[right].bounds),
          `${bounds[left].id} overlaps ${bounds[right].id}`
        ).toBe(false);
      }
    }

    const maintenanceClearance = getServiceAssetBounds(
      SITE_LAYOUT.serviceYard.maintenanceGarage,
      true
    );
    const propaneClearance = getServiceAssetBounds(SITE_LAYOUT.serviceYard.propaneCompound, true);
    expect(boundsOverlapXZ(maintenanceClearance, propaneClearance)).toBe(false);

    const lounge = getServiceAssetBounds(SITE_LAYOUT.serviceYard.driverLounge);
    expect(lounge.minX).toBeGreaterThan(SITE_LAYOUT.docks.shipping.apron.maxX);
  });

  it('keeps authored landscape districts separated from the factory and service yard', () => {
    const landmarks = Object.values(SITE_LAYOUT.landmarks).map((landmark) => ({
      id: landmark.id,
      bounds: getLandmarkBounds(landmark),
    }));
    const factory = SITE_LAYOUT.factory.bounds;
    const serviceAssets = Object.values(SITE_LAYOUT.serviceYard).map((asset) => ({
      id: asset.id,
      bounds: getServiceAssetBounds(asset),
    }));

    for (let left = 0; left < landmarks.length; left += 1) {
      expect(boundsOverlapXZ(landmarks[left].bounds, factory), landmarks[left].id).toBe(false);
      for (let right = left + 1; right < landmarks.length; right += 1) {
        expect(
          boundsOverlapXZ(landmarks[left].bounds, landmarks[right].bounds),
          `${landmarks[left].id} overlaps ${landmarks[right].id}`
        ).toBe(false);
      }
      for (const asset of serviceAssets) {
        expect(
          boundsOverlapXZ(landmarks[left].bounds, asset.bounds),
          `${landmarks[left].id} overlaps ${asset.id}`
        ).toBe(false);
      }
    }
  });

  it('models portal transition volumes on both sides of each opening', () => {
    expect(isPointInPortalTransition(SITE_LAYOUT.portals.shipping, 0, 49)).toBe(true);
    expect(isPointInPortalTransition(SITE_LAYOUT.portals.shipping, 0, 61)).toBe(true);
    expect(isPointInPortalTransition(SITE_LAYOUT.portals.shipping, 30, 50)).toBe(false);

    expect(isPointInPortalTransition(SITE_LAYOUT.portals.eastPersonnel, 58, -20)).toBe(true);
    expect(isPointInPortalTransition(SITE_LAYOUT.portals.eastPersonnel, 62, -20)).toBe(true);
    expect(isPointInPortalTransition(SITE_LAYOUT.portals.eastPersonnel, 60, 0)).toBe(false);
  });

  it('preloads only nearby render cells and overlaps at portals', () => {
    expect(getVisibleSiteCells(35, 25, 20)).toEqual(['interior']);
    expect(getVisibleSiteCells(0, 5, 50)).toEqual(expect.arrayContaining(['interior', 'shipping']));
    expect(getVisibleSiteCells(0, 5, -50)).toEqual(
      expect.arrayContaining(['interior', 'receiving'])
    );
    expect(getVisibleSiteCells(...SITE_LAYOUT.cameras.overview.position)).toEqual(['eastYard']);

    const overview = SITE_LAYOUT.cameras.overview;
    const direction = overview.target.map((value, index) => value - overview.position[index]) as [
      number,
      number,
      number,
    ];
    expect(getVisibleSiteCellsForView(overview.position, direction)).toEqual(
      expect.arrayContaining(['interior', 'shipping', 'eastYard'])
    );
  });

  it('derives one collision set from the canonical machine anchors', () => {
    const obstacles = createMachineObstacles();
    const ids = obstacles.map(({ id }) => id);

    expect(obstacles).toHaveLength(24);
    expect(new Set(ids).size).toBe(ids.length);
    obstacles.forEach((obstacle) => {
      expect(obstacle.minX).toBeLessThan(obstacle.maxX);
      expect(obstacle.minY).toBeLessThan(obstacle.maxY);
      expect(obstacle.minZ).toBeLessThan(obstacle.maxZ);
    });
  });

  it('keeps every camera pose finite, above ground, and within the world', () => {
    Object.values(SITE_LAYOUT.cameras).forEach(({ position, target }) => {
      [...position, ...target].forEach((value) => expect(Number.isFinite(value)).toBe(true));
      expect(position[1]).toBeGreaterThan(SITE_LAYOUT.datum.terrain);
      expect(Math.hypot(position[0], position[2])).toBeLessThan(SITE_LAYOUT.world.radius);
    });
  });

  it('keeps the overview above the shell at a facade-preserving oblique angle', () => {
    const { position, target } = SITE_LAYOUT.cameras.overview;
    const horizontalDistance = Math.hypot(position[0] - target[0], position[2] - target[2]);
    const elevationAngle = Math.atan2(position[1] - target[1], horizontalDistance);

    expect(position[1]).toBeGreaterThan(SITE_LAYOUT.factory.bounds.maxY + 24);
    expect(elevationAngle).toBeGreaterThan(Math.PI / 8);
    expect(elevationAngle).toBeLessThan(Math.PI / 3);
  });

  it('keeps the yard camera and target outside the opaque factory shell', () => {
    const { position, target } = SITE_LAYOUT.cameras.yard;

    expect(
      containsPoint(SITE_LAYOUT.renderCells.eastYard, position[0], position[1], position[2])
    ).toBe(true);
    expect(containsPoint(SITE_LAYOUT.renderCells.eastYard, target[0], target[1], target[2])).toBe(
      true
    );
    expect(target[0]).toBeGreaterThan(SITE_LAYOUT.factory.bounds.maxX);
  });

  it('aims the water evidence camera at the declared water datum', () => {
    const { position, target } = SITE_LAYOUT.cameras.water;

    expect(target[1]).toBe(SITE_LAYOUT.datum.water);
    expect(Math.hypot(position[0], position[2])).toBeLessThan(SITE_LAYOUT.world.radius);
    expect(Math.hypot(position[0] - target[0], position[2] - target[2])).toBeGreaterThan(24);
  });

  it('frames both authored body types from their facing side at conversational distance', () => {
    const close = SITE_LAYOUT.cameras.personnelClose;
    const feminine = SITE_LAYOUT.cameras.personnelFeminine;
    const closeDistance = Math.hypot(
      close.position[0] - close.target[0],
      close.position[1] - close.target[1],
      close.position[2] - close.target[2]
    );
    const feminineDistance = Math.hypot(
      feminine.position[0] - feminine.target[0],
      feminine.position[1] - feminine.target[1],
      feminine.position[2] - feminine.target[2]
    );

    expect(close.position[2]).toBeGreaterThan(-18);
    expect(feminine.position[2]).toBeLessThan(-14);
    expect(closeDistance).toBeGreaterThan(1.5);
    expect(closeDistance).toBeLessThan(2.5);
    expect(feminineDistance).toBeGreaterThan(1.5);
    expect(feminineDistance).toBeLessThan(2.5);
  });

  it('keeps the paddock and square cameras close enough to resolve their subjects', () => {
    // These two exist because `farm` and `village` frame whole sites and render
    // a 1.3 m cow at a handful of pixels. If either drifts back out to site
    // distance it stops grading what it was added to grade, so the distance is
    // asserted rather than left to a comment.
    const landmarks = {
      paddock: SITE_LAYOUT.landmarks.farm,
      square: SITE_LAYOUT.landmarks.village,
    } as const;

    (['paddock', 'square'] as const).forEach((name) => {
      const { position, target } = SITE_LAYOUT.cameras[name];
      const distance = Math.hypot(
        position[0] - target[0],
        position[1] - target[1],
        position[2] - target[2]
      );
      expect(distance).toBeGreaterThan(8);
      expect(distance).toBeLessThan(30);

      // And aimed inside the landmark it is named for, not merely near it.
      const anchor = landmarks[name];
      expect(Math.abs(target[0] - anchor.position[0])).toBeLessThan(anchor.footprint[0] / 2);
      expect(Math.abs(target[2] - anchor.position[2])).toBeLessThan(anchor.footprint[1] / 2);
      expect(position[1]).toBeGreaterThan(target[1]);
    });
  });

  it('uses one declared water surface datum', () => {
    expect(SITE_LAYOUT.datum.waterBed).toBe(WATER_LAYERS.bed);
    expect(SITE_LAYOUT.datum.water).toBe(WATER_LAYERS.surface);
    expect(SITE_LAYOUT.datum.waterBed).toBeGreaterThan(SITE_LAYOUT.datum.terrain);
    expect(SITE_LAYOUT.datum.water).toBeGreaterThan(SITE_LAYOUT.datum.waterBed);
    expect(SITE_LAYOUT.datum.water).toBeGreaterThan(SITE_LAYOUT.datum.terrain);
  });
});
