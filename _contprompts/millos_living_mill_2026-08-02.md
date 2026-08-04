---
title: MillOS v0.40 Living Mill continuation
date: 2026-08-02
status: completed
scope: whole product, preserving the accepted v0.40 world and version
verification_criteria:
  - "The complete factory, town, stream, farm, garage, logistics site, sky, horizon, sun, and moon remain in one continuous scene from every camera."
  - "Named world-integrity telemetry proves that required authored layers exist and that continuous layers are not hidden."
  - "Landmark footprints, service assets, portals, routes, and golden cameras are finite, separated, and covered by deterministic tests."
  - "Close personnel have credible faces, PPE, individual phase, blinking, gaze, grounded locomotion, and stable LOD transitions."
  - "Machines, process flow, forklifts, trucks, weather, water, and SCADA tell one causally legible operational story."
  - "Medium quality preserves the existing 55 FPS and 25 ms p95 budgets at DPR 1 or better with the whole world continuously mounted."
  - "Typecheck, lint, format, tests, build, depth, shader, asset, bundle, browser, motion, accessibility, and visual evidence gates are green."
---

# MillOS v0.40 Living Mill continuation

## Product decision

Keep the accepted v0.40 world intact and deepen it in place. The little town, stream, farm, garage, maintenance area, factory interior, factory shell, yards, mountains, sky, sun, and moon are permanent parts of one site. Quality settings may change detail density, materials, shadows, particles, and update frequency. Camera position must never decide whether an authored district exists or is visible.

## Non-negotiables

1. Preserve the current composition and authored objects. Reposition only when measured footprints overlap or an operational route becomes implausible.
2. Keep version identity at v0.40. No version bump is implied by this continuation.
3. Prefer shared materials, instancing, static batching, frustum culling, LOD, and update throttling over deleting world content.
4. Treat personnel as the highest visual priority, followed by factory process legibility and logistics motion.
5. Keep sun, moon, weather, fog, water, lighting, and telemetry driven by the same simulation clock and atmosphere state.
6. Keep SCADA and scene state bidirectional and unambiguous. Every control must show state, action, and operational consequence.
7. Preserve the clean v0.40 checkpoint at commit `ba01abb` and local tag `v0.40.0`.

## Execution phases

### Phase A: continuity and regression protection

- Remove residual camera-driven visibility gates from authored landscape and logistics groups.
- Add stable names for world root, environment, process, infrastructure, conveyors, personnel, forklifts, logistics, terrain, exterior, castle, farm, and village.
- Add world-integrity telemetry with separate `missing` and `hidden` evidence.
- Centralize landmark anchors and footprints in the site-layout contract.
- Add explicit sun and moon benchmark cameras derived from celestial direction.
- Add deterministic tests for world layers, landmark separation, portal clearance, and camera/celestial alignment.

Working if every normal benchmark reports zero missing and zero hidden continuous layers from interior and exterior cameras.

### Phase B: personnel vertical slice

- Add readable facial anatomy, eyes, brows, mouth, nose, hair and PPE detail to the authored skinned models.
- Publish blink, gaze, breath, stance, wave, fatigue, and locomotion signals through one animation channel.
- Desynchronize workers deterministically and keep clip speed tied to world speed.
- Improve role silhouette and close-range material response without multiplying unique GPU resources per worker.
- Verify masculine and feminine close cameras, normal working, walking, break, response, and evacuation states.

Working if close captures read as individual workers rather than mannequins, blinks and gaze are visible without synchrony, feet remain grounded, and the LOD transition does not pop.

### Phase C: living process and logistics

- Strengthen machine silhouette, access panels, fasteners, guarding, motors, drive housings, belts, grain paths, status lights, wear, and grounding shadows.
- Tie spouting, grain flow, conveyors, packers, dust, steam, alarms, and machine motion to actual production state.
- Refine forklift steering, wheel rotation, forks, mast, load pose, warning lights, stopping, and route anticipation.
- Refine truck approach, articulation, reversing, dock service, doors, load state, departure, yard markings, and safety zones.
- Keep every moving system pausable, deterministic in benchmark mode, and legible in motion telemetry.

Working if one can infer production and logistics state from the 3D scene before opening a panel, and motion evidence proves distance-correct, state-linked cycles.

### Phase D: world, atmosphere, materials, and audio

- Deepen factory walls and large windows while protecting readable sight lines and portal clearance.
- Improve terrain transitions, roads, vegetation, village, farm, garage, water banks, reflections, mountains, fog, clouds, stars, sun, and moon.
- Use explicit colour spaces, stable shader cache keys, shared clocks, bounded emissive energy, and the established depth-layer policy.
- Add restrained spatial machine, vehicle, water, weather, UI, and alert audio with captions and priority ducking.

Working if the site reads as a continuous rural industrial landscape by day and night, with no z-fighting, exposure pumping, seam, obvious tiling, or disconnected ambient motion.

### Phase E: SCADA, interface, writing, accessibility, and onboarding

- Preserve a compact HUD and reachable full SCADA workspace with process mimic, tags, alarms, trends, events, simulation, and connections.
- Make selection and operational state flow both ways between SCADA and the world.
- Tighten operational copy, empty states, tooltips, alarm acknowledgement, AI narration, and PA scheduling.
- Consolidate onboarding, add true Skip, preserve keyboard and touch operation, respect reduced motion, and meet contrast/focus targets.

Working if a first-time operator can identify the process, select a machine, diagnose a fault, acknowledge it, and return to the world without modal confusion or losing most of the 3D view.

### Phase F: performance and acceptance

- Profile the whole continuous world before reducing quality.
- Recover cost through batching, LOD, frustum culling, allocation removal, shader stability, texture budgets, lazy delivery, and lower update frequency for distant systems.
- Run exact deterministic gates and the normal, throttled-startup, logistics-motion, SCADA, celestial, weather, accessibility, and visual camera matrices.
- Record human visual review separately from automated proof.

Working if all automated gates are green, Medium meets its runtime budgets with the complete world, and the remaining gate is clearly labelled human acceptance rather than silently inferred.

## Deviations

| Date | Discovery | Conservative decision | Evidence required |
|---|---|---|---|
| 2026-08-02 | The accepted scene still used camera position and spatial cells to set `visible={false}` on the truck yard, castle, farm, and village. This preserved mounts but retained the experience split Nell had explicitly rejected. | Remove those visibility gates. Keep camera tracking only for camera behavior and quality hints, then recover any cost with ordinary scene optimization. | World-integrity telemetry from interior and exterior cameras plus performance benchmarks. |
| 2026-08-02 | The source worker GLBs already contain eyes, brows, and moustache geometry. Adding a second complete facial overlay produced bead-like duplicated features at close range. | Retain the new blinking eyelids, nose, and mouth cues, remove duplicated eyes and brows, and preserve the authored source features. | Masculine and feminine close-camera captures plus deterministic animation tests. |
| 2026-08-02 | The ordinary OrbitControls polar clamp prevented benchmark cameras from looking far enough upward to frame zenith sun and moon positions. | Widen the polar range only for celestial evidence modes and restore the normal navigation limits everywhere else. | Dedicated sun and moon runtime captures with the celestial body visible and world-integrity telemetry green. |
| 2026-08-03 | A separate GPU-concrete experiment appeared in the shared checkout during final validation. | Preserve it untouched and exclude its files and generated evidence from this task's staged patch. | Staged-name audit and isolated validation from `ba01abb` plus only this task's patch. |
