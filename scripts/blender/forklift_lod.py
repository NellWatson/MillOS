"""Decimate the canonical forklift source in Blender, preserving the glTF
contract that scripts/normalize-model-assets.mjs depends on.

That pipeline renames animation clips *by index* and derives mesh names from
source material names, so animation count/order and material names must survive
the round trip. A ratio of 1.0 for every mesh makes this a pure round-trip test.

Run: Blender --background --python scripts/blender/forklift_lod.py -- \
        --in <src.glb> --out <dst.glb> [--roundtrip]
"""
import bpy, sys, os

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

def arg(flag, default=None):
    return argv[argv.index(flag) + 1] if flag in argv else default

src = os.path.abspath(arg("--in", "assets/source/models/forklift/forklift-original.glb"))
dst = os.path.abspath(arg("--out", "/tmp/forklift-roundtrip.glb"))
roundtrip = "--roundtrip" in argv

# Decimation ratios keyed by the source material name carried on each mesh.
# Wheels are ~70% of this model and their bolt clusters alone are 21.6k verts of
# ~2 cm detail on a 2.5 m vehicle - invisible at any in-scene camera distance.
RATIOS = {
    "wheel_bolts.B": 0.18,
    "wheel_bolts.F": 0.18,
    "wheel_rubberPattern.B": 0.30,
    "wheel_rubberPattern.F": 0.30,
    "wheel_metal.B": 0.40,
    "wheel_metal.F": 0.40,
    "wheel_rubber.B": 0.60,
    "wheel_rubber.F": 0.60,
}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)

before = after = 0
touched = []
for ob in bpy.data.objects:
    if ob.type != "MESH":
        continue
    me = ob.data
    before += len(me.vertices)
    mats = [m.name for m in me.materials if m]
    # Blender may suffix duplicated material names; match on the stem.
    ratio = None
    for key, value in RATIOS.items():
        if any(m == key or m.startswith(key + ".") for m in mats):
            ratio = value
            break
    if roundtrip or ratio is None or ratio >= 1.0:
        after += len(me.vertices)
        continue
    mod = ob.modifiers.new(name="MillOS_Decimate", type="DECIMATE")
    mod.decimate_type = "COLLAPSE"
    mod.ratio = ratio
    # Keep the hard-surface silhouette readable rather than melting bolt heads.
    mod.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier=mod.name)
    after += len(me.vertices)
    touched.append((ob.name, mats[0] if mats else "?", ratio))

for name, mat, ratio in touched:
    print(f"decimated {name:<34} mat={mat:<24} ratio={ratio}")
print(f"VERTS {before} -> {after}")

os.makedirs(os.path.dirname(dst), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=dst,
    export_format="GLB",
    export_animations=True,
    # glTF animations import as NLA tracks; exporting by track is what keeps the
    # five clips intact and in order for the index-based rename downstream.
    export_animation_mode="NLA_TRACKS",
    export_apply=False,
    export_yup=True,
    use_selection=False,
)
print("WROTE", dst)
