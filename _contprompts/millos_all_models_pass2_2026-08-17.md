---
title: MillOS — all models, pass 2. What the review cameras were hiding
date: 2026-08-17
status: correctness CLEAN repo-wide (21 scenes, 0 blockers); the art review is now trustworthy evidence for the first time; items 1 and 2 of the predecessor remain largely open and are smaller than they looked
branch: launch-audit-polish
predecessor: _contprompts/millos_all_models_highest_quality_2026-08-16.md
verification_criteria:
  - "Nothing here is reported from source. Every claim below has a measurement or a frame behind it, and the measurement is named."
  - "A work list ordered by MESH COUNT is a work list ordered by how finely something was modelled. A viewer sees AREA. The two orderings disagreed violently and the old one was wrong."
  - "'No bound texture slot' is not 'unfinished'. A third of what the previous list called flat is shader-injected surfacing that was already done."
  - "A wide survey camera never mounts the thing it is grading. Two branches reported 100% flat while the authored models those branches exist for were not in the graph."
  - "Typecheck, lint, format, 106 files / 1677 tests, build, validate:assets, validate:bundle, 21-scene model audit at 0 blockers, and a 12/12 art capture with zero diagnostics are green on this tree."
---

# MillOS — all models, pass 2

## 1. The headline

**The art review was grading a corrupt frame, and it had been for some time.**
Three separate defects stacked on the same twelve pictures. Each one was
invisible to every gate in the repo, and each one is now fixed and pinned:

1. `personnel-close` — the flagship personnel frame — contained **no worker at
   all**. It aimed at a spawn coordinate; an art capture runs the clock.
2. Every benchmark camera composed closer than 15 m was **silently dollied
   backwards** by the orbit rig. `forklift` rendered from (49.73, 4.37, 34.95)
   against its declared (48, 3.8, 33), in every capture ever taken.
3. The worker the personnel frame does grade had **his torso wound 130 degrees
   over** by an accumulating secondary-animation offset. The capture sheet went
   out with the Supervisor's head hanging below his chest and both arms over his
   head.

None of the three could fail a test, because all three produce a plausible
picture of the wrong thing.

**Gates, green on this tree:**

```
npm run typecheck / lint / format:check    clean
npm test                                   106 files, 1677 tests, 0 failures
npm run build                              ok
npm run validate:assets                    34/34 PASS
npm run validate:bundle                    0.60 MiB initial gzip, 112.48 MiB dist
node scripts/audit-scene-models.mjs        21 scenes, 0 blockers, 1 benign warning
npm run capture:art -- --set=art           12/12 PASS, zero diagnostics
node scripts/audit-scene-motion.mjs        dock openings 0% -> 23% alive
```

Nothing is committed and nothing is pushed. **Local only — not live.**

---

## 2. Predecessor item 6: the review cameras

### 2.1 The personnel cameras aimed at spawn marks

All three poses in `SITE_LAYOUT.cameras` targeted a coordinate out of
`createInitialWorkers` — `personnelClose` targets `[10, 1.25, -18]`, which is
exactly `starts[0]`. That is right only while the world is paused, and a
benchmark run without `motion=on` does pause it (`gameSpeed` 0 →
`simulationActive` false), so the shot was presumably composed that way.

An art capture runs `--motion`. Measured: the nearest authored body had walked
from z = -18 to **z = -9.0** by the time the shutter opened. The frame was silo
cones and empty floor.

Two independent mechanisms now, in `src/runtime/personnelReview.ts`:

- **A hold.** The roster stops walking for the three personnel scenes only —
  movement suppressed, mixer and secondary signals untouched, so what is graded
  is a living figure standing still. The whole roster rather than one subject,
  because there is no worker-worker separation: with one figure held, the next
  one down the same aisle walked through it and the second capture came back
  with two interpenetrating bodies.
- **A follow.** The pose is re-derived from the subject's actual transform every
  frame regardless. With the hold in place it reproduces the authored constant
  to six decimal places, which the test asserts; it is what keeps the shot if
  the roster or the spawn marks ever change.

The offsets are stated in the subject's frame, and the lateral component is
**mirrored to stay in the aisle**. The first build did not do that, and the
`personnel-feminine` frame came back as a silo outlet cone filling the left half
with the subject behind it: the roster patrols x = ±10 and the silos are 4.5 m
wide on x = -18, -9, 0, 9, 18, so a rigid offset swings the camera into the
machine row on every turnaround.

`personnel` itself used to look across the hall from `[22, 5.5, -14]` with a
silo leg down the centre of the frame. It now looks back along the aisle the
roster actually walks.

### 2.2 The orbit rig was editing every scripted camera

Found while verifying the above. `OrbitControls.update()` re-derives the camera
position from `target` plus a spherical offset **clamped to
[minDistance, maxDistance]**, and drei calls it every frame. `minDistance` was
15, with a hand-added 3 m exception for the two personnel scenes — which was
this same bug being worked around one scene at a time.

Measured: `forklift` is composed at 12.33 m from its subject and rendered from
**(49.73, 4.37, 34.95)** instead of **(48, 3.8, 33)** — pushed 2.67 m back along
the view axis, from a pose no constant in this repo states.

`enabled={false}` alone did **not** fix it: `forklift` stayed at
(49.73, 4.37, 34.95) to the centimetre, so something still calls `update()` on a
disabled instance. Relaxing the limits in benchmark mode is what restored the
authored pose. Both are applied, in `App.tsx` and in `PhysicsScene.tsx` (the
latter is unreachable today — `enablePhysics` is false on all four presets — and
is worse: its `maxDistance` of 100 would haul `overview` in from 168.6 m).

### 2.3 What the fixed cameras then showed

Two defects that only became visible once the frames contained their subject.
Both are §3.

---

## 3. Two defects the fixed cameras exposed

### 3.1 The terrain sat 7 cm above everything it is meant to sit under

`TerrainGround` defaulted to `yPosition = 0.05`. `SITE_LAYOUT.datum.terrain` —
which equals `EXTERIOR_LAYERS.ground`, which `depthRegistry.test.ts` already
asserts — is **-0.02**. The interior factory slab is at **0**. So the
bottom-most surface on the site was above the interior floor and above every
authored exterior plane, and the only thing hiding that was the
`POLYGON_OFFSET.exteriorBase` bias on the terrain material.

A factor-4 bias hides 7 cm of wrong-side geometry at 30 m. It does not at 2 m,
where the depth buffer resolves finely. Measured: a speckled band filled the
lower third of `personnel-feminine` and the lower right of `personnel-close`,
`shipping` and `receiving` — **four of the twelve art scenes** — and vanished
under `setPerfDebug({ disableTerrain: true })`, which is what identified it.

The terrain now takes the declared datum. Lowering it can only INCREASE
separation for anything that was already above it, so no new fight is possible;
what it does change is that surfaces hand-tuned to clear the old 0.05 now float.
Two were corrected — the ground contact blobs under parked cars and the farm mud
puddle, both decals, both moved to `EXTERIOR_LAYERS.groundOverlay`.

**About fifteen more call sites still carry a comment reading "raised above
TerrainGround (y=0.05)"** — roads, paths, stone edges, stop lines, canal water.
They are all 6-10 cm above the ground rather than 1-5 cm now. A road plane
standing proud of its verge is arguably more correct than one flush with it, and
six scenes were checked by eye (`overview`, `yard`, `shipping`, `receiving`,
`village`, `personnel-*`) with nothing wrong. **They are listed as open, not as
done**: `grep -n "TerrainGround (y=0.05)" src/components/*.tsx`.

### 3.2 The secondary animation offsets integrate without bound

This is the interesting one, and it is a three.js behaviour nothing in the repo
knew about.

`WorkerModel` layers breathing, head-look and slouch on top of the clips by
premultiplying a small offset onto a few bone quaternions. The comment above
that block asserted the offsets were "non-accumulating and need no save/restore"
because the mixer rewrites every bone first.

**The mixer does not.** `three/src/animation/PropertyMixer.js:231` compares the
newly accumulated value against the previously applied one and calls
`binding.setValue` **only when it differs**. Five of the nine authored worker
clips — `break`, `inspect`, `repair`, `supervise`, `sample` — carry exactly two
identical keys per bone. While one of those is playing, the accumulated value
never changes, the mixer never writes the bone again, and the premultiply
compounds on its own previous output every frame.

It does not average out, because a stationary worker's breath term is a sine of
`walkCycle` and `walkCycle` barely advances when nobody is walking. The
increment is therefore nearly constant and integrates linearly.

Measured on the live rig, `Torso -> Chest`, whose rest pose is 0.4 degrees and
whose clip value is 0.4 degrees in all nine clips:

| elapsed | before | after |
|---|---|---|
| 6 s | 32.4° | 0.6° |
| 14 s | 129.7° | 0.6° |
| 20 s | 28.2° | 0.6° |
| 34 s | 152.4° | 0.6° |

At 130° the head hangs below the chest (`Head.y` 1.208 against `Chest.y` 1.339)
and both wrists rise above it. **That is the pose the previous capture sheet went
out with**, on the Supervisor, who is exactly the roster member
`personnel-close` grades.

Fixed by restoring each affected bone to its captured clip pose *before*
`mixer.update` and re-capturing *after* it — correct whether or not the mixer
writes. Pinned by `models/__tests__/secondaryOffsetAccumulation.test.ts`, which
drives the real `AnimationMixer` with a real two-key clip and asserts the naive
form passes 90° in ten seconds while the restored form stays under 1.5°. That
test is as much a three-behaviour test as an app test: if a future three drops
the change-detection short-circuit, the first case stops failing.

---

## 4. The instruments were lying, and the work list with them

Three corrections, all of which change what the next pass should do.

### 4.1 Mesh count is not surface area

`audit-scene-models.mjs` ordered its work list by mesh count. Almost nothing in
this scene owns its size: a shared unit box scaled to a 60 m wall and the same
unit box scaled to a 0.05 m bolt report an identical `boundingSphereRadius`,
because that is a property of the geometry and the scale lives in the matrix.
The list therefore ranked a hundred bolts above the wall behind them.

`RuntimeObjectReport.geometry.worldRadius` is that radius in metres. The list is
now ordered by summed world size, and it immediately named the real items: the
canal, the lake margin, the embankments — none of which were in the top ten by
count.

### 4.2 "No texture slot" is not "unfinished"

A large amount of the surfacing here is injected GLSL rather than a bound
texture slot: the terrain's entire splat blend, the machines' grime/dust/edge
wear, the trailers' ribbed panels and per-truck grime, the forklift's paint and
structure. Every one of them reported zero textures.

`material.shaderInjected` is now reported (detected exactly as
`StaticMeshBatch.isSupportedMaterial` detects it, so the two agree) and the
survey has a `shader` column. The correction is large:

| branch | flat before | flat now | shader |
|---|---|---|---|
| world-terrain | 100% | **0%** | 100% |
| world-factory-process | 41% | **22%** | 69% |
| world-logistics | 97% | **81%** | 16% |
| authored-factory-exterior | 87% | **74%** | 14% |
| authored-farm | 24% | **17%** | 13% |

The predecessor's item 2 — "`world-logistics`, 311 meshes, 97% flat, trucks and
trailers" — was substantially work already done in
`truckbay/OptimizedTruckBay.tsx`, which carries a careful dielectric-paint pass,
a tyre tread normal and per-truck grime. Read that file before touching it.

### 4.3 A wide survey camera never mounts what it is grading

The survey ran on `overview` and `interior` only. Both are far enough that
personnel and forklifts render at reduced level of detail, so
`world-personnel` reported 0% albedo / 0% normal / **100% flat** and
`world-forklifts` reported **100% flat** — surveys of a billboard quad and a
procedural stand-in, while the authored GLBs those branches exist for were not
in the graph at all. `personnel-close` is now in `SURVEY_SCENES`, and the same
branches read:

| branch (at personnel-close) | flat | normal | rough | shader |
|---|---|---|---|---|
| world-forklifts | 38% | 7% | 0% | 55% |
| world-personnel | 88% | 12% | 12% | 0% |

### 4.4 A fourth motion channel: material animation

`audit-scene-motion.mjs` sampled position, orientation and instance matrices.
All three are TRANSFORMS, and a lot of what is alive here never moves: ceiling
fixture lenses, machine status beacons, the new dock lamps. `materialChecksum`
is the fourth channel and the audit prints `matAlive`.

It also closes the predecessor's second "animation zero",
`world-factory-infrastructure` — but **the closing argument is the source read,
not the audit**. The audit now says "nothing changes in any of four channels"
(0 moved, 0 turned, 0/21 instanced, 0/27 material). What says nothing SHOULD
change is reading the branch: there is no vent, fan, extractor or turbine
modelled anywhere in `OptimizedFactoryInfrastructure.tsx`, and
`useFixtureLensExposure` is gated on composer state rather than on the clock, so
it is exposure compensation and not a light cycle. A building shell with
constant-brightness fixtures is static because it is meant to be. Neither half
settles it alone: the fourth channel only removes the possibility that the zero
was another §6.4-style blind spot.

---

## 5. What was actually built

| item | before | after | evidence |
|---|---|---|---|
| `authored-dock-openings` surfacing | 100% flat | 47% flat, 13% normal, 47% rough | audit survey |
| dock openings animation | 0 moved, 0 turned, 0/6 instanced, 0% alive | 12 moved, 14 turned, 8/38 material, **23% alive** | `audit-scene-motion --seconds=75` |
| `world-personnel` detail maps | gated to `high`; shipping default rendered every worker flat | bound from `medium` up | `inspectObjects` |
| worker roughness colour space | **`roughnessMap: srgb`** the first frame it bound | `none` | `inspectObjects` |
| forklift tyres | the one class with neither map nor injection | `rubberNormal` at 0.6 | audit survey |
| canal | 434 m untextured across bed, walls and towpath | mud / concrete / panel-normal at `#ffffff` | `#7d6d5e` and `#2c3e50` are gone from the flat list; only the `#0a2a3a` depth wash remains, which is a tint and correctly flat |

Notes on the dock openings, which is the substantial piece:

- Every steel member was metalness 0.6-0.8 over a dark blue-grey. `#475569` is
  linear (0.062, 0.084, 0.113) — far too dark and far too blue to be any real
  conductor. They are painted dielectrics now, metalness a hard 0, each hex
  scaled in linear space by `(1 - m)^0.75`, exactly the rebalance
  `machineSurfaces.ts` documents. The scale is **computed** through
  `new THREE.Color(hex)`, so no hand-converted hex exists in the file to get
  wrong.
- The ORM and panel-normal keys are deliberately the ones `machineSurfaces.ts`
  already generates, so `getTexture` returns the same objects: no extra
  generation pass, no extra GPU upload.
- The opening is deliberately a see-through portal with **no shutter**, so
  "dock doors that never open" had no door to open. The honest mechanism is the
  one a real dock works with: a leveler plate that bridges onto the trailer bed
  when a truck berths and lies flat when it does not, and post lamps that read
  green for a free bay and red for an occupied one. Both are driven from
  `useTruckScheduleStore`, and the group carries `userData.dynamic` so
  `StaticMeshBatch` leaves it alone — a merged mesh cannot move and a merged
  material cannot change colour.
- **A 12 s motion sweep cannot see it.** `TRUCK_CYCLE_SECONDS` is 60, so the
  docked flag may not change at all inside the default window. Use
  `--seconds=75` on this branch.

**No branch regressed.** `interior` at the default 12 s reads
`world-personnel 277 objects, 240 moved, 133 turned, 35 transient, 99% of 242` —
identical to the predecessor's baseline, which matters because the roster groups
are now named and carry `userData`. The same branch at 75 s reads 630 transient
of 672; that is the longer window crossing six times as many level-of-detail
boundaries, not churn introduced here. **Compare motion audits at equal
`--seconds` or the transient column is meaningless.**

---

## 6. What remains, with counts

Ordered by summed world size of genuinely flat surface, which is now what the
audit prints.

1. **The merged static batches — 4,249 m, 221 meshes, 505 instances, largest
   110 m.** One `MeshStandardMaterial #ffffff` bucket spanning
   `authored-factory-exterior`, `world-logistics` and `authored-truck-yard`.
   These are `createMergedGeometry` outputs whose real colours ride vertex
   colours, so texturing them means texturing the SOURCE materials in
   `FactoryExterior.tsx` (522 untextured material declarations) and
   `TruckBay.tsx`, and every map added splits a merge group. This is the whole
   of the predecessor's items 1 and 2 and it is a several-session job with a
   real draw-call cost to weigh. Current `overview` is 1,227 calls.
2. **`authored-village`, 66% flat, 82 meshes.** Untouched this pass.
3. **`world-factory-infrastructure`, 44% flat, 27 meshes** — `factory-trim` at
   75 m over 87 instances is the largest single entry. Animation is closed as
   correct (§4.4); the surfacing is not.
4. **`world-personnel`, 88% flat at `personnel-close`.** The authored bodies
   carry the shared normal/roughness detail pair but no albedo, and
   `SharedWorkerMaterials` records why `worker_color.ktx2` must never be bound:
   the GLB unwrap spans roughly U/V [-1.0, 1.5] with no atlas intent. Per-surface
   albedo for the workers needs a real unwrap, not a bound file.
5. **The ~15 stale "above TerrainGround (y=0.05)" call sites** in §3.1.
6. **Predecessor §5.2 (texel density) and §5.3 (Tripo credits) are still Nell's
   calls and still unspent.** Nothing was regenerated this pass.
7. **`forklift` reports `triangles: 0`, every run.** Every other scene reports a
   real count (`overview` 806,314; `water` 1,349,750), and it reproduced in both
   art captures and in an independent probe. `rendererCounterPerFrame` already
   handles the cumulative-composer case, so a hard zero is far more likely a
   counter that never accumulated than a scene with no triangles in it. No
   conclusion in this document rests on it — draw calls were used throughout,
   and those reproduce exactly — but CLAUDE.md's "an absent term reads as
   exactly 1.000" tell applies here in its additive form, and a permanently-zero
   trustworthy number should be explained before it is relied on.

---

## 7. Instrument traps this pass paid for

Additions to the predecessor's §6. Each was a wrong reading that would have been
reported as a finding.

### 7.1 An offset that "cannot accumulate" accumulates when the clip is constant

§3.2. The reasoning in the comment was sound and the premise was false, and the
premise was a line of three.js source nobody had read. **Verify a claim about a
dependency against the installed source, not against how it ought to work** —
the predecessor's §2 made exactly the same move against `WebGLProgram.js` and
found exactly the same class of thing.

### 7.2 A camera constant is not a camera

Three separate layers were editing the pose between `SITE_LAYOUT` and the
rendered frame: the orbit rig's distance clamp, its polar clamps, and (in
non-benchmark mode) a collision resolver and a height floor. **Read the camera
back out of the runtime before trusting that a scene is framed where its
constant says.** `snapshot().camera.position` is one page load.

### 7.3 A survey is a survey of what was mounted

§4.3. Level of detail means a wide camera does not merely render the subject
smaller, it renders a DIFFERENT OBJECT. Any per-branch statistic gathered from a
site-scale camera describes the stand-ins.

### 7.4 Counting meshes counts modelling effort, not surface

§4.1.

### 7.5 An audit rule that does not know how the repo works produces busywork

§4.2. Three of the predecessor's five numbered items were substantially
overstated by a metric that only understood bound texture slots.

### 7.6 A subsystem read 0% because there was nothing in it that could move

`authored-dock-openings` had no shutter to open. The fix was not to animate what
was there but to model the mechanism that belongs there. Before treating a zero
as a missing driver, check that the thing has moving parts at all.

---

## 8. Gate commands

```bash
npm run typecheck && npm run lint && npm run format:check
npm test                     # baseline: 106 files, 1677 tests, 0 failures
npm run build
npm run validate:assets      # 34 entries
npm run validate:bundle
node scripts/audit-scene-models.mjs             # must stay at 0 blockers
node scripts/audit-scene-motion.mjs --scenes=interior,shipping --seconds=75
npm run capture:art -- --label=<name> --set=art # 12/12, zero diagnostics
```

`--seconds=75` matters on any branch touching the docks or the trucks: the truck
cycle is 60 s and the default 12 s window can miss every state change in it.

Standing constraints from the predecessor's §10 are unchanged, including:
`.capture.lock` is mandatory for anything that renders; `test-results/` is
gitignored and is where evidence goes; another session holds port 5199; deploy
on request only.

**Current status: local only — not live.**
