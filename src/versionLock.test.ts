import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import packageMetadata from '../package.json';

describe('MillOS product version lock', () => {
  it('keeps feature development on the 0.40 release line', () => {
    expect(packageMetadata.version).toBe('0.40.0');
  });

  it('keeps retired multiplayer code out of the autonomous runtime', () => {
    expect(existsSync(resolve(process.cwd(), 'src/multiplayer'))).toBe(false);
    expect(packageMetadata.dependencies).not.toHaveProperty('peerjs');
  });
});
