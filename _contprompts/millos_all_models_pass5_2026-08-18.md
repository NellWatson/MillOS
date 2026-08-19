---
title: MillOS — all models, pass 5. The residue is closed, and two of the instruments were lying
date: 2026-08-18
status: work order items 1.1-1.8 CLOSED on code; the two product calls (2.1 texel density, 2.2 Tripo credits) UNTOUCHED and still Nell's
branch: launch-audit-polish
predecessor: _contprompts/millos_polish_remaining_models_2026-08-18.md
verification_criteria:
  - "Two of this pass's eight items were resolved by fixing the INSTRUMENT rather than the scene. The 53-mesh zero-opacity warning was reading an object's own `visible` flag instead of its ancestors'; every one of those meshes was inside a hidden group and was never drawn."
  - "The reachability gate's first build reported four dead files as shipping, because it tested marker uniqueness by EQUALITY while searching `dist/` by SUBSTRING. `Machines.tsx` matched on `text-[10px] text-red-400`, a substring of a longer className in the live `VotingPanel.tsx`."
  - "`conveyors/CompactConveyorSystem.tsx`, named as an owner in the work order's own §1.1, is dead. Doing §1.7 FIRST is what caught it."
  - "The truck cab treatment shipped inert on its first build: `grimeCeiling: 1.15` is BELOW a cab that spans y 1.0-3.2 m, so the term was zero over the whole part. Cab mean luminance 81.69 -> 81.70. At 2.2 it moves 380 px at mean delta 4.5."
  - "A blind adversarial judge, given the on/off arms with the sides shuffled per scene, picked the TREATMENT in 6 of 9 scenes, tied 3, and called 0 regressions - and independently noticed the sides were shuffled, which is the evidence it read pixels rather than a bias."
  - "Typecheck, lint, format, 108 files / 1715 tests, build, validate:assets, :depth, :shaders, :bundle, the NEW :reachability, a 21-scene audit at 0 blockers AND 0 warnings, 12/12 art with its conjoined perf gate, 9/9 surfaces moved at medium and 4/4 at low."
---

# MillOS — all models, pass 5

## 1. The headline

**The predecessor's work order had eight items. All eight are closed.** Two of
them turned out to be defects in the measuring equipment rather than in the
world, and finding that out was worth more than the surfacing.

| item | what it was | outcome |
|---|---|---|
| §1.7 | a reachability list, "a twenty-line script" | `npm run validate:reachability`: 475 modules, **91 dead**, each with a reason |
| §1.2 | ground-painted `<Text>` glowing at midnight | `SceneText surface="painted"`, 8 call sites, **1,501 glowing px removed** |
| §1.1 | `world-conveyors` at **0% shader**, the only branch with none | **79%**, and its one flat row (25 m of rollers) gone |
| §1.4 | `authored-dock-openings` 26% shader / 42% flat | **74% / 26%**; the 26 m hazard-paint row gone, and 49% of the band's pixels move across the A/B |
| §1.5 | the personnel and forklift tails | forklift cargo finished (40 m); the black basic rows CONFIRMED as shadow blobs |
| §1.3 | `world-logistics` small parts | truck CAB paint finished (2 x 19 m); **176 m over 41 meshes remains** - two rows judged closed, three left as small parts with counts in §7 |
| §1.6 | 53 zero-opacity meshes, a standing warning in all 21 scenes | **an instrument artefact.** Now 0 warnings |
| §1.8 | judge the treatment blind, because it was tuned by eye | **6 wins, 3 ties, 0 regressions** |

Branch survey, `personnel-close`, before this pass and after:

| branch | shader before | shader after | flat before | flat after |
|---|---|---|---|---|
| `world-conveyors` | **0%** | **79%** | 20% | 20% |
| `authored-dock-openings` | 26% | **74%** | 42% | **26%** |
| `world-forklifts` | 63% | **66%** | 30% | **27%** |
| `world-personnel` | 67% | 67% | 33% | 33% |
| `world-logistics` | 39% | **44%** | 60% | **54%** |

Flat rows that disappeared: `MeshStandardMaterial #c8ccd0` (25 m, conveyor
rollers), `#eab308` (26 m, dock hazard paint), `MeshPhysicalMaterial #2e87ac` and
`#c65d35` (19 m each, truck cabs), and two thirds of `#fef3c7` (forklift cargo).

**Draw calls did not move.** `overview` 1,209 on the conjoined perf run, against
the predecessor's 1,209.

**Gates, green on this tree:**

```
npm run typecheck / lint / format:check      clean
npm test                                     108 files, 1715 tests, 0 failures
npm run build                                ok
npm run validate:assets                      34/34 PASS
npm run validate:depth                       56 active files, 12 relationships
npm run validate:shaders                     24 families, 25 stable cache keys, 20 sites
npm run validate:bundle                      112.50 MiB dist
npm run validate:reachability                NEW - 91 known dead, 0 new, 0 graph misses
node scripts/audit-scene-models.mjs          21 scenes, 0 blockers, 0 WARNINGS
npm run capture:art -- --set=art --perf-gate 12/12 art PASS + 12/12 perf PASS
npm run measure:surfaces                     9/9 moved, no inert readings
npm run measure:surfaces -- --quality=low    4/4 moved, no black surfaces
npm run capture:art -- --time=22             night set, ground labels no longer glow
```

Nothing is committed and nothing is pushed. **Local only — not live.**

---

## 2. §1.7 first, not seventh — and it immediately paid

The work order listed the reachability audit seventh. It was done FIRST, because
every other item was an edit to an unfamiliar file and §5.1 is the trap that cost
the predecessor 129 wasted edits.

It caught one on the first run: **`src/components/conveyors/CompactConveyorSystem.tsx`
is dead.** The work order's own §1.1 names `src/components/conveyors/` as an
owner of the conveyor work. The live owner is `src/components/ConveyorSystem.tsx`,
which `MillScene` lazily imports at line 54.

### 2.1 What the gate is

`scripts/audit-module-reachability.mjs`, `npm run validate:reachability`. It
reads two independent signals and reports their DISAGREEMENT rather than
guessing:

| signal | says | blind to |
|---|---|---|
| import graph from `src/main.tsx` (static, dynamic, and `new URL(...)` worker edges) | whether a path exists | tree-shaking - a barrel re-exporting a dead component is still an edge |
| a distinctive string literal in `dist/assets/` | what survived the build | files whose strings are shared, or inlined into a caller |

Verdicts: `alive`, `tooling` (a spec a script reads - `depthRegistry.ts`,
`shaderContracts.ts`), `types-only` (no runtime footprint by construction -
`scada/HistorianInterface.ts` has four importers and ships nothing), `dead`,
`tree-shaken`, and `graph-miss`. **`graph-miss` FAILS the gate**: shipped but
unreachable means the resolver missed an edge and every other verdict is
suspect.

`--why=<path>` prints the shortest chain keeping a module alive. `--list` prints
all 475.

### 2.2 The gate's own first build was wrong, in the direction that matters

Marker uniqueness was tested by EQUALITY while the search against `dist/` is a
SUBSTRING search. So a marker only had to be unique as a whole string, while
matching as a fragment:

- `Machines.tsx` - dead for two passes, recorded as dead at the top of
  `machineSurfaces.ts` - reported as SHIPPING on `text-[10px] text-red-400`,
  which is a substring of a longer className in the very-much-live
  `VotingPanel.tsx`.
- `MultiplayerLobby.tsx` on `The host has left the session.`, a prefix of the
  longer sentence in `HostMigration.ts`.

Four dead files read as alive. Markers are now counted across the whole
concatenated source corpus and discarded if they occur anywhere outside their own
file. The tool was self-tested in both directions: removing one `KNOWN_DEAD`
entry FAILS with the new-dead message, and pointing one at a live file FAILS with
the stale-allow-list message.

### 2.3 What the list found

91 dead modules out of 475, grouped and reasoned in `KNOWN_DEAD`:

| cluster | count | why |
|---|---|---|
| `components/ambient/*` + `AmbientDetails.tsx` | 26 | nothing mounts it. **CLAUDE.md listed it as a High/Ultra effect** - corrected |
| the `machines/Instanced*` tree + `Machines.tsx` | 14 | superseded by `machines/CompactMachines.tsx` |
| `infrastructure/*` + `FactoryInfrastructure.tsx` | 11 | superseded by `OptimizedFactoryInfrastructure.tsx` |
| `shaders/*` | 7 | standalone shader modules with no importer |
| `Environment.tsx`, `SkySystem.tsx`, `FactoryEnvironment.tsx`, `environmentRegistry.ts` | 4 | superseded by the `environment/Optimized*` pair |
| `multiplayer/*` UI, `workers/*Indicator.tsx` | 8 | authored, mounted nowhere |
| hooks, materials, physics and village barrels | 9 | barrels nothing imports |
| the rest | 12 | orphans, listed individually |

Two of these are corrections to CLAUDE.md rather than to code:
**`AmbientDetails` does not render on any tier**, and **`utils/depthMaterials.ts`
has no importer** although CLAUDE.md instructs future work to use it. Both notes
are now in CLAUDE.md beside the claims they correct.

`ProductionMetrics.tsx` and `utils/workerDialogue.ts` are flagged `[test-only
importer]`: green suites, rendering nowhere.

---

## 3. Two items were the instrument, not the scene

### 3.1 The 53 zero-opacity meshes were never drawn

The audit's one standing warning, in all 21 scenes for three passes:

```
[WARN] zero-opacity x53 meshes - transparent at opacity 0 -
       drawn every frame and contributes nothing
```

The check is right. Its premise was false. `Object3D.visible` is the object's
OWN flag; three's `projectObject` returns at the first invisible ancestor and
never descends. Every one of those meshes is a forklift's cargo inside
`<group visible={hasCargo || fading}>`, hidden while there is nothing to carry,
and costing nothing.

`inspectObjects` now reports `visibleInTree` beside `visible`, and both the
`zero-opacity` and `invisible-material` checks gate on it. The 21-scene audit
went from 1 standing warning to **0 warnings**.

**A standing warning that never changes is a hypothesis about the instrument as
much as about the scene.**

**The work order specified `audit-scene-motion.mjs --seconds=75` for this, on the
grounds that a billboard at opacity 0 might be mid-crossfade and one frame is a
misleading sample.** That was the right instruction for the hypothesis it had.
Reading the fade code answered it outright instead: the opacity is not
mid-crossfade, it is the resting state when there is no cargo, and the mesh is
inside a group that is hidden in exactly that state. A time sample would have
shown the same 53 meshes at every sample and left the premise untested.

### 3.2 The truck cab treatment shipped inert, and only a crop caught it

`OptimizedTruckBay`'s trailer and chassis have carried `applyVehicleSurface`
since it was written. The CAB never did - it was two of the largest flat rows
left in `world-logistics` (`MeshPhysicalMaterial #2e87ac` and `#c65d35`, 19 m
each). A spotless cab towing a weathered trailer is the inconsistency a viewer
notices without being able to name.

It was given `grimeCeiling: 1.15`, reasoning that a washed cab should carry less
film than a trailer's 1.75. `millosFall` is
`1 - smoothstep( floor, ceiling, worldY )`, so above the ceiling the term is
EXACTLY zero - and a tractor cab spans y 1.0-3.2 m. **The whole part sat above
its own ceiling.**

Every gate passed. The audit reported the material shaded and dropped both rows
from the flat list. The frame did not move:

| build | cab crop mean luma | px changed vs untreated |
|---|---|---|
| untreated | 81.69 | - |
| `grimeCeiling: 1.15` | 81.70 | **36** (edge noise) |
| `grimeCeiling: 2.2` | 81.64 | **380 at mean delta 4.5** |

This is `machineSurfaces.ts`'s saturated-smoothstep trap arrived at from the
opposite side: that one saturates a ramp by putting the DATUM too low, this one
by putting the CEILING too low. **Both ends of a span are a claim about where the
geometry is.**

---

## 4. §1.2 — ground-painted text stopped glowing

Eight call sites, all of them the ones whose rotation is `[-Math.PI / 2, ...]`:
six in `TruckBay.tsx` (TRUCK STAGING x2, WEIGH STATION, STAGING AREA, KEEP CLEAR,
the parking `P`) and two in `ForkliftSystem.tsx` (YIELD x2). No other live file
has ground-facing text.

`SceneText` gained `surface="painted"`, which binds a shared
`MeshStandardMaterial` tracking `ROAD_PAINT_WHITE` in `FactoryExterior.tsx` -
chalky thermoplastic with a small emissive floor. It is an OPT-IN: the default
stays unlit, because the other 75 labels are status readouts meant to stay
legible after dark.

Verified against the library rather than assumed: troika derives its text
material from whatever base it is given and sets `transparent` on the DERIVED
material, and it applies the `color` prop to the derived material too
("to avoid mutating a shared base material"), so one module-level instance
serves every site while each keeps its own colour.

Measured on `shipping` at `--time=22`, in the label's crop: **13,551 -> 12,050
pixels above the night ambient**, and the label is gone from the frame.

**All eight sites were verified to bind, not just the one the night camera
frames.** `test-results/pass5/text-surfaces.mjs` walks the live scene and reports
every troika glyph mesh's material type: `interior` holds **84 glyph meshes, of
which exactly 6 are now `MeshStandardMaterial` and 78 remain unlit**, and all six
sit at y between -0.01 and 0.09 - ground level, including `KEEP CLEAR` at
`FLOOR_LAYERS.floorText`. That is the shape the opt-in was for: the ground paint
shades, every status readout does not.

What is NOT pixel-verified: six of the eight labels are framed by no camera in
either the art set or the night set, so only `TRUCK STAGING` has been looked at.
Their material binding is identical - one shared module-level instance - so the
mechanism is proven; their daylight LEGIBILITY on an interior floor, which is
darker than the yard, is not. A safety marking that has gone lit can go darker
than the floor it is painted on. See §7.

**The first measurement of this read exactly zero, and the threshold was the
reason.** A whole-frame count at luma > 160 - the threshold that made pass 4's
20,203 -> 0 - reported `-0 +0`. `#475569` slate at full daylight brightness is
luma ~85. A threshold calibrated on white road paint cannot see grey text.
Whole-frame counts at a lower threshold are then dominated by scene motion
(`yard` moved -356/+341, symmetrically). **The signal was localised, so the
measurement had to be.**

---

## 5. §1.1 — the conveyors, and where the finish was attached

`src/components/conveyors/conveyorSurfaces.ts` owns the branch's finish.

**The materials are CLONED, not treated in place.** `METAL_MATERIALS`,
`SAFETY_MATERIALS` and `sharedMaterials`' `MACHINE_MATERIALS` are module-level
singletons whose only LIVE consumer is the conveyor system - every other importer
of that file takes `WALL_MATERIALS`, `OUTDOOR_MATERIALS`, `PROCEDURAL_TEXTURES`
or `SHARED_GEOMETRIES`, and the machines have their own set in
`machines/machineSurfaces.ts`. Treating the singletons would work today and
become an invisible trap the moment something else imports one. Clones cost
eleven material objects and zero draw calls.

Clone FIRST, inject SECOND. The reverse produces the JSON ghost `worldSurface`
guards against.

**The rollers take object space; nothing else does.** `RollerConveyor` recomposes
all 25 instance matrices every frame, and a world-space field is nailed to the
world, so a rotating surface sliding through it makes the detail swim. All 25
then sample identically - correct, for parts cut from one drum. The frames and
rails stay in world space, which is what stops two identical 30 m frame boxes
reading as two copies of one prefab.

The flour sacks take `fabric` in rest space, for the same reason: they travel the
length of the belt.

Measured as a paired A/B on the same four scenes, before and after the change:

| scene | changed % | mean delta | contrast ratio |
|---|---|---|---|
| interior | 19.23 -> 20.27 | 3.23 -> 3.85 | x1.015 -> **x1.032** |
| milling | 17.08 -> 17.54 | 3.25 -> 3.53 | x1.034 -> **x1.052** |
| packing | 15.70 -> 16.69 | 3.94 -> 4.72 | x1.051 -> **x1.062** |
| silos | 25.89 -> 26.30 | 3.41 -> 3.57 | x1.029 -> **x1.039** |

---

## 6. §1.8 — the blind verdict, and what it found that no ratio could

The nine `measure:surfaces` on/off pairs were staged through
`scripts/stage-blind-ab.mjs` (sides shuffled per scene) and given to the
`blind-ab-judge` agent, which was told the nature of the change and not the
mapping.

**6 wins for the treatment, 3 ties, 0 regressions.** Decoded against `key.json`:
farm, receiving, shipping, village and yard were won on side A; overview on side
B. The judge independently noticed the sides were shuffled - it pointed out that
the same asset type reverses direction between `yard` and `overview` - which is
the evidence that it read pixels rather than acquiring a bias.

Three things it found that a contrast ratio cannot:

1. **The gain is narrowly located.** It lands almost entirely on UP-FACING
   HORIZONTAL surfaces - roofs, decks, canopy tops - where the untreated side
   renders flat single-colour slabs. Ground planes, walls, the worker mesh and
   the forklift are identical or differ below the visible threshold. Three of
   nine pairs have no discernible difference at all.
2. **`yard` is where the dust term is closest to saturating.** The maintenance
   shed's flat roof goes from a smooth teal slab to a khaki-olive dust cake whose
   hue and value land close to the yard dirt, so roof-to-ground separation
   weakens and the painted-steel read of that building is gone. It stops short of
   a defect - gravel-ballasted flat roofs are ordinary - but **this is the site to
   watch if `masonry.dust` goes up.** Pass 4 already cut it from 0.24 to 0.18 for
   this exact surface; it is not cut further here because "not a defect" is not
   grounds to overturn an authored number, and doing so would need its own blind
   A/B to validate. **But read this as a REPLICATION, not as one opinion**: two
   passes, one apart, independently flagged the same surface in the same
   direction - pass 4 by eye against a captured frame, pass 5 by a blind judge
   that did not know which side was which. The next pass should weight it
   accordingly rather than treating it as a fresh single observation.
3. **Grass measures EXACTLY ZERO in both arms**, in `overview` and `yard`, as
   does at least one interior floor. Per the repo's own rule that is not "cheap",
   it is "outside the treated set" - and it is confirmed in the source: the
   `vegetation` profile exists in `worldSurface.ts` and **is referenced by
   nothing but its own unit test.** See §7.

---

## 7. What remains, with counts

1. **The `vegetation` profile is authored and never applied.** `worldSurface.ts`
   defines it in full; the only reference in the repo is
   `worldSurface.test.ts:210`. The blind judge measured grass at exactly 0.000
   change across mean luminance, HF energy and block std in `overview` and
   `yard`. Foliage is `InstancedMesh` or transparent, which is why the batcher
   cannot reach it - so this needs applying at the owning branch
   (`scenery/InstancedFoliage.tsx`, `terrain/TerrainGround.tsx`), the way the
   conveyors were. **This is the largest single unfinished surface in the world
   and the clearest next item.**

2. **§2.1 texel density — one word, ~37 MB of VRAM, and still Nell's call.**
   Unchanged and NOT done. `barn` is the only generated asset measurably
   under-resolved: 2.32 px/texel at 1024, 1.16 at 2048, where ~1.0 is ideal. The
   other five in the `texture: 1024` set land at 1.59 or below and would be
   OVER-resolved at 2048 (0.41-0.80). The change is `texture: 2048` on
   `farm-barn` alone in `GENERATED_ASSETS`. The 4096 originals are preserved
   under `assets/source/models/`, so it costs no generation credits. Two
   frictions unchanged: the cost is GPU texture memory, not bundle bytes (57 MiB
   of headroom, `validate:bundle` reads 112.50 of 170); and
   `normalize-model-assets.mjs` has no per-asset filter, so taking it regenerates
   all 30 shipped assets on a tree with 81 uncommitted files.

3. **§2.2 Tripo credits — real money, unspent, unchanged.** Last recorded 1,435
   of 3,500. Nothing was regenerated and nothing was spent.

4. **`world-logistics` residue after the cab: about 200 m over small parts.**
   The rows and the judgement on each:

   | row | metres | what it is | verdict |
   |---|---|---|---|
   | `MeshStandardMaterial #ffffff` | 118 | 21 meshes / 149 inst, largest 3.0 m | **owner not identified** - point `flat-owners.mjs` at it |
   | `#3b82f6` | 50 | 0.15 m-wide ground lane paint, 2 meshes / 6 inst | **judged closed** - a 15 cm stripe is 1-3 px at the yard camera; CLAUDE.md's procedural rule 5 says a feature below 4-6 px mips to a flat constant |
   | `#fbbf24` | 36 | yard hazard markings, same geometry class | **judged closed**, same reason |
   | `#fef3c7` | 40 | 4 meshes remaining - truck-yard pallets (the 2 forklift meshes are done) | small parts, owner known |
   | `#1f2937` | 18 | 16 meshes, largest 2.5 m | **owner not identified** |

   176 m over 41 meshes, and "small parts" is an assertion about two of those
   three rows rather than a judged closure. `test-results/pass5/flat-owners.mjs`
   was built for exactly this and was not pointed at them; it prints the full
   ancestor path for every mesh carrying a colour, which is what the audit's
   `<Group>/<Mesh>` withholds. **Do that before deciding, not after.**

5. **`world-conveyors`' residual 20% flat is `MeshBasicMaterial`**: the belt
   contact-shadow decals and troika glyphs. Correctly unlit.

6. **Ground-painted `<Text>` is now lit, so it is now DARK at midnight.** The
   "TRUCK STAGING" label is invisible in the `shipping` night frame. That is
   physically right for `#475569` slate on unlit tarmac, and it is the same
   emissive floor the road paint uses - but if the label is meant to stay
   readable after dark the fix is its COLOUR, not its material.

7. **Six of the eight painted labels are framed by no camera in any capture
   set.** `KEEP CLEAR`, both `YIELD` markings, the parking `P`, `WEIGH STATION`
   and `STAGING AREA` are confirmed bound by the runtime probe and have been seen
   in no frame. Interior floors are darker than the yard, and a lit safety
   marking can end up darker than the floor it is painted on. **This is pass 4's
   §7.5 generalised**: a capture set is a set of conditions, of cameras, AND of
   what those cameras happen to contain. Either add a camera that frames the mill
   floor's markings, or accept that this class of surface is unreviewed.

---

## 8. Instrument traps this pass paid for

### 8.1 Do the reachability audit before the work, not after it

§2. The work order listed it seventh and it belonged first: every other item was
an edit to an unfamiliar file, and the very first run showed that one of the
owners the work order named is dead code.

### 8.2 A substring search needs substring uniqueness

§2.2. The gate built to catch dead code reported four dead files as alive,
because its uniqueness test and its search test were not the same test. **When a
tool tests membership one way and proves it another, the two must agree.**

### 8.3 A standing warning is a hypothesis about the instrument too

§3.1. 53 meshes, 21 scenes, three passes, and the message ("drawn every frame")
was false the whole time. `Object3D.visible` is the own flag; the renderer reads
the ancestors.

### 8.4 A span's far end is a claim about where the geometry is

§3.2. `machineSurfaces.ts` records the datum-too-low failure. This is the same
failure with the ceiling too low, and it produced a treatment that passed every
gate while moving 0.01 of a luminance unit.

### 8.5 A threshold calibrated on one defect cannot see the next one

§4. Pass 4's 20,203 -> 0 was counted at luma > 160, correct for white road paint.
The same count on grey ground text reported an exact zero - which this repo reads
as "the term is inert" - when the label was plainly visible in the frame and
plainly gone afterwards. **Look at the frame before believing the counter, and
localise the measurement to where the signal is.**

### 8.6 A judge sees what a ratio cannot

§6. `receiving` at x0.993 and `interior` at x1.031 say nothing about WHERE the
change landed. The blind judge said: on roofs and decks, not on the ground; three
pairs are indistinguishable; grass is untouched in both arms; and `yard`'s shed
roof has lost its material identity. Only the last of those is arguable, and none
of them is derivable from the numbers.

### 8.7 Verify the thing you changed, on the surface you changed it on

§1.4 nearly shipped on `shader 26% -> 74%` alone - the presence signal this whole
pass exists to distrust. The scene-level `measure:surfaces` numbers could not
help: `interior` reads x1.031 before and after the dock work, because the dock
threshold is a few hundred pixels of a frame dominated by conveyors.

The discriminating measurement was local and single-variable: inside the dock's
hazard band in the `receiving` on/off pair, **321 of 655 yellow pixels change at
a mean delta of 7.88, with ZERO excluded for self-motion.** A scene aggregate
answers "did this scene change"; only a crop answers "did THIS change".

---

## 9. Gate commands

```bash
npm run typecheck && npm run lint && npm run format:check
npm test                     # baseline: 108 files, 1715 tests, 0 failures
npm run build
npm run validate:assets && npm run validate:depth && npm run validate:shaders && npm run validate:bundle
npm run validate:reachability                   # NEW - run BEFORE editing an unfamiliar file
node scripts/audit-module-reachability.mjs --why=<path>   # who keeps this alive
node scripts/audit-scene-models.mjs             # must stay at 0 blockers AND 0 warnings
npm run measure:surfaces -- --label=<name>      # 9/9 must move; an exact zero is an inert term
npm run measure:surfaces -- --label=<name>-low --quality=low
npm run capture:art -- --label=<name> --set=art --perf-gate
npm run capture:art -- --label=<name>-night --scenes=yard,shipping --time=22
npm run review:stage-ab --before=<off> --after=<on> --output=<dir>   # then the blind-ab-judge agent
```

Probes written this pass live under `test-results/pass5/` (gitignored):
`bright-pixels.mjs` (night bright-pixel counts, whole-frame or cropped),
`flat-owners.mjs` (names the meshes behind a flat material row - the audit prints
`<Group>/<Mesh>` for anything outside a named branch root, which is exactly the
small-parts tail), and `text-surfaces.mjs` (every troika glyph mesh's material
type and world height, which is how "6 of 84 labels are lit and all six are on
the ground" was established without a camera on each one).

Standing constraints unchanged: `.capture.lock` is mandatory for anything that
renders; `test-results/` is gitignored and is where evidence goes; another
session holds port 5199; deploy on request only.

**A note on the machine.** The data volume has **18 GiB free of 3.6 TiB (100%
used)**, and `test-results/` alone is 3.2 GB. This pass's captures fit
comfortably, but a future pass that adds several full 21-scene runs should check
`df` first. Nothing was deleted.

**Current status: local only — not live.**
