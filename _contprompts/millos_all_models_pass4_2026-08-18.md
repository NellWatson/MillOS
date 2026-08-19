---
title: MillOS — all models, pass 4. Every flat surface in the world is finished, and painted surfaces stopped glowing at midnight
date: 2026-08-18
status: the flat work list is CLOSED — every row above 100 m that remains is correctly flat by construction; predecessor items 1, 2 and 4 CLOSED on code; items 3a (texel density) and 3b (Tripo credits) untouched and still Nell's
branch: launch-audit-polish
predecessor: _contprompts/millos_all_models_pass3_2026-08-17.md
verification_criteria:
  - "No claim here rests on `audit-scene-models.mjs` alone. That instrument marks a mesh finished on the MERE PRESENCE of a shader injection, so it cannot distinguish a working treatment from an inert one. The paired control was built first, before a line of the shader."
  - "The three rows that had topped the flat work list for three passes - 3,953 m, 3,488 m and 762 m - are gone. The largest remaining row is 364 m of glass."
  - "`reliefMetres` was authored as a 0-1 strength and consumed as METRES of bump amplitude. 0.35 m over a 0.55 m period is a 52 degree tilt; it rendered a lamp post as a stack of hard blocks. Only the arithmetic between two authored numbers could see it."
  - "Grime and dust are geometric opposites. Letting them stack turned the 60 m truck apron into a sand beach and REDUCED local contrast while moving 44% of the frame."
  - "Painted tarmac glowed at midnight. Measured on `shipping` at --time=22: 20,203 bright ground pixels before, 0 after."
  - "Typecheck, lint, format, 108 files / 1715 tests, build, validate:assets 34/34, validate:depth, validate:shaders, validate:bundle, a 21-scene audit at 0 blockers, and a 12/12 art capture WITH its conjoined non-art perf gate are green on this tree."
---

# MillOS — all models, pass 4

## 1. The headline

**The flat-material work list is closed, and the way it was closed is not the way
three passes of predecessors expected.**

Every one of them reached for a texture and stopped, for three reasons that were
all correct and all recorded in the source:

1. No single UV tiling can serve an instanced set spanning 300:1 of aspect
   variation from one shared `UNIT_BOX`.
2. The largest row is not a material — it is `StaticMeshBatch`'s merged output,
   whose colours ride a vertex attribute.
3. `isSupportedMaterial` rejects any material carrying an own
   `onBeforeCompile`, so a shader on a source material evicts that mesh from
   batching for good. `FactoryExterior.tsx` chose decal quads over an injection
   for exactly this reason; `FarmArea.tsx` says "Do NOT do this to a building
   material". Both were right.

All three point at the same move and none of them took it: **attach the finish to
the material the BATCHER PRODUCES, in world and object space rather than UV
space, with no texture taps at all.** `src/utils/worldSurface.ts`.

| flat materials by world size, at `overview` | before | after |
|---|---|---|
| `MeshStandardMaterial #ffffff` (merged batches) | **3,953 m** | gone |
| `factory-trim` | **3,488 m** | gone |
| `factory-accent` | **762 m** | gone |
| `MeshBasicMaterial #ffffff` | 492 m | 191 m (troika glyphs) |
| `factory-glazing` | 364 m | 364 m — glass, correctly flat |
| `factory-walkway-paint` | 274 m | 274 m — transparent marking, correctly flat |

**Nothing above 100 m remains that is not justified**: glass, a transparent floor
marking, sub-0.25 m machine hardware (judged in pass 3), text glyphs, and the
canal's water-depth plane.

Per-branch flat percentage, `personnel-close`:

| branch | before | after |
|---|---|---|
| `authored-factory-exterior` | 74% | **32%** |
| `world-factory-infrastructure` | 44% | **15%** |
| `world-logistics` | 81% | **60%** |
| `world-personnel` | 88% | **33%** |
| `world-forklifts` | 38% | **30%** |
| `authored-village` | 59% | **59%** (28% now shader-finished) |
| `authored-dock-openings` | 47% | **42%** |

**Read those two personnel/forklift rows at `personnel-close` only.** The audit's
`overview` block still reports `world-personnel` and `world-forklifts` at 100%
flat, and that is not a contradiction — it is pass 2's §7.3 ("a survey is a
survey of what was mounted"). At a site-scale camera those branches render LOD
stand-ins: a billboard quad and a procedural body, not the authored GLBs the
branches exist for. The 53 zero-opacity meshes in the audit's standing warning
are those same billboards.

**Draw calls did not move.** `overview` 1,227 before, 1,224 after. The bounded
worst case the predecessor measured for the texture route — +139 calls, 11% — was
not spent. Frame cost is in §5.1.

**And a second defect surfaced that no daytime capture could show: painted
surfaces were glowing at midnight.** §4.

**Gates, green on this tree:**

```
npm run typecheck / lint / format:check    clean
npm test                                   108 files, 1715 tests, 0 failures
npm run build                              ok
npm run validate:assets                    34/34 PASS
npm run validate:depth                     55 active files, 12 relationships
npm run validate:shaders                   24 families, 25 stable cache keys, 20 sites covered
npm run validate:bundle                    0.60 MiB initial gzip, 112.49 MiB dist
node scripts/audit-scene-models.mjs        21 scenes, 0 blockers, 1 benign warning
npm run capture:art -- --set=art --perf-gate   12/12 art PASS + 12/12 perf PASS
npm run measure:surfaces                   9/9 scenes moved, no inert readings
npm run measure:surfaces -- --quality=low  4/4 moved, no black surfaces
```

`measure:surfaces` on the final build, medium:

| scene | changed | self-motion excluded | mean Δ | local contrast |
|---|---|---|---|---|
| overview | 17.31% | 0.24% | 5.85 | 8.837 -> 9.249 (x1.047) |
| yard | 21.46% | 0.49% | 6.20 | 7.992 -> 8.446 (x1.057) |
| shipping | 39.71% | 0.08% | 3.91 | 5.720 -> 5.764 (x1.008) |
| receiving | 47.19% | 0.01% | 3.69 | 5.230 -> 5.193 (x0.993) |
| village | 5.66% | 0.35% | 7.48 | 11.555 -> 12.447 (x1.077) |
| farm | 8.65% | 1.72% | 5.12 | 9.566 -> 9.844 (x1.029) |
| interior | 19.23% | 1.51% | 3.18 | 5.351 -> 5.426 (x1.014) |
| personnel-close | 34.79% | 0.00% | 3.23 | 1.767 -> 1.791 (x1.013) |
| forklift | 13.11% | 0.37% | 3.22 | 4.848 -> 4.883 (x1.007) |

and at `--quality=low`, the tier where a mis-scoped `worldPosition` is a COMPILE
ERROR rather than a wrong colour: overview 12.55% x1.050, interior 19.67% x1.019,
yard 18.44% x1.041, personnel-close 43.24% **x1.120**. No black surfaces, no
missing programs.

**`receiving` at x0.993 is recorded as a reading, not a miss.** That apron already
carries a tiled terrain texture, so the treatment adds TONE where local contrast
is already present; 47% of the frame moves at a mean delta of 3.7. Do not read
x0.99 as an inert term and redo this work — an inert term returns exactly 1.000
and moves exactly zero pixels.

### 1.1 One red benchmark, reported rather than quietly re-run

The final sealed capture's conjoined perf arm failed `personnel-close` at
**53.8 FPS, p95 42.6 ms**, and the whole arm ran slow — 68-92 FPS on scenes that
read 104-120 FPS in the art arm minutes earlier, and 111-120 FPS in the identical
run on the same code an hour before.

`loadPerCore` was **4.68** on the failing scene, against CLAUDE.md's 3.0 warning
threshold, with a system load average of 39.9 and a second repo's vite dev server
(CABAL, port 8123) started one minute into the run. **It did not reproduce**: the
same scene re-ran immediately at **119.5 FPS, p95 9.9 ms, PASS**, and the
benchmark's own load warning fired on that run saying the timings measure
contention.

CLAUDE.md's rule cuts both ways — a red benchmark is not a regression until you
have looked at `load`, and it is not noise until it has failed to reproduce. It
failed to reproduce, so it is contention. The earlier full run on the same tree
is the 12/12 result quoted above. The concurrent session's processes were left
alone.

Nothing is committed and nothing is pushed. **Local only — not live.**

---

## 2. The instrument had to be built before the shader

`audit-scene-models.mjs` — the instrument this repo has ordered surfacing work
by for three passes — does this:

```js
if (mesh.material.shaderInjected) entry.shaded += 1;
else if (slots.size === 0)        entry.flat  += 1;
```

and its flat work list skips the same meshes. **So attaching any
`onBeforeCompile` deletes a row from that list whether or not one pixel
changed.** An inert treatment and a working one score identically. That is
CLAUDE.md's "an absent term reads as exactly 1.000" in its identity form, and it
is the one instrument trap this lineage had not yet paid for — it would have
paid for it this pass, because the treatment shipped with two real defects that
the audit reported as a complete success.

### 2.1 `scripts/measure-surface-contrast.mjs` — `npm run measure:surfaces`

One page load, one variable. Every treated material receives the SAME
`uSurfStrength` uniform object, so `SurfaceTreatmentIsolation` switches the whole
treatment off between two frames of one render: same driver, same shader cache,
same warm GPU, same camera, identical shader cost in both arms (the kill switch
is branchless on purpose). It reports the changed-pixel fraction and the local
contrast (mean |Laplacian|) inside the changed region.

Verified against the installed three source rather than assumed: three re-uploads
a material's whole uniform list whenever a different material was bound last
(`refreshMaterial = true` on `material.id !== _currentMaterialId`) and resets
`_currentMaterialId` to -1 after every `render()`, so one `.value` write reaches
every treated surface on the next frame with no recompile.

### 2.2 The instrument needed its own control: three shots, not two

The first `interior` reading was 3.12% of pixels changed at a mean delta of 23.8.
**All of it was four flour sacks travelling along a conveyor between the two
exposures.** Benchmark mode pauses the GAME clock (`setGameSpeed(0)`) and not the
render clock.

It now takes on, off, on at equal spacing and strikes every pixel that also
differs between the two same-arm shots out of the mask before anything is
computed — the same intra-run-instability discriminator pass 3 used to separate
"the surface moved" from "the surface is now z-fighting". `interior` fell to
1.56%, and the excluded fraction is printed rather than hidden.

---

## 3. Two defects the control caught, and what they cost

Both compiled. Both moved plenty of pixels. Both passed every gate in the repo.

### 3.1 `reliefMetres` was authored as a strength and consumed as metres

`surfPerturbNormal` is three's `perturbNormalArb`, inlined because
`<bumpmap_pars_fragment>` only reaches the shader with USE_BUMPMAP defined. Its
`dHdxy` argument must be in the same length units as its `surf_pos`, and
`surf_pos` here is `-vViewPosition` — view-space **metres**.

The profiles authored it as a 0-1 strength. `painted` asked for **0.35 m of bump
over a 0.55 m period: a slope of 1.27, a 52 degree surface tilt.** On the frame,
a 0.15 m lamp post rendered as a stack of hard light and dark blocks, one per
noise cell up its length, each cell lighting as a differently angled facet.

Nothing but the arithmetic between two authored numbers could catch this.
`src/utils/__tests__/worldSurface.test.ts` now pins every profile below a 0.12
slope, and a second test pins every profile's meso period above 4 screen pixels
at its own fade distance — which immediately rejected `skin` at a 10 m fade
(3.84 px) and moved it to 8 m.

**The fix also changed which lever the work was on.** With relief made physical,
`receiving`'s contrast ratio fell to 1.00: the term was still there and no longer
visible. Real asphalt aggregate is 5-15 mm chips at 10-25 mm spacing, which at
these cameras' 10-40 m is one to three pixels — it cannot be rendered as relief
at all, only aliased. What a yard that size shows at that distance is TONAL, so
the masonry budget moved into albedo and roughness where it is resolvable, and
the relief stayed at a plausible 6 degrees of undulation.

### 3.2 Grime and dust are geometric opposites, and they were allowed to stack

Grime is splash thrown up a wall. Dust settles on a ledge. A ground-level
HORIZONTAL surface saturates both at once, and the first build let them add:
about half the albedo of the 60 m truck apron was replaced by dirt colours.

**The apron rendered as a sand beach.** Measured: `receiving` moved 44.33% of its
pixels and its local contrast went DOWN, ×0.922 — a treatment doing the opposite
of its job while the audit reported the branch finished.

Grime now multiplies by the vertical component; dust is gated off the ground
plane by a `smoothstep(0.12, 1.0, height)` ledge term and stays datum-free above
it, so it still works on sills, crate lids, walkway decks and the factory roof.
Combined soiling is capped at 0.55. `receiving` went to ×1.152.

### 3.3 A slender member samples a 1-D slice of a 3-D field

The lamp post's blocks were amplified by the units bug but not caused by it.
Value-noise cell boundaries are axis-aligned planes, and a thin vertical member
crossing them picks up one near-constant value per cell along its length. Fixed
with a fixed orthonormal rotation of the sample basis (det 1, so the frequency is
unchanged) plus a second octave at a NON-INTEGER 2.17 ratio so no two lattices
ever align.

### 3.4 A clone of a treated material is a JSON ghost

`THREE.Material.copy()` runs userData through
`JSON.parse(JSON.stringify(...))` and does **not** copy `onBeforeCompile`. So a
clone of a treated material arrives carrying flattened `{r,g,b}` colours and a
detached `{value:1}` where the shared strength object was — and no shader.

A presence check on `userData.millosWorldSurface` would have read that ghost as
"already treated" and left the clone unfinished AND deaf to the A/B toggle: the
exact failure the toggle exists to catch, hiding inside the toggle's own
plumbing. `StaticMeshBatch` clones a representative material on every merge, so
this is the common path. The guard checks object IDENTITY against
`WORLD_SURFACE_STRENGTH`, which a JSON round-trip cannot satisfy.

---

## 4. Painted surfaces were glowing at midnight

This one is invisible in every capture the repo takes, because the art set is
captured at `--time=12`.

A `shipping` capture at `--time=22` shows the white dashed centre line, the
yellow chevron pad, the kerb marks, the bollard stripes and every room inside the
guard hut rendering at **full daylight brightness** against a scene that is
otherwise deep blue-black. They were `MeshBasicMaterial`. Painted tarmac does not
emit light.

The tell was already in the source: dozens of the `FactoryWalls.tsx` meshes carry
`castShadow` and `receiveShadow`, and neither flag does anything on an unlit
material — the author's intent recorded right beside the material that made it
impossible. And `FactoryExterior.tsx` had ALREADY reached this conclusion for the
site roads (its `ROAD PAINT` block, with a deliberate small emissive floor for
night legibility); the fix simply never crossed into the yard, the rooms or the
instanced stripes.

| converted to `meshStandardMaterial` | sites | live? |
|---|---|---|
| `TruckBay.tsx` bay stripes, lane guides, chevrons, kerb marks, stop lines, dock markings | 32 | yes |
| `FactoryExterior.tsx` road stop lines, water staining, door glazing and handles, painted signs | 22 | yes |
| `ForkliftSystem.tsx` hazard stripe markings | 4 | yes |
| `TruckBayInstances.tsx` `OptimizedStripeInstances` road stripes | 1 | yes |
| `FactoryWalls.tsx` guard hut, break room, locker room, restroom, office | 129 | **NO — see below** |

**Measured: 20,203 bright ground pixels at midnight before, 0 after**, from the
59 LIVE sites.

### 4.1 129 of those conversions changed nothing, and saying so is the point

`infrastructure/FactoryWalls.tsx` looked like the largest single block of the
defect — five whole rooms built from unlit boxes, dozens of them carrying
`castShadow` and `receiveShadow` that an unlit material can never honour. It was
converted on that reading.

**The file is unreachable.** `FactoryWalls` is exported by
`infrastructure/index.ts` and consumed only by `components/FactoryInfrastructure.tsx`,
which nothing imports. Verified in the BUILD rather than by reading: `SAFETY
FIRST`, a Text label that exists only in that file, does not appear anywhere in
`dist/assets/`. Vite tree-shakes the module out entirely. Same status as
`Machines.tsx` and the `Instanced*.tsx` tree, which `machineSurfaces.ts` has
recorded at its top for two passes — and which this pass walked straight past.

The conversion is kept, because a dead module that is ever revived should be
revived correct, and the file now carries a header saying plainly that nothing in
it renders. But **none of the night-glow improvement is attributable to it**, and
the inert-flag grep (`castShadow` on a `MeshBasicMaterial`) that led there is
still a good grep — it simply found dead code first.

**The rule, and it is not "convert everything".** A surface that represents
PAINT, PRINT or SOLID MATTER shades. A surface that represents EMITTED LIGHT does
not. Still deliberately unlit and now documented as such: lamp faces, headlight
and taillight quads, light-spill cones, interior light pools, warning beacons,
status LEDs, eye highlights, vehicle shadow blobs, tunnel voids, the canal water
plane, and the bus-shelter ad panels and statutory exit signage (both internally
illuminated in reality).

---

## 5. What the treatment actually is

`src/utils/worldSurface.ts`, eight profiles, one program.

| term | space | what it fixes |
|---|---|---|
| macro | field, ~6-13 m period | a 100 m merged slab reading as one paint value |
| meso | field, 0.03-0.55 m | material-scale break-up in albedo and roughness |
| relief | derivative of the meso height | shading relief with no normal map and no UVs |
| grime | world Y above a per-profile datum × verticality | splash climbing a wall |
| dust | world normal Y × a ledge gate | settled flour on anything horizontal above the floor |
| edge | fresnel on the view normal | worn paint on silhouettes, which is what reads at distance |
| clearcoat | after `<lights_physical_fragment>` | dirt that is invisible under a coat until it kills the coat |

**Field space is per profile and it is the part that is easy to get wrong.**
World space for static geometry — which is what stops two copies of one prefab
reading as two copies. OBJECT REST SPACE for anything that moves or deforms,
taken from the `position` attribute rather than `transformed`, so a walking
worker's detail does not swim through a field nailed to the world. That also
sidesteps the reason `world-personnel` has had no albedo for four passes:
`SharedWorkerMaterials` records that the GLB unwrap spans roughly U/V [-1.0, 1.5]
with no atlas intent, so no map can be bound to it. A rest-space field needs no
unwrap at all.

Applied at:

| site | how |
|---|---|
| `StaticMeshBatch` merged + instanced outputs | `surface` callback prop; art direction lives in `worldSurface.applyBatchWorldSurface`, not in the perf utility |
| batcher LEFTOVERS (candidates it declined to batch) | same callback, after both passes — otherwise the scene would be half-treated along 80 m spatial cell boundaries |
| `OptimizedFactoryInfrastructure` shell materials | explicit 13-entry table, with the sifter gallery's datum at y 8.85 |
| `WorkerModel` GLB surfaces | `worldSurface` field on the existing `SURFACE_PROFILES` table |
| `SharedWorkerMaterials` accessories + cached per-worker materials | explicit name→profile map |
| `ForkliftModel` authored seat/ram and the whole compact variant | direct |

`isSupportedMaterial` gained **one** exemption, `hasWorldSurface`, which proves
the injection is this module's by object reference. Without it, finishing a
leftover would have evicted that mesh from batching for ever — a silent
draw-call regression surfacing several passes later.

`snapshot().staticBatches` now reports what each branch's batcher did, including
a `surfaceProfiles` tally, because "the finish reached 32 batches" and "the finish
reached nothing" were otherwise the same reading. Measured at `personnel-close`:

```
authored-factory-exterior  2094 candidates  merged 1611->109  instanced 328->99
                           profiles {"painted":99,"masonry":50,"metal":15,"untreated":18}
authored-truck-yard         426 candidates  merged  281-> 20  instanced 123->42
                           profiles {"masonry":22,"painted":11,"metal":9,"untreated":13}
```

That answers the one thing the colour-blind batch resolver could have got wrong:
the 8,097 m merged bucket is **31 distinct roughness/metalness groups**, not one,
so it is not all being weathered as concrete.

### 5.1 What it costs per frame, and what that measurement cannot tell you

Draw calls: **1,209 with the treatment, 1,209 without.** Program count unchanged.
Zero VRAM: the field is analytic, there is no texture, no upload and no mip
chain, and all eight profiles share one `customProgramCacheKey` so they compile
one program per material class rather than eight.

Frame time, `overview` at `--duration=8 --warmup=5`, three INTERLEAVED pairs per
CLAUDE.md's drift rule:

| | pair 1 | pair 2 | pair 3 | mean |
|---|---|---|---|---|
| control | 9.33 ms | 8.96 ms | 8.73 ms | 9.01 ms |
| `--disable-systems=surfaces` | 9.07 ms | 9.01 ms | 8.61 ms | 8.90 ms |

Delta 0.11 ms against a control-only spread of **0.60 ms** across the three
control runs — and CLAUDE.md records ~1.9 ms of monotonic drift on this machine.
**A delta smaller than the spread is not a result.**

**And this A/B cannot measure the ALU cost, by design.** The kill switch is
branchless: `uSurfStrength` multiplies the terms rather than gating them, so
`--disable-systems=surfaces` removes the visual contribution and leaves every
noise evaluation and every derivative in place. That is exactly what makes it a
clean VISUAL control - the two arms differ in one float and nothing else - and it
is what makes it useless as a cost control. Isolating the ALU would need a build
with the injection removed, which CLAUDE.md warns is a two-build comparison that
"differs by more than your variable".

The honest bound is therefore the gate: **the conjoined non-art performance run
passes 12/12 with the treatment on**, at 75-120 FPS, and the draw-call and
program counts are unchanged. If a future pass needs the ALU number specifically,
add a `#define` guard around the injected body and key it into
`customProgramCacheKey` so the two arms are two programs rather than two uniform
values.

---

## 6. What remains, with counts

1. **§5.2 texel density — one word, ~37 MB of VRAM, and still Nell's call.**
   Unchanged and NOT done. `barn` is the only generated asset measurably
   under-resolved: 2.32 px/texel at 1024, 1.16 at 2048, where ~1.0 is ideal. The
   other five in the `texture: 1024` set land at 1.59 or below and would be
   OVER-resolved at 2048 (0.41-0.80), paying roughly 4x memory for detail no
   camera can see. So the change is `texture: 2048` on `farm-barn` alone in
   `GENERATED_ASSETS`.

   **Two reasons it was left**: the cost is a memory-budget trade the predecessor
   explicitly reserved (bundle headroom is fine — 112.49 of 170 MiB — the cost is
   GPU texture memory), and `normalize-model-assets.mjs` has no per-asset filter,
   so taking it means regenerating all 30 shipped assets on a tree with 74
   uncommitted files. Cheap to do deliberately; wrong to do incidentally.

2. **§5.3 Tripo credits — real money, unspent, unchanged.** Last recorded 1,435
   of 3,500. Nothing was regenerated this pass and nothing was spent.

3. **Ground-painted `<Text>` labels are still unlit.** The "TRUCK STAGING" label
   painted on the yard is troika text and is the last thing on the ground still
   at daylight brightness at midnight. It is a one-line change per call site
   (troika `Text` takes a `material` prop), but `SceneText` is the single wrapper
   for all 83 in-scene labels including status readouts that are meant to stay
   legible, so the fix needs a per-call-site opt-in rather than a change to the
   shared wrapper. **Left as a judged carve-out, not an oversight.**

4. **`world-logistics` is 60% flat by MESH COUNT and the residual is small by
   world size.** Read the two columns together, as pass 3's §3.4 established for
   the village: the largest remaining logistics rows are
   `MeshStandardMaterial #ffffff` at 118 m over 21 meshes (largest 3.0 m),
   `#fef3c7` at 40 m and `#fbbf24` at 36 m. Truck bodywork already carries
   `vehicleSurface`. This is small parts, not a work list.

**Closed this pass:** predecessor item 1 (the merged static batches — finished,
not textured, at zero draw-call cost), item 2 (`world-personnel` — finished in
rest space, which needed no unwrap), item 4 (`MeshBasicMaterial #ffffff` in
`world-logistics` — investigated: troika glyphs and ground markings, the markings
are now lit and the glyphs are item 3 above), and the pass-3 §4 / §3.4 closures
on `world-factory-infrastructure` and `authored-village`, which are **overturned
on new grounds** — a world-space field is exactly the thing that defeats the "no
single tiling can be correct" objection those closures rested on. No `map:` was
added to any of those materials; the reasons those slots are empty are unchanged
and the overturn is recorded in the source, not just here.

---

## 7. Instrument traps this pass paid for

### 7.1 A gate that scores presence cannot score effect

§2. `shaderInjected` is a boolean about a property, not a measurement of a
surface. Any work whose deliverable is "this mesh now has a shader" needs a
control BUILT FIRST, on the tree before the change — because afterwards the gate
is green either way and there is nothing left to compare against.

### 7.2 The control needs its own control

§2.2. The first discriminator credited a moving conveyor to the treatment.
**Anything that diffs two frames of a live scene is measuring the scene as well
as the change.** Three shots, and subtract the arm that should not have moved.

### 7.3 A parameter is authored in one unit and consumed in another

§3.1. The shader compiled, the term was demonstrably not inert, it moved plenty
of pixels, and it was wrong by a factor of thirty. **Check the arithmetic
BETWEEN two authored numbers**, not just each number's plausibility: relief over
period is a slope, and a slope of 1.27 is not a surface finish.

### 7.4 Two correct terms can be wrong together

§3.2. Grime is right. Dust is right. Their geometric domains are complementary,
and the one place they overlap — a horizontal surface at ground level — is the
single largest surface in the frame. **When adding a second mask, ask where it
saturates at the same time as the first.**

### 7.5 A capture set is a set of CONDITIONS, not just of cameras

§4. Twelve scenes, every material family, every viewing distance — and all
twelve at `--time=12`. An entire defect class was invisible for four passes
because nothing rendered the world after dark. The scene list was audited; the
time of day was not.

### 7.6 An inert flag is a comment about intent — and the file it is in may be dead

§4.1. `castShadow` on a `MeshBasicMaterial` does nothing. Dozens of them sat in
`FactoryWalls.tsx`, each one a statement that its author expected that surface to
be lit, and following them found a real defect class. **Flags that cannot do
anything are worth grepping for.**

But 129 of the conversions that grep produced were in a module nothing imports,
and the mistake was checking reachability AFTER the edit instead of before. The
repo already knew: `machineSurfaces.ts` names two other dead trees at its top.
**Before editing an unfamiliar file, grep for who imports it, and confirm in
`dist/` — a distinctive string from the file either appears in the build or the
file does not ship.**

### 7.7 A clone is not a copy

§3.4. `Material.copy()` copies userData through JSON and does not copy
`onBeforeCompile`, so a clone of an injected material has the bookkeeping and not
the behaviour. Guard on IDENTITY, not on presence, whenever userData records an
object that matters.

---

## 8. Gate commands

```bash
npm run typecheck && npm run lint && npm run format:check
npm test                     # baseline: 108 files, 1715 tests, 0 failures
npm run build
npm run validate:assets && npm run validate:depth && npm run validate:shaders && npm run validate:bundle
node scripts/audit-scene-models.mjs             # must stay at 0 blockers
npm run measure:surfaces -- --label=<name>      # 9/9 must move; an exact zero is an inert term
npm run measure:surfaces -- --label=<name>-low --quality=low
npm run capture:art -- --label=<name> --set=art --perf-gate
npm run capture:art -- --label=<name>-night --scenes=yard,shipping --time=22
```

**The night capture is now part of the set.** A visual verdict taken only at
`--time=12` cannot see an unlit surface, and this repo shipped that defect for
four passes.

Probes written this pass live under `test-results/pass4/` (gitignored):
`surface-facts.mjs` (batch profile tally, per-material treatment state, the
unlit inventory, all in one page load), `surface-profiles.mjs`, `pick.mjs`.

`scripts/capture-art-review.mjs` had a latent break: the contact-sheet browser
launched without `channel: 'chrome'`, so on a machine without
`chrome-headless-shell` it threw AFTER all twelve frames were on disk and the run
looked like a failure when only the sheet had failed. Fixed.

Standing constraints from the predecessor are unchanged: `.capture.lock` is
mandatory for anything that renders; `test-results/` is gitignored and is where
evidence goes; another session holds port 5199; deploy on request only.

**Current status: local only — not live.**
