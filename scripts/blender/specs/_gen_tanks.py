"""Generate the tanks-exterior spec: torispherical (dished) pressure-vessel heads.

A dished head that is tangent to the shell and has depth exactly R is, provably,
the hemisphere: solving  Rc - (Rc - rk) * sin(beta) = R  with
cos(beta) = (R - rk) / (Rc - rk)  gives Rc = R for any knuckle radius. So a real
torispherical head cannot keep the current capsule's axial extent on its own.

The fix is the thing real vessels actually do: the head has a STRAIGHT FLANGE
before the knuckle. Total half-extent stays L/2 + R; the flange absorbs
R - headDepth and simply reads as more cylinder. The result is a bullet tank
(long barrel, quick dish) instead of a pill, which is also the correct silhouette.
"""

import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def head_profile(rk_n, rc_n, crown_pts=4, knuckle_pts=4):
    """Normalised dished head, in units of the shell radius R.

    Returns [(r/R, depth/R), ...] from the pole inboard to the flange, where
    depth is measured back from the pole along the axis.

      rk_n : knuckle radius / R
      rc_n : crown (dish) radius / R
    """
    a = 1.0 - rk_n                       # knuckle centre, distance from axis
    beta = math.acos(a / (rc_n - rk_n))  # knuckle sweep, cylinder -> crown
    depth = rc_n - (rc_n - rk_n) * math.sin(beta)

    pts = []
    # Crown: spherical cap, pole first. The crown's polar angle at the tangent
    # point is NOT beta: r_tangent = rc * cos(beta), so sin(phi_t) = cos(beta)
    # and phi_t = 90 deg - beta. Getting this wrong sends the crown out past the
    # shell radius.
    phi_t = math.pi / 2 - beta
    for i in range(crown_pts + 1):
        phi = phi_t * i / crown_pts
        pts.append((rc_n * math.sin(phi), rc_n - rc_n * math.cos(phi)))
    # Knuckle: tangent at beta, back down to the flange at r = 1.
    for i in range(knuckle_pts - 1, -1, -1):
        th = beta * i / knuckle_pts
        r = a + rk_n * math.cos(th)
        y_from_knuckle_start = rk_n * math.sin(th)
        pts.append((r, depth - y_from_knuckle_start))
    return pts, depth, beta


# ASME "2:1 ellipsoidal equivalent" torispherical: crown 0.90 D, knuckle 0.17 D.
TORI_2_1 = dict(rk_n=0.34, rc_n=1.80)
# ASME flanged & dished: crown 1.00 D, knuckle 0.06 D - much flatter.
TORI_FD = dict(rk_n=0.12, rc_n=2.00)

SEAM_DEPTH = 0.020     # groove depth, x R
SEAM_FLAT = 0.013      # groove floor half-width, x R
SEAM_LIP = 0.020       # groove mouth half-width, x R
SEAM_INSET = 0.30      # seam centre inboard of the knuckle start, x R
GIRTH_DEPTH = 0.020    # mid-shell course seam depth, x R


def seam(r, y0, depth=SEAM_DEPTH):
    """Recessed circumferential weld line, four points, never exceeding r.

    Recessed rather than proud on purpose: a raised bead would push past the
    shell radius and break the envelope. The groove reads as the same dark ring
    and its widest point IS the shell radius, so max radius is still exact.
    """
    return [
        (r, y0 - SEAM_LIP * r),
        (r * (1 - depth), y0 - SEAM_FLAT * r),
        (r * (1 - depth), y0 + SEAM_FLAT * r),
        (r, y0 + SEAM_LIP * r),
    ]


def vessel(radius, length, head, girth_seam=True, girth_depth=SEAM_DEPTH,
           head_depth_seam=SEAM_DEPTH, inset=SEAM_INSET):
    """Full pole-to-pole lathe profile for a pressure vessel, centred on y = 0.

    Envelope: max radius = `radius`, y in [-(length/2 + radius), +...] - exactly
    the cylinder + two hemispherical caps it replaces.
    """
    half = length / 2 + radius
    hp, depth_n, beta = head_profile(**head)
    depth = depth_n * radius
    knuckle_start = half - depth
    # inset=None puts the weld exactly at the start of the straight flange -
    # the real head/shell joint, and (because flange = R - depth) exactly at
    # +-length/2, where the barrel it replaces used to end.
    flange = radius - depth
    seam_y = knuckle_start - (flange if inset is None else inset * radius)

    top = [(r * radius, half - d * radius) for (r, d) in hp]   # pole -> flange
    # Mirroring y already puts the bottom head in ascending-y order (pole first),
    # which is the order LatheGeometry needs for outward normals. Reversing it
    # here would flip the winding on the whole lower half.
    bottom = [(r, -y) for (r, y) in top]

    prof = list(bottom)
    prof += seam(radius, -seam_y, head_depth_seam)
    if girth_seam:
        prof += seam(radius, 0.0, girth_depth)
    prof += seam(radius, seam_y, head_depth_seam)
    prof += top[::-1]                                          # flange -> pole
    return prof, dict(depth=depth, knuckleStart=knuckle_start, seamY=seam_y,
                      beta=math.degrees(beta), depthNorm=depth_n, half=half)


def fmt(prof):
    # 6 dp, matching the precision of the normalised head table transcribed into
    # TypeScript, so the rendered profile and the shipped profile are the same
    # numbers rather than merely close ones.
    return [[round(r, 6), round(y, 6)] for (r, y) in prof]


entries = []


def add(name, radius, length, distance, before_cap, **kw):
    prof, info = vessel(radius, length, **kw)
    entries.append({
        "name": name,
        "before": {"kind": "capsule", "args": before_cap},
        "after": {"kind": "profile", "segments": 24, "points": fmt(prof)},
        "scale": [1, 1, 1],
        "distance": distance,
        "note": (f"R{radius} L{length} head depth {info['depth']:.4f} "
                 f"knuckle@{info['knuckleStart']:.4f} seam@{info['seamY']:.4f} "
                 f"beta {info['beta']:.2f}deg"),
    })
    return prof, info


VARIANTS = os.environ.get("TANK_VARIANTS", "final")
CAP_ST = [3.0, 10.0, 12, 24]
CAP_PT = [1.5, 5.0, 8, 24]

if VARIANTS == "round3":
    # Short barrels: same head geometry at 2x the on-screen scale, so the
    # knuckle and the weld line can actually be judged.
    add("st_head_detail", 3.0, 2.0, 12.0, [3.0, 2.0, 12, 24],
        head=TORI_2_1, girth_seam=False, inset=None)
    add("st_head_detail_finer", 3.0, 2.0, 12.0, [3.0, 2.0, 12, 24],
        head=dict(TORI_2_1, crown_pts=6, knuckle_pts=6), girth_seam=False, inset=None)
    add("st_final", 3.0, 10.0, 30.0, CAP_ST, head=TORI_2_1, girth_seam=False, inset=None)
    add("pt_head_detail", 1.5, 1.5, 7.0, [1.5, 1.5, 8, 24],
        head=TORI_2_1, girth_seam=False, inset=None)
    add("pt_final", 1.5, 5.0, 15.0, CAP_PT, head=TORI_2_1, girth_seam=False, inset=None)
elif VARIANTS == "round2":
    add("st_girth_strong", 3.0, 10.0, 30.0, CAP_ST, head=TORI_2_1)
    add("st_girth_soft", 3.0, 10.0, 30.0, CAP_ST, head=TORI_2_1, girth_depth=0.008)
    add("st_no_girth", 3.0, 10.0, 30.0, CAP_ST, head=TORI_2_1, girth_seam=False)
    add("st_seam_at_flange", 3.0, 10.0, 30.0, CAP_ST, head=TORI_2_1,
        girth_depth=0.008, inset=0.50)
    add("st_closeup", 3.0, 10.0, 14.0, CAP_ST, head=TORI_2_1, girth_depth=0.008)
    add("pt_closeup", 1.5, 5.0, 8.0, CAP_PT, head=TORI_2_1, girth_seam=False)
else:
    # The four vessels the scene actually draws, each at its own viewing
    # distance. No girth seam: at 30 m a single mid-shell weld read as two drums
    # bolted together (round 2), and softening it did not help - the shell wants
    # to be one clean course between the two head welds.
    for n, (r, l, d) in {
        "storage_tank_vessel": (3.0, 10.0, 30.0),        # x2 on site
        "storage_tank_vessel_small": (2.5, 8.0, 26.0),
        "propane_tank_vessel": (1.5, 5.0, 15.0),
        "propane_tank_vessel_small": (1.2, 4.0, 12.0),
    }.items():
        cap = [r, l, 12 if r >= 2 else 8, 24]
        add(n, r, l, d, cap, head=TORI_2_1, girth_seam=False, inset=None)

out = os.path.join(HERE, "tanks-exterior.json")
with open(out, "w") as fh:
    json.dump(entries, fh, indent=1)
print("wrote", out)

# Normalised head tables, for exact transcription into TypeScript.
for name, head in (("TORI_2_1", TORI_2_1), ("TORI_FD", TORI_FD)):
    hp, d, b = head_profile(**head)
    print(f"\n{name}: depth {d:.6f} R   beta {math.degrees(b):.4f} deg")
    for (r, y) in hp:
        print(f"  [{r:.5f}, {y:.5f}],")
