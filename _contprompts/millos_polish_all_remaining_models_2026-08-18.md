---
title: MillOS — polish every remaining model. A work order for a fresh context, with the Tripo spend priced and the free levers separated from the paid ones
date: 2026-08-18
status: WORK ORDER. Pass 5 closed its predecessor's eight items; what is here is what is left, and most of it is NOT a generation spend
branch: launch-audit-polish
predecessor: _contprompts/millos_all_models_pass5_2026-08-18.md
read_first:
  - "CLAUDE.md § World Surface Treatment and § Measuring a Visual or Performance Change. Every rule in both was earned; pass 5 re-earned four."
  - "CLAUDE.md § A file that does not ship cannot be fixed. Run `npm run validate:reachability` BEFORE editing an unfamiliar file. 91 of 475 modules are dead and several look exactly like live code."
  - "_contprompts/millos_all_models_pass5_2026-08-18.md §8, the instrument traps. 8.3 and 8.7 in particular."
verification_criteria:
  - "SEPARATE THE PAID FROM THE FREE. Exactly one item in this document costs Tripo credits (§2). Everything in §1 and §3 is engineering, and the barn resample in §3.1 costs nothing because the 4096 originals are preserved."
  - "`audit-scene-models.mjs` CANNOT verify surfacing work - it scores the PRESENCE of a shader injection. Use `npm run measure:surfaces` as the paired control, and read an exactly-zero changed fraction as an inert term."
  - "Verify on the surface you changed, not on the scene that contains it. Pass 5's dock work read x1.031 before and after at scene level; the discriminating number was 321 of 655 pixels inside the hazard band."
  - "A flat percentage is a MESH COUNT. Read it beside the world-size column or you will work a hundred bolts before the wall behind them."
  - "Capture at night as well as at noon, and check what the camera actually CONTAINS - six of pass 5's eight painted labels are framed by no camera in any set."
---

# MillOS — polish every remaining model

## 0. Where this starts

Thirty Tripo-generated assets are shipped, wired, normalised and provenanced.
Every branch in the scene except one carries the analytic surface treatment. The
flat-material work list has been closed twice. **The remaining work is a short
list, and the biggest single item on it costs nothing.**

Read the three-way split before picking anything up, because these have very
different costs and the lineage has blurred them before:

| | costs | biggest single win |
|---|---|---|
| **§1 Engineering polish** | engineering only | the `vegetation` profile is authored and applied to NOTHING |
| **§2 Tripo generation** | **real money** | markings variants, the only non-tint fix for the clone reading |
| **§3 Free asset work** | nothing - the 4096 originals are preserved | the barn's texel density |

Gate baseline on this tree, all green, reproduce before changing anything:

```
npm run typecheck / lint / format:check      clean
npm test                                     108 files, 1715 tests, 0 failures
npm run build                                ok
npm run validate:assets                      34/34 PASS
npm run validate:depth                       56 active files, 12 relationships
npm run validate:shaders                     24 families, 25 stable cache keys
npm run validate:bundle                      112.50 MiB dist (budget 170)
npm run validate:reachability                91 known dead, 0 new, 0 graph misses
node scripts/audit-scene-models.mjs          21 scenes, 0 blockers, 0 warnings
npm run capture:art -- --set=art --perf-gate 12/12 art PASS + 12/12 perf PASS
npm run measure:surfaces                     9/9 moved, no inert readings
```

**Local only — not live.** Nothing is committed.

---

## 1. Engineering polish, ordered by what a viewer actually sees

Take one numbered item, finish it completely, re-measure, report the delta.
**Do not part-deliver an item and present the remainder as a plan**; if you run
out of room mid-item, say which meshes remain, with counts.

### 1.1 The `vegetation` profile is authored and applied to nothing

`WORLD_SURFACE_PROFILES.vegetation` exists in full in `src/utils/worldSurface.ts`
— macro period 3 m, its own grime and dust, object space. **The only reference to
it in the entire repo is `worldSurface.test.ts:210`.**

This is not an inference from the source. Pass 5's blind judge, which did not
know what it was looking at, measured the grass in `overview` and `yard` at
**exactly 0.000 change across mean luminance, HF energy and block standard
deviation** between the treatment-on and treatment-off arms, and flagged it
unprompted: *"read that as 'this surface is outside the treated set', and it is
actionable."* Per CLAUDE.md's own rule, an exact zero is an inert term, not a
cheap one.

Grass is the largest continuous surface in the world and it is currently one flat
colour plus a tiled texture. The batcher cannot reach it — foliage is
`InstancedMesh` or transparent, which is exactly why it was never picked up —
so this has to be applied at the owning branch the way the conveyors were:

| owner | what it draws |
|---|---|
| `src/components/scenery/InstancedFoliage.tsx` | the instanced foliage both `FarmArea` and `VillageArea` mount |
| `src/components/terrain/TerrainGround.tsx` | the ground plane itself |
| `src/components/FactoryExterior.tsx` | the site's grass fields |

**Object space vs world space is the decision to get right, and it is not the
usual one.** Foliage instances do not move, so the world field is correct for
tonal variation across a field — that is what stops 200 instances of one bush
reading as 200 copies. But `objectSpace: 1` is what the profile ships with.
Decide deliberately and write down which and why; pass 4 paid for getting this
backwards on the workers.

Verify with `npm run measure:surfaces -- --scenes=overview,yard,farm,village` and
a CROP on a grass field, not on the scene aggregate (§6.3).

### 1.2 `authored-village` is the least-finished branch in the scene

```
authored-village   82 meshes   32% albedo  29% normal  26% rough  28% shader  59% flat
```

Every other branch is between 44% and 100% shader-finished. **Read the two
columns together before working it**: pass 3 §3.4 established that this branch's
66%-flat reading was 15 m of fence posts, and no village row appears in the top
24 of FLAT MATERIALS BY WORLD SIZE at all. So this is a large mesh COUNT of small
parts, not a large surface.

That makes it a judgement call rather than an obvious win, and the judgement
should be made from the world-size column plus a `village` capture, not from the
59%.

### 1.3 `world-logistics` — 176 m over 41 meshes, and two owners unidentified

Pass 5 finished the truck cabs here (2 x 19 m) and judged two rows closed. What
is left, measured at `personnel-close`:

| row | metres | meshes | inst | largest | state |
|---|---|---|---|---|---|
| `MeshStandardMaterial #ffffff` | 118 | 21 | 149 | 3.0 m | **owner not identified** |
| `#fef3c7` | 40 | 4 | 20 | 2.0 m | truck-yard pallets; owner known |
| `#1f2937` | 18 | 16 | 14 | 2.5 m | **owner not identified** |

**Identify the owners before deciding.** `test-results/pass5/flat-owners.mjs`
exists for exactly this: it prints the full ancestor path, material name, world
metres and shaded state for every mesh carrying a given colour, which is what the
audit's `<Group>/<Mesh>` withholds. Pass 5 built it and then did not point it at
these three rows — do that first, in one page load:

```bash
node test-results/pass5/flat-owners.mjs personnel-close ffffff,fef3c7,1f2937
```

### 1.4 Six of the eight painted ground labels are framed by no camera

Pass 5 gave `SceneText` a `surface="painted"` opt-in and applied it at eight
ground-painted sites. `test-results/pass5/text-surfaces.mjs` confirms all of them
bind — `interior` reports **84 glyph meshes, 6 lit, 78 unlit**, and all six lit
ones sit at y between -0.01 and 0.09.

Only `TRUCK STAGING` has been looked at in pixels. `KEEP CLEAR`, both `YIELD`
markings, the parking `P`, `WEIGH STATION` and `STAGING AREA` appear in no frame
of the art set or the night set.

**The risk is specific and worth one capture.** A lit label is darker than an
unlit one, interior floors are darker than the yard, and a SAFETY marking that
has gone lit can end up darker than the floor it is painted on. Either add a
camera that frames the mill floor's markings to `BENCHMARK_SCENES`, or measure
them from a close capture and record the contrast against the floor.

### 1.5 The `yard` shed roof — a replicated observation, not one opinion

The maintenance shed's flat roof is where `masonry.dust` is closest to
saturating. Pass 4 cut the profile from 0.24 to 0.18 because that roof went from
teal to olive. Pass 5's blind judge, independently and without knowing which side
was which, named the same surface: *"the shed roof goes from a smooth teal slab
to a khaki-olive dust cake whose hue and value land close to the surrounding yard
dirt, so roof-to-ground separation weakens and the painted-steel read of that
building is gone... this is the site to watch if the float goes up."*

It called it short of a defect, so pass 5 did not cut it further — one adversarial
read is not grounds to overturn an authored number. **But two passes, a day
apart, by two different methods, flagged the same surface in the same direction.
That is a replication.** Weight it as one, and if it is cut, validate the cut
with its own blind A/B rather than by eye.

### 1.6 Animation is CLOSED, with one recorded cost that is not free to fix

All eight non-scarecrow creatures now carry `ref={rigRef}` — sheep, pig, horse,
crow, duck, cat, cow and chicken — and the scarecrow's bend is 0 by design.
`primitiveBodyLeaves.test.ts` guards both orphaned components and refs threaded
into `*PrimitiveBody` wrappers, with a stated reason per allow-list entry. The
older finding that "seven of nine rigs are never driven" is closed.

**One cost was recorded rather than fixed, and it is NOT an engineering gap:**
`PigPrimitiveBody::tailRef`. The tail wag lives only on the fallback body because
**the generated pig rig stops at `Head` and has no tail joint** — there is
nothing on the skinned mesh to drive. So the options are a re-rig (**~25 credits,
§2**) or the windmill's solution: `GeneratedWindmill.tsx` turns its sails in the
VERTEX SHADER precisely because the generated mill is one welded shell with no
blade group to spin. That precedent is the cheap route, and it costs nothing.

Neither is urgent. It is listed so nobody re-discovers it as a bug.

---

## 2. The Tripo spend — priced, and still Nell's call

**DO NOT SPEND WITHOUT ASKING.** This is the only item in this document that
costs money.

### 2.1 The balance and the rate

Last recorded **1,435 of 3,500 credits spent**, leaving ~2,040-2,065 on the key
(both figures appear in the record; check the account before committing).
**~30 credits per generation, ~25 per rig.**

### 2.2 The settings already in use — "turn the quality up" is not a switch

Every one of the 30 assets was generated with the strongest options the runner
offers, and `assets/source/models/{farm,village}/PROVENANCE.json` records the
exact pipeline per asset:

```
text_to_model v2.5-20250123, texture: true, pbr: true,
texture_quality: 'detailed', face_limit: 8000
```

So a regeneration buys a different result, not automatically a better one.

### 2.3 The one option that fixes a named defect

**The clone reading.** Both independent judges named it as the strongest
criticism of the generated set: one model, one texture, yaw the only variation.
Current placements:

| asset | instances | where |
|---|---|---|
| `Cottage` | **5** | `VillageArea.tsx` |
| `MarketStall` | **4** | `VillageArea.tsx` |
| `Sheep` | **4** | `FarmArea.tsx` |
| `ShopBuilding` | **3** | `VillageArea.tsx` |
| `Horse` | 2 | 1 farm, 1 village |

**The free half of the fix is already shipped** — deterministic per-instance yaw
and non-uniform scale. What remains free and untaken is varying the DRESSING
rather than the model: the losing side of an earlier blind A/B read as a market
rather than copy-paste precisely because the goods on each stall differed while
the frame was shared. **Do that before spending anything.**

The paid half: a second and third markings variant for `cottage`, `marketstall`
and `shop`. **≈ 8-10 generations, ≈ 240-300 credits.** That is the only fix for
the clone reading that is not a tint — and do not tint: `Cottage.wallColor` and
`ShopBuilding.wallColor` still exist and still drive the fallbacks, and wiring
them to a generated body would wash a baked albedo, which is the exact pattern
CLAUDE.md names.

### 2.4 The three options that are speculative

State the uncertainty rather than pricing them as if it were resolved:

| option | cost | why it is not obviously worth it |
|---|---|---|
| a newer `model_version` | regenerate everything: **~900 credits** | v2.5-20250123 is what shipped; whether a newer version exists was **never verified against the API**. It is all-or-nothing — a mixed set will not match |
| `face_limit` above 8000 | ~30/asset + triangles | the farm already carries **+948,739 triangles** over the primitives it replaced. Justify against that number, not against zero |
| image-to-3D or multi-view instead of text-to-3D | ~30/asset | genuinely better for assets whose DESIGN matters rather than their category - the church and the fountain each needed three cuts on text-to-3D. A small, targeted spend |
| re-rig the pig with a tail joint | ~25 | buys one wagging tail. The vertex-shader route in §1.6 buys the same thing for nothing |

**Recommended order if Nell says yes**: the free dressing variation first, then
§2.3's markings variants, then image-to-3D for the church and fountain only. The
version bump is the one to leave alone until its existence is checked.

---

## 3. Free asset work — no credits, because the originals are preserved

All 30 4096-square Tripo originals live under `assets/source/models/` (63 MB)
with a `PROVENANCE.json` per area carrying the sha256 of both the source and the
shipped derivative. **Re-resampling is therefore free.**

### 3.1 Texel density: one word, ~37 MB of VRAM

`barn` is the only generated asset measurably under-resolved: **2.32 px/texel at
1024, 1.16 at 2048**, where ~1.0 is ideal. The next two are `duckpond` at 1.59
and `townhall` at 1.55, and both would be OVER-resolved at 2048 (0.80 and 0.78),
paying roughly 4x memory for detail no camera can see.

The change is `texture: 2048` on `farm-barn` alone in `GENERATED_ASSETS`
(`scripts/normalize-model-assets.mjs`).

Two frictions, unchanged for three passes: the cost is **GPU texture memory, not
bundle bytes** (~12.6 MB per 1024 set against ~50 MB at 2048; `validate:bundle`
reads 112.50 of 170 MiB, so bundle headroom is not the constraint); and
`normalize-model-assets.mjs` has **no per-asset filter**, so taking it regenerates
all 30 shipped assets. Cheap to do deliberately on a clean tree; wrong to do
incidentally on a dirty one — and this tree has 81 uncommitted files.

---

## 4. Judged and CLOSED. Do not re-open without new evidence

Each of these looks like work and is not. If you disagree, overturn it the way
pass 4 overturned two pass-3 closures — **on new grounds, stated, in the source**
— not by quietly re-litigating the old ones.

| thing | metres | why it stays |
|---|---|---|
| `factory-glazing` | 364 | Glass. Transparent, nothing for a surface map to do |
| `factory-walkway-paint` | 274 | A transparent floor marking. Same |
| `MeshBasicMaterial #ffffff` | 198 | troika glyph meshes. The part of this that WAS work is done - see §1.4 |
| `machine-hardware` | 195 | Sub-0.25 m members. A grid tiled onto a 0.075 m rail is sub-pixel noise that mips to a flat constant |
| `MeshBasicMaterial #0a2a3a` | 144 | The canal's water-depth plane, seen THROUGH translucent water. Unlit on purpose |
| `factory-fixture-lens`, `factory-skylight` | 72 / 57 | An unlit lamp lens emits; roof glazing is transparent |
| `#3b82f6` ground lane paint | 50 | 0.15 m wide - 1-3 px at the yard camera. CLAUDE.md's procedural rule 5 |
| `#fbbf24` yard hazard markings | 36 | Same geometry class, same reason |
| `MeshBasicMaterial #fef9c3` | 29 | A dock light-spill quad. Correctly unlit |
| `MeshBasicMaterial #000000` in personnel | 14 | Worker contact-shadow blobs. Correctly unlit |
| the machine bank, silos, spouting | — | blank albedo is deliberate; `machineDecals.ts` pins quads at hand-tuned world Z |
| the truck | — | the most authored object in the repo; a single-node GLB is a downgrade |
| trees and foliage GEOMETRY | — | faceted low-poly is stated art direction. §1.1 is about their SURFACE, not their silhouette |
| workers, forklift | — | already validated GLBs with named clips |

---

## 5. Instruments, and which question each answers

| instrument | answers | CANNOT answer |
|---|---|---|
| `npm run validate:reachability` | does this module reach the browser; who keeps it alive (`--why=`) | whether live code is any good |
| `node scripts/audit-scene-models.mjs` | is any mesh defective; what is flat, by branch and by world size | whether a shader injection DOES anything - it scores presence |
| `npm run measure:surfaces` | does the treatment change pixels, where, how much; an exact zero is an inert term | whether the change is an IMPROVEMENT, or where in the frame it landed |
| `npm run review:stage-ab` + `blind-ab-judge` | did this iteration help, and WHERE | whether it is good enough |
| `visual-fidelity-judge` | is it good enough, against a written rubric | anything about a surface no camera frames |
| `capture:art --perf-gate` | 12 scenes, art frames plus a conjoined non-art budget run | anything at night |
| `capture:art --time=22` | unlit surfaces, glowing paint, night legibility | daylight tonal balance |
| `audit-scene-motion.mjs` | is it animating, in all four channels | why it is not |
| `test-results/pass5/flat-owners.mjs` | which component draws a flat material row | how big it looks on screen |
| `test-results/pass5/text-surfaces.mjs` | which glyph meshes are lit, and at what height | whether they are legible |
| `test-results/pass5/bright-pixels.mjs` | night bright-pixel counts, whole-frame or cropped | anything whose threshold you have not calibrated - see §6.4 |

---

## 6. Read this before you edit anything

### 6.1 Check the file is alive BEFORE you edit it

`npm run validate:reachability`. **91 of 475 production modules are dead**,
including whole subsystems that look exactly like live code:
`components/ambient/*` (26 files), the `machines/Instanced*` tree (14),
`infrastructure/*` (11), and `conveyors/CompactConveyorSystem.tsx` — which a
previous work order named as an owner of live work.

Pass 4 converted 129 materials in a dead file. Pass 5 built the gate that would
have caught it in eight seconds.

### 6.2 A gate that scores presence cannot score effect

Attach any `onBeforeCompile` and the row leaves `audit-scene-models.mjs`'s work
list whether or not a pixel changed. **Run the paired control** —
`npm run measure:surfaces` — and read an exactly-zero changed fraction as an
inert term.

### 6.3 Verify on the surface you changed, not on the scene containing it

Pass 5's dock work moved `interior`'s contrast ratio from x1.031 to x1.031,
because the dock threshold is a few hundred pixels of a frame dominated by
conveyors. The discriminating measurement was a CROP: inside the hazard band in
the `receiving` on/off pair, **321 of 655 yellow pixels changed at mean delta
7.88, with zero excluded for self-motion.**

A scene aggregate answers "did this scene change". Only a crop answers "did THIS
change".

### 6.4 A threshold calibrated on one defect cannot see the next one

Pass 4 measured glowing road paint at luma > 160 and got 20,203 -> 0. The same
count on grey ground text returned an exact zero — which this repo reads as "the
term is inert" — while the label was plainly visible in the frame and plainly
gone afterwards. `#475569` slate at full daylight brightness is luma ~85.

**Look at the frame before believing the counter.**

### 6.5 Both ends of a smoothstep span are a claim about where the geometry is

`machineSurfaces.ts` records the datum-too-low failure: a zero-datum grime ramp
saturates on the plansifters at y 9 and evaluates to nothing. Pass 5 hit the same
trap from above — a truck cab given `grimeCeiling: 1.15` when the cab spans y
1.0-3.2 m, so the term was zero over the whole part while every gate passed.

Check the part's actual world height before choosing either end.

### 6.6 A standing warning is a hypothesis about the instrument too

The audit warned about 53 zero-opacity meshes in all 21 scenes for three passes.
Every one was inside a hidden group and was never drawn; the check was reading an
object's OWN `visible` flag while three's renderer stops at the first invisible
ancestor. It now reads `visibleInTree`, and the audit is at 0 warnings.

### 6.7 A clone is not a copy

`THREE.Material.copy()` deep-copies userData through
`JSON.parse(JSON.stringify(...))` and does NOT copy `onBeforeCompile`. Clone
FIRST and inject SECOND; guard on object IDENTITY, never on presence —
`hasWorldSurface()` is the pattern.

---

## 7. Standing constraints

- `.capture.lock` (`scripts/lib/capture-lock.mjs`) is mandatory for anything that
  renders. Two headless Chromium instances on one GPU do not fail, they each run
  at half speed, and the frame rate in your report becomes a measurement of the
  other process. Re-entrant through `MILLOS_CAPTURE_LOCK_PID`.
- `test-results/` is gitignored and is where evidence goes. Pass 5's probes are
  in `test-results/pass5/`.
- **Another session holds port 5199.** Do not take it.
- A red benchmark is not a regression until you have looked at `load`; above ~3.0
  runnable per core, re-run later rather than relaxing a budget.
- This machine drifts ~1.9 ms across identical runs. Interleave arms, run at
  least three pairs, and report the control-only spread beside any delta.
- `--seconds=75` on any motion audit touching the docks or the trucks.
- **Disk: 18 GiB free of 3.6 TiB, and `test-results/` is already 3.2 GB.** Check
  `df` before a session that adds several full 21-scene capture runs. Delete
  nothing you did not create.
- Deploy on request only. End every report with exactly one of "local only — not
  live" or "live — verified in the served bytes".
