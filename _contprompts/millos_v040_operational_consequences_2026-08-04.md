---
title: MillOS v0.40 Operational Consequences
date: 2026-08-04
status: complete
stepsCompleted: 6
scope: operational causality, traceability, training, personnel fidelity, delivery, and accessibility
verification_criteria:
  - "Every received grain lot has a deterministic identifier and conserved source contribution that remains traceable through silo, milling, sifting, packing, QC, and dispatch."
  - "QC can place a specific lot or production batch on hold, record an initial test or retest, release conforming material, and recall affected batches without allowing held or recalled product to dispatch."
  - "SCADA exposes live batch, quality, recall, maintenance, and downtime provenance alongside the conserved material ledger."
  - "Wear-induced failures create a work order, stop the affected machine and its material flow, require available parts and an assigned worker, accrue downtime, require verification, and explicitly restart production."
  - "At least one timed operational incident provides consequential choices, objective-level scoring, an audit trail, and a debrief that explains strengths, misses, and the recommended response."
  - "The supervisor vertical slice uses the existing validated skinned rig and gains materially better close-range face, materials, identity, and role equipment without claiming unavailable morph targets."
  - "The two authored personnel GLBs are delivered through the existing asset pipeline with smaller validated runtime derivatives and preserved skins, bones, and nine semantic clips."
  - "New operator controls are keyboard and touch reachable, status changes are announced to assistive technology, reduced motion is respected, and captions remain available."
  - "Multiplayer remains visibly experimental and is not represented as a release-ready operational dependency."
  - "Typecheck, lint, format, unit tests, build, asset, depth, shader, bundle, browser, accessibility, motion, and visual evidence gates are green on the feature branch."
---

# MillOS v0.40 Operational Consequences

## Product decision

Version 0.40 makes the living mill operationally consequential. Material, quality, maintenance, training, and personnel state must tell one inspectable story across the 3D world, Overview, SCADA, alerts, and scenario debrief. The accepted v0.40 world composition remains intact. The product version is intentionally locked at 0.40 while features continue to evolve.

## Adversarial pre-check

1. Receiving and shipping manifests alone cannot prove genealogy. Source contributions must travel with conserved material through buffers, conversion, conveyor transit, packing, and dispatch.
2. QC currently applies only a global latest-result interlock. Batch-specific hold, retest, release, and recall need stable identifiers and explicit disposition records.
3. Machine wear and breakdown UI already exist in separate stores. The implementation must connect them rather than add a second fault simulator. Production status, material flow, work order phase, parts, worker assignment, downtime, verification, and restart must share one causal lifecycle.
4. The scenario framework is already mature and BAS-oriented. Operational scoring should extend its choice and result contracts without weakening existing categories, persistence, or debriefs.
5. The authored worker bodies already have compatible rigs, 62 joints, nine semantic clips, PBR variants, LOD, blink, gaze, breathing, and role accessories. They contain no morph targets. The truthful v0.40 personnel slice is a supervisor refinement on the existing rig, not an invented facial-animation system.
6. The existing personnel pipeline emits uncompressed geometry even though every runtime consumer already uses the DRACO-capable loader. Compression is acceptable only if validation proves skins, bones, names, bounds, and all nine clips survive.
7. Full real-system publication, browser acceptance, and visual judgment remain separate gates from TypeScript and build success.

## Non-negotiables

1. Preserve the factory, town, stream, farm, garage, roads, trucks, forklifts, mountains, sky, sun, moon, and continuous inside-outside world.
2. Preserve conserved mass and deterministic replay. No `Date.now()` or `Math.random()` identifiers in genealogy or work-order contracts.
3. Reuse the existing stores, tick, SCADA database, panels, worker rig, and asset pipeline.
4. Keep state transitions explicit. A hold, repair, verification, or recall may not silently auto-clear.
5. Keep all new collections bounded and all per-tick work allocation-conscious.
6. Treat Multiplayer as experimental and independent from the operational proof.

## Execution phases

### Phase A: conserved batch genealogy

- Add deterministic source lots, source contributions, process records, production batches, and manifest links to `materialFlowStore`.
- Propagate contribution mass through conversions, waste, conveyor parcels, packer output, and FIFO dispatch.
- Add queries for upstream source lots, downstream product batches, process path, and manifest provenance.
- Prove both material mass conservation and contribution conservation under normal flow and backpressure.

Working if a dispatched batch can be traced backwards to exact receiving or initial lots and every contribution sum matches its material amount within tolerance.

### Phase B: quality, hold, retest, release, and recall

- Bind lab tests and contamination alerts to batches or source lots.
- Add explicit test type, disposition, operator note, and deterministic audit IDs.
- Propagate source-lot contamination to affected in-process and packed batches.
- Prevent dispatch of held or recalled product, allow conforming retest release, and retain the complete audit trail.
- Surface the current disposition and operator actions in Overview and SCADA.

Working if contamination creates a visible interlock, retest can release only the tested scope, recall finds all downstream batches, and dispatch manifests exclude prohibited mass.

### Phase C: maintenance causality

- Extend the current breakdown store with work orders and phases: diagnosed, awaiting parts, repair, verification, ready to restart, returned to service.
- Create work orders from wear-induced failures in the unified tick.
- Stop affected machine flow immediately, require parts and an assigned worker before repair, accrue downtime, verify completion, and explicitly restart the production machine.
- Expose causes, consumed parts, worker, elapsed downtime, and restart evidence in maintenance UI and SCADA.

Working if the machine, material flow, work order, inventory, alerts, and SCADA all agree at every lifecycle transition.

### Phase D: operational training and debrief

- Add a timed contamination-at-dispatch incident to the existing scenario system.
- Score safety, traceability, quality, continuity, and response time from actual choices.
- Record choice time, consequence, objective outcome, missed safeguards, and a recommended response sequence.
- Render the objective breakdown and debrief accessibly in the existing scenario panel.

Working if two different choice paths produce explainably different objective scores and debriefs while existing BAS scenarios retain their current behavior.

### Phase E: personnel and delivery vertical slice

- Refine the supervisor on the existing skinned asset with restrained facial expression cues, improved identity badge, radio, vest response, and supervisor-specific silhouette details.
- Preserve shared geometry and material reuse and keep the refinement limited to close LOD.
- Add DRACO compression to the existing authored-worker normalization pipeline and regenerate both runtime derivatives.
- Validate both bodies, skins, 62-joint rigs, all nine semantic clips, bounds, loader behavior, and size reduction.

Working if the supervisor reads as a credible individual at close range, the rest of the roster remains stable, and the total personnel payload is materially smaller with identical runtime contracts.

### Phase F: interface, accessibility, and acceptance

- Extend Overview and SCADA with compact traceability, quality, recall, work-order, and downtime state.
- Ensure new buttons have labels, focus states, 44 px touch targets where practical, status live regions, and no color-only meaning.
- Respect reduced motion in scenario transitions and preserve PA captions and transcript access.
- Run the full deterministic gate plus browser keyboard, touch viewport, Axe A/AA, operational flow, asset delivery, and representative close-worker visual evidence.

Working if a keyboard-only operator can diagnose and resolve the training incident, a touch viewport can operate the same controls, Axe reports no A/AA violations, and human review can judge the supervisor from reproducible captures.

## Deviations

| Date | Discovery | Conservative decision | Evidence required |
|---|---|---|---|
| 2026-08-04 | The aggregate material store conserves mass but erases lot identity when materials of the same type merge. | Carry bounded source-contribution vectors inside each conserved material parcel and aggregate equal source IDs, rather than infer ancestry from timestamps. | Contribution conservation tests through processing, conveyor backpressure, packing, and dispatch. |
| 2026-08-04 | The existing worker GLBs contain no morph targets and an earlier duplicate facial overlay visibly fought the authored face. | Refine the supervisor using the existing rig, subtle bone-mounted cues, materials, and role accessories. Do not claim blend-shape expression. | GLB contract inspection plus close supervisor captures and regression captures of both body types. |
| 2026-08-04 | The same-runner QEMU Docker build was nondeterministic on ARM64. | Keep the reviewed native architecture workflow from v0.40. Do not reintroduce emulated package installation. | Native AMD64 and ARM64 jobs plus final multiarchitecture manifest. |
| 2026-08-04 | Four cleanup thresholds discarded conserved parcels smaller than 0.01 kg and produced cumulative ledger drift. | Retain every finite fragment above a 1e-9 kg numerical epsilon and add a sub-centigram regression. | A 15,000-tick receiving, processing, and dispatch run must keep both ledgers below 0.001 kg error. |
| 2026-08-04 | Overview subscribed to a newly allocated genealogy-balance object, causing a maximum-update-depth failure when the panel opened. | Subscribe only to stable collections and the primitive balance error value. | Fresh browser opening, batch actions, and E2E coverage with no fallback alert or console error. |
| 2026-08-04 | The scenario dialog used `position: fixed` inside a transformed Framer Motion ancestor, placing the decision surface above the viewport after sidebar scrolling. | Portal the modal to `document.body`, trap focus, focus the first action, and restore prior focus on close. | Visible viewport bounds, keyboard choice completion, touch target measurement, and Axe A/AA scan. |
| 2026-08-04 | The newly compressed worker GLBs were still loaded with DRACO disabled. A warm session hid the fault because the forklift configured Drei's shared loader first, while a cold art-review route failed. | Configure DRACO directly at the worker call site so model ordering cannot affect decoder availability. | Cold browser load of authored workers and every world review camera with zero console errors. |
| 2026-08-04 | BAS expandable headings nested tooltip buttons inside other interactive controls, and Overview and maintenance controls exposed insufficient contrast in active, inactive, or hover states. | Separate tooltip controls, use native buttons, add accessible names and 44 px targets, and darken interactive color pairs. | Full-document Axe A/AA scans and the master browser test. |
| 2026-08-04 | The default moon review used the general noon benchmark time, so the camera correctly aimed at a below-horizon moon and captured the ground. | Default only the moon benchmark scene to midnight while keeping explicit time authoritative. | Runtime-mode regression plus a fresh moon capture showing the procedural moon and star field. |

## Verification results

- Deterministic source, test, build, and design gates: TypeScript, ESLint, Prettier, 103 test files with 1,652 tests, Vite build with 3,721 modules, asset validation, depth policy, shader contracts, bundle budget, and Impeccable all pass.
- Asset delivery: the two authored DRACO personnel derivatives validate at 797,268 and 796,120 bytes with their skins, rigs, and nine semantic clips intact. Cold browser loading now configures the local decoder at the worker call site.
- Conservation stress run: after 15,000 ticks, ordinary ledger error is 0.000000035 kg and genealogy error is 0.000000310 kg across receiving, processing, waste, inventory, shipping, 18 batches, and four manifests.
- Browser gate: two Playwright journeys pass in 1.1 minutes. They cover cold model delivery, the complete 3D scene, Mill Overview, the visible v0.40 identity, genealogy, simulated SCADA, fire drill, settings, responsive layout, keyboard focus, and WCAG A/AA scans.
- Operational scenario: the keyboard-operated strong path scores A and 94 percent overall, with Safety 100, Traceability 100, Quality 100, Continuity 85, and Response Time 83. The four timed choices and their outcomes remain in the debrief audit.
- Maintenance: the UI requires technician assignment, consumes bearings and belts once, requires repair completion and verification, queues the restart, and the real unified tick returns R.M. 101 to service with wear reduced from 100 to 50 and a complete work-order audit.
- Performance: all five default complete-world samples pass. Overview is 100.6 FPS, interior 118.8, shipping 103.5, receiving 104.1, and water 85.2; p95 frame time ranges from 9.6 to 12.9 ms.
- Reproducible visual evidence is under `test-results/v040-operational/`, including supervisor and feminine personnel close-ups, batch recall and genealogy, maintenance, SCADA provenance, scenario debrief, and high-fidelity yard, village, farm, water, garage, forklift, sun, and moon captures.

Human visual acceptance remains a human review decision. This completion records implementation and reproducible evidence without self-approving taste.
