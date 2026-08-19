# MillOS 3D model assets

The current v0.40 runtime ships only the autonomous equipment listed in
`asset-manifest.json`. Models are authored in metres, use positive Y as up,
face positive Z, and place their origin at the bottom centre.

## Current runtime assets

```text
models/
├── asset-manifest.json
├── farm/                     16 generated assets
│   ├── barn.glb  coop.glb  farmhouse.glb  windmill.glb
│   ├── haybale.glb  watertrough.glb  gardenbed.glb  fence.glb
│   └── cow.glb  sheep.glb  pig.glb  horse.glb  chicken.glb
│       crow.glb  duck.glb  scarecrow.glb
├── village/                  14 generated assets
│   ├── cottage.glb  shop.glb  church.glb  townhall.glb  pub.glb
│   │   school.glb  forge.glb  castle.glb
│   ├── wishingwell.glb  marketstall.glb  postbox.glb
│   │   fountain.glb  duckpond.glb
│   └── cat.glb
└── forklift/
    └── forklift.glb
```

The factory machines use the authored procedural and instanced runtime models.
The former third-party silo GLB is quarantined under `assets/source/models/`
because it referenced a missing texture and had incorrect physical dimensions.
It must not be copied into `public/models/` without repair and a manifest entry.


## The 30 generated farm and village assets, and why they carry textures

`farm/` and `village/` hold **30 generated GLBs** - 21 static structures and
props, 9 rigged creatures - that replace procedural primitive geometry in
`FarmArea.tsx`, `VillageArea.tsx`, `scenery/Cat.tsx` and
`scenery/FairytaleCastle.tsx`. Every one carries three textures, and that is a
deliberate exception rather than a relaxation of the budget.

**The zero-texture stance was always about runtime-variant meshes**, which
stayed texture-free so palette variants could be applied without duplicating
texture memory. None of these 30 has a runtime variant, and their surfaces *are* the asset - a Holstein assembled from boxes
and spheres never reads as a Holstein, and a thatched cottage assembled from a
box and a cone never reads as thatch. Budgets in `asset-manifest.json` are per
asset: these 30 entries declare `maxTextures: 3` and every other entry still
declares `maxTextures: 0`. This is not a global stance being bent.

The cost is stated rather than assumed:

| | value |
|---|---|
| shipped weight | 11.8 MiB across 30 files |
| of which texture | 3.14 MiB |
| render vertices | 663,570 total |
| materials per asset | 1 |
| textures per asset | 3 (albedo, ORM, normal), JPEG, 512 square by default and 1024 for six |
| immutable sources | 55 MB under `assets/source/models/{farm,village}/` |

The three maps arrive from the generator at 4096 square, ~1.3-1.8 MB of JPEG per
set, and are resampled in `scripts/normalize-model-assets.mjs`. **The size is per
asset, because texel density is per asset.** One 512-square atlas stretched over
a 10 m barn is 15 texels per metre; the same atlas on a 1.8 m cow is 356. A
single global number is therefore wrong in both directions.

`test-results/.../texel-density.mjs` measures it properly - texels per metre from
the real UV and surface areas, against screen pixels per metre at the nearest
capture camera - and reports **screen pixels per texel**. Six assets measured
above 1.5 (visibly soft) and were raised to 1024: barn, farmhouse, town hall,
market stall, duck pond and castle. The remaining 24 sit at 1.06 or below at 512
already, and the cow at 0.24, so raising those would spend memory on detail no
camera can resolve.

It stops at 1024. Uncompressed GPU texture memory, not JPEG bytes on disk, is
the real budget here: one 1024 set is ~12.6 MB of VRAM against ~50 MB at 2048.
That leaves the barn at 2.32 rather than 1.16, which is the deliberate trade.

Re-check the density whenever a **camera** moves closer, not only when an asset
changes - the original 512 was justified by the cameras that existed then, and
the `paddock` and `square` cameras invalidated that premise without touching a
single asset.

The generator also ships `metallic: 1.0` next to an ORM map, which reads as
polished metal wherever that map's blue channel is not black; the pipeline
forces the metallic factor to zero on all 30.

### Adding one is a table row

`GENERATED_ASSETS` in `scripts/normalize-model-assets.mjs` carries one row per
asset - `target` metres, `axis` (`max` / `x` / `y` / `z`), an optional `yaw`,
an optional `texture` size, and a `rigged` flag - and `normalizeGeneratedAsset()`
does facing, uniform
scale, re-origin, texture resample, metallic-zero and semantic renaming. The
table is exported, so `scripts/write-model-provenance.mjs` reads the size
decisions from the code that made them rather than from a second copy.

Three rules that table encodes, each paid for by a wrong render:

- **Facing comes from the whole heading vector, snapped to 90 degrees.** A
  `Head.z < Hip.z` test only flips 180 degrees, and the generator laid the cow,
  horse, crow, duck and scarecrow along Z but the sheep, pig and chicken along
  **X**. The raw `-atan2(headX - hipX, headZ - hipZ)` angle carries head-turn
  noise, which left the horse standing 14 degrees askew; the snap discards it.
- **Size by the dimension that constrains the prop, not always the footprint.**
  The fence panel sized to a 3 m width stood 1.9 m tall - a stockade against the
  1.05 m post-and-rail it replaces. The fountain sized to a 7 m pool stood 7.3 m
  tall in a village square. Both are `axis: 'y'` now.
- **A call site's own `scale` wraps the GLB too.** `WindmillComp` (1.5) and the
  castle (`SITE_LAYOUT` 1.5) are handled by sizing their assets to 1/scale.

### Rigs and clips

Nine assets are rigged, and Tripo fits the **same 41-joint skeleton with the
same bone names** to quadrupeds, birds and bipeds - `Root`, `Hip`, `Spine01/02`,
`NeckTwist01/02`, `Head` - which is what `requiredNodes` pins and what lets one
`RiggedCreatureModel` drive a crow and a horse with no per-species branch.
Per-species numbers live in `CREATURE_SPECS`.

There are **no clips on any asset**. `animate_retarget`'s presets are humanoid,
and because the quadruped rig names the front legs `Clavicle`/`Upperarm`/`Hand`,
a biped idle maps onto it and rears the animal onto its hind legs. Motion is
authored in-engine instead. The joints stop at `Head`, so tails and ears cannot
be animated on any species.

### Provenance

`assets/source/models/{farm,village}/PROVENANCE.json` records, per asset, the
generation pipeline, the preserved source and its SHA-256, the shipped
derivative and its SHA-256, and the normalization decisions. Both files are
**generated, not typed**:

```bash
npm run normalize-models     # rewrites public/models/, writes the report
npm run provenance:models    # rewrites both PROVENANCE.json from that report
```

`provenance:models` only reads GLBs, so it cannot introduce the 4-byte
`forklift.glb` drift that a normalization pass does.

The factory machines use the authored instanced runtime models. The former
third-party silo GLB is quarantined under `assets/source/models/` because it
referenced a missing texture and had incorrect physical dimensions. It must
not be copied back into `public/models/` without repair and a manifest entry.

The forklift derivative simplifies its wheel bolt clusters and hubs during
normalization. These roughly 2 cm details dominated the source mesh. The
reduction happens inside `scripts/normalize-model-assets.mjs` rather than by
re-authoring the GLB in a modeller. glTF animation order and mesh order are both
load-bearing: the pipeline maps clips by source name, and runtime code in
`src/components/models/ForkliftModel.tsx` resolves parts by generated index
names such as `forklift-hydraulic02-poles-19`. A measured Blender round trip of
the source permutes both, which silently swaps the fork raise and lower clips
and breaks the telescoping ram. The manifest pins both ram nodes so reordering
fails validation instead of degrading in the scene.

## Validation

Run:

```bash
npm run validate:assets
npm run validate:uncrewed
```

The asset validator checks each manifest asset for self-containment, finite and
approved bounds, ground and centre alignment, file size, geometry and material
budgets, required nodes, stable animation names, and attribution metadata. The
uncrewed validator checks the completed build for prohibited character assets,
host speech synthesis, and personnel runtime modules. Both are release gates.

## Adding or replacing an asset

1. Preserve the canonical source under `assets/source/models/`.
2. Create a derived GLB. Do not overwrite the source asset.
3. Apply transforms, centre the model, set the physical pivot, and make all
   buffers and textures self-contained.
4. Use stable semantic names for wheels, joints, forks, and animation clips.
5. Add the asset, its licence, attribution, bounds, budgets, required nodes,
   and required clips to `asset-manifest.json`.
6. Run both validation gates and inspect the asset at its intended scene scale.

CC BY assets require the attribution recorded in the manifest. Never assume a
download is cleared for production use without verifying its licence.
