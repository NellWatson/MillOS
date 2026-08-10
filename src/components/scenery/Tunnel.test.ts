import { describe, expect, it } from 'vitest';
import { createRoadTunnelHillsideGeometry } from './Tunnel';

describe('industrial road tunnel hillside', () => {
  it('builds a finite full-depth perforated embankment', () => {
    const geometry = createRoadTunnelHillsideGeometry(90);
    const positions = geometry.getAttribute('position');
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
    expect(geometry.boundingBox?.min.x).toBeCloseTo(-22);
    expect(geometry.boundingBox?.max.x).toBeCloseTo(22);
    expect(geometry.boundingBox?.min.z).toBeCloseTo(-90);
    expect(geometry.boundingBox?.max.z).toBeCloseTo(0);
    geometry.dispose();
  });
});
