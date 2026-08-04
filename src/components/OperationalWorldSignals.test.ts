import { describe, expect, it } from 'vitest';
import { SITE_LAYOUT } from '../constants/siteLayout';
import { INCIDENT_DEFINITIONS } from '../stores/operationsCampaignStore';
import { OPERATIONAL_INCIDENT_PLACEMENTS } from './OperationalWorldSignals';

describe('operational world signal placement', () => {
  it('maps every operational incident into the canonical unified site', () => {
    expect(Object.keys(OPERATIONAL_INCIDENT_PLACEMENTS).sort()).toEqual(
      Object.keys(INCIDENT_DEFINITIONS).sort()
    );

    Object.values(OPERATIONAL_INCIDENT_PLACEMENTS).forEach(({ position }) => {
      expect(position.every(Number.isFinite)).toBe(true);
      expect(Math.hypot(position[0], position[2])).toBeLessThan(SITE_LAYOUT.world.radius);
    });
  });

  it('keeps incident markers logically separated rather than stacking at the origin', () => {
    const placements = Object.values(OPERATIONAL_INCIDENT_PLACEMENTS);
    placements.forEach((placement, index) => {
      placements.slice(index + 1).forEach((other) => {
        expect(
          Math.hypot(
            placement.position[0] - other.position[0],
            placement.position[2] - other.position[2]
          )
        ).toBeGreaterThan(5);
      });
    });
  });

  it('anchors machine incidents beside their actual production zones', () => {
    expect(OPERATIONAL_INCIDENT_PLACEMENTS.bearing_overheat.position[2]).toBe(
      SITE_LAYOUT.factory.zones.milling
    );
    expect(OPERATIONAL_INCIDENT_PLACEMENTS.dust_filter_pressure.position[1]).toBeGreaterThan(
      SITE_LAYOUT.datum.mezzanine
    );
    expect(OPERATIONAL_INCIDENT_PLACEMENTS.packaging_shortage.position[2]).toBe(
      SITE_LAYOUT.factory.zones.packing
    );
  });
});
