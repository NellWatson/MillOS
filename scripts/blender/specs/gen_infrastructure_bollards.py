"""Author the dock safety bollards in WORLD metres, emit spec JSON + TS numbers.

Both bollards are lathe profiles, but they live in different coordinate systems:

  portal_bollard  (OptimizedFactoryInfrastructure.tsx, PortalFrames)
      UNIT geometry drawn through an InstancedMesh at scale [0.24, 1.3, 0.24].
      The scale is strongly anisotropic - 5.4:1 - so a cap that is hemispherical
      in unit space renders as a vertical spike. The profile therefore has to be
      designed in metres and divided down, never drawn by eye in unit space.

  dock_bollard    (OpenDockOpening.tsx)
      Authored at world scale already, drawn at scale 1. Local y is world y
      minus 0.5 because the mesh sits at position [0, 0.5, 0].

Rounding is done here, once, and asserted: max radius and both y endpoints must
survive it EXACTLY, because those three numbers are the envelope the harness
checks and the call sites depend on.
"""

import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def dome(base_radius, y_from, y_to, steps=4):
    """Quarter-ellipse cap: r = R cos t, y = y0 + h sin t, excluding t = 0.

    A bollard cap is a pressed dome, not a cone and not a flat plate. It is the
    single feature that separates a bollard silhouette from a length of pipe,
    so it gets real curvature rather than one chamfer.
    """
    height = y_to - y_from
    return [
        (base_radius * math.cos(t), y_from + height * math.sin(t))
        for t in (math.pi / 2 * i / steps for i in range(1, steps + 1))
    ]


def bollard_profile(*, rim, shaft, band, collar_top, cove, bands, neck, seat, cap_rim, total):
    """One design, two sizes. All arguments are METRES of finished bollard.

    Features, bottom to top:
      * grout collar - a short vertical wall at MAX RADIUS with a chamfered top.
        This is what a bollard set into a slab actually looks like, and it plants
        a hard horizontal line where the post meets the floor instead of letting
        the tube run into it.
      * a long, plain shaft, thinner than the collar. The step is the point, and
        so is the length: the plain run has to dominate or the post stops
        reading as a bollard and starts reading as a hydrant.
      * reflective band(s) standing PROUD of the shaft with chamfered lead-ins.
        A painted stripe would need a texture the shared safety-yellow material
        does not have; a proud band survives on the SILHOUETTE, which is how
        this is read from a passing forklift.
      * a short neck, a seat lip where the cap slips over the tube, and a
        SHALLOW pressed dome. A near-hemispherical cap merges with the shaft
        into a bullet nose; the seat lip is what keeps the cap a separate part.
    """
    profile = [
        (0.0, 0.0),  # underside cap centre - keeps the mesh watertight
        (rim, 0.0),  # collar rim: MAX RADIUS
        (rim, collar_top),  # collar wall, vertical
        (rim - (rim - shaft) * 0.4, collar_top + cove * 0.42),  # collar chamfer
        (shaft, collar_top + cove),  # cove into the shaft
    ]
    for low, high in bands:
        lead = (band - shaft) * 0.55
        # Lead-in heights are a FRACTION of the post, not a fixed distance, so
        # the 1.0 m and 1.3 m bollards keep the same chamfer proportions and
        # read as two sizes of one product rather than two designs.
        profile += [
            (shaft, low - 0.017 * total),
            (shaft + lead, low - 0.008 * total),
            (band, low),
            (band, high),
            (shaft + lead, high + 0.008 * total),
            (shaft, high + 0.017 * total),
        ]
    profile += [
        (shaft, neck),  # neck below the cap
        (cap_rim, seat),  # seat lip - the cap overhangs the tube slightly
    ]
    profile += dome(cap_rim, seat, total)
    return profile


PORTAL = dict(
    rim=0.240,
    shaft=0.196,
    band=0.226,
    collar_top=0.055,
    cove=0.060,
    neck=1.196,
    seat=1.213,
    cap_rim=0.206,
    total=1.300,
)

# --- portal_bollard: 0.48 m across, 1.30 m tall -----------------------------
# One band high on the post vs two spread down it - rendered side by side
# because the choice is a legibility question, not a taste one.
PORTAL_ONE_W = bollard_profile(bands=[(0.868, 0.958)], **PORTAL)
PORTAL_TWO_W = bollard_profile(bands=[(0.560, 0.640), (0.938, 1.018)], **PORTAL)

# --- dock_bollard: 0.40 m across, 1.00 m tall -------------------------------
DOCK = dict(
    rim=0.200,
    shaft=0.164,
    band=0.188,
    collar_top=0.042,
    cove=0.046,
    neck=0.920,
    seat=0.933,
    cap_rim=0.172,
    total=1.000,
)
DOCK_ONE_W = bollard_profile(bands=[(0.668, 0.737)], **DOCK)
DOCK_TWO_W = bollard_profile(bands=[(0.431, 0.492), (0.722, 0.783)], **DOCK)


def to_local(profile_world, radius_scale, height, y_offset):
    """Divide the world design down into the space the geometry is authored in.

    `y_offset` is where world y = 0 lands: -0.5 for a unit instanced geometry,
    and -0.5 again for the dock bollard, whose mesh is lifted by half its height
    at the call site.
    """
    out = []
    for r, y in profile_world:
        out.append((round(r / radius_scale, 5), round(y / height + y_offset, 5)))
    return out


def check(profile, max_radius, y_min, y_max, name):
    rs = [p[0] for p in profile]
    ys = [p[1] for p in profile]
    assert max(rs) == max_radius, f"{name}: max r {max(rs)} != {max_radius}"
    assert min(ys) == y_min and max(ys) == y_max, f"{name}: y [{min(ys)}, {max(ys)}]"
    for a, b in zip(profile, profile[1:]):
        # Monotonic in y (the base cap is the one deliberately flat run), and no
        # pair close enough for the preview's remove_doubles(dist=1e-6) to weld -
        # a welded pair would show a smooth join Blender-side that three.js never
        # renders.
        assert b[1] >= a[1], f"{name}: profile doubles back at {a} {b}"
        assert math.dist(a, b) > 1e-3, f"{name}: weldable pair {a} {b}"
    return profile


PORTAL_SEGMENTS = 20
DOCK_SEGMENTS = 16

# name -> (local profile, instance scale, radial segments, before, note)
VARIANTS = {
    "portal_bollard_1band": (
        check(to_local(PORTAL_ONE_W, 0.24, 1.3, -0.5), 1.0, -0.5, 0.5, "portal1"),
        [0.24, 1.3, 0.24],
        PORTAL_SEGMENTS,
        {"kind": "cylinder", "args": [1, 1, 1, 16]},
        "PortalFrames dock bollard - 0.48 m across, 1.30 m tall",
    ),
    "portal_bollard_2band": (
        check(to_local(PORTAL_TWO_W, 0.24, 1.3, -0.5), 1.0, -0.5, 0.5, "portal2"),
        [0.24, 1.3, 0.24],
        PORTAL_SEGMENTS,
        {"kind": "cylinder", "args": [1, 1, 1, 16]},
        "PortalFrames dock bollard - 0.48 m across, 1.30 m tall",
    ),
    "dock_bollard_1band": (
        check(to_local(DOCK_ONE_W, 1.0, 1.0, -0.5), 0.2, -0.5, 0.5, "dock1"),
        [1, 1, 1],
        DOCK_SEGMENTS,
        {"kind": "cylinder", "args": [0.2, 0.2, 1, 16]},
        "OpenDockOpening bollard - 0.40 m across, 1.00 m tall",
    ),
    "dock_bollard_2band": (
        check(to_local(DOCK_TWO_W, 1.0, 1.0, -0.5), 0.2, -0.5, 0.5, "dock2"),
        [1, 1, 1],
        DOCK_SEGMENTS,
        {"kind": "cylinder", "args": [0.2, 0.2, 1, 16]},
        "OpenDockOpening bollard - 0.40 m across, 1.00 m tall",
    ),
}

# Which variants to render this round, and at what range. `build` is close
# enough to see whether the profile is actually built the way it was drawn;
# `read` is the range a forklift driver passes at, which is what decides
# whether a feature earns its vertices.
ROUNDS = [("build", 3.4), ("read", 9.0)]
RENDER = ["portal_bollard_1band", "dock_bollard_1band"]

spec = []
for name in RENDER:
    profile, scale, segments, before, note = VARIANTS[name]
    for label, distance in ROUNDS:
        spec.append(
            {
                "name": f"{name}_{label}",
                "before": before,
                "after": {
                    "kind": "profile",
                    "segments": segments,
                    "points": [list(p) for p in profile],
                },
                "scale": scale,
                "distance": distance,
                "note": note,
            }
        )

out = os.path.join(HERE, "infrastructure-bollards.json")
with open(out, "w") as fh:
    json.dump(spec, fh, indent=1)
print(f"wrote {out}")

for name in RENDER:
    profile, _, segments, _, _ = VARIANTS[name]
    print(f"\n// ---- {name}: {len(profile)} points x {segments} segments"
          f" = {len(profile) * (segments + 1)} verts ----")
    for r, y in profile:
        print(f"    new THREE.Vector2({r}, {y}),")
