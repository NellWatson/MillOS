import { afterEach, describe, expect, it } from 'vitest';
import { positionRegistry } from './positionRegistry';

const TEST_ID = 'position-registry-test-truck';

afterEach(() => positionRegistry.unregister(TEST_ID));

describe('positionRegistry', () => {
  it('updates a live entry in place for allocation-free frame publishing', () => {
    positionRegistry.register(TEST_ID, 1, 2, 0, 1, false, 0, 'truck');
    const original = positionRegistry.get(TEST_ID);

    positionRegistry.register(TEST_ID, 4, 8, 1, 0, true, 0, 'truck');

    expect(positionRegistry.get(TEST_ID)).toBe(original);
    expect(original).toMatchObject({ x: 4, z: 8, dirX: 1, dirZ: 0, isStopped: true });
  });

  it('removes entries cleanly', () => {
    positionRegistry.register(TEST_ID, 1, 2);
    positionRegistry.unregister(TEST_ID);
    expect(positionRegistry.get(TEST_ID)).toBeUndefined();
  });
});
