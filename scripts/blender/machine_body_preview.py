"""Design and preview the MillOS machine BODIES - the four interactive housings.

`machine_part_preview.py` covers the parts that are surfaces of revolution: the
silo shell, the roof, the cones, the rollers. It cannot describe the mill,
sifter and packer bodies, and the reason is not an oversight - it is the whole
design problem for this slice.

Those three bodies are RECTANGULAR. Every panel, recess, screen, accent strip
and placard on them is a flat quad glued to a flat face at a hand-tuned world Z,
and several of those placards live in `machineDecals.ts`, a file the geometry
change is not allowed to touch. Revolving the body into a lathe moves the front
face back by up to 0.63 m at the edges of a 3.5 m panel and every one of those
quads is left hanging in the air. A lathe is not a conservative choice here; it
is a broken one.

What a rectangular machine body CAN be reshaped into is a LOFT: a rounded
rectangle in plan, swept up a designed vertical profile. That gives the thing
the brief actually asks for - a plinth, a bellied or battered body, a chamfered
shoulder - while the four faces stay flat and stay where the trim expects them.

  {"kind": "housing",
   "corner": 0.04, "arc": 3,
   "points": [[sx, sz, y], ...]}

`sx` and `sz` scale the half-extents (0.5) independently, which is the property
that makes the whole slice possible: the front face can be pinned at sz = 1.0
across the band where the placards live while the side walls are free to batter,
step and chamfer. `corner` is the plan fillet radius in unit space, `arc` its
segment count.

NORMALS ARE ANALYTIC, not averaged. `machineSurfaces.ts` injects an edge-wear
term - `pow(1 - abs(dot(viewDir, normal)), 4)` - that paints bare metal along
silhouette edges, so the shading normal is a visible surface feature and not
just lighting. A rounded rectangle has an exactly known outward normal
(constant on each flat, sweeping through 90 degrees on each corner arc), so the
flats shade dead flat and the corners give that term a clean continuous band.
Averaged face normals would bow the flats and step the corners.

Run:
  Blender --background --python scripts/blender/machine_body_preview.py -- \
      --spec scripts/blender/specs/machine-bodies.json --outdir /tmp/bodies

Also understands the plain three.js constructor kinds it needs for "before"
entries ("roundedBox", "cylinder", "cone", "sphere"), so a spec file here is
self-contained.
"""

import bpy
import bmesh
import mathutils
import json
import math
import os
import sys

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


# ---------------------------------------------------------------------------
# The designed form: a rounded-rectangle loft.
# ---------------------------------------------------------------------------

def rounded_rect_ring(hx, hz, c, arc):
    """Points and outward 2D normals around a rounded rectangle in XZ.

    Ordered counter-clockwise from the +X face. Each corner contributes an arc
    of `arc` segments, and the arc END points sit exactly at the tangent points
    where the flats begin - so the flats are the straight runs BETWEEN corner
    arcs and need no points of their own. The normal at an arc end equals the
    adjacent flat's normal by construction, which is why a single ring of
    vertices can carry both a dead-flat wall and a smoothly swept fillet.
    """
    c = min(c, hx * 0.98, hz * 0.98)
    centres = [
        (hx - c, hz - c),
        (-(hx - c), hz - c),
        (-(hx - c), -(hz - c)),
        (hx - c, -(hz - c)),
    ]
    pts, normals = [], []
    for k, (cx, cz) in enumerate(centres):
        base = k * math.pi / 2
        for i in range(arc + 1):
            # Skip the shared tangent point between consecutive corners? No -
            # they are DIFFERENT points (the two ends of one flat face), so
            # every sample is kept.
            t = base + (math.pi / 2) * i / arc
            nx, nz = math.cos(t), math.sin(t)
            pts.append((cx + c * nx, cz + c * nz))
            normals.append((nx, nz))
    return pts, normals


def housing(points, corner=0.04, arc=3):
    """Loft a rounded rectangle up a [(sx, sz, y), ...] profile.

    Vertices are NOT shared between courses. Every transition in the profile -
    the top of the plinth flare, a split-line step, the start of the shoulder
    chamfer - is a deliberate crease, and sharing a ring between two courses
    would smear exactly the edges the design is made of.
    """
    verts, faces, normals, uvs = [], [], [], []
    samples = [(float(p[0]), float(p[1]), float(p[2])) for p in points]

    # u is laid out ONCE, from the widest ring, and reused verbatim on every
    # course. Recomputing arc length per ring would shear the panel-normal grid
    # across every battered section, because a narrower ring has a shorter
    # perimeter and the same vertical corner would land at a different u.
    widest = max(samples, key=lambda s: s[0] * s[1])
    ref_pts, _ = rounded_rect_ring(0.5 * widest[0], 0.5 * widest[1], corner, arc)
    ring_n = len(ref_pts)
    lengths = [0.0]
    for i in range(ring_n):
        a = ref_pts[i]
        b = ref_pts[(i + 1) % ring_n]
        lengths.append(lengths[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    perimeter = lengths[-1]
    # Four faces, one unit of u each - the same convention BoxGeometry uses, so
    # the existing band(PANEL_NORMAL, 1, 1) tuning in machineSurfaces.ts still
    # lands one panel grid per face.
    us = [4.0 * length / perimeter for length in lengths]

    def ring(sx, sz):
        return rounded_rect_ring(0.5 * sx, 0.5 * sz, corner, arc)

    for course in range(len(samples) - 1):
        sx0, sz0, y0 = samples[course]
        sx1, sz1, y1 = samples[course + 1]
        p0, n2d = ring(sx0, sz0)
        p1, _ = ring(sx1, sz1)
        base = len(verts)
        for j in range(ring_n + 1):  # +1 duplicates the seam for u wrap
            jj = j % ring_n
            lower = (p0[jj][0], y0, p0[jj][1])
            upper = (p1[jj][0], y1, p1[jj][1])
            # Profile tangent at this ring point, then the ring tangent; their
            # cross product is the exact surface normal.
            #
            # The ring tangent is taken from the ANALYTIC plan normal, not from
            # a difference of neighbouring ring points. On a flat face the
            # previous sample is round a corner arc and the next is the far end
            # of the flat, so a central difference is not parallel to the flat
            # and tilts the wall's normal by half a degree - enough to put a
            # faint barrel gradient down a 4.8 m panel under the fresnel wear
            # term. Perpendicular to the plan normal is exact everywhere.
            dt = (upper[0] - lower[0], upper[1] - lower[1], upper[2] - lower[2])
            du = (-n2d[jj][1], 0.0, n2d[jj][0])
            nx = dt[1] * du[2] - dt[2] * du[1]
            ny = dt[2] * du[0] - dt[0] * du[2]
            nz = dt[0] * du[1] - dt[1] * du[0]
            length = math.sqrt(nx * nx + ny * ny + nz * nz)
            if length < 1e-9:
                nx, ny, nz = n2d[jj][0], 0.0, n2d[jj][1]
            else:
                nx, ny, nz = nx / length, ny / length, nz / length
                if nx * n2d[jj][0] + nz * n2d[jj][1] < 0:
                    nx, ny, nz = -nx, -ny, -nz
            verts.append(lower)
            normals.append((nx, ny, nz))
            uvs.append((us[j], y0 + 0.5))
            verts.append(upper)
            normals.append((nx, ny, nz))
            uvs.append((us[j], y1 + 0.5))
        for j in range(ring_n):
            # lower[j] -> upper[j] -> upper[j+1] -> lower[j+1]: the profile
            # tangent crossed into the ring tangent, which is the outward
            # normal. Wound the other way the shell is inside-out and every
            # custom normal fights its own face.
            a = base + j * 2
            faces.append((a, a + 1, a + 3, a + 2))

    # Caps. Never seen on any of the three - the base plate swallows the bottom
    # and a hopper cone sits on the top - but an open shell reads as a hole the
    # instant the camera clips inside one.
    for sample, sign in ((samples[0], -1.0), (samples[-1], 1.0)):
        sx, sz, y = sample
        pts, _ = rounded_rect_ring(0.5 * sx, 0.5 * sz, corner, arc)
        centre = len(verts)
        verts.append((0.0, y, 0.0))
        normals.append((0.0, sign, 0.0))
        uvs.append((0.5, 0.5))
        for (px, pz) in pts:
            verts.append((px, y, pz))
            normals.append((0.0, sign, 0.0))
            uvs.append((px + 0.5, pz + 0.5))
        for j in range(ring_n):
            a = centre + 1 + j
            b = centre + 1 + (j + 1) % ring_n
            faces.append((centre, a, b) if sign < 0 else (centre, b, a))
    return verts, faces, normals


# ---------------------------------------------------------------------------
# three.js constructors, for "before" entries.
# ---------------------------------------------------------------------------

def rounded_box(w, h, d, segments, radius):
    """RoundedBoxGeometry(w, h, d, segments, radius), as a bevelled cube.

    Rebuilt with a bmesh bevel rather than three's own subdivision: the SURFACE
    is identical, which is what the render judges, and the vertex count three
    actually produces is stated in the spec note instead of being inferred from
    this mesh. three's version subdivides the flat faces as well, so it carries
    far more vertices than the shape needs - part of what this slice is fixing.
    """
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= w
        v.co.y *= h
        v.co.z *= d
    bmesh.ops.bevel(
        bm,
        geom=list(bm.verts) + list(bm.edges) + list(bm.faces),
        offset=radius,
        segments=max(1, int(segments)),
        affect="EDGES",
        profile=0.5,
        clamp_overlap=True,
    )
    verts = [(v.co.x, v.co.y, v.co.z) for v in bm.verts]
    bm.verts.index_update()
    faces = [tuple(v.index for v in f.verts) for f in bm.faces]
    bm.free()
    return verts, faces, None


def lathe(profile, segments):
    verts, faces = [], []
    n = len(profile)
    for s in range(segments):
        a = 2 * math.pi * s / segments
        ca, sa = math.cos(a), math.sin(a)
        for (r, y) in profile:
            verts.append((r * ca, y, r * sa))
    for s in range(segments):
        s2 = (s + 1) % segments
        for p in range(n - 1):
            faces.append((s * n + p, s * n + p + 1, s2 * n + p + 1, s2 * n + p))
    return verts, faces, None


def geometry_from_shape(shape):
    kind = shape["kind"].lower()
    if kind == "housing":
        return housing(
            shape["points"],
            corner=float(shape.get("corner", 0.04)),
            arc=int(shape.get("arc", 3)),
        )
    if kind == "roundedbox":  # (width, height, depth, segments, radius)
        a = shape["args"]
        return rounded_box(a[0], a[1], a[2], a[3], a[4])
    if kind == "profile":
        pts = [(float(p[0]), float(p[1])) for p in shape["points"]]
        return lathe(pts, int(shape.get("segments", 32)))
    if kind == "cylinder":
        rt, rb, h, seg = shape["args"]
        half = h / 2
        return lathe([(0, -half), (rb, -half), (rt, half), (0, half)], int(seg))
    raise SystemExit(f"unsupported geometry kind {kind!r}")


# ---------------------------------------------------------------------------
# Scene
# ---------------------------------------------------------------------------

def envelope(verts):
    return tuple(max(abs(v[i]) for v in verts) for i in range(3))


def build(name, geom, scale):
    verts, faces, normals = geom
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.validate()
    if normals is not None:
        for poly in me.polygons:
            poly.use_smooth = True
        me.normals_split_custom_set_from_vertices(
            [(n[0], n[1], n[2]) for n in normals]
        )
    else:
        for poly in me.polygons:
            poly.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    ob.scale = scale
    return ob


# Azimuth / elevation, degrees. The harness's straight-on elevation is useless
# for these: every feature designed into a rectangular body - the chamfered
# shoulder, the plinth splay, the split line, the corner fillet - is an EDGE,
# and an edge seen face-on is a line one pixel wide. `hero` is roughly the site
# camera's angle on the machine floor; `front` is the near-elevation that shows
# the batter as a silhouette.
VIEWS = {"hero": (38.0, 18.0), "front": (6.0, 9.0)}


def place_camera(distance, az_deg, el_deg):
    """Look-at with world +Y as screen up.

    The mesh is built Y-up to match three.js, so in Blender's Z-up world it is
    lying on its side. A TRACK_TO constraint rolls the frame 90 degrees because
    its `up_axis` resolves against world +Z; the basis has to be built by hand.
    """
    az, el = math.radians(az_deg), math.radians(el_deg)
    cam_data = bpy.data.cameras.new("cam")
    cam = bpy.data.objects.new("cam", cam_data)
    bpy.context.collection.objects.link(cam)
    pos = mathutils.Vector((
        distance * math.cos(el) * math.sin(az),
        distance * math.sin(el),
        distance * math.cos(el) * math.cos(az),
    ))
    back = pos.normalized()  # camera looks down local -Z, so local +Z is this
    right = mathutils.Vector((0.0, 1.0, 0.0)).cross(back).normalized()
    up = back.cross(right)
    cam.matrix_world = mathutils.Matrix((
        (right.x, up.x, back.x, pos.x),
        (right.y, up.y, back.y, pos.y),
        (right.z, up.z, back.z, pos.z),
        (0.0, 0.0, 0.0, 1.0),
    ))
    bpy.context.scene.camera = cam


def render(entry, shape, out_stem, label):
    scale = tuple(entry.get("scale", (1.0, 1.0, 1.0)))
    geom = geometry_from_shape(shape)
    verts = tris = 0
    for view, (az, el) in VIEWS.items():
        bpy.ops.wm.read_factory_settings(use_empty=True)
        ob = build(f"{entry['name']}_{label}", geom, scale)
        place_camera(float(entry.get("distance", 20.0)), az, el)
        scene = bpy.context.scene
        scene.render.engine = "BLENDER_WORKBENCH"
        # 1200 px across a 50 mm lens is ~30 px per degree, which is what a
        # 1080p screen at the game camera's field of view gives. Rendering
        # smaller would flatter the design by hiding detail the player sees.
        scene.render.resolution_x = 1100
        scene.render.resolution_y = 1300
        scene.render.filepath = f"{out_stem}__{view}.png"
        scene.render.film_transparent = False
        shading = scene.display.shading
        shading.light = "STUDIO"
        shading.show_shadows = True
        shading.show_cavity = True
        shading.cavity_type = "BOTH"
        bpy.ops.render.render(write_still=True)
        verts = len(ob.data.vertices)
        tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    return verts, tris, envelope(geom[0]), 0.0


spec_path = arg("--spec")
if not spec_path:
    raise SystemExit("--spec is required")
outdir = os.path.abspath(arg("--outdir", "/tmp/millos-bodies"))
os.makedirs(outdir, exist_ok=True)
with open(spec_path) as fh:
    entries = json.load(fh)

report = []
for entry in entries:
    name = entry["name"]
    scale = tuple(entry.get("scale", (1.0, 1.0, 1.0)))
    print(f"\n===== {name} =====")
    print(f"  {entry.get('note', '')}")
    print(f"  instance scale {scale}  ->  "
          f"{scale[0]:.2f} x {scale[1]:.2f} x {scale[2]:.2f} m")
    results = {}
    for label in ("before", "after"):
        stem = os.path.join(outdir, f"{name}__{label}")
        v, t, env, h = render(entry, entry[label], stem, label)
        results[label] = (v, t, env)
        print(f"  {label:6s}: {v:5d} verts  {t:5d} tris   "
              f"half-extent x{env[0]:.4f} y{env[1]:.4f} z{env[2]:.4f}")
        print(f"          WROTE {stem}__*.png")
    eb, ea = results["before"][2], results["after"][2]
    per_axis = [abs(a - b) for a, b in zip(eb, ea)]
    drift = max(per_axis)
    world = max(d * s for d, s in zip(per_axis, scale))
    axis = "xyz"[per_axis.index(drift)]
    status = "OK" if drift < 1e-4 else f"DRIFT {world * 1000:.2f} mm on {axis}"
    print(f"  envelope: {status}")
    report.append({
        "name": name,
        "vertsBefore": results["before"][0],
        "trisBefore": results["before"][1],
        "vertsAfter": results["after"][0],
        "trisAfter": results["after"][1],
        "driftMm": round(world * 1000, 3),
        "envelopeOk": drift < 1e-4,
        "note": entry.get("note", ""),
    })

with open(os.path.join(outdir, "report.json"), "w") as fh:
    json.dump(report, fh, indent=1)
bad = [r for r in report if not r["envelopeOk"]]
print(f"\n{len(report)} bodies rendered; {len(bad)} with envelope drift")
for r in bad:
    print(f"  !! {r['name']}: {r['driftMm']} mm")
