---
title: MillOS — every model in the world, to the highest quality
date: 2026-08-16
status: correctness is CLEAN repo-wide (21 scenes, 0 blockers); quality is measured, uneven, and mostly open
scope: every model in the assembled scene — factory, exterior, logistics, personnel, forklifts, dock openings, conveyors, village, farm. NOT just the 30 generated farm/village assets.
branch: launch-audit-polish
predecessor: _contprompts/millos_model_quality_and_animation_2026-08-16.md (all of its items are closed — see §1)
verification_criteria:
  - "A defect is not found until an instrument sees it in the ASSEMBLED SCENE. Four of the six defect classes closed this pass are invisible in the source and in the asset."
  - "An instrument is not trusted until its own blind spots are named. Five separate false readings were produced this pass by probes that looked correct; each one is written up in §6 with the reading it gave."
  - "A 0% reading is a claim about the instrument until proven a claim about the scene. `world-factory-process` read 0% alive three times and the machines were animating correctly every time."
  - "Visual claims are verified by pixels, and by pixels of the SURFACE IN QUESTION - not by a budget PASS. A black mesh passes every budget in this repo."
  - "Any lit-vs-shadow, control-vs-treatment or before-vs-after number compares ONE receiver, or it is labelled as the region-wide split it actually is."
  - "Typecheck, lint, format, the full suite, build, validate:assets, validate:bundle and a 12-scene capture with zero diagnostics are green before handing off."
---

# MillOS — all models, highest quality

## 1. Where this stands

The predecessor asked for model and animation polish on the 30 generated farm and
village assets. That is done and **every item it left open is closed**. It then
turned out that its headline defect was never a farm defect at all.

| predecessor item | outcome |
|---|---|
| §3.1 seven of nine rigs never driven | **8 of 9 driven**, proved by bone sampling over time. Scarecrow is the one deliberate exception |
| §3.2 refs threaded into `*PrimitiveBody` | guard test extended to the ref form; all four cases recorded with reasons |
| §3.3 windmill sails frozen | **turning**, in the vertex shader against a baked weight |
| §3.3 fountain water frozen | **scrolling, with its ripple ring back**, on the generated basin's measured water plane |
| §4.1 seven-plus buildings near-black | **root cause found and fixed. It was 122 meshes, not seven buildings** |
| §4.2 red-starved shadow ambient | closed as not-a-defect: it does not replicate under its own discriminator. **Read §5.1's arithmetic before accepting or overruling this** |
| §4.5 clone reading | free half shipped: deterministic per-instance yaw and scale |
| §4.3 texel density, §5 credits | untouched product calls — see §5.2, §5.3 |

**Gates, green on the current tree:**

```
npm run typecheck / lint / format:check   clean
npm test                                  104 files, 1662 tests, 0 failures
npm run build                             ok
npm run validate:assets                   34/34 PASS
npm run validate:bundle                   0.60 MiB initial gzip, 112.47 MiB dist (budget 170)
npm run capture:art -- --set=art          12/12 PASS, zero diagnostics
node scripts/audit-scene-models.mjs       21 scenes, 0 blockers, 1 benign warning
```

Nothing is committed and nothing is pushed. **Local only — not live.**

---

## 2. The defect that was never about the farm

`StaticMeshBatch.tsx`'s instanced path set `material.vertexColors = true` so that
`setColorAt`'s per-instance tint would apply. It does not need it, and it is
broken by it. Verified against the installed three source rather than memory:

| where | what it does |
|---|---|
| `WebGLPrograms.js:199` | defines `USE_INSTANCING_COLOR` from `instanceColor !== null` **alone** |
| `color_vertex.glsl.js` | that define alone sets `vColor = vec3(1.0)` then multiplies by `instanceColor` |
| `WebGLProgram.js:735` | FRAGMENT `USE_COLOR` comes from `vertexColors \|\| instancingColor`, so the tint still reaches `diffuseColor` |
| `WebGLProgram.js:566` | VERTEX `USE_COLOR` comes from `vertexColors` alone, inserting `vColor *= color` |

These geometries are `[position, normal, uv]`. An unbound vertex attribute reads
as the WebGL generic default `(0, 0, 0, 1)`, so `vColor` was multiplied by zero
and the surface lost **all** of its diffuse. Specular survived, which is why the
bodies kept readable geometry under gain and why twelve hypotheses about albedo,
metalness, occlusion, mips, sun angle and quality tier all died.

**It was 122 meshes across the app**, measured live: the village shops and
cottages, the whole truck yard, the dock openings, and **every machine status
beacon** (`machineSurfaces.ts` set the same flag on a `MeshBasicMaterial` drawn
by an `<instancedMesh>`). After the fix: **0**, with the 164 meshes that
legitimately carry a `color` attribute untouched.

`StaticMeshBatch.test.ts` asserted `vertexColors === true`. **The suite was
asserting the defect.** It now asserts against the geometry.

The merge path may keep its `vertexColors`, because `createMergedGeometry`
writes a `color` attribute into everything it builds. That is exactly why market
stalls lit correctly beside black shops in the same frame — and it is the clue
the whole investigation turned on.

Full write-up, including the twelve dead hypotheses:
`test-results/tripo-probe-20260815/cow-integration/DARK-BUILDINGS.md`.

---

## 3. The quality gap, measured

`node scripts/audit-scene-models.mjs` surveys texture coverage per branch. This
is the actual "model quality" question and it is a measurement, not an opinion.

| branch | meshes | albedo | normal | rough | **flat** |
|---|---|---|---|---|---|
| authored-castle | 1 | 100% | 100% | 100% | 0% |
| **authored-farm** | 46 | **76%** | 65% | 72% | 24% |
| authored-village | 82 | 32% | 29% | 26% | 66% |
| world-factory-infrastructure | 27 | 26% | 33% | 22% | 44% |
| world-conveyors | 163 | 21% | 72% | 75% | 20% |
| **authored-factory-exterior** | **588** | **10%** | 8% | 10% | **87%** |
| world-factory-process | 59 | 2% | 37% | 58% | 41% |
| **world-logistics** | 311 | 2% | 1% | 1% | **97%** |
| **authored-dock-openings** | 24 | 0% | 0% | 0% | **100%** |
| **world-forklifts** | 16 | 0% | 0% | 0% | **100%** |
| **world-personnel** | 60 | 0% | 0% | 0% | **100%** |

The farm got the generated-asset treatment and reads at 76% textured. The
factory exterior — **the single largest branch in the scene at 588 meshes** — is
87% flat colour. That gap is what "fix all models" means.

**Do not read the flat column as a work list on its own.** A large part of the
tail is legitimately flat: `MeshBasicMaterial` indicators, worker contact
shadows, hi-vis vests, data-flow lines, the unified water surface. The audit
prints a `FLAT MATERIALS BY MESH COUNT` table with branch and example path for
exactly this reason — judge each entry, do not batch-texture the list.

### 3.1 What was already fixed, and the template it sets

The `shipping` capture had **9,840 m² of untextured paving**: two 60×60 m truck
yards at `#1c1c1c`, two 20×16 m dock aprons at `#374151` and two 10×120 m access
roads. In frame it was a featureless black slab filling most of the view while
the gravel beside it read correctly — the largest surface on the site was also
the least finished.

Fixed in `TruckBay.tsx` using the repo's own conventions, which are load-bearing:

1. **Colour.** `generateTarmac`/`generateConcrete` author sRGB bytes through
   `createColorDataTexture`, so sampled albedo is already correct linear
   reflectance. A non-white `color` beside one of these maps multiplies the same
   hue twice — the double-darkening CLAUDE.md records for the village cobbles.
   **Textured surfaces take `#ffffff`.**
2. **Tiling by world period**, not by a fixed repeat, so a 120 m road and a 16 m
   apron show aggregate at the same physical scale.
3. **One clone per surface class, not per call site.** Texture identity is part
   of the `StaticMeshBatch` merge key.
4. **Right material for the job** — the dock aprons became concrete, not tarmac,
   because a dock apron takes trailer landing-gear loads that break asphalt.

That is the template for the rest of §3. `FactoryExterior.tsx:60-130` documents
the same conventions and holds `TARMAC_PATH/ROAD/LOT` tilings already.

### 3.2 The biggest open items, in order

**SCALE, STATED HONESTLY BECAUSE IT DECIDES HOW TO WORK.** These five branches
total roughly **1,000 meshes of surfacing**. §3.1 is the only completed example
of the pattern and it covered **six surfaces**. This is several sessions, not
one sitting — item 1 alone is 588 meshes, and item 3 is the only one that is
both a texture job and an animation job.

Take one numbered item per pass, finish it completely, re-run
`audit-scene-models.mjs` and report the branch's before/after coverage. **Do not
part-deliver an item and present the remainder as a plan**; if a pass runs out
of room mid-item, say which meshes remain, with counts.

1. **`authored-factory-exterior`, 588 meshes, 87% flat.** The largest branch.
   Walls, roofs, outbuildings, fencing, forecourts. `TARMAC_*`,
   `PORTAL_BRICK_*`, `OUTBUILDING_CONCRETE_*` already exist in that file.
2. **`world-logistics`, 311 meshes, 97% flat.** Trucks, trailers, containers,
   pallets. The largest flat entry after the dock openings.
3. **`authored-dock-openings`, 233 meshes / 1,424 instances of white, and 0%
   animated in all three channels (§4).** The single biggest flat block in the
   scene AND a dead subsystem. Two jobs, one branch.
4. **`world-personnel`, 100% flat.** `worker.glb` ships with `worker-skin.png`
   and the scene renders none of it. Workers are the human scale reference in a
   factory sim.
5. **`world-forklifts`, 100% flat.** `forklift/forklift.glb` — note the 4-byte
   normalize drift in §10 before touching it.
6. **Fix `personnel-close` before trusting any art review.** It targets
   `[10, 1.25, -18]`, a worker's SPAWN point; with the clock running the worker
   has walked away by capture time, so the frame is silo cones and empty floor.
   `personnel` has a column down the middle. **Three of the twelve review scenes
   are currently near-useless as evidence**, which quietly corrupts the baseline
   every later pass compares against. Cheap, and it should come first.

### 3.3 The machines are the counter-example, and the standard

`machineSurfaces.ts` is what "highest quality" already looks like here: a shared
`withWear` injection with grime, settled dust and fresnel edge-wear over an ORM
map, per-material tuning, `metalness` strictly 0 or 1, and a stable
`customProgramCacheKey`. Read it before authoring any new surface. Its header
comments explain why `metalnessMap` is deliberately absent — **do not "add the
missing map"**.

---

## 4. Animation, repo-wide

`node scripts/audit-scene-motion.mjs` samples every object's world transform,
world orientation AND instance-matrix checksum over time. Verbatim output for
`interior` on the current build, with the clock running (`motion=on`, §6.1):

```
=== interior: 4107 named objects, 30 samples over 12.0 s
branch                             objects   moved  turned transient instAlive  alive (of judged)
authored-factory-exterior             1141     110     112         0     0/138  10% of 1141
authored-farm                         1003     618     626         0      0/11  62% of 1003
world-logistics                        481      78      47         0      2/86  16% of 481
world-factory-process                  383       0       0       330      2/45  4% of 53
authored-village                       378     205     185         0      0/14  54% of 378
world-personnel                        277     240     133        35       0/0  99% of 242
world-conveyors                        225      90       0         0       1/3  40% of 225
world-forklifts                         98      95      95         1       0/6  98% of 97
authored-dock-openings                  43       0       0         0       0/6  0% of 43
world-factory-infrastructure            33       0       0         0      0/21  0% of 33
world-environment                       25       9       0         0       0/1  36% of 25
```

Read `world-logistics` 16% and `authored-factory-exterior` 10% as correct: a
truck that docks and waits is not broken, and a building should not move.
`world-factory-process` at 4% of 53 judged is the machines, and its `instAlive
2/45` is the roller mills and plansifters animating through instance matrices —
**the machine bodies are meant to be static and are.**

**The two zeroes are the open animation work, and they are confirmed in all
three channels**, which matters because §6.4 records three separate false zeroes
from probes that only watched transforms:

- `authored-dock-openings` — 43 objects, 0 moved, 0 turned, **0 of 6 instanced
  meshes changed**. Dock doors that never open, in a scene whose whole subject
  is trucks arriving. The analogue of the frozen windmill sails.
- `world-factory-infrastructure` — 33 objects, 0 moved, 0 turned, **0 of 21
  instanced meshes changed**.

Both are also 100% and 44% flat respectively (§3), so each is a texture job and
an animation job in one.

**The nine creature rigs are done.**

`motion-probe.mjs` proves it per species,
in two channels:

```
creature     n  bones   travel      rel  turn deg   verdict
cow          3    123   3.4278   2.4223    172.50   DRIVEN
sheep        4    164   0.1384   0.1384     86.21   DRIVEN
pig          3    123   3.4927   0.7038    175.80   DRIVEN
horse        1     41   0.1761   0.1761     25.96   DRIVEN
chicken      5    205   4.2120   0.3396    179.45   DRIVEN
crow         2     82   0.0175   0.0175     23.02   DRIVEN
duck         4    164   0.1596   0.1371    113.56   DRIVEN
scarecrow    1     41   0.0000   0.0000      0.00   STATIC  <-- deliberate
cat          1     41   0.0000   0.0000     46.34   DRIVEN
```

---

## 5. Decisions that are Nell's, not the next agent's

### 5.1 §4.2 red-starved shadows — closed as not-a-defect, unless overruled

The predecessor's blocker was "red falls to **12%** of its lit value in shadow".
It replicates only when lit and shadowed pixels are drawn from **different
surfaces**. Constrained to one continuous floor slab, same frame, same albedo —
which is the discriminator the finding itself prescribes:

```
sunlit    R 101.5  G 99.5  B 79.7   R/B 1.273
shadowed  R  49.1  G 67.9  B 67.8   R/B 0.724
shadow retains  R 48.3%  G 68.2%  B 85.1%
```

Red retains **48%**, not 12%. A warm sun against a cool sky is physically right.
Separately, the principled minimal fix — making the ambient carry the sky dome's
ground band as well as its sky band — moves R/B from 0.600 to 0.625 and darkens
ambient 5%: an inert term by CLAUDE.md's own test. Anything beyond that is a
deliberate restyle of every frame in the app.

### 5.2 §4.3 texel density — ~112 MB of VRAM for three buildings

barn 2.32, duck pond 1.59, town hall 1.55 px/texel at 1024; at 2048 they become
1.16 / 0.80 / 0.78. Uncompressed VRAM, not JPEG bytes, is the budget: ~12.6 MB
per 1024 set against ~50 MB at 2048. One-word change in `GENERATED_ASSETS`.
Note the new per-instance scale varies these up to 1.04, nudging density 4% the
wrong way — immaterial, but stated rather than left implicit.

### 5.3 §5 credits — none spent, balance not checked

Last recorded 1,435 of 3,500 for 30 models, at ~30 credits per generation and
~25 per rig. Options: markings variants ≈ 8-10 generations (the only non-tint
fix for the remaining sameness), a newer `model_version` (existence
**unverified**, and it is regenerate-everything-or-nothing), and `face_limit`
above 8000 judged against the farm's existing **+948,739 triangles**.

**Get Nell's go-ahead before spending. This is real money.**

---

## 6. Instrument traps this pass paid for — read before measuring anything

Five separate false readings were produced by probes that looked correct. Each
one would have been reported as a finding.

### 6.1 A benchmark scene is a PAUSED WORLD

`RuntimeController.tsx:1101` — `game.setGameSpeed(mode.motionCapture ? 180 : 0)`.
Benchmark mode pauses the game clock so frame times are reproducible. A motion
sweep without `&motion=on` measures a frozen world and reports **every vehicle
and every machine as dead**. That reading was produced, and it was wrong.

### 6.2 Path is not an identity

Most of this graph is unnamed, so thousands of objects serialise to
`.../<Group>/<Mesh>`. Keying a sample on path collapses them into one bucket,
interleaves the samples of different objects, and **manufactures motion out of
two static objects in different places**. It also under-counted the scene by
three quarters — 988 objects reported against 3,809 actual.

### 6.3 Traversal index is not an identity either

The obvious fix for 6.2. It works only while the graph is static; once the clock
runs, objects mount and unmount constantly and index N is a different object
between samples. `sampleObjects` now returns `uuid` — use it.

### 6.4 Instanced animation is invisible to a transform probe

An `InstancedMesh` animates through `setMatrixAt`, which never touches the
container's own transform. `world-factory-process` read **0% alive** while the
roller mills were spinning at 1,000 rpm and the plansifters were gyrating.
`sampleObjects` now returns `instanceMatrixChecksum`; the roller and plansifter
drivers are at `InstancedRollerMills.tsx:271` and `InstancedPlansifters.tsx:230`.

### 6.5 A rotation-only rig never moves its origin

`setHeadShake` yaws the leaf `Head` bone about its own pivot. A position-only
probe called the sitting cat STATIC when its rig was being driven correctly.
Both channels are sampled now; the cat reads 46° of turn against 0.0000 travel,
which is the signature.

### 6.6 A lit-vs-shadow split across a whole region is not a measurement

See §5.1. Different surfaces have different albedos; only a single receiver
holds albedo, camera, exposure and tone curve constant. This one nearly shipped
a 12% figure that is really 48%.

### 6.7 Two more, carried from the predecessor and still live

- **An instrument that hardcodes a default cannot see its own effect.**
- **`zsh` does not word-split unquoted parameters.** A shell loop passing
  `$box` as four numbers silently passed one string, and the probe used its
  default region while printing a header that claimed otherwise.

---

## 7. The instruments

Repo-level, and these are the ones to reach for first:

| script | answers |
|---|---|
| `scripts/audit-scene-models.mjs` | every mesh in every scene against six defect classes, plus the texture-coverage survey and the flat-material work list. Exits non-zero on a blocker |
| `scripts/audit-scene-motion.mjs` | what actually moves, per branch, in three channels. **Pass `motion=on`** |
| `scripts/analyze-material-sharing.mjs` | how many material instances are genuinely distinct — the batching ceiling |

Runtime API on `window.__MILLOS_RUNTIME__`, all added or extended this pass:

| call | returns |
|---|---|
| `lightRig()` | every light the scene actually renders with, plus renderer, fog and environment state. **`src/components/Environment.tsx` declares a rig that nothing mounts** — read the scene, never that file |
| `inspectObjects(q, n)` | resolved draw state per mesh: every texture slot with its colour space, vertexColors vs attributes, determinant, bounds, instance count |
| `sampleObjects(q, n)` | uuid, world position, world quaternion, instance-matrix checksum |
| `materialAudit()`, `setPerfDebug()`, `snapshot()`, `motionSnapshot()` | pre-existing |

Under `test-results/tripo-probe-20260815/cow-integration/`:
`motion-probe.mjs` (per-species rig verdicts), `sail-series.mjs` (region-vs-control
pixel motion, `--box` and `--label` parameterised), `probe-dark.mjs` (light rig +
paired material dumps), `placement-audit.mjs`, `envelope-delta.mjs`,
`texel-density.mjs`, `plates2.mjs`, `perch.mjs`, `luma.mjs`, `facing.mjs`,
`allab.mjs`, `allvisual.mjs`, `wait-and-bench.sh`.

---

## 8. Known, measured, and deliberately not acted on

- **51 zero-opacity meshes** drawn every frame — forklift billboards and cargo
  that fade in and out. Correct behaviour, flagged by the audit as a warning.
- **Two pigs overlap 17%** transiently; wandering animals have no separation.
- Chickens sit 57 mm under terrain; a chicken measures 68% inside the coop's
  AABB (the coop is on legs); four bodies "float" and are resting on other
  bodies; fence corners overlap 1-2%. All measured, all correct.

---

## 9. Measuring on this machine

This box ran between **load 40 and 222 across 10 cores** for the whole of this
pass — `mediaanalysisd`, Backblaze, Spotlight and a VM, all the machine owner's
and none of them yours to kill.

- `silos` FAILED `longTasks` at **26.53 load per core** with clean diagnostics,
  and PASSED at 119.5 FPS on re-run at 9.58. **A red benchmark is not a
  regression until you have looked at `load`**, and if it is above 3.0 per core
  the answer is to re-run later, never to relax the budget.
- **Draw calls and triangles are integers that reproduce exactly** regardless of
  load. They are the trustworthy numbers. This entire pass — 122 black meshes
  fixed, six rigs wired, sails turning, fountain scrolling, 9,840 m² of paving
  textured — moved `overview` by **−3 draw calls and −1,580 triangles**.
- `.capture.lock` via `scripts/lib/capture-lock.mjs` is mandatory for anything
  that renders, and is re-entrant through `MILLOS_CAPTURE_LOCK_PID`.

---

## 10. Standing constraints, unchanged

- Licence is clear: Tripo3D API plan, MillOS is not commercial, Nell confirmed.
- `assets/source/models/` is immutable provenance — the 4096 originals are why
  a resample costs no credits.
- `test-results/` is gitignored — evidence goes there, never into `src/`.
- Never round-trip a pipeline GLB through Blender; `public/models/*.glb` node and
  clip order is load-bearing for the forklift.
- **`npm run normalize-models` rewrites `public/models/forklift/forklift.glb` by
  4 bytes.** Unrelated drift; `git checkout --` it, then regenerate the manifest
  and provenance, in that order.
- **Do not `git stash` this tree.** 26 modified and 11 untracked paths; a failed
  pop is unrecoverable.
- Another session holds **port 5199** — do not kill it; use your own port and
  `curl` it afterwards to confirm it still answers 200.
- `npm run capture:art` fails only its final montage (`npx playwright install`
  fixes it); the captures themselves are fine.
- Deploy on request only. Current status: **local only — not live.**

---

## 11. Gate commands

```bash
npm run typecheck && npm run lint && npm run format:check
npm test                     # baseline: 104 files, 1662 tests, 0 failures
npm run build
npm run validate:assets      # 34 entries
npm run validate:bundle
node scripts/audit-scene-models.mjs            # must stay at 0 blockers
node scripts/audit-scene-motion.mjs --scenes=interior,overview
npm run capture:art -- --label=<name> --set=art
```

Suggested order: **§3.2 item 6 first (fix the review cameras, or every later
comparison is made against corrupt evidence) → item 1 (factory exterior, the
biggest branch) → item 2 (logistics) → item 3 (dock openings, which closes a
texture job and one of §4's two zeroes together) → `world-factory-infrastructure`,
the other zero → items 4-5 → then ask Nell before spending a credit on §5.3.**

One numbered item per pass, finished and measured. See the scale note in §3.2.

Re-run `audit-scene-models.mjs` after every step. It is cheap, it covers all 21
scenes, and it is the only thing in the repo that would have caught the defect in
§2.
