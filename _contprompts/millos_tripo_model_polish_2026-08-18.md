---
title: MillOS — polish every model with Tripo. The spend, priced off the MEASURED charge rather than the reported one, with the runner that already works and the three things generation cannot fix
date: 2026-08-18
status: WORK ORDER, AND IT COSTS MONEY. Nothing in here may be fired without Nell saying so in this session. Pass 6 closed the free half; what is left is the paid half plus its wiring
branch: launch-audit-polish
predecessor: _contprompts/millos_polish_all_remaining_models_2026-08-18.md
read_first:
  - "test-results/tripo-probe-20260815/FINDINGS.md — the whole document, not the summary. It contains the billing under-report, the organic-vs-industrial finding and the five gates, all measured on this account."
  - "test-results/tripo-probe-20260815/roster/harness/queue.json — the `_comment` field. It records why a second attempt was needed on several assets, and it is the single most useful sentence in this lineage for anyone about to write a prompt."
  - "CLAUDE.md § World Surface Treatment and § Measuring a Visual or Performance Change."
  - "assets/source/models/{farm,village}/PROVENANCE.json — the exact pipeline per shipped asset, and the sha256 of both the source and the derivative."
verification_criteria:
  - "PRICE OFF THE BALANCE, NEVER OFF `consumed_credit`. The probe measured two tasks reporting 20 + 30 = 50 while the balance moved 1000 -> 930. The text-to-image step bills separately. Budget ~35 credits standard and ~45 with `texture_quality: 'detailed'`, which is what every shipped asset used."
  - "A GENERATION IS NOT A DELIVERY. `run-queue.mjs` deposits eleven `q_*.glb` files in the harness and that is where its job ends; every one of them then needed a size decision, a re-origin, a manifest entry, a call site and a capture. The work is generate -> normalize -> manifest -> wire -> gate -> capture, and the last four are where the hours are."
  - "TEXTURE AND FACE BUDGETS ARE SETTLED AND THE ANSWER IS NO. Pass 6 measured all thirty at or below 1.0 screen px per texel at the closest camera that frames them, worst decile included. Raising `texture:` or `face_limit` buys nothing any camera can resolve. Do not reopen without a camera that resolves finer than the ones in `SITE_LAYOUT`."
  - "Prompt against the SHIPPED design at a cited source line, not against the category. The scarecrow came back a faithful-looking asset of the wrong design — a burlap sack head where the shipped one is a carved pumpkin — because the prompt described a scarecrow instead of THIS scarecrow."
  - "Every new asset id touches five files. `GENERATED_ASSET_PATHS`, `GENERATED_ASSETS`, `asset-manifest.json`, `write-model-provenance.mjs`'s output and the call site. `validate:assets` fails on a missing manifest entry and `provenance:models` THROWS on a spec with no normalization row."
---

# MillOS — polish every model with Tripo

## 0. Where this starts, and what is actually left

Thirty Tripo-generated assets are shipped, wired, normalised and provenanced.
Pass 6 closed the engineering list and took **the free half of the only defect
generation can fix**. What remains that money can buy is small, specific, and
worth stating in one table before anything else:

| | status |
|---|---|
| the clone reading — one model per building, yaw the only variation | **the target.** Free half shipped (per-instance yaw, non-uniform scale, and four differently-dressed market stalls). Paid half unspent |
| texel density / `texture:` budgets | **CLOSED, measured.** Nothing is under-resolved. Do not spend here |
| `face_limit` above 8000 | **not justified.** The farm already carries a carried-forward +948,739 triangles over the primitives it replaced (unverified in this lineage; verify before citing) |
| a newer `model_version` | **existence never checked against the API.** Check before pricing it |
| the pig's missing tail joint | ~25 credits for a re-rig, or nothing at all via the vertex-shader route `GeneratedWindmill.tsx` already uses |

**Local only — not live.** The tree carries 84 uncommitted files from passes 5
and 6 and nothing is committed.

### 0.1 The number everyone before you got wrong

`consumed_credit` under-reports. Measured on this account, 2026-08-14:

| task | reported | |
|---|---|---|
| industrial roller mill | 20 cr | |
| Holstein cow, `texture_quality: 'detailed'` | 30 cr | |
| **reported total** | **50** | |
| **balance moved** | **1000 -> 930** | **70 actually charged** |

The text-to-image step bills separately and does not appear in
`consumed_credit`. So:

- **~35 credits** for a standard generation
- **~45 credits** with `texture_quality: 'detailed'`, which is what all thirty
  shipped assets used and what `run-queue.mjs` sends

Every credit figure in the predecessor documents is built on the 30 that the API
reports, and is therefore **roughly a third low**. Re-price before quoting
anything to Nell, and read the balance before and after.

### 0.2 The balance is unknown and must be read, not remembered

The record contains three different numbers from three different dates: 1000
issued / 930 after the probe, and later 1,435 of 3,500 spent leaving
~2,040-2,065. **Read it.** One call, no charge:

```bash
curl -s -H "Authorization: Bearer $TRIPO_KEY" \
  https://api.tripo3d.ai/v2/openapi/user/balance
```

`run-queue.mjs` reads it too, and refuses to start unless the balance covers the
whole queue — deliberately, so a top-up that is too small fails loudly instead of
half-completing a set.

---

## 1. The runner exists, works, and is not in `scripts/`

`test-results/tripo-probe-20260815/roster/harness/run-queue.mjs`. It is the tool
that produced the shipped set. Nothing in it needs editing.

```bash
cd test-results/tripo-probe-20260815/roster/harness
TRIPO_KEY=tsk_... node run-queue.mjs
```

What it does, in order: reads the balance, refuses if the queue would overrun it,
submits every entry in `queue.json` as `text_to_model` at **at most 8 in flight**
(the API returns 429 above that), polls every 12 s, downloads
`output.pbr_model ?? output.model` to `q_<name>.glb`, and prints the balance
delta at the end. A submit that throws is pushed back onto the queue rather than
dropped.

Fixed request body, matching every shipped asset:

```js
{ type: 'text_to_model', prompt, model_version: 'v2.5-20250123',
  face_limit: 8000, texture: true, pbr: true, texture_quality: 'detailed' }
```

**It lives under `test-results/`, which is gitignored.** That is a real hazard:
the tool that spends money is not in the repo and will not survive a clean
checkout. If this pass fires anything, **move `run-queue.mjs` and its
`queue.json` schema into `scripts/` first**, with the key read from the
environment and never written down. Do that before generating, not after.

### 1.1 Rigging is a second, separate call

`run-queue.mjs` only does `text_to_model`. The nine creatures went through
`animate_prerigcheck` (0 credits) and then `animate_rig` (~25) as recorded per
asset in `PROVENANCE.json`'s `pipeline` array. There is **no runner for that step
in the harness** — it was driven by hand. Anything rigged in this pass needs that
path rebuilt, and `CREATURE_REQUIRED_JOINTS` in `normalize-model-assets.mjs`
pins the seven joints a regenerated rig must still carry (`Root`, `Hip`,
`Spine01`, `Spine02`, `NeckTwist01`, `NeckTwist02`, `Head`) so a renamed or
dropped joint fails the pipeline instead of shipping an animal whose head does
not move.

---

## 2. The one defect worth spending on

Both independent judges named the same thing as the strongest criticism of the
generated set: **one model, one baked texture, yaw the only variation.**

| asset | instances | where |
|---|---|---|
| `Cottage` | **5** | `VillageArea.tsx` — (-25,-35), (25,-35), (25,-50), (-25,45), (25,55) |
| `MarketStall` | **4** | `VillageArea.tsx` — (±8, 2) and (±8, 10) |
| `Sheep` | **4** | `FarmArea.tsx` |
| `ShopBuilding` | **3** | `VillageArea.tsx` — (20,5), (20,-10), (-20,30) |
| `Horse` | 2 | 1 farm, 1 village |

### 2.1 What is already spent for free, and what it bought

Do not redo these, and do read them before authoring prompts — they are the
shape of the answer:

- **Deterministic per-instance yaw and scale** (`instanceYaw`, `instanceScale` in
  `models/GeneratedModel.tsx`). Bounded at ±3.4 degrees and 0.96-1.04 on purpose:
  the placement audit that cleared all 108 instances for seating and overlap ran
  at the authored yaws, and scale is uniform because a non-uniform one stretches
  a baked albedo's texel density visibly along one axis.
- **Per-stall dressing** (pass 6, `STALL_DRESSINGS` in `VillageArea.tsx`). Four
  stalls, four different trades — greengrocer, dairy, baker, autumn produce —
  standing on a counter whose height was measured off the shipped GLB
  (`test-results/pass6/stall-surfaces.mjs`: a 1.445 m² up-facing spike at
  y 0.85, three times the next bin). Verified in a `square` capture: they read as
  four merchants rather than four copies. **This is the demonstrated lever** — an
  earlier blind A/B read the losing side as a market precisely because the goods
  differed while the frame was shared.

**The cottages have had no equivalent.** Before authoring a single prompt, ask
whether the same trick works there: a different gate, a woodpile, a washing line,
a barrow, window boxes, a different chimney pot. Five cottages that differ in
their *yard* may read as five houses on the strength of that alone, and it costs
nothing. Spend only on what dressing cannot reach — which is the **wall and roof
markings of the body itself**.

### 2.2 The queue to author, and what a prompt has to contain

Two further markings variants each for `cottage`, `marketstall` and `shop`:
**6 generations, ≈ 270 credits at the measured 45.** Budget a rejection rate on
top — the church and the fountain each needed three cuts on text-to-3D — so
**plan for ~9 submissions, ≈ 405 credits**, and stop early if the first three
land.

`queue.json`'s own `_comment` records the lesson that has to govern every prompt:

> Every prompt is matched to the shipped material palette at the cited source
> line, because the scarecrow pass proved that guessing the palette produces a
> faithful-looking asset of the wrong design (burlap sack head vs the shipped
> carved pumpkin).

So each entry carries `kind`, `source` (a file:line into the shipped primitive),
`shipped` (a full description of the design as authored), and
`whyFirstAttemptMissed` where there was one. Copy that schema exactly.

For a variant the additional constraint is that it must stay in the same FAMILY.
A second cottage that is a different house defeats the purpose — the village
should read as one vernacular with several builds, not as a catalogue. Vary
**render colour, roof material, window count and door placement**; hold roof
pitch, storey height and footprint.

### 2.3 Do NOT tint the generated body

`Cottage.wallColor` and `ShopBuilding.wallColor` still exist and still drive the
**fallbacks** — 22 references in `VillageArea.tsx`. Wiring either to a generated
body multiplies a hand-picked colour into an albedo that already carries one.
That is the exact double-tint CLAUDE.md records for the village cobbles, where a
`color: '#9a9a9a'` "fix" was treating a decode bug and had to be reverted to
`#ffffff` once the real cause was found. A markings variant is a different
BAKE, not a different multiplier.

---

## 3. What generation cannot fix, measured on this account

### 3.1 Tripo textures organic subjects and does not texture machinery

The probe's decisive finding, and it is not a matter of prompt quality. The
industrial roller mill came back structurally convincing — twin feed hoppers,
drive housing, base frame with feet, control box — wrapped in a 2048² albedo
that is near-white noise with scattered dark blobs. No panel lines, no fasteners,
no staining. It renders as a white plastic machine. The Holstein cow came back
with correct markings, pink muzzle and udder, dark hooves, horns and tail tuft.

The standing art verdict names untextured primary surfaces and "one uniform
plasticky gloss" as blockers, with one root cause: meshes carrying a bare `color`
with no `map`. **Generation does not fix that** — on machinery it adds another
white object. That is a material-system problem on existing geometry and it stays
MillOS's to solve, with `createColorDataTexture` / `createLinearDataTexture` and
the analytic `utils/worldSurface` treatment.

### 3.2 The explicit rejects, still rejected

| target | why not |
|---|---|
| mill / sifter / packer housings | `machineDecals.ts` pins flat quads at hand-tuned world Z; the envelope is load-bearing; 30 of 43 draw calls share 9 materials; `raycastSiloShell` picking precedent. And the texture comes back blank |
| the truck | the most authored object in the repo — opening doors, landing gear, mudflaps, conspicuity tape, identity decals, LOD gating. A single-node GLB is a functional downgrade |
| workers | already Quaternius CC0 GLBs with nine simulation-driven clips |
| silos | redesigned as rolled sheet courses, raycast proxy in place |
| trees and foliage | faceted low-poly is stated art direction. Pass 6 gave their SURFACE the `vegetation` treatment; the silhouette is deliberate |

### 3.3 Texture and face budgets are closed, and this is new

Pass 6 measured all thirty in screen pixels per texel at the closest benchmark
camera that actually **contains** each one, from the shipped GLB's own UV layout
(`test-results/pass6/texel-density.mjs`). Every asset reads at or below 1.0, and
so does the worst-resolved tenth of each one's surface area:

| | px/texel | worst 10% |
|---|---|---|
| `village-townhall` (the highest in the set) | 0.73 | 1.01 |
| `farm-barn` | 0.64 | 0.85 |
| `village-castle` | 0.19 | 0.26 |

Four consecutive work orders carried "barn is the only generated asset measurably
under-resolved: 2.32 px/texel at 1024" with no probe behind it. It is off by
about 3.6x and points the wrong way. **A generation at a higher `face_limit` or a
resample at 2048 buys detail no camera in `SITE_LAYOUT` can resolve.** Overturn
that only with a camera that resolves finer than the ones we have — and then add
the camera first, so the claim is measurable.

---

## 4. Generating is the first sixth of the job

`run-queue.mjs` deposits eleven `q_*.glb` files in the harness and stops there.
Each of those eleven then needed a human size decision, a re-origin, a manifest
entry, a call site and a capture before it was an asset. The path from a
downloaded GLB to a passing tree is:

### 4.1 Preserve the original, then normalize

Sources are immutable and live under `assets/source/models/{area}/` as
`<slug>-tripo-original.glb`. All thirty 4096-square originals are preserved
(63 MB), which is why re-resampling is free and why regeneration is the only
thing that costs.

`scripts/normalize-model-assets.mjs` does, per asset: derive facing from the
whole Head-to-Hip heading vector and snap to the nearest quarter turn (rigged
only), apply any authored yaw, scale uniformly to the stated target along the
stated axis, re-origin to bottom centre **through a Pivot node so a skin binding
survives**, resample the maps to JPEG at the spec's `texture` size, force the
metallic factor to zero, and rename material, mesh and textures semantically.

**Pass 6 added `--only=`**, and it is what makes this safe on a dirty tree:

```bash
node scripts/normalize-model-assets.mjs --only=village-cottage2,village-cottage3
```

Without it the script rewrites all thirty GLBs plus the forklift and both
workers. The flag validates every id against `GENERATED_ASSETS` and fails loudly
on a typo, and it **merges** into `test-results/assets/normalization.json` rather
than replacing it — a filtered run that wrote a one-asset report would break
`write-model-provenance.mjs`, which throws when the report has no entry for a
spec, and `validate:assets`, which reads the same file.

### 4.2 The five files a new asset id touches

| file | what it needs |
|---|---|
| `scripts/normalize-model-assets.mjs` | a `GENERATED_ASSETS` row: `id`, `slug`, `area`, `target`, `axis`, and `rigged`/`yaw`/`texture` where they apply. The `target` is a **human size decision in metres** — Tripo emits a unit box centred at origin |
| `src/utils/modelLoader.ts` | a `GENERATED_ASSET_PATHS` entry; `GeneratedAssetId` is derived from its keys |
| `public/models/asset-manifest.json` | an entry with `bounds`, `maxFileBytes`, `maxMaterials`, `maxTextures`, `maxRenderVertices`, licence and attribution. 34 entries today, and `validate:assets` enforces every field |
| `assets/source/models/{area}/PROVENANCE.json` | regenerated by `npm run provenance:models`, never hand-edited |
| the call site | `VillageArea.tsx` / `FarmArea.tsx`, choosing the variant **deterministically from the instance's own position** — `instanceNoise(position, seed)`. Never `Math.random()`: it re-rolls on remount, defeats `React.memo`, makes two captures of the same commit disagree, and would put a building in a different place in the control arm of an A/B than in the treatment |

### 4.3 The manifest's `maxTextures: 0` stance

Every non-generated asset in `asset-manifest.json` declares zero textures,
deliberately, so worker skin/uniform/PPE variants apply at runtime without
duplicating texture memory. The generated assets carry three each and were
admitted as a considered exception. **A variant multiplies that count by the
number of variants** — three more cottages is nine more texture uploads. Price it
in GPU memory before authoring the queue, and note that §3.3 says the right
resample size is 512 for most of them, not 1024.

### 4.4 The provenance description is already stale

`PROVENANCE.json`'s `transformation.description` says the maps are resampled "to
512 JPEG". Six specs carry `texture: 1024` (`farm-barn`, `farm-farmhouse`,
`village-townhall`, `village-marketstall`, `village-duckpond`,
`village-castle`). The sentence is generated by
`scripts/write-model-provenance.mjs` and should be corrected there, in the same
pass that adds anything to the table.

---

## 5. Instruments, and which question each answers

| instrument | answers | CANNOT answer |
|---|---|---|
| `curl .../user/balance` | what this will actually cost, before and after | anything about `consumed_credit`, which under-reports |
| `roster/harness/run-queue.mjs` | submits a whole queue, refuses to overrun the balance | rigging — that is a second call with no runner |
| `npm run validate:assets` | 34 manifest contracts: bounds, vertices, materials, textures, ground tolerance | whether the asset looks like the thing |
| `npm run provenance:models` | regenerates both PROVENANCE.json from the table and the normalization report | it THROWS if any spec has no report row |
| `test-results/pass6/texel-density.mjs` | screen px per texel at the closest camera that CONTAINS each asset, mean and worst decile | occlusion — containment is not visibility |
| `test-results/pass6/stall-surfaces.mjs` | where an asset's up-facing surfaces are, in metres, so dressing can stand on them | anything about the asset's sides |
| `test-results/pass6/flat-owners.mjs` | which component draws a flat material row, grouped in the page | how big it looks on screen |
| `node scripts/audit-scene-models.mjs` | 22 scenes, defects, flat rows by branch and by world size | whether a shader injection DOES anything |
| `npm run measure:surfaces [--crop=x,y,w,h]` | does the treatment change pixels, where, how much | whether the change is an IMPROVEMENT |
| `npm run review:stage-ab` + `blind-ab-judge` | did this iteration help, and WHERE | whether it is good enough |
| `visual-fidelity-judge` | is it good enough, against a written rubric | anything about a surface no camera frames |
| `capture:art --set=art --perf-gate` | 12 art frames plus a conjoined non-art budget run | anything at night; use `--time=22` |

---

## 6. Traps this lineage has already paid for

### 6.1 A prompt describes THIS object, not its category

The scarecrow came back with a burlap sack head where the shipped one is a carved
pumpkin. It was a good scarecrow. It was the wrong scarecrow. Cite a source line
and describe the shipped design — materials, colours, proportions, the
distinguishing feature — and expect two or three cuts on anything whose DESIGN
matters rather than its category. Image-to-3D or multi-view is the targeted spend
for exactly that class, and it is where the church and the fountain would have
been cheaper.

### 6.2 A monolithic GLB silently drops a caller contract

Tripo returns `animations: 0` and a **single node**. `Cow` took `groupRef` *and*
`headRef` as required props, with `<group ref={headRef}>` wrapping head, muzzle,
nostrils, eyes, ears and horns, and two per-frame drivers acting on it — grazing
`rotation.x` when idle, `rotation.z` head-shake on click. The grazing motion is
the animal's main sign of life at distance, and a single-node swap drops it
without an error anywhere. That is why the creatures were rigged rather than
dropped in, and it is the question to ask of **every** swap: what still speaks
the previous contract?

The same finding, from the other side: the generated pig rig stops at `Head` and
has no tail joint, so `PigPrimitiveBody::tailRef` animates only the fallback.
`GeneratedWindmill.tsx` turns its sails in the **vertex shader** precisely
because the generated mill is one welded shell with no blade group to spin. That
precedent is the free route for the pig's tail; the re-rig is ~25 credits for the
same result.

### 6.3 A `Material.copy()` is not a clone of its shader

`THREE.Material.copy()` deep-copies userData through
`JSON.parse(JSON.stringify(...))` and does NOT copy `onBeforeCompile`. Clone
FIRST and inject SECOND; guard on object IDENTITY, never on presence.
`hasWorldSurface()` is the pattern, and `ownsOnlyWorldSurface()` is the stricter
one the batcher needs since pass 6 introduced composed injections.

### 6.4 Check the file is alive before editing it

`npm run validate:reachability`. 91 of 475 production modules are dead, including
whole subsystems that look exactly like live code. Pass 4 converted 129 materials
in a dead file; pass 5 built the gate that catches it in eight seconds.

### 6.5 Look at the frame before believing the counter

Pass 6 built a label-contrast probe that reported a safety marking as darker than
its floor. The crop showed the projected point parked behind a truck and the
reading taken off the truck's shadow. A second run reported the same label as
1.50x brighter — off an orange worker's hi-viz jacket. Both numbers were
arithmetic on the right frames and both were about the wrong pixels. **Crop and
look before quoting any ratio**, especially one that confirms what you expected.

### 6.6 Frustum containment is not visibility

`test-results/pass6/texel-density.mjs` and `pass6/painted-labels.mjs` both test
whether a subject is inside a camera's frustum. Neither tests occlusion. A first
draft of the texel probe measured six village buildings from the village ORIGIN
and declared them under-resolved; their real placements put the church, both near
shops, the pub, the forge and the school outside the `square` camera — four of
them behind it.

---

## 7. Standing constraints

- **DO NOT SPEND WITHOUT ASKING.** Read the balance, price at 45 credits per
  detailed generation, state the total and the rejection budget, and wait.
- `.capture.lock` (`scripts/lib/capture-lock.mjs`) is mandatory for anything that
  renders, and re-entrant through `MILLOS_CAPTURE_LOCK_PID`. Two renderers on one
  machine do not fail — they each run at half speed and the frame rate in the
  report becomes a measurement of the other process.
- **Another session may be rendering.** Pass 6 ran alongside a headless Chromium
  holding 300-490% of CPU for over an hour, outside the lock. Pixel-diff
  measurements survive that (the `receiving` control reproduced pass 5 to two
  decimal places); **timing measurements do not.** Check `load` and the other
  process before believing a red benchmark, and re-run later rather than relaxing
  a budget.
- Pass 6 also killed a probe that had been serialising 1,700 meshes over CDP for
  21 minutes. If a page-side probe hangs, move the grouping INTO the page —
  `test-results/pass6/flat-owners.mjs` is the rewrite that runs in four.
- This machine drifts ~1.9 ms across identical runs. Interleave arms, run at
  least three pairs, report the control-only spread beside any delta.
- **Another session holds port 5199.** Do not take it.
- **Disk: ~16 GiB free of 3.6 TiB, and `test-results/` is 3.7 GB.** Check `df`
  before a session that adds several full capture runs. Delete nothing you did
  not create.
- `test-results/` is gitignored and is where evidence goes. Pass 6's probes are
  in `test-results/pass6/`.
- The Tripo licence gate is BLOCKING and was cleared once: the free tier releases
  outputs CC BY 4.0, public and non-commercial, while commercial rights attach to
  paid and API plans. `PROVENANCE.json` records that the account owner confirmed
  it before any output entered `public/models/`. **A new key or a changed plan
  re-opens that gate.**
- Deploy on request only. End every report with exactly one of "local only — not
  live" or "live — verified in the served bytes".

---

## 8. The gate baseline to reproduce before changing anything

Measured on this tree, 2026-08-18, all green:

```
npm run typecheck / lint / format:check      clean
npm test                                     108 files, 1721 tests, 0 failures
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

`markings` is new in pass 6 — a 22nd benchmark scene looking down on the
receiving apron, added because the ground safety markings were inside
`shipping`/`receiving` frustums at 38-197 m and legible from neither.
