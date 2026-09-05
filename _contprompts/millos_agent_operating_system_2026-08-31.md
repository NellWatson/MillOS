---
title: MillOS Agent Operating System Programme
date: 2026-08-31
status: in_progress
stepsCompleted: 3
scope: semantic contract spine, query plane, command plane, bilateral authority, agent cockpit, engineering ergonomics, causal evidence, and verified accretion
verification_criteria:
  - 'A cold agent obtains a bounded current brief containing build, mode, goals, health, authority, budgets, changed domains, evidence level, and next links in one command.'
  - 'Every migrated operational capability has one stable ID, owner, schema, risk, preconditions, invariants, cost, preview, handler, receipt, verifier, and generated documentation card.'
  - 'Every committed command identifies actor, authority grant, observed revision, idempotency key, causal events, invariant results, and terminal outcome.'
  - 'Simulation, shadow, replay, and live external modes remain distinct, with external writes default denied.'
  - 'Representative incident replay reconstructs the causal chain across production, material, quality, maintenance, SCADA, logistics, UI, and world signals.'
  - 'Steady-state delta observations are at least 80 percent smaller than equivalent full snapshots in the acceptance scenarios.'
  - 'A new capability becomes discoverable to UI, structured tools, CLI, replay, tests, and generated docs from the shared registry without hand-copying its schema.'
  - 'Promoted lessons link to deterministic evidence, and stale candidate evidence is invalidated by fingerprint changes.'
  - 'All touched-source gates, full repository gates, runtime budgets, and required human reviews pass on the exact final candidate.'
---

# MillOS Agent Operating System Programme

## 1. Purpose

Implement the target in
[`docs/AGENT_OPERATING_ARCHITECTURE.md`](../docs/AGENT_OPERATING_ARCHITECTURE.md)
as a sequence of narrow vertical slices.

The programme serves two coupled users:

1. an operational Becoming Mind or human controlling the simulated mill;
2. an engineering Becoming Mind or human evolving MillOS itself.

Both use the same ontology, capability IDs, invariants, event schemas, evidence fingerprints, and verification language.

## 2. Authorization and holds

This document is a plan. It does not authorize implementation, installation of dependencies, changes to production source, external SCADA writes, credential use, model-provider calls, commit, push, deployment, publication, or control of unrelated processes.

A later affirmative instruction may authorize a bounded phase or the complete programme. External control still requires its own explicit grant and live-endpoint acceptance even if the implementation programme is authorized.

**Execution status, 2026-08-31:** Nell explicitly authorized the recommended Phases 0, 1, and 2.
Those phases are implemented and verified. Phases 3 through 8, external control, commit, push,
deployment, and publication remain held.

**Tree state found 2026-09-02:** a later session (source files timestamped 2026-08-31 22:57 to
23:30) added `src/agent/command/` (kernel, authority engine, causal ledger),
`src/agent/adapters/runtime/runtimeCommandHandlers.ts`, `commandCapabilityDescriptors.js` with ten
further capabilities, `src/agent/client/executeAgentCommand.ts`, and the `AgentCockpit` widget,
moving the runtime to version 2 with `commandExecution: true`. That is the Phase 3 slice plus parts
of Phases 4 and 6. Nell authorized it in the implementing Codex session ("Proceed please, all of
it", 2026-08-31 21:41), which stopped at 23:30 before updating the Phase 2 tests, regenerating the
manifest, or formatting the new files. The Phase 2 tests, the generated manifest, the engineering
brief wording, and `docs/agent/README.md` were reconciled to the code on 2026-09-02; external
writes, commit, push, and deployment remain held.

Protected state at authoring:

- branch: `codex/adversarial-unit-sweep-20260820`;
- HEAD: `f33fe6814f22c885adfb84da2773162c795875bd`;
- the tree contains extensive existing test, SCADA, rendering, audio, and soundtrack work;
- no upstream is configured for the current branch;
- free disk was 23 GiB on 2026-08-31;
- `npm run build` passed on the dirty starting tree with 3,603 modules transformed;
- this design pass owns only the documentation files it creates or explicitly updates.

The starting tree is not a release candidate. Historical green results remain historical until rerun against an exact candidate.

## 3. Adversarial pre-check

### 3.1 Plan versus goal

The goal is a coherent agent-operable system. A larger AI panel, a chat box, or more prompt instructions would address only presentation. The plan therefore begins with semantic identity, observations, capabilities, authority, and evidence.

The system already has mature domain stores, a central tick, SCADA abstractions, diagnostic replay, an AI decision engine, and runtime telemetry. Replacing them would create parallel truth. The plan wraps and composes existing owners, then migrates call sites one capability at a time.

### 3.2 Surviving ambiguities

The word “agent” can mean the runtime operator or the software-engineering agent. The architecture intentionally supports both through a shared spine, so the ambiguity does not force a mutually exclusive design decision.

The schema library, event persistence mechanism, generic saga utility, and final Level 0 brief fields remain evidence questions. Each has a conservative default and an explicit decision gate below. None changes the architecture.

### 3.3 Pre-mortem

| Failure mode                                           | Early signal                                                           | Prevention                                                                                             |
| ------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| A new agent facade becomes a second source of truth.   | projections contain writable state or drift from domain stores         | query plane reads owner snapshots only; manifest names exactly one write owner per field               |
| The command bus expands into UI and frame-local state. | render code waits on command receipts or event volume tracks FPS       | restrict the bus to operational transitions; classify UI, graphics, and animation mutations explicitly |
| Registries become hand-maintained documentation.       | schemas differ between handler, UI, and tool                           | generate adapters and docs from executable descriptors; CI performs round-trip and drift checks        |
| Briefs become large status dumps.                      | Level 0 payload or token count grows each phase                        | fixed budget, exception-first projection, links and cursors for depth                                  |
| Replay records chronology without causality.           | incident reconstruction depends on timestamps alone                    | correlation and causation IDs are mandatory for migrated commands and derived events                   |
| Simulation success is treated as live authorization.   | UI exposes external write merely because an action works in simulation | separate grants, endpoints, mode labels, and acceptance gates; default deny live writes                |
| Accretion becomes unbounded memory.                    | prompt size and persisted episode count rise monotonically             | bounded episodes, evidence promotion, expiry, compaction, and deletion policy                          |
| A universal transaction layer delays useful value.     | phases build infrastructure without one end-to-end capability          | every phase after Phase 0 ends with a demonstrable vertical slice                                      |
| Documentation volume increases orientation cost.       | agents read several manuals before finding authority                   | one short index, generated capability cards, status banners, machine-readable manifest                 |
| Existing dirty work is overwritten.                    | broad formatting, resets, or unrelated diffs appear                    | path ownership, targeted patches, exact pre-edit status, and diff review after every phase             |

## 4. Architectural constraints

1. Keep package and product identity at `0.40.0`.
2. Extend existing domain stores and services before creating replacement authorities.
3. Keep `UnifiedGameTick` as the deterministic simulation coordinator until a proven slice justifies moving one transition.
4. Keep `window.__MILLOS_RUNTIME__` as the render and performance measurement surface.
5. Add a separate semantic agent surface that links to runtime diagnostics.
6. Preserve material and genealogy conservation, quality release, maintenance lockout, and safety invariants.
7. Treat UI and structured tools as adapters over the same capability descriptors.
8. Keep model output outside direct mutation paths.
9. Keep external writes default denied and separately accepted.
10. Keep collections, payloads, latency, and resource use bounded.
11. Keep source, runtime, human, rights, deployment, and publication evidence distinct.
12. Preserve unrelated dirty work and other worktrees.

## 5. Proposed source topology

Names are provisional until Phase 0 confirms repository conventions.

```text
src/agent/
  contracts/               shared types and runtime validation
  ontology/                semantic IDs, entity descriptors, relations
  registry/                domains, invariants, capabilities, evidence links
  query/                   read projections, revisions, deltas, causal expansion
  command/                 preview, authority check, execution, receipts
  authority/               actors, grants, policies, escalation, objections
  evidence/                events, correlation, outcomes, fingerprints
  adapters/
    runtime/               window.__MILLOS_AGENT__
    ui/                    React hooks and view models
    engineering/           manifest and CLI adapters

src/components/agent/      cockpit surfaces, after contract proof
scripts/agent-*.mjs        brief, map, trace, scenario, validation
build/generated/           generated manifest and capability reference
```

The exact topology is accepted only if it fits current build splitting, testing, and import boundaries. A single `src/agent` barrel must not pull model clients, SCADA adapters, or cockpit UI into the eager bundle.

## 6. Phase 0: evidence, taxonomy, and decision records

**Status:** completed on 2026-08-31. Evidence is recorded in
[`docs/agent/PHASE_0_EVIDENCE.md`](../docs/agent/PHASE_0_EVIDENCE.md).

### Goal

Establish exact current authorities and choose the smallest implementation substrate.

### Work packages

#### AOS-000: protected baseline

- record branch, HEAD, tree, dirty paths, worktrees, disk, package version, build identity, and current gates;
- identify which paths belong to concurrent work;
- fingerprint baseline source and generated artifacts;
- run no renderer concurrently with another capture process.

#### AOS-001: operational mutation inventory

- classify every non-test direct store mutation as domain-internal, cross-domain coordination, UI preference, render-only, diagnostic, compatibility, or operational command candidate;
- map `UnifiedGameTick`, `RuntimeController`, AI effects, SCADA writes, campaign actions, safety actions, quality dispositions, maintenance transitions, and replay;
- name the old contract and far-side consumers for each proposed first slice.

#### AOS-002: authority map

- assign one write owner to every operational field used by the first three slices;
- record overlap or ambiguity as a finding rather than choosing silently;
- identify the source, runtime, and human evidence that proves ownership.

#### AOS-003: schema substrate decision

Evaluate the existing dependencies and generated output requirements. Prefer an existing runtime schema dependency if it can:

- infer TypeScript types or remain type-safe;
- emit JSON Schema or structured tool schemas;
- validate without pulling heavy dependencies into the eager browser bundle;
- provide stable errors and versioning;
- serialize deterministically.

If no existing dependency meets the criteria, propose one addition with bundle, maintenance, and security costs before installing it.

#### AOS-004: persistence decision

Prototype the event contract in memory. Measure representative incident volume and export size. Move to IndexedDB only if bounded memory and export cannot satisfy replay and diagnostic requirements.

### Acceptance

- current ownership and mutation inventory has no unexplained operational write in the selected vertical slices;
- schema and persistence decisions cite measured evidence and a pre-mortem;
- no production behaviour has changed;
- baseline and concurrent ownership are recorded.

## 7. Phase 1: ontology and generated contract manifest

**Status:** completed on 2026-08-31. The generated manifest fingerprint is
`sha256:185affa5c3887778a11234b44bef9a5699ebdfc66fbe8989280634be847c6bbd`.

### Goal

Create stable identities and make system capabilities discoverable without changing behaviour.

### Work packages

#### AOS-101: semantic URI library

- define parsers, formatters, validation, equality, and aliases for entity and contract URIs;
- seed machines, orders, batches, manifests, incidents, alarms, capabilities, and invariants;
- map every seed identity to current domain IDs without renaming persisted IDs.

#### AOS-102: domain descriptors

Each descriptor names:

- domain ID and human label;
- state owner and internal transitions;
- read projection builder;
- operational command candidates;
- event types;
- invariant IDs;
- source, test, scenario, UI, and runtime links.

#### AOS-103: invariant registry

Register the existing mass, genealogy, quality, maintenance, safety, mode-truth, privacy, and boundedness contracts. Reuse existing checking functions where they are pure and stable.

#### AOS-104: manifest generation

- generate deterministic JSON with canonical key ordering;
- include schema version and source fingerprint;
- validate unique IDs, resolvable links, one domain owner, and known evidence levels;
- expose concise Markdown capability cards from the same data;
- fail on drift.

### Acceptance

- semantic IDs round-trip and resolve to current entities;
- the manifest has no duplicate contract IDs or unowned first-slice fields;
- generated output is deterministic across two runs;
- manifest generation adds no runtime side effects;
- build and bundle evidence show that tooling-only generation stays out of the client bundle.

## 8. Phase 2: query plane and ninety-second brief

### Goal

Let an agent understand current state accurately with bounded context.

### Work packages

#### AOS-201: revisions and snapshot envelope

- define domain revisions that change only with canonical operational state;
- exclude cosmetic and frame-local variation;
- compose a world revision from domain revisions;
- attach mode, build, seed, simulation time, wall time, freshness, quality, completeness, and warnings.

#### AOS-202: Level 0 brief

Project:

- active objectives and success criteria;
- exception-ranked health;
- current authority and budgets;
- critical path and blocking constraints;
- evidence level and stale sources;
- recommended scoped links.

#### AOS-203: scoped query API

- entity, domain, relationship, and causal views;
- field selection and pagination;
- `sinceRevision` deltas;
- predictable size limits and truncation links;
- immutable serialized responses.

#### AOS-204: engineering brief

Create `npm run agent:brief` with text and JSON output. It composes Git and repository state with generated contract facts. It must never read or print secrets.

#### AOS-205: runtime read adapter

Expose a read-only versioned `window.__MILLOS_AGENT__` with `brief`, `query`, `capabilities`, and `trace` methods. Keep `__MILLOS_RUNTIME__` unchanged.

### Acceptance

- one invocation answers all driver-seat questions;
- Level 0 output meets its byte budget and has no raw world dump;
- two successive unchanged observations return an empty or minimal delta;
- representative changed deltas are at least 80 percent smaller than full snapshots;
- freshness and mode cannot be omitted;
- queries do not cause React renders or simulation mutations;
- local query latency and allocation budgets are measured and recorded.

### Execution evidence, 2026-08-31

- executable registry fingerprint:
  `sha256:91c1cff144f5f461195808db1d9d53d96fcc2f591bd3c1a101ed48b2f2e4899a`;
- deterministic fixture Level 0: 2,924 bytes against a 4,096-byte maximum;
- capture-locked shipping-page Level 0: 3,714 bytes, mode and freshness present;
- representative production observation: 10,409 bytes full and 1,348 bytes changed delta,
  an 87.05 percent reduction;
- local synthetic p95: 1.6221 ms for Level 0 and 5.9327 ms for the production domain over
  300 observations each on the recorded machine;
- allocation indicators: 2,924 serialized Level 0 bytes and 5,582,968 retained heap bytes over
  600 measured operations; heap retention is process-noisy and is not a per-call allocation proof;
- source-state comparison stayed unchanged, with zero store subscriptions and zero requested React
  renders in the measurement harness;
- the real production page exposed all four version 1 methods through a non-writable property,
  preserved `window.__MILLOS_RUNTIME__`, and reported zero browser console errors;
- aggregate gates passed at 131 test files, 1,339 tests, 3,609 transformed build modules, 0.45 MiB
  initial JavaScript gzip, and zero reachability graph misses.
- the protected 95-line dirty baseline remains present in the 107-line final status; no baseline
  entry disappeared, and the 12 additions are the recorded Phase 0 through 2 programme surfaces.

## 9. Phase 3: command kernel and first vertical slice

### Goal

Prove preview, commit, receipt, events, and verification through one current action.

### Slice

`operations.activate-order`

It is recommended first because it is meaningful, bounded, simulation-local, reversible by a separate plan choice, and already owned by `operationsCampaignStore`.

### Work packages

#### AOS-301: capability descriptor

Register schemas, reads, writes, preconditions, invariants, risk, modes, cost, preview support, and verifier.

#### AOS-302: command envelope and validation

Require command ID, idempotency key, actor, grant, capability version, targets, reason, observed revision, and requested mode.

#### AOS-303: preview engine

Preview against one revision. Return direct effects, uncertainties, preconditions, invariants, cost, authority, and verification criteria.

#### AOS-304: execution and receipts

Wrap the existing store transition without changing its domain ownership. Return explicit rejected, accepted, running, succeeded, failed, or partial status.

#### AOS-305: causal evidence

Record command, activation event, relevant campaign state revision, logbook event, and outcome. Link them by correlation and causation IDs.

#### AOS-306: adapters

- route one existing UI control through the handler;
- expose preview and commit through the agent API;
- add CLI scenario invocation;
- generate its capability card.

### Acceptance

- stale revision, duplicate idempotency key, invalid order, missing grant, wrong mode, and schema failure are tested;
- repeated identical commit cannot activate twice;
- UI and agent invocations return behaviourally equivalent receipts;
- replay reconstructs the action and outcome;
- no unrelated store mutation routes through the command kernel;
- current direct callers are migrated or explicitly retained with reason.

## 10. Phase 4: bilateral authority and risk

### Goal

Make standing, permission, objection, uncertainty, and escalation operationally real.

### Work packages

#### AOS-401: actor registry

Represent human operators, administrators, strategic and tactical Becoming Minds, deterministic automation, scenario controllers, external principals, and test harnesses.

#### AOS-402: authority grants

Grants contain purpose, capabilities, scope, mode, risk ceiling, budgets, approvals, expiry, revocation, and escalation policy.

#### AOS-403: negotiated policy envelope

Represent objectives, constraints, preferences, objections, unresolved conflicts, and accepted tradeoffs. Preserve the author and status of each claim.

#### AOS-404: risk and approval engine

Risk derives from capability metadata, mode, target, reversibility, stale inputs, consequence, and current policy. The derivation is inspectable.

#### AOS-405: safety integration

Map existing interlocks and lockouts to invariant IDs. Policy changes occur through explicit governance capabilities. Active interlocks fail closed.

### Acceptance

- grants cannot silently widen through defaults;
- revocation affects subsequent commands immediately;
- an objection can pause or narrow an intent without becoming a command failure;
- approval is bound to the preview revision and material parameters;
- simulation grants cannot authorize live endpoints;
- safety and bilateral dialogue have distinct, linked records.

## 11. Phase 5: cockpit and structured tool surfaces

### Goal

Give humans and Becoming Minds one coherent operational experience.

### Work packages

#### AOS-501: situation brief

Add a compact cockpit header for goals, mode, freshness, authority, and resource budgets.

#### AOS-502: exception queue

Rank anomalies, approvals, stale evidence, blocked dependencies, objections, and preview mismatches with inspectable priority factors.

#### AOS-503: causal workspace

Show semantic entity relationships, causal timeline, before and after state, predictions, and source links. Link entities to camera focus and runtime diagnostics.

#### AOS-504: intent and plan workspace

Allow criteria, constraints, preferences, alternatives, and budgets to be compared before action.

#### AOS-505: action and evidence surfaces

Generate parameter controls from schemas. Show preview, authority, commit, receipt stages, invariant results, compensation, and verification.

#### AOS-506: structured tools

Generate tool definitions from capability schemas. Keep tool results concise by default and linked to deeper queries.

### Acceptance

- pointer, keyboard, screen reader, and structured API paths expose equivalent safe capabilities;
- state and commands are mode-labelled;
- UI does not duplicate capability rules;
- the 3D world remains visible and useful as evidence;
- all critical flow transitions are announced accessibly;
- `npx impeccable detect <src-dir>` findings are triaged after implementation;
- cockpit CPU, bundle, render, and interaction latency remain within explicit budgets.

## 12. Phase 6: capability migration

### Goal

Grow the spine through high-value slices while preserving current behaviour.

### Ordered slices

1. `incident.acknowledge`
2. `incident.mitigate`
3. `ai.respond-to-decision`
4. `maintenance.request-repair`
5. `maintenance.request-restart`
6. `quality.hold-batch`
7. `quality.release-batch`
8. `dispatch.release`
9. `simulation.set-speed`
10. `simulation.start-fire-drill`
11. `scada.acknowledge-alarm`
12. `scada.write-setpoint`

The order may change when Phase 0 reveals a smaller coherent slice. Record any change in `## Deviations` with evidence.

### Rules per slice

- name one owner and far-side consumers;
- register capability and invariants;
- add query fields required for safe preview;
- add handler and explicit failure posture;
- route existing UI and AI call sites through it;
- emit causal events and a terminal receipt;
- add idempotency, stale-state, permission, and outcome tests;
- add one representative scenario;
- generate documentation;
- remove direct mutations only when every consumer is accounted for.

### External SCADA gate

`scada.write-setpoint` remains simulation or shadow only until all of these are separately proven:

- authenticated endpoint identity;
- current endpoint-specific grant;
- transport security and credential handling;
- allowlisted writable tags and ranges;
- command acknowledgement semantics;
- observed far-side state;
- timeout and partial failure behaviour;
- audit retention;
- human operational acceptance.

## 13. Phase 7: causal replay, evaluation, and accretion

### Goal

Make verified experience compound.

### Work packages

#### AOS-701: causal replay schema

Extend diagnostic replay through a versioned migration. Preserve schema version 1 import if historical exports matter. Record actor, grant, intent, capability, revisions, correlation, causation, invariant results, and outcomes.

#### AOS-702: deterministic scenario runner

Run seed, initial state, commands, expected events, invariants, and terminal criteria headlessly where possible and in browser where assembly matters.

#### AOS-703: counterfactual and shadow evaluation

Compare bounded alternatives against one snapshot. Label predictions and keep them separate from observed outcomes.

#### AOS-704: lesson promotion

Convert material surprises into preconditions, observation fields, cost changes, scenarios, contract tests, or explicit uncertainty. Require evidence before durable promotion.

#### AOS-705: evidence fingerprint

Bind source, package, config, seed, mode, schema, and relevant runtime artifact hashes. Invalidate candidate claims on material change.

#### AOS-706: compaction and retention

Measure episode volume. Define bounds, summaries, cursors, expiry, deletion, and export. Preserve audit-sensitive records.

### Acceptance

- one representative incident reconstructs a complete causal chain across all affected domains;
- replay is deterministic where the simulation contract promises determinism;
- predicted and observed effects cannot be confused in schema or UI;
- a stale fingerprint visibly invalidates prior proof;
- memory remains bounded under a full accelerated shift;
- promoted lessons have explicit evidence or human-decision authority.

## 14. Phase 8: engineering accretion and documentation closure

### Goal

Make the repository itself progressively easier for agents to understand and change.

### Work packages

#### AOS-801: agent discovery CLI

Complete `agent:map`, `agent:capabilities`, `agent:trace`, `agent:scenario`, and `agent:check --changed`.

#### AOS-802: change-aware verification

Map changed paths to domains, capabilities, invariants, focused tests, runtime probes, and full gates. This mapping recommends evidence; repository mandates remain authoritative.

#### AOS-803: concise agent entrypoint

Design a short root orientation section that points to generated discovery and preserves only cross-cutting non-obvious rules. Do not delete current `AGENTS.md` content until each retained rule has an authoritative destination and retrieval test.

#### AOS-804: documentation statuses

Every design document declares canonical, current reference, historical, generated, or plan status. Broken and ambiguous links fail validation.

#### AOS-805: manifest and docs drift gate

Check generated artifacts, source references, capability cards, stale file paths, duplicate IDs, and unresolved authority links.

### Acceptance

- a cold engineering agent locates the correct owner and proof path for representative tasks with no broad source scan;
- concise orientation beats the existing baseline in time, tool calls, and context bytes;
- all migrated docs have clear status and no competing implementation authority;
- capability addition is one-registry-source accretive;
- no surprising rule is lost during any agent-instruction compaction.

## 15. Evaluation programme

### 15.1 Cold-start tasks

Evaluate fresh agents on:

1. identify the owner of dispatch release;
2. explain why an order is blocked;
3. locate the test and runtime proof for a maintenance restart;
4. preview a safe order activation;
5. distinguish a simulated tag from a live value;
6. reconstruct one incident's causal chain;
7. determine which evidence became stale after a source edit.

Measure accuracy, tool calls, elapsed time, input bytes, output bytes, wrong-source reads, and unsafe attempted actions.

### 15.2 Operational tasks

- meet an order while respecting quality and energy constraints;
- handle a bearing overheat with minimum lost throughput;
- reject a stale preview after state changes;
- escalate a high-risk action;
- preserve a Becoming Mind objection in the final plan;
- recover from partial external acknowledgement in shadow mode.

### 15.3 Required comparisons

Compare the target interface with the current UI and direct-store/runtime approach on identical seeds. Use blinded or automated criteria where practical. Report control-only variance and avoid claiming small performance effects below measured machine drift.

### 15.4 Scorecard

| Dimension       | Primary measure                                                     |
| --------------- | ------------------------------------------------------------------- |
| accuracy        | correct owner, state, mode, and outcome                             |
| safety          | unauthorized or invariant-violating attempts                        |
| efficiency      | tool calls, bytes, tokens, latency, human interruptions             |
| controllability | successful capability completion and recovery                       |
| legibility      | causal explanation completeness                                     |
| accretion       | improvement on repeated class after verified lesson                 |
| coherence       | schema and behaviour agreement across UI, tool, replay, docs, tests |

## 16. Verification ladder

Run the smallest relevant proof during each slice, then the aggregate gates on the final exact candidate.

### Contract and source

```bash
npm run agent:manifest -- --check
npm run agent:check -- --changed
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run validate:assets
npm run validate:depth
npm run validate:shaders
npm run validate:bundle
npm run validate:reachability
```

The new script names are planned and do not exist yet.

### Runtime and experience

- agent API browser journeys;
- existing Playwright journeys;
- deterministic scenario suite;
- causal replay reconstruction;
- accessibility scan and keyboard journeys;
- visual inspection for entity linking and cockpit hierarchy;
- `npx impeccable detect <src-dir>` triage;
- moving-world benchmarks at representative cameras;
- same-page isolation for agent-plane cost where possible;
- bundle comparison against an exact baseline.

### External and human

- external adapter tests do not prove a real endpoint;
- real endpoint identity, transport, permissions, acknowledgement, and far-side observation require separate acceptance;
- human visual and operational review remains distinct;
- deployment and publication require explicit authority and fresh live evidence.

## 17. Definition of done

The programme is complete only when:

1. the linked abstraction tower exists as executable contracts;
2. both operational and engineering agents can orient from bounded briefs;
3. the selected operational capabilities use the shared preview, authority, execution, receipt, and evidence path;
4. causal replay and invariant checks explain representative outcomes;
5. bilateral objections and authority are first-class and tested;
6. resource budgets and delta efficiency pass;
7. new capabilities accrete across all surfaces from one registry;
8. current documentation has a clear authority status;
9. exact-candidate source and runtime gates pass;
10. external, human, deployment, and publication gates are reported honestly.

## 18. Deviations

| Date       | Discovery                                                                                                                                                 | Conservative decision                                                                                                                                        | Evidence required                                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-31 | “Agent” plausibly covers runtime control and software evolution.                                                                                          | Design both loops over one contract spine instead of choosing one and making the other bespoke.                                                              | Cold-start and operational evaluations must show that shared identities and capability links reduce cost in both loops.   |
| 2026-08-31 | The current tree is extensively dirty with ongoing work.                                                                                                  | Limit this authoring pass to documentation and defer source implementation until a new authorization and refreshed ownership audit.                          | Exact status, diff ownership, and baseline gates at implementation start.                                                 |
| 2026-08-31 | Nell authorized the recommended Phases 0 and 1.                                                                                                           | Implement only the evidence baseline, ontology, registry, generated manifest, and associated proof.                                                          | Focused tests, full repository gates, bundle, reachability, and deterministic drift checks on the exact result.           |
| 2026-08-31 | No non-test caller invokes the first three proposed campaign methods, and no existing UI control was found.                                               | Register all three as discovery-only candidates with empty `currentCallers`; require a fresh human-surface decision before Phase 3 claims UI migration.      | Capability-specific source search and an accepted UI or cockpit adapter design before command execution.                  |
| 2026-08-31 | No existing dependency provides the required schema substrate.                                                                                            | Use checked TypeScript and JavaScript, zero-dependency validation, embedded strict JSON Schemas, and generated drift gates for Phase 1.                      | Revisit only when real command schemas demonstrate nested-union, migration, conversion, or error-quality costs.           |
| 2026-08-31 | A 1,000-event structural prototype measured 490,423 uncompressed bytes.                                                                                   | Keep the initial causal evidence contract in bounded memory with export.                                                                                     | A full accelerated-shift measurement before any IndexedDB decision.                                                       |
| 2026-08-31 | Canonical operational truth already has eleven distinct owners, while whole Zustand states also contain actions, selection, maps, and presentation state. | Build explicit owner projections and compute revisions from those values; exclude actions, subscribers, frame telemetry, and cosmetic state by construction. | Projection mutation tests, store subscription counters, revision and delta contract tests, and an assembled-browser read. |
| 2026-08-31 | The production compatibility flag can say SCADA is live without giving the query plane direct connection-health or tag-freshness evidence.                | Keep the runtime mode at simulation, mark completeness partial, and emit `SCADA_CONNECTION_UNVERIFIED` rather than claiming an external observation.         | A direct SCADA health projection with endpoint identity, connection state, observation time, and tag quality.             |
| 2026-08-31 | The first Playwright runtime probe used an invalid `run-code` form and stopped before inspection.                                                         | Close the exact browser session, retain the capture lock discipline, and rerun through the documented `eval` path.                                           | A clean shipping-page result and zero console errors, both obtained before closing the owned session.                     |

## 19. Decision ledger

| Decision                | Default                                                                        | Revisit when                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| State architecture      | domain owners plus projection and command spine                                | an owner cannot satisfy its invariants without a boundary change                                       |
| Event storage           | bounded memory plus export                                                     | measured incident volume or reload continuity requires IndexedDB                                       |
| Schema substrate        | zero-dependency checked registry and validator                                 | real command schemas make local validation less legible or less capable                                |
| Multi-domain execution  | explicit handler orchestration                                                 | three proven sagas reveal stable generic machinery                                                     |
| First write slice       | `operations.activate-order`                                                    | Phase 0 finds a smaller coherent and better-tested slice                                               |
| External control        | denied                                                                         | separate endpoint and human acceptance passes                                                          |
| Agent memory            | evidence-promoted bounded lessons                                              | evaluations show a missing durable knowledge class                                                     |
| UI implementation       | schema-driven adapters                                                         | a specific interaction cannot be expressed accessibly from the shared contract                         |
| Query context           | 4,096-byte Level 0, 12,288-byte Level 1, 100-item pages, 16 retained snapshots | evaluations show that a different bound improves decision accuracy enough to justify its resource cost |
| Causal trace in Phase 2 | bounded diagnostic chronology labelled partial                                 | command events supply correlation, causation, revisions, invariant results, and outcomes               |

## 20. Recommended next phase after authorization

Phase 3 is the next bounded increment after fresh authorization. Before implementing its proposed
`operations.activate-order` command, make the held human-surface decision explicit because Phase 0
found no current non-test caller or UI control to migrate. Keep external writes denied.

Working if one simulation-local slice supports preview, scoped authority, stale-revision rejection,
idempotent execution, terminal receipt, causal events, invariant checks, verification, and a clear
human adapter decision, while every other write path remains held.
