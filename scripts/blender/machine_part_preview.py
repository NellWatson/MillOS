"""Design and preview MillOS machine part geometry, current vs proposed.

MillOS machines are procedural instanced geometry in TypeScript
(src/components/machines/CompactMachines.tsx), not GLBs. This script is the
design/verification tool for that geometry: it rebuilds a part exactly as
three.js would, next to a proposed replacement, at the part's real in-scene
instance scale, and renders both at a realistic viewing distance so the change
can be judged before any app edit.

It also enforces the rule that makes these swaps safe: a replacement must keep
the *exact* unit envelope of the geometry it replaces. Every part here is
instanced with a hand-tuned non-uniform scale and sits against neighbouring
parts (the silo stiffener rings at radius 1.03, the roof eave overhanging the
shell). If a proposal changes max radius or the y range, those relationships
drift and the fix becomes a new bug.

Run:
  Blender --background --python scripts/blender/machine_part_preview.py -- \
      --part silo_roof --out /tmp/silo_roof.png
  ... --part all --outdir /tmp/millos-parts
"""

import bpy
import bmesh
import math
import os
import sys

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


# ---------------------------------------------------------------------------
# three.js geometry, rebuilt exactly.
#
# three.js places radial vertices ON the circle (an inscribed polygon), so a
# low segment count loses radius at the facet midpoints. That is precisely the
# artefact being judged here, so the rebuild has to match it rather than
# approximate it with a Blender primitive.
# ---------------------------------------------------------------------------

def lathe(profile, segments):
    """Surface of revolution over [(radius, y), ...] - matches THREE.LatheGeometry."""
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
    return verts, faces


def cylinder_profile(radius_top, radius_bottom, height):
    """THREE.CylinderGeometry(rt, rb, h, seg) as a lathe profile, caps included."""
    half = height / 2
    return [
        (0.0, -half),
        (radius_bottom, -half),
        (radius_top, half),
        (0.0, half),
    ]


def cone_profile(radius, height):
    """THREE.ConeGeometry(r, h, seg) == CylinderGeometry(0, r, h, seg)."""
    return cylinder_profile(0.0, radius, height)


def sphere_profile(radius, height_segments):
    """THREE.SphereGeometry(r, widthSegments, heightSegments) as a lathe profile.

    three.js sweeps phi from the +Y pole to the -Y pole, so heightSegments sets
    the profile resolution and widthSegments becomes the lathe's segment count.
    """
    return [
        (
            radius * math.sin(math.pi * i / height_segments),
            radius * math.cos(math.pi * i / height_segments),
        )
        for i in range(height_segments + 1)
    ]


def torus(radius, tube, radial_segments, tubular_segments):
    """THREE.TorusGeometry(r, tube, radialSegments, tubularSegments).

    In three.js `radialSegments` subdivides the TUBE cross-section and
    `tubularSegments` goes around the ring - the opposite of the intuitive
    reading, and the reason a value of 6 produces a hexagonal tube.

    Orientation matters as much as topology here: three.js lays the RING in the
    XY plane with the tube running along Z. The fan grille is instanced at
    scale [0.78, 0.52, 0.09], so that Z is the axis squashed flat against the
    mill body. Building the ring in XZ instead (the natural choice for the
    lathe parts above) would apply that 0.09 to the wrong axis and preview a
    part the runtime never draws.
    """
    verts, faces = [], []
    for j in range(tubular_segments):
        v = 2 * math.pi * j / tubular_segments
        for i in range(radial_segments):
            u = 2 * math.pi * i / radial_segments
            verts.append((
                (radius + tube * math.cos(u)) * math.cos(v),
                (radius + tube * math.cos(u)) * math.sin(v),
                tube * math.sin(u),
            ))
    for j in range(tubular_segments):
        j2 = (j + 1) % tubular_segments
        for i in range(radial_segments):
            i2 = (i + 1) % radial_segments
            faces.append((
                j * radial_segments + i,
                j * radial_segments + i2,
                j2 * radial_segments + i2,
                j2 * radial_segments + i,
            ))
    return verts, faces


def ribbed_surface(profile, segments, ribs, rib_depth, y_from, y_to):
    """Lathe whose radius is also modulated by angle, giving radial seams.

    A grain-bin roof is built from overlapping radial panels, so the seams run
    up the slope rather than around it. LatheGeometry cannot express that -
    this needs a parametric surface, which in TS means a hand-built
    BufferGeometry. Modulation is faded out at the profile ends so the eave rim
    and the peak collar stay exactly circular and keep the envelope.
    """
    verts, faces = [], []
    n = len(profile)
    for s in range(segments):
        a = 2 * math.pi * s / segments
        rib = (1 - math.cos(ribs * a)) / 2  # 0..1, `ribs` lobes around
        ca, sa = math.cos(a), math.sin(a)
        for (r, y) in profile:
            span = (y - y_from) / (y_to - y_from) if y_to != y_from else 0.0
            span = min(max(span, 0.0), 1.0)
            fade = math.sin(math.pi * span)  # 0 at both ends, 1 mid-slope
            rr = max(r - rib_depth * rib * fade, 0.0)
            verts.append((rr * ca, y, rr * sa))
    for s in range(segments):
        s2 = (s + 1) % segments
        for p in range(n - 1):
            faces.append((s * n + p, s * n + p + 1, s2 * n + p + 1, s2 * n + p))
    return verts, faces


# ---------------------------------------------------------------------------
# Parts. Each entry mirrors a constant in CompactMachines.tsx, with the real
# instance scale it is drawn at so the preview is at true proportions.
# ---------------------------------------------------------------------------

def silo_roof_proposed():
    """Eave drip lip + straight slope + peak collar, at the shell's 32 segments.

    The current roof is ConeGeometry(1, 1, 16): a bare 16-sided spike sitting on
    a 32-sided corrugated shell. A real bin roof has a rolled eave, a shallower
    pitch, and a fill collar at the peak. All three read at distance where a
    smooth cone reads as a party hat.
    """
    return [
        (0.00, -0.50),   # cap centre
        (1.00, -0.50),   # eave outer rim - envelope max radius, unchanged
        (0.985, -0.425),  # rolled drip lip
        (0.115, 0.330),  # slope up to the collar
        (0.105, 0.395),  # collar shoulder
        (0.105, 0.500),  # collar top - envelope max y, unchanged
        (0.00, 0.50),
    ]


PARTS = {
    # name: (current builder, proposed builder, instance scale, camera distance)
    "silo_roof": {
        "current": lambda: lathe(cone_profile(1.0, 1.0), 16),
        "proposed": lambda: lathe(silo_roof_proposed(), 32),
        "ribbed": lambda: ribbed_surface(
            silo_roof_proposed(), 64, ribs=16, rib_depth=0.02,
            y_from=-0.425, y_to=0.330,
        ),
        "scale": (2.35, 1.65, 2.35),
        "distance": 26.0,
        "note": "ConeGeometry(1,1,16) on a 32-seg shell, 4.7 m across",
    },
    "silo_outlet": {
        "current": lambda: lathe(cylinder_profile(0.42, 1.0, 1.0), 12),
        "proposed": lambda: lathe(cylinder_profile(0.42, 1.0, 1.0), 24),
        "scale": (2.05, 2.4, 2.05),
        "distance": 22.0,
        "note": "CylinderGeometry(0.42,1,1,12), 4.1 m across",
    },
    "mill_hopper": {
        "current": lambda: lathe(cylinder_profile(0.45, 1.0, 1.0), 8),
        "proposed": lambda: lathe(cylinder_profile(0.45, 1.0, 1.0), 24),
        "scale": (1.85, 1.62, 1.85),
        "distance": 16.0,
        "note": "CylinderGeometry(0.45,1,1,8) - an octagon 3.7 m across",
    },
    "roller": {
        "current": lambda: lathe(cylinder_profile(1.0, 1.0, 1.0), 12),
        "proposed": lambda: lathe(cylinder_profile(1.0, 1.0, 1.0), 20),
        "scale": (0.42, 3.4, 0.42),
        "distance": 12.0,
        "note": "CylinderGeometry(1,1,1,12), mill rollers and motor drums",
    },
    "sifter_inlet": {
        "current": lambda: lathe(cylinder_profile(1.0, 1.0, 1.0), 12),
        "proposed": lambda: lathe(cylinder_profile(1.0, 1.0, 1.0), 20),
        "scale": (0.72, 1.3, 0.72),
        "distance": 10.0,
        "note": "CylinderGeometry(1,1,1,12), 1.44 m across",
    },
    "fan_grille": {
        # Scaled [0.78, 0.52, 0.09]: an ellipse pressed flat on the mill body,
        # so the RING outline is what the eye reads and the squashed tube is
        # nearly invisible. Spend the segments on tubularSegments accordingly.
        "current": lambda: torus(1.0, 0.1, 6, 16),
        "proposed": lambda: torus(1.0, 0.1, 8, 32),
        "scale": (0.78, 0.52, 0.09),
        "distance": 3.2,
        "note": "TorusGeometry(1,0.1,6,16) - 16-sided ring outline",
    },
    "beacon": {
        # Emissive status light on every machine - small, but it is the part a
        # user's eye is deliberately drawn to, and it is read against a colour
        # that changes with machine state.
        "current": lambda: lathe(sphere_profile(1.0, 6), 8),
        "proposed": lambda: lathe(sphere_profile(1.0, 8), 12),
        "scale": (0.22, 0.22, 0.22),
        "distance": 2.2,
        "note": "SphereGeometry(1,8,6), 0.44 m status beacon",
    },
    "silo_ring": {
        "current": lambda: lathe(cylinder_profile(1.03, 1.03, 0.08), 16),
        "proposed": lambda: lathe(cylinder_profile(1.03, 1.03, 0.08), 32),
        "scale": (2.25, 12.5, 2.25),
        "distance": 20.0,
        "note": "16-sided stiffener ring on a 32-sided shell",
    },
    # ---- Exterior scenery -------------------------------------------------
    # Unlike the machine parts these are authored at world scale in the
    # component (FarmArea.tsx, GasStationInstanced.tsx) rather than as unit
    # geometry, so radius and height are already metres and only the segment
    # count is in question. The open question for these is not cost but style:
    # the site is deliberately stylized, so a faceted tree may be intent rather
    # than a defect. Render before deciding.
    "windmill_tower": {
        "current": lambda: lathe(cylinder_profile(0.8, 1.2, 6.0), 8),
        "proposed": lambda: lathe(cylinder_profile(0.8, 1.2, 6.0), 20),
        "scale": (1.0, 1.0, 1.0),
        "distance": 17.0,
        "note": "FarmArea windmillTower - 2.4 m across, 6 m tall, 8-sided",
    },
    "farm_tree_foliage": {
        "current": lambda: lathe(cone_profile(2.5, 6.0), 6),
        "proposed": lambda: lathe(cone_profile(2.5, 6.0), 16),
        "scale": (1.0, 1.0, 1.0),
        "distance": 20.0,
        "note": "FarmArea treeFoliage - a 5 m hexagonal pyramid",
    },
    "pipe_support": {
        # SpoutingSystem.tsx, instanced at [0.1, height, 0.1] with height 10-12:
        # 0.2 m columns running the full height of the interior.
        "current": lambda: lathe(cylinder_profile(1.0, 1.0, 1.0), 8),
        "proposed": lambda: lathe(cylinder_profile(1.0, 1.0, 1.0), 12),
        "scale": (0.1, 11.0, 0.1),
        "distance": 13.0,
        "note": "SpoutingSystem PIPE_SUPPORT - 0.2 m column, 11 m tall",
    },
    "gas_canopy_column": {
        "current": lambda: lathe(cylinder_profile(0.25, 0.25, 5.0), 8),
        "proposed": lambda: lathe(cylinder_profile(0.25, 0.25, 5.0), 16),
        "scale": (1.0, 1.0, 1.0),
        "distance": 11.0,
        "note": "GasStation canopyColumn - 0.5 m across, 5 m tall",
    },
}


def build(name, verts, faces, scale, offset_x):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.validate()
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bm.to_mesh(me)
    bm.free()
    for poly in me.polygons:
        poly.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    ob.scale = scale
    ob.location = (offset_x, 0, 0)
    return ob


def envelope(verts):
    """Axis-aligned half-extents in unit space.

    Reported per axis rather than as a radius + y range: the lathe parts are
    surfaces of revolution but the torus is not built on the same axis, and a
    radial measure would silently compare different things. The instance
    matrix scales each axis independently, so per-axis extent is what actually
    has to hold.
    """
    return tuple(max(abs(v[i]) for v in verts) for i in range(3))


def render_part(part_name, out_path, only=None):
    """Render a part's variants side by side, or a single variant if `only`.

    The single-variant mode exists so before/after frames can be composited
    outside Blender (a comparison page, a slider) rather than being baked into
    one image. Framing is held constant across variants so the two frames are
    actually comparable.
    """
    spec = PARTS[part_name]
    bpy.ops.wm.read_factory_settings(use_empty=True)

    variants = [k for k in ("current", "proposed", "ribbed") if k in spec]
    if only:
        if only not in variants:
            raise SystemExit(f"{part_name} has no variant {only!r} (has {variants})")
        variants = [only]
    scale = spec["scale"]

    print(f"\n===== {part_name} =====")
    print(f"  {spec['note']}")
    print(f"  instance scale {scale}")

    geoms = [(key, spec[key]()) for key in variants]
    # Lay the variants out from their real world width so parts with an extreme
    # non-uniform scale (the grille, the stiffener ring) still sit side by side.
    width = max(envelope(v)[0] * scale[0] for _, (v, _) in geoms) * 2.8

    base_env = None
    for i, (key, (verts, faces)) in enumerate(geoms):
        x = (i - (len(geoms) - 1) / 2) * width
        ob = build(f"{part_name}_{key}", verts, faces, scale, x)
        env = envelope(verts)
        tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
        print(
            f"  {key:9s}: {len(ob.data.vertices):5d} verts  {tris:5d} tris"
            f"   half-extent x{env[0]:.4f} y{env[1]:.4f} z{env[2]:.4f}"
        )
        if base_env is None:
            base_env = env
        else:
            # Drift is reported per axis and scaled by THAT axis. Using the
            # largest scale component would badly misreport a part like the
            # grille, whose only drift is on the axis squashed to 0.09.
            per_axis = [abs(a - b) for a, b in zip(base_env, env)]
            drift = max(per_axis)
            world = max(d * s for d, s in zip(per_axis, scale))
            axis = "xyz"[per_axis.index(drift)]
            status = (
                "OK" if drift < 1e-4
                else f"DRIFT {drift:.5f} unit on {axis} ({world * 1000:.1f} mm in world)"
            )
            print(f"             envelope vs current: {status}")

    # Built Y-up to match three.js, so an unrotated Blender camera frames it.
    cam_data = bpy.data.cameras.new("cam")
    cam = bpy.data.objects.new("cam", cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = (0.0, 0.0, spec["distance"])
    cam.rotation_euler = (0.0, 0.0, 0.0)
    bpy.context.scene.camera = cam

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = 420 * len(variants)
    scene.render.resolution_y = 620
    scene.render.filepath = out_path
    # Transparent film: single-variant frames get composited onto a page that
    # may be light or dark, and a baked-in white card would only suit one.
    scene.render.film_transparent = bool(only)
    shading = scene.display.shading
    shading.light = "STUDIO"
    shading.show_shadows = True
    shading.show_cavity = True      # makes faceting legible
    shading.cavity_type = "BOTH"
    bpy.ops.render.render(write_still=True)
    print(f"  WROTE {out_path}   [{' | '.join(variants)}]")


def geometry_from_shape(shape):
    """Build a geometry from a spec entry that may be a DESIGNED shape.

    The constructor kinds below can only ever express "the same primitive with a
    different segment count". That is a facet-density change, not a design, and a
    sweep restricted to it will only ever produce segment bumps. These kinds are
    what let a spec describe an actual silhouette:

      {"kind": "profile",  "points": [[r, y], ...], "segments": 32}
      {"kind": "ribbed",   "points": [...], "segments": 64,
       "ribs": 16, "ribDepth": 0.02, "yFrom": -0.4, "yTo": 0.3}
      {"kind": "prism",    "points": [...], "sides": 8, "twist": 0.0}

    `points` is in the same (radius, height) form THREE.LatheGeometry takes, so a
    profile designed and previewed here transcribes directly into TypeScript.
    """
    kind = shape["kind"].lower()
    if kind == "profile":
        pts = [(float(p[0]), float(p[1])) for p in shape["points"]]
        return lathe(pts, int(shape.get("segments", 32)))
    if kind == "ribbed":
        pts = [(float(p[0]), float(p[1])) for p in shape["points"]]
        ys = [p[1] for p in pts]
        return ribbed_surface(
            pts,
            int(shape.get("segments", 64)),
            ribs=int(shape.get("ribs", 12)),
            rib_depth=float(shape.get("ribDepth", 0.02)),
            y_from=float(shape.get("yFrom", min(ys))),
            y_to=float(shape.get("yTo", max(ys))),
        )
    if kind == "prism":
        # A lathe at a low segment count, offered explicitly so that "this should
        # read as faceted" is a design decision in the spec rather than an
        # accident of a number nobody revisited.
        pts = [(float(p[0]), float(p[1])) for p in shape["points"]]
        return lathe(pts, int(shape.get("sides", 6)))
    return geometry_from_kind(kind, shape["args"])


def geometry_from_kind(kind, args):
    """Build a three.js geometry from its constructor name and argument list.

    Lets a sweep feed arbitrary before/after pairs in as JSON instead of every
    part needing a hand-written entry in PARTS. The argument order is three.js's,
    not Blender's, so a spec can be transcribed straight off the constructor call
    in the source.
    """
    kind = kind.lower()
    if kind == "cylinder":  # (radiusTop, radiusBottom, height, radialSegments)
        rt, rb, h, seg = args[0], args[1], args[2], int(args[3])
        return lathe(cylinder_profile(rt, rb, h), seg)
    if kind == "cone":  # (radius, height, radialSegments)
        r, h, seg = args[0], args[1], int(args[2])
        return lathe(cone_profile(r, h), seg)
    if kind == "sphere":  # (radius, widthSegments, heightSegments)
        r, wseg, hseg = args[0], int(args[1]), int(args[2])
        return lathe(sphere_profile(r, hseg), wseg)
    if kind == "torus":  # (radius, tube, radialSegments, tubularSegments)
        return torus(args[0], args[1], int(args[2]), int(args[3]))
    if kind == "circle":  # (radius, segments)
        # Built in XY to match three.js. Going through `lathe` would revolve it
        # around Y into a HORIZONTAL disc, which the camera then sees edge-on -
        # a zero-thickness surface that renders as an empty frame.
        r, seg = args[0], int(args[1])
        verts = [(0.0, 0.0, 0.0)]
        for i in range(seg):
            a = 2 * math.pi * i / seg
            verts.append((r * math.cos(a), r * math.sin(a), 0.0))
        faces = [(0, i + 1, (i + 1) % seg + 1) for i in range(seg)]
        return verts, faces
    if kind in ("box", "roundedbox"):
        # RoundedBoxGeometry(width, height, depth, segments, radius) from
        # three/examples. Built as a box and bevelled in bmesh: the fillet is the
        # whole point of comparing one to a designed lathe, so a plain cuboid
        # would flatter the "before" by removing the softness it actually has.
        w, h, d = args[0], args[1], args[2]
        radius = args[4] if len(args) > 4 else 0.0
        segs = int(args[3]) if len(args) > 3 else 1
        hw, hh, hd = w / 2, h / 2, d / 2
        verts = [
            (-hw, -hh, -hd), (hw, -hh, -hd), (hw, hh, -hd), (-hw, hh, -hd),
            (-hw, -hh, hd), (hw, -hh, hd), (hw, hh, hd), (-hw, hh, hd),
        ]
        faces = [
            (0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
            (2, 3, 7, 6), (1, 2, 6, 5), (0, 4, 7, 3),
        ]
        if radius <= 0:
            return verts, faces
        me = bpy.data.meshes.new("_rb")
        me.from_pydata(verts, [], faces)
        me.validate()
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.bevel(
            bm,
            geom=list(bm.verts) + list(bm.edges),
            offset=min(radius, hw * 0.99, hh * 0.99, hd * 0.99),
            segments=max(1, segs),
            profile=0.5,
            affect="EDGES",
        )
        out_v = [tuple(v.co) for v in bm.verts]
        out_f = [tuple(v.index for v in f.verts) for f in bm.faces]
        bm.free()
        bpy.data.meshes.remove(me)
        return out_v, out_f
    if kind == "ring":  # (innerRadius, outerRadius, thetaSegments)
        # three.js lays a ring flat in XY. Built here as a flat annulus rather
        # than through `lathe`, which revolves around Y and would stand it up.
        inner, outer, seg = args[0], args[1], int(args[2])
        verts, faces = [], []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            ca, sa = math.cos(a), math.sin(a)
            verts.append((inner * ca, inner * sa, 0.0))
            verts.append((outer * ca, outer * sa, 0.0))
        for i in range(seg):
            j = (i + 1) % seg
            faces.append((i * 2, i * 2 + 1, j * 2 + 1, j * 2))
        return verts, faces
    if kind == "capsule":  # (radius, length, capSegments, radialSegments)
        r, length, cap, seg = args[0], args[1], int(args[2]), int(args[3])
        half = length / 2
        prof = [(0.0, -half - r)]
        for i in range(cap + 1):  # bottom hemisphere
            a = math.pi / 2 * i / cap
            prof.append((r * math.sin(a), -half - r * math.cos(a)))
        for i in range(cap + 1):  # top hemisphere
            a = math.pi / 2 * i / cap
            prof.append((r * math.cos(a), half + r * math.sin(a)))
        prof.append((0.0, half + r))
        return lathe(prof, seg)
    raise SystemExit(f"unsupported geometry kind {kind!r}")


spec_path = arg("--spec")
if spec_path:
    import json

    with open(spec_path) as fh:
        spec_list = json.load(fh)
    outdir = os.path.abspath(arg("--outdir", "/tmp/millos-sweep"))
    os.makedirs(outdir, exist_ok=True)
    report = []
    for entry in spec_list:
        name = entry["name"]
        scale = tuple(entry.get("scale", (1.0, 1.0, 1.0)))

        # A spec entry's before/after may be a bare argument list (with a
        # top-level "kind"), or a full shape object that can describe a designed
        # profile. Both forms are accepted so existing specs keep working.
        def as_shape(value, e=entry):
            if isinstance(value, dict):
                return value
            return {"kind": e["kind"], "args": value}

        before_shape, after_shape = as_shape(entry["before"]), as_shape(entry["after"])

        # Each variant renders in its own scene, so the side-by-side path's
        # automatic drift check never fires here. Compute it explicitly - it is
        # the single most important safety property of any geometry swap.
        before_v, _ = geometry_from_shape(before_shape)
        after_v, _ = geometry_from_shape(after_shape)
        eb, ea = envelope(before_v), envelope(after_v)
        per_axis = [abs(a - b) for a, b in zip(eb, ea)]
        drift = max(per_axis)
        world_drift = max(d * s for d, s in zip(per_axis, scale))
        axis = "xyz"[per_axis.index(drift)]
        entry_report = {
            "name": name,
            "kind": f"{before_shape['kind']} -> {after_shape['kind']}",
            "before": entry["before"],
            "after": entry["after"],
            "scale": list(scale),
            "vertsBefore": len(before_v),
            "vertsAfter": len(after_v),
            "envelopeBefore": [round(v, 5) for v in eb],
            "envelopeAfter": [round(v, 5) for v in ea],
            "driftUnit": round(drift, 5),
            "driftMm": round(world_drift * 1000, 2),
            "driftAxis": axis if drift >= 1e-4 else None,
            "envelopeOk": drift < 1e-4,
            "note": entry.get("note", ""),
        }
        report.append(entry_report)
        status = "OK" if entry_report["envelopeOk"] else f"DRIFT {world_drift * 1000:.2f} mm on {axis}"
        print(f"  SPEC {name:34s} verts {len(before_v):4d} -> {len(after_v):4d}   envelope {status}")

        PARTS[name] = {
            "current": (lambda e=entry, f=as_shape: geometry_from_shape(f(e["before"], e))),
            "proposed": (lambda e=entry, f=as_shape: geometry_from_shape(f(e["after"], e))),
            "scale": scale,
            "distance": float(entry.get("distance", 12.0)),
            "note": entry.get("note", ""),
        }
        for variant in ("current", "proposed"):
            render_part(name, os.path.join(outdir, f"{name}__{variant}.png"), only=variant)

    with open(os.path.join(outdir, "report.json"), "w") as fh:
        json.dump(report, fh, indent=1)
    bad = [r for r in report if not r["envelopeOk"]]
    print(f"\n{len(report)} parts rendered; {len(bad)} with envelope drift")
    for r in bad:
        print(f"  !! {r['name']}: {r['driftMm']} mm on {r['driftAxis']}")
    raise SystemExit(0)

part = arg("--part", "all")
if part == "all":
    outdir = os.path.abspath(arg("--outdir", "/tmp/millos-parts"))
    os.makedirs(outdir, exist_ok=True)
    for name in PARTS:
        render_part(name, os.path.join(outdir, f"{name}.png"))
else:
    render_part(part, os.path.abspath(arg("--out", f"/tmp/{part}.png")), only=arg("--variant"))
