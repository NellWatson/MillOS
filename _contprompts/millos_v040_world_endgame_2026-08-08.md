---
title: MillOS v0.40 Operational World Endgame
date: 2026-08-08
status: in progress
stepsCompleted: 5
scope: exact-candidate runtime closure, spatial truth, non-human world activity, logistics, industrial art, atmosphere, SCADA, operator UX, performance, and publication
verification_criteria:
  - 'Package, lockfile, interface, evidence, and release identity remain exactly 0.40.0.'
  - 'The complete factory interior and shell, town, stream, farm, garage, maintenance area, yards, roads, mountains, sky, sun, and moon remain continuously mounted.'
  - 'No new people are added; existing personnel and vehicle operators keep their current authored contracts.'
  - 'Every authored footprint, service clearance, vehicle route, fence relationship, and golden camera is finite and deterministically validated.'
  - 'Forklift, pallet, dock, truck, trailer, gate, inventory, manifest, alarm, and SCADA state tell one deterministic operational story.'
  - 'Weather, water, drainage, lighting, sky, celestial bodies, vegetation, non-human ambient life, and acoustic zones share the canonical clock and atmosphere state.'
  - 'SCADA values have explicit simulation or external provenance, scene links, tag quality, alarm lifecycle, trends, replay, and responsive operator access.'
  - 'Medium quality passes every representative camera at 55 FPS or better, 25 ms p95 or better, DPR 1 or better, and no recurring long task over 100 ms.'
  - 'Native first useful frame stays under 4 seconds where machine conditions permit and the Fast 3G gate stays under 8 seconds.'
  - 'Typecheck, lint, format, unit, build, asset, depth, shader, bundle, design-lint, browser, accessibility, motion, visual, and performance gates pass on the exact candidate.'
---

# MillOS v0.40 Operational World Endgame

## Product decision

Deepen the accepted continuous world in place. Preserve every authored district and the existing personnel roster. Improve spatial truth, non-human activity, logistics, industrial art, atmosphere, SCADA, operator clarity, startup, and frame pacing without changing the `0.40.0` identity.

## Adversarial pre-check

1. PR #6 is a clean, green, reviewable exact candidate, but its fresh headed runtime proof is blocked by unrelated automation-browser ownership. New work must not contaminate that baseline.
2. A Cartesian capture of every quality, weather, time, and camera combination would create more than a thousand frames and thermally invalidate performance evidence. Use full coverage on Medium plus pairwise representative coverage for the other dimensions.
3. Existing world, logistics, SCADA, weather, water, and personnel systems are mature. Extend their authorities and contracts rather than add parallel stores or replacement scenes.
4. Performance changes require trace evidence. Large-file decomposition, batching, worker offload, and lazy boundaries are conditional remedies, not automatic goals.
5. Spatial fixes can vandalize the authored composition when inferred from source coordinates alone. Footprints, routes, Blender harnesses, fixed cameras, and running-scene inspection are the joint authority.
6. The request excludes new humans. Existing personnel may receive bug fixes and non-destructive polish only.

## Execution order

1. Preserve PR #6 and close its exact-commit browser acceptance when the automation lane is free.
2. Establish spatial footprint, clearance, route, and depth regression contracts.
3. Deepen non-human world activity and weather-driven water and drainage.
4. Finish vehicle, dock, cargo, gate, light, audio, and exception choreography.
5. Refine industrial models, process legibility, materials, shaders, lighting, and surface stability.
6. Advance atmosphere, celestial state, cameras, acoustic zones, SCADA, operator UX, writing, accessibility, and responsive behavior.
7. Optimise cold start, draw calls, updates, assets, and bundle boundaries only where measurements show a material constraint.
8. Run the representative acceptance matrix, update evidence, publish the stacked review branch, and keep the version locked.

## Acceptance matrix

- Full 19-camera coverage: Medium, clear, midday, motion enabled, plus dedicated sun and moon scene times.
- Weather pairwise coverage: overview, yard, water, village, farm, shipping across clear, cloudy, rain, and storm.
- Quality pairwise coverage: overview, interior, personnel-close, shipping, water, and village across Low, Medium, High, and Ultra.
- Time pairwise coverage: overview, yard, water, village, farm, sun, and moon across dawn, midday, sunset, and midnight.
- Operational coverage: idle, production, loading, quality hold, delayed truck, breakdown, storm, and fire drill.
- Interface coverage: desktop, tablet, mobile, keyboard, touch, reduced motion, zoom, SCADA hidden, compact, and full.

## Execution ledger

- [ ] Close exact PR #6 browser acceptance when the shared automation lane is free.
- [x] Centralise service-asset footprints, heights, clearances, forklift routes, truck sweeps, and route hazards with deterministic regression tests.
- [x] Separate precipitation from residual wetness, drive water shader ripples and culvert level from canonical atmosphere, and make farm motion deterministic, pause-aware, weather-aware, and time-aware.
- [x] Apply storm traction loss to forklifts and trucks, make entrance gates follow truck phases, and replace random logistics animation identities with stable React identities.
- [x] Replace flat black truck-yard asphalt and aprons with correctly decoded procedural PBR surfaces, retain the authored layout, and keep the complete logistics district mounted on every quality preset.
- [x] Remove random SCADA tag baselines, pin the current 106-tag inventory in integration tests, and correct stale tag-count documentation.
- [ ] Measure the stacked candidate, then make only evidence-led startup or frame-pacing changes.
- [ ] Run the full static, design, browser, accessibility, motion, visual, and performance matrix; publish the stacked review branch.

## Machine evidence to date

- Spatial and truck route contracts: 3 files, 39 tests passed.
- Atmosphere and runtime contracts: 3 files, 24 tests passed; shader validator passed.
- Operational incident contracts: 4 files, 39 tests passed.
- SCADA integration and operational telemetry: 2 files, 27 tests passed.
- Ambient-world contracts: 2 files, 12 tests passed.
- Truck gate and service-path contracts: 1 file, 14 tests passed.
- Depth validator: 55 active files and 12 resolved relationships passed.
- Typecheck, lint, full format check, production build, asset validation, shader validation, bundle validation, and Impeccable design lint passed.
- Production build: 3,726 modules; initial JavaScript remains 0.61 MiB gzip; total build is 99.66 MiB and within budget.
- The full unit run completed all 107 files under machine load average 448: 105 files and 1,684 tests passed; six 10-second timeouts occurred in SCADA and personnel geometry. The two timed-out files then passed all nine tests with a 60-second timeout. A standard-timeout aggregate rerun remains required when the shared machine load clears.
- Full exact-candidate runtime, visual, accessibility, and performance evidence remains pending the automation-lane gate.

## Deviations

| Date | Discovery | Conservative decision | Evidence required |
|---|---|---|---|
| 2026-08-08 | PR #6 cannot run fresh headed acceptance while unrelated Playwright and headless Chrome processes own the machine lane. | Keep PR #6 unchanged and build the remaining programme on stacked branch `codex/v040-world-endgame` from its exact head. Never terminate or attach to other tasks' browsers. | Exact base hash, clean branch, unique runtime ports and evidence directories, then PR #6 capture on the unchanged commit when the lane clears. |
| 2026-08-08 | The severe-rain incident claimed slower yard traffic, but vehicle motion did not consume that consequence. | Add one canonical incident vehicle-speed multiplier and apply it to both forklift implementations and the shared truck clock. | Unit tests for raised, mitigated, and resolved multipliers plus headed storm-motion capture. |
| 2026-08-08 | Farm wandering, dock-plate IDs, guard gates, and silo-moisture baselines used unrelated random values, weakening replay evidence. | Replace visual and baseline randomness with deterministic authored sequences; preserve deliberate process-noise simulation. | Determinism tests, typecheck, and exact-camera replay comparison. |
