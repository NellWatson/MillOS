import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');

const forbiddenPathPatterns = [
  { label: 'portrait directory', pattern: /(^|\/)assets\/workers(\/|$)/i },
  { label: 'character model directory', pattern: /(^|\/)models\/worker(\/|$)/i },
  {
    label: 'human-specific asset filename',
    pattern: /(^|[/_.-])(worker|personnel|human|avatar|character)([/_.-]|$)/i,
  },
];

const forbiddenRuntimePatterns = [
  { label: 'host speech synthesis', pattern: /speechSynthesis|SpeechSynthesisUtterance/ },
  {
    label: 'personnel runtime module',
    pattern:
      /WorkerSystemNew|WorkerDetailPanel|WorkforcePanel|WorkerModel|RemotePlayerAvatar|SeatedVehicleOperator|DockSpotter|WarehouseWorkerWithPalletJack/,
  },
  { label: 'human asset URL', pattern: /assets\/workers|models\/worker|worker-(masculine|feminine)/i },
  {
    label: 'portrait roster',
    pattern: /marcus_chen|sarah_mitchell|james_rodriguez|emily_ronson|jennifer_lee/i,
  },
];

async function collectFiles(directory, base = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectFiles(absolute, base);
      return [{ absolute, relative: path.relative(base, absolute).split(path.sep).join('/') }];
    })
  );
  return nested.flat();
}

async function main() {
  try {
    if (!(await stat(DIST)).isDirectory()) throw new Error('dist is not a directory');
  } catch {
    throw new Error('dist is missing. Run npm run build before validate:uncrewed.');
  }

  const files = await collectFiles(DIST);
  const failures = [];

  for (const file of files) {
    for (const rule of forbiddenPathPatterns) {
      if (rule.pattern.test(file.relative)) failures.push(`${rule.label}: ${file.relative}`);
    }

    if (!/\.(?:js|html|json|webmanifest)$/i.test(file.relative)) continue;
    const content = await readFile(file.absolute, 'utf8');
    for (const rule of forbiddenRuntimePatterns) {
      if (rule.pattern.test(content)) failures.push(`${rule.label}: ${file.relative}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Uncrewed delivery contract failed:\n${[...new Set(failures)].join('\n')}`);
  }

  console.log(
    `Uncrewed delivery contract passed: ${files.length} files, no human assets, host voices, or personnel modules.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
