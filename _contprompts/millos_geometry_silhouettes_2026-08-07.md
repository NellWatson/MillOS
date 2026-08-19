---
title: MillOS procedural geometry — designed silhouettes
date: 2026-08-07
status: three passes applied and uncommitted; static gates green; NO runtime or performance verification yet
scope: procedural three.js geometry across the live scene, plus the Blender design harness under scripts/blender/
branch: launch-audit-polish
verification_criteria:
  - "Every redesigned object has been seen in the running app, not just in a Blender render and a passing build."
  - "No object reads as a segment-count bump: each change is a designed silhouette with named features, or it is reverted."
  - "Every geometry keeps the exact unit envelope it replaced, or its call sites were audited and the drift is stated in millimetres."
  - "No geometry behind a pointer-handling or raycast mesh got denser without a picking proxy or a measured argument that the cost is immaterial."
  - "Draw calls, p95 frame time and effective DPR are measured against the 25 ms budget after the change, not assumed."
  - "Typecheck, lint, production build, and the full 99-file / 1638-test suite are green."
  - "Deliberate non-changes are recorded with reasoning, so stylization is visibly a decision rather than an omission."
---

# MillOS — designed silhouettes, continuation

## 1. Where this stands

Three passes ran over the procedural geometry. All of it is **uncommitted** on
`launch-audit-polish`. The 26 modified files under `src/components` are exactly
this work — earlier WIP was absorbed into commits `91514ed` and `87c67db`, so
**`git diff` is now attributable** and the "never diff a dirty tree" workaround
that shaped the earlier passes no longer applies. Use the diff.

| Pass | What it did | Verdict |
|---|---|---|
| 1 — machine bank, by hand | 8 parts in `CompactMachines.tsx`; one real shape change (bin roof: rolled eave, shallower pitch, fill collar) | kept |
| 2 — 16-agent sweep | 45 changes that reach a screen, almost all segment-count increments | **rejected as generic**; residue still in tree, see §5 |
| 3 — 16-agent design sweep | 67 objects redesigned; 66 are drawn profiles / prisms / lofts, 1 constructor swap | kept |

Evidence pages (self-contained, all renders inlined):

- `test-results/geometry-demo/01-silhouettes-designed.html` — pass 3
- `test-results/geometry-demo/02-earlier-passes.html` — passes 1–2
- Artifacts: `2d4d1899-d18c-4f49-bb75-b8fd524b4805`, `0f81a6e5-e371-4406-a767-d20e9b9ba4cf`

## 2. The harness — read this before designing anything

`scripts/blender/machine_part_preview.py` is the design tool for surfaces of
revolution. It renders before beside after at the object's real instance scale
and viewing distance, prints vertex counts, and reports per-axis half-extent
drift in millimetres on the axis that moved.

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python scripts/blender/machine_part_preview.py -- \
  --spec scripts/blender/specs/<slice>.json --outdir /tmp/out
```

Shape kinds a spec entry may use for `before` / `after`:

```jsonc
{"kind":"profile", "points":[[r,y],...], "segments":32}      // designed lathe
{"kind":"ribbed",  "points":[...], "segments":64, "ribs":16,
                   "ribDepth":0.02, "yFrom":-0.4, "yTo":0.3}  // angular modulation
{"kind":"prism",   "points":[...], "sides":8}                 // deliberately faceted
{"kind":"cylinder"|"cone"|"sphere"|"torus"|"ring"|"circle"|"capsule"|"roundedbox",
 "args":[...]}                                                // three.js constructor
```

`scripts/blender/machine_body_preview.py` is the second renderer, for the mill,
sifter and packer housings. Those are **rectangular**, and every panel, screen
and placard on them is a flat quad pinned at a hand-tuned world Z — several
living in `machineDecals.ts`, which geometry work must not touch. Revolving one
into a lathe moves the front face back 0.63 m and leaves all that trim in
mid-air. It uses `{"kind":"housing","corner":..,"arc":..,"points":[[sx,sz,y],..]}`
— a rounded rectangle in plan lofted up a vertical profile, so faces stay flat.

19 authored specs are in `scripts/blender/specs/`, annotated SHIPPED / FINAL /
STUDY ONLY / REJECTED. They are the design record; keep them.

## 3. Rules that were paid for

**Envelope.** Parts are positioned against neighbours by hand-tuned numbers, so
a redesign must preserve the exact max radius and y range it replaces. Two
subtleties, both discovered the hard way:

- three.js places radial vertices *on* the circle, so a segment count not
  divisible by 4 **under-reaches** its nominal radius. `ConeGeometry(2.5,6,6)`
  has a Z half-extent of 2.165, not 2.5.
- Therefore "pick a count divisible by 4" makes the *after* exact but cannot
  preserve a *before* that wasn't. Refining a 10-gon always grows the box. That
  is a correction, not a bug — but it must be measured and stated, not assumed.

**Orientation.** three.js lays a torus ring in XY with the tube along Z, and
`CircleGeometry` / `RingGeometry` in XY; a Blender lathe revolves around Y.
Getting this wrong renders a blank frame or squashes the wrong axis. It
produced two wrong answers before it was caught.

**Raycast.** Never densify geometry behind a pointer-handling mesh without a
picking proxy — see `raycastSiloShell` in `CompactMachines.tsx`, where the
corrugated shell went 64 → 10,368 triangles and a cursor-over-a-silo raycast
went 43 µs → 6.6 ms. But measure before panicking: the forklift's warning cone
sits in a subtree that already contains a 124,188-vertex GLB, so +32 vertices
there is +0.026 % and immaterial.

**Sub-pixel features are not features.** Real grain-bin corrugation is ~100 mm
pitch; at the 60–100 m those silos are viewed from it is under a pixel and
averages back to a smooth cylinder. The shipped wall uses 1.08 m rolled sheet
courses instead, because a viewer knows how tall a steel sheet is. Compute the
pixel footprint before paying for detail.

**Stylization is an answer.** Faceted foliage and low-poly props are the site's
art direction. A designed prism beats an accidental one; sanding everything
smooth is a failure mode. Farm conifers were deliberately left faceted.

**Reachability is transitive.** A file-level "is this imported?" check is
insufficient — `ambient/index.ts` re-exports every ambient module, so each looks
referenced, while the only consumer of that barrel is itself dead. A proper walk
from `src/main.tsx` found **27 of 66 geometry files unreachable**, including the
entire `ambient/` tree and most of `infrastructure/`. Walk the graph before
assigning work.

**Measure in three.js, not in the proxy.** Blender rebuilds are faithful for
*shape* but not vertex counts. Every number quoted to a human was recomputed by
constructing the real geometry in `three` and reading its attributes.

**Agents doing geometry must be allowed to run Blender.** Pass 2 forbade it to
protect the machine and got arithmetic for its trouble. Blender headless is
~2 s per render and parallelises fine; it is `npm run build`/`test` that must
stay central.

## 4. Do this first — the real gap

**Pass 3 was never seen running.** Static gates are green (typecheck, lint,
build, 99 files / 1638 tests, 0 failures) but the repo's own rule is that a
build is not a runtime, and 67 objects changed shape without anyone loading the
scene. This is the single highest-value next action.

The tooling for it now exists and did not when this work was done:

```bash
npm run capture:art          # scripts/capture-art-review.mjs
/art-loop                    # .claude/commands/art-loop.md
```

plus two subagents: `visual-fidelity-judge` (grades a capture sheet against a
rubric, PASS/FAIL) and `blind-ab-judge` (decides whether an iteration helped).
Run the capture, judge it, and treat any regression as blocking. Watch
specifically for:

- shadow acne on the corrugated silo wall (single directional light, bias
  −0.001) — explicitly flagged UNVERIFIED by the designing agent;
- the fill-cap / roof-collar junction on the big silos;
- z-fighting where the new pond bank crosses the water disc (`polygonOffset` was
  rebalanced there);
- worker silhouettes at medium LOD, where the torso was reshaped.

Then measure, because nothing has been:

```bash
npm run benchmark:runtime    # FPS, p95 frame time, renderer draw calls, DPR
```

The machine bank issues 43 draw calls and 30 of them cluster onto 9 shared
materials; `BatchedMesh` would take that to roughly 20. Nobody has shown it
matters — measure before optimising.

## 5. Known-open, ordered

1. **Pass-2 generic residue.** Segment-only bumps that pass 3 did not supersede
   are still in the tree and were explicitly rejected as an approach. Known:
   GrainSilo foundation ring (24→48), PropaneTank warning stripe (12→24),
   `SG.mudPuddle` (16→32). Either design them or revert them. `git diff` now
   shows them cleanly.
2. **13 pass-2 changes sit in transitively dead files** (`ambient/`,
   `infrastructure/SafetyEquipment`, `breakdown/`). Harmless — Vite never
   bundles them — left in place rather than risk botched reverts. Revisit.
3. **Unfixed critic findings** (of 59 raised, 6 fixed by critics, 2 by hand):
   - `CompactMachines.tsx:918` sifterDrive instance matrix moved but not fully
     reconciled with the reshaped casing.
   - `gas-station` nozzle spout still does not quite meet the handle.
   - `OpenDockOpening` bollards are fully enclosed in the factory plinth and
     cannot be seen — the redesign there is invisible work.
   - `VillageArea.tsx:1333` `VillageLamp` is an unreferenced duplicate still
     holding the old primitives.
4. **Nothing is committed.** Suggested split: the harness + specs as one commit,
   the geometry per area, so a bisect can attribute a visual regression.
5. **27 dead geometry files** are a separate cleanup with real value — they are
   ~240 geometry declarations of apparent surface that no reader can tell is
   dead. Out of scope here; worth its own pass.

## 6. Standing constraints

- Never round-trip a pipeline GLB through Blender; `public/models/*.glb` are
  generated by `scripts/normalize-model-assets.mjs` and their glTF node/mesh
  order is load-bearing (`forklift-hydraulic02-poles-19`). Only the hand-built
  procedural fallback geometry is ever in scope.
- `assets/source/models/` is immutable provenance.
- Match the house comment voice: state the rendered size, the features the
  profile has and why they read at that distance, and the envelope preserved.
  See `createSiloShellGeometry` / `createSiloRoofGeometry` in
  `CompactMachines.tsx`, and `createPipeFlangeGeometry` in `SpoutingSystem.tsx`.
- Transcribe approved Blender numbers exactly. A profile retyped from memory is
  not the profile that was approved.

## 7. Gate commands

```bash
npm run typecheck && npm run lint
npm run build
npm test                     # baseline: 99 files, 1638 tests, 0 failures
npm run validate:assets      # 4/4 pass
npm run benchmark:runtime    # NOT YET RUN for this work
```

Baseline note: an earlier run reported 91 files / 1603 tests with 2 failures.
That was under-collection on a loaded machine, not a real baseline — the suite
is 99 files and fully green. Always record failing test *names* before starting.
