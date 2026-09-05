import { describe, expect, it } from 'vitest';
import {
  inferAffectedDomains,
  parseGitStatusZ,
  renderEngineeringBrief,
} from './agent-engineering-brief.mjs';

describe('agent engineering brief', () => {
  it('parses bounded porcelain records including renames', () => {
    expect(parseGitStatusZ(' M src/a.ts\0R  old.ts\0new.ts\0?? docs/new.md\0')).toEqual([
      { xy: ' M', path: 'src/a.ts' },
      { xy: 'R ', path: 'new.ts', from: 'old.ts' },
      { xy: '??', path: 'docs/new.md' },
    ]);
  });

  it('infers only relevant domain labels from paths', () => {
    expect(
      inferAffectedDomains([
        'src/stores/materialFlowStore.ts',
        'src/scada/HistoryStore.ts',
        'src/agent/query/queryService.js',
      ])
    ).toEqual(['evidence', 'material', 'scada']);
  });

  it('renders authority and contract facts without repository file contents', () => {
    const output = renderEngineeringBrief({
      schemaVersion: 1,
      generatedAt: '2026-08-31T12:00:00.000Z',
      repository: {
        root: '/repo',
        branch: 'branch',
        head: 'head',
        tree: 'tree',
        upstream: null,
        freeDiskGiB: 10,
        worktrees: [],
        workingTree: {
          clean: false,
          entryCount: 1,
          truncated: false,
          affectedDomains: ['evidence'],
          entries: [{ xy: ' M', path: 'docs/README.md' }],
        },
      },
      product: { name: 'grain-mill-simulator', version: '0.40.0' },
      contract: {
        sourceFingerprint: 'sha256:test',
        domainCount: 11,
        invariantCount: 10,
        entityCount: 23,
        capabilityCount: 3,
        queryPlane: {
          level0MaximumBytes: 4096,
          level1MaximumBytes: 12288,
          maximumPageSize: 100,
          snapshotHistorySize: 16,
        },
      },
      criticalPath: ['Observe first.'],
      verification: { focused: ['npm run agent:typecheck'] },
    });
    expect(output).toContain(
      'Authority: observation only. Held: external writes, commit, push, deploy.'
    );
    expect(output).toContain('window.__MILLOS_AGENT__.brief()');
    expect(output).not.toContain('diff --git');
    expect(output).not.toContain('process.env');
  });
});
