---
title: MillOS — higher-quality generation, and polish every model and animation
date: 2026-08-16
status: 30 generated assets shipped, verified and audited; gates green; two defects open; SEVEN of nine rigged creatures have never had their rigs driven
scope: `public/models/{farm,village}/`, the components that render them, and every animation those components own
branch: launch-audit-polish
predecessor: _contprompts/millos_generated_assets_all_2026-08-16.md (all six of its open items are closed — see §1)
verification_criteria:
  - "A rig is not 'wired' until its motion has been seen moving: a single frame cannot distinguish a driven rig from a static one. Shoot a series, or probe a bone over time."
  - "Every generation spend is quoted from the BALANCE before and after, never from `consumed_credit`, which under-reports by up to 45%."
  - "No asset is called done until it has been seen in an in-scene render, and no PROP is called done until something is proven to render it."
  - "Any number stated about size, seating, texel density or spacing is measured by one of the instruments in §7 — none of them is estimated from a render by eye."
  - "A frame-time delta smaller than the control-only spread, or measured above 3.0 load per core, is reported as unresolvable rather than as a result."
  - "Typecheck, lint, format, the full test suite, production build, `validate:assets` and `validate:bundle` are green before handing off."
---

# MillOS — model quality and animation, continuation

## 1. Where this stands

The predecessor asked for verification of all 30 generated assets. That is done,
and **every item it left open is closed**:

| predecessor item | outcome |
|---|---|
| §4.1 grass base-plates | measured across all 30 — **only the school** had one; cottage and shop were misdiagnosed. Fixed with a measured `sink={0.7}` |
| §4.2 `benchmark:runtime` on the full set | run, twice, four interleaved pairs each |
| §4.2 `capture:art` beyond `farm` | 12-scene `art` set, plus a new `generated` set and two new close cameras |
| §4.2 blind A/B | **generated side wins 4 of 4**, sides alternating |
| §4.2 second `visual-fidelity-judge` pass | run; returned FAIL, mostly not about these assets |
| §4.3 documentation | README rewritten; both `PROVENANCE.json` files generated, not typed |

Full detail: `test-results/tripo-probe-20260815/cow-integration/REPORT-ALL.md`.

**Gates, all green on the current tree:**

```
npm run typecheck        clean
npm run lint             clean
npm run format:check     clean
npm test                 103 files, 1653 tests, 0 failures
npm run build            ok
npm run validate:assets  34/34 PASS
npm run validate:bundle  0.60 MiB initial gzip, 112.46 MiB dist (budget 170)
```

Nothing is committed and nothing is pushed. **Local only — not live.**

---

## 2. The two asks, decomposed

"Generate high quality models" and "polish all models and animations" are three
separate jobs with very different costs. Do not blur them.

| job | costs | biggest single win |
|---|---|---|
| **A. Animation** | engineering only | **seven of nine rigs are never driven** (§3) |
| **B. Model polish** | engineering only | the near-black buildings (§4.1) |
| **C. Higher-quality generation** | **Tripo credits — real money** (§5) | markings variants to kill the clone reading |

**Do A first.** It is free, it is the largest visible gain per hour, and the
expensive part of it — per-species neck reach — was already solved and is
sitting unused in a table.

---

## 3. Animation — the finding that should lead this pass

### 3.1 Seven of nine rigged creatures are static skinned meshes

`RiggedCreatureModel` exposes `setGraze`, `setHeadShake` and `setStride`, and
`CREATURE_SPECS` holds **solved per-species numbers for all nine**:

```
cow    bend 2.1  counter 0.9  stride 0.36     chicken  bend 2.5  counter 0.4  stride 0.25
sheep  bend 2.6  counter 0.7  stride 0.30     crow     bend 2.0  counter 0.4  stride 0
pig    bend 1.2  counter 0.6  stride 0.30     duck     bend 2.6  counter 0.6  stride 0.20
horse  bend 1.9  counter 0.6  stride 0.36     scarecrow / cat  bend 0 (deliberate)
```

**Only `cow` and `chicken` are passed a `ref`.** Grep it:

```bash
grep -n 'creature="' src/components/FarmArea.tsx src/components/VillageArea.tsx src/components/scenery/Cat.tsx
```

`sheep` (:1139), `pig` (:1282), `horse` (:1680), `crow` (:1748), `scarecrow`
(:1832), `duck` (VillageArea:1517) and `cat` (Cat.tsx:176) render
`<CreatureBody creature="…" fallback={…} />` with **no `ref`**, so nothing ever
calls their handle. Those numbers were paid for by a sweep in
`roster/harness/flock.html` and have never once been used.

Wiring sheep, pig, horse, duck and crow is the cheapest large win available in
this repo. The pattern to copy is the cow at `FarmArea.tsx:2375` and the chicken
at `:2348` — a per-instance rig ref array, a graze/peck amount, and a stride
phase driven from the wander state.

**Verify by motion, not by frame.** A still cannot tell a driven rig from a
static one. `harness/before/probe.mjs` samples a named bone's world height once
a second and `grazeshot.mjs` shoots on a height trigger — both exist because a
single screenshot already produced one confident wrong answer on the cow.

### 3.2 Behaviour wired to a primitive body dies with it — including refs

The predecessor pass found four *components* orphaned inside `*PrimitiveBody`
wrappers, one of which meant `crow.glb` shipped and never rendered a frame.
`src/components/__tests__/primitiveBodyLeaves.test.ts` now guards that.

**It does not guard the ref version of the same bug**, and there are four:

| ref | threaded into | consequence |
|---|---|---|
| `tailRef` | `PigPrimitiveBody` (:1282) | the pig's tail wag is dead on the generated path |
| `animRef` | `ChickenPrimitiveBody` (:1213) | primitive-only; the chicken's rig is separately driven, so this one is covered |
| `bladesRef` | `WindmillPrimitiveBody` (:1475) | the scene still writes `rotation.z` every frame to a group nothing renders |
| `headRef` | `CowPrimitiveBody` (:1403) | covered — the cow also gets `ref={rigRef}` |

So: **pig tail and windmill sails are live losses**, and the guard test should be
extended to catch `*Ref={` props passed to a `*PrimitiveBody`, which is the same
defect class in a different syntax.

### 3.3 Two animations lost in the swap, both with a known revert

1. **Windmill sails do not turn.** The asset is a single mesh whose sails are
   fused to the cap — a connected-component pass finds 228 shells, all
   attribute-split patches of 100-260 vertices, nothing isolable. Options: split
   the sails in the pipeline (they are a distinct UV/material region — check
   before assuming), generate a *sails-separate* windmill, or revert to
   `WindmillPrimitiveBody`. **A stationary windmill in a farm scene is the most
   conspicuous dead animation in the build.**
2. **Fountain water does not scroll and its ripple ring is gone.** Same shape of
   problem, same three options, `FountainPrimitiveBody` is the revert.

### 3.4 Known-and-deliberate, do not "fix" without deciding

- **Town hall clock hands.** The generated tower's clock face is baked into its
  albedo, so the primitive face is not re-rendered over it. The hourly **chime**
  was rescued into `TownHallChime`; only the moving hands are lost. Adding hands
  means aligning them to a baked face — a real job, not a one-liner.
- **Chickens and pigs sidle.** `updateAnimalMovement` steers with
  `Math.atan2(direction.x, direction.z)` (`FarmArea.tsx:2231`), which aligns
  local **+Z** to the heading, and both are authored facing **+X**. Pre-existing.
  The fix is a quarter-turn wrapper, but it **changes the meaning of the pig's
  pet response**: `rotation.z` is a body roll today and becomes a nose pitch
  under the turn. That is an animation decision, not a bug fix.
- **No asset carries clips, and none should.** `animate_retarget`'s presets are
  humanoid; because the quadruped rig names the front legs
  `Clavicle`/`Upperarm`/`Hand`, a biped idle rears the animal onto its hind legs.
  Evidence kept at `models/tripo_cow_idle_REJECTED.glb`. **Rig with Tripo,
  animate in MillOS.**
- **No tail or ear joints on any species.** The rig stops at `Head`. The pig's
  tail wag has no rig counterpart; it needs geometry or a bone that does not
  exist.
- **The sleeping cat stays primitive.** The generated cat is a sitting animal;
  posing its rig into a curl is bespoke work.

---

## 4. Model polish — what is measured and still open

### 4.1 Seven-plus buildings render near-black — the one blocking defect

**Read `cow-integration/DARK-BUILDINGS.md` before touching this.** It holds the
numbers, twelve eliminated hypotheses with the measurement that killed each, and
both review agents' independent corroboration.

Shortest version: three `ShopBuilding` and two `Cottage` instances render at
**0.02x–0.33x** the luma of the primitives they replaced, while everything else
generated in the same frame sits at 0.44x–1.69x. `visual-fidelity-judge` found
six regions in `village` plus one in `square` by connected-component pass.

The discriminator that ends the ambiguity, and the one to build on — compare two
**shaded** wall planes in the same frame, so ambient is identical:

| shaded wall, same frame, same light | luma |
|---|---|
| black cottage | **2.7** (std 2.8 — flat, zero information) |
| tudor hall 20 m away | **56.2** |

Ambient cannot produce a 20x gap between equally-shaded walls. Ruled out already:
albedo (the shop's is *brighter* than the town hall's and uniform on all four
faces), metallic, occlusion maps, normal maps, mip bleed, sun angle at 09/12/15,
quality tier low/medium/high, and every `scene.traverse` in the repo (all
read-only).

**The instrument not yet built**: `window.__MILLOS_RUNTIME__` exposes
`materialAudit()` and `setPerfDebug()` but **no scene handle**. Add one, or reach
R3F's store through the canvas element, and dump the shop mesh's resolved
material — `envMapIntensity`, `color`, `map.colorSpace`, whether `envMap` is
bound — beside the town hall's. Two materials from one pipeline that light 10x
apart differ in something a single object dump will show at once.
`cow-integration/probe-dark.mjs` is the shell.

**Do not fix it with a `color:` tint.** A tint on a material carrying a baked
albedo is the symptom-fix pattern CLAUDE.md already names for the cobbles.

### 4.2 A separate lighting blocker, found by the fidelity judge

**The shadow ambient is red-starved.** Same receiver, same frame, `forklift.png`
hall floor: sunlit RGB (77.2, 79.1, 66.0), shadowed (9.4, 48.2, 60.0). Red falls
to **12%** of its lit value while blue *rises*. Shadowed surfaces are lit almost
purely by a blue sky term with no warm bounce, which is why interiors read cold
and dark props become unreadable blobs.

It is cheaper to test than §4.1 and affects every frame, so **check it first** —
a building presenting only shaded faces is hit by both, and they may not be
independent.

### 4.3 Texel density — three assets still above the line

`texel-density.mjs` measures screen pixels per texel per asset at its nearest
camera. Six assets were raised 512 → 1024; three remain marginal:

| asset | px/texel now | at 2048 |
|---|---|---|
| barn | 2.32 | 1.16 |
| duck pond | 1.59 | 0.80 |
| town hall | 1.55 | 0.78 |

They stop at 1024 **deliberately**: uncompressed VRAM, not JPEG bytes, is the
budget — ~12.6 MB per 1024 set against ~50 MB at 2048, so finishing the job costs
roughly 112 MB of texture memory for three buildings. That is a product call.
`GENERATED_ASSETS` has a `texture` column; it is a one-word change either way.

**The rule this bought:** re-check texel density whenever a **camera** moves
closer, not only when an asset changes. The original 512 was justified by the
cameras that existed then, and adding `paddock`/`square` invalidated it without
touching a single asset.

### 4.4 Measured, deliberately not acted on — do not re-chase

- **Chickens sit 57 mm under the terrain** (13% of a 0.42 m bird). Their y is
  written authoritatively by the hop driver (`position.y = 0`), the ground under
  their wander range varies 0.05–0.08, and in pixels they read as standing on
  grass.
- **A chicken measures 68% inside the coop's AABB.** The coop is raised on legs.
- **Four bodies measure as "floating" and are resting on other bodies** — crow on
  scarecrow, cat on wishing well, ducks on pond, third hay bale on the other two.
  `placement-audit.mjs` proves support rather than reporting clear air.
- **Fence corner joins overlap 1–2%.** Perpendicular runs meeting at a corner.
- **The village is clean on seating and overlap.** All 108 instances audited; the
  two defects found (water trough 80% inside the barn, paddock fence overlapping
  itself by a metre) were both farm and are both fixed.

### 4.5 The clone reading — the strongest criticism from both reviewers

Both judges, independently, named it. `Cottage` (×5), `ShopBuilding` (×3),
`MarketStall` (×4), the three Holsteins and the sheep are each one model with one
texture, yaw the only variation. The fidelity judge: *"three market stalls are
visually identical — same awning, same crate arrangement, near-same rotation. No
per-instance colour, rotation or scale variation anywhere."*

**Two fixes, and only one of them is a generation spend:**

1. **Free**: per-instance yaw jitter, small non-uniform scale, and varying the
   *dressing* rather than the model — the losing side of the blind A/B read as a
   market rather than copy-paste precisely because the goods on each stall
   differed while the frame was shared.
2. **Credits**: a second and third markings variant per cloned asset (§5).

**Do not tint.** `Cottage`'s `wallColor` and `ShopBuilding`'s `wallColor` props
still exist and still drive the fallbacks; wiring them to the generated body
would wash a baked albedo, which is the exact pattern CLAUDE.md names.

---

## 5. Higher-quality generation — what is actually available, and what it costs

### 5.1 The free lever was already taken

The 4096-square originals are preserved under `assets/source/models/` (55 MB), so
raising the resample costs **no credits** — that was §4.3. Anything further does
cost money.

### 5.2 The settings already in use

`roster/harness/run-queue.mjs:55` is the runner, and the last batch already used
the strongest options it offers:

```js
model_version: 'v2.5-20250123', face_limit: 8000,
texture: true, pbr: true, texture_quality: 'detailed',
```

So **"turn the quality up" is not available as a simple switch** on that path.
Genuine options, in rough order of value:

- **More generations for variants** — the only fix for the clone reading that
  does not tint. Two extra markings per cloned asset ≈ 8-10 generations.
- **A newer `model_version`** — v2.5-20250123 is what was used. Whether a newer
  one exists was **not verified**; check the API before assuming, and treat a
  version bump as a regeneration of everything or of nothing, because a mixed
  set will not match.
- **Raising `face_limit` above 8000** — buys silhouette detail and costs
  triangles, and the farm is already at **+948,739 triangles** over the
  primitives. Justify against that number, not against zero.
- **Image-to-3D or multi-view instead of text-to-3D** for assets whose *design*
  matters — the church and fountain each needed three cuts because the prompt
  described the category rather than this instance of it.

### 5.3 What higher-quality generation will NOT fix

The fidelity judge's material criticism is **one matte roughness lobe across
cloth, timber, ceramic and produce** — a roughness-map variation problem, not a
resolution or polycount one. More credits will not touch it. Nor will they touch
§4.1 or §4.2, which are scene lighting.

### 5.4 Billing — the rule that has already cost a wrong estimate

**Budget from the balance, never from `consumed_credit`.** It under-reported by
~45% on the first two tasks (reported 50, charged 70), then matched exactly at
volume. Recorded rates: **~30 credits per generation, ~25 per rig, prerig checks
free.** Last recorded state: **1,435 of 3,500 spent** for 30 models. Check the
live balance before quoting anything, and get Nell's go-ahead before spending —
this is real money and the last pass deliberately did not spend any.

```bash
cd test-results/tripo-probe-20260815/roster/harness
TRIPO_KEY=tsk_... node run-queue.mjs   # refuses to start unless the balance covers the WHOLE queue
```

---

## 6. Rules this pass paid for — read before measuring anything

**An instrument that hardcodes a default cannot see its own effect.**
`texel-density.mjs` computed against a literal `512` and reported *no change*
after six assets moved to 1024. It reads the shipped map size now. Check every
tool for a constant that used to be a global truth.

**Compare like with like, or the tool invents a finding.** The first
`envelope-delta.mjs` unioned each primitive's shapes — including cone roofs yawed
45 degrees, whose axis-aligned box is inflated by up to root two — and confidently
reported the village as having shrunk by half. Narrowed to the main wall box, the
buildings are comparable. The same trap is already recorded for in-engine boxes.

**Check the agent's output location before concluding it did no work.** Both
review agents were asked for findings "as your final message", both went idle
three times with nothing delivered, and both had written complete reviews to disk
the whole time (`ab-all-BLIND-REVIEW.md`,
`art-review/generated-all-20260816/verdict.md`). **State the output path you
expect in the prompt.**

**A defect can live in the space between two objects.** The water trough's GLB
was correct, its call site was unchanged, and every gate passed — the barn grew
from 8 m deep to 10 m and swallowed it. Only an assembled-scene check finds that
class.

**Blind staging exists because sighted judgement is not reliable, including
yours.** The `village` scene was called a control win from a sighted comparison
and the blind judge scored it the other way. The blind verdict stood.

**Do not `git stash` this tree.** Eighteen modified and several untracked files;
a failed pop is unrecoverable. The A/B scripts copy the five swapped files aside
and `git checkout --` exactly those, then restore in a `finally`.

---

## 7. The instruments, all in `test-results/tripo-probe-20260815/cow-integration/`

| script | answers |
|---|---|
| `placement-audit.mjs` | seating and overlap across all 108 instances in the **assembled scene**; proves support rather than reporting false floats |
| `envelope-delta.mjs` | how far each asset's mass moved from the primitive it replaced — the check that catches swallowed neighbours |
| `texel-density.mjs` | screen pixels per texel per asset at its nearest camera |
| `plates2.mjs` | up-facing surfaces per asset with albedo sampled per triangle — finds turf discs |
| `perch.mjs` | where to re-attach an orphaned prop: chimney mouths, crowns, perches |
| `luma.mjs` | rendered luma vs albedo luma per building, paired control/treatment |
| `facing.mjs` | per-compass-direction albedo, for "is the back of this asset dark?" |
| `allab.mjs` | interleaved benchmark A/B; control is the current tree minus exactly five files, never HEAD |
| `allvisual.mjs` | paired art captures of both arms |
| `wait-and-bench.sh` | holds a benchmark back until load per core drops below 2.0 |
| `probe-dark.mjs` | runtime isolation probe — **incomplete**, see §4.1 |

Repo-level: `npm run provenance:models` regenerates both `PROVENANCE.json` from
the normalization report and **imports** `GENERATED_ASSETS` rather than copying
it. It only reads GLBs, so it cannot cause the 4-byte forklift drift.

---

## 8. The harness

`test-results/tripo-probe-20260815/harness/before/` mounts the **real**
`FarmArea`, `VillageArea` and `FairytaleCastle` and aims a camera at any named
subject. `main.tsx` holds the subject table plus `__aim`, `__meshes`,
`__cowHeads`, `__bbox` and `__audit`.

```bash
cd test-results/tripo-probe-20260815/harness/before
npx vite --config vite.config.mjs --port 5248 --strictPort --force
node shoot.mjs --out ../../cow-integration/next --port 5248 barn cowfield square
```

**Traps, all still live:**

1. **The vite dev server caches module transforms across edits to `main.tsx`** —
   restart it. This silently produced two rounds of identical "different" angles.
2. **Another session holds port 5199.** Do not kill it; use your own port. One
   esbuild helper belonging to that server was killed by accident this pass —
   check `curl localhost:5199` still returns 200 if you touch anything.
3. **`ffmpeg` is available and `magick` is not.** A contact sheet is one image
   read instead of twenty-four.
4. **`npm run capture:art` fails its final montage** because Playwright's
   headless shell is not installed (`npx playwright install` fixes it). The
   captures themselves are fine — every shoot runs `channel: 'chrome'`.

---

## 9. Measuring on this machine

This box was above **load 100 across 10 cores** for most of the last pass —
`mediaanalysisd`, Backblaze, Spotlight and a VM, all the machine owner's and none
of them yours to kill. Consequences:

- **Frame time was never measured on a quiet machine.** Every delta came back
  inside the control-only spread, and the only uncontended evidence is two clean
  pairs. Do not soften that to "unresolvable" alone.
- **Draw calls and triangles are integers that reproduce exactly** regardless of
  load. They are the trustworthy numbers: farm **−296 calls / +948,739
  triangles**, village −105, overview −154, measured before the placement polish.
- `wait-and-bench.sh` gates on load and reports what it waited for. A red
  benchmark is not a regression until you have looked at `load`.

---

## 10. Standing constraints, unchanged

- Licence is clear: Tripo3D API plan, MillOS is not commercial, Nell confirmed.
- `assets/source/models/` is immutable provenance — 55 MB for these two areas,
  and the 4096 originals it holds are why §4.3 cost nothing.
- `test-results/` is gitignored — evidence goes there, never into `src/`.
- Never round-trip a pipeline GLB through Blender; `public/models/*.glb` node and
  clip order is load-bearing for the forklift.
- **Running `npm run normalize-models` rewrites `public/models/forklift/forklift.glb`
  by 4 bytes.** Unrelated drift; `git checkout --` it, then regenerate the
  manifest (`cow-integration/mkmanifest.mjs`) and provenance
  (`npm run provenance:models`), in that order.
- `dist-control/` and `dist-treatment/` are gitignored and kept on disk: building
  a control arm is the expensive part of an A/B.
- Deploy on request only. Current status: **local only — not live.**

---

## 11. Gate commands

```bash
npm run typecheck && npm run lint && npm run format:check
npm test                     # baseline: 103 files, 1653 tests, 0 failures
npm run build
npm run validate:assets      # 34 entries
npm run validate:bundle
npm run benchmark:runtime    # see §9 before believing any frame time
npm run capture:art -- --label=<name> --set=generated
```

Suggested order for this pass: **§3 animation (free, largest gain) → §4.2
red-starved ambient (cheap, whole-scene) → §4.1 dark buildings (the blocker) →
§4.5 free half of the clone fix → then ask Nell before spending a single credit
on §5.**
