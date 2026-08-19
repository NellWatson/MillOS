---
title: MillOS generated assets — Tripo3D trial, and the road to ALL models
date: 2026-08-15
status: 30 models generated, rigged and compared; ZERO integrated into the build; nothing committed
scope: every hand-authored model in the live scene, plus the Tripo3D generation/rig pipeline built to replace them
branch: launch-audit-polish
credits: 1,435 of 3,500 spent; 2,040 remaining on the key at time of writing
verification_criteria:
  - "No generated asset is described as shipped until it is in `public/models/`, listed in `asset-manifest.json`, and `npm run validate:assets` is green."
  - "Every before/after pair renders the REAL shipped component, not a transcription, unless the transcription is labelled as one."
  - "Every prompt is checked against the shipped material palette at its source line BEFORE spending, not after."
  - "Credit spend is reconciled against `balance`, never against `consumed_credit`."
  - "Any claim that an asset 'looks better' is backed by a rendered pair a reader can open."
  - "The machine bank is not sent to a generator again without new evidence that the albedo problem is fixed."
  - "Typecheck, lint, production build and the full test suite are green before any integration lands."
---

# MillOS — generated assets, continuation

## 1. Where this stands

A Tripo3D trial ran across two days. **30 unique models** were generated,
textured, and — where they are creatures — rigged and animated. Every one is
compared against the shipped original in a rendered pair.

**None of it is integrated.** No file under `src/` was modified, no asset was
added to `public/models/`, no manifest entry was written. Everything lives in
`test-results/tripo-probe-20260815/` (gitignored) as evidence.

| Group | Count | Where |
|---|---|---|
| Creatures, rigged + animated | 9 | `roster/index.html` |
| Buildings and props | 22 | `roster/buildings.html` |
| Unique models (cat is in both) | **30** | `roster/models*/` |

Creatures: cow, horse, sheep, pig, cat, chicken, duck, crow, scarecrow.
Structures: barn, farmhouse, coop, windmill, cottage, church, town hall, pub,
school, forge, market stall, wishing well, fountain, shop, castle, duck pond,
postbox, hay bale, water trough, garden bed, fence.

Full narrative and every measurement: `test-results/tripo-probe-20260815/FINDINGS.md`
(507 lines). Read it before re-deriving anything.

## 2. The two findings that shape all further work

**Tripo textures organic and architectural subjects. It does not texture
machinery.** A roller mill came back with good geometry wrapped in a 2048&sup2;
albedo that is near-white noise — no panel lines, no fasteners, no staining. The
same pipeline gave a Holstein cow correct markings and a cottage real thatch.

This matters because the standing art verdict
(`test-results/art-review/loop-proof-20260807/verdict.md`) names untextured
primary surfaces and "one uniform plasticky gloss" as its blocking defects, and
those surfaces are **the machine bank**. Generation does not fix that blocker; it
would add another instance of it. The machine bank's fix is MillOS's own
procedural texturing path (`createColorDataTexture` / `createLinearDataTexture`),
not a generator. **Do not spend credits there without new evidence.**

**Every rig is the same skeleton.** Tripo classifies models into `quadruped`,
`avian` and `biped` and the prerig check is **free** — but the label only changes
the fit. All nine rigs ship an identical **41-joint skeleton with identical bone
names** (`Root`, `Hip`, `Spine01/02`, `NeckTwist01/02`, `Head`, `L_Thigh`, …).
One animation driver covers a crow and a horse with no per-species branch. That
is what made nine loops affordable, and it is why adding a tenth creature is
cheap.

## 3. The harness — read this before generating anything

Everything is under `test-results/tripo-probe-20260815/roster/harness/`.

| Script | Does |
|---|---|
| `run-queue.mjs` | Fires `queue.json`. Refuses to start unless the balance covers the WHOLE queue. Respects the 8-task concurrency ceiling that 429s above it. |
| `../../harness/before/` (vite app) | Renders the **real shipped components** and aims a camera at any named subject. Lives one level up, at `test-results/tripo-probe-20260815/harness/before/` &mdash; its imports walk `../../../..` to the repo root, so do not relocate it. |
| `shootbldg2.mjs` | Before frames, **fresh page per subject**. |
| `shootbldgs.mjs` | After frames from generated GLBs, auto-fitted camera. |
| `all.html` + `shootall.mjs` | Creature pairs (procedural transcription vs generated). |
| `flock.html` + `shootflock.mjs` | Rigged creature animation; solves neck reach per species. |
| `bones.mjs` | Dumps triangles, textures, joints and the neck chain of any rigged GLB. |

```bash
cd test-results/tripo-probe-20260815/roster/harness
TRIPO_KEY=tsk_... node run-queue.mjs        # generate whatever is in queue.json
npx vite --config ../../harness/before/vite.config.mjs --port 5199 --strictPort --force
node shootbldg2.mjs <names...>              # before
node shootbldgs.mjs <names...>              # after
```

## 4. Rules that were paid for

**Prompt the instance, not the category.** Four assets needed a second cut and
every failure was the same: the prompt described *a church*, *a fountain*, *a
pond*, *a trough* rather than **this** one. Read the component's geometry and
material palette at its source line first, then name the specific features. The
scarecrow came back with a burlap sack head because the prompt did not say the
shipped design has a **carved pumpkin** (`SG.pumpkinHead`, `SM.pumpkinOrange`).

**State proportion when it is not generic.** The fountain returned 4.33 m tall on
a 3.2 m footprint — a monument. The shipped fountain is round, two-tier and
*wider than it is tall*. Saying so fixed it in one cut.

**Rule things out, not just in.** The corrected church grew **green blobs across
its roof** until the prompt said "bare and free of any moss vegetation or
greenery". The generator volunteers detail nobody asked for.

**Rig with Tripo; animate in MillOS.** `animate_retarget` presets are humanoid.
`preset:idle` on the quadruped cow **rears it onto its hind legs** for the whole
clip, because the rig names front legs `Clavicle`/`Upperarm`/`Hand`. Kept as
`test-results/tripo-probe-20260815/models/tripo_cow_idle_REJECTED.glb`. The farm has no locomotion to retarget onto
anyway: every animal behaviour is an imperative ref nudge, three of four fired by
`handlePet`.

**Bone axes are not world-aligned, and `rotateOnWorldAxis` is wrong here.** It
premultiplies in *parent* space, which equals world space only for an unrotated
parent; these bones sit deep in a rotated chain. Convert the world axis into
parent space first — the working helper is `rotateBoneWorld` in `flock.html`.
A local Euler on `Head` yaws instead of nodding.

**Clone rigged meshes with `SkeletonUtils.clone`.** `Object3D.clone(true)` leaves
every copy bound to the ORIGINAL skeleton, so all copies pose identically no
matter what you set. Cost one baffling render of three identical cows.

**Solve neck reach per species; do not minimise it.** Necks differ ~5x across the
roster. The solver targets `min(0.06, restY * 0.18)` and rejects two poses:
nose behind the neck pivot (the head has curled under the chest — more bend is
not more graze) and nose below the floor. Without the floor test the pig drove
its snout **185 mm through the ground**.

**Anchor the nose to the `Head` joint.** "Furthest vertex along +X" picks a hoof
or a tail tip on some species; the horse solved to *zero bend* that way. Restrict
to vertices skinned to `Head` with weight > 0.5.

**Derive facing from the skeleton, never the bounding box.** Orienting by longest
axis left some models facing -X, which **inverts the pitch sign** — the horse's
graze lifted its nose 245 mm. Compare `Head` world X against `Hip`.

**Loop oscillators must be exact harmonics of the period** (`w(n) = 2*PI*n/T`) or
the clip pops at the seam. And a frame-0-vs-last-frame delta is **not** a loop
test: the last frame sits one frame *before* the loop point and should differ by
exactly one frame of motion.

**The in-engine renderer has three traps, all now fixed in `harness/before/`:**

1. Drive the camera **inside** `useFrame` and let R3F render. Setting the camera
   and calling `gl.render()` by hand from outside the loop drew nothing at all —
   not even a marker box.
2. `publicDir` must point at the repo's `public/`. `VillageArea` loads
   `/fonts/MedievalSharp.ttf`; a 404 makes the font parser throw and React
   unmounts the **entire tree** — the scene reports **0 meshes with no visible
   error**.
3. Use a **fresh page per subject**. On one long run the first seven shots were
   fine and every shot after was empty — GL context loss. The tell was that
   failures were contiguous in *sequence*, not clustered in *space*.

**World transforms.** Neither area is at the origin:

| Area | Transform | Local (x,z) lands at |
|---|---|---|
| Farm | `[75,0,120]`, rot `[0,PI,0]` | `(75 - x, 120 - z)` |
| Village | `[-190,0,0]`, no rotation | `(x - 190, z)` |
| Castle | `[45,0,-200]`, scale 1.5 | its own landmark |

**Pick the camera bearing deliberately.** The default approach put the camera
**inside the barn** for the hay bale (barn spans x 69-81, bale at 68.5) and inside
the wishing well for the cat. `harness/before/main.tsx` takes a per-subject azimuth.

**Budget from `balance`, never `consumed_credit`.** On the first two tasks the
field reported 50 while the balance moved 70 — a ~45% under-report. At later
volume the two agreed exactly. Reconcile against the balance.

**Take `.capture.lock`.** Every render here does, via
`scripts/lib/capture-lock.mjs`. It genuinely mattered: a run waited twice on a
concurrent `benchmark:overview`.

## 5. Do this first — the real gap

**Nothing is integrated, and integration is the unproven half.** Thirty pretty
renders are not thirty shipped assets. Before generating anything further, prove
the path end to end with **one** asset — the cow is the obvious candidate — and
find out what it actually costs:

1. **`maxTextures: 0`.** Every asset in `asset-manifest.json` declares zero
   textures, deliberately, so worker variants apply at runtime without duplicating
   texture memory. A 3-texture generated asset breaks that stance. Decide whether
   the stance bends or the asset gets baked down.
2. **Scale and origin.** Tripo emits a unit box centred on the origin. The
   manifest requires metres, +Y up, +Z forward, **bottom-centre**. Every asset
   needs a human scale decision and a re-origin pass in
   `scripts/normalize-model-assets.mjs`.
3. **Texture weight.** Three 2048&sup2; JPEGs is ~1.5 MB for a background cow.
   512&sup2; and KTX2 before it goes near the bundle.
4. **`requiredNodes` / clip names.** The rig's bone names are stable and semantic,
   which is exactly what the manifest pins. Use that.
5. **`FarmArea.tsx`'s graze constant must change with the asset.**
   `sin(t * 0.5) * 0.15 + 0.3` was tuned for a rigid box head; on the rigged cow
   it is a twitch. Solved value is 1.8 rad with a 0.6 head counter-rotation. The
   old number is **not portable**.
6. **Draw calls and frame time.** `npm run benchmark:runtime` before and after.
   Nobody has measured what 30 textured meshes cost.

Only after that is known should the remaining roster be generated, because the
per-asset integration cost — not the 30 credits — is the real budget.

## 6. What remains — "ALL models", with counts

Reachability first: an earlier pass found **27 of 66 geometry files unreachable**
(`ambient/` is a barrel that makes dead modules look live). **Walk the graph from
`src/main.tsx` before assigning work.**

| Surface | File | Named components | Note |
|---|---|---|---|
| Factory exterior | `FactoryExterior.tsx` (7,681 lines) | ~49 | Largest untouched surface |
| Truck bay | `TruckBay.tsx` (6,271) | ~60 | Dock infrastructure; the truck itself is a reject |
| Infrastructure | `infrastructure/OptimizedFactoryInfrastructure.tsx` (1,703) | ~12 | |
| Factory walls | `infrastructure/FactoryWalls.tsx` (1,572) | ~9 | |
| Conveyors | `ConveyorSystem.tsx` (1,509) | ~11 | Animated — check coupling first |
| Machine bank | `machines/CompactMachines.tsx` (1,548) | ~7 | **Excluded**: blank albedo on machinery |
| Gas station | `GasStationInstanced.tsx` (1,208) | ~3 | Instanced — check coupling |
| Spouting | `SpoutingSystem.tsx` (458) | ~3 | **Excluded** with the machine bank |
| Village leftovers | `VillageArea.tsx` | ShopBuilding variants, `InstancedLamps` | Small |

**~154 named components remain.** That is the honest scope of "ALL". At 30
credits each a naive sweep is ~4,600 credits — more than the key holds — so the
next pass must **triage by visibility and coupling**, not work alphabetically.

Triage rule that has held all trial: generate what is **organic or architectural,
static, and loosely coupled**. Reject what is **industrial, animated, instanced,
or carrying pinned decals**. The standing rejects, each on evidence rather than
taste:

- **Machine bank, silos, spouting** — blank albedo; `machineDecals.ts` pins quads
  at hand-tuned world Z; 30 of 43 draw calls share 9 materials; `raycastSiloShell`
  precedent.
- **Truck** — already the most authored object in the repo (opening doors, landing
  gear, conspicuity tape, LOD gating). A single-node GLB is a downgrade.
- **Workers, forklift** — already validated GLBs with named clips.
- **Trees and foliage** — faceted low-poly is **stated art direction**, not a defect.

## 7. Scene defects found along the way — log these separately

Rendering shipped objects in isolation turned out to be a quiet scene audit. Two
real defects, neither yet fixed:

1. **Cow tail tuft is detached.** `SG.cowTailTuft` sits at `[-0.85, 0.45, 0]`
   while the tail's ends land near `[-0.83, 0.87]` and `[-0.47, 0.53]` — roughly
   20 cm adrift. `FarmArea.tsx:1172`.
2. **A Sheep and a HayBale occupy the identical coordinate** `[6, 0, -2]` and
   interpenetrate. `FarmArea.tsx:2256` vs `:2280`. Visible in
   `roster/before/haybale.png`.

Both are cheap fixes independent of any generated asset. Do them regardless of
whether the trial goes further.

## 8. Standing constraints

- **Licence is clear.** The account is on the API plan and MillOS is not
  commercial; Nell confirmed. Free-tier CC BY 4.0 non-commercial terms do not
  apply here. Still record provenance per `public/models/README.md`.
- **Rotate the key.** `tsk_Nq2q…` appears throughout the prior transcript.
  `run-queue.mjs` reads `TRIPO_KEY` from the environment so a new one never has
  to be pasted into chat.
- Never round-trip a pipeline GLB through Blender; `public/models/*.glb` node and
  clip order is load-bearing (`forklift-hydraulic02-poles-19`).
- `assets/source/models/` is immutable provenance.
- `test-results/` is gitignored with zero tracked files — evidence goes there,
  never into `src/`.
- Match the house comment voice: state the rendered size, the features and why
  they read at that distance, and the envelope preserved.

## 9. Gate commands

```bash
npm run typecheck && npm run lint
npm run build
npm test                     # baseline: 99 files, 1638 tests, 0 failures
npm run validate:assets      # release gate for anything entering public/models/
npm run benchmark:runtime    # NOT YET RUN against any generated asset
npm run capture:art          # then judge with visual-fidelity-judge
```

Baseline note: report failing test **names** before starting, and re-run the whole
gate after each step. A green on the thing you touched says nothing about what you
broke.
