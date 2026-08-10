import packageMetadata from '../../package.json';
import releaseMatrix from '../../release-matrix.json';

const packageReleaseVersion = `v${packageMetadata.version.split('.').slice(0, 2).join('.')}`;

if (releaseMatrix.currentVersion !== packageReleaseVersion) {
  throw new Error(
    `Release matrix current version ${releaseMatrix.currentVersion} does not match package ${packageReleaseVersion}`
  );
}

export const CURRENT_RELEASE_VERSION = releaseMatrix.currentVersion;
export const SELECTABLE_RELEASES = releaseMatrix.releases.map((release) => ({
  ...release,
  displayLabel: `${release.label} (${release.type === 'current' ? 'current' : 'historical'})`,
}));
export const SELECTABLE_RELEASE_VERSIONS = releaseMatrix.releases.map((release) => release.version);
