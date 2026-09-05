# Agent Operating System Phase 0 Evidence

**Status:** current evidence snapshot for the Phase 0 and Phase 1 implementation boundary

**Captured:** 2026-08-31

## 1. Protected baseline

| Evidence                                                        | Value                                                              |
| --------------------------------------------------------------- | ------------------------------------------------------------------ |
| Branch                                                          | `codex/adversarial-unit-sweep-20260820`                            |
| HEAD                                                            | `f33fe6814f22c885adfb84da2773162c795875bd`                         |
| HEAD tree                                                       | `947f7d37a2a1fdad0749c70b5fd08005edb731c6`                         |
| Package                                                         | `grain-mill-simulator@0.40.0`                                      |
| Dirty status entries at implementation start                    | 95                                                                 |
| Existing unrelated dirty entries                                | 75                                                                 |
| Design surfaces owned by this programme at implementation start | 20                                                                 |
| Raw baseline status                                             | [`phase-0-baseline-status.txt`](./phase-0-baseline-status.txt)     |
| Raw status SHA-256                                              | `71893a030fc60c58758182a017de8748616b4e457a9fdda7b0517bed43bb3b20` |
| Existing source files fingerprinted                             | 499, excluding `src/agent`, archive, and vendored modules          |
| Existing source SHA-256                                         | `2721043e8baa215126e9f4000d47f81ad3aba703b89f20d09dadde8f21b2a396` |
| Free disk at Phase 0 start                                      | 9.8 GiB                                                            |
| Capture lock                                                    | absent                                                             |
| Starting build                                                  | passed, 3,603 modules transformed                                  |

Three additional worktree registrations existed. The main worktree was current. One temporary
capture worktree registration was prunable, and two separate named worktrees were preserved.
No worktree was removed, repaired, reset, or modified by this phase.

The existing source fingerprint intentionally excludes the new `src/agent` implementation.
The generated manifest carries a second fingerprint over its registry, contract machinery,
package metadata, and every referenced authority file. These fingerprints answer different
questions and must not be substituted for one another.

## 2. Change ownership

This implementation slice owns:

1. `src/agent/`;
2. `scripts/generate-agent-manifest.mjs`;
3. `scripts/lib/agent-mutation-inventory.mjs` and its test;
4. `build/generated/agent/`;
5. `tsconfig.agent.json`;
6. the three `agent:*` package scripts;
7. this evidence directory;
8. Phase 0 and Phase 1 status changes in the programme document.

All test, SCADA, rendering, audio, soundtrack, and unrelated application changes that were
already present remain outside this slice.

## 3. Direct store call inventory

Two measurements serve different purposes:

1. Textual source search found 318 direct `use*Store.getState()` accesses across 59 live
   source files. This measures imperative coupling, including property reads.
2. The TypeScript AST inventory found 124 direct chained method calls. Eighteen were read-only
   calls and 106 were mutations.

The 106 direct mutations classify as follows:

| Classification                | Calls | Meaning                                                 |
| ----------------------------- | ----: | ------------------------------------------------------- |
| Compatibility                 |    39 | Existing facade or extracted-store delegation           |
| UI preference                 |    25 | Interface or presentation preference mutation           |
| Cross-domain coordination     |    18 | Explicit simulation or store coordinator work           |
| Diagnostic                    |    12 | Replay, evidence, or runtime diagnostic mutation        |
| Operational command candidate |     7 | Consequence-bearing action worth later command wrapping |
| Render-only                   |     5 | Camera or frame-quality control                         |

The generated inventory is
[`mutation-inventory.json`](../../build/generated/agent/mutation-inventory.json). Its declared
scope is direct `use*Store.getState().method()` calls. Selector-extracted actions, local
`getState()` aliases, internal Zustand `set()` calls, and dynamic property access require a
capability-specific source search. This limitation is visible in the artifact rather than
being treated as complete coverage.

**Working if:** every newly migrated capability performs a targeted symbol and alias search in
addition to consulting the global direct-call inventory.

## 4. First-slice authority map

The first three proposed slices all belong to `useOperationsCampaignStore`. No non-test caller
currently invokes any of the three methods. Their registry status is therefore `candidate`,
and `currentCallers` is an empty array.

### 4.1 `operations.activate-order`

Write owner: `useOperationsCampaignStore`.

Owned writes:

1. active order identity;
2. order status transitions;
3. execution order, recipe, material, and stage;
4. campaign sequence;
5. bounded campaign logbook.

Far-side consumers include `UnifiedGameTick`, material-flow planning, quality and dispatch
gates, campaign constraints, the SCADA panel, mobile operations views, and operational world
signals. The current store method returns `void` and silently preserves state for an unknown,
fulfilled, or cancelled order. A future command wrapper must add an explicit receipt while
preserving store ownership and the far-side plan contract.

### 4.2 `incident.acknowledge`

Write owner: `useOperationsCampaignStore`.

Owned writes are incident phase and acknowledgement simulation minute. Acknowledgement changes
recognition state and leaves the process effect active. Current observation consumers include
mobile operations, SCADA presentation, and operational world signals.

### 4.3 `incident.mitigate`

Write owner: `useOperationsCampaignStore`.

Owned writes are incident phase, acknowledgement simulation minute when absent, and the
automatic-action metric. Far-side consumers include production and quality calculations,
dispatch isolation, truck and forklift movement effects, campaign constraints, SCADA, mobile
operations, and operational world signals.

Mitigation changes physical and dispatch consequences. Its registry risk is high even though
the current method is a small local store transition.

## 5. Schema substrate decision

`package.json` contains no runtime schema library. Installing one before a real command payload
would add dependency, maintenance, and browser-bundle questions without evidence that the
Phase 1 registry needs it.

Phase 1 therefore uses:

1. TypeScript contract interfaces;
2. checked JavaScript for the single registry source consumed by both Node tooling and future
   browser adapters;
3. a zero-dependency runtime validator with stable structured problems;
4. strict JSON Schema objects embedded in capability descriptors;
5. `npm run agent:typecheck` for the checked JavaScript boundary;
6. deterministic generation and drift checking.

Reconsider a dedicated schema dependency when Phase 3 introduces nested unions, schema
migration, or tool-schema conversion that makes the local validator larger or less legible than
a maintained library. Any proposal must include bundle, transitive-dependency, maintenance, and
error-quality evidence before installation.

## 6. Persistence decision

The synthetic structural causal-event prototype measured:

| Measure                |        Result |
| ---------------------- | ------------: |
| Events                 |         1,000 |
| Uncompressed export    | 490,423 bytes |
| Mean event size        |  490.42 bytes |
| Proposed initial bound |  1,000 events |

The reproducible artifact is
[`event-contract-measurement.json`](../../build/generated/agent/event-contract-measurement.json).
This is structural evidence rather than a runtime shift measurement.

The conservative decision is bounded memory first. IndexedDB remains deferred until a complete
accelerated-shift causal scenario measures event rate, export size, reload requirements, and
retention value. No event persistence or production behaviour was introduced in Phases 0 or 1.

## 7. Phase 0 findings that constrain later work

1. The promised existing UI control for the first command slice was not found. Phase 3 must
   resolve the intended human surface before claiming UI migration.
2. Campaign action methods currently return `void`, so invalid target and unchanged state are
   indistinguishable to a caller. Phase 3 needs explicit preview and receipt results.
3. The direct mutation inventory is useful for orientation and intentionally does not replace
   per-capability dependency analysis.
4. Live external control remains outside the implemented modes and default denied.
5. The disk margin fell from the earlier design snapshot to 9.8 GiB at implementation start.
   Expensive coverage, browser, or archive gates must check current free space first.

**Working if:** later phases cite these findings, preserve the named owners, and close each
evidence gap before enabling command execution.
