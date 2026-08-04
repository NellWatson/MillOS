import { describe, expect, it } from 'vitest';
import packageMetadata from '../package.json';

describe('MillOS product version lock', () => {
  it('keeps feature development on the 0.40 release line', () => {
    expect(packageMetadata.version).toBe('0.40.0');
  });
});
