/**
 * The three personnel review scenes: who they grade, and from where.
 *
 * ---------------------------------------------------------------------------
 * WHAT WAS BROKEN
 * ---------------------------------------------------------------------------
 * All three poses in `SITE_LAYOUT.cameras` aim at a worker's SPAWN coordinate
 * from `createInitialWorkers` - `personnelClose` targets `[10, 1.25, -18]`,
 * which is exactly `starts[0]`. That is only correct while the world is paused.
 * `WorkerSystemNew` passes `gameSpeed > 0` into the animation manager as
 * `simulationActive`, and an ordinary benchmark run sets `gameSpeed` to 0, so
 * the roster stands on its marks and the shot lands.
 *
 * An ART capture runs `--motion`. The roster then patrols the side aisles, and
 * measured on this build the nearest authored body had walked from z = -18 to
 * z = -9.0 by the time the shutter opened: `personnel-close` returned silo
 * cones and empty floor. Three of the twelve art-review scenes were grading
 * nothing at all, which quietly corrupts the baseline every later pass compares
 * itself against.
 *
 * ---------------------------------------------------------------------------
 * WHY BOTH A HOLD AND A FOLLOW
 * ---------------------------------------------------------------------------
 * Two independent mechanisms, because each covers the other's failure:
 *
 * 1. THE HOLD (`isPersonnelReviewScene`) keeps the roster on its spawn marks
 *    for the duration of a personnel capture - movement only; the mixer, the
 *    secondary signals, breathing and blinking all keep running, so what is
 *    graded is a living figure standing still rather than a mannequin.
 *
 *    This is what makes the frame reproducible run to run, and it is why the
 *    shot is CLEAR. The patrol line runs at x = +/-10 and the silos are 4.5 m
 *    wide on x = -18, -9, 0, 9, 18, so a worker walking to z = -22 passes
 *    THROUGH a silo; a camera tracking them there photographs the inside of a
 *    cone, which is exactly what the first build of the follow returned. The
 *    whole roster is held rather than just the graded subject because the
 *    system has no worker-worker separation: with one figure standing still,
 *    the next one down the same aisle walks through it, and the second capture
 *    of `personnel-feminine` came back with two interpenetrating bodies.
 *
 * 2. THE FOLLOW (`resolvePersonnelFollowPose`) re-derives the pose from the
 *    subject's actual transform every frame anyway. With the hold in place it
 *    is a no-op that reproduces the authored constant to six decimal places -
 *    which `__tests__/personnelReview.test.ts` asserts - and it is what keeps
 *    the shot if the roster, the spawn marks or the body-type assignment ever
 *    change.
 *
 * Offsets are stated in the SUBJECT'S frame so the framing survives the patrol
 * turnaround. The model's forward is +Z: `WorkerAnimationManager` derives its
 * heading as `Math.atan2(nx, nz)`, the yaw that turns +Z onto (nx, nz).
 */
import type * as THREE from 'three';
import { SITE_LAYOUT, type Vec3Tuple } from '../constants/siteLayout';
import { getWorkerAppearance } from '../components/workers/WorkerAppearance';
import { createInitialWorkers } from '../types';
import type { BenchmarkScene } from './runtimeMode';

export interface PersonnelFollow {
  /** `WorkerBodyType` of the roster member this scene exists to grade. */
  body: 'masculine' | 'feminine';
  /** Camera offset in the subject's frame. +Z is in front of the subject. */
  offset: Vec3Tuple;
  /** Look-at height above the subject's feet. */
  targetHeight: number;
  /** The authored pose this scene falls back to, and the anchor for the hold. */
  anchor: { position: Vec3Tuple; target: Vec3Tuple; fov?: number };
}

export const PERSONNEL_FOLLOW: Partial<Record<BenchmarkScene, PersonnelFollow>> = {
  // Wide: whole body plus the aisle it works in, looking back ALONG the aisle
  // the roster patrols rather than across it. The previous fixed pose looked
  // across the hall from [22, 5.5, -14] and put a silo support leg down the
  // centre of the frame.
  personnel: {
    body: 'masculine',
    offset: [-1.8, 2.4, 6],
    targetHeight: 1.15,
    anchor: SITE_LAYOUT.cameras.personnel,
  },
  // Conversational three-quarter front. Both offsets are the authored poses
  // re-expressed in the subject's frame, so the framing the art set was tuned
  // on is preserved exactly and only its anchor changes.
  'personnel-close': {
    body: 'masculine',
    offset: [-1.4, 1.72, 1.45],
    targetHeight: 1.25,
    anchor: SITE_LAYOUT.cameras.personnelClose,
  },
  'personnel-feminine': {
    body: 'feminine',
    offset: [-1.4, 1.72, 1.7],
    targetHeight: 1.25,
    anchor: SITE_LAYOUT.cameras.personnelFeminine,
  },
};

export interface PersonnelCameraPose {
  position: Vec3Tuple;
  target: Vec3Tuple;
  fov?: number;
}

/**
 * Place a review camera relative to a subject standing at `position` with yaw
 * `yaw`, in the subject's own frame.
 *
 * Pure and exported because the arithmetic IS the fix: a sign error here puts
 * the camera behind the head it is supposed to be grading, and no gate in this
 * repo can see a plausible-looking frame of the wrong thing.
 *
 * THE LATERAL OFFSET IS MIRRORED TO STAY IN THE AISLE. The roster patrols the
 * two side aisles and turns around at each end, so a rigid subject-frame offset
 * swings the camera across the aisle on every reversal - and the outboard side
 * of a side aisle is the machine row. Reflecting the offset in the subject's
 * own forward axis keeps whichever side is nearer the open hall centreline, and
 * the reflection has no side effect on the framing because it leaves the
 * forward component - the part holding the camera in FRONT of the face -
 * algebraically unchanged at `oz`.
 */
export function resolvePersonnelFollowPose(
  follow: PersonnelFollow,
  position: Vec3Tuple,
  yaw: number,
  fov?: number
): PersonnelCameraPose {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const [ox, oy, oz] = follow.offset;
  const forwardX = oz * sin;
  const lateralX = ox * cos;
  const openSide =
    Math.abs(position[0] + forwardX + lateralX) <= Math.abs(position[0] + forwardX - lateralX)
      ? 1
      : -1;
  const lateral = ox * openSide;
  return {
    position: [
      position[0] + lateral * cos + oz * sin,
      position[1] + oy,
      position[2] - lateral * sin + oz * cos,
    ],
    target: [position[0], position[1] + follow.targetHeight, position[2]],
    fov,
  };
}

/**
 * Roster id of the member a personnel review scene grades, or null for any
 * other scene.
 *
 * NEAREST SPAWN MARK OF THE RIGHT BODY TYPE TO THE AUTHORED TARGET - not the
 * first of that type in roster order, which would silently mean "index 0" and
 * make `personnel-feminine` depend on where a masculine worker happens to be.
 * Nearest reproduces the shot each fixed pose was composed for, and it is
 * stable because the ten spawn marks are 4 m apart.
 *
 * Pure over the roster, so the choice can be asserted in a unit test without
 * mounting a scene.
 */
export function resolvePersonnelReviewSubjectId(scene: BenchmarkScene): string | null {
  const follow = PERSONNEL_FOLLOW[scene];
  if (!follow) return null;
  const target = follow.anchor.target;
  let bestId: string | null = null;
  let bestDistance = Infinity;
  for (const worker of createInitialWorkers()) {
    const appearance = getWorkerAppearance(worker.role, worker.color, worker.id);
    if (appearance.bodyType !== follow.body) continue;
    const distance = (worker.position[0] - target[0]) ** 2 + (worker.position[2] - target[2]) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = worker.id;
    }
  }
  return bestId;
}

/** True for the three scenes that exist to photograph people. */
export function isPersonnelReviewScene(scene: BenchmarkScene): boolean {
  return PERSONNEL_FOLLOW[scene] !== undefined;
}

/**
 * The live scene-graph object for a review subject.
 *
 * BY NAME FIRST, so the camera and the hold cannot disagree: both derive the
 * subject from `resolvePersonnelReviewSubjectId`, rather than each running its
 * own "nearest" search over slightly different data. The nearest-by-body-type
 * fallback exists for the case where the named group has not mounted yet.
 *
 * Matched on the per-worker GROUP that `WorkerSystemNew` names and tags, not on
 * the authored GLB root: the group exists at every level of detail while the
 * GLB only mounts at `lod === 'high'`. Keying on the GLB would deadlock,
 * because the camera cannot get close enough to raise the subject's LOD until
 * it has already found the subject.
 */
export function findPersonnelSubject(
  root: THREE.Object3D,
  scene: BenchmarkScene,
  scratch: THREE.Vector3
): THREE.Object3D | null {
  const follow = PERSONNEL_FOLLOW[scene];
  if (!follow) return null;
  const system = root.getObjectByName('worker-system');
  if (!system) return null;

  const subjectId = resolvePersonnelReviewSubjectId(scene);
  const named = subjectId ? system.getObjectByName(`worker-${subjectId}`) : null;
  if (named) return named;

  const target = follow.anchor.target;
  let best: THREE.Object3D | null = null;
  let bestDistance = Infinity;
  for (const child of system.children) {
    if (child.userData?.bodyType !== follow.body) continue;
    child.getWorldPosition(scratch);
    const distance = (scratch.x - target[0]) ** 2 + (scratch.z - target[2]) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = child;
    }
  }
  return best;
}
