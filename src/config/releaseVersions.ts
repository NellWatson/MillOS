import packageMetadata from '../../package.json';

export const CURRENT_RELEASE_VERSION = `v${packageMetadata.version
  .split('.')
  .slice(0, 2)
  .join('.')}`;

const ARCHIVED_RELEASE_VERSIONS = ['v0.30', 'v0.20', 'v0.10'] as const;

export const SELECTABLE_RELEASE_VERSIONS = [
  CURRENT_RELEASE_VERSION,
  ...ARCHIVED_RELEASE_VERSIONS,
].filter((version, index, versions) => versions.indexOf(version) === index);
