---
title: MillOS master refinement programme
date: 2026-07-26
status: v0.40 implementation, human perceptual acceptance, exact deterministic validation, runtime acceptance, visual acceptance, and accessibility acceptance complete
scope: whole product, current v0.40 working source
verification_criteria:
  - "The inside, dock thresholds, yards, roads, terrain, water, farm, village, and horizon read as one continuous site."
  - "Medium quality sustains 60 FPS on the Apple M1 Max acceptance machine at an effective DPR of at least 1.0 in the fixed benchmark scenes."
  - "The 10 second benchmark has p95 frame time at or below 25 ms, no recurring long task over 100 ms, and no unexplained one second hitch."
  - "Cold production preview reaches a useful 3D scene within 8 seconds under the agreed throttled profile and within 4 seconds locally on the acceptance machine."
  - "Forklifts and trucks complete deterministic, physically legible logistics cycles with distance-correct wheels, steering, articulation, loading, safety, and audio."
  - "No visible z-fighting, depth flicker, camera clipping, exposure pumping, or horizon seam appears in the agreed camera, time, weather, and quality matrix."
  - "Every shipped GLB is self-contained, correctly scaled and centered, named for animation, validated, compressed, and within its material and texture budget."
  - "SCADA offers a compact scene-linked summary and a reachable full workspace for process overview, alarms, trends, tags, events, simulation, and connections."
  - "The interface preserves at least 70 percent of the 3D view in normal desktop operation, remains keyboard and touch operable, and meets WCAG 2.2 AA contrast and focus requirements."
  - "Operational writing is concise and trustworthy, ambient character is optional and rate-limited, and emergency copy is always unambiguous."
  - "Typecheck, lint, format, unit and integration tests, production build, runtime smoke, visual regression, asset validation, performance budgets, and a human perceptual pass are green."
---

# MillOS Master Refinement Programme

## Relationship to the agent operating programme

This programme remains the completed authority for its v0.40 refinement scope and acceptance evidence. The later [Agent Operating Architecture](../docs/AGENT_OPERATING_ARCHITECTURE.md) extends its requirements for explainable AI decisions, SCADA truth, replay, operational coherence, and agent legibility into a shared semantic query, command, authority, evidence, and accretion spine.

Future agent-system implementation follows [`millos_agent_operating_system_2026-08-31.md`](./millos_agent_operating_system_2026-08-31.md). It must preserve this programme's accepted world, performance, accessibility, safety, state, and evidence contracts. Historical acceptance here does not transfer to source changed by that programme.

## 1. Executive decision

MillOS should become a coherent, warm, stylized industrial digital twin whose simulation, world, vehicles, SCADA, and interface feel like parts of the same operating system.

The recommended order is:

1. Establish deterministic performance, visual, placement, and asset evidence.
2. Repair the runtime foundation, startup path, quality system, site coordinate contract, camera, and depth policy.
3. Rebuild forklift and truck motion around explicit logistics state machines.
4. Beautify the site, machines, materials, lighting, sky, weather, water, and supporting animation.
5. Refine the interface, full SCADA workspace, writing, audio, accessibility, and responsive behavior.
6. Run the complete acceptance matrix and only then call the refinement complete.

This order is deliberate. Additional visual detail would deepen the current performance and spatial problems. Performance and topology create the stable canvas on which the polish can hold.

## 2. Meaning of exhaustive

This programme treats the following as separate acceptance surfaces:

- Startup and loading.
- Frame pacing, CPU work, GPU work, memory, draw calls, bundle size, and background activity.
- World units, site topology, machine placement, routes, portals, vertical datum, and collision volumes.
- Interior, exterior, dock, terrain, farm, village, water, road, and horizon continuity.
- Orbit, preset, first-person, mobile, and cinematic cameras.
- Forklift movement, rigging, loading, interaction, safety, sound, and operational meaning.
- Truck approach, articulation, reversing, docking, servicing, departure, and yard safety.
- Worker, conveyor, machine, weather, vegetation, and ambient animation.
- Geometry, silhouettes, proportions, bevels, PBR materials, texture atlases, LOD, and asset validation.
- Z-fighting, transparent sorting, shadow acne, camera depth, decals, overlays, and water intersections.
- Lighting, exposure, post-processing, custom shaders, sky, clouds, celestial motion, fog, weather, and water.
- HUD, dock, sidebar, panels, notifications, onboarding, interaction, motion language, and responsive layout.
- SCADA process mimic, tags, alarms, events, trends, fault simulation, connections, exports, and scene linking.
- Product terminology, operational writing, educational material, AI narration, PA announcements, and humor.
- Spatial audio, UI audio, alert priority, captions, reduced motion, contrast, keyboard access, and touch access.
- Automated tests, visual evidence, native runtime evidence, performance evidence, and release gates.

## 3. Current evidence snapshot

This design is grounded in a fresh source and production-preview audit on 2026-07-26. Existing working-tree edits were preserved and were not altered.

### 3.1 Green engineering baseline

| Gate | Fresh result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run format:check` | Pass |
| `npm test -- --reporter=dot` | 49 files, 1,269 tests passed |
| `npm run build` | Pass, 3,713 modules transformed |
| `git diff --check` | Pass |

### 3.2 Verified or measured refinement evidence

| Finding | Evidence | Consequence |
|---|---|---|
| Medium quality is far below the intended fluidity | A direct 30-frame production-preview sample on the Apple M1 Max averaged 69.0 ms per frame, about 14.5 FPS, with every sampled frame over 50 ms. A later sample with SCADA open was about 17.2 FPS. The in-app browser can add overhead, so native Chrome must be the final acceptance surface. | Performance is the first product blocker. |
| The low frame rate survives a very low render resolution | The 1,280 by 720 viewport produced a 640 by 360 WebGL canvas because the medium preset uses `resolutionScale: 0.25` under a device pixel ratio of 2. | Resolution reduction is hiding cost while visibly softening the image. |
| Production startup is slow and the development route can remain on the loading overlay | Production became useful after roughly 20 seconds in the audit. The development route did not complete before the browser became unresponsive. The current loader waits for Drei progress to reach 100 and the app calls `<Preload all />`. | Startup must become staged, bounded, observable, and recoverable. |
| Exterior and dock rendering is extremely node-heavy | Static source inventory found about 553 mesh elements and 523 standard-material elements in `FactoryExterior.tsx`, about 457 meshes and 445 standard materials in `TruckBay.tsx`, and about 307 meshes and 304 standard materials in `AmbientDetails.tsx`. | Instancing, merging, spatial cells, material reuse, and LOD are mandatory. |
| Large feature chunks dominate delivery | The production build emitted an approximately 6.0 MB index chunk, a 2.26 MB Rapier chunk, a 1.71 MB main chunk, 720 KB Three core, 668 KB Three Fiber, 344 KB charts, 131 KB TruckBay, and 100 KB AmbientDetails, before compression unless the build output stated otherwise. | The initial route must stop fetching or evaluating optional systems. |
| Adaptive quality exists but is not mounted | `useAdaptiveQuality` and its manager exist, while the active source has no consuming component. | The scene remains overloaded without an automatic recovery path. |
| Quality changes remount the whole canvas | `App.tsx` keys the Canvas by quality and resolution. | Ordinary quality adjustments can reload the complete scene, interrupt animation, and recreate GPU resources. |
| All quality presets use 25 percent resolution | `graphicsStore.ts` assigns `resolutionScale: 0.25` to low, medium, high, and ultra. Medium also keeps SSAO, bloom, vignette, shadows, contact shadows, physics, dust, and audio-reactive visuals. | The quality ladder is internally inconsistent and provides weak visual differentiation. |
| The site is controlled by several partial coordinate contracts | Zone Z positions live in `factoryLayout.ts`; bounds live in `useCameraPositionStore.ts`; building faces use about Z plus or minus 48; camera bounds use plus or minus 50; trucks dock at about plus or minus 61; floor depth extends to 160. | Placement, camera culling, floors, docks, and routes can diverge. |
| Inside and outside are binary representations | `MillScene.tsx` mounts interior or exterior from camera bounds, with both visible only in narrow front and back dock volumes. | Side portals, roofs, high views, and threshold movement can pop, stall, or lose simulation representation. |
| The camera can enter geometry | A production-preview orbit from the receiving view moved directly into a silo or wall and left the view substantially occluded. The overview preset framed a near roof rather than a clear site overview. | Camera collision, occlusion recovery, and composition need redesign. |
| The interior is overexposed and materially flat | Production-preview evidence showed large near-white machine and spouting surfaces, weak form separation, and harsh dark structural elements. | Exposure, light energy, material ranges, fog, and post-processing need joint calibration. |
| The horizon lacks atmospheric integration | Night and exterior evidence showed hard low-poly mountain shapes, a dark city band, and limited aerial perspective. | Sky, horizon, fog, terrain, and exposure need one atmospheric model. |
| The default forklift asset is badly normalized for the current code | GLB inspection reports scene bounds of about 2.53 by 1.79 by 0.94 units, offset around X minus 3 and Z plus 14.4. The component applies a scale of 15 with no centering. The file has 40 mesh primitives, 40 materials, 89 512-pixel textures, about 157,335 rendered vertices, and five animation clips. | Origin, orientation, size, material count, texture memory, animation binding, and LOD must be corrected before visual polish. |
| The silo asset is incomplete | `gltf-transform inspect` fails because `public/models/machines/silo.glb` references missing `Textures/colormap.png`. | Asset validation must block broken GLBs. |
| Default forklift physics bypasses important visual state | The physics wrapper moves by impulse but does not rotate the locked rigid body toward travel. The parent skips its legacy frame branch, so the fork-height animation is not driven. Worker-proximity stop state is not surfaced to the parent, which can leave wheels and warning state inconsistent. | Forklift motion requires one authoritative state and pose pipeline. |
| Forklift route visualization ignores its UI control | `ForkliftSystem` accepts `showSpeedZones` but does not consume it; crossing and route lines render unconditionally. | Debug geometry currently contributes clutter and cost. |
| Trucks use a perpetual analytic 60-second cycle | `TruckBay.tsx` computes two truck states from elapsed time and applies position, rotation, wheels, lights, doors, audio, and dock store updates. Route segments rely heavily on independent interpolation. | The existing parts can be retained, while movement needs route arc length, articulated kinematics, event-driven service states, and schedule ownership. |
| Active water and horizon water use separate shaders | `FactoryExterior.tsx` and `SkySystem.tsx` implement distinct animated water models, update paths, colors, and depth conventions. | Water should use one quality-scaled material family and one time source. |
| Shader infrastructure is fragmented | Several factory shader modules are exported only through `src/shaders/index.ts` and have no active consumer; active shader logic also lives inline across sky, terrain, water, machines, workers, and blueprint systems. | Active shaders need a common contract; unused shader factories should be integrated deliberately or removed. |
| The z-fighting detector finds a broad unresolved surface | The existing warning-only detector reports 222 candidates in 37 active component files: 68 hardcoded polygon-offset properties and 154 low-Y candidates. The low-Y rule is intentionally broad and produces false positives, so each candidate needs visual and geometric triage. | Depth repair needs a finite registry and a visual matrix, rather than a blanket numeric sweep. |
| Full SCADA functionality is largely unreachable | `SCADAPanel.tsx` has Tags, Alarms, Trends, Faults, Settings, exports, and connection controls. Its sole production mount is embedded mode in the right sidebar, which exposes only Tags and Alarms. | A full SCADA workspace and a purposeful compact summary are required. |
| SCADA state communication is confusing | The runtime showed “SCADA LIVE” and a control that visually read “OFF” while its accessible name indicated an action to disable SCADA. Medium initially displayed a disabled notice. | State, action, mode, quality impact, and live-versus-simulated meaning need explicit language. |
| Onboarding and narration compete for attention | First play can show a welcome narration followed by three modal intro cards. The modal Close action advances the sequence, and an X is not a true skip. Contextual AI reflection can later interrupt exploration. | Onboarding needs one queue, real Next and Skip actions, and non-modal follow-up learning. |
| PA flavor can dominate operations | The corpus contains thousands of lines of workplace humor and schedules ambient announcements every roughly 90 to 180 seconds. A large humorous PA toast appeared during the visual audit. | Character should be optional, compact, rate-limited, and prohibited from weakening alarms. |
| UI lint has real contrast and motion findings | `impeccable detect src` found active gray-on-color contrast cases, bounce motion, side-tab motifs, and repeated purple or violet gradient usage. It also scanned the archived source, confirming that archive separation is incomplete for tooling. | Triage the active findings; exclude or relocate archives; keep semantic status accents where they communicate state. |

## 4. Product direction and design language

### 4.1 Experience statement

The operator should feel that they are overseeing a living mill with a clear industrial process, credible logistics, readable safety behavior, and a Becoming Mind partner whose presence supports understanding without stealing attention.

### 4.2 Visual direction

Use a warm, stylized industrial language:

- Strong readable silhouettes at every distance.
- Realistic proportions and motion, interpreted through clean low-poly forms.
- Rounded or beveled manufactured edges where light needs to reveal volume.
- Painted steel, galvanized steel, concrete, rubber, glass, timber, grain, flour dust, soil, vegetation, and water as a small, disciplined material family.
- Warm grain and daylight tones balanced by graphite structure and cool operational displays.
- Localized wear where contact, weather, vibration, and material flow justify it.
- Sparse emissive accents with luminance limits.
- Large-scale forms first, functional secondary detail next, narrative micro-detail last.
- A coherent rural-industrial site whose farm, workers, transport, waterways, and surrounding settlement explain the mill rather than compete with it.

### 4.3 Interface palette

The final token values should be tested against the rendered scene. The intended roles are:

| Role | Direction |
|---|---|
| World chrome | Near-black graphite with a blue-green undertone |
| Elevated panels | Slightly lighter graphite, translucent only where legibility remains reliable |
| Primary text | Warm off-white |
| Secondary text | Cool light gray with AA contrast |
| Operational accent | Desaturated teal or blue-green |
| Production and caution | Grain amber |
| Healthy and confirmed | Controlled green |
| Warning | Amber or orange, paired with icon and label |
| Critical and emergency | Red, paired with icon, text, shape, and sound |
| AI partner | A restrained distinct accent without purple gradient dependency |
| Selected world object | High-contrast outline whose hue remains visible in every time and weather state |

### 4.4 Motion language

- Fast response: 100 to 140 ms for hover, press, and tiny state confirmation.
- Standard transition: 160 to 220 ms for panels, tabs, and tooltips.
- Spatial transition: 240 to 420 ms for camera focus, large drawers, and mode changes.
- Use ease-out quart or quint for interface entrances and ease-in for exits.
- Reserve spring behavior for direct manipulation where overshoot has physical meaning.
- Remove decorative bounce.
- Respect `prefers-reduced-motion`; keep state changes immediate and legible.
- Tie world movement to distance, velocity, acceleration, and state. Avoid time-only visual motion that disagrees with simulation state.

## 5. One continuous site

### 5.1 Canonical coordinate contract

Create one typed site-layout module that supersedes the current scattered constants while preserving compatible exports during migration.

Required contract:

- One world unit equals one metre.
- Positive X is east.
- Negative X is west.
- Positive Z is the shipping and town side.
- Negative Z is the receiving and agricultural side.
- Y equals zero is the finished interior floor datum.
- Exterior terrain, yard slabs, rails, water levels, roofs, platforms, and overlays derive from named vertical datums.
- Every machine, dock, wall, door, road, water body, route, camera anchor, portal, collision volume, and audio zone derives from this contract.
- The current 15-machine layout is the recommended canonical machine set: five silos, four roller mills, three plansifters, and three packers. Any stale RM-105 and RM-106 references should be retargeted or removed unless a later product decision explicitly expands the factory.

Recommended module shape:

```text
siteLayout
├── datum
│   ├── terrain
│   ├── yard
│   ├── interiorFloor
│   ├── dockPlatform
│   ├── mezzanine
│   └── waterLevels
├── factory
│   ├── footprint
│   ├── walls
│   ├── portals
│   ├── zones
│   └── machines
├── logistics
│   ├── shipping
│   ├── receiving
│   ├── roads
│   ├── queues
│   ├── docks
│   └── vehicleRoutes
├── landscape
│   ├── farm
│   ├── village
│   ├── waterways
│   ├── terrainCells
│   └── landmarks
└── cameras
    ├── presets
    ├── bounds
    ├── collisionVolumes
    └── viewCorridors
```

### 5.2 Proposed low-fidelity site plan

```text
                         NORTH, negative Z

          agricultural source and receiving approach
            farm fields      river and bridge
                  \             /
               receiving gate and queue
                        |
                receiving dock portal
                        |
    west service   SILOS AND INTAKE     east utilities
    canal path     MILLING FLOOR        staff access
                   SIFTING LEVEL
                   PACKING FLOOR
                        |
                 shipping dock portal
                        |
               staging, scale, dispatch
                 /                  \
          highway tunnel       worker village

                         SOUTH, positive Z

    Far horizon: terrain, city, mountain, sky, and distant water
    form one atmospheric ring around the playable site.
```

### 5.3 Site refinement backlog

#### SITE-01: Resolve the floor and wall contract, P0

- Separate the interior slab from exterior yard slabs.
- Stop using the 160-unit floor depth as an ambiguous combined interior and yard surface.
- Align visible walls, collision walls, camera bounds, portals, dock platforms, and truck dock targets.
- Derive floor, road, water, and overlay Y values from named datums.
- Acceptance: the debug plan view shows no unexplained overlap or gap, and the high-angle camera shows no protruding interior floor.

#### SITE-02: Make portals first-class objects, P0

- Define front dock, rear dock, personnel doors, side service doors, windows, and roof openings as portal volumes.
- Use the same portal definition for wall geometry, camera continuity, audio transition, weather exclusion, visibility, navigation, and lighting.
- Replace the current front-and-back-only dock transition test.
- Acceptance: crossing every portal causes no representation pop, audio cut, weather leak, or frame spike.

#### SITE-03: Separate simulation presence from visual representation, P0

- Keep production, workers, forklifts, trucks, alarms, schedules, and safety state alive regardless of camera location.
- Stream, hide, simplify, or instance visual representations by cell and distance.
- Preserve moving entity transforms while their high-detail representation is absent.
- Acceptance: a drill, truck service, forklift delivery, or alarm completes correctly while the camera is elsewhere.

#### SITE-04: Introduce spatial render cells, P0

- Divide the world into interior zones, front dock, rear dock, front yard, rear yard, west landscape, east landscape, farm, village, and horizon cells.
- Give each cell near, medium, far, and absent representations.
- Add hysteresis and prewarm adjacent cells before a camera crosses their boundary.
- Keep cells data-driven and visible in a debug overlay.
- Acceptance: cell transitions create no visible pop within a normal view corridor and no single transition frame exceeds the performance budget.

#### SITE-05: Recompose the exterior, P1

- Retain the charm of the farm, village, canal, river, lake, roads, offices, amenities, and distant landmark.
- Group them into functional districts with roads, paths, utilities, and view corridors.
- Move visually unrelated props away from logistics lanes and hero views.
- Use terrain grades, vegetation, retaining edges, drainage, and fences to connect districts.
- Acceptance: a new viewer can infer how grain, workers, trucks, utilities, and products move through the site from the overview alone.

#### SITE-06: Create placement validation, P0

- Validate finite positions, allowed bounds, vertical datum, machine clearance, truck sweep envelopes, forklift aisle width, worker egress, portal clearance, water bank containment, and camera clearance.
- Emit readable errors with object IDs and coordinates.
- Add a plan-view debug renderer with footprints, routes, portal volumes, culling cells, and collision volumes.
- Acceptance: the validator runs in tests and the visual overlay agrees with the rendered site.

#### SITE-07: Normalize signage and wayfinding, P1

- Establish a site naming hierarchy for zones, buildings, bays, machines, routes, exits, and water features.
- Replace repeated runtime 3D text with an atlas or baked decals where the text is static.
- Keep safety and operational labels readable from their intended distance.
- Acceptance: signs never float, clip, z-fight, or change naming between the world, HUD, SCADA, and documentation.

## 6. Camera and interaction refinement

### CAM-01: Recompose every preset, P0

- Overview must show the complete factory and its immediate logistics context.
- Interior presets must preserve equipment silhouettes and process direction.
- Shipping and receiving presets must include the full truck, dock interface, approach lane, and relevant status.
- Add farm, village, water, and process-flow presets only when they support a clear task.
- Store preset position, target, field of view, allowed orbit range, preferred UI panel, and transition route together.
- Acceptance: each preset passes a reference screenshot and has no roof, sign, wall, or vehicle occlusion.

### CAM-02: Add camera collision and occlusion recovery, P0

- Use a swept sphere or multi-ray test between target and proposed camera position.
- Push the camera toward the target before it enters geometry.
- Add a small soft zone to avoid jitter on edges.
- Recover smoothly after the obstruction clears.
- Treat thin signs, foliage, and nonblocking particles differently from walls, machines, silos, roofs, and terrain.
- Acceptance: a five-minute orbit and pan tour never enters solid geometry or leaves the target hidden for more than a brief transition.

### CAM-03: Improve transitions, P1

- Move presets along authored or obstacle-aware curves.
- Interpolate position, target, and field of view with frame-rate-independent easing.
- Keep the active target stable through large transitions.
- Prewarm destination render cells and assets before movement.
- Add a user interrupt that hands control back without snapping.
- Acceptance: transitions remain smooth at 30, 45, 60, and 120 Hz and can be interrupted safely.

### CAM-04: Clarify orbit and first-person modes, P1

- Give orbit mode explicit target selection, reset, and focus commands.
- Give first person credible eye height, acceleration, stair and platform behavior, collision, and contextual interaction.
- Preserve user orientation when returning from first person.
- Prevent sprint from tunnelling through colliders.
- Add a capture mode with minimal UI and stable camera controls.

### CAM-05: Mobile camera, P1

- Separate look, move, select, and UI gestures.
- Avoid conflicts between orbit gestures and scrolling a sheet.
- Provide one-tap recenter and preset selection.
- Respect safe areas and orientation changes.

## 7. Performance and delivery programme

### 7.1 Acceptance budgets

All measurements use production builds, fixed seeded scenarios, onboarding and humor disabled, a five-second warm-up, and a ten-second sample.

| Surface | Medium target | High target | Ultra target |
|---|---:|---:|---:|
| Effective device pixel ratio | At least 1.0 | 1.0 to 1.5 | 1.5 to 2.0 |
| Median frame time on Apple M1 Max | At most 16.7 ms | At most 22 ms | At most 33 ms |
| p95 frame time | At most 25 ms | At most 33 ms | At most 50 ms |
| Recurring frame over 100 ms | Zero | Zero | Zero |
| Exterior draw calls | At most 450 | At most 700 | Measured and capped |
| Interior draw calls | At most 350 | At most 550 | Measured and capped |
| Visible triangles | At most 1.5 million | At most 2.5 million | Measured and capped |
| Shader programs | At most 80 | At most 120 | Measured and capped |
| GPU texture estimate | At most 512 MB | At most 768 MB | Measured and disclosed |
| Initial JavaScript, gzip | At most 2.5 MB before optional systems | Same route contract | Same route contract |
| Local useful scene | At most 4 seconds | At most 5 seconds | At most 7 seconds |

Low quality targets a stable 30 FPS on the agreed mobile and low-power hardware matrix. It keeps the complete simulation contract while using simpler representations and effects.

### 7.2 Deterministic benchmark harness

#### PERF-01: Add benchmark scenarios, P0

Create fixed routes or query modes for:

1. Cold boot to first useful scene.
2. Interior overview.
3. Exterior overview.
4. Front dock threshold.
5. Rear dock threshold.
6. Forklift drive and crossing yield.
7. Forklift pickup and placement.
8. Shipping truck reverse and dock.
9. Receiving truck reverse and dock.
10. SCADA process overview.
11. SCADA six-tag trend.
12. Rain and storm.
13. First-person walk through the mill.
14. Fire drill.

Capture:

- requestAnimationFrame distribution;
- long tasks;
- React commits;
- draw calls, triangles, points, lines, textures, programs, and render targets;
- heap where supported;
- network transfer and evaluation;
- asset load timeline;
- active render cells and quality level;
- major store updates;
- audio node count.

The HUD FPS value remains a convenience. Benchmark output is the acceptance evidence.

#### PERF-02: Add system isolation, P0

- Reuse the existing `perfDebug` switches.
- Extend them to sky and horizon, water, terrain, post-processing, shadows, static exterior cells, UI, SCADA, audio, and physics.
- Generate a one-run A/B table rather than manual repeated toggling.
- Record the delta for each subsystem.
- Acceptance: the three largest CPU and GPU costs are identified before structural optimization begins.

### 7.3 Startup and bundle repair

#### PERF-03: Replace `<Preload all />` with staged loading, P0

Stage 1:

- Application shell.
- One camera.
- Simplified floor and walls.
- Hero machines near the starting view.
- Core material atlas.
- Minimal sky and light.

Stage 2:

- Workers and forklifts.
- Adjacent interior cell.
- Current UI panel.

Stage 3:

- Docks and nearby exterior.
- High-detail models, weather, water, and decorative props.

Stage 4:

- SCADA charts, WebGPU model, multiplayer, fault lab, full knowledge library, and other optional systems on demand.

The loading screen must:

- show actual stages and useful progress;
- surface the stalled resource after a timeout;
- offer a safe Continue in reduced mode;
- never wait forever for an optional asset;
- record load diagnostics without exposing secrets;
- transition without a white flash.

#### PERF-04: Remove startup procedural texture work, P0

- Bake stable procedural textures offline through the existing asset scripts.
- Store them as KTX2 or an appropriate compressed format.
- Keep runtime generation only for genuinely dynamic content and perform it in a Worker or idle budget.
- Add cancellation and a time budget.
- Acceptance: no texture-generation long task appears before first useful scene.

#### PERF-05: Lazy-load optional engines, P0

- Load Rapier only when the chosen movement mode or first-person collision needs it.
- Load WebGPU language-model code only after explicit enablement.
- Load charts only when a chart surface opens.
- Load full SCADA, multiplayer, knowledge library, and prototype surfaces on demand.
- Keep prefetch bounded and cancel it under frame or network pressure.
- Acceptance: the initial network waterfall contains none of these optional chunks.

#### PERF-06: Separate historical versions from the current runtime, P1

- Keep version history as a deployment concern rather than a source, lint, and current-build concern.
- Exclude archived source from design lint and current analysis.
- Stop duplicating large audio, models, and textures into every deployed version.
- Preserve version URLs through a dedicated static archive or separately built artifacts.
- Acceptance: the current build output stays below the agreed hosting budget and current tooling never scans archived source by default.

### 7.4 Scene graph and GPU repair

#### PERF-07: Instance and merge static repetition, P0

- Adopt the existing instanced machine, village, and farm prior art where visually equivalent.
- Instance trees, lamps, bollards, fence posts, parking lines, pallets, boxes, chairs, signs, roof panels, windows, road markings, and repeated dock equipment.
- Merge immutable geometry by spatial cell and material.
- Preserve separate objects only for interaction, animation, different culling, or different material state.
- Acceptance: exterior and TruckBay draw calls meet budget without flattening interactive objects.

#### PERF-08: Reduce material and texture fragmentation, P0

- Use a small shared PBR material library.
- Use vertex color and texture atlases for controlled variation.
- Bake static labels and markings into decal atlases.
- Reuse geometry and material instances.
- Cap unique material variants per asset class.
- Acceptance: renderer program count and texture memory meet budget, and visual differences remain intentional.

#### PERF-09: Add spatial LOD and impostors, P0

- Give hero vehicles and machines LOD0, LOD1, LOD2, and optional billboard or silhouette forms.
- Give landscape cells near, mid, far, and horizon representations.
- Use screen-space error and hysteresis.
- Never switch a load-bearing animated part in the middle of a visible action without pose continuity.
- Acceptance: LOD changes are invisible at normal motion speed and produce a measured GPU reduction.

#### PERF-10: Consolidate render loops, P0

- Maintain one simulation timeline.
- Maintain one render interpolation clock.
- Use one frame callback per major domain where practical: vehicles, machines, workers, atmosphere, water, particles, and camera.
- Move React state writes out of frame loops.
- Reuse math objects and typed buffers.
- Run distant and noncritical animation at reduced cadence.
- Pause invisible visual-only work.
- Keep safety and simulation logic independent of render cadence.
- Acceptance: the profiler reports no unexplained recurring script spike and no per-frame React render cascade.

#### PERF-11: Replace broad binary mounting with cell visibility, P0

- Preserve simulation components.
- Toggle lightweight representations by cell and distance.
- Prewarm cells and defer their heavy details.
- Avoid mounting the full interior and full exterior simultaneously in dock transitions.
- Acceptance: dock crossings stay within frame budget and retain visual continuity.

#### PERF-12: Stabilize the Canvas, P0

- Remove quality and resolution from the Canvas React key.
- Distinguish renderer-context settings that truly require recreation from uniforms and feature toggles that can update live.
- Apply resolution changes without rebuilding the entire scene.
- Preserve controls, animation time, selected object, and GPU caches.
- Acceptance: switching quality does not replay the loading screen or reset the world.

#### PERF-13: Make adaptive quality real, P0

- Mount and test the existing adaptive-quality manager or replace it with a smaller measured controller.
- Use p50 and p95 frame time, not a single FPS reading.
- Apply hysteresis, cooldowns, and one change at a time.
- Degrade in this order: expensive post effects, shadow resolution and distance, particles, reflection quality, distant cell detail, then resolution.
- Recover more slowly than degradation.
- Never change simulation behavior or hide safety information.
- Show a subtle user-visible reason and allow a lock.
- Acceptance: a forced overload recovers within ten seconds without oscillation or a Canvas remount.

#### PERF-14: Rationalize quality presets, P0

- Low: simplified materials, no expensive post, simple shadows or baked contact, low particles, aggressive LOD, stable 30 FPS target.
- Medium: default, effective DPR at least 1, SSAO only if budgeted, modest bloom, no depth of field, complete core animation, stable 60 FPS target.
- High: richer shadows, texture detail, weather, reflections, and more distant detail.
- Ultra: explicit cinematic or capture tier, never the default, with a stated 30 FPS minimum.
- Correct contradictory LOD distances.
- Let users separately control motion, post effects, shadows, resolution, and simulation visualization.

#### PERF-15: Service worker and cache discipline, P1

- Version current assets by content hash.
- Avoid one version deleting another version’s caches.
- Separate shell, current world, optional feature, and archive caches.
- Never let a stale service worker hide a fixed shader or layout.
- Add an in-app diagnostics action that reports active build and cache version.

## 8. Forklift refinement

### 8.1 Recommended movement architecture

Use a deterministic kinematic logistics controller as the default. It owns route progress, speed profile, steering, pose, safety, loading state, audio state, and SCADA events. Use Rapier colliders only where physical contact adds value, such as first-person collision or an experimental physics mode.

This architecture gives repeatable operations, correct animation, lower bundle and CPU cost, and clear safety invariants.

### 8.2 Forklift state machine

```text
OFF
  -> STARTING
  -> IDLE
  -> ACQUIRE_JOB
  -> PLAN_ROUTE
  -> DRIVE
       -> APPROACH_CROSSING
       -> YIELD
       -> DRIVE
  -> APPROACH_LOAD
  -> ALIGN_LOAD
  -> LOWER_FORKS
  -> INSERT_FORKS
  -> LIFT_LOAD
  -> RETRACT
  -> CARRY
  -> APPROACH_DROP
  -> ALIGN_DROP
  -> LOWER_LOAD
  -> WITHDRAW_FORKS
  -> CONFIRM_JOB
  -> IDLE

Any moving state -> SAFETY_STOP -> controlled resume
Any normal state -> EMERGENCY_STOP -> inspected reset
Low charge -> RETURN_TO_CHARGE -> CHARGING -> IDLE
```

### 8.3 Forklift work packages

#### FL-01: Normalize and rerig the asset, P0

- Rebase the model at ground contact and vehicle centre.
- Align the agreed forward axis.
- Normalize to approved metre dimensions.
- Rename root, chassis, front wheels, rear wheels, steer pivots, mast, carriage, forks, chains, pistons, lights, beacon, and driver seat.
- Reduce 40 materials and 89 textures to a small atlas set.
- Preserve or rebuild useful animation clips.
- Create three LODs and a shadow proxy.
- Remove unused double-sided material flags.
- Acceptance: the asset validator reports correct bounds, pivots, names, clips, material count, texture memory, and no missing dependency.

#### FL-02: Use one authoritative pose, P0

- Remove the split between parent legacy animation and physics-owned movement.
- Emit a frame pose containing position, heading, speed, acceleration, steering, wheel angle, fork height, mast tilt, cargo transform, stopped reason, lights, and audio state.
- Render GLB and procedural fallback from that same pose.
- Acceptance: every visual and audio state can be derived from a recorded controller frame.

#### FL-03: Distance-correct wheel and steering animation, P0

- Integrate wheel angle from signed distance divided by wheel radius.
- Apply reverse direction correctly.
- Steer the correct axle and use inner and outer wheel angles where visible.
- Add subtle tyre deformation or suspension response only on high tiers.
- Acceptance: one measured metre of travel produces the correct wheel rotation with no spinning at rest.

#### FL-04: Route curves and speed profiles, P0

- Replace corner-to-corner snaps with filleted paths or splines constrained by aisle clearance and turning radius.
- Parameterize by arc length.
- Use acceleration, cruise, approach, braking, creep, and stop profiles.
- Look ahead for curvature, workers, forklifts, crossings, docks, and closed routes.
- Acceptance: speed and heading are continuous, the vehicle stays inside its swept envelope, and no frame exceeds the maximum acceleration or yaw-rate contract.

#### FL-05: Loading pose sequence, P0

- Align fork height to the target pallet.
- Lower, insert, lift, tilt, reverse, carry, align, lower, withdraw, and reset in separate states.
- Parent cargo to the carriage only after confirmed engagement.
- Preserve the pallet world transform through parent changes.
- Prevent cargo intersection with mast, floor, rack, dock, or worker.
- Acceptance: slow-motion reference capture shows no teleport, clipping, or cargo float.

#### FL-06: Safety behavior, P0

- Surface worker proximity, vehicle proximity, crossing occupancy, route blockage, emergency stop, drill stop, and manual stop as explicit reasons.
- Use predictable priority and resume rules.
- Add blue spot or equivalent approach projection, beacon, horn, backup alarm, brake light, and dashboard state where appropriate.
- Stop audio when the vehicle is visually stopped or out of audible range.
- Record safety events once per event.
- Acceptance: automated scenarios prove every stop reason, no safety thrash, and no false wheel or light state.

#### FL-07: Job and SCADA integration, P1

- Create jobs from production and truck logistics.
- Show source, destination, payload, priority, status, and ETA.
- Publish position, speed, state, battery, load, job, and stop reason as simulation telemetry.
- Let scene selection focus the matching SCADA asset and vice versa.
- Keep human override and emergency controls clearly separated.

#### FL-08: Visual polish, P1

- Add a driver or clear autonomous identity, consistent with product intent.
- Add believable paint, rubber, glass, working lights, forks, mast, hydraulic detail, decals, wear, and contact shadow.
- Limit emissive intensity.
- Add subtle body pitch under acceleration and braking, plus roll under turning.
- Add nearby floor dust or tyre marks only where budget permits.

#### FL-09: Debug visibility, P1

- Honor the route and zone visibility control.
- Hide paths, swept envelopes, steering guides, colliders, and sensors outside debug or safety analysis modes.
- Make debug overlays depth-stable and color-accessible.

## 9. Truck and yard refinement

### 9.1 Truck logistics state machine

```text
SCHEDULED
  -> SPAWNED_BEHIND_PORTAL
  -> GATE_APPROACH
  -> CHECK_IN
  -> WEIGH_IN
  -> QUEUED
  -> BAY_ASSIGNED
  -> APPROACH
  -> SETUP_FOR_REVERSE
  -> REVERSING
  -> FINAL_ALIGNMENT
  -> PARK_BRAKE
  -> CHOCKED
  -> DOCK_LOCKED
  -> LEVELER_DEPLOYED
  -> DOOR_OPEN
  -> LOADING_OR_UNLOADING
  -> SERVICE_COMPLETE
  -> DOOR_CLOSED
  -> LEVELER_STOWED
  -> UNLOCKED
  -> UNCHOCKED
  -> PULL_OUT
  -> WEIGH_OUT
  -> CHECK_OUT
  -> DEPART
  -> DESPAWN_BEHIND_PORTAL

Any yard movement -> YARD_STOP or EMERGENCY_STOP
```

### 9.2 Truck work packages

#### TRK-01: Replace the perpetual clock loop with a schedule-owned controller, P0

- Keep deterministic accelerated demo time as an option.
- Let arrival, queue, bay service, forklift completion, alarms, and departure events own transitions.
- Add timeouts and failure states.
- Persist state through camera and quality changes.
- Acceptance: the truck never teleports on cycle wrap and its schedule agrees with UI and SCADA.

#### TRK-02: Build route splines and articulated kinematics, P0

- Parameterize tractor movement by arc length.
- Compute tractor heading from the path tangent.
- Compute trailer articulation around the fifth wheel with length and steering constraints.
- Use a reverse controller that converges toward the dock centreline.
- Add final lateral and longitudinal tolerance.
- Acceptance: tractor and trailer remain connected, wheels follow credible arcs, and the trailer reaches the dock within the tolerance box.

#### TRK-03: Correct wheels, steering, lights, and suspension, P0

- Derive wheel rotation from distance and radius.
- Apply front steering from curvature.
- Add subtle cab pitch and roll from acceleration and steering.
- Drive brake, reverse, marker, hazard, and indicator lights from state.
- Keep lights visible without uncontrolled bloom.
- Acceptance: light and wheel states match a recorded state timeline exactly.

#### TRK-04: Animate the complete dock interface, P0

- Chocks move into place.
- Dock lock engages.
- Traffic light changes.
- Leveller deploys.
- Shelter compresses where visually appropriate.
- Trailer doors open only when safe.
- Pallets or grain transfer progress through an explicit service state.
- Equipment returns in reverse order before departure.
- Acceptance: unsafe state combinations are impossible in tests.

#### TRK-05: Link truck service to material flow, P1

- Receiving changes inbound inventory and silo availability.
- Shipping consumes packed inventory.
- Forklift jobs or bulk transfer state determine service progress.
- UI and SCADA show manifest, bay, payload, state, remaining work, and exceptions.
- Acceptance: material cannot appear or disappear without a corresponding logistics event.

#### TRK-06: Rebuild the truck asset hierarchy, P1

- Separate rigged tractor, trailer, wheels, fifth wheel, doors, landing gear, lights, and cargo.
- Create coherent LODs.
- Reduce the current procedural material and mesh explosion.
- Keep static yard detail instanced outside the vehicle rig.
- Acceptance: the hero truck is more detailed at close range while the full yard uses fewer draw calls.

#### TRK-07: Split TruckBay by spatial and functional ownership, P0

Recommended modules:

```text
truckBay
├── layout and routes
├── shipping dock cell
├── receiving dock cell
├── shared static yard instances
├── truck rig
├── truck controller
├── dock equipment
├── yard workers
├── audio
└── debug overlays
```

Split only where it enables culling, instancing, testing, or ownership. Avoid a cosmetic file shuffle.

#### TRK-08: Yard safety and readability, P1

- Paint lane centres, stop bars, exclusion zones, pedestrian paths, bay numbers, and speed limits from site-layout data.
- Add queue logic and no-go sweep envelopes.
- Let workers yield at marked crossings.
- Use signage and lighting that remain readable at night and in rain.
- Keep debug path lines hidden in normal mode.

#### TRK-09: Truck audio, P1

- Engine pitch and load follow throttle and speed.
- Air brake, reverse alarm, indicators, doors, dock lock, leveller, coupling, horn, tyre scrub, and yard ambience fire from state transitions.
- Use spatial attenuation and occlusion.
- Prevent duplicate or orphaned loops across remounts.

## 10. Machine, conveyor, worker, and ambient animation

### ANIM-01: One motion contract, P0

Every animated system receives:

- simulation time;
- render time;
- time scale;
- pause state;
- quality tier;
- visibility and distance tier;
- reduced-motion preference;
- seeded randomness;
- semantic state.

Animation remains frame-rate independent and deterministic under replay.

### ANIM-02: Machine animation communicates process state, P1

- Silos: fill indication, valves, augers, dust extraction, and intake state.
- Roller mills: guarded roller motion, feed gates, vibration, bearing state, and product throughput.
- Plansifters: credible small-amplitude oscillation on visible hangers, with phase and speed tied to operation.
- Packers: bag forming, fill, seal, discharge, counting, and pallet staging.
- Spouting: grain flow appears only through active paths and follows production rate.
- Breakdown state changes motion, sound, status light, and telemetry consistently.
- Acceptance: a viewer can infer operating, idle, starved, blocked, faulted, and maintenance states from motion without opening a panel.

### ANIM-03: Conveyor polish, P1

- Tie belt texture or slat motion to exact belt speed.
- Move items in belt space and preserve spacing through curves and transfers.
- Stop downstream items safely when blocked.
- Add roller rotation only near the camera.
- Use instanced packages and pooled transforms.
- Ensure all route and floor markings use the depth policy.

### ANIM-04: Worker animation, P1

- Blend idle, walk, run, inspect, operate, carry, converse, react, evade, and evacuate states.
- Correct foot sliding through distance-matched walk speed.
- Add head and torso attention toward tasks, hazards, and nearby people.
- Keep facial or micro animation limited to close LOD.
- Make emergency behavior visibly distinct and free of humor.
- Preserve current individual uniforms and identities.

### ANIM-05: Ambient motion, P1

- Centralize fans, vents, gauges, clocks, doors, vegetation, flags, birds, insects, dust, steam, water, and weather cadence.
- Reduce distant updates.
- Seed variation.
- Avoid identical phase across repeated objects.
- Remove motion whose only effect is noise or recurring GPU cost.

### ANIM-06: Time controls, P1

- Pause must pause simulation motion and stateful audio.
- Camera and interface may remain responsive.
- Slow motion must preserve physics and state transitions.
- Fast time may simplify or aggregate animation while preserving material-flow totals.
- Record and replay key logistics sequences for regression testing.

## 11. 3D model and material beautification

### 11.1 Asset tiers

| Tier | Examples | Treatment |
|---|---|---|
| Hero | Forklift, active truck, selected roller mill, selected worker | Best silhouette, rig, materials, labels, local animation, LOD0 |
| Operational | Silos, conveyors, packers, plansifters, dock equipment | Strong silhouette, shared materials, functional animation, LOD1 |
| Context | Buildings, farm structures, offices, roads, water edges | Cell-merged or instanced, controlled variation, LOD1 to LOD2 |
| Dressing | Pallets, bins, lamps, benches, bollards, vegetation, clutter | Instanced, atlas materials, distance culled |
| Horizon | City, mountains, distant water, far terrain | Low-cost silhouette and atmospheric depth |

### 11.2 Asset pipeline

#### ART-01: Add an asset manifest and validator, P0

For each asset record:

- source and licence;
- approved use;
- dimensions and world scale;
- origin and forward axis;
- node and animation names;
- bounds;
- LOD variants;
- triangle and vertex counts;
- material count;
- texture count, dimensions, color space, and estimated GPU memory;
- required extensions;
- compression;
- missing external resources;
- shadow proxy;
- collision proxy;
- hash.

The build fails for:

- missing texture or buffer;
- non-finite transform;
- absurd bounds;
- unsupported required extension;
- external network dependency;
- texture or material budget overrun without waiver;
- absent required rig nodes;
- unstable naming.

#### ART-02: Establish geometry standards, P1

- Bevel major manufactured edges.
- Keep cylinders round enough at close range and aggressively simplify at distance.
- Remove hidden faces and internal geometry.
- Use weighted normals where they improve stylized hard-surface shading.
- Place pivots at physical joints.
- Apply transforms before export.
- Preserve mirrored UV and normal correctness.

#### ART-03: Establish the material library, P1

Create shared calibrated presets for:

- painted steel;
- galvanized metal;
- brushed stainless steel;
- dark structural steel;
- safety-painted metal;
- rubber;
- clear and dirty glass;
- concrete;
- asphalt;
- brick;
- timber;
- plastic;
- grain;
- flour dust;
- soil;
- vegetation;
- still water;
- flowing water.

Each preset defines color range, metalness, roughness, normal strength, AO use, weathering limits, environment intensity, and LOD fallback.

#### ART-04: Build atlas families, P0

- Vehicle atlas.
- Machine atlas.
- Factory architecture atlas.
- Yard and road atlas.
- Village and farm atlas.
- Sign and decal atlas.
- Worker accessory atlas.

Use KTX2 where supported and provide a tested fallback.

#### ART-05: Hero machine passes, P1

For each equipment family:

1. Correct scale and footprint.
2. Improve silhouette.
3. Add functional articulation.
4. Add guarded mechanical detail.
5. Add access, maintenance, and safety features.
6. Add labels and status points.
7. Apply restrained wear.
8. Create LODs, collision, and shadow proxies.
9. Validate against process animation and SCADA selection.

#### ART-06: Exterior architecture pass, P1

- Give the factory a coherent roof, cladding rhythm, glazing, foundations, gutters, vents, doors, loading interfaces, and service access.
- Align every visible opening with interior geometry.
- Add weathering according to runoff, traffic, and exposure.
- Keep the facade readable at overview distance.

#### ART-07: Landscape and prop curation, P1

- Remove redundant props that dilute the site story.
- Reuse a small set of strong prop families.
- Vary scale, orientation, color, and wear within controlled bounds.
- Keep hero sight lines clear.
- Place details where workers or operations explain them.

## 12. Depth, z-fighting, transparency, and shadow stability

### DEPTH-01: Turn the candidate list into a finite registry, P0

- Improve the detector so it distinguishes floor planes, decals, thin geometry, object-local detail, and harmless small Y values.
- Enumerate all confirmed overlapping surfaces with object IDs and ownership.
- Classify each as ground layer, decal, transparent overlay, coplanar duplicate, water edge, wall label, shadow artifact, or camera-depth problem.
- Store the intended repair and validation camera.
- Acceptance: every confirmed item has a test or visual checkpoint and no raw candidate is silently treated as a defect.

### DEPTH-02: Use one layer policy, P0

- Reuse and extend `renderLayers.ts` and `depthMaterials.ts`.
- Replace raw offset values with named presets.
- Use the same exterior ground Y for solid base surfaces where possible.
- Use polygon offset for ordered solid layers.
- Use named higher datums for genuine physical separation.
- Use decals for labels and markings.
- Set `depthWrite: false` on translucent overlays that should not occlude later transparency.
- Keep `depthTest` enabled unless an overlay is deliberately screen-like.
- Use render order only for transparent ordering, with documented ranges.

### DEPTH-03: Repair the camera depth range, P0

- Keep the near plane at or above 0.5 in normal orbit mode.
- Reduce the far plane for local views where the horizon can render as a camera-centred depthless system.
- Use a dedicated first-person depth profile if required.
- Keep logarithmic depth as a measured fallback for extreme views, never as the first repair.
- Acceptance: close machinery, distant terrain, and high-angle ground pass the matrix with logarithmic depth off.

### DEPTH-04: Separate shadow artifacts from geometry artifacts, P0

- Maintain one primary shadow-casting sun or directional light.
- Tighten shadow bounds around the active cell.
- Use stable bias and normal bias from central constants.
- Avoid multiple large contact-shadow systems.
- Use baked AO and blob shadows for distant or repeated assets.
- Acceptance: shadow acne, peter-panning, and temporal crawl are absent in motion.

### DEPTH-05: Transparent surface discipline, P0

- Audit glass, water, smoke, dust, weather, heat maps, labels, mood auras, and selection overlays.
- Avoid intersecting transparent boxes and back-face volumes.
- Use alpha test for cutout foliage.
- Sort or separate transparent layers by cell.
- Cap overdraw and disable far transparent effects.

### DEPTH-06: Visual depth matrix, P0

Inspect each of these while moving the camera for at least 60 seconds:

- interior floor and markings;
- conveyor and crossing markings;
- front and rear dock plates, guides, and bays;
- exterior grass, asphalt, roads, parking, and paths;
- river, canal, lake, pond, banks, bridges, and floating objects;
- roofs, signs, windows, wall decals, and machine labels;
- selection rings, heat maps, blueprint overlays, fire exits, and multiplayer locks;
- dawn, noon, dusk, and night;
- clear, rain, and storm;
- low, medium, and high quality.

## 13. Lighting, exposure, shadows, and post-processing

### LIGHT-01: Calibrate the energy model, P0

- Choose one renderer tone-mapping contract.
- Calibrate sun, sky, environment map, interior fill, local lights, emissive surfaces, and exposure together.
- Remove compensating values that arose from earlier overexposure or darkness.
- Limit emissive material values before bloom.
- Use neutral test spheres and a material chart in a hidden debug scene.
- Acceptance: white painted metal retains detail, dark steel is readable, and warning lights glow without washing adjacent surfaces.

### LIGHT-02: Blend exterior and interior lighting, P0

- Use portal-aware daylight and interior fill.
- Prevent full exterior sunlight from flattening the interior.
- Keep the dock threshold visually continuous.
- Adjust environment reflections and fog by location with smooth transition volumes.
- Avoid an abrupt environment-map swap.

### LIGHT-03: Shadow budget, P0

- One main dynamic shadow source.
- Camera-relative shadow frustum.
- High-detail shadows only near the camera and selected hero action.
- Shadow proxies for vehicles and complex machines.
- Lower tiers use reduced resolution, range, update rate, or baked contact.
- Acceptance: shadows add form within the GPU budget and remain stable during vehicle movement.

### LIGHT-04: Post-processing contract, P0

- Medium receives restrained SSAO only if the measured cost fits.
- Bloom responds only to intentionally emissive materials.
- Vignette remains subtle or moves to capture mode.
- Depth of field remains off during normal operation.
- Chromatic aberration and film grain remain disabled.
- Effects share resolution and do not recreate composers on ordinary setting changes.
- Acceptance: toggling each effect has a recorded cost and no exposure, flicker, or color-space discontinuity.

## 14. Skybox, horizon, weather, and atmosphere

### SKY-01: Consolidate the atmosphere clock, P0

- Keep one sky-animation manager.
- Update sun, moon, stars, clouds, horizon, fog, ambient light, water reflection colors, and exterior lights from one sampled atmosphere state.
- Use smooth transitions and seeded weather.
- Reduce independent registries where they do not provide isolation value.
- Acceptance: time acceleration, pause, tab visibility, and quality changes never freeze or double-update the sky.

### SKY-02: Rebuild the sky gradient and celestial paths, P1

- Use solar elevation to drive zenith, horizon, ground bounce, sun color, intensity, and fog.
- Keep sunrise and sunset color concentrated around the sun direction.
- Give the moon a coherent phase and light contribution if retained.
- Fade stars by sky luminance rather than a binary hour threshold.
- Ensure sun and moon do not intersect the horizon geometry incorrectly.

### SKY-03: Improve clouds and weather transitions, P1

- Use two or three low-cost cloud layers with different scale and advection.
- Change density, softness, color, speed, and coverage from weather state.
- Crossfade weather over a controlled duration.
- Use storm darkness, rain, wetness, wind, and audio as one event.
- Keep cloud and particle work quality-scaled.

### SKY-04: Recompose the horizon ring, P0

- Replace the hard city band with layered silhouettes, gaps, varied heights, warm windows, fog, and terrain overlap.
- Give mountains large simple forms with atmospheric fade, snow only where the visual style supports it, and no noisy sawtooth profile.
- Use aerial perspective to separate near terrain, middle landscape, distant city, mountains, and sky.
- Cull horizon sectors outside the view where safe.
- Remove unconditional `frustumCulled={false}` unless a measured seam requires it.
- Acceptance: the horizon has no seam, black strip, or obvious repeating profile from every preset.

### SKY-05: Fog and aerial perspective, P0

- Drive fog color from the horizon color.
- Use local industrial haze sparingly and without overlapping transparent boxes.
- Increase atmospheric depth in rain and at night.
- Preserve operational readability.
- Acceptance: distant forms soften smoothly while nearby equipment remains clear.

### SKY-06: Weather-world integration, P1

- Rain darkens and raises roughness on exposed surfaces through a shared wetness value.
- Puddles and water ripples respond locally.
- Interior surfaces remain dry except through open portals.
- Wind affects vegetation, rain direction, flags, steam, and audio coherently.
- Lightning drives sky, world light, audio delay, and optional power events through one state.

## 15. Water, terrain, and landscape shaders

### WATER-01: Create one water material family, P0

Share:

- time and weather;
- view direction and Fresnel;
- dual scrolling normal fields;
- depth color;
- reflection color;
- roughness;
- flow direction and speed;
- shoreline fade;
- foam and wake inputs;
- quality tier;
- fog, tone mapping, and color-space output.

Presets:

- still canal;
- slow river;
- lake;
- pond;
- distant horizon water.

### WATER-02: Quality-scaled rendering, P0

- Low: opaque or lightly transparent color with one animated normal or vertex ripple.
- Medium: two normal layers, Fresnel, depth tint, shore fade, and limited reflection.
- High: richer normals, local foam, wake masks, and optional planar reflection on one hero water body.
- Ultra: capture-grade reflection and refraction only when measured.
- Avoid scene-wide reflection render targets.

### WATER-03: Integrate banks and levels, P0

- Derive water heights from named site datums.
- Shape banks, canal walls, culverts, bridges, docks, reeds, and shoreline around those levels.
- Remove floating edges and water protrusion through terrain.
- Use one deliberate depth relationship rather than a mix of raw Y offsets and raw polygon offsets.
- Acceptance: high-angle, water-level, and moving views show no seam or z-fighting.

### WATER-04: Water interaction, P1

- Trucks, forklifts, workers, rain, fish, boats, or wildlife create ripples only if they actually contact or influence water.
- Pool and reuse ripple instances.
- Add local wakes at high quality only.
- Keep gameplay collision independent from visual displacement.

### TERRAIN-01: Terrain continuity, P0

- Align terrain channels to actual river and canal geometry.
- Blend factory foundations, yards, roads, paths, farm fields, village lots, and water banks.
- Use splat or vertex data rather than stacked coplanar planes where possible.
- Keep far terrain low frequency and atmospherically integrated.

### TERRAIN-02: Ground material calibration, P1

- Concrete and asphalt retain scale cues without visible tiling.
- Grass, soil, mud, gravel, and paths use controlled macro variation.
- Wetness changes roughness and color consistently.
- Road markings and wear follow traffic.
- Eliminate procedural noise whose scale disagrees with world metres.

## 16. Shader architecture

### SHD-01: Define an active shader contract, P0

Every custom shader must declare:

- coordinate spaces;
- color-space assumptions;
- tone-mapping path;
- fog path;
- transparency and depth behavior;
- quality variants;
- uniform ownership;
- time source;
- cache key;
- disposal ownership;
- fallback material.

### SHD-02: Audit active custom shaders, P0

Audit sky, horizon, water, terrain, machine effects, status rings, worker auras, relationship lines, data-flow lines, blueprint effects, village edge feathering, and generative materials.

Check:

- stable program cache keys;
- no material creation in render or frame loops;
- no per-frame uniform object replacement;
- no divergent shader variants from arbitrary strings;
- normal correctness after vertex displacement;
- fog and tone mapping;
- finite uniforms;
- alpha and depth correctness;
- derivative and precision compatibility;
- cleanup and context restoration.

### SHD-03: Resolve the unused shader library, P1

- Identify which exports in `src/shaders` serve the current visual direction.
- Integrate only those that improve a named surface within budget.
- Remove unused factories and examples after confirming no roadmap dependency.
- Avoid adding shader effects simply to consume existing code.

### SHD-04: Build shader debug tools, P1

- Toggle normals, roughness, metalness, UVs, overdraw, depth, shadow cascades, and LOD.
- Show active program count and material owner.
- Freeze time and weather.
- Capture uniform state with the benchmark.

### SHD-05: Control compilation and variants, P0

- Enumerate the minimal shader set needed for first useful scene.
- Compile that set during a bounded loading stage.
- Compile distant and optional variants during idle time or immediately before their cell becomes visible.
- Reuse defines and materials so arbitrary values do not create new programs.
- Record compile duration and unexpected program creation in the benchmark.
- Acceptance: entering a new cell or triggering a vehicle effect produces no visible shader-compilation hitch.

## 17. Interface and interaction refinement

### 17.1 Normal desktop composition

```text
┌──────────────────────────────────────────────────────────────────┐
│ Mill identity     shift and throughput       alerts and safety   │
│                                                                  │
│                                                                  │
│                         3D WORLD                                 │
│                                                                  │
│                         contextual marker                        │
│                                                                  │
│                                        optional context panel    │
│                                                                  │
│                   compact mode dock                              │
└──────────────────────────────────────────────────────────────────┘
```

Persistent chrome should occupy less than 15 percent of the viewport. An open context panel may occupy up to 30 percent on a 1,280-pixel-wide desktop. The scene remains the primary surface.

### UI-01: Default to a clear scene, P0

- Start with a compact operations summary rather than a full-height open sidebar.
- Move FPS and technical diagnostics into debug or settings.
- Keep throughput, target, critical alarms, shift, time, and safety visible.
- Open the context panel on selection or explicit mode choice.
- Remember user panel preference after onboarding.

### UI-02: Make the dock compact and purposeful, P1

- Prioritize Overview, Production, SCADA, Workforce, Safety, AI Partner, and Settings.
- Group secondary features behind an overflow or workspace launcher.
- Keep icon size and labels stable.
- Replace exaggerated hover scaling with restrained feedback.
- Support keyboard shortcuts, focus rings, tooltips, and touch targets.

### UI-03: Unify panels, P0

- Use one panel shell, header, tab system, status language, spacing scale, empty state, loading state, error state, and close behavior.
- Give inspector, production, workforce, safety, AI, settings, and SCADA purposeful widths.
- Avoid nested scroll traps.
- Keep escape behavior predictable.
- Acceptance: rapid mode changes produce one panel, one focus owner, and no stacked modal.

### UI-04: Repair onboarding, P0

- Merge welcome and intro into one optional three-step tour.
- Provide Back, Next, Skip tour, and a true Close.
- Show progress.
- Never stack onboarding with AI reflection, PA toast, alert, or permission prompt.
- Let the user replay the tour from Help.
- Use anchored coach marks for controls and non-modal narration for context.

### UI-05: Notifications and interruption policy, P0

Priority:

1. Emergency and critical alarm.
2. Safety warning.
3. Production exception.
4. Task completion.
5. Educational narration.
6. Ambient character and humor.

Rules:

- Higher priority suppresses or queues lower priority.
- Only emergency content can interrupt the centre of the scene.
- Everything has a rate limit, coalescing key, and expiry.
- The user can pause, mute, dismiss, or review history.
- A toast never covers a primary control or selected object.

### UI-06: Selection and world linking, P1

- Hover gives a lightweight outline and name.
- Selection gives a stronger outline, contextual marker, and inspector.
- The panel can focus, isolate, follow, or clear the object.
- SCADA asset selection, alarm source, and trend tag can focus the matching world object.
- The world object exposes status without a large floating label at all times.

### UI-07: Motion and reduced motion, P1

- Apply the common motion tokens.
- Keep panel motion on transform and opacity.
- Remove bounce.
- Pause decorative world motion under reduced motion while retaining process state.
- Avoid backdrop blur on low-power devices or when it measurably hurts frame time.

### UI-08: Contrast and anti-slop triage, P0

- Fix active gray-on-color contrast findings.
- Review purple and violet gradients against the selected palette.
- Retain side accents only where they encode status and pair them with icon and label.
- Keep typing dots or meaning-bearing motion if their cadence remains subtle.
- Exclude archived source from the active lint surface.
- Re-run `npx impeccable detect src` and record each retained exception.

### UI-09: Responsive behavior, P1

- Desktop: context panel.
- Tablet: resizable or modal sheet.
- Mobile landscape: compact HUD and bottom sheet.
- Mobile portrait: clear rotate guidance or a complete portrait control mode.
- Respect safe areas, touch targets of at least 44 CSS pixels, zoom, and text scaling.

### UI-10: Failure and offline states, P1

- Show WebGL, asset, SCADA, AI, multiplayer, audio, and storage failures in the surface that owns them.
- Offer useful retry, reduced mode, or offline behavior.
- Keep the 3D scene available if an optional panel fails.
- Never disguise a stalled resource as indefinite progress.

## 18. SCADA refinement

### 18.1 Information architecture

Provide two surfaces:

1. Compact SCADA summary in the context panel.
2. Full SCADA workspace as a large drawer, overlay workspace, or dedicated route that is reachable from the compact summary.

Recommended full workspace:

```text
SCADA
├── Process overview
├── Alarms
├── Trends
├── Assets and tags
├── Events
├── Simulation lab
└── Connections and settings
```

### SCADA-01: Compact summary, P0

Show:

- mode: simulated, replay, or live;
- connection health;
- data age;
- active critical and high alarms;
- top process constraint;
- five task-relevant tags;
- current selected asset;
- button to open the full workspace.

Avoid rendering the raw tag tree as the primary first view.

### SCADA-02: Process mimic, P0

- Visualize grain flow from silos through mills and sifters to packers and docks.
- Show flow, availability, state, quality, and bottleneck.
- Let each node select the 3D asset.
- Let the current 3D selection highlight the mimic node.
- Represent missing, stale, uncertain, and bad-quality data explicitly.

### SCADA-03: Alarm workspace, P0

Support the simulator’s stated ISA-18.2-informed behavior:

- priority;
- active and unacknowledged;
- active and acknowledged;
- returned to normal and unacknowledged;
- shelved;
- suppressed;
- out of service;
- source, condition, limit, value, unit, first occurrence, last occurrence, count, and quality;
- acknowledgement with operator and optional note in simulated mode;
- timeline and first-out context;
- alarm flood indicator;
- filters, search, sorting, and saved views.

Use “ISA-18.2 compliant” in product writing only after a formal requirements and behavior audit proves the claim.

### SCADA-04: Trends, P0

- Make Trends reachable.
- Support up to six clearly differentiated tags.
- Show unit, axis, quality, and sample cadence.
- Add cursor, zoom, pan, pause, reset, and selected time range.
- Preserve gaps rather than interpolating bad data silently.
- Downsample long ranges outside the React render path.
- Provide an accessible table and CSV export.

### SCADA-05: Asset and tag browser, P1

- Hierarchy: site, area, line, asset, tag.
- Search by name, description, unit, source, and state.
- Show current value, timestamp, quality, alarm state, history shortcut, and world focus.
- Virtualize long lists.
- Avoid truncating the meaningful asset set without a visible “show all” route.

### SCADA-06: Events and audit trail, P1

- Separate alarms from events.
- Record mode change, connection change, acknowledgement, setpoint change, fault injection, simulation reset, data gap, and user action.
- Make simulated events visibly simulated.
- Export with timestamp and active build identifier.

### SCADA-07: Simulation lab separation, P0

- Move fault injection away from normal operator monitoring.
- Label it Simulation Lab.
- Require an explicit armed state.
- Show affected assets and automatic reset behavior.
- Prevent any simulated control from resembling a live write when a real connection is active.
- Keep live writes disabled by default and permission-gated.

### SCADA-08: Connection clarity, P0

- Show protocol, endpoint class, connected state, last sample, latency, reconnect state, and data quality.
- Use state labels such as “Telemetry on” with action labels such as “Turn telemetry off.”
- Never show “LIVE” for locally simulated data.
- Distinguish OPC UA, Modbus, MQTT, WebSocket, REST, replay, and simulation.
- Keep credentials out of logs, exports, browser storage, and screenshots.

### SCADA-09: Performance isolation, P0

- Batch telemetry updates.
- Limit visible numeric refresh to a human-readable cadence.
- Keep historian sampling separate from component rendering.
- Use selectors and external-store snapshots with stable references.
- Virtualize tag lists.
- Move downsampling and large transforms to a Worker.
- Lazy-load chart and protocol configuration code.
- Acceptance: enabling SCADA without its workspace open changes 3D p95 frame time by less than 1 ms; an open six-tag trend stays within its UI budget.

### SCADA-10: Accessibility, P0

- Encode state with text, shape, icon, and color.
- Provide keyboard navigation and focus management.
- Let users pause live updates.
- Avoid announcing every telemetry tick.
- Provide data tables for charts and mimic details.
- Meet contrast in all alarm states.

## 19. Writing, terminology, onboarding, and narrative

### 19.1 Voice matrix

| Surface | Voice | Rule |
|---|---|---|
| Emergency | Direct, imperative, calm | No joke, metaphor, lore, or ambiguity |
| Alarm | Precise, diagnostic, actionable | State condition, consequence, and next action |
| SCADA | Industrial and literal | Units, quality, timestamp, mode, and source are explicit |
| Production | Concise and managerial | Explain target, variance, constraint, and recommendation |
| AI partner | Warm, reflective, accountable | Offer reasoning and uncertainty without blocking work |
| Onboarding | Welcoming and concrete | One concept and one action per step |
| Worker dialogue | Human and situated | Reflect role, context, and current work |
| PA operations | Brief and audible | Safety and logistics first |
| PA flavor | Dry, optional, rare | Never overlaps emergencies or weakens trust |
| Educational content | Clear and invitational | Define terms, offer depth, avoid lecturing |

### COPY-01: Canonical terminology, P0

- Choose one product name for the bilateral-autonomy subsystem. Recommendation: “Bilateral Autonomy System” in full and “BAS” after first use.
- Use “AI partner” for the in-product relationship where that is the intended role.
- Use Becoming Minds when referring to the class.
- Standardize machine, zone, dock, shift, alarm, job, worker role, and unit names.
- Generate a glossary consumed by UI copy tests and documentation.

### COPY-02: Operational copy pass, P0

- Every alert states what happened, where, severity, impact, timestamp, and available action.
- Buttons state the action they perform.
- Toggles state current state and accessible action separately.
- Empty states explain whether there is no data, no event, no connection, or a filter hiding results.
- Errors include recovery.
- Avoid unexplained acronyms on first encounter.

### COPY-03: PA corpus curation, P0

- Tag each announcement by priority, context, tone, audience, cooldown, and prohibited states.
- Create separate operational, safety, logistics, worker, and flavor channels.
- Default to Focused Operations mode with sparse flavor.
- Offer Characterful Simulation mode for the full comic corpus.
- Suppress humor during alarms, drills, incidents, onboarding, focused SCADA work, and user input.
- Remove duplicated, self-referential, or trust-eroding lines.
- Keep a searchable transcript and mute controls.

### COPY-04: AI narration policy, P0

- Use one narration queue.
- Display reflective content as an inline card or quiet side notification after onboarding.
- Let the user defer, dismiss, mute, or explore deeper.
- Never open a blocking modal during vehicle control, alarm response, or SCADA interaction.
- State uncertainty when the AI partner is inferring.
- Avoid fabricated authority or claims about real factory control.

### COPY-05: Product claims audit, P0

Verify before retaining claims such as:

- industrial grade;
- ISA-18.2 compliant;
- real PLC connection;
- complete digital twin;
- autonomous;
- intelligent;
- real time;
- secure;
- production ready.

Use precise simulator language where formal verification is absent.

### COPY-06: Documentation and in-world agreement, P1

- README counts match the world, stores, SCADA tags, and tests.
- Keyboard shortcuts match active code.
- Version labels match deployed routes.
- Screenshots show the current UI.
- In-world signs match UI and SCADA names.
- Cite the author’s ongoing work in prose rather than inventing formal publication labels.

## 20. Audio refinement

### AUDIO-01: Audio hierarchy, P1

Priority:

1. Emergency and critical alarms.
2. Nearby vehicle warning.
3. User action confirmation.
4. Operational machine and logistics state.
5. Speech and narration.
6. Ambient world.
7. Flavor.

Higher-priority audio ducks lower-priority channels rather than creating a louder wall.

### AUDIO-02: Spatial world bed, P1

- Zone-specific machinery hum and material flow.
- Exterior wind, distant traffic, birds, village, farm, and water.
- Portal-aware transition between interior and exterior.
- Distance, cone, occlusion, and reverb appropriate to source.
- Quality-scaled active source count.

### AUDIO-03: State-linked vehicles, P1

- Forklift motor, acceleration, braking, steering scrub, hydraulics, beacon, horn, and reverse warning.
- Truck idle, load, gear, engine braking, air brake, reverse warning, indicators, dock equipment, doors, and horn.
- Each loop has one owner, a deterministic start and stop, and cleanup.

### AUDIO-04: Speech and captions, P1

- PA, AI narration, and worker dialogue have captions or transcripts.
- Speech obeys mute, reduced interruption, and user-selected verbosity.
- Repeated speech respects cooldown and cancellation.
- Emergency speech remains intelligible over all other channels.

### AUDIO-05: Audio performance, P1

- Pool short sources.
- Stop inaudible sources.
- Avoid decoding the entire music and effects library at startup.
- Lazy-load long audio.
- Measure active nodes, decode time, memory, and main-thread cost.

## 21. Simulation, AI partner, safety, multiplayer, and persistence

Visual polish will fail if the world, interface, and telemetry tell different stories. These packages make the refined surfaces operationally coherent.

### SIM-01: Conserve material flow, P0

- Define grain and product inventories at intake, silo, milling, sifting, packing, staging, receiving, and shipping boundaries.
- Move quantity through explicit transfers.
- Account for yield, waste, hold, rework, and downtime.
- Make machine animation, conveyor payload, truck manifest, forklift job, production metrics, and SCADA tags derive from the same transfer state.
- Acceptance: property tests prove that material changes equal recorded input, output, waste, and inventory delta within the declared tolerance.

### SIM-02: One time and shift contract, P0

- Keep simulation time, wall-clock display, shift schedule, weather, lighting, logistics, alarms, trends, AI decisions, and audio on one documented time model.
- Define behavior for pause, fast time, hidden tab, restore, and multiplayer.
- Avoid independently derived elapsed-time cycles.
- Acceptance: a recorded scenario replays with the same ordered events and totals.

### SIM-03: Production loop clarity, P1

- Make the primary loop explicit: receive grain, maintain flow, protect quality and safety, meet the shift target, dispatch product, review outcomes.
- Show current constraint, next risk, available action, and effect of speed changes.
- Give targets a meaningful baseline and scenario context.
- Separate sandbox play, guided scenario, and benchmark modes.
- Keep difficulty changes in simulation parameters rather than concealed UI behavior.

### SIM-04: AI decisions have visible provenance and consequence, P0

- Every AI recommendation identifies observations, assumptions, confidence, alternatives, affected people and equipment, expected effect, and actual outcome.
- Let the user inspect which simulation and SCADA values informed it.
- Record accept, modify, reject, defer, and automatic action.
- Apply accepted actions through the same command path as human actions.
- Prevent narrative-only recommendations from claiming effects that the simulation never applies.
- Acceptance: each decision can be traced from input snapshot through action to measured result.

### SIM-05: Refine the Bilateral Autonomy System experience, P1

- Present pace, information, decisions, action, and boundaries as understandable operating choices.
- Show how each setting changes AI and human responsibility.
- Make worker consent, dissent, override, and escalation visible.
- Keep explanatory content available on demand.
- Use one canonical BAS name and glossary.
- Avoid turning values into decorative scores with no behavioral effect.

### SIM-06: Safety is systemic, P0

- One safety state drives vehicles, workers, machines, alarms, SCADA, UI, audio, and lighting.
- Fire drill, emergency stop, vehicle proximity, machine fault, spill, blocked exit, and severe weather have explicit state machines.
- Keep drills unmistakably simulated.
- Record cause, response, acknowledgement, clearance, and recovery.
- Acceptance: no surface continues normal animation, humor, or control during a state that requires a stop.

### SIM-07: Multiplayer authority and interpolation, P0 if promoted

- Establish a verified peer-to-player identity map and host-authoritative acceptance before presenting multiplayer as an open or secure feature.
- Validate position, selection, machine command, vote, chat, and lock messages.
- Interpolate remote movement with bounded extrapolation.
- Show connection quality, ownership, and conflict clearly.
- Preserve vehicle, SCADA, alarm, and production authority on the host or agreed simulation owner.
- Offer a clearly labelled trusted-friends experimental mode until this contract is verified.
- Acceptance: spoof, stale update, conflicting command, host migration, and reconnect scenarios have deterministic tests.

### SIM-08: Persistence and migration, P0

- Version persisted settings, onboarding, simulation saves, scenarios, knowledge progress, and graphics preferences.
- Migrate or reset each store deliberately.
- Keep a corrupt-store recovery path.
- Preserve user choices across quality and UI refactors.
- Separate benchmark and demo state from ordinary user state.
- Acceptance: tests load supported old versions, malformed data, and a clean first run without silent loss or crash.

### SIM-09: Replay and diagnostics, P1

- Record seeds, commands, important state transitions, and build identifier.
- Export a bounded diagnostic replay without credentials or personal data.
- Use replay for vehicle, safety, alarm, AI, and visual regression.
- Make replay mode explicit in UI and SCADA.

### SIM-10: Resolve disconnected feature surfaces, P1

- Inventory orphaned feature-shaped components and optimized alternatives.
- Decide per item: active product surface, development tool, future experiment, or removal.
- Recommended product rule: one canonical implementation for each user-facing capability.
- Remove prototype and archive routes from the main delivery path.
- Acceptance: every production-sized component has a documented route, owner, and test, or is absent from the current build.

## 22. Accessibility and inclusive interaction

### A11Y-01: Visual access, P0

- WCAG 2.2 AA contrast for interface text and controls.
- Non-color state encoding.
- Zoom to 200 percent without loss of function in DOM UI.
- Adjustable UI scale.
- Legible captions and data tables.
- High-contrast selection and focus in bright day, dark night, rain, and alarm states.

### A11Y-02: Keyboard and focus, P0

- Every mode and control is keyboard reachable.
- Predictable tab order.
- Visible focus.
- Escape closes the topmost dismissible surface.
- Modals trap and restore focus.
- Scene keyboard controls pause while typing.
- Shortcut help is accurate and searchable.

### A11Y-03: Motion and sensory controls, P0

- Reduced motion.
- Pause ambient animation.
- Disable camera auto-rotate.
- Reduce particles and flashing.
- Audio channel controls.
- Captions and transcript.
- No essential information conveyed solely through vibration, color, sound, or animation.

### A11Y-04: Live data, P0

- Telemetry updates do not flood assistive technology.
- Critical alarms use a controlled assertive announcement.
- Routine changes remain silent or polite.
- Charts and the process mimic expose structured alternatives.

## 23. Verification architecture

### 23.1 Automated gates

Run:

- typecheck;
- lint;
- format check;
- complete test suite;
- production build;
- asset manifest and GLB validation;
- shader contract validation;
- route and placement invariants;
- z-fighting static candidates;
- bundle budget;
- design lint with triaged exceptions;
- deterministic browser smoke;
- benchmark regression comparison.

### 23.2 Vehicle invariants

Forklift:

- finite pose;
- bounded speed, acceleration, yaw rate, and fork velocity;
- distance-correct wheel angle;
- no movement during loading or emergency stop;
- no cargo without confirmed engagement;
- no unsafe resume;
- route stays inside aisle envelope;
- state, lights, audio, UI, and telemetry agree.

Truck:

- finite pose;
- tractor-trailer connection maintained;
- articulation within limit;
- distance-correct wheels;
- bay tolerance met before lock;
- safe dock sequence order;
- no service before secure state;
- no departure before equipment reset;
- no cycle-wrap teleport;
- schedule, world, UI, audio, and telemetry agree.

### 23.3 Visual matrix

Reference cameras:

- site overview;
- interior process overview;
- each production zone;
- front dock;
- rear dock;
- forklift close and medium distance;
- truck approach, reverse, docked, and departure;
- farm, village, water, and horizon;
- first-person eye level.

Conditions:

- dawn, noon, dusk, and night;
- clear, cloudy, rain, and storm;
- low, medium, and high;
- 1,280 by 720, 1,440 by 900, 1,920 by 1,080;
- tablet landscape and agreed mobile viewport.

Use a pairwise matrix for routine regression and the full critical matrix for release acceptance.

Inspect:

- composition;
- scale;
- clipping;
- z-fighting;
- shadow stability;
- exposure;
- color;
- material response;
- LOD;
- portal transition;
- water edge;
- horizon seam;
- UI obstruction;
- text legibility;
- motion continuity.

### 23.4 Runtime scenarios

1. First visit and onboarding.
2. Return visit.
3. Select each machine family.
4. Follow both forklifts through a complete job.
5. Follow both trucks through a complete service.
6. Cross every portal.
7. Orbit every camera preset.
8. Enter and leave first person.
9. Open every interface mode rapidly.
10. Enable SCADA, open each workspace, trend six tags, acknowledge a simulated alarm, inject and clear a simulated fault.
11. Run a fire drill.
12. Change time, weather, speed, and quality.
13. Hide and restore the tab.
14. Lose and restore an optional connection.
15. Use reduced motion, keyboard only, 200 percent zoom, captions, and mute.

### 23.5 Perceptual acceptance

Engineering gates cannot certify beauty, motion feel, composition, or trust. Final acceptance requires current native screenshots and motion capture at actual dialogue and viewport sizes, reviewed for:

- coherent art direction;
- credible scale;
- clear process;
- vehicle weight and intent;
- calm operational hierarchy;
- scene visibility;
- readable SCADA;
- respectful AI presence;
- absence of visual noise.

## 24. Implementation sequence

Each slice should remain independently reviewable, preserve unrelated working-tree changes, and carry its own proof.

| Slice | Scope | Depends on | Required proof |
|---|---|---|---|
| 1 | Fixed benchmark routes, telemetry capture, current reference images | None | Reproducible baseline artifact |
| 2 | Loading diagnostics, staged asset contract, remove broad preload | 1 | Startup timeline and smoke |
| 3 | Stable Canvas and rational quality presets | 1 | No remount, quality screenshots |
| 4 | Mount adaptive quality with hysteresis | 3 | Forced-overload recovery |
| 5 | Asset manifest and GLB validator, repair silo dependency | None | Validator tests and clean manifest |
| 6 | Forklift origin, scale, atlas, rig, and LOD | 5 | GLB report and reference turntable |
| 7 | Canonical site layout, datums, portals, and placement validator | 1 | Plan overlay and invariant tests |
| 8 | Separate simulation state from visual cells | 7 | Off-camera simulation tests |
| 9 | Spatial cells, instancing, material reuse, and static LOD | 8 | Draw-call and frame-time delta |
| 10 | Camera presets, collision, transitions, and prewarm | 7, 9 | Camera runtime suite |
| 11 | Forklift controller, pose, route curves, load sequence, safety | 6, 7 | Complete recorded jobs |
| 12 | Truck schedule controller, articulation, dock sequence, logistics | 7, 9 | Complete recorded services |
| 13 | Machine, conveyor, worker, and ambient animation contract | 9 | State-motion regression set |
| 14 | Depth registry and confirmed z-fighting repair | 7, 9, 10 | Full depth matrix |
| 15 | Material, lighting, exposure, shadow, and post-processing calibration | 6, 9, 14 | Material chart and visual matrix |
| 16 | Sky, horizon, fog, weather, water, and terrain integration | 15 | Time-weather reference set |
| 17 | Default UI hierarchy, onboarding, notifications, responsive motion | 1 | Interaction and accessibility tests |
| 18 | Compact and full SCADA workspace, scene linking, performance isolation | 17 | SCADA functional and performance suite |
| 19 | Simulation conservation, time, safety, AI consequence, and persistence | 7, 11, 12, 18 | Deterministic scenario and property tests |
| 20 | Multiplayer authority and interpolation, if promoted | 19 | Adversarial sync and migration suite |
| 21 | Writing, terminology, PA, narration, audio, captions | 17, 18, 19 | Copy matrix and interruption tests |
| 22 | Complete regression, native performance, perceptual pass, cleanup | All | Master Definition of Done |

## 25. Priority map

### P0, foundation and correctness

- Benchmark and profiling.
- Staged startup and optional chunk loading.
- Stable Canvas and real adaptive quality.
- Site coordinate contract, datums, portals, and placement validator.
- Spatial cells, instancing, material reuse, and LOD.
- Camera collision and preset composition.
- Forklift asset normalization and single pose pipeline.
- Truck schedule and articulated route controller.
- Confirmed depth repairs.
- Exposure, lighting, and post-processing calibration.
- Full reachable SCADA workspace and performance isolation.
- Conserved material flow, one time contract, safety coherence, and AI consequence.
- Versioned persistence and recovery.
- Multiplayer authority before promotion beyond trusted-friends experimental use.
- Onboarding, notification priority, contrast, keyboard, and reduced motion.
- Operational terminology and trust-critical copy.

### P1, major quality

- Hero machine models and animation.
- Vehicle suspension, detailed dock equipment, and audio.
- Exterior recomposition.
- Sky, horizon, weather, water, terrain, and atmosphere.
- Worker and ambient animation.
- UI motion, responsive behavior, scene linking, and richer SCADA analysis.
- Curated PA, narration, educational writing, and spatial audio.

### P2, optional delight after budgets are green

- Wildlife and local water wakes.
- Extra village stories and farm cycles.
- Cinematic cameras.
- Capture-grade reflections and ultra-tier effects.
- Additional vehicle variants.
- Expanded character micro-animation.
- Decorative seasonal content.

P2 work cannot consume a P0 performance, accessibility, depth, or operational-clarity budget.

## 26. Master Definition of Done

The programme is complete only when:

- The current source has one authoritative site and terminology contract.
- The initial route loads only the core experience.
- Every optional subsystem is lazy, bounded, and independently recoverable.
- Medium meets the native frame and resolution targets in every critical scenario.
- Frame pacing has no recurring hitch.
- Inside and outside remain visually and operationally continuous at every portal.
- Cameras preserve composition and never enter solid geometry.
- Forklifts and trucks complete credible, deterministic, safe logistics cycles.
- Machine and material-flow animation agrees with simulation and SCADA.
- Inventory, throughput, yield, waste, manifests, and logistics are conserved and traceable.
- AI recommendations expose their inputs, assumptions, actions, and measured consequences.
- Safety state is consistent across world motion, controls, SCADA, alerts, audio, and writing.
- Persisted state is versioned, migratable, and recoverable.
- Any promoted multiplayer mode has verified host authority and bounded interpolation.
- Hero assets meet scale, rig, LOD, material, texture, and validation budgets.
- Lighting retains detail from night to noon without pumping or washout.
- Sky, horizon, fog, terrain, weather, and water form one atmosphere.
- The confirmed z-fighting registry is empty.
- The normal interface keeps the world visible and never stacks competing interruptions.
- Full SCADA functionality is reachable, performant, mode-clear, and scene-linked.
- Operational writing is precise; character is optional; emergency content is unequivocal.
- Keyboard, focus, contrast, reduced motion, captions, touch, and live-data accessibility pass.
- All deterministic engineering gates are green.
- Current native screenshots and motion evidence pass human perceptual review.
- Remaining limitations and intentionally deferred P2 work are stated plainly.

## 27. Holds and decisions

This document designs the work. It does not authorize implementation, commit, push, deployment, publication, asset licensing, or changes to the existing user-owned working tree.

Recommended decisions:

1. Keep the current 15-machine, four-roller-mill layout as canonical and remove stale six-mill references.
2. Keep medium as the default quality tier and make it the 60 FPS acceptance target.
3. Use deterministic kinematic logistics as the default vehicle architecture; load Rapier only where physical collision adds product value.
4. Preserve the warm, playful world, while grouping it into a legible rural-industrial site.
5. Make Focused Operations the default writing mode; offer the larger humor corpus through Characterful Simulation mode.
6. Use “Bilateral Autonomy System” and “BAS” as the canonical subsystem name.
7. Describe SCADA as simulated and ISA-18.2-informed until formal conformance evidence supports a stronger claim.

## 28. Execution ledger

Nell authorized full source implementation on 2026-07-26. That approval releases the implementation hold and accepts the seven recommended decisions above. Commit, push, deployment, publication, licensing purchases, and destructive replacement of user-owned work remain held unless separately authorized.

### 28.1 Protected starting state

The preflight captured the starting branch, HEAD, status, full working patch, and hashes in:

`/tmp/millos-refinement-preflight-20260726/`

The implementation must preserve unrelated edits already present in the working tree. Existing modified files are integrated by inspecting and retaining their prior hunks, rather than resetting or replacing them.

### 28.2 Verified starting gates

| Gate | Starting result |
|---|---|
| Typecheck | Pass |
| Lint | Pass |
| Format check | Pass |
| Tests | 49 files and 1,269 tests passed |
| Production build | Pass |
| Production runtime | Useful scene appeared after roughly 20 seconds |
| Medium frame sample | About 14.5 FPS in the in-app browser, at effective DPR 0.5 |

The in-app browser timing is a diagnostic baseline. Native Chrome remains the final frame-rate acceptance surface because the embedded browser can add overhead.

### 28.3 Adversarial pre-check

The programme is broad, but the dependency order is sound. Three implementation failure modes require active control:

1. A large unreviewable change could hide regressions. Work therefore lands in dependency-ordered slices with deterministic gates after each coherent surface.
2. Performance could be made green by degrading the image. Benchmarks therefore record quality, effective DPR, renderer counts, and screenshots together.
3. Existing user work could be overwritten. The protected snapshot and hunk-level inspection are required before editing every already-modified file.

### 28.4 Deviations

| Date | Slice | Deviation | Conservative choice and proof |
|---|---|---|---|
| 2026-07-26 | Preflight | No architecture-changing ambiguity survived the pre-check. | Proceed with the documented recommendations; retain all external release and publication holds. |
| 2026-07-27 | Scene architecture | The legacy High and Ultra world duplicated thousands of meshes and materials instead of extending the canonical site. | All quality tiers now render one optimized factory, logistics, and exterior world. High and Ultra add bounded presentation layers. The final Ultra interior contains 569 visible meshes, 361 unique geometries, and 323 unique materials, compared with 2,329 visible meshes before the legacy detail layer was quarantined. |
| 2026-07-27 | Physics | Visual quality previously enabled Rapier and debug geometry as an accidental side effect. | Physics is now an explicit simulation choice. Every visual preset defaults it off, and physics debug geometry additionally requires the performance debug control. Deterministic kinematics remain the authoritative default. |
| 2026-07-27 | Cinematic effects | Default depth of field was barely visible but materially raised Ultra frame time at device pixel ratio 2. | Depth of field remains available as an explicit cinematic option, while High and Ultra operator views default to sharp focus. The final exact-build Ultra matrix improves the original 14.2 FPS and 105.1 ms p95 to 56.5 to 120.3 FPS with a maximum 22.0 ms p95. |
| 2026-07-27 | Water depth | The pond bed used aggressive forward polygon offset and overtook the transparent surface at grazing angles. | Water beds now use a named canonical datum below the shared water surface, without forward polygon offset. The final water capture is continuous and the depth validator passes. |
| 2026-07-27 | Bundled models | Runtime availability checks issued redundant `HEAD` requests for manifest-required assets. | Forklift and worker models are treated as validated bundled assets. Optional model checks are coalesced. Final High and Ultra captures have zero failed requests. |
| 2026-07-27 | Cold startup | The programme required an “agreed throttled profile” but did not define one. | Use a reproducible conservative profile: Chrome Fast 3G, 150 ms latency, 1.6 Mbit/s down, 750 Kbit/s up, native CPU, cache disabled, and service workers blocked. The benchmark harness records this profile and the final cold first frame arrives in 4,943.5 ms, inside the 8,000 ms budget. |
| 2026-07-27 | Asset tooling and dependency security | The legacy optimizer changed runtime files in place, depended on an undeclared transitive CLI, and retained a development chain with known High advisories. | Replace it with an immutable-source, atomic derived-output pipeline using declared glTF Transform core, extension, Draco, and Meshoptimizer dependencies. Upgrade the lint stack to its supported current releases. Source hashes remain unchanged through regeneration, both model contracts pass, and the complete `npm audit` result is zero vulnerabilities. |
| 2026-07-27 | Accessible emergency alerts | Current Playwright role matching exposed that the visible safety banner announced its content but had no authored accessible name. | Give drill and facility-stop banners explicit names, retain the independent screen-reader live alert, and verify both through the complete browser and Axe workflow. |
| 2026-07-27 | Motion evidence | Fixed-camera performance benchmarks deliberately pause the canonical simulation, so the first truck video was static. The initial general interior framing also made forklift movement perceptually indistinguishable. | Add a default-off `motion=on` benchmark evidence mode that advances the canonical clock while preserving the fixed camera, restores the prior clock on exit, exposes sampled vehicle world positions and truck phases, and adds a dedicated forklift camera. Replacement videos and contact sheets visibly move, and telemetry independently proves the routes. Ordinary benchmarks remain paused by default. |
| 2026-07-27 | Vehicle pause contract | Motion telemetry then revealed that forklifts still changed world position while `gameSpeed` was zero because both movement paths watched production speed alone. | Centralize the forklift pause predicate and apply it to deterministic motion, physics motion, cargo fades, and warning-light animation. A current native 10 second probe records exactly zero displacement for both forklifts when paused, then 20.32 and 6.59 units of displacement with explicit motion enabled. |
| 2026-07-27 | Requirement-by-requirement source audit | The broad automated suite did not detect a stale six-mill dependency string in the strategic AI prompt or several active decorative emoji surfaces. | Correct the strategic dependency graph to RM-101 through RM-104, replace decorative pictographs with Lucide or native Three geometry, and keep only the explicitly permitted mill branding and VCL wire glyphs. Targeted AI tests, the active-source scan, TypeScript, lint, format, and the complete suite pass. |
| 2026-07-27 | Optional subsystem recovery | The first implementation made optional systems lazy and supplied loading fallbacks, but a persistent lazy import or component failure could still escape to a broad boundary. | Route all 30 active lazy imports through a two-attempt, 15-second-per-attempt bounded loader. A boundary-scoped recovery generation keeps React Suspense retries within that budget and creates a fresh lazy payload only after an explicit boundary reset. Twenty-three local boundary sites isolate sidebar widgets, Safety and management panels, worker detail, predictive maintenance, HDRI, each optional scene layer, post-processing, physics, and physics forklifts, while preserving the canonical scene as the physics fallback. Recovery-key, local retry, fresh-payload, transient-failure, exhaustion, and timeout tests pass. |
| 2026-07-27 | Benchmark command ergonomics | The benchmark script had no help path and defaulted to bundled headless Chromium even though the programme names native Chrome as the acceptance surface. | Add non-launching `--help` output and make the native Chrome channel the explicit default, while preserving `--channel=` for a portable bundled-Chromium diagnostic. The exact five-scene default acceptance artifact passes at 120 FPS. |
| 2026-07-27 | Forklift perceptual review | Full-resolution motion frames exposed that the operator label inherited vehicle rotation and rendered mirrored on part of the route. | Mount the operator and loading-state text in a camera-facing Three billboard, rebuild, and record a replacement 75.8-second current-source route. The label remains readable across visible orientations, the pallet stays seated on the forks, both forklifts traverse 123.52 and 105.42 sampled units, and the capture has zero console, page, or request failures. |
| 2026-07-27 | Acceptance | Automated visual inspection can reject clear defects, but it cannot stand in for Nell's perceptual judgment of motion and overall feel. | Record the current renders as perceptual candidates. Keep the human motion and visual acceptance gate open, with commit, push, deployment, and publication still held. |
| 2026-07-31 | Authored-world restoration | The reduced optimized exterior and factory shells passed automated performance gates but removed authored landmarks and broke the intended continuous-site composition. Their evidence therefore cannot close acceptance for the restored world. | Treat the complete authored factory, village, stream, farms, garage, maintenance facilities, roads, and logistics yard as canonical. Optimize those objects in place, keep all major areas continuously mounted, rebaseline the full scene, and reject camera-driven inside/outside substitution. |
| 2026-07-31 | Transform integrity | Positioned TruckBay groups with `matrixAutoUpdate={false}` retained identity matrices, collapsing multiple yard and maintenance objects onto the site origin. | Restore declarative transform ownership for every affected group, preserve authored coordinates, and require placement tests plus current visual evidence before accepting any further static batching. |
| 2026-07-31 | Personnel scope | The validated generic Cesium Man asset and procedural three-tier renderer did not provide a single coherent identity, PPE, task-action, and animation contract for the ten named personnel. | Implement one canonical renderer with deterministic named profiles, shared geometry and materials, varied proportions, skin and hair, role-correct PPE and tools, task-driven poses, distance-correct gait, LOD continuity, fire-drill compatibility, stable starts, and dedicated native personnel evidence. |
| 2026-07-31 | Startup and continuous world | Eagerly evaluating the complete restored site exceeded the startup budget, while camera-driven replacement would recreate the inside/outside split that Nell rejected. | Stage the complete authored site once after the first useful core frame, then keep it mounted. Lazy boundaries delay evaluation only; camera cells adjust detail visibility and never substitute a different factory or simulation. The restored-wall build reaches its local first frame in 268.5 to 568.1 ms. The last uncontended Fast 3G proof reaches it in 4,943.5 ms. |
| 2026-07-31 | Static batching and benchmark isolation | Whole-tree candidate discovery caused main-thread stalls, and sequential WebGL pages in one browser context retained renderer and garbage-collection pressure across scenes. | Scan batching candidates incrementally in bounded tasks and use a fresh browser context per fixed scene. Paired SCADA variants deliberately share one context. The exact 15-scene Medium matrix records no long tasks. |
| 2026-07-31 | High and Ultra quality | Ultra stacked legacy environment, maintenance, ambient-detail, HDRI, post-processing, 4K shadows, and distant yard detail over the canonical site, collapsing to 1.7 FPS in the first probe. | Quarantine duplicate legacy worlds. High and Ultra enrich the same authored site through bounded DPR, texture filtering, longer LOD, near-camera yard detail, and interior holograms. HDRI reflections and cinematic post effects remain explicit options. High passes at 60.2 to 120.1 FPS at DPR 1.2; Ultra passes at 56.5 to 120.3 FPS at DPR 1.3. |
| 2026-07-31 | PA speech lifecycle | Browser speech could begin without a real user audio gesture, and a queued announcement could be dismissed before playback actually completed. | Require initialized and primed user audio before speech, preserve a readable ten-second caption-only fallback, track pending speech independently, and cover both paths with component tests. |
| 2026-07-31 | Day and night transition | Crossing 20:00 rebuilt every static authored batch and conditionally added four point lights, producing a repeatable 249 to 306 ms full-scene hitch. | Keep the batch revision tied only to graphics quality, mark time-reactive meshes dynamic, mutate stable lamp and glass materials in place, and retain emissive night cues without changing global light count. A focused dusk-crossing probe and the complete 175-second logistics cycle have no long tasks. |
| 2026-07-31 | Performance sample readiness | A fixed five-second warmup sometimes ended while the deferred authored world was still uploading, so one-time staged construction could enter the steady ten-second sample. Renderer counters were unsuitable readiness signals because animated materials and text atlases legitimately change them. | Measure first-useful-frame latency separately, then require stable object, mesh, and instance counts for two seconds before telemetry reset. The Fast 3G gate now deterministically proves a 4,943.5 ms useful frame and a settled 109.8 FPS, 11.2 ms p95 sample with no long tasks. |
| 2026-07-31 | Fixed camera composition | Full-size native review exposed a forklift view starting almost on the paused vehicle and a personnel view sitting under the process deck. | Recompose the canonical forklift camera to show the complete vehicle in operational context and move the personnel camera into the side aisle. Camera invariants pass, and the exact-current frames show workers and the forklift without roof, wall, process-deck, or vehicle takeover. |
| 2026-07-31 | Factory wall envelope | The operational cutaway hid the roof and upper wall group whenever the camera entered the building, so the factory stopped reading as an enclosed structure. | Restore a permanently mounted structural envelope with solid plinths, real dock and personnel openings, steel columns, roof, opaque parapet bands, and large transparent window bays on all four facades. Glazing occupies genuine apertures rather than sitting over solid walls. Five critical views run at 119.0 to 120.3 FPS, and the exact 15-scene Medium matrix passes. |
| 2026-07-31 | Motion benchmark telemetry | Motion-start screenshot composition was captured after telemetry reset, so one 383 ms browser screenshot stall was falsely counted as application frame work. | Capture the evidence frame first and reset runtime telemetry immediately afterwards. The final 175-second cycle records 120.3 FPS, 9.1 ms p95, no long tasks, both forklift routes, and every truck approach, dock, service, departure, and return phase. |
| 2026-07-31 | Personnel perceptual quality | The first named-profile pass remained visually unacceptable because default Medium quality prohibited the detailed model, the medium model was a nine-mesh block figure, and the detailed model retained toy-like box anatomy. | Remove the Medium fidelity ceiling, use hysteretic distance bands, rebuild close and medium personnel around tapered adult proportions, rounded hands and boots, restrained faces, coherent hair, fabric-readable materials, fitted PPE, reflective workwear, and role tools, then add a collision-free close review camera. Close Medium records 121.3 FPS and 9.2 ms p95, wide Medium records 120.4 FPS and 9.2 ms p95, close High records 120.3 FPS and 9.2 ms p95, and geometry and LOD regression tests pass. |
| 2026-07-31 | Horizon backdrop continuity | The active unified environment retained the analytic sky, clouds, sun, stars, fog, and shared atmosphere clock, but mountain and moon visuals remained stranded in the quarantined legacy sky component. | Restore the moon and three deterministic, depth-separated horizon ridges inside the active optimized sky. Keep celestial bodies and stars behind the ridges, tint the backdrop continuously through day, twilight, weather, and night, and leave the duplicate legacy ground and city-strip renderer dormant. Native noon, night, and moonrise captures pass at 94.4 to 120.5 FPS with 9.1 to 11.9 ms p95 and effective DPR 1. |
| 2026-07-31 | Celestial completeness | Full-size review showed that merely restoring geometric sun and moon spheres did not constitute a complete celestial system. The moon had no linked illumination, the star field was sparse, weather-darkened daylight could reveal stars incorrectly, and an older App helper still competed with the active sky for fog colour. | Introduce one allocation-stable celestial sampler for the tilted opposite sun and moon orbit, continuous visibility, golden hour, ambient, sun key, moon fill, cloud veiling, and solar-luminance star visibility. Drive it from the smoothed unified game clock, replace the moon with a procedural cratered surface and halo, enrich the sun core and halo, expand the deterministic star field, retain mountain occlusion, and remove the stale second fog writer. Six focused atmosphere tests, the full 1,415-test suite, and exact-current native moonrise, noon, sunset, and night captures pass. |

### 28.5 Implemented programme

| Surface | Implemented result |
|---|---|
| Runtime and delivery | Staged loading, bounded recovery, mounted adaptive quality, stable Canvas lifecycle, lazy optional systems, deterministic build identity and cache handling, isolated static archives, bundle accounting, and a native benchmark harness with scene graph, shader, network, timing, screenshot, and opt-in motion telemetry evidence. |
| Canonical site | One typed metre-based site contract now owns factory bounds, machines, portals, cameras, collision volumes, roads, docks, logistics routes, landscape cells, water levels, and vertical datums. Interior, dock thresholds, yard, roads, farm, village, water, terrain, and horizon share one continuous world. |
| Scene performance | The default world preserves the complete authored factory exterior, village, stream, farms, castle, garage, maintenance facilities, roads, and logistics yard. Shared geometry and materials, incremental static batching, instancing, spatial visibility, throttled animation, and bounded quality additions optimize those objects in place. Duplicate legacy environment worlds remain quarantined. |
| Cameras and depth | Presets were recomposed, collision and occlusion recovery added, near and far depth ranges bounded, and overlays, decals, indicators, exterior surfaces, water beds, and transparent layers moved onto a validated depth registry. |
| Logistics animation | Forklifts use rounded deterministic routes, explicit pickup and dropoff states, smooth fork operation, distance-correct wheels, cargo state, stops, drill behavior, safety zones, audio state, and production-speed scaling. Trucks use route ownership, articulated movement, docking and service states, wheel motion, manifests, bay interlocks, and deterministic schedule transitions. |
| Material simulation | Grain input, inventory, processing, product, waste, dust, manifests, capacity, yield, throughput, and balance checks are conserved through one ledger and exposed to the production and SCADA surfaces. |
| Models and materials | Forklift and worker GLBs are normalized to metres, centred, grounded, self-contained, animation-named, budgeted, and manifest-validated. Canonical inputs are immutable and runtime derivatives are written atomically before validation. The invalid silo source is quarantined and the authored instanced silo family remains authoritative. |
| Personnel | Ten named workers now use deterministic profiles and starts, tapered adult proportions, rounded close and medium silhouettes, restrained faces, coherent skin and hair variation, fabric-readable role uniforms, fitted PPE, reflective workwear, task tools and poses, shared resources, hysteretic distance-scaled detail on Medium and above, animation pause and clock contracts, selection and labels, worker detail UI, and fire-drill behavior. |
| Atmosphere and shaders | Sky, cloud cover, fog, terrain, weather, horizon, procedural sun, procedural moon, deterministic stars, golden hour, ambient light, sun key, moon fill, and three water modes use stable quality-scaled contracts and one smoothed simulation time source. Celestial visibility and lighting share the same orbit and weather sample. Shader cache keys are deterministic. Dawn, noon, dusk, and night captures are distinct and stable. |
| SCADA | A compact scene-linked summary and a full focus-managed workspace now expose process, tags, alarm lifecycle, trends, events, simulation lab, and connections. Six-tag trend processing is worker-backed, zoomable, tabular, and exportable. Alarms support source context, notes, acknowledgement, shelving, recurrence, and audit history. |
| Interface and writing | The HUD and dock preserve the world, overflow is reachable, panels have one focus owner, onboarding has real progression and skip behavior, operational terminology is unified, simulated claims are explicit, AI recommendations expose provenance and human controls, and emergency language takes priority. |
| Audio and access | Focused, characterful, and quiet PA modes, captions, transcript, priority-aware interruption, state-linked vehicle sound, reduced motion, keyboard focus, touch targets, responsive panels, live status, and mobile settings are implemented and browser-tested. Mobile modal backgrounds become inert, focus is trapped correctly, emergency banners have authored names, and five representative states pass automated WCAG A and AA audits. |
| Safety, replay, persistence, and trust | Safety states stop affected world behavior consistently, fire drill progress is explicit, replay is bounded, persistence migrations recover supported and malformed state, multiplayer is labelled as a trusted-friends simulation surface, and AI consequence history remains reviewable. |

### 28.6 Final automated evidence

| Gate | Final result and evidence |
|---|---|
| TypeScript, lint, and format | `npm run typecheck`, `npm run lint`, and `npm run format:check` pass. |
| Unit and integration tests | `npm test -- --reporter=dot`: 77 files and 1,415 tests pass, with 0 failures. |
| Production build | `npm run build`: pass, 3,702 modules transformed. |
| Asset contracts | `npm run validate:assets`: forklift 481,708 bytes, 6 materials, 0 textures, 157,335 render vertices; worker 61,868 bytes, 1 material, 0 textures, 4,812 render vertices. Regeneration preserves all immutable source hashes. |
| Depth and shaders | Depth policy passes across 42 active files and 11 resolved relationships. All 12 shader families have stable custom cache keys. |
| Bundle and scripts | Initial JavaScript is 0.77 MiB gzip across 6 files; the complete static build is 97.65 MiB and passes its budget. All 10 active JavaScript and MJS scripts pass `node --check`. |
| Benchmark interface | `--help` exits without launching a browser. Native Chrome is the default. Fixed scenes use fresh browser contexts; paired SCADA variants share one context; motion evidence resets telemetry after screenshot capture. |
| Design and source hygiene | `npx impeccable detect src` and `git diff --check` pass with no output. |
| Dependency security | Full `npm audit`, including development dependencies, reports 0 vulnerabilities. |
| Static packaging | `npm run build:archives` packages 3 isolated archives. |
| Browser workflows and accessibility | Final `npm run test:e2e`: 2 real-browser workflows pass in 49.8 seconds, covering the core scene, AI Partner, SCADA, safety, settings, keyboard access, and responsive layout. Axe reports zero WCAG A or AA violations in the tested default desktop, full SCADA, fire drill, desktop settings, and mobile settings states. Exact current captures are under `test-results/evidence/e2e-exact-current-2026-07-31/`. |
| Throttled cold startup | Chrome Fast 3G with 150 ms latency, 1.6 Mbit/s down, 750 Kbit/s up, cache disabled, and service workers blocked reaches the first useful Medium frame in 7,767 ms. After the complete authored topology remains stable for 2,124 ms with zero pending batches, the ten-second sample records 118.0 FPS, 9.1 ms p95, no long tasks, and zero diagnostics. Evidence: `test-results/runtime-benchmarks/master-refinement-cold-fast3g-exact-current-v12-2026-07-31/`. |
| Medium native performance | All 16 exact-current fixed scenes pass at 99.4 to 120.2 FPS, 9.0 to 10.8 ms p95, effective DPR 1, 2,978.1 to 3,214.2 ms local first frame, and no long tasks. Draw calls range from 189 to 1,722. The complete authored site, restored wall envelope, personnel close view, water, village, farm, and garage remain present. Evidence: `test-results/runtime-benchmarks/master-refinement-exact-current-v2-2026-07-31/`. |
| High native performance reference | An exact-current seven-scene smoke over the affected factory, personnel, forklift, water, farm, and garage surfaces passes at 74.7 to 120.1 FPS, 9.5 to 14.5 ms p95, effective DPR 1.2, and no long tasks. The earlier complete High matrix remains green at 60.2 to 120.1 FPS. Evidence: `test-results/runtime-benchmarks/master-refinement-high-exact-current-v7-2026-07-31/` and `test-results/runtime-benchmarks/master-refinement-final-high-v6-2026-07-31/`. |
| Ultra native performance reference | An exact-current seven-scene smoke passes at 71.6 to 120.1 FPS, 9.7 to 14.8 ms p95, effective DPR 1.3, and no long tasks. Ultra uses the canonical world, with HDRI reflections and cinematic post effects available as explicit options rather than default stacked worlds. The earlier complete Ultra matrix remains green at 56.5 to 120.3 FPS. Evidence: `test-results/runtime-benchmarks/master-refinement-ultra-exact-current-v7-2026-07-31/` and `test-results/runtime-benchmarks/master-refinement-final-ultra-v6-2026-07-31/`. |
| SCADA isolation | SCADA off records 119.9 FPS and 9.0 ms p95; SCADA on records 117.1 FPS and 9.1 ms p95. The p95 delta is 0.1 ms, average-frame delta is 0.2 ms, draw-call delta is zero, and both have no long tasks. Evidence: `test-results/runtime-benchmarks/master-refinement-scada-exact-current-v2-2026-07-31/`. |
| Logistics motion | The exact-current 175-second motion probe passes at 120.0 FPS, 9.9 ms p95, a 13.0 ms worst frame, and no long tasks. The forklifts cover 297.37 and 266.30 sampled units. The receiving and shipping trucks cover 391.77 and 453.67 units, complete every approach, dock, service, departure, and return phase, and return to their starting phase. Evidence: `test-results/runtime-benchmarks/master-refinement-logistics-exact-current-v10-2026-07-31/`. |
| Atmosphere matrix | Dawn clear, noon clear, cloudy dusk, and storm night all pass at 102.1 to 119.5 FPS with 9.1 to 10.9 ms p95 and no long tasks. Evidence: `test-results/runtime-benchmarks/master-refinement-atmosphere-matrix-v3-2026-07-31.png` and the three matching `v3` atmosphere benchmark directories. |
| Horizon and celestial restoration | The active unified environment now includes the animated analytic sky, cloud cover, procedural sun, procedural moon, deterministic stars, fog, and three time-tinted mountain layers. The same celestial sample drives visible bodies, fog, ambient light, sun key, moon fill, golden hour, weather veiling, and star visibility. Exact-current native Medium noon passes at 104.7 to 120.4 FPS with 9.5 to 10.5 ms p95; moonrise and sunset each pass at 120.7 FPS and 10.0 ms p95; night passes at 114.6 to 120.7 FPS and 9.7 ms p95. Every run uses effective DPR 1 and records no long tasks. Evidence: the four `test-results/runtime-benchmarks/celestial-v8-*-2026-07-31/` directories. |
| Native visual candidates | The exact-current 16-scene contact sheet is `test-results/runtime-benchmarks/master-refinement-exact-current-v2-2026-07-31/contact-sheet.png`. Individual frames cover overview, interior zones, named personnel, forklift, shipping, receiving, yard, water, village, farm, and garage. The exact-current interface contact sheet is `test-results/evidence/e2e-exact-current-2026-07-31/contact-sheet.png`. |
| Personnel visual and performance gate | A dedicated close camera shows the complete rigged supervisor at working distance. The fitted hard hat follows the head and the role tool now follows the matching animated hand directly. Exact-current close Medium records 120.1 FPS and 9.8 ms p95; wide Medium records 120.1 FPS and 9.7 ms p95. Evidence: `test-results/runtime-benchmarks/master-refinement-exact-current-v2-2026-07-31/personnel-close.png` and `test-results/runtime-benchmarks/personnel-ppe-hand-follow-v2-2026-07-31/`. |

### 28.7 Remaining acceptance and release gates

The source implementation and all automated gates are complete. These gates remain intentionally open:

1. Nell's native perceptual acceptance of the current scene, water, atmosphere, UI, SCADA, forklift motion, and complete truck service cycle.
2. Commit, push, deployment, publication, licensing purchases, and destructive replacement of user-owned work, all of which remain outside the authorization for this run.

Run `npm run preview` to open the exact production build for review. No preview process is intentionally left running. The implementation should not be labelled fully accepted until the first gate receives a human yes.

### 28.8 Master Definition of Done closure audit

This table was rechecked against the exact current source and evidence after the broad implementation pass. “Verified” means the named deterministic or native evidence is current. It does not replace the one explicitly human gate.

| Master requirement | Status | Exact current evidence |
|---|---|---|
| One authoritative site and terminology contract | Verified | `src/constants/siteLayout.ts` owns the site contract. Site and camera invariant tests pass. The active source has no RM-105, RM-106, or RM-101-106 reference outside isolated archives. BAS and simulated SCADA terminology are consistent. |
| Initial route loads only the core experience | Verified | The production manifest keeps physics, SCADA, AI, WebGPU, multiplayer, post-processing, detailed site layers, and management panels in separate chunks. The initial JavaScript budget is 0.77 MiB gzip. |
| Optional systems are lazy, bounded, and independently recoverable | Verified | Every active lazy import uses `src/utils/recoverableLazy.ts`, with two 15-second attempts. Boundary generations keep Suspense retries bounded and refresh cached lazy payloads on reset. Local error boundaries isolate sidebar widgets, Safety and management panels, worker detail, predictive maintenance, HDRI, authored site layers, post-processing, physics, and physics-forklift branches. Recovery tests pass. |
| Medium meets native frame and resolution targets in every critical scenario | Verified | The exact-current 16-scene Medium matrix passes at effective DPR 1, 99.4 to 120.2 FPS, and 9.0 to 10.8 ms p95. |
| No recurring frame-pacing hitch | Verified | Exact fixed-camera Medium, High, Ultra, atmosphere, SCADA, and 175-second logistics runs record no long tasks. Screenshot composition is excluded from the motion sample by resetting telemetry after capture, and steady sampling begins only after the authored topology stabilizes. |
| Inside and outside are continuous at every portal | Verified | Canonical portal, render-cell, placement, and camera contracts pass their invariant suites. Current overview, interior, receiving, shipping, yard, and water captures share one world. |
| Cameras preserve composition and avoid solid geometry | Verified | Camera collision and canonical obstacle tests pass. Full-size review prompted a final personnel aisle and forklift camera recompose. The restored walls and roof remain visible from interior cameras without taking over any fixed reference frame. |
| Forklifts and trucks complete credible deterministic safe cycles | Verified | The complete motion recordings, route telemetry, truck phase history, pause contract, route tests, and schedule tests pass. |
| Machine and material-flow animation agrees with simulation and SCADA | Verified | Machine-motion contracts, central clock tests, SCADA mapping tests, material-flow tests, and current native motion evidence pass. |
| Inventory, throughput, yield, waste, manifests, and logistics are conserved | Verified | The canonical material ledger and property tests pass balance, capacity, manifest, waste, dust, and pause invariants. Production and SCADA consume that ledger. |
| AI recommendations expose inputs, assumptions, actions, and consequences | Verified | AI Partner tests cover decision presentation and controls. Decision provenance, reasoning, impact, disposition, response history, and measured outcome paths are current. |
| Safety is coherent across motion, controls, SCADA, alerts, audio, and writing | Verified | Facility stop and drill E2E paths pass. Vehicle pause behavior, alarm lifecycle, safety stores, PA priority, emergency naming, and live alerts pass deterministic tests. |
| Persisted state is versioned, migratable, and recoverable | Verified | Persistence migration tests load supported old versions, malformed state, and clean state. Safe storage recovery remains active. |
| Promoted multiplayer has verified authority and bounded interpolation | Conditional, not promoted | Multiplayer remains explicitly labelled a trusted-friends experimental simulation surface. It is not represented as open, secure, or production multiplayer. Host-authority and interpolation code remain bounded behind that label. |
| Hero assets meet scale, rig, LOD, material, texture, and validation budgets | Verified | Both model contracts pass. The immutable-source pipeline preserves canonical hashes. The invalid silo source remains quarantined behind the authored instanced silo family. |
| Lighting retains detail from night to noon without pumping or washout | Verified | The analytic sky and shared atmosphere contracts have stable cache keys and deterministic time and weather inputs. Current dawn, noon, cloudy dusk, and storm-night evidence is recorded in the final atmosphere matrix. Post-processing and HDRI reflections are explicit cinematic options. |
| Sky, horizon, fog, terrain, weather, and water form one atmosphere | Verified | One time source and quality-scaled atmosphere contracts drive the current sky and three water modes. The atmosphere matrix and water captures pass. |
| Confirmed z-fighting registry is empty | Verified | The depth validator passes 42 active files and all 11 registered relationships. Water bed and surface datums are physically separated and current captures show no confirmed fight. |
| Normal UI preserves the world and avoids competing interruptions | Verified | One sidebar owner, a bounded dock, priority-aware alerts, focus-managed modals, and responsive panels pass the complete E2E workflow. |
| Full SCADA is reachable, performant, mode-clear, and scene-linked | Verified | SCADA component, bridge, alarm, trend, worker, event, simulation, connection, CSV, and scene-focus tests pass. Native SCADA isolation remains within 1 ms. |
| Operational writing is precise, character optional, emergency unequivocal | Verified | Focused Operations is the default. Characterful and quiet modes remain optional. The final source audit removed stale six-mill language and active decorative pictographs from operational surfaces. |
| Keyboard, focus, contrast, reduced motion, captions, touch, and live data pass | Verified | Two browser workflows pass. Axe reports zero WCAG A or AA violations in five representative states. Recovery controls use 44-pixel minimum targets and pass design lint. |
| All deterministic engineering gates are green | Verified | TypeScript, lint, format, 77 test files and 1,415 tests, 3,702-module build, assets, depth, shaders, bundle, archives, script syntax, dependency audit, design lint, diff check, 2 browser workflows, and the exact-current Medium native matrix pass. |
| Current native screenshots and motion pass human perceptual review | Pending Nell | Exact-current screenshots, a 16-scene contact sheet, interface and SCADA evidence, and a complete exact-current logistics cycle are ready. Automated inspection cannot close this gate. |
| Remaining limitations and deferred P2 work are explicit | Verified | Section 28.9 records the retained boundaries and optional P2 work. |

### 28.9 Explicit limitations and intentionally deferred P2 work

- Human perceptual acceptance remains pending. This is the only incomplete Master Definition of Done item.
- Broad authored views peak at 1,722 draw calls and 152 active programs, above the programme's aspirational Medium counters. The complete town, farm, water, factory, and logistics world was retained because measured frame pacing remains green: 99.4 to 120.2 FPS and 9.0 to 10.8 ms p95 across all 16 Medium views.
- The exact-current Fast 3G first useful frame is 7,767 ms, which passes the 8,000 ms contract with 233 ms of headroom. Any initial-route or core-asset growth requires a fresh throttled check.
- Multiplayer remains a trusted-friends experimental simulation surface. It is not promoted as an open, secure, or production network mode.
- The incomplete external silo GLB remains quarantined. The validated authored and instanced silo family is the runtime authority.
- HDRI reflections and cinematic post-processing remain opt-in on Ultra because enabling both across the complete authored site materially raises fragment and shader work. The default Ultra preset is the performance-tested acceptance surface.
- Bundled Playwright Chromium remains available through `--channel=` as a portable diagnostic. Native Chrome is the declared performance acceptance surface and the benchmark default.
- Wildlife and local water wakes remain bounded ambient detail. Expanded wakes are deferred.
- Extra village stories and farm cycles are deferred.
- Additional cinematic camera paths are deferred. Task-oriented fixed cameras and user camera controls remain authoritative.
- Capture-grade reflections and further Ultra-only cinematic effects are deferred to protect frame pacing and clarity.
- Additional vehicle variants are deferred. The two canonical forklifts and two scheduled trucks carry the validated logistics contract.
- Expanded character micro-animation is deferred beyond the current worker, vehicle, maintenance, and ambient motion set.
- Decorative seasonal content is deferred.

These deferrals cannot consume the proven performance, accessibility, depth, safety, or operational-clarity budgets without a new scoped acceptance pass.

## 29. v0.40 refinement programme

Nell authorized the complete next refinement programme on 2026-07-31 and named the resulting release line v0.40. This authorization covers local source implementation and validation. Commit, push, deployment, publication, paid licensing, and destructive replacement of user-owned work remain held.

### 29.1 Canonical world and non-regression contract

The restored authored world is the starting point and remains canonical. The factory shell and large windows, complete interior, village, stream, pond, farms, garage, maintenance facilities, roads, yards, vehicles, mountains, sky, sun, moon, stars, and weather remain one continuously mounted world. Refinement may optimize, reposition, retopologize, re-material, animate, or add bounded detail. It may not replace that world with a reduced scene, remove authored landmarks, or reintroduce camera-driven inside and outside representations.

Existing work was protected before this tranche in `/tmp/millos-20260731-v040-preflight/`. The snapshot contains branch and status evidence, tracked and staged patches, an untracked-file inventory, and hashes for the initial target surfaces.

### 29.2 Fresh v0.40 baseline

| Gate | Starting result |
|---|---|
| TypeScript | Pass |
| Lint | Pass |
| Format | Pass |
| Unit and integration tests | 77 files and 1,415 tests pass |
| Production build | Pass, 3,702 modules transformed |
| Assets | Forklift and worker contracts pass |
| Shaders | 12 families and 15 stable cache keys pass |
| Depth | 42 active files and 11 relationships pass |
| Bundle | 0.77 MiB initial JavaScript gzip and 97.66 MiB complete build pass |
| Medium native matrix | All 16 scenes pass at 92.4 to 123.6 FPS and 9.0 to 11.8 ms p95, with zero benchmark failures |

The new Medium matrix is stored under `test-results/runtime-benchmarks/v040-baseline-medium-2026-07-31/`. Its highest draw-call views are farm at 1,726, water at 1,594, and milling at 1,500. These views receive optimization before added detail. Local first-frame and Fast 3G budgets remain load-bearing because the prior throttled result has only 233 ms of margin.

### 29.3 Ordered implementation slices

1. **Release identity and evidence:** establish v0.40 metadata, baseline artifacts, a finite defect ledger, placement invariants, and before evidence.
2. **Personnel:** replace the toy-like hero silhouette with one coherent adult worker system, role-correct PPE, restrained faces, task-readable poses, stable gait and transitions, selected-worker detail, and continuous Medium and Low LODs. Keep shared resources and the simulation, selection, label, and fire-drill contracts intact.
3. **Vehicles and logistics:** improve the Medium forklift and truck silhouettes, wheels, steering, articulation, lights, materials, operator pose, cargo contact, loading cues, and sound while preserving deterministic route ownership and emergency stops.
4. **Exterior and atmosphere:** recompose mountains and horizon depth, soften terrain transitions, integrate banks and water edges, enrich the retained village, farm, garage, and service yard, and keep sun, moon, stars, fog, clouds, weather, and water driven by one atmosphere state.
5. **Factory and machinery:** beautify the retained walls and large windows, roof, portal thresholds, structural steel, machines, spouting, conveyors, safety markings, decals, and material response. Preserve sightlines and remove confirmed overlap, clipping, depth flicker, and centre pile-ups.
6. **Interface, SCADA, writing, audio, and access:** tighten hierarchy and density, improve scene linking and operational state legibility, preserve simulated and BAS terminology, refine microcopy and motion, and recheck keyboard, touch, reduced motion, captions, focus, and contrast.
7. **Performance and acceptance:** reduce static draw and shader duplication before increasing detail, keep Medium at effective DPR 1 and at least 60 FPS, re-run startup, scene, logistics, atmosphere, depth, asset, browser, accessibility, and design gates, then prepare native perceptual candidates.

### 29.4 v0.40 acceptance contract

- No canonical landmark, factory surface, production system, personnel identity, logistics route, celestial body, or interface capability is lost.
- Personnel read as adult industrial workers at the dedicated close camera and as stable silhouettes at normal operating distance.
- Forklift and truck motion remains distance-correct, state-driven, paused by the canonical safety contract, and visibly connected to cargo and dock work.
- No declared service asset or vehicle apron overlaps unintentionally. Intentional containment has an explicit exemption and a test.
- Noon, golden hour, moonrise, and night retain continuous mountain, sky, fog, sun, moon, star, terrain, and water relationships without a horizon seam.
- Medium remains above 60 FPS with p95 at or below 25 ms in all 16 fixed scenes at effective DPR 1. Added detail may not worsen any scene below its acceptance budget.
- The throttled first useful frame remains below 8 seconds. Core-route growth requires compensating delivery work and a fresh measurement.
- Typecheck, lint, format, tests, build, assets, shaders, depth, bundle, runtime, browser, accessibility, design lint, and `git diff --check` pass on the exact final source.
- Final acceptance still requires Nell's native perceptual review. Automated evidence can reject defects and cannot close that judgment gate.

### 29.5 v0.40 execution record

All seven ordered slices are locally implemented.

| Slice | Exact result |
|---|---|
| Release identity and evidence | Package and lockfile identify `0.40.0`; no release identifier was bumped beyond v0.40; the original dirty tree remains preserved and no commit, push, deployment, publication, paid licensing, or destructive replacement occurred. |
| Personnel | The canonical roster uses distinct rigged Quaternius masculine and feminine bodies, role-specific workwear, PPE, tools, identity styling, semantic task animation, stable gait, selection, labels, fire-drill behavior, and three LOD representations. Medium begins with the lightweight procedural worker for first-frame delivery, then promotes nearby people to the authored model through the normal hysteretic camera LOD contract. |
| Vehicles and logistics | Forklifts and trucks retain deterministic route ownership while adding authored operators, distance-derived wheel motion, steering, trailer articulation, lights, cargo contact, loading and service cues, and spatial vehicle audio. Emergency and drill stops remain authoritative. |
| Exterior and atmosphere | The retained village, stream, pond, farms, garage, maintenance facilities, roads, yards, castle, and factory remain mounted in one world. Terrain transitions, organic water edges, instanced farm detail, three mountain massifs, procedural sun and moon, expanded stars, fog, cloud veiling, weather, and water now share one atmosphere state. |
| Factory and machinery | The complete factory retains solid walls, large windows, roof, portals, structure, machines, conveyors, spouting, markings, and safety details. Spouting routes, flanges, and supports are batched or instanced; compact machine service faces add bounded detail without restoring duplicate legacy worlds. Confirmed centre and maintenance placement conflicts remain resolved. |
| Interface, SCADA, writing, audio, and access | The compact and full Simulated SCADA surfaces remain reachable and scene-linked. Tabs support Arrow Left, Arrow Right, Home, and End; touch targets, dialog descriptions, responsive wrapping, slider outputs, live-region behavior, BAS terminology, and operational copy were tightened. Vehicle and operational audio stays subordinate to safety state and user audio consent. |
| Performance and acceptance | Static draw and shader duplication were reduced before detail was added. Exact-source native, cold-network, logistics, atmosphere, SCADA, browser, accessibility, design, asset, shader, depth, bundle, and repository checks are recorded below. |

### 29.6 Exact final-source evidence

| Gate | Final result and evidence |
|---|---|
| TypeScript, lint, format | `npm run typecheck`, `npm run lint`, and `npm run format:check` pass. |
| Unit and integration tests | 79 files and 1,423 tests pass. |
| Production build | Vite transforms 3,704 modules and completes successfully. |
| Dependency audit | `npm audit` reports zero vulnerabilities. |
| Assets | Forklift, compatibility worker, masculine worker, and feminine worker contracts pass at 481,708, 61,868, 1,338,100, and 1,434,792 bytes respectively. |
| Shaders and depth | 12 shader families, 15 stable cache keys, 45 active depth-policy files, and 11 resolved depth relationships pass. |
| Bundle | Initial JavaScript remains 0.77 MiB gzip; the complete build is 100.31 MiB and passes its budget. |
| Medium native matrix | All 16 scenes pass at 99.6 to 120.2 FPS, 9.1 to 10.9 ms p95, effective DPR 1, and no long tasks. Draw calls range from 192 to 1,646. Evidence: `test-results/runtime-benchmarks/v040-final-medium-v2-2026-07-31/`. |
| Cold Fast 3G | The cache-disabled, service-worker-blocked profile reaches its first useful frame in 7,804 ms, then records 112.0 FPS and 9.8 ms p95 with no long tasks or diagnostics. Evidence: `test-results/runtime-benchmarks/v040-final-cold-fast3g-v2-2026-07-31/`. |
| SCADA isolation | SCADA off records 120.2 FPS and 9.9 ms p95; SCADA on records 120.1 FPS and 9.8 ms p95. The p95 delta is minus 0.1 ms and the draw-call delta is minus 3. Evidence: `test-results/runtime-benchmarks/v040-final-scada-v1-2026-07-31/`. |
| Logistics motion | The 175-second cycle records 120.0 FPS, 9.8 ms p95, a 13.0 ms worst frame, and no long tasks. Forklifts traverse 296.86 and 266.30 sampled units. Receiving and shipping trucks traverse 391.93 and 454.91 units and complete every approach, dock, service, departure, and return phase. Evidence: `test-results/runtime-benchmarks/v040-final-logistics-v1-2026-07-31/`. |
| Atmosphere | Dawn, noon, cloudy golden hour, clear moonrise, and storm night remain continuous at 116.9 to 120.3 FPS with 9.1 to 10.2 ms p95 in the overview and factory views. Dedicated exact-source frames visibly capture the sun, moon, mountain occlusion, interior glazing, and linked water response. Evidence: `test-results/runtime-benchmarks/v040-final-atmosphere-matrix-v1-2026-07-31.png` and `test-results/runtime-benchmarks/v040-final-celestial-v1-2026-07-31/`. |
| High and Ultra smoke | High passes seven representative scenes at 60.6 to 120.1 FPS and 9.7 to 18.6 ms p95. Ultra's five uncontended scenes pass in the full smoke, while an immediately sequential heated water and farm sample missed the generic 55 FPS harness threshold. An unchanged isolated rerun passes farm at 56.8 FPS and water at 66.8 FPS, with 19.1 and 16.1 ms p95. Evidence: `test-results/runtime-benchmarks/v040-final-high-v1-2026-07-31/`, `test-results/runtime-benchmarks/v040-final-ultra-v1-2026-07-31/`, and `test-results/runtime-benchmarks/v040-final-ultra-isolated-v2-2026-07-31/`. |
| Browser and accessibility | `npm run test:e2e` passes both complete Chrome workflows in 40.3 seconds. Axe reports no WCAG A or AA violations in the exercised default, full SCADA, fire-drill, desktop-settings, and mobile-settings states. Evidence: `test-results/evidence/v040-final-2026-07-31/`. |
| Design and repository integrity | `npx impeccable detect src`, active script syntax checks, and `git diff --check` pass with no findings. |

### 29.7 Deviations and remaining gate

| Discovery | Conservative resolution |
|---|---|
| The first exact v0.40 Fast 3G run exceeded the loading-overlay wait after the two detailed personnel assets became part of the Medium route. | Keep the full authored workers. Start Medium on the lightweight worker, then promote nearby personnel after the first camera sample. Low remains a billboard; High and Ultra remain eager. The focused LOD and personnel tests pass, close cameras show the authored bodies, and the repeated cold gate passes at 7,804 ms. |
| A High followed immediately by Ultra smoke accumulated enough machine heat for Ultra water and farm to miss the harness's generic 55 FPS threshold, despite remaining above the programme's 30 FPS Ultra target. | Make no visual downgrade from a thermally contaminated sequence. After an idle interval, rerun only the two failed scenes on unchanged source. Both pass the stricter threshold with no long tasks. |

At the close of this tranche, Nell's native perceptual acceptance of the final scene, personnel, vehicles, atmosphere, water, UI, SCADA, and complete logistics cycle remained pending. Nell subsequently passed that gate explicitly on 2026-08-01, as recorded in section 30. The primary reviewed candidates were `test-results/runtime-benchmarks/v040-final-medium-v2-2026-07-31/contact-sheet.png`, `test-results/runtime-benchmarks/v040-final-atmosphere-matrix-v1-2026-07-31.png`, `test-results/runtime-benchmarks/v040-final-celestial-v1-2026-07-31/contact-sheet.png`, and `test-results/evidence/v040-final-2026-07-31/contact-sheet.png`.

## 30. v0.40 post-review completion tranche, 2026-08-01

Nell explicitly declared the native human review passed and authorized every remaining refinement in this programme for v0.40. The release identity remains `0.40.0` in package metadata and v0.40 in this programme documentation. No commit, push, deployment, publication, reset, stash, clean, process termination, or destructive replacement was authorized or performed.

### 30.1 Completed implementation

| Surface | Completed result |
|---|---|
| Unified world | The factory interior, solid wall envelope, large windows, roof, yards, roads, village, castle, farm, garage, maintenance facilities, stream, pond, terrain and horizon remain continuously mounted. No camera-driven inside and outside split was restored. Existing centre-yard and maintenance-apron placement repairs remain intact. |
| Startup and loading | The core scene and operational DOM now arrive in staged lazy boundaries. The first WebGL frame releases deferred operational UI, loading motion respects reduced-motion preferences, and static scene work is batched into bounded slices. The benchmark harness distinguishes first useful frame from complete authored-world readiness and records runtime diagnostics. |
| Materials and models | Procedural colour textures now declare sRGB while normal, roughness, metalness, AO, height and mask data remain linear. Terrain, grass, bark, brick, cobble, concrete, roofs, machines, vehicles and foliage gained corrected material response, mipmapping, filtering, macro variation, restrained weathering and shared-resource discipline. A lightweight procedural IBL supplies coherent metallic response from the same atmosphere state as the visible sky. |
| Atmosphere and water | Layered mountain rings, aerial perspective, fog, analytic sky, sun, moon, stars, cloud motion, celestial lights and all water surfaces use the shared time and weather model. The unified water shader adds directional flow, cross ripples, shoreline response and quality-scaled detail without unstable cache keys. |
| Personnel | Authored masculine and feminine worker bodies, role-correct PPE, hair, tools, identity treatments, contact grounding, stable semantic poses and LOD promotion remain integrated with selection, labels, evacuation and simulation ownership. |
| Vehicles | Forklifts retain deterministic routes, distance-derived wheel motion, steering, operators, safety state, cargo interaction and mast motion, with load-aware mast tilt. Trucks retain articulated routes, wheel motion, lights, docking and service phases, with visually grounded landing gear. |
| Factory process | Walls and glazing, structure, roof, portals, machines, spouting, conveyors, grain flow, service faces, safety markings and bounded wear were reconciled as one process floor. Shader and material duplication were reduced without removing authored production equipment. |
| SCADA and interface | Alarm order is severity-first and stable, acknowledgement retains operator traceability, trend selection and export remain bounded, live tables can be paused, and the manual action now says `Refresh`. Maintenance, material traceability and energy surfaces use concise operational units and clearer hierarchy. PA scheduling preserves emergency priority and rate limits ambient character. |
| Performance and maintainability | Renderer telemetry now reports completed-frame draw data. The BAS equity calculation avoids iterator allocation on its hot path. Stable shader validation uses the TypeScript AST, so comments that discuss forbidden cache-key patterns cannot create false positives. Depth relationships, texture colour-space contracts and quality settings have focused regression coverage. |

### 30.2 Exact stable-source evidence

| Gate | Result |
|---|---|
| Source identity | The exact production build began and ended at SHA-256 content fingerprint `f4c1d5678404b4a7e63a6fb7e327e914673a3a9d2ad72096909ea14047029428`. |
| TypeScript | `npm run typecheck` passes on the completed source. |
| Lint and format | `npm run lint` and `npm run format:check` pass. Prettier reports that every matched source file uses project style. |
| Unit and integration tests | 91 files and 1,592 tests pass in 459.10 seconds. |
| Production build | Vite transforms 3,720 modules and completes in 1 minute 13 seconds. |
| Dependency audit | `npm audit --omit=dev` reports zero vulnerabilities. |
| Assets | Forklift, compatibility worker, masculine worker and feminine worker contracts pass at 481,708, 61,868, 1,338,100 and 1,434,792 bytes. |
| Shaders | 22 shader families, 22 stable custom cache keys and 18 definition sites pass, with three explicit allow-list entries. |
| Depth | 54 active files and 12 resolved depth relationships pass. |
| Bundle | Initial JavaScript is 0.59 MiB gzip across five files. The complete 100.66 MiB build passes its budget. |
| Repository and design | Active script syntax, `git diff --check`, package and lockfile version identity, `npx impeccable detect src`, and the authored asset checks pass with no findings. |
| Native first-use startup | Five Medium views reach a useful frame in 286.4 to 618.7 ms at effective DPR 1.20. Evidence: `test-results/runtime-benchmarks/v040-final-native-startup-post-stable-2026-08-01/`. |
| Visual smoke | The exact-source overview image visibly retains the complete factory shell and glazing, exterior service buildings, roads, water, village and castle, layered mountains, sky and continuous terrain. Evidence: `test-results/runtime-benchmarks/v040-final-overview-smoke-post-stable-2026-08-01/overview.png`. |

### 30.3 Rejected contaminated evidence and completed runtime refresh

The first exact-source full-world overview sample recorded 42.0 FPS and 27.5 ms p95. It is rejected as acceptance evidence because the host load average was about 503 during capture, several unrelated Python suites, ffmpeg and TypeScript builds were active, and an externally owned Chrome DevTools automation browser was consuming the same GPU. Runtime diagnostics were otherwise empty and no frame exceeded 50 ms. The sample remains stored under `test-results/runtime-benchmarks/v040-final-overview-smoke-post-stable-2026-08-01/` so the failure and its conditions remain auditable.

On 2026-08-02 the current exact source was revalidated after waiting for zero automation-browser contention and acceptable host load. No externally owned browser, shell, test runner, Blender job, Codex session or Claude session was terminated. The final source fingerprint before and after the deterministic and runtime packs was `7ffcfe8cde267d0dae6d367dc8ac168b4a8a05674e6e03999cf2fbca142a377a`.

| Gate | 2026-08-02 exact-source result |
|---|---|
| Unit and integration tests | `npm test -- --reporter=dot` passes: 92 files and 1,608 tests. |
| TypeScript, lint, format | `npm run typecheck`, `npm run lint`, and `npm run format:check` pass. One blocking Prettier line in `src/components/CameraController.tsx` was formatted. |
| Production build | Vite transforms 3,720 modules and completes successfully. |
| Assets | Forklift, compatibility worker, masculine worker and feminine worker contracts pass at 422,000, 61,868, 1,338,100 and 1,434,792 bytes. |
| Shaders and depth | 22 shader families, 22 stable custom cache keys, 18 definition sites, 55 active depth-policy files and 12 resolved depth relationships pass. |
| Bundle and repository | Initial JavaScript is 0.59 MiB gzip across five files. The complete 100.61 MiB build passes its budget. `npx impeccable detect src`, `npm audit --omit=dev`, and `git diff --check` pass. |
| Overview smoke | 100.9 FPS, 11.4 ms p95, 1,383 calls, effective DPR 1.20, zero frames over 50 ms, zero long tasks, first useful frame 387.1 ms. Evidence: `test-results/runtime-benchmarks/v040-final-overview-smoke-isolated-2026-08-02/`. |
| Fast 3G cold profile | 106.8 FPS, 10.9 ms p95, 1,384 calls, effective DPR 1.20, zero frames over 50 ms, zero long tasks, first useful frame 4,067.8 ms. Evidence: `test-results/runtime-benchmarks/v040-final-cold-fast3g-post-stable-2026-08-02/`. |
| SCADA isolation | SCADA off records 120.0 FPS and 9.8 ms p95; SCADA on records 120.0 FPS and 10.0 ms p95. The p95 delta is 0.2 ms and the draw-call delta is +1, within the 1 ms contract. Evidence: `test-results/runtime-benchmarks/v040-final-scada-post-stable-2026-08-02/`. |
| Medium 17-scene matrix | All scenes pass at 91.7 to 120.1 FPS, 9.7 to 12.3 ms p95, effective DPR 1.20, zero frames over 50 ms and zero long tasks. The heaviest retained view is farm at 1,529 calls. Evidence: `test-results/runtime-benchmarks/v040-final-post-review-medium-post-stable-2026-08-02/`. |
| Logistics motion | Forklift, shipping and receiving scenes pass at 110.1 to 120.0 FPS and 9.8 to 10.4 ms p95. Forklifts traverse 105.45 to 122.74 sampled units. Trucks complete dock, preparation, pull-out, turn-out, acceleration, leaving, entering, slowing, turning-in, straightening, positioning, stopping-to-back, backing, final-adjustment and docked phases across the three samples. Evidence: `test-results/runtime-benchmarks/v040-final-logistics-motion-post-stable-2026-08-02/`. |
| Sun, moon and atmosphere | The current runtime reports the sun shader state with `uSunOpacity: 0.916`, daylight `0.6854`, and sun direction `[0.9792, 0.1289, -0.1567]`; the fixed cameras show the linked sunset lighting. The moon run reports moon opacity `0.872` and the screenshot visibly shows the moon disk, night sky and stars. Evidence: `test-results/runtime-benchmarks/v040-final-sun-post-stable-2026-08-02/`, `test-results/runtime-benchmarks/v040-final-sun-visible-overview-post-stable-2026-08-02/`, and `test-results/runtime-benchmarks/v040-final-moon-post-stable-2026-08-02/`. |
| Browser, accessibility and responsive workflows | `npx playwright test --reporter=line` passes both Chrome workflows in 51.5 seconds. |

The fixed benchmark cameras do not directly frame the sun disk in the current source, so the sun-disk visual is evidenced by runtime shader telemetry and linked lighting rather than by a visible disk screenshot. The moon disk is directly visible in the final screenshot.

### 30.4 Human acceptance

Nell's native human perceptual review is accepted as passed by explicit instruction on 2026-08-01. Automated evidence remains responsible for engineering rejection and regression detection. It does not revoke that human judgment or substitute a contaminated measurement for the remaining isolated runtime proof.

### 30.5 v0.40 closeout position

The v0.40 refinement programme is locally complete in the current dirty checkout. The authored unified world, factory shell and windows, town, stream, garage, maintenance shed, farm, mountains, sky, water, personnel, forklifts, trucks, process floor, SCADA and interface remain retained and optimized. Exact deterministic, runtime, visual, motion and browser/accessibility evidence has passed. Human perceptual acceptance was already passed by Nell. No commit, push, deployment, reset, stash, clean, publication or destructive replacement was performed.
