import { describe, expect, it } from 'vitest';
import {
  BENIGN_DIAGNOSTIC_PATTERNS,
  classifyDiagnostics,
  isBenignDiagnostic,
} from './diagnostics.mjs';

/**
 * The point of these tests is the FAILING direction.
 *
 * Every benchmark run on a healthy tree reports zero diagnostics, so the gate's
 * pass path is exercised constantly and its fail path never is. That is exactly
 * the shape of bug the gate was added to catch, so it would be absurd to ship it
 * on the strength of reading it.
 */
describe('capture diagnostics triage', () => {
  it('treats a clean page as clean', () => {
    const triage = classifyDiagnostics({
      consoleErrors: [],
      pageErrors: [],
      failedRequests: [],
    });
    expect(triage.actionable).toEqual([]);
    expect(triage.suppressed).toEqual([]);
  });

  it('treats missing sources as clean rather than throwing', () => {
    expect(classifyDiagnostics().actionable).toEqual([]);
    expect(classifyDiagnostics({ consoleErrors: ['boom'] }).actionable).toHaveLength(1);
  });

  it('surfaces an uncaught page error', () => {
    const triage = classifyDiagnostics({
      pageErrors: ["Failed to construct 'ConvolverNode': buffer sample rate mismatch"],
    });
    expect(triage.actionable).toHaveLength(1);
    expect(triage.actionable[0]).toContain('pageerror:');
    expect(triage.actionable[0]).toContain('ConvolverNode');
  });

  it('surfaces console errors and failed requests, labelled by source', () => {
    const triage = classifyDiagnostics({
      consoleErrors: ['THREE.WebGLProgram: shader error'],
      failedRequests: [{ url: 'https://example.test/hdri.exr', error: 'net::ERR_FAILED' }],
    });
    expect(triage.actionable).toHaveLength(2);
    expect(triage.actionable.some((entry) => entry.startsWith('console.error: '))).toBe(true);
    expect(triage.actionable.some((entry) => entry.startsWith('requestfailed: '))).toBe(true);
    expect(triage.actionable.some((entry) => entry.includes('net::ERR_FAILED'))).toBe(true);
  });

  it('orders page errors ahead of console noise, so the first line is the most severe', () => {
    const triage = classifyDiagnostics({
      consoleErrors: ['a warning that was logged as an error'],
      pageErrors: ['ReferenceError: thing is not defined'],
    });
    expect(triage.actionable[0]).toContain('ReferenceError');
  });

  it('excuses only what the allowlist matches, and keeps the rest actionable', () => {
    const patterns = [/tolerated-for-test/];
    BENIGN_DIAGNOSTIC_PATTERNS.push(...patterns);
    try {
      const triage = classifyDiagnostics({
        consoleErrors: ['tolerated-for-test: known harmless', 'a genuine failure'],
      });
      expect(triage.suppressed).toHaveLength(1);
      expect(triage.actionable).toHaveLength(1);
      expect(triage.actionable[0]).toContain('a genuine failure');
      expect(isBenignDiagnostic('tolerated-for-test: known harmless')).toBe(true);
    } finally {
      BENIGN_DIAGNOSTIC_PATTERNS.length = 0;
    }
  });

  it('ships with an empty allowlist, so nothing is excused by default', () => {
    expect(BENIGN_DIAGNOSTIC_PATTERNS).toEqual([]);
  });
});
