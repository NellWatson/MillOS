import { describe, expect, it } from 'vitest';
import { CURRENT_RELEASE_VERSION, SELECTABLE_RELEASE_VERSIONS } from './releaseVersions';

describe('MillOS release versions', () => {
  it('defaults to v0.40 while preserving every published release', () => {
    expect(CURRENT_RELEASE_VERSION).toBe('v0.40');
    expect(SELECTABLE_RELEASE_VERSIONS).toEqual(['v0.40', 'v0.30', 'v0.20', 'v0.10']);
  });
});
