"""Design and preview the MillOS silo body profile.

The live scene (src/components/machines/CompactMachines.tsx) instances
SILO_BODY = CylinderGeometry(1, 1, 1, 16), scaled to [2.25, 12.5, 2.25] - a
smooth 16-sided tube standing 12.5 m tall. This renders that against a
corrugated grain-bin profile built from the same unit envelope, so the geometry
can be judged at a realistic in-scene viewing distance before any app change.

Both meshes are lathes over a profile in (radius, height), matching how
THREE.LatheGeometry will build the runtime geometry.
Run: Blender --background --python scripts/blender/silo_profile_preview.py -- --out <png>
"""
import bpy, bmesh, math, sys, os

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
out = os.path.abspath(argv[argv.index("--out") + 1] if "--out" in argv else "/tmp/silo.png")

# Runtime instance scale applied to the unit geometry, from CompactMachines.
SCALE = (2.25, 12.5, 2.25)
RIDGES = 48          # corrugation count over the full body height
RIDGE_DEPTH = 0.012  # unit-space amplitude; x2.25 => ~27 mm ridges
RADIAL = 32          # up from the current 16


def corrugated_profile(ridges=RIDGES, depth=RIDGE_DEPTH, steps_per_ridge=4):
    """Radius never exceeds 1.0, so the separately-instanced stiffener rings
    (radius 1.03) still stand proud of the wall."""
    pts = [(0.0, -0.5), (1.0, -0.5)]
    total = ridges * steps_per_ridge
    for i in range(total + 1):
        t = i / total
        r = 1.0 - depth * (1.0 - math.cos(2 * math.pi * ridges * t)) / 2.0
        pts.append((r, -0.5 + t))
    pts += [(1.0, 0.5), (0.0, 0.5)]
    return pts


def smooth_profile():
    return [(0.0, -0.5), (1.0, -0.5), (1.0, 0.5), (0.0, 0.5)]


def make_lathe(name, profile, segments):
    verts, faces = [], []
    for s in range(segments):
        a = 2 * math.pi * s / segments
        ca, sa = math.cos(a), math.sin(a)
        for (r, y) in profile:
            verts.append((r * ca, y, r * sa))
    n = len(profile)
    for s in range(segments):
        s2 = (s + 1) % segments
        for p in range(n - 1):
            a0, a1 = s * n + p, s * n + p + 1
            b0, b1 = s2 * n + p, s2 * n + p + 1
            faces.append((a0, a1, b1, b0))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.validate()
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bm.to_mesh(me); bm.free()
    for poly in me.polygons:
        poly.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    ob.scale = SCALE
    return ob


bpy.ops.wm.read_factory_settings(use_empty=True)
old = make_lathe("silo_current_16seg", smooth_profile(), 16)
new = make_lathe("silo_corrugated", corrugated_profile(), RADIAL)
old.location = (-4.0, 6.25, 0)
new.location = (4.0, 6.25, 0)

print(f"current   : {len(old.data.vertices)} verts, {len(old.data.polygons)} faces")
print(f"corrugated: {len(new.data.vertices)} verts, {len(new.data.polygons)} faces")
maxr = max(math.hypot(v.co.x, v.co.z) for v in new.data.vertices)
print(f"max unit radius (must be <= 1.0): {maxr:.5f}")

cam_data = bpy.data.cameras.new("cam")
cam = bpy.data.objects.new("cam", cam_data)
bpy.context.collection.objects.link(cam)
# The lathe is built Y-up to match three.js, so an unrotated Blender camera
# (looks down -Z, up is +Y) frames it correctly.
cam.location = (0.0, 6.25, 34.0)
cam.rotation_euler = (0.0, 0.0, 0.0)
bpy.context.scene.camera = cam

scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.render.resolution_x, scene.render.resolution_y = 900, 520
scene.render.filepath = out
shading = scene.display.shading
shading.light = "STUDIO"
shading.show_shadows = True
shading.show_cavity = True          # makes the corrugation legible
shading.cavity_type = "BOTH"
bpy.ops.render.render(write_still=True)
print("WROTE", out)
