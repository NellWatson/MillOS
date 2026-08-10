import { describe, expect, it } from 'vitest';
import releaseMatrix from '../../release-matrix.json';
import {
  CURRENT_RELEASE_VERSION,
  SELECTABLE_RELEASES,
  SELECTABLE_RELEASE_VERSIONS,
} from './releaseVersions';

describe('MillOS release versions', () => {
  it('defaults to v0.40 while preserving every published release', () => {
    expect(CURRENT_RELEASE_VERSION).toBe('v0.40');
    expect(SELECTABLE_RELEASE_VERSIONS).toEqual(['v0.40', 'v0.30', 'v0.20', 'v0.10']);
    expect(SELECTABLE_RELEASE_VERSIONS).toEqual(
      releaseMatrix.releases.map((release) => release.version)
    );
    expect(new Set(SELECTABLE_RELEASE_VERSIONS).size).toBe(SELECTABLE_RELEASE_VERSIONS.length);
    expect(SELECTABLE_RELEASES.map((release) => release.displayLabel)).toEqual([
      '0.40 (current)',
      '0.30 (historical)',
      '0.20 (historical)',
      '0.10 (historical)',
    ]);
  });

  it('records the historical v0.30 package metadata discrepancy explicitly', () => {
    expect(releaseMatrix.releases.find((release) => release.version === 'v0.30')).toMatchObject({
      type: 'source-build',
      sourceCommit: '20bcbe044fc6d7ca7275999fec63ddce83fd49d0',
      sourcePackageVersion: '0.20.0',
      reproducibleBuild: {
        indexSha256: '5b4b9ea0f69b1ad3b9168cc5cc24e3730cf5647389a06f03e6012f73622af482',
        mainSha256: '099078d6ba669ada3d011883129444cffb8b5ef75bf536f31f01fad7ae0b69d7',
      },
    });
  });
});
