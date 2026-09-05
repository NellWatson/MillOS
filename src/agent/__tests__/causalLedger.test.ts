import { describe, expect, it } from 'vitest';
import { AgentCausalLedger } from '../command/causalLedger';

describe('agent causal ledger', () => {
  it('bounds events, exports a fingerprint, rejects stale evidence, and imports schema v1', () => {
    const ledger = new AgentCausalLedger({
      eventBound: 16,
      now: () => new Date('2026-08-31T12:00:00.000Z'),
    });
    for (let index = 0; index < 20; index += 1) append(ledger, index);
    const exported = ledger.export();

    expect(exported.events).toHaveLength(16);
    expect(exported.compaction.discardedEvents).toBe(4);
    expect(exported.evidenceFingerprint).toMatch(/^r1-/);

    const tampered = structuredClone(exported);
    tampered.events[0].kind = 'tampered';
    expect(ledger.import(tampered)).toMatchObject({ imported: 0 });
    expect(ledger.import(tampered).problems.map((problem) => problem.code)).toContain(
      'EVIDENCE_FINGERPRINT_STALE'
    );

    const imported = ledger.import({
      schemaVersion: 1,
      events: [
        {
          commandId: 'legacy-command',
          correlationId: 'legacy-correlation',
          actorId: 'legacy-controller',
          domain: 'campaign',
          kind: 'state-transition',
          targetUri: 'millos://order/order-001',
          payload: { changed: true },
        },
      ],
    });
    expect(imported.imported).toBe(1);
    expect(ledger.trace({ correlationId: 'legacy-correlation' }).records[0].kind).toBe(
      'imported.v1.state-transition'
    );
  });

  it('promotes only retained evidence into bounded, explicitly-authorized lessons', () => {
    const ledger = new AgentCausalLedger();
    const event = append(ledger, 1);
    const lesson = ledger.promoteLesson(
      'A current revision prevented duplicate activation.',
      [event.eventId],
      'millos://actor/agent-driver',
      false
    );
    expect(lesson.authority).toBe('advisory');
    expect(lesson.evidenceFingerprint).toMatch(/^r1-/);
    expect(() =>
      ledger.promoteLesson(
        'Unsupported claim.',
        ['evt-missing'],
        'millos://actor/agent-driver',
        true
      )
    ).toThrow(/retained evidence/);
  });
});

function append(ledger: AgentCausalLedger, index: number) {
  return ledger.append({
    correlationId: `correlation-${index}`,
    causationId: null,
    commandId: `command-${index}`,
    actorUri: 'millos://actor/agent-driver',
    grantId: 'grant.agent-driver.simulation.v1',
    domain: 'campaign',
    kind: 'command.verified',
    wallTime: '2026-08-31T12:00:00.000Z',
    simulationTime: { day: 1, hour: 12 },
    beforeRevision: `r-${index}`,
    afterRevision: `r-${index + 1}`,
    targetUri: 'millos://order/order-001',
    payload: { changed: true },
    provenance: [{ kind: 'test', source: 'causalLedger.test.ts' }],
  });
}
