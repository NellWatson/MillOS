---
title: MillOS — all models, pass 3. The work list was measuring instance counts
date: 2026-08-17
status: correctness CLEAN repo-wide (21 scenes, 0 blockers); predecessor items 2, 3, 5 and 7 CLOSED; item 1 bounded and waiting on Nell; items 4 and 6 unchanged and still Nell's
branch: launch-audit-polish
predecessor: _contprompts/millos_all_models_pass2_2026-08-17.md
verification_criteria:
  - "Nothing here is reported from source. Every claim has a measurement or a frame behind it, and the measurement is named."
  - "`triangles: 0` was never a zero. It was Infinity, on every scene, from one draw call per text label - and `rendererCounterPerFrame` mapped zero, negative and non-finite to the same printed digit."
  - "A summed world size that multiplies a mesh's world radius by its instance count is an instance count. For an InstancedMesh the scale lives in `instanceMatrix`, so sixteen of nineteen rows in one branch came out at exactly 0.87 x count."
  - "`authored-village` is 66% flat by MESH COUNT and 42 m of flat surface by world size, of which 27 m belongs to item 1. Same meshes at every camera - the fix was the metric, not the camera, and the camera hypothesis was tried and disproved."
  - "Typecheck, lint, format, 107 files / 1683 tests, build, validate:assets, validate:depth, validate:bundle, a 21-scene model audit at 0 blockers and a 12/12 art capture with zero diagnostics are green on this tree."
---

# MillOS — all models, pass 3

## 1. The headline

**Two of the instruments this repo steers by were reporting the wrong quantity,
and both had been for the whole of the predecessor's work.**

1. `triangles` was **not zero, it was non-finite**, in every scene, not only in
   `forklift`. One draw call per `<Text>` label poisoned the accumulator with
   `Infinity` before its glyphs were laid out. Fixed at the single wrapper every
   in-scene label routes through; `forklift` now reports **601,425 triangles**
   where it reported 0 on every previous run, and `overview` reports **806,719**
   against the 806,314 the predecessor recorded from a run that happened to
   escape the poison.
2. The flat-material work list — the table that ordered predecessor items 1, 2
   and 3 — was **summing instance counts and printing them as metres**. Fixed;
   the ordering changed, and it removed one whole item from the list.

On the corrected instruments, three of the predecessor's five open work items
close: two on measurement, one on judgement with the reasons recorded in the
source. One closes on code. The rest are Nell's.

**Gates, green on this tree:**

```
npm run typecheck / lint / format:check    clean
npm test                                   107 files, 1683 tests, 0 failures
npm run build                              ok
npm run validate:depth                     55 active files, 12 relationships
npm run validate:assets                    34/34 PASS
npm run validate:bundle                    0.60 MiB initial gzip, 112.48 MiB dist
node scripts/audit-scene-models.mjs        21 scenes, 0 blockers, 1 benign warning
npm run capture:art -- --set=art           12/12, zero diagnostics (see below)
```

`interior` failed `longTasks` once on the handoff capture - a single 608 ms
main-thread stall at `loadPerCore` 2.11, with 109 FPS, p95 9.2 ms, clean
diagnostics and every other budget green. It did **not** reproduce: the same
scene on the same `dist/` re-ran at `longestTask` 0, 120 FPS, PASS. The three
captures before it also read 0. Reported rather than quietly re-run, because
CLAUDE.md's rule cuts both ways - a red benchmark is not a regression until you
have looked at load, and it is not noise until it has failed to reproduce.

Nothing is committed and nothing is pushed. **Local only — not live.**

---

## 2. Predecessor item 7: `triangles: 0`

### 2.1 It was never a zero, and it was never only `forklift`

`rendererCounterPerFrame` maps `<= 0` **and** non-finite to the same printed 0,
so a hard zero in the report could be a zero, a negative or a NaN — three
different bugs behind one digit. Measured first, before any hypothesis: raw
`gl.info.render` for `overview` read

```
{"frame":41,"calls":11798,"triangles":null,"lines":0,"points":2464,"autoReset":false}
```

`null` is a non-finite serialised through JSON. **`overview` was poisoned too** —
the predecessor's 806,314 came from a benchmark run whose post-warmup `reset()`
happened to land after the last poisoning frame.

### 2.2 The mechanism, verified against the installed dependency

troika's `GlyphsGeometry` (`troika-three-text@0.52.4`, `src/GlyphsGeometry.js:55-71`)
never assigns `instanceCount` in its constructor, so it inherits
`InstancedBufferGeometry`'s default of **Infinity** and only takes a real value
in `updateGlyphs()`, which runs after layout. Between mount and that callback the
mesh is a bare quad — `[position, normal, uv]`, 4 vertices, 6 indices — with **no
instanced attribute of any kind**.

That is what makes it undetectable. `WebGLBindingStates` sets
`geometry._maxInstanceCount` **only** where it binds an instanced attribute
(`WebGLBindingStates.js:361,403`), so with none present it stays `undefined`, and
`WebGLRenderer.js:1316-1317` resolves the draw as `Math.min(Infinity, Infinity)`.
The GL call is harmless — `primcount` converts to 0, nothing is drawn, nothing
looks wrong — but `WebGLInfo.update` runs first:

```js
render.calls ++;                                    // above the switch
switch ( mode ) {
  case gl.TRIANGLES:
    render.triangles += instanceCount * ( count / 3 );   // inside it
```

So draw calls stayed exact beside a triangle count that was permanently
non-finite. Benchmarks hold `info.autoReset` off for the whole measured window,
which makes one transient frame permanent — and `forklift` failed on **every**
run because that scene streams labels in and out and re-poisons the counter
after the post-warmup reset.

Live scan at 14 s: **83 instanced geometries in the scene, 0 still unbounded.**
Every one is a label that had already synced. The defect exists only in the
frames between mount and layout, which is why nothing ever caught it.

### 2.3 What was done

- `SceneText.initialiseGlyphInstanceCount` sets the count to **0** at mount.
  Zero specifically: `renderInstances` returns early on `primcount === 0`
  *before* calling `info.update`, so the draw disappears with the poison. troika
  overwrites it in `updateGlyphs()`/`applyClipRect()`, neither of which reads the
  previous value. Every in-scene `<Text>` in the app routes through `SceneText`
  (`TruckBay`'s local `Text` is a distance-gating wrapper around it), so one
  choke point covers all 83.
- `snapshot().renderer.raw` now reports the unnormalized accumulators with
  non-finite mapped to `null`, so a printed 0 can never again hide which of the
  three cases it is.
- `src/components/shared/__tests__/glyphInstanceCount.test.ts` drives the real
  `GlyphsGeometry`
  and asserts three's default is still non-finite. It is a dependency-behaviour
  test: if a future three or troika initialises the count, it fails and the fix
  becomes redundant rather than wrong.
- `audit-scene-models.mjs` gained an `instanced-geometry-without-count` blocker.
  **Read this as a backstop, not the guard.** The audit settles for 8 s, and the
  defect is transient by nature, so the rule can only catch a *permanently*
  unbounded geometry. The real regression detector is the triangle count itself,
  which integrates the whole window and goes non-finite on a single bad frame.

---

## 3. The work list was ordered by instance count

### 3.1 The bug

`RuntimeObjectReport.geometry.worldRadius` was `boundingSphere.radius x` the
mesh's **own** world scale, and the audit totalled a material with
`worldRadius * instanceCount`. For an `InstancedMesh` the per-instance scale
lives in `instanceMatrix`, not in the mesh's world matrix, so the container is
unscaled, `worldRadius` stays at the unit-box 0.87, and the product collapses to
`0.87 x count`.

Measured on `world-factory-infrastructure` — **sixteen of nineteen rows were
exactly `0.87 x instanceCount`**:

| material | reported | `largest x inst` |
|---|---|---|
| factory-trim | 78 m | 0.9 x 87 = 78.3 |
| factory-structure | 67 m | 0.9 x 74 = 66.6 |
| factory-glazing | 20 m | 0.9 x 22 = 19.8 |
| factory-gallery-rail | 16 m | 0.9 x 18 = 16.2 |

This is §4.1's own defect one level down. The list was moved off mesh count and
onto world size precisely because count ranks a hundred bolts above the wall
behind them — and for instanced geometry it had quietly stayed a count.

`measureWorldRadius` now decomposes every instance matrix. `worldRadius` is the
largest single draw; the new `worldRadiusSum` is the total, and the audit uses
that. **Do not multiply `worldRadius` by `instanceCount` in a consumer** — that
product is the bug.

### 3.2 The corrected list, at `overview`

| material | metres | largest | meshes | inst | branch |
|---|---|---|---|---|---|
| `MeshStandardMaterial #ffffff` | **3953** | 100.0 | 217 | 499 | the merged static batches |
| `factory-trim` | 3488 | 103.9 | 2 | 87 | world-factory-infrastructure |
| `factory-accent` | 762 | 103.9 | 1 | 8 | world-factory-infrastructure |
| `MeshBasicMaterial #ffffff` | 492 | 60.0 | 45 | 91 | world-logistics |
| `factory-glazing` | 364 | 16.5 | 1 | 22 | glass, correctly flat |
| `factory-walkway-paint` | 274 | 74.5 | 1 | 4 | transparent paint, correctly flat |

**`authored-village` does not appear anywhere in the top 24.** That is §3.4.

### 3.3 A residual bias, stated rather than left implicit

`worldRadius` is `geometryRadius x maxScaleAxis`, which is exactly what three
itself uses for frustum culling (`Sphere.applyMatrix4` /
`Matrix4.getMaxScaleOnAxis`). It is therefore consistent, and it **rewards
length**: a 120 x 0.18 x 0.22 m batten scores 104 m. Read the column as extent,
not as area, and check what a top row actually is before treating it as a job.
That is precisely what happened with `factory-trim` in §4.

### 3.4 Predecessor item 2: `authored-village` — 66% is a mesh count

`authored-village` reads **32% albedo, 66% flat, 82 meshes**, which is what put
it on the work list as a branch-scale texture job. Measured by world size at the
`village` camera, the same 82 meshes are:

- Every building carrying `map + normalMap + roughnessMap + metalnessMap` —
  cottage, shop, church, town hall, pub, school, forge, market stall, duck pond,
  fountain, wishing well, postbox, ducks, cat.
- **42 m of flat surface in total**, of which **27 m is a `static-merge` output**
  whose colours ride vertex colours — i.e. item 1's problem, not the village's.
- A residual of **15 m across 49 meshes, largest 0.8 m**: fence posts, branches,
  a few dark props, and 21 near-invisible haze quads at opacity 0.05.

54 of 82 meshes flat is 66%, and those 54 meshes are 13% of the branch's
surface. Both numbers are right; only one of them is a work list.

**The camera hypothesis was tried and is wrong, which is worth recording because
it is the obvious next move.** §4.3 of the predecessor fixed a real wide-camera
trap for personnel and forklifts, so `village` and `farm` were added to
`SURVEY_SCENES` on the assumption the same applied. It does not: those branches
mount the same meshes at every camera, and the two new survey blocks came back
**byte-identical to `overview`'s, row for row**. That is CLAUDE.md's inert-term
tell in its equality form. The change was reverted and the measurement recorded
in `SURVEY_SCENES`' comment so the next pass does not repeat it.

---

## 4. Predecessor item 3: `world-factory-infrastructure`, judged rather than textured

With the metric fixed, `factory-trim` is the branch's largest flat entry by a
factor of 3.5 (3,488 m against 976 m). It is **left flat on purpose**, and the
reasoning is now recorded on the material itself so the next pass does not
re-litigate it:

1. **The metric rewards length, not area.** 78 of the 87 instances are the roof
   standing seams, which are **0.45 m wide**. Their summed extent is enormous and
   their surface is not.
2. **They are already the detail.** The seams exist so the roof deck stops
   reading as a painted rectangle, and `roofDetails` records that they were
   widened to 0.45 m specifically to survive SMAA at the overview camera's 74 m.
   Confirmed in that frame: they read as lines. Texturing them is texturing the
   texture.
3. **No single tiling can be correct.** `InstancedBoxes` draws every instance
   from one shared `UNIT_BOX`, so a `band()` repeat stretches with each
   instance's scale — and this set spans 118 x 0.3 x 0.3 trusses, 120 x 0.18 x
   0.22 eave trim, 5 x 1 x 3 roof units and the battens. Over **300:1** of aspect
   variation against one UV layout. It is the same constraint `ChamferStrip`
   already documents for geometry.

The same three apply to `factory-accent` (0.55 m facade sills and headers) and
`factory-gallery-rail` (a 0.14 m tube in 43 m runs sharing an instanced set with
1.45 m stanchions). `factory-glazing`, `factory-skylight`, `factory-fixture-lens`
and `factory-walkway-paint` are flat by construction — glazing, an unlit lens and
a transparent marking have nothing for a surface map to do.

**Verdict: the branch's 44% flat is not a work list.** Its animation was already
closed as correct by the predecessor's §4.4; its surfacing is now closed as
judged, with reasons, in `OptimizedFactoryInfrastructure.tsx`.

---

## 5. Predecessor item 5: the stale terrain datum

Fifteen sites, not the eleven the exact-phrase grep found — two more carried the
same defect in different words (`{/* Small path - raised to y=0.15 ... */}`,
`{/* Road surface inside tunnel ... */}`), and the two 60 x 60 m truck yards
cited *"main asphalt at y=-0.05"*, a surface that no longer exists anywhere in
`TruckBay.tsx`.

**The repo had already decided this one.** The canal towpath was moved to
`EXTERIOR_LAYERS.ground` + `POLYGON_OFFSET.exteriorTop` in the previous pass with
a comment naming this exact stale-0.08 problem, and CLAUDE.md's "Exterior Ground
Z-Fighting Prevention" calls Y-separation `BAD - creates visible seams at surface
boundaries`. The terrain's own splat map **already paints roads and the asphalt
yard**, so these authored planes were hovering 10 cm over the surface they
duplicate.

| classification | sites |
|---|---|
| moved to the ground datum + documented offset | gravel path, curved path, parking lot + markings, connecting road + lines, checkpoint stop lines, tunnel road, parkland path, both 60x60 truck yards, both dock aprons, both tunnel access roads + centre lines, village cobble plaza, dead `EmployeeParking` |
| kept, comment corrected, reason recorded | pond stone kerb (10 cm proud is what a kerb should be), canal water, lake surface, pond water (wave displacement is +/-0.035, so the trough reaches 0.115 and must clear the kerb at 0.08 — independently justified, NOT terrain clearance) |

Two of them had no `polygonOffset` at all and now carry `exteriorTop` /
`exteriorOverlay`, because coplanar makes the offset load-bearing where 10 cm of
air used to do the work.

### 5.1 Verified in pixels, and it uncovered buried content

Two full art captures, before and after. Draw calls unchanged (`overview`
1227 -> 1226 -> 1227). **Z-fighting was tested for directly**: two frames of the
same run must be identical where nothing moves, so intra-run instability is the
discriminator.

| scene | before | after |
|---|---|---|
| village | 4.43% | 4.46% |
| shipping | 6.36% | 5.91% |
| yard | 15.83% | 14.63% |
| overview | 4.15% | 4.15% |
| water | 7.04% | 6.59% |
| farm | 7.73% | 7.98% |

Restricted to the moved surfaces themselves, village 2.69% -> 2.75% and shipping
0.56% -> 0.49%. **No new instability anywhere**; the residual is the animated
world, and untouched `packing` moved 3.09% between runs for comparison.

The frames then showed something the numbers could not: **a "TRUCK STAGING"
ground label at y=0.05, under a yard slab at 0.08, that has never been visible in
any capture.** The same 10 cm was burying the yard's chevrons, the dock groove
stripes, and the base of every piece of yard equipment authored at y=0. Those
were re-datumed with the surfaces they are painted on, which is the part of this
item that was actually worth doing.

### 5.2 The art set does not contain the scene the back yard is in

`--set=art` is `overview, interior, silos, milling, packing, shipping, yard,
water, village, farm, forklift, personnel-close`. **`receiving`, `personnel` and
`personnel-feminine` are not in it**, and the back truck yard was edited
symmetrically with the front - yard, apron, access road, centre line, label and
groove stripes - so every pixel check above had seen only the z=+50 side. The
back yard is also not a content mirror: `FuelIsland`, `TireInspectionArea`,
`DumpsterArea` and `CardboardCompactor` mount only on that side, at y=0, and were
8 cm under the old slab.

Captured separately: `receiving` 115.8 FPS PASS, `personnel` 120.1 PASS,
`personnel-feminine` 120.0 PASS. The back dock reads correctly - truck on the
tarmac with contact shadows, apron flush and bounded by its groove stripes,
chevron pad and bollards seated, canopy posts meeting the ground, the back
"TRUCK STAGING" label legible. No floating, clipping or fighting. The pass-2
§3.1 terrain speckle is still absent from the lower third of
`personnel-feminine`, which was one of the four scenes it filled.

**Grade the back yard on `receiving`, not on `shipping`.**

---

## 6. What remains, with counts

1. **The merged static batches — 3,953 m, 217 meshes, 499 instances, largest
   100 m.** One `MeshStandardMaterial #ffffff` bucket spanning
   `authored-factory-exterior`, `world-logistics` and `authored-truck-yard`.
   Unchanged in substance from the predecessor's item 1, but **now bounded**:

   - `mergeMaterialSignature` includes `textureSignature()` for all seven map
     slots, so every distinct texture set becomes its own merge group, keyed
     again per 80 m cell, and a group under `MINIMUM_MERGE_MESHES` (4) is not
     merged at all.
   - Measured on the current tree: static batching absorbs **171 originals into
     32 batches across all branches — a saving of 139 draw calls out of 1,227.**
     So the entire downside of texturing these source materials is bounded by
     **+139 calls, 11%**, and only if every merge group is destroyed. It is
     almost certainly far less: `authored-factory-exterior` alone offers 2,094
     candidates and merges only 44 of them today.
   - The work itself is still large — 579 material elements in
     `FactoryExterior.tsx` (19 with a map) and 492 in `TruckBay.tsx` (7 with a
     map) — and it is still several sessions.

   **This needs Nell's call on the draw-call budget, and now has a number to
   answer against.**

2. **`world-personnel`, 88% flat at `personnel-close`.** Unchanged and still
   blocked on asset work, not code: `SharedWorkerMaterials` records that the GLB
   unwrap spans roughly U/V [-1.0, 1.5] with no atlas intent, so
   `worker_color.ktx2` must never be bound. Per-surface albedo needs a real
   unwrap.

3. **Predecessor §5.2 (texel density) and §5.3 (Tripo credits) are still Nell's
   calls and still unspent.** Nothing was regenerated this pass.

4. **`MeshBasicMaterial #ffffff`, 492 m, 45 meshes, 91 instances, largest 60 m,
   in `world-logistics`.** Not previously called out. Unlit and untextured at
   60 m is worth one look to confirm it is signage and not something that should
   be shading.

**Closed this pass and off the list:** predecessor item 2 (`authored-village` —
measured, 42 m flat of which 27 m belongs to item 1), item 3
(`world-factory-infrastructure` — judged, reasons in source), item 5 (the terrain
call sites — 15 of them), item 7 (`triangles: 0` — root-caused and fixed).

---

## 7. Instrument traps this pass paid for

### 7.1 A counter that maps three failures to one digit

§2. Zero, negative and NaN all printed as `0`. The first useful measurement was
not "which scene is wrong" but "what is the raw value" — and it was `null`.

### 7.2 An aggregate can be a count wearing the unit of the thing you wanted

§3.1. `worldRadius * instanceCount` looks like a total size and is a total count
whenever the scale lives in `instanceMatrix`. The tell was that sixteen rows in
one branch came out at exactly `0.87 x n` — **check an aggregate against its own
factors before ordering work by it.**

### 7.3 The fix that worked last time is a hypothesis, not a diagnosis

§3.4. The predecessor's wide-camera correction was real and dramatic, which made
it the obvious explanation for the next branch that looked over-reported. It was
not the explanation, and the way that showed was two survey tables coming back
**byte-identical**. An instrument change that produces no delta has told you
something — just not what you were hoping. Revert it and keep the measurement.

### 7.4 A metric that rewards length will nominate trim

§3.3, §4. The top row of a corrected, trustworthy list was still the wrong job,
because summed max-axis radius is extent and a viewer sees area. Look at what a
row IS before working it.

### 7.5 Moving a surface reveals what was under it

§5.1. The z-fighting risk was the thing being watched for, and it did not
happen. What happened instead was that three classes of authored content came
out from under a slab that had been hiding them. **When a surface moves, audit
what was on both sides of it, not just whether it fights.**

### 7.6 A documented "why this map is absent" is evidence, and so is re-measuring it

§4. The rule is do not add the missing map — but the reason to keep it here was
not deference, it was that the corrected number, the roof frame and the shared
`UNIT_BOX` all agreed with the comment. Two of those three were not available to
the author who wrote it.

---

## 8. Gate commands

```bash
npm run typecheck && npm run lint && npm run format:check
npm test                     # baseline: 107 files, 1683 tests, 0 failures
npm run build
npm run validate:assets && npm run validate:depth && npm run validate:bundle
node scripts/audit-scene-models.mjs             # must stay at 0 blockers
node scripts/audit-scene-motion.mjs --scenes=interior,shipping --seconds=75
npm run capture:art -- --label=<name> --set=art # 12/12, zero diagnostics
```

Probes written this pass live under `test-results/pass3/` (gitignored):
`triangle-counter-probe.mjs`, `nan-draw.mjs` (finds the poisoning draw and names
the object), `branch-flat.mjs <branch> [scene]` (every flat mesh in one branch
with real world sizes — the site-wide table is capped at 24 rows).

**Compare two captures by intra-run instability, not only by before/after
difference.** A before/after diff cannot separate "the surface moved" from "the
surface is now fighting"; two frames of the same run can, because static
geometry must be identical between them.

Standing constraints from the predecessor are unchanged: `.capture.lock` is
mandatory for anything that renders; `test-results/` is gitignored and is where
evidence goes; another session holds port 5199; `--seconds=75` on any branch
touching the docks or the trucks; deploy on request only.

**Current status: local only — not live.**
