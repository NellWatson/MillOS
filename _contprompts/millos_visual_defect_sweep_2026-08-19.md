---
title: MillOS — sweep the world for visual defects. Every fault Nell has reported lived where no camera looked, so the job is to go look
date: 2026-08-19
status: WORK ORDER. The tree is committed and clean at a5413e5 for the first time in three passes. Lead with the sweep
branch: launch-audit-polish
predecessor: _contprompts/millos_polish_all_remaining_models_2026-08-18.md
sibling: _contprompts/millos_tripo_model_polish_2026-08-18.md (the paid generation work, unspent, still Nell's call)
read_first:
  - "CLAUDE.md § Measuring a Visual or Performance Change, and § World Surface Treatment."
  - "§2 below, THE METHOD. It is four steps and every one of them was learned by getting it wrong first."
  - "`npm run validate:reachability` before editing an unfamiliar file. 91 of 476 modules are dead and several look exactly like live code."
verification_criteria:
  - "A DEFECT IS FOUND IN PIXELS, NOT IN SOURCE. Every fault in the last round was invisible in the code and obvious in a frame - a road through a car park, water wider than its channel, a sign with its field and frame inverted. Read the source to explain a defect, never to find one."
  - "ROOT-CAUSE FROM THE LIVE SCENE. `inspectObjects` gives world positions and bounding radii. The car-park road was identified because a bounding radius of 17.68 is exactly sqrt(2.5^2 + 17.5^2); no amount of reading the JSX would have produced that."
  - "AN OBLIQUE CAMERA CANNOT JUDGE ALIGNMENT. A quarter turn was removed from the parked cars on the strength of an oblique frame, and it was wrong. A plan view settled it in one capture."
  - "RE-VERIFY THE WHOLE WATCHLIST after any later edit, not just the thing you touched. Keep a running list of every defect reported or found in the session."
  - "The art gate reviews 12 of 25 cameras. A green gate is silence about the other 13, not evidence."
---

# MillOS — sweep the world for visual defects

## 0. Why this is the lead task

Nell has reported three faults in the last round: the cars, the river tiles, the
Dead Dino sign. All three were real, all three were fixed — and **all three were
in places no benchmark camera framed.** That is not a coincidence, it is the
shape of the problem:

| | |
|---|---|
| cameras defined in `BENCHMARK_SCENES` | **25** |
| cameras the `art` gate actually captures | **12** |
| cameras that existed before the last round | 21 |
| of those, framing the car park, forecourt or river | **0** |

The gate can only fail on what it looks at. Every defect found so far was found
because a person happened to fly past it, and the fix each time began with
*adding a camera*. So the task is to do that systematically instead of waiting
for Nell to spot the next one.

**The tree is committed.** `a5413e5` is a single checkpoint carrying passes 5-7
plus the exterior fixes; `git status` is clean. Work from there.

---

## 1. The sweep

### 1.1 What has a camera, and what does not

25 scenes exist: `overview, interior, silos, milling, sifting, packing,
personnel, personnel-close, personnel-feminine, forklift, shipping, receiving,
yard, water, village, farm, paddock, square, garage, markings, forecourt,
carpark, river, sun, moon`.

The exterior is roughly 320 x 300 m and `FactoryExterior.tsx` alone mounts well
over a hundred placed features. Enumerate them and diff against the cameras:

```bash
grep -nE "^\s+<[A-Z][A-Za-z]+ position=\{\[" src/components/FactoryExterior.tsx
```

Named features with no camera on them at the time of writing include, and this
list is a starting point rather than an inventory: the tunnel entrance and its
connecting roads, the Nissen huts, the office apartment blocks, the bus stop,
the brick carport, the picnic areas and their waste bins, the lake, the
decorative pond, the canal and its lock, the weighbridge, the substation, the
security kiosk, the front gate and checkpoint, the perimeter fence runs, the
path lamps, the info signs, the caravan behind the gas station, the railway
line and level crossing along the west boundary.

### 1.2 Add cameras in batches, capture, and LOOK

Add a batch of review cameras (§2.1 has the mechanics), capture them, and read
every frame. Expect roughly one real defect per three or four unreviewed areas —
that is the rate the last round ran at.

Judge each frame against the questions that actually found things:

1. **Does anything intersect anything it should not?** The road through the car
   park, the water over the bank. Two coplanar surfaces at the same ground datum
   is the specific failure; `EXTERIOR_LAYERS.ground` is shared by every exterior
   surface deliberately, so overlap is a placement bug rather than a Y bug.
2. **Is anything standing on nothing?** Vehicles and props on bare grass with no
   hardstanding. `Hardstanding` in `FactoryExterior.tsx` now exists for this.
3. **Does anything read as the wrong material?** A sign face wearing cladding
   mottling, a lit label darker than its floor.
4. **Does anything float, sink or clip?** Check against the ground blob and the
   terrain, not against y=0.
5. **Is the thing legible at the distance it is read from?** A pylon sign at
   20-60 m, a floor marking at 40 m.

### 1.3 Keep the camera

Every camera added for a defect stays in `BENCHMARK_SCENES`. A defect nobody can
re-frame is a defect that comes back — CLAUDE.md's rule about re-verifying the
whole watchlist is unenforceable without a repeatable frame. `markings`,
`forecourt`, `carpark` and `river` were all added this way and all four earned
their place immediately.

### 1.4 Then widen the art set

`SCENE_SETS.art` in `scripts/capture-art-review.mjs` is 12 scenes and the gate
runs on it. Once the sweep has settled, decide which of the new cameras belong
in the graded set — every one added is a scene the gate will defend from then
on, and also a scene that costs capture time on every run. That trade is a
judgement call and it is worth making deliberately rather than by default.

---

## 2. THE METHOD, and the four things that make it work

### 2.1 Adding a camera is a three-file change

| file | edit |
|---|---|
| `src/runtime/runtimeMode.ts` | add the name to the `BenchmarkScene` union AND to `BENCHMARK_SCENES` |
| `src/constants/siteLayout.ts` | add `{ position, target }` under `cameras` |
| `src/components/RuntimeController.tsx` | map the scene name to the camera |

`scripts/capture-art-review.mjs` parses `BENCHMARK_SCENES` out of the real
source rather than duplicating it, so nothing else needs touching. An unknown
scene silently coerces to `overview`, which is how a confidently mis-framed
capture happens.

Then:

```bash
npm run build
node scripts/capture-art-review.mjs --label=<name> --scenes=a,b,c --skip-build --duration=5
```

### 2.2 Root-cause from the LIVE SCENE, not from the source

This is the single highest-value technique in this lineage and it is
underexploited. `window.__MILLOS_RUNTIME__.inspectObjects('', 40000)` returns,
for every mesh: `worldPosition`, `geometry.worldRadius`, `worldRadiusSum`,
`instanceCount`, `visibleInTree`, every bound texture slot, and the full material
record including `shaderInjected`.

The car-park road was found in one probe run: two coplanar slabs at y -0.02
centred (120, 50) and (120, 52.5) with bounding radii 16.01 and 17.68, and
17.68 is exactly `sqrt(2.5^2 + 17.5^2)` — a 5 x 35 m road. Reading
`FactoryExterior.tsx` would never have produced that, and in fact reading it
produced a **wrong** hypothesis that cost a build and a capture to disprove.

Working probes to copy rather than rewrite:

| probe | answers |
|---|---|
| `test-results/pass7/unfinished-models.mjs` | every lit, untextured, unshaded mesh grouped by owner |
| `test-results/pass7/carpark-probe.mjs` | everything within a radius of a world point |
| `test-results/pass6/flat-owners.mjs` | which component draws a given material colour |
| `test-results/pass6/painted-labels.mjs` | lit ground glyphs and their world positions |
| `test-results/pass6/texel-density.mjs` | screen px per texel at the closest camera that CONTAINS the asset |
| `test-results/pass7/model-index.mjs` | the whole shipped model set, from the GLBs themselves |
| `test-results/pass7/thumbs/shoot.mjs` | renders all 34 GLBs to thumbnails via a static server + three |

**Group in the page, not in node.** The pass-5 flat-owners probe serialised
1,700 meshes across CDP and was still going after 21 minutes; moving the
grouping inside `page.evaluate` made it a four-minute probe.

**EVERY ONE OF THOSE PROBES LIVES IN GITIGNORED SPACE.** `.gitignore:36` excludes
`/test-results/`, so the entire investigative toolkit above — and the Tripo
runner named in the sibling work order — vanishes on a clean checkout. That is
now the second time tooling this lineage depends on has been found outside the
repo. Anything you write that a future pass would want should go in `scripts/`;
anything you *use* from `test-results/` should be treated as borrowed, not
owned.

### 2.3 Choose the camera for the question

An oblique three-quarter view is right for judging whether a scene reads. It is
**wrong** for judging alignment: a parked car's own length foreshortens and
adjacent bays stack behind each other. On the strength of one oblique frame the
cars' quarter turn was removed, which was the wrong fix; a near-plan camera
(`carpark` is now one, deliberately) settled it in a single capture.

Corollary that also cost a build: **a sign has two faces.** The `forecourt`
camera looks at the Dead Dino sign's BACK, so a fix applied to the front logo
changed nothing in the capture and looked like the fix had failed.

### 2.4 Crop, upscale, and look at the actual pixels

`node test-results/pass6/show-diff.mjs <label> <scene> <x,y,w,h> [gain]` builds
an off / on / amplified-difference triptych. For a static defect, `sharp`
`.extract().resize(..., {kernel:'nearest'})` at 3-4x is what makes a 15 px glyph
or a 3 px seam legible.

CLAUDE.md's rule earns its place here twice over: **look at the frame before
believing the counter.** A label-contrast probe reported a safety marking as
darker than its floor (it was reading a truck's shadow) and then as 1.5x brighter
(it was reading a worker's hi-viz jacket). Both numbers were correct arithmetic
on the wrong pixels.

---

## 3. Known open items, none of them blocking the sweep

### 3.1 The perf question that could not be closed

Seven scenes match the previous pass within a few percent; four heavy ones —
`overview`, `interior`, `shipping`, `water` — sit 13-17% down. **Draw calls are
byte-identical**, so it is not batching eviction, which is the one regression the
surfacing work could plausibly cause. It could not be separated from a machine
still settling from load 36.

Resolve it the way CLAUDE.md prescribes and this session did not: interleaved
arms via `window.__MILLOS_RUNTIME__.setPerfDebug({ disableSurfaceTreatment })`,
at least three pairs, on an idle machine, reporting the control-only spread
beside the delta. One page load, one variable — no two-build comparison.

### 3.2 The missing lever, asked for three times

`resolveBatchSurfaceProfile` is blind to colour **by construction** — a merge
group can legitimately hold a green hedge and a red postbox — so it can only
answer `masonry` or `painted`. Three sites have now wanted something else:

- `VillageArea`'s thatch, which wants `vegetation`
- the outbuilding roofs, which want less `masonry.dust` (see the note in that
  profile: there is no per-roof lever and cutting it cuts every ledge on site)
- the Dead Dino sign face, which wants `signage` and instead gets `painted`'s
  cladding mottling — worked around by swapping the field colour, not fixed

The fix is a per-call-site profile hint the batcher honours, which means the
hint has to enter `mergeMaterialSignature` so two materials with different hints
never merge into one group. Bounded, general, and it closes all three.

### 3.3 Smaller

- `test-results/pass6/label-contrast.mjs` is documented as unreliable at these
  glyph sizes; a trustworthy version needs the glyph mesh's screen bounds, which
  `inspectObjects` does not expose.
- The nine rigged creatures are textured but carry no analytic finish, closed on
  aliasing-floor arithmetic in `models/RiggedCreatureModel.tsx`. Reopening needs
  a camera that resolves them, which the sweep may well produce.
- The cream caravan behind the gas station is still parked on bare grass. Left
  deliberately — a caravan in a field is plausible where a taco truck is not.
- `_contprompts/millos_tripo_model_polish_2026-08-18.md` prices the generation
  spend. Unspent, and still Nell's call. Do not fire it from this work order.

---

## 4. The model set, for reference

34 files, 14.9 MB, 256,648 vertices: 30 Tripo-generated, 4 authored, 9 rigged.
`node test-results/pass7/model-index.mjs --table` prints the index from the GLBs,
the manifest, the normalization report and each area's PROVENANCE;
`--table` omitted emits JSON. A rendered gallery of all 34 was published as an
artifact on 2026-08-19.

Two facts from it that constrain asset work:

- **Nothing is under-resolved.** Every asset reads at or below 1.0 screen px per
  texel at the closest camera that contains it, worst-decile included. The
  standing "resample the barn to 2048" recommendation was measured and declined.
- **The forklift and both workers bind zero textures on purpose**, so worker
  skin, uniform and PPE variants apply at runtime rather than duplicating texture
  memory. A generated replacement would break that stance.

---

## 5. Standing constraints

- **Disk is the live hazard.** It filled mid-session and blocked a build at
  194 MiB free; `test-results/` is 3.8 GB and other work on this machine consumes
  heavily. Check `df` before a session that adds capture runs, and delete nothing
  you did not create — clearing your own superseded captures is fine and worth
  saying out loud when you do.
- `.capture.lock` (`scripts/lib/capture-lock.mjs`) is mandatory for anything that
  renders, re-entrant through `MILLOS_CAPTURE_LOCK_PID`. Any new rendering script
  must take it.
- **Another session may be rendering.** Pixel-diff measurements survive that —
  the `receiving` control reproduced to two decimal places under 300-490% of
  foreign CPU — but timing measurements do not. Check `load` before believing a
  red benchmark; above ~3.0 per core, re-run rather than relax a budget.
- **Another session holds port 5199.** Do not take it.
- The commit at `a5413e5` carries ~55 MB of immutable Tripo source GLBs under
  `assets/source/models/`. Nothing is pushed, so it is still reversible: decide
  whether they belong in history, in LFS, or ignored, **before** this branch goes
  anywhere.
- Deploy on request only. End every report with exactly one of "local only — not
  live" or "live — verified in the served bytes".

---

## 6. The gate baseline to reproduce before changing anything

Measured at `a5413e5`, 2026-08-19, all green:

```
npm run typecheck / lint / format:check      clean
npm test                                     108 files, 1726 tests, 0 failures
npm run build                                ok
npm run validate:assets                      34/34 PASS
npm run validate:depth                       56 active files, 12 relationships
npm run validate:shaders                     24 families, 26 stable cache keys
npm run validate:bundle                      112.50 MiB dist (budget 170)
npm run validate:reachability                no new dead modules, 0 graph misses
node scripts/audit-scene-models.mjs          22 scenes, 0 blockers, 0 warnings
npm run measure:surfaces                     6/6 moved, no inert readings
npm run capture:art -- --set=art --perf-gate 12/12 art PASS + 12/12 perf PASS
```

The perf gate passes on a quiet machine; see §3.1 for the one question it leaves
open.
