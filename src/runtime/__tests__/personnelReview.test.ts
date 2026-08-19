import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SITE_LAYOUT, type Vec3Tuple } from '../../constants/siteLayout';
import { getWorkerAppearance } from '../../components/workers/WorkerAppearance';
import { createInitialWorkers } from '../../types';
import {
  PERSONNEL_FOLLOW,
  findPersonnelSubject,
  isPersonnelReviewScene,
  resolvePersonnelFollowPose,
  resolvePersonnelReviewSubjectId,
} from '../personnelReview';

function dot(left: Vec3Tuple, right: Vec3Tuple): number {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

describe('resolvePersonnelFollowPose', () => {
  /**
   * A spawn mark with the heading `createWorkerAnimationData` gives it:
   * `direction > 0 ? 0 : PI`, which alternates by roster index.
   */
  const spawn = (index: number) => {
    const worker = createInitialWorkers()[index];
    return { position: worker.position, yaw: worker.direction > 0 ? 0 : Math.PI };
  };

  it.each([
    ['personnel', 'personnel', 0],
    ['personnel-close', 'personnelClose', 0],
    ['personnel-feminine', 'personnelFeminine', 1],
  ] as const)(
    'reproduces the authored %s pose from its subject spawn mark',
    (scene, cameraKey, rosterIndex) => {
      const follow = PERSONNEL_FOLLOW[scene];
      expect(follow).toBeDefined();
      const { position, yaw } = spawn(rosterIndex);
      const pose = resolvePersonnelFollowPose(follow!, position, yaw);
      const authored = SITE_LAYOUT.cameras[cameraKey];

      // The hold keeps the graded subject on its mark, so the follow has to
      // reproduce the authored constant exactly. Drift here means the two
      // mechanisms disagree and the frame depends on which one ran last.
      pose.position.forEach((value, axis) => expect(value).toBeCloseTo(authored.position[axis], 6));
      pose.target.forEach((value, axis) => expect(value).toBeCloseTo(authored.target[axis], 6));
    }
  );

  it('keeps the camera in front of the subject whichever way it is facing', () => {
    const follow = PERSONNEL_FOLLOW['personnel-close']!;
    // The offset is stated in the subject's frame, so what matters is the dot
    // product of (camera - subject) with the subject's forward. A sign error
    // would put the camera behind the head the scene exists to grade.
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 2.3]) {
      const pose = resolvePersonnelFollowPose(follow, [4, 0, -7], yaw);
      const forward = [Math.sin(yaw), 0, Math.cos(yaw)] as Vec3Tuple;
      const toCamera: Vec3Tuple = [pose.position[0] - 4, 0, pose.position[2] + 7];
      expect(dot(forward, toCamera)).toBeGreaterThan(0.9);
      // And at conversational distance, not merely on the correct side.
      expect(Math.hypot(toCamera[0], toCamera[2])).toBeCloseTo(
        Math.hypot(follow.offset[0], follow.offset[2]),
        6
      );
    }
  });

  it('stays on the open side of the aisle when the subject turns around', () => {
    // The two patrol aisles run at x = +/-10 with the machine rows outboard of
    // them. Both headings have to leave the camera INBOARD of the subject, or
    // the shot is taken through a silo - which is what the unmirrored offset
    // produced on the first build.
    for (const yaw of [0, Math.PI]) {
      expect(
        Math.abs(
          resolvePersonnelFollowPose(PERSONNEL_FOLLOW['personnel-feminine']!, [-10, 0, -14], yaw)
            .position[0]
        )
      ).toBeLessThan(10);
      expect(
        Math.abs(
          resolvePersonnelFollowPose(PERSONNEL_FOLLOW['personnel-close']!, [10, 0, -14], yaw)
            .position[0]
        )
      ).toBeLessThan(10);
    }
  });
});

describe('resolvePersonnelReviewSubjectId', () => {
  it('holds a roster member of the body type each scene grades', () => {
    const roster = createInitialWorkers();
    for (const scene of ['personnel', 'personnel-close', 'personnel-feminine'] as const) {
      const id = resolvePersonnelReviewSubjectId(scene);
      expect(id, scene).not.toBeNull();
      const worker = roster.find((entry) => entry.id === id);
      expect(worker, scene).toBeDefined();
      expect(getWorkerAppearance(worker!.role, worker!.color, worker!.id).bodyType).toBe(
        PERSONNEL_FOLLOW[scene]!.body
      );
    }
  });

  it('holds the roster member each authored pose was composed around', () => {
    const roster = createInitialWorkers();
    for (const scene of ['personnel', 'personnel-close', 'personnel-feminine'] as const) {
      const follow = PERSONNEL_FOLLOW[scene]!;
      const worker = roster.find((entry) => entry.id === resolvePersonnelReviewSubjectId(scene))!;
      // The pose targets the subject's own mark, which is the property that
      // makes the held frame identical to the authored one.
      expect(worker.position[0], scene).toBeCloseTo(follow.anchor.target[0], 6);
      expect(worker.position[2], scene).toBeCloseTo(follow.anchor.target[2], 6);
    }
  });

  it('holds nobody in any other scene', () => {
    for (const scene of ['overview', 'interior', 'forklift', 'village'] as const) {
      expect(resolvePersonnelReviewSubjectId(scene), scene).toBeNull();
      // The roster hold is gated on the same predicate, so an ordinary scene -
      // and every ordinary run, which is not a benchmark at all - keeps its
      // walking personnel.
      expect(isPersonnelReviewScene(scene), scene).toBe(false);
    }
    for (const scene of ['personnel', 'personnel-close', 'personnel-feminine'] as const) {
      expect(isPersonnelReviewScene(scene), scene).toBe(true);
    }
  });
});

describe('findPersonnelSubject', () => {
  const buildScene = (
    members: ReadonlyArray<{ name: string; bodyType: string; position: Vec3Tuple }>
  ): THREE.Object3D => {
    const root = new THREE.Object3D();
    const system = new THREE.Object3D();
    system.name = 'worker-system';
    members.forEach((member) => {
      const group = new THREE.Object3D();
      group.name = member.name;
      group.userData = { bodyType: member.bodyType };
      group.position.set(...member.position);
      system.add(group);
    });
    root.add(system);
    root.updateMatrixWorld(true);
    return root;
  };

  const scratch = new THREE.Vector3();

  it('resolves the same roster member the hold pins, by name', () => {
    const masculineId = resolvePersonnelReviewSubjectId('personnel-close')!;
    const feminineId = resolvePersonnelReviewSubjectId('personnel-feminine')!;
    // Deliberately placed away from their marks and out of roster order: name
    // must win, so the camera and the hold cannot pick different people.
    const scene = buildScene([
      { name: `worker-${feminineId}`, bodyType: 'feminine', position: [-10, 0, 12] },
      { name: 'worker-decoy', bodyType: 'masculine', position: [10, 0, -18] },
      { name: `worker-${masculineId}`, bodyType: 'masculine', position: [10, 0, 6] },
    ]);

    expect(findPersonnelSubject(scene, 'personnel-close', scratch)?.name).toBe(
      `worker-${masculineId}`
    );
    expect(findPersonnelSubject(scene, 'personnel-feminine', scratch)?.name).toBe(
      `worker-${feminineId}`
    );
  });

  it('falls back to the nearest body of the right type when the name is absent', () => {
    const scene = buildScene([
      { name: 'worker-unmapped-a', bodyType: 'masculine', position: [10, 0, -18] },
      { name: 'worker-unmapped-b', bodyType: 'feminine', position: [-10, 0, -14] },
      { name: 'worker-unmapped-c', bodyType: 'masculine', position: [10, 0, -2] },
    ]);

    expect(findPersonnelSubject(scene, 'personnel-close', scratch)?.name).toBe('worker-unmapped-a');
    expect(findPersonnelSubject(scene, 'personnel-feminine', scratch)?.name).toBe(
      'worker-unmapped-b'
    );
  });

  it('returns null rather than a wrong body when none is mounted', () => {
    expect(findPersonnelSubject(buildScene([]), 'personnel-feminine', scratch)).toBeNull();
    expect(
      findPersonnelSubject(
        buildScene([{ name: 'worker-unmapped-a', bodyType: 'masculine', position: [0, 0, 0] }]),
        'personnel-feminine',
        scratch
      )
    ).toBeNull();
    expect(findPersonnelSubject(new THREE.Object3D(), 'personnel-close', scratch)).toBeNull();
    // And nothing at all for a scene that is not a personnel review.
    expect(
      findPersonnelSubject(
        buildScene([{ name: 'worker-unmapped-a', bodyType: 'masculine', position: [0, 0, 0] }]),
        'overview',
        scratch
      )
    ).toBeNull();
  });
});
