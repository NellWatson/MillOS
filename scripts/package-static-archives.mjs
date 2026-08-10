#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const releaseMatrix = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'release-matrix.json'), 'utf8')
);
const outputArgumentIndex = process.argv.indexOf('--output');
const outputDirectory = path.resolve(
  projectRoot,
  outputArgumentIndex >= 0 && process.argv[outputArgumentIndex + 1]
    ? process.argv[outputArgumentIndex + 1]
    : 'dist-archives'
);

const staticReleases = releaseMatrix.releases
  .filter((release) => release.type === 'static')
  .sort((left, right) => left.version.localeCompare(right.version, undefined, { numeric: true }));

if (staticReleases.length === 0) {
  throw new Error('No static version archives were found in public.');
}

fs.rmSync(outputDirectory, { recursive: true, force: true });
fs.mkdirSync(outputDirectory, { recursive: true });

const manifest = {
  schemaVersion: 1,
  versions: [],
};

for (const release of staticReleases) {
  const version = release.version;
  const source = path.resolve(projectRoot, release.sourcePath);
  if (!fs.existsSync(path.join(source, 'index.html'))) {
    throw new Error(`Static release has no index.html: ${version}`);
  }
  const destination = path.join(outputDirectory, version);
  fs.cpSync(source, destination, {
    recursive: true,
    filter: (entry) => path.basename(entry) !== '.DS_Store',
  });

  const files = [];
  const pending = [destination];
  while (pending.length > 0) {
    const directory = pending.pop();
    for (const entry of fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        pending.push(absolutePath);
        continue;
      }
      const content = fs.readFileSync(absolutePath);
      files.push({
        path: path.relative(outputDirectory, absolutePath).split(path.sep).join('/'),
        bytes: content.byteLength,
        sha256: createHash('sha256').update(content).digest('hex'),
      });
    }
  }
  files.sort((left, right) => left.path.localeCompare(right.path));
  manifest.versions.push({
    version,
    sourcePath: release.sourcePath,
    files,
    bytes: files.reduce((total, file) => total + file.bytes, 0),
  });
}

fs.writeFileSync(
  path.join(outputDirectory, 'archive-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`
);

console.log(
  `Packaged ${staticReleases.length} isolated static archives in ${path.relative(projectRoot, outputDirectory)}.`
);
