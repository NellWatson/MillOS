import { describe, expect, it } from 'vitest';
import {
  DISTANT_FACTORY_INTERIOR_LOD,
  resolveFactoryInteriorDetailVisibility,
} from './distantFactoryInteriorLod';

describe('distant factory interior detail LOD', () => {
  it('keeps factory detail visible for operational and overview cameras', () => {
    expect(resolveFactoryInteriorDetailVisibility(true, 36, 32)).toBe(true);
    expect(resolveFactoryInteriorDetailVisibility(true, 112, 112)).toBe(true);
  });

  it('hides factory detail for the distant water and farm evidence cameras', () => {
    expect(resolveFactoryInteriorDetailVisibility(true, 158, 154)).toBe(false);
    expect(resolveFactoryInteriorDetailVisibility(true, 128, 174)).toBe(false);
  });

  it('uses hysteresis to avoid visibility chatter at the boundary', () => {
    const midpoint =
      (DISTANT_FACTORY_INTERIOR_LOD.hideDistance + DISTANT_FACTORY_INTERIOR_LOD.showDistance) / 2;

    expect(resolveFactoryInteriorDetailVisibility(true, midpoint, 0)).toBe(true);
    expect(resolveFactoryInteriorDetailVisibility(false, midpoint, 0)).toBe(false);
    expect(
      resolveFactoryInteriorDetailVisibility(
        false,
        DISTANT_FACTORY_INTERIOR_LOD.showDistance - 1,
        0
      )
    ).toBe(true);
  });
});
