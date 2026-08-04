---
title: MillOS v0.40 Operations Campaign
date: 2026-08-04
status: complete
stepsCompleted: 7
scope: truthful capability contracts, full-shift operations, personnel consequences, incidents, SCADA, continuous-world polish, and acceptance
verification_criteria:
  - "Package, interface, replay, documentation, and release metadata remain locked to 0.40.0 while feature development continues."
  - "Every public capability claim maps to a live implementation or is visibly described as simulated, experimental, or unavailable."
  - "A deterministic accelerated shift carries customer orders, recipes, due times, capacity, quality, energy, labour, maintenance, trucks, cost, and end-of-shift reporting."
  - "Personnel skills, certifications, fatigue, breaks, and assignments produce bounded, explainable operational effects and visible task behaviour."
  - "At least six incident types produce coherent consequences across the 3D world, machinery, personnel, alarms, SCADA, commitments, and debrief."
  - "SCADA provides process navigation, annotated trends, operator logbook entries, alarm lifecycle, batch and maintenance provenance, and deterministic replay links."
  - "Weather, water, lighting, vehicles, town, farm, garage, personnel, mountains, sky, sun, and moon remain continuously present and receive bounded sensory polish."
  - "The complete world meets deterministic, browser, accessibility, visual, motion, bundle, and runtime-performance gates."
---

# MillOS v0.40 Operations Campaign

## Product decision

Turn the mature digital twin into a coherent, persistent shift simulation. Existing material, quality, maintenance, personnel, logistics, SCADA, BAS, replay, and world systems must accumulate into one explainable operational story. Product identity remains permanently locked to v0.40. Features continue without a version increment.

## Adversarial pre-check

1. The repository already contains shift, energy, maintenance, truck, fatigue, historian, replay, and scenario systems. The campaign must connect them rather than add parallel stores or duplicate interfaces.
2. README claims host migration is complete while the implementation explicitly marks it unavailable. Truthfulness repair precedes new multiplayer work.
3. Mobile surfaces contain placeholder content. A visible placeholder is not an implemented capability.
4. Personnel assets have validated skinned rigs and semantic clips but no morph targets. Improvements must use available bones, accessories, materials, paths, and task state honestly.
5. The complete world is already performance-tested. New environmental or animation detail needs bounded quality tiers, stable shader keys, and allocation-conscious updates.
6. Existing SCADA adapters include simulated and external modes. The interface must never imply a live industrial connection when none exists.
7. A shift report derived only from current snapshot metrics loses causality. Events, commitments, actions, and outcomes need deterministic bounded records.

## Non-negotiables

1. Preserve the factory shell and interior, town, stream, farm, garage, maintenance area, roads, trucks, forklifts, mountains, sky, sun, and moon in one continuous world.
2. Keep `package.json` at `0.40.0` and preserve the version-lock test.
3. Extend existing stores, ticks, panels, replay, and authored assets before creating new infrastructure.
4. Keep material mass and genealogy conserved through every order and incident.
5. Keep all collections bounded, identifiers deterministic, and expensive visual work quality-gated.
6. Treat human visual acceptance, real external SCADA connectivity, multiplayer networking, deployment, and publication as distinct evidence gates.

## Execution phases

### Phase A: integration and capability truth

- Merge the validated operational-consequences candidate.
- Correct multiplayer host-migration claims and make the experimental boundary visible.
- replace mobile placeholders with useful live summaries or explicit unavailable states.
- Remove or safely retire dead graphics controls after consumer and persistence audits.
- Add source tests that enforce capability wording and the v0.40 identity.

### Phase B: full-shift operations

- Add deterministic customer commitments, recipes, quantities, due times, priority, revenue, and penalties.
- Model finite production, storage, packing, and bay capacity using existing material and truck state.
- Track order allocation from source lots through production batches and dispatch manifests.
- Integrate energy tariff, labour, waste, maintenance, quality, and demurrage into shift cost and margin.
- Provide operator actions, constraint warnings, shift objectives, persistence, and a causal end-of-shift report.

### Phase C: personnel consequences

- Extend existing personnel profiles with skills, certifications, fatigue, breaks, availability, and assignment records.
- Apply bounded modifiers to repair, sampling, inspection, forklift, and supervision work.
- Map assignments into existing semantic animation and path systems, role tools, PPE, radio, and supervisor cues.
- Preserve close, mid, and far LOD budgets and current authored body contracts.

### Phase D: incident library

- Add bearing overheat, dust-filter pressure, power sag, delayed truck, supplier contamination, packaging shortage, severe rain, and understaffing conditions.
- Reuse the existing scenario choice, objective, consequence, audit, and debrief contracts.
- Drive machinery, material, personnel, alarms, SCADA, commitments, costs, and visible world signals from shared incident state.

### Phase E: SCADA and operator interface

- Add process-area navigation with live tag summaries and provenance links.
- Add historian annotations, incident bookmarks, operator logbook entries, and replay actions.
- Complete acknowledgement, shelving, suppression, out-of-service, return-to-service, and audit visibility.
- Join orders, batches, work orders, incidents, personnel actions, and tags into inspectable timelines.

### Phase F: continuous-world sensory polish

- Add weather-responsive surface, drainage, water, window, vegetation, vehicle, steam, and dust-extraction cues without district removal.
- Improve shift-synchronised town, farm, garage, truck, forklift, and personnel activity.
- Improve acoustic zoning and captions while preserving user audio initialization and mute contracts.
- Instrument CPU time, draw calls, frame time, memory, and world completeness per representative camera.

### Phase G: acceptance

- Prove deterministic replay, save restoration, mass and genealogy conservation, bounded records, and cross-store incident causality.
- Run typecheck, lint, formatting, unit, build, asset, depth, shader, bundle, design-lint, browser, accessibility, visual, motion, and runtime benchmarks.
- Package reproducible evidence for human review without self-approving visual taste.

## Baseline

At merged commit `54a7d2a`, package identity is `0.40.0`. TypeScript, ESLint, Prettier, 103 test files with 1,652 tests, Vite build with 3,721 transformed modules, asset validation, depth policy, shader contracts, bundle budget, and Impeccable all pass. Initial JavaScript is 0.60 MiB gzip and the complete build is 99.55 MiB.

## Deviations

| Date | Discovery | Conservative decision | Evidence required |
|---|---|---|---|
| 2026-08-04 | The plan described a new shift layer, but the repository already contains shift handover, energy, truck scheduling, fatigue, maintenance, historian, replay, and scenario systems. | Compose the existing systems through a bounded operations-campaign contract instead of creating replacement subsystems. | Dependency tests and browser proof that the new campaign reads and drives the existing authorities. |
| 2026-08-04 | Incident feedback needed to remain visible without adding another heavy scene or duplicating authored props. | Add one quality-aware marker layer anchored to the canonical site layout, with shared geometry, materials, and one animation loop. | Placement tests, depth and shader policy gates, browser inspection, and the continuous-world benchmark. |
| 2026-08-04 | The existing historian replay store already owns recent replay state. | Link the SCADA operations logbook to that authority instead of creating a campaign-specific playback engine. | Browser proof that the logbook records an operator entry and toggles from recent replay back to live. |

## Machine acceptance, 2026-08-04

- Product identity remained `0.40.0` in package metadata and the version-lock contract.
- TypeScript, ESLint, Prettier, Impeccable, all 106 Vitest files with 1,670 tests, and the Vite production build passed.
- Asset, depth, shader, and bundle gates passed. Initial JavaScript was 0.61 MiB gzip and the complete build was 99.61 MiB.
- Both existing Playwright journeys passed, including accessibility, responsive, SCADA, safety, and settings coverage.
- The headed moving-world benchmark passed at all five representative cameras. Average frame rate ranged from 67.5 to 92.9 FPS, p95 frame time ranged from 12.1 to 17.6 ms, effective DPR was 1.20, and every view reported a continuous world.
- Browser inspection confirmed live order, personnel, incident, cost, handover, and logbook state; a bearing incident changed throughput, machine status, maintenance work orders, alarms, PA output, and SCADA context; the SCADA logbook recorded an operator entry and entered recent replay.

## Remaining human gate

Machine acceptance establishes correctness, continuity, accessibility, and measured performance. Final visual taste across the factory, personnel, town, farm, garage, mountains, sky, sun, moon, water, weather, trucks, forklifts, and incident staging remains a human review decision.
