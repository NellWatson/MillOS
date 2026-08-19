---
title: MillOS — polish every remaining model. A work order, measured, ordered, with the traps named
date: 2026-08-18
status: WORK ORDER for a fresh context. The bulk surfacing pass is DONE (see predecessor); what is here is the residue, and most of it is small, specific and checkable
branch: launch-audit-polish
predecessor: _contprompts/millos_all_models_pass4_2026-08-18.md
read_first:
  - "CLAUDE.md § World Surface Treatment. It is new, it is the subsystem you will be extending, and it contains the two unit traps that pass 4 paid for."
  - "CLAUDE.md § Measuring a Visual or Performance Change. Every rule in it was earned; four of them were re-earned in pass 4."
  - "_contprompts/millos_all_models_pass4_2026-08-18.md §7, the instrument traps. Item 7.6 in particular: 129 of pass 4's edits were in a file nothing imports."
verification_criteria:
  - "`audit-scene-models.mjs` CANNOT verify surfacing work. It marks a mesh finished on the MERE PRESENCE of a shader injection. Use `npm run measure:surfaces` as the paired control, and read an exactly-zero changed fraction as an inert term."
  - "Grep for who imports a file, and confirm a distinctive string from it appears in `dist/assets/`, BEFORE editing it. Four modules in this repo are unreachable dead code."
  - "A flat percentage is a MESH COUNT. Read it beside the world-size column or you will work a hundred bolts before the wall behind them."
  - "Capture at night as well as at noon. An entire defect class was invisible for four passes because every capture was at --time=12."
---

# MillOS — polish every remaining model

## 0. Where this starts

Pass 4 closed the flat-material work list. Every row above 100 m that survives is
correctly flat by construction, and the three rows that had topped the list for
three passes (3,953 m, 3,488 m, 762 m) are gone — finished by an analytic
world/object-space treatment (`src/utils/worldSurface.ts`) at **zero draw-call
cost**, rather than by the textures three predecessors had reached for and
correctly refused.

So this is not a "the models are unfinished" brief. It is the residue, and the
residue is small, specific and individually checkable. **The largest risk now is
not missing work — it is doing work that changes nothing and reporting it as a
fix.** Pass 4 did exactly that with 129 edits. Read §5 before you start.

Gate baseline on this tree, all green, reproduce before changing anything:

```
npm run typecheck / lint / format:check    clean
npm test                                   108 files, 1715 tests, 0 failures
npm run build                              ok
npm run validate:assets                    34/34 PASS
npm run validate:depth                     55 active files, 12 relationships
npm run validate:shaders                   24 families, 25 stable cache keys
npm run validate:bundle                    0.60 MiB initial gzip, 112.49 MiB dist
node scripts/audit-scene-models.mjs        21 scenes, 0 blockers, 1 benign warning
npm run measure:surfaces                   9/9 scenes moved, no inert readings
npm run capture:art -- --set=art --perf-gate   12/12 art PASS + 12/12 perf PASS
```

**Local only — not live.** Nothing is committed.

---

## 1. The work, ordered by what a viewer actually sees

Take one numbered item, finish it completely, re-measure, report the delta.
**Do not part-deliver an item and present the remainder as a plan**; if you run
out of room mid-item, say which meshes remain, with counts.

### 1.1 `world-conveyors` — the only branch in the scene with NO shader at all

```
world-conveyors   163 meshes   21% albedo  72% normal  75% rough   0% shader   20% flat
```

Every other branch is now between 26% and 100% shader-finished. This one is at
zero, and it is 163 meshes of belts, rollers, frames and guide rails threading
through `interior`, `milling`, `packing` and `silos` — four of the twelve art
scenes. It already has normal and roughness maps on three quarters of its meshes,
so this is not a texturing job; it is the same analytic finish every other branch
received, and it should take one sitting.

Flat rows inside it: `MeshStandardMaterial #c8ccd0` 25 m / 1 mesh / 25 instances
(largest 1.0 m — a repeated roller), plus the branch's 20% flat tail.

Owner: `src/components/ConveyorSystem.tsx` and `src/components/conveyors/`.
Profile: `metal` for rollers and frames, `painted` for guards, `vehicle`
(object space) for anything that translates with the belt. Check which of those
actually move before choosing the space — a static frame in object space loses
the per-instance variation that makes repeated prefabs stop reading as repeats.

### 1.2 Ground-painted `<Text>` is the last thing glowing at midnight

Pass 4 converted 59 live painted-marking sites from `MeshBasicMaterial` to
`meshStandardMaterial` and took `shipping` at `--time=22` from **20,203 bright
ground pixels to 0**. One thing on the ground is still at full daylight
brightness after dark: the "TRUCK STAGING" label painted on the yard, and its
siblings. They are troika `<Text>`, which is unlit by construction.

**Why it was left, and what makes it non-trivial.** `src/components/shared/SceneText.tsx`
is the single wrapper every in-scene label routes through — 83 of them, per the
live scan in pass 3 §2.2 — and many are status readouts that are *meant* to stay
legible regardless of lighting. Changing the wrapper changes all of them.

The shape of the fix: troika's `Text` accepts a `material` prop, so add an opt-in
(`lit` / `painted`) to `SceneText` that binds a `MeshStandardMaterial`, and use it
ONLY at the ground-label call sites. Enumerate those first — they are the ones
whose `rotation` is `[-Math.PI / 2, ...]`.

Verify with `npm run capture:art -- --scenes=yard,shipping --time=22` and the
bright-pixel count, not by eye.

### 1.3 `world-logistics` — 60% flat by MESH COUNT, small by world size

**Read both columns.** The branch reads 60% flat over 309 meshes, which looks
like the biggest remaining item and is not: the truck bodywork already carries
`vehicleSurface`, and the residual is small parts. Measured rows, `overview`:

| material | metres | meshes | inst | largest |
|---|---|---|---|---|
| `MeshStandardMaterial #ffffff` | 118 | 21 | 149 | 3.0 m |
| `MeshStandardMaterial #3b82f6` | 50 | 2 | 6 | 10.0 m |
| `MeshStandardMaterial #fbbf24` | 36 | 4 | 6 | 12.5 m |
| `MeshPhysicalMaterial #2e87ac` | 19 | 3 | 3 | 8.3 m |
| `MeshPhysicalMaterial #c65d35` | 19 | 3 | 3 | 8.3 m |
| `MeshStandardMaterial #1e3a5f` | 17 | 3 | 15 | 1.3 m |
| `MeshStandardMaterial #64748b` | 14 | 4 | 4 | 4.9 m |

That is roughly 270 m in total against the 8,000 m pass 4 finished. Do it, but do
it knowing the size — and this is exactly the reading pass 3 §3.4 established for
the village, where 66% flat turned out to be 15 m of fence posts.

### 1.4 `authored-dock-openings` — 42% flat, 26% shader, and 0% albedo

38 meshes. The predecessor called this branch "the single biggest flat block in
the scene AND a dead subsystem"; the animation half was fixed two passes ago and
the surfacing half is now partly done through the batcher. `MeshStandardMaterial
#eab308` 26 m and `MeshBasicMaterial #fef9c3` 29 m are the two named rows; the
second is a light-spill quad and is **correctly unlit** — leave it.

### 1.5 `world-personnel` and `world-forklifts` — the last third

```
world-personnel   244 meshes   67% shader  33% flat   (was 88% flat)
world-forklifts   112 meshes   63% shader  30% flat   (was 38% flat)
```

Both were finished in OBJECT REST SPACE in pass 4 — bodies, garments, skin,
accessories, the compact forklift set. What is left is the tail: `#fef3c7` 40 m /
6 meshes on the forklifts, `#1f2937` 18 m / 16 meshes, `MeshBasicMaterial
#000000` 17 m / 13 meshes in personnel (check whether that is a shadow blob
before touching it — those are correctly unlit).

**Rest space, not world space, for anything on a person or a vehicle.** A
world-space field on a walking body makes the detail swim; the coordinate-space
table in `worldSurface.ts` says which term uses which.

### 1.6 The 53 zero-opacity meshes drawn every frame

The audit's one standing warning, in all 21 scenes:

```
[WARN] zero-opacity x53 meshes (53 instances) in 21 scene(s)
  transparent at opacity 0 - drawn every frame and contributes nothing
  e.g. forklift-1/forklift-billboard/<Mesh> | authored-forklift-cargo-mast/<Group>/<Mesh>
```

These are the LOD billboards. They are also why the audit's `overview` block
still reports `world-personnel` and `world-forklifts` at 100% flat while
`personnel-close` reports 33% and 30% — a site-scale camera renders the
stand-ins, not the authored bodies (pass 2 §7.3).

Either they should be `visible = false` when their opacity is 0, or the opacity
is a bug and they should be showing. **Find out which before changing it** — a
billboard at opacity 0 may be mid-crossfade, in which case a single frame is a
misleading sample. Sample it over time with `audit-scene-motion.mjs`.

### 1.7 A reachability audit, once, written down

Pass 4 converted 129 materials in `infrastructure/FactoryWalls.tsx` before
discovering that **nothing imports it**. `machineSurfaces.ts` has recorded
`components/Machines.tsx` and the `Instanced*.tsx` tree as dead for two passes,
and `FactoryWalls.tsx` now carries the same header, but there is no list.

Produce one: for every module under `src/components/`, whether a distinctive
string from it appears in `dist/assets/`. That is a twenty-line script and it
would have saved a whole afternoon. Put it in `scripts/` so it can be a gate, not
a probe.

### 1.8 Judge the treatment blind, because it was tuned by eye

Eight profiles in `worldSurface.ts` carry hand-tuned amplitudes. Two were already
corrected against captured frames — masonry dust from 0.24 to 0.18 because a shed
roof went from teal to olive, and the whole masonry budget moved from relief into
tone — but the rest are one person's judgement on a handful of frames.

`npm run review:stage-ab` plus the `blind-ab-judge` agent exists for exactly
this. Stage the `--disable-systems=surfaces` arm against the control and get an
unlabelled verdict per scene. A profile the judge calls a regression is worth
more than any contrast ratio.

---

## 2. The two product calls, unchanged and still Nell's

**Do not spend either without asking.**

### 2.1 Texel density: one word, ~37 MB of VRAM

`barn` is the only generated asset measurably under-resolved: **2.32 px/texel at
1024, 1.16 at 2048**, where ~1.0 is ideal. The other five in the `texture: 1024`
set sit at 1.59 or below and would be *over*-resolved at 2048 (0.41-0.80), paying
roughly 4x memory for detail no camera can see.

The change is `texture: 2048` on `farm-barn` alone in `GENERATED_ASSETS`
(`scripts/normalize-model-assets.mjs`). The 4096 originals are preserved under
`assets/source/models/`, so it costs no generation credits.

Two frictions: the cost is GPU texture memory, not bundle bytes (there are 57 MiB
of bundle headroom — `validate:bundle` reads 112.49 of 170 MiB); and the
normalizer has **no per-asset filter**, so taking it regenerates all 30 shipped
assets. Cheap to do deliberately on a clean tree; wrong to do incidentally on a
dirty one.

### 2.2 Tripo credits: real money, unspent

Last recorded 1,435 of 3,500, at ~30 credits per generation and ~25 per rig.
Options recorded two passes ago: markings variants (~8-10 generations, the only
non-tint fix for the remaining sameness), a newer `model_version` (existence
**unverified**, and it is regenerate-everything-or-nothing), and `face_limit`
above 8000 judged against the farm's existing +948,739 triangles.

**Get Nell's go-ahead before spending.**

---

## 3. Judged and CLOSED. Do not re-open without new evidence

Each of these looks like work and is not. The reasons are recorded in the source
as well as here; if you disagree, overturn them the way pass 4 overturned two
pass-3 closures — **on new grounds, stated, in the source** — not by quietly
re-litigating the old ones.

| thing | metres | why it stays |
|---|---|---|
| `factory-glazing` | 364 | Glass. Transparent, and nothing for a surface map to do. |
| `factory-walkway-paint` | 274 | A transparent floor marking. Same. |
| `machine-hardware` | 195 | Sub-0.25 m members. `machineSurfaces.ts`: a grid tiled onto a 0.075 m rail is sub-pixel noise that mips to a flat constant. |
| `MeshBasicMaterial #ffffff` | 191 | troika glyph meshes. See §1.2 for the part of this that IS work. |
| `MeshBasicMaterial #0a2a3a` | 144 | The canal's water-depth plane, seen THROUGH translucent water. Unlit on purpose; the row is large only because `worldRadius` rewards length and a canal is long. |
| `factory-fixture-lens` | 72 | An unlit lamp lens. It emits. |
| `factory-skylight` | 57 | Transparent roof glazing. |
| ad panels, statutory exit signage | — | Internally illuminated in reality. Deliberately still `MeshBasicMaterial`; see the rule in CLAUDE.md § "Painted surfaces are lit; light sources are not". |

---

## 4. Instruments, and which question each one answers

| instrument | answers | CANNOT answer |
|---|---|---|
| `node scripts/audit-scene-models.mjs` | is any mesh defective (colour space, NaN, unbounded instancing, mirrored transform); what is flat, by branch and by world size | whether a shader injection DOES anything — it scores presence |
| `npm run measure:surfaces` | does the treatment change pixels, where, and by how much; an exact zero is an inert term | whether the change is an IMPROVEMENT |
| `npm run review:stage-ab` + `blind-ab-judge` | did this iteration help | whether it is good enough |
| `visual-fidelity-judge` | is it good enough, against a written rubric | anything about a surface no camera frames |
| `npm run capture:art -- --perf-gate` | 12 scenes, art frames plus a conjoined non-art budget run | anything at night — see below |
| `capture:art --time=22` | unlit surfaces, glowing paint, night legibility | daylight tonal balance |
| `node scripts/audit-scene-motion.mjs` | is it animating, in all four channels | why it is not |

**Add the night capture to whatever you run.** It is one line and it caught a
defect class that survived four passes:

```bash
npm run capture:art -- --label=<name>-night --scenes=yard,shipping --time=22
```

---

## 5. Read this before you edit anything

Five traps, all of them paid for, in the order you are most likely to hit them.

### 5.1 Check the file is alive BEFORE you edit it

Pass 4 converted 129 materials across five interior rooms in
`infrastructure/FactoryWalls.tsx`, on strong evidence: the meshes carried
`castShadow` and `receiveShadow`, which an unlit material can never honour, so the
author's intent was recorded right beside the material that made it impossible.

Nothing imports that file. `FactoryWalls` is exported by
`infrastructure/index.ts` and consumed only by `components/FactoryInfrastructure.tsx`,
which nothing imports. Verified in the BUILD, not by reading: `SAFETY FIRST`, a
label that exists only in that file, appears nowhere in `dist/assets/`.

```bash
grep -rn "<ComponentName" src | grep -v "0.10 Archive"     # who mounts it
grep -rl "<a distinctive string from the file>" dist/assets/  # does it ship
```

Known dead: `components/FactoryInfrastructure.tsx`,
`infrastructure/FactoryWalls.tsx`, `components/Machines.tsx`, the
`Instanced*.tsx` tree. §1.7 asks for the full list.

### 5.2 A gate that scores presence cannot score effect

`audit-scene-models.mjs`:

```js
if (mesh.material.shaderInjected) entry.shaded += 1;
else if (slots.size === 0)        entry.flat  += 1;
```

Attach any `onBeforeCompile` and the row leaves the work list whether or not a
pixel changed. **Build or run the paired control BEFORE the change**, because
afterwards the gate is green either way and there is nothing left to compare
against. `npm run measure:surfaces`.

### 5.3 Check the arithmetic BETWEEN two authored numbers

`reliefMetres` was authored as a 0-1 strength and consumed as METRES of bump
amplitude, because `perturbNormalArb`'s `dHdxy` must match its `surf_pos` units
and `surf_pos` is view-space metres. `painted` asked for 0.35 m of relief over a
0.55 m period: a slope of 1.27, a 52 degree tilt. A lamp post rendered as a stack
of hard blocks.

Every number was individually plausible. Only their ratio was absurd.
`worldSurface.test.ts` now pins relief/period below 0.12 and meso period above 4
screen pixels at its own fade distance; extend those tests rather than working
around them.

### 5.4 Two correct terms can be wrong together

Grime is splash up a wall. Dust settles on a ledge. Their domains are
complementary and the one place they overlap — a horizontal surface at ground
level — is the largest surface in the frame. Letting them stack turned the 60 m
truck apron into a sand beach and REDUCED local contrast (×0.922) while moving
44% of the frame.

**When you add a second mask, ask where it saturates at the same time as the
first.**

### 5.5 A clone is not a copy

`THREE.Material.copy()` deep-copies userData through
`JSON.parse(JSON.stringify(...))` and does NOT copy `onBeforeCompile`. A clone of
a treated material therefore carries flattened `{r,g,b}` colours, a detached
`{value:1}` where the shared uniform was, and no shader. Guard on object
IDENTITY, never on presence — `hasWorldSurface()` is the pattern.

`StaticMeshBatch` clones a representative material on every merge, so this is the
common path, not an edge case.

---

## 6. Standing constraints

- `.capture.lock` (`scripts/lib/capture-lock.mjs`) is mandatory for anything that
  renders. Two headless Chromium instances on one GPU do not fail, they each run
  at half speed, and the frame rate in your report becomes a measurement of the
  other process. The lock is re-entrant through `MILLOS_CAPTURE_LOCK_PID`.
- `test-results/` is gitignored and is where evidence goes. Probes from pass 4
  live in `test-results/pass4/`.
- **Another session holds port 5199.** Do not take it.
- A red benchmark is not a regression until you have looked at `load`; above ~3.0
  runnable per core, re-run later rather than relaxing a budget.
- This machine drifts ~1.9 ms across identical runs. Interleave arms, run at
  least three pairs, and report the control-only spread beside any delta. A delta
  smaller than the spread is not a result.
- `--seconds=75` on any motion audit touching the docks or the trucks.
- Deploy on request only. End every report with exactly one of "local only — not
  live" or "live — verified in the served bytes".
