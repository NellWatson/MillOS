/**
 * Triage for the complaints a page makes about itself during a capture.
 *
 * WHY THIS IS A GATE AND NOT A LOG. The benchmark harness has always collected
 * `consoleErrors`, `pageErrors` and `failedRequests` faithfully, and then never
 * consulted them when deciding PASS or FAIL. That combination is worse than not
 * collecting them: a scene can report healthy frame pacing precisely *because* a
 * subsystem threw during construction and the work it should have been doing
 * never ran. A sibling project shipped an entirely silent audio engine for weeks
 * that way, with the throw sitting in its own capture report the whole time.
 *
 * Lives in its own module so the rule can be tested directly. A gate that has
 * never been observed to fail is not known to be a gate.
 */

/**
 * Console output the gate is allowed to ignore, as regular expressions.
 *
 * KEEP THIS EMPTY IF YOU CAN. An error on the page is a finding. Add an entry
 * only with a comment saying why it is genuinely harmless AND cannot mask a real
 * failure - those are two separate claims, and the second is the one that
 * matters. Prefer fixing the error.
 */
export const BENIGN_DIAGNOSTIC_PATTERNS = [];

export function isBenignDiagnostic(text) {
  return BENIGN_DIAGNOSTIC_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Flatten the three diagnostic sources into one labelled string space and split
 * them into what must fail the run and what the allowlist has excused.
 *
 * @param {{consoleErrors?: string[], pageErrors?: string[], failedRequests?: Array<{url: string, error: string}>}} sources
 * @returns {{actionable: string[], suppressed: string[]}}
 */
export function classifyDiagnostics(sources = {}) {
  const { consoleErrors = [], pageErrors = [], failedRequests = [] } = sources;
  const all = [
    ...pageErrors.map((message) => `pageerror: ${message}`),
    ...consoleErrors.map((message) => `console.error: ${message}`),
    ...failedRequests.map((request) => `requestfailed: ${request.url} (${request.error})`),
  ];
  return {
    actionable: all.filter((entry) => !isBenignDiagnostic(entry)),
    suppressed: all.filter((entry) => isBenignDiagnostic(entry)),
  };
}
