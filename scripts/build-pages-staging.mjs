#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDirectory = path.join(projectRoot, 'public');
const distDirectory = path.join(projectRoot, 'dist');
const packageMetadata = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const [major, minor] = String(packageMetadata.version).split('.');
const currentVersion = `v${major}.${minor}`;

const readFlagValues = (flag) =>
  process.argv.flatMap((argument, index) =>
    argument === flag && process.argv[index + 1] ? [process.argv[index + 1]] : []
  );

const parseVersionValue = (value, flag) => {
  const separator = value.indexOf('=');
  const version = separator >= 0 ? value.slice(0, separator) : '';
  const detail = separator >= 0 ? value.slice(separator + 1) : '';
  if (!/^v\d+\.\d+$/.test(version) || !detail) {
    throw new Error(`${flag} expects vMAJOR.MINOR=value, received: ${value}`);
  }
  return [version, detail];
};

const outputArgumentIndex = process.argv.indexOf('--output');
if (outputArgumentIndex >= 0 && !process.argv[outputArgumentIndex + 1]) {
  throw new Error('--output requires a directory.');
}
const outputDirectory = path.resolve(
  projectRoot,
  outputArgumentIndex >= 0 && process.argv[outputArgumentIndex + 1]
    ? process.argv[outputArgumentIndex + 1]
    : 'staging'
);

const unsafeOutputs = new Set([
  '/',
  projectRoot,
  path.dirname(projectRoot),
  process.env.HOME,
  publicDirectory,
  distDirectory,
]);
if (unsafeOutputs.has(outputDirectory)) {
  throw new Error(`Refusing unsafe Pages staging output: ${outputDirectory}`);
}
if (!fs.existsSync(path.join(distDirectory, 'index.html'))) {
  throw new Error('Build dist with VERSION set before constructing Pages staging.');
}

const builtIndex = fs.readFileSync(path.join(distDirectory, 'index.html'), 'utf8');
if (!builtIndex.includes(`/${currentVersion}/assets/`)) {
  throw new Error(`dist is not a ${currentVersion} versioned build.`);
}

const publicVersionDirectories = fs
  .readdirSync(publicDirectory, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isDirectory() && /^v\d+\.\d+$/.test(entry.name) && entry.name !== currentVersion
  )
  .map((entry) => entry.name);
const staticArchives = publicVersionDirectories.filter((version) =>
  fs.existsSync(path.join(publicDirectory, version, 'index.html'))
);
const archiveBuilds = new Map(
  readFlagValues('--archive-build').map((value) => parseVersionValue(value, '--archive-build'))
);
const archiveCommits = new Map(
  readFlagValues('--archive-source').map((value) => parseVersionValue(value, '--archive-source'))
);

for (const version of publicVersionDirectories) {
  if (!staticArchives.includes(version) && !archiveBuilds.has(version)) {
    throw new Error(
      `${version} contains supplemental assets but no runnable archive. Supply --archive-build ${version}=PATH.`
    );
  }
}
for (const version of archiveCommits.keys()) {
  if (!archiveBuilds.has(version)) {
    throw new Error(`Archive source supplied without a build: ${version}`);
  }
}

const archiveBuildDirectories = new Map();
for (const [version, sourceValue] of archiveBuilds) {
  if (version === currentVersion || staticArchives.includes(version)) {
    throw new Error(`Duplicate or current release supplied as archive build: ${version}`);
  }
  const sourceDirectory = path.resolve(projectRoot, sourceValue);
  const sourceIndexPath = path.join(sourceDirectory, 'index.html');
  if (!fs.existsSync(sourceIndexPath)) {
    throw new Error(`Archive build ${version} has no index.html: ${sourceDirectory}`);
  }
  const sourceIndex = fs.readFileSync(sourceIndexPath, 'utf8');
  if (!sourceIndex.includes(`/${version}/assets/`)) {
    throw new Error(`Archive build ${version} is not versioned for /${version}/.`);
  }
  archiveBuildDirectories.set(version, sourceDirectory);
}

fs.rmSync(outputDirectory, { recursive: true, force: true });
fs.mkdirSync(outputDirectory, { recursive: true });

const copyReleaseBuild = (sourceDirectory, destinationDirectory) => {
  fs.cpSync(sourceDirectory, destinationDirectory, {
    recursive: true,
    filter: (source) => {
      const relative = path.relative(sourceDirectory, source);
      const firstSegment = relative.split(path.sep)[0];
      return (
        relative === '' ||
        (!/^v\d+\.\d+$/.test(firstSegment) && path.basename(source) !== '.DS_Store')
      );
    },
  });
};

copyReleaseBuild(distDirectory, path.join(outputDirectory, currentVersion));

const archiveSources = new Map();
const archives = [...staticArchives];

for (const archive of archives) {
  fs.cpSync(path.join(publicDirectory, archive), path.join(outputDirectory, archive), {
    recursive: true,
    filter: (source) => path.basename(source) !== '.DS_Store',
  });
  archiveSources.set(archive, { type: 'static', path: `public/${archive}` });
}

for (const [version, sourceDirectory] of archiveBuildDirectories) {
  copyReleaseBuild(sourceDirectory, path.join(outputDirectory, version));
  archives.push(version);
  archiveSources.set(version, {
    type: 'source-build',
    commit: archiveCommits.get(version) ?? null,
  });
}

archives.sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

const musicFiles = fs
  .readdirSync(publicDirectory)
  .filter((entry) => entry.toLowerCase().endsWith('.mp3'));
for (const archive of ['v0.10', 'v0.20']) {
  const archiveDirectory = path.join(outputDirectory, archive);
  if (!fs.existsSync(archiveDirectory)) continue;
  for (const musicFile of musicFiles) {
    fs.copyFileSync(path.join(publicDirectory, musicFile), path.join(archiveDirectory, musicFile));
  }
}

const rootIndex = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="0;url=/${currentVersion}/">
  <title>MillOS | 3D Grain Mill Operations Simulator</title>
  <meta name="description" content="Explore MillOS, a browser-based 3D grain mill operations simulator with simulated workers, deterministic logistics, production metrics, and a simulated SCADA workspace." />
  <link rel="canonical" href="https://www.millos.net/" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://www.millos.net/" />
  <meta property="og:title" content="MillOS | 3D Grain Mill Operations Simulator" />
  <meta property="og:description" content="Explore a browser-based grain mill simulator with deterministic logistics, production metrics, and a simulated SCADA workspace." />
  <meta property="og:image" content="https://www.millos.net/og-image.png" />
  <meta property="og:image:alt" content="MillOS grain mill digital twin interface" />
  <meta property="og:image:width" content="3456" />
  <meta property="og:image:height" content="1993" />
  <meta property="og:site_name" content="MillOS" />
  <meta property="og:locale" content="en_GB" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="https://www.millos.net/" />
  <meta name="twitter:title" content="MillOS | 3D Grain Mill Operations Simulator" />
  <meta name="twitter:description" content="A browser-based 3D grain mill simulator with simulated workers, deterministic logistics, production metrics, and simulated SCADA." />
  <meta name="twitter:image" content="https://www.millos.net/og-image.png" />
  <meta name="twitter:image:alt" content="MillOS grain mill digital twin interface" />
  <meta name="twitter:creator" content="@NellWatson" />
</head>
<body>
  <p>Redirecting to <a href="/${currentVersion}/">MillOS ${currentVersion}</a>...</p>
</body>
</html>
`;
fs.writeFileSync(path.join(outputDirectory, 'index.html'), rootIndex);

for (const file of ['robots.txt', 'sitemap.xml', 'og-image.png']) {
  fs.copyFileSync(path.join(publicDirectory, file), path.join(outputDirectory, file));
}
fs.copyFileSync(path.join(projectRoot, 'CNAME'), path.join(outputDirectory, 'CNAME'));
fs.writeFileSync(path.join(outputDirectory, '.nojekyll'), '');

const buildInfoPath = path.join(distDirectory, 'build-info.json');
const buildInfo = fs.existsSync(buildInfoPath)
  ? JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'))
  : null;
fs.writeFileSync(
  path.join(outputDirectory, 'deployment-manifest.json'),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      packageVersion: packageMetadata.version,
      currentVersion,
      buildInfo,
      archives,
      archiveSources: Object.fromEntries(
        archives.map((version) => [version, archiveSources.get(version)])
      ),
    },
    null,
    2
  )}\n`
);

console.log(
  `Prepared ${currentVersion} plus ${archives.length} archived releases in ${path.relative(projectRoot, outputDirectory)}.`
);
