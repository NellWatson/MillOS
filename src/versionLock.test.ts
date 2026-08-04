import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import packageMetadata from '../package.json';

describe('MillOS product version lock', () => {
  it('keeps feature development on the 0.40 release line', () => {
    expect(packageMetadata.version).toBe('0.40.0');
  });

  it('describes multiplayer host loss without claiming state migration', () => {
    const readme = readFileSync(resolve(process.cwd(), 'README.md'), 'utf8');
    const hostLossHandler = readFileSync(
      resolve(process.cwd(), 'src/multiplayer/HostMigration.ts'),
      'utf8'
    );

    expect(readme).toContain('Explicit host-loss handling');
    expect(readme).not.toMatch(/host migration/i);
    expect(hostLossHandler).toContain('store.leaveRoom()');
    expect(hostLossHandler).not.toContain('attemptHostMigration');
  });
});
