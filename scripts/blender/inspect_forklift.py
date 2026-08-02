"""Headless Blender inspection of the runtime forklift GLB.

Reports per-object vertex/triangle counts, materials, animation clips and the
overall bounds so decimation can be targeted at the heaviest meshes.
Run: Blender --background --python scripts/blender/inspect_forklift.py -- <glb>
"""
import bpy, sys, os

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
src = argv[0] if argv else "public/models/forklift/forklift.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(src))

rows = []
total_v = total_t = 0
for ob in bpy.data.objects:
    if ob.type != "MESH":
        continue
    me = ob.data
    me.calc_loop_triangles()
    v, t = len(me.vertices), len(me.loop_triangles)
    total_v += v
    total_t += t
    mats = [m.name for m in me.materials if m]
    rows.append((v, t, ob.name, mats))

rows.sort(reverse=True)
print("\n=== PER-OBJECT (sorted by vertices) ===")
for v, t, name, mats in rows:
    print(f"{v:>8} verts {t:>8} tris  {name:<32} {','.join(mats)}")

print(f"\nTOTAL: {total_v} verts, {total_t} tris, {len(rows)} mesh objects")
print("materials:", sorted({m.name for m in bpy.data.materials}))
print("images(textures):", [i.name for i in bpy.data.images if i.name != "Render Result"])
print("actions:", sorted(a.name for a in bpy.data.actions))
print("armatures:", [o.name for o in bpy.data.objects if o.type == "ARMATURE"])

# Required nodes from the asset manifest
required = ["Wheels.B_1", "Wheels.F_3", "lift01_11", "lift02_9"]
names = {o.name for o in bpy.data.objects}
print("required nodes present:", {r: (r in names) for r in required})

# Scene bounds in metres (Y-up glTF convention -> Blender is Z-up on import)
import mathutils
mn = [1e9] * 3
mx = [-1e9] * 3
for ob in bpy.data.objects:
    if ob.type != "MESH":
        continue
    for c in ob.bound_box:
        w = ob.matrix_world @ mathutils.Vector(c)
        for i in range(3):
            mn[i] = min(mn[i], w[i]); mx[i] = max(mx[i], w[i])
print("bounds min:", [round(x, 4) for x in mn])
print("bounds max:", [round(x, 4) for x in mx])
print("size XYZ  :", [round(mx[i] - mn[i], 4) for i in range(3)])
