#!/usr/bin/env node

import { resolve } from 'node:path';
import process from 'node:process';
import { collectEngineeringBrief, renderEngineeringBrief } from './lib/agent-engineering-brief.mjs';

const root = resolve(import.meta.dirname, '..');
const json = process.argv.includes('--json') || process.argv.includes('--format=json');
const unknown = process.argv
  .slice(2)
  .filter((argument) => !['--json', '--format=json'].includes(argument));

if (unknown.length > 0) {
  console.error(`Unknown arguments: ${unknown.join(', ')}`);
  process.exit(2);
}

const brief = collectEngineeringBrief(root);
process.stdout.write(json ? `${JSON.stringify(brief, null, 2)}\n` : renderEngineeringBrief(brief));
