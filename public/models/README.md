# MillOS 3D model assets

The current v0.40 runtime ships only the autonomous equipment listed in
`asset-manifest.json`. Models are authored in metres, use positive Y as up,
face positive Z, and place their origin at the bottom centre.

## Current runtime assets

```text
models/
├── asset-manifest.json
└── forklift/
    └── forklift.glb
```

The factory machines use the authored procedural and instanced runtime models.
The former third-party silo GLB is quarantined under `assets/source/models/`
because it referenced a missing texture and had incorrect physical dimensions.
It must not be copied into `public/models/` without repair and a manifest entry.

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
