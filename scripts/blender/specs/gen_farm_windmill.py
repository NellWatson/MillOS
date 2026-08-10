"""Generate the farm-windmill design spec (and print the probe radii it must hit).

Hand-typing thirty (r, y) pairs into JSON is where transcription errors live, and
several of the numbers are load-bearing against parts this slice does NOT own -
the rotating blade arms, the door panel, the crow on the scarecrow's hat. So the
profiles are generated here, probed at exactly those heights, and dumped straight
to the spec the Blender harness reads. The same numbers are then transcribed into
TypeScript.

Run:  python3 scripts/blender/specs/gen_farm_windmill.py
"""

import json
import math
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "farm-windmill.json")


def r3(v):
    return round(v, 3)


# ---------------------------------------------------------------------------
# WINDMILL TOWER  -  replaces CylinderGeometry(0.8, 1.2, 6, 20)
# envelope: max radius 1.2, y in [-3, +3]   (drawn at y=3, scale 1.5)
# ---------------------------------------------------------------------------
R_BASE = 1.200      # envelope max radius, at the ground line
R_PLINTH = 1.170    # top of the base course, where the batter springs
Y_PLINTH = -2.880
R_CURB_WALL = 0.640  # wall radius where the batter tops out
Y_CURB = 2.400
# >1 => concave batter. Two rounds were rejected on the render before this:
# p=1.95 and p=1.40 both spend the taper in the bottom third, and the tower
# reads as a flared foot under a straight stovepipe joined by a collar. 1.18
# over a bigger radius delta keeps dr/dy nearly uniform (-0.118/u at the door,
# -0.073/u at the curb) so the wall reads as one continuous battered taper, and
# the narrower top turns the cap into an overhanging crown instead of a lid.
# The batter is not cosmetic: it is what holds r(world 2.5) = 0.901 clear of the
# blade arms, which the straight cone it replaces (1.033) does not.
BATTER_P = 1.18


def wall_r(y):
    """Battered (concave) masonry wall radius at profile height y."""
    if y <= -3.0:
        return R_BASE
    if y <= -2.930:                     # base course, near vertical
        t = (y + 3.0) / 0.070
        return R_BASE + (1.198 - R_BASE) * t
    if y <= Y_PLINTH:                   # chamfer off the base course
        t = (y + 2.930) / (Y_PLINTH + 2.930)
        return 1.198 + (R_PLINTH - 1.198) * t
    if y >= Y_CURB:
        return R_CURB_WALL
    t = (Y_CURB - y) / (Y_CURB - Y_PLINTH)
    return R_CURB_WALL + (R_PLINTH - R_CURB_WALL) * (t ** BATTER_P)


# Reefing gallery. A projecting corbelled ring with a parapet above it: the one
# horizontal break in the taper, and the feature that separates a windmill from
# a lighthouse. It is boxed in from both sides and the band is not negotiable:
# the door reaches world y 1.70 below it, and the blade arms sweep down to world
# y 2.499 above it, so the whole gallery has to live in world 1.86..2.36.
GAL_BOT = -1.140     # corbel springs from the wall (world 1.86)
GAL_DECK = -1.030    # deck edge - the gallery's max radius (world 1.97)
GAL_CAP_TOP = -0.938  # deck top, world 2.06 - blade tip passes at 2.499
GAL_TIE = -0.930     # deck top ties back onto the wall
R_GAL = 1.150        # deck edge
# A parapet ring above the deck was built and rejected on the render: shelf +
# ring reads as a pipe coupling, not a balcony. One corbelled shelf with a sharp
# flat top gives a single strong shadow line and carries further.

# Curb: the band the cap turns on, and the collar the windshaft emerges from.
CURB_BOT = 2.280
CURB_TOP = 2.720
R_CURB = 0.800

tower = [(0.000, -3.000)]                     # underside centre
for y in (-3.000, -2.930, Y_PLINTH):
    tower.append((wall_r(y), y))
# batter, sampled up to the gallery
n = 9
for i in range(1, n + 1):
    y = Y_PLINTH + (GAL_BOT - Y_PLINTH) * i / n
    tower.append((wall_r(y), y))
tower += [
    (1.036, -1.108),          # corbel springs off the wall
    (1.118, -1.066),
    (R_GAL, GAL_DECK),        # deck edge - gallery max radius
    (R_GAL, -0.986),          # deck fascia, vertical
    (1.128, -0.962),          # kerb chamfer
    (0.986, GAL_CAP_TOP),     # deck top - flat, the shadow line that reads
    (wall_r(GAL_TIE), GAL_TIE),
]
# batter resumes, up to the curb
n2 = 8
for i in range(1, n2 + 1):
    y = GAL_TIE + (CURB_BOT - GAL_TIE) * i / n2
    tower.append((wall_r(y), y))
tower += [
    (R_CURB, CURB_BOT + 0.036),   # curb band, corbelled out
    (R_CURB, CURB_TOP - 0.040),
    (0.728, CURB_TOP),            # chamfer back to the wall
    (R_CURB_WALL, CURB_TOP + 0.060),
    (R_CURB_WALL, 3.000),         # top, hidden under the cap
    (0.000, 3.000),
]

tower_before = [(0.0, -3.0), (1.2, -3.0), (0.8, 3.0), (0.0, 3.0)]

# ---------------------------------------------------------------------------
# WINDMILL CAP  -  replaces ConeGeometry(1, 1.5, 20)
# envelope: max radius 1.0, y in [-0.75, +0.75]  (drawn at y=6.5, scale 1.5)
# An ogee ("boat") cap: boarded fascia over the curb, a long concave flank that
# turns over into a convex swell, a neck, a finial ball and a spike.
# ---------------------------------------------------------------------------
cap = [
    (0.000, -0.750),   # underside centre - envelope min y
    (0.965, -0.750),   # underside, flat to just inside the rim
    (1.000, -0.744),   # eave rim - envelope max radius
    (0.986, -0.716),   # drip lip tucks in and up
    (0.948, -0.686),   # head of the boarded fascia
    (0.936, -0.610),   # skirt: the boarded flank runs near vertical
    (0.932, -0.480),
    (0.926, -0.350),
    (0.914, -0.232),
    (0.892, -0.128),   # knuckle - the ogee turns over here
    (0.852, -0.032),
    (0.788, 0.070),
    (0.700, 0.170),
    (0.596, 0.262),
    (0.478, 0.344),
    (0.352, 0.414),
    (0.238, 0.462),
    (0.140, 0.500),
    (0.080, 0.520),
    (0.058, 0.538),    # neck
    (0.052, 0.566),
    (0.136, 0.598),    # finial ball
    (0.158, 0.640),
    (0.134, 0.684),
    (0.080, 0.712),
    (0.040, 0.730),    # point
    (0.014, 0.750),    # envelope max y
    (0.000, 0.750),
]

cap_before = [(0.0, -0.75), (1.0, -0.75), (0.0, 0.75)]

# ---------------------------------------------------------------------------
# WINDMILL HUB  -  replaces CylinderGeometry(0.2, 0.2, 0.3, 12)
# envelope: max radius 0.2, axial half-length 0.15.
# Lathed about its own axis; the MESH is rotated so that axis lies along Z,
# because the blades turn about Z and the old hub was a vertical peg.
# +y here is the outboard (nose) end, i.e. +z once rotated.
# ---------------------------------------------------------------------------
hub = [
    (0.000, -0.150),   # inboard face centre - envelope min axial
    (0.120, -0.150),
    (0.150, -0.138),
    (0.170, -0.120),   # tail flange, buried in the tower curb
    (0.170, -0.094),
    (0.150, -0.080),
    (0.134, -0.030),   # waisted barrel
    (0.138, 0.014),
    (0.184, 0.042),    # sail-socket collar shoulder
    (0.200, 0.062),    # collar - envelope max radius
    (0.200, 0.116),    # collar band spans the blade-arm plane (local 0.075-0.125)
    (0.186, 0.126),
    (0.150, 0.136),    # nose cap
    (0.096, 0.146),
    (0.040, 0.150),
    (0.000, 0.150),    # nose centre - envelope max axial
]

hub_before = [(0.0, -0.15), (0.2, -0.15), (0.2, 0.15), (0.0, 0.15)]

# ---------------------------------------------------------------------------
# STRAW HAT  -  replaces ConeGeometry(0.6, 0.4, 8)
# envelope: max radius 0.6, y in [-0.2, +0.2]
# A brimmed sun hat: drooping brim, a crease where the brim breaks into the
# crown, a hat band, and a domed crown. The cone it replaces reads as a party
# hat. Must stay wider than the pumpkin head (sphere r 0.35 at hat-local -0.25).
# ---------------------------------------------------------------------------
hat = [
    (0.000, -0.148),   # underside centre, a shallow dome under the crown
    (0.210, -0.156),
    (0.390, -0.176),
    (0.522, -0.192),
    (0.600, -0.200),   # brim edge - envelope max radius, min y
    (0.545, -0.163),   # brim upper face sweeps back up
    (0.438, -0.122),
    (0.356, -0.084),
    (0.326, -0.058),   # brim break into the crown
    (0.322, 0.006),    # hat band
    (0.310, 0.058),
    (0.292, 0.098),    # crown shoulder rounds over
    (0.252, 0.140),
    (0.192, 0.172),
    (0.116, 0.193),
    (0.052, 0.200),
    (0.000, 0.200),    # crown top - envelope max y
]

hat_before = [(0.0, -0.2), (0.6, -0.2), (0.0, 0.2)]

# ---------------------------------------------------------------------------
# HAY BALE  -  replaces CylinderGeometry(0.5, 0.5, 0.8, 16)
# envelope: max radius 0.5, axial half-length 0.4
# ---------------------------------------------------------------------------
bale = [
    (0.000, -0.400),
    (0.230, -0.400),
    (0.440, -0.400),   # end face stays flat out to 0.44 for the twine ring
    (0.470, -0.390),
    (0.489, -0.366),
    (0.497, -0.330),
    (0.4995, -0.255),
    (0.500, 0.000),    # mid-height - envelope max radius (3 mm above the wall,
                       # so the shoulder roll is the change, not a barrel)
    (0.4995, 0.255),
    (0.497, 0.330),
    (0.489, 0.366),
    (0.470, 0.390),
    (0.440, 0.400),
    (0.230, 0.400),
    (0.000, 0.400),
]

bale_before = [(0.0, -0.4), (0.5, -0.4), (0.5, 0.4), (0.0, 0.4)]


def surface_y_at_radius(profile, radius, y_from):
    """Height at which a profile crosses `radius`, searching upward from y_from."""
    best = None
    for (r0, y0), (r1, y1) in zip(profile, profile[1:]):
        if y0 < y_from and y1 < y_from:
            continue
        lo, hi = min(r0, r1), max(r0, r1)
        if lo <= radius <= hi and r0 != r1:
            t = (radius - r0) / (r1 - r0)
            y = y0 + (y1 - y0) * t
            if best is None or y > best:
                best = y
    return best


# ---------------------------------------------------------------------------
# Probes. Every one of these guards a part this slice does not own.
# ---------------------------------------------------------------------------
print("=== TOWER probes (profile y; world y = profile y + 3) ===")
ARM_INNER_Z = 0.975   # windmillBladeArm inner face: box depth 0.05 at z = 1.0
for wy in (0.1, 0.9, 1.7, 2.499, 3.5, 4.5, 5.4, 5.5, 5.72, 5.75):
    py = wy - 3.0
    rr = max(p[0] for p in tower if abs(p[1] - py) < 1e-9) if any(
        abs(p[1] - py) < 1e-9 for p in tower) else None
    # radius of the built polyline at this height (max over crossings)
    seg = []
    for (r0, y0), (r1, y1) in zip(tower, tower[1:]):
        if min(y0, y1) - 1e-9 <= py <= max(y0, y1) + 1e-9:
            if y0 == y1:
                seg += [r0, r1]
            else:
                seg.append(r0 + (r1 - r0) * (py - y0) / (y1 - y0))
    r_built = max(seg) if seg else float("nan")
    tag = ""
    if wy == 2.499:
        tag = f"  <- blade arm low point; clearance {ARM_INNER_Z - r_built:+.3f}"
    if wy in (0.1, 1.7):
        tag = "  <- door edge"
    if wy == 5.5:
        tag = "  <- windshaft centre"
    print(f"  world y {wy:5.3f}  r {r_built:.4f}{tag}")

r_door_bot = None
r_door_top = None
for wy, slot in ((0.1, "bot"), (1.7, "top")):
    py = wy - 3.0
    seg = []
    for (r0, y0), (r1, y1) in zip(tower, tower[1:]):
        if min(y0, y1) - 1e-9 <= py <= max(y0, y1) + 1e-9 and y0 != y1:
            seg.append(r0 + (r1 - r0) * (py - y0) / (y1 - y0))
    if slot == "bot":
        r_door_bot = max(seg)
    else:
        r_door_top = max(seg)
r_door_mid = wall_r(0.9 - 3.0)
tilt = math.atan2(r_door_bot - r_door_top, 1.6)
print(f"\n=== DOOR re-seat ===")
print(f"  wall r at door bottom (world 0.1) {r_door_bot:.4f}")
print(f"  wall r at door mid    (world 0.9) {r_door_mid:.4f}")
print(f"  wall r at door top    (world 1.7) {r_door_top:.4f}")
print(f"  tilt to match batter: rotation x = {-tilt:.4f} rad ({math.degrees(tilt):.2f} deg)")
print(f"  suggested door z = {r_door_mid - 0.020:.3f}  (depth 0.18 -> "
      f"front +{r_door_mid - 0.020 + 0.09 - r_door_mid:.3f}, back {r_door_mid - 0.020 - 0.09 - r_door_mid:+.3f})")

print("\n=== BLADE / GALLERY clearance ===")
gal_top_world = GAL_CAP_TOP + 3.0
print(f"  gallery outer radius {R_GAL:.3f} (envelope max is 1.200)")
print(f"  gallery coping top world y {gal_top_world:.3f}; arm low point 2.499 -> "
      f"{2.499 - gal_top_world:+.3f}")
worst = 0.0
for (r0, y0), (r1, y1) in zip(tower, tower[1:]):
    for r, y in ((r0, y0), (r1, y1)):
        if 2.5 <= y + 3.0 <= 6.0:
            worst = max(worst, r)
print(f"  max tower radius over world y 2.5..6.0: {worst:.3f} "
      f"(must be < {ARM_INNER_Z}) -> {'OK' if worst < ARM_INNER_Z else 'FAIL'}")

print("\n=== CAP vs TOWER TOP ===")
for wy in (5.80, 5.90, 6.00):
    cy = wy - 6.5
    seg = []
    for (r0, y0), (r1, y1) in zip(cap, cap[1:]):
        if min(y0, y1) - 1e-9 <= cy <= max(y0, y1) + 1e-9 and y0 != y1:
            seg.append(r0 + (r1 - r0) * (cy - y0) / (y1 - y0))
    print(f"  world y {wy:.2f}: cap r {max(seg):.3f} vs tower r {R_CURB_WALL:.3f} -> "
          f"{'clear' if max(seg) > R_CURB_WALL else 'POKE-THROUGH'}")

print("\n=== HAT probes (hat-local y; world y = local + 2.85) ===")
y_crow = surface_y_at_radius(hat, 0.20, -0.05)
print(f"  crown surface at radius 0.20 -> local y {y_crow:.3f}, world y {y_crow + 2.85:.3f}")
print(f"  crow currently at world 3.050 -> floats {3.05 - (y_crow + 2.85):+.3f}; "
      f"re-seat to [0.2, {round(y_crow + 2.85, 3)}, 0]")
for ly in (-0.20, -0.10, 0.00, 0.05, 0.10):
    pumpkin = math.sqrt(max(0.35 ** 2 - (ly + 0.25) ** 2, 0.0))
    seg = []
    for (r0, y0), (r1, y1) in zip(hat, hat[1:]):
        if min(y0, y1) - 1e-9 <= ly <= max(y0, y1) + 1e-9 and y0 != y1:
            seg.append(r0 + (r1 - r0) * (ly - y0) / (y1 - y0))
    hr = max(seg)
    print(f"  local y {ly:+.2f}: hat r {hr:.3f} vs pumpkin r {pumpkin:.3f} -> "
          f"{'covered' if hr >= pumpkin else 'POKES THROUGH'}")

print("\n=== BALE / twine ring ===")
print(f"  end face flat to r 0.440; hayRing outer is 0.480 at z 0.41 -> "
      f"shrink ring outer to 0.430")

# ---------------------------------------------------------------------------
spec = [
    {
        "name": "windmill_tower",
        "before": {"kind": "cylinder", "args": [0.8, 1.2, 6.0, 20]},
        "after": {"kind": "profile", "segments": 20,
                  "points": [[r3(r), r3(y)] for r, y in tower]},
        "scale": [1.5, 1.5, 1.5],
        "distance": 30.0,
        "note": "battered wall, splayed base course, reefing gallery, curb band",
    },
    {
        "name": "windmill_cap",
        "before": {"kind": "cone", "args": [1.0, 1.5, 20]},
        "after": {"kind": "profile", "segments": 20,
                  "points": [[r3(r), r3(y)] for r, y in cap]},
        "scale": [1.5, 1.5, 1.5],
        "distance": 9.0,
        "note": "ogee boat cap: fascia, drip, concave flank, swell, finial",
    },
    {
        "name": "windmill_hub",
        "before": {"kind": "cylinder", "args": [0.2, 0.2, 0.3, 12]},
        "after": {"kind": "profile", "segments": 12,
                  "points": [[r3(r), r3(y)] for r, y in hub]},
        "scale": [1.5, 1.5, 1.5],
        "distance": 2.4,
        "note": "windshaft boss: tail flange, waisted barrel, socket collar, nose",
    },
    {
        "name": "straw_hat",
        "before": {"kind": "cone", "args": [0.6, 0.4, 8]},
        "after": {"kind": "profile", "segments": 16,
                  "points": [[r3(r), r3(y)] for r, y in hat]},
        "scale": [1.0, 1.0, 1.0],
        "distance": 3.2,
        "note": "brim, brim break, hat band, domed crown",
    },
    {
        "name": "hay_bale",
        "before": {"kind": "cylinder", "args": [0.5, 0.5, 0.8, 16]},
        "after": {"kind": "profile", "segments": 16,
                  "points": [[round(r, 4), r3(y)] for r, y in bale]},
        "scale": [1.0, 1.0, 1.0],
        "distance": 4.2,
        "note": "rolled shoulders instead of machined corners; wall stays straight",
    },
    {
        # Composite silhouette check only - tower truncated at the cap underside
        # (everything above is hidden) with the cap stacked on top, so the eave
        # overhang, curb band and gallery can be judged as one shape.
        "name": "windmill_composite",
        "before": {"kind": "profile", "segments": 20, "points": [
            [0.0, 0.0], [1.2, 0.0], [0.817, 5.75], [1.0, 5.75], [0.0, 7.25]]},
        "after": {"kind": "profile", "segments": 20, "points": (
            [[r3(r), r3(y + 3.0)] for r, y in tower[:-2] if y + 3.0 <= 5.75]
            + [[0.965, 5.75]]
            + [[r3(r), r3(y + 6.5)] for r, y in cap[2:]]
        )},
        "scale": [1.5, 1.5, 1.5],
        "distance": 31.0,
        "note": "tower + cap read as one silhouette at 31 m",
    },
]

with open(OUT, "w") as fh:
    json.dump(spec, fh, indent=1)
print(f"\nWROTE {OUT}")
for e in spec:
    pts = e["after"].get("points")
    print(f"  {e['name']:20s} {len(pts) if pts else 0} profile points")
