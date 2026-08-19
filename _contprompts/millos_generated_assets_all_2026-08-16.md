---
title: MillOS generated assets — ALL 30 integrated, finishing the verification pass
date: 2026-08-16
status: 30 of 30 assets shipped and wired; gates green; visual pass 24/24 shot, 3 defects found, 2 fixed, 1 open
scope: everything under `public/models/farm/` and `public/models/village/`, and the components that render them
branch: launch-audit-polish
predecessor: _contprompts/millos_generated_assets_2026-08-15.md (step 5 "one asset end to end" — done, see §1)
verification_criteria:
  - "No asset is called done until it has been seen in an in-scene render, not just validated."
  - "`npm run validate:assets` covers all 34 entries and is green before any claim of shipped."
  - "Every size or placement number is measured, never estimated from a render by eye — the duck pond cost three cycles to that."
  - "A frame-time delta smaller than the control-only spread is reported as unresolvable, not as a win."
  - "Any animation or variant lost in a swap is named in the report with its revert."
  - "Typecheck, lint, production build and the full test suite are green before handing off."
---

# MillOS — all generated assets integrated, continuation

## 1. Where this stands

The predecessor contprompt asked for **one** asset end to end as a pipeline proof.
That landed (cow, blind A/B 6-of-6, `cow-integration/REPORT.md`). Nell then asked
for **ALL**. All 30 are now shipped and wired.

| | count | state |
|---|---|---|
| Generated GLBs in `public/models/` | **30** | all declared, all `validate:assets` PASS (34 entries with forklift + 3 workers) |
| Components swapped | **30** | FarmArea 15, VillageArea 13, `scenery/Cat.tsx` 1, `scenery/FairytaleCastle.tsx` 1 |
| Immutable sources preserved | 30 | `assets/source/models/{farm,village}/*-tripo-original.glb`, 63 MB |
| Shipped asset weight | 14 MB | `public/models/`, up from 3.3 MB |

**Gates, all green on the current tree:**

```
npm run typecheck        clean
npm run lint             clean
npm test                 102 files, 1650 tests, 0 failures   (identical to baseline)
npm run build            ok
npm run validate:assets  34/34 PASS
npm run validate:bundle  0.60 MiB initial gzip, 111.57 MiB dist (budget 170)
```

Nothing is committed and nothing is pushed.

## 2. What was built

**`scripts/normalize-model-assets.mjs`** now carries a `GENERATED_ASSETS` table —
one row per asset with `target` metres, `axis` (`max` / `x` / `y` / `z`), an
optional `yaw`, and a `rigged` flag — and one `normalizeGeneratedAsset()` that
does facing, uniform scale, re-origin, 4096→512 texture resample, metallic-zero
and semantic renaming. Adding an asset is a table row.

**`src/components/models/GeneratedModel.tsx`** — `GeneratedModel` (clone +
shadows), `GeneratedBoundary` (ErrorBoundary + Suspense), `GeneratedBody`
(both, one asset). Every static swap is one line at the call site.

**`src/components/models/RiggedCreatureModel.tsx`** — one component for all nine
rigged creatures, because Tripo fits the **same 41-joint skeleton with the same
bone names** to quadrupeds, birds and bipeds. Per-species numbers live in
`CREATURE_SPECS`. Exposes `setGraze` / `setHeadShake` / `setStride`.

**Every primitive was kept as the fallback**, renamed `XPrimitiveBody`, rendered
under both boundaries. A missing GLB degrades to the old geometry rather than
tearing down the subtree — verified in pixels by deleting `cow.glb` and
re-rendering (`cow-integration/fallback/`).

## 3. Rules this pass paid for — read before touching sizes or placement

**Derive facing from the whole heading vector, then snap to 90 degrees.** The
predecessor's `Head.z < Hip.z` test only flips 180 degrees, which is not enough:
the generator laid the cow, horse, crow, duck and scarecrow along Z but the
sheep, pig and chicken along **X**, so three of eight shipped broadside. Using
`-atan2(headX - hipX, headZ - hipZ)` fixes that — but the *raw* angle carries
head-turn noise, and honouring it left the horse standing 14 degrees askew with
its axis-aligned width inflated from 0.27 to 0.95. Snap to the nearest quarter
turn: the skeleton chooses which quadrant, the snap discards the remainder.

**Building footprints must come from the source, not from an in-engine box.**
Most of these roofs are boxes yawed 45 degrees, so an axis-aligned world box
around one is inflated by root two — the town hall measures 28.3 m across in
engine and is a 12 m building. Grep the body `boxGeometry` instead.

**Size a prop by the dimension that constrains it, not always the footprint.**
The fence panel at 3 m wide stood 1.9 m tall — a stockade against the 1.05 m
post-and-rail it replaces. The fountain at a 7 m pool stood 7.3 m tall in a
village square. Both are sized by height now.

**To seat a water surface, weight horizontal triangles by AREA.** The duck pond
took three cycles because a vertex-height median said its water plane was at
1.22 m; that median tracks the crinkly bank, not one big flat disc. Area-weighted
it is at **0.80 m**, and 0.80 minus the ducks' 0.35 is the sink. The two wrong
guesses put the pond fully under the cobbles and then standing on top of them
like a tub. `scratchpad/waterplane.mjs` in the evidence dir is the measurement.

**A component's own `scale` wraps the GLB too.** `Cat` had `scale={0.4}` on its
outer group for a primitive authored at 2.5x life size; that shrank the 0.5 m
generated cat to 0.2 m. Scale belongs on the primitive body after a swap. Check
every call site that passes `scale` — `WindmillComp` (1.5) and the castle
(SITE_LAYOUT 1.5) are handled by sizing their assets to 1/scale.

**Extracting a primitive body will orphan the variables it closed over.** The
cottage's `ChimneySmoke` used `position` for its deterministic phase, the cat's
sitting pose used `isExcited`, the fountain's water used refs from a `useFrame`.
Typecheck catches these; a blind `sed` does not.

**Watch what a blanket replace hits.** Replacing `<group position={position}>`
in `VillageArea.tsx` to un-place the fountain silently un-placed `ChimneySmoke`
instead, because it appears earlier in the file. Anchor on more context.

## 4. Open — what a fresh context should do next

### 4.1 One visual defect, unfixed

**Grass base-plates.** The generated `school`, `cottage` and `shop` arrive with a
turf disc under them, which reads as a green patch on the village cobbles. Seen
in `cow-integration/all-after/school.png` and `contact-scene.png` (row 4, col 1).
Options, cheapest first: sink each by the plate's thickness (measure it the way
the pond's water plane was measured — area-weighted horizontal triangles near
y=0); or clip the plate in the pipeline; or accept it. **Not yet decided.**

### 4.2 Verification not yet run

- **`npm run benchmark:runtime` on the full set.** The cow-only A/B is in
  `cow-integration/REPORT.md` §3 (draw calls 1520 → 1474, frame time
  unresolvable). Nothing has been measured with all 30. Expect a large draw-call
  win — the farm+village mesh count fell from **869 to 176** in the harness — and
  a texture-memory rise of 30 × 3 × 512². **Interleave arms, at least three
  pairs, report the control-only spread**; this machine cannot resolve under
  ~2 ms, and one control run in the last set was contaminated (p95 34.5 ms).
  `dist-control` was deleted, so the control arm needs rebuilding from a stash of
  `src/components/{FarmArea,VillageArea}.tsx`, `src/components/scenery/{Cat,FairytaleCastle}.tsx`,
  `src/utils/modelLoader.ts`.
- **`npm run capture:art`** across more than the `farm` scene. Note that the
  `farm` and `village` benchmark scenes frame the whole site, so most of these
  assets are a few pixels there — a paddock- or square-level capture scene would
  be needed to grade them routinely.
- **Blind A/B on the village.** `scripts/stage-blind-ab.mjs` + the
  `blind-ab-judge` agent worked well for the cow (6/6, sides alternating). The
  before frames need a stashed control build; see above.
- **A second `visual-fidelity-judge` pass** against the standing verdict.

### 4.3 Documentation not yet written

- `public/models/README.md` still describes **only** the cow as the textured
  exception. It needs the other 29 and the per-asset `maxTextures: 3` rationale.
- `assets/source/models/farm/PROVENANCE.json` covers the cow only. The village
  directory has no provenance file at all. Both need the full roster, with the
  `animate_retarget preset:idle` rejection recorded (it rears quadrupeds onto
  their hind legs; kept as evidence, never promoted).
- `cow-integration/REPORT.md` is accurate for the cow but is now a subset. Either
  extend it or write a sibling for the full set.

## 5. Costs and regressions to state in any report

**Two animations were lost, both recorded in the components:**

1. **Windmill sails no longer turn.** `bladesRef` still exists and the scene
   still writes to it, but the asset is a single mesh whose sails are fused to
   the cap — a connected-component pass finds 228 shells, all attribute-split
   patches of 100-260 vertices, nothing isolable. Revert is one line: render
   `WindmillPrimitiveBody` directly.
2. **Fountain water no longer scrolls and its ripple ring is gone.** Same shape
   of problem, same shape of revert (`FountainPrimitiveBody`).

**Variants collapsed.** `Cottage` (`wallColor`, `roofType`), `ShopBuilding`
(`wallColor`, `signText`, `awningColor`), `MarketStall` (`color1/color2`) and
`Horse` (`color`, `isPaint`) each now render one generated model at every call
site. The props are kept and still drive the fallbacks. **The fix is more
generations, not a colour tint** — tinting a material that carries a baked
albedo washes the whole object, which is the symptom-fix pattern CLAUDE.md
already names for the village cobbles. The blind judge raised exactly this
about three identical cows.

**Smaller losses:** the pig's tail wag has no counterpart (the rig stops at
`Head`, no tail or ear joints on any species); the sleeping cat stays primitive
because the generated cat is a sitting animal and posing its rig into a curl is
bespoke work; the castle's silhouette changes materially (a Neuschwanstein keep
on a 50 m crag becomes a broader, shorter fairytale castle on a low outcrop).

## 6. The harness

`test-results/tripo-probe-20260815/harness/before/` — a vite app that mounts the
**real** `FarmArea`, `VillageArea` and `FairytaleCastle` and aims a camera at any
named subject.

| file | does |
|---|---|
| `main.tsx` | subject table; `__aim`, `__meshes`, `__cowHeads`, `__bbox` |
| `shoot.mjs` | `--out --port --series --gap <subjects...>`, fresh page per subject |
| `probe.mjs` | head-bone height per rigged cow, once a second |
| `grazeshot.mjs` | screenshots on a head-height trigger, so a slow animation is actually sampled |
| `sweep.mjs` | graze amount → head height mapping |
| `rig.html` / `rig.tsx` / `shootrig.mjs` | one creature in isolation, driven through its handle |
| `solve.html` / `solve.tsx` / `shootsolve.mjs` | per-species neck reach solved against the **shipped** GLBs |
| `measure.mjs` | shipped-component envelopes via `__bbox` |

```bash
cd test-results/tripo-probe-20260815/harness/before
npx vite --config vite.config.mjs --port 5241 --strictPort --force
node shoot.mjs --out ../../cow-integration/check --port 5241 barn church cowfield
ffmpeg -y -pattern_type glob -i '*.png' -filter_complex "scale=300:-1,tile=6x4:padding=4" -frames:v 1 sheet.png
```

**Three harness traps, all still live:**

1. **The vite dev server caches module transforms across edits to `main.tsx`** and
   must be restarted. This silently produced two rounds of identical "different"
   camera angles.
2. **A second vite server from an earlier session holds port 5199.** Do not kill
   it; use your own port.
3. **`ffmpeg` is available and `magick` is not.** A 24-image contact sheet is one
   image read instead of 24 — this is how the whole set was reviewed in one look.

## 7. Standing constraints, unchanged

- Licence is clear: Tripo3D API plan, MillOS is not commercial, Nell confirmed.
- `assets/source/models/` is immutable provenance. 63 MB now; that is deliberate.
- `test-results/` is gitignored — evidence goes there, never into `src/`.
- Never round-trip a pipeline GLB through Blender; `public/models/*.glb` node and
  clip order is load-bearing for the forklift.
- **Running `npm run normalize-models` rewrites `public/models/forklift/forklift.glb`
  by 4 bytes.** It is unrelated drift; `git checkout --` it before committing.
- Deploy on request only. Current status: **local only — not live.**

## 8. Gate commands

```bash
npm run typecheck && npm run lint
npm run build
npm test                     # baseline: 102 files, 1650 tests, 0 failures
npm run validate:assets      # 34 entries
npm run validate:bundle
npm run benchmark:runtime    # NOT YET RUN against the full set
npm run capture:art          # farm only so far; contact-sheet step needs `npx playwright install`
```
