# MillOS 3D model assets

The current runtime ships only the validated assets listed in
`asset-manifest.json`. Models are authored in metres, use positive Y as up,
face positive Z, and place their origin at the bottom centre.

## Current runtime assets

```text
models/
├── asset-manifest.json
├── forklift/
│   └── forklift.glb
└── worker/
    ├── LICENSE-KENNEY.txt
    ├── LICENSE-QUATERNIUS.txt
    ├── worker.glb
    ├── worker-feminine.glb
    └── worker-masculine.glb
```

MillOS v0.41 uses authored Worker characters from the Quaternius Ultimate
Modular Men and Ultimate Modular Women packs for its named personnel. Each body
has complete industrial workwear and the same nine simulation-driven clips:
idle, walk, run, break, inspect, repair, supervise, radio, and sample. Their
meshes remain texture-free so skin tone, uniform, vest, trousers, hard hat,
hair, eye, PPE, and tool variants can be applied at runtime without duplicating
texture memory. The compact Kenney worker remains a validated compatibility
asset for older consumers.

The v0.41 delivery pipeline applies `KHR_draco_mesh_compression` to both
authored personnel bodies. Runtime derivatives preserve one skin, the complete
62-joint rig, all nine semantic clips, names, and physical bounds. The asset
validator checks those contracts and the DRACO extension before release.

The selected Quaternius Worker models and their authored animation sets are
CC0. Exact source models, licences, download identifiers, hashes, and
transformation provenance are preserved under
`assets/source/models/worker-quaternius/`.

The factory machines use the authored instanced runtime models. The former
third-party silo GLB is quarantined under `assets/source/models/` because it
referenced a missing texture and had incorrect physical dimensions. It must
not be copied back into `public/models/` without repair and a manifest entry.

The forklift derivative simplifies its wheel bolt clusters and hubs during
normalization, which are ~2 cm details that dominated the source mesh. That
reduction happens inside `scripts/normalize-model-assets.mjs` rather than by
re-authoring the GLB in a modeller, and it must stay that way. glTF animation
order and mesh order are both load-bearing: the pipeline maps clips by source
name, and runtime code in `src/components/models/ForkliftModel.tsx` resolves
parts by the generated index names (`forklift-hydraulic02-poles-19`). A
measured Blender round trip of the source permutes both, which silently swaps
the fork raise/lower clips and breaks the telescoping ram. The manifest now
pins those two ram nodes so any reordering fails validation instead of
degrading in the scene. `scripts/blender/glb_report.py` dumps the file-order
contract for comparison.

## Validation

Run:

```bash
npm run validate:assets
```

The validator checks each manifest asset for self-containment, finite and
approved bounds, ground and centre alignment, file size, mesh and material
budgets, required rig nodes, skin and joint counts, compression, stable
animation names, and attribution metadata.
Validation is a release gate.

## Adding or replacing an asset

1. Preserve the canonical source under `assets/source/models/`.
2. Create a derived GLB. Do not overwrite the source asset.
3. Apply transforms, centre the model, set the physical pivot, and make all
   buffers and textures self-contained.
4. Use stable semantic names for wheels, joints, forks, bones, and animation
   clips.
5. Add the asset, its licence, attribution, bounds, budgets, required nodes,
   and required clips to `asset-manifest.json`.
6. Run `npm run validate:assets` and inspect the asset at its intended scene
   scale before promotion.

CC BY assets require the attribution recorded in the manifest. CC0 assets keep
their source and licence records for provenance even when attribution is not a
legal requirement. Never assume a download is cleared for production use
without verifying its licence.
