import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

/**
 * The bug this pins, reproduced against the real `AnimationMixer`.
 *
 * `WorkerModel` layers secondary animation on top of the clips by
 * premultiplying a small offset onto a few bone quaternions, and the comment
 * above that block used to assert the offsets were "non-accumulating" because
 * the mixer rewrites every bone first. It does not.
 * `three/src/animation/PropertyMixer.js:231` compares the newly accumulated
 * value against the previously applied one and calls `binding.setValue` ONLY
 * when it differs, so a clip whose track is CONSTANT stops writing its bone
 * after the first frame - and five of the nine authored worker clips
 * (`break`, `inspect`, `repair`, `supervise`, `sample`) are exactly two
 * identical keys per bone.
 *
 * A stationary worker's breath term is very nearly constant, so the offset
 * integrates linearly rather than averaging out. Measured on the live rig
 * before the fix, `Torso -> Chest` ran 32 deg at 6 s, 130 deg at 14 s and
 * 152 deg at 34 s against a rest pose of 0.4 deg; at 130 degrees the head
 * hangs below the chest and both arms point over the head, which is the pose
 * the art-review sheet went out with.
 *
 * This is a THREE-BEHAVIOUR test as much as an app test: if a future three
 * release drops the change-detection short-circuit, the first case stops
 * failing and the restore in `WorkerModel` becomes redundant rather than wrong.
 */
function buildConstantClipRig(): {
  bone: THREE.Object3D;
  mixer: THREE.AnimationMixer;
} {
  const root = new THREE.Object3D();
  const bone = new THREE.Object3D();
  bone.name = 'Chest';
  root.add(bone);

  // Two identical keys, which is what the authored static work poses carry.
  const rest = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.007);
  const track = new THREE.QuaternionKeyframeTrack(
    'Chest.quaternion',
    [0, 1.667],
    [rest.x, rest.y, rest.z, rest.w, rest.x, rest.y, rest.z, rest.w]
  );
  const clip = new THREE.AnimationClip('worker-supervise', 1.667, [track]);
  const mixer = new THREE.AnimationMixer(root);
  mixer.clipAction(clip).play();
  return { bone, mixer };
}

/** The breath term's magnitude, from `WorkerAnimationManager`. */
const OFFSET_RADIANS = 0.5 * 0.008;
const FRAMES = 600; // Ten seconds at 60 fps - shorter than any art capture.

function angleFromRest(bone: THREE.Object3D): number {
  return 2 * Math.acos(Math.min(1, Math.abs(bone.quaternion.w))) * (180 / Math.PI);
}

describe('secondary bone offsets on a constant clip', () => {
  const offset = new THREE.Quaternion().setFromEuler(new THREE.Euler(OFFSET_RADIANS, 0, 0, 'XYZ'));

  it('integrates without bound when the offset is premultiplied blind', () => {
    const { bone, mixer } = buildConstantClipRig();

    for (let frame = 0; frame < FRAMES; frame += 1) {
      mixer.update(1 / 60);
      bone.quaternion.premultiply(offset);
    }

    // 600 frames x 0.004 rad is 2.4 rad if nothing resets it. Anything past a
    // few degrees is already a visibly wrong torso.
    expect(angleFromRest(bone)).toBeGreaterThan(90);
  });

  it('stays at the clip pose when the base is restored before the mixer runs', () => {
    const { bone, mixer } = buildConstantClipRig();
    const base = new THREE.Quaternion();
    let hasBase = false;

    for (let frame = 0; frame < FRAMES; frame += 1) {
      if (hasBase) bone.quaternion.copy(base);
      mixer.update(1 / 60);
      // Capture AFTER the mixer and BEFORE the offset: whatever the mixer wrote
      // this frame, or declined to write, is the correct base for the next one.
      base.copy(bone.quaternion);
      hasBase = true;
      bone.quaternion.premultiply(offset);
    }

    // The clip's own 0.007 rad plus one frame of offset, and nothing more.
    expect(angleFromRest(bone)).toBeLessThan(1.5);
  });

  it('still tracks a clip that does animate its bone', () => {
    // The restore must not pin an animated bone to a stale pose: when the mixer
    // does write, its value has to win immediately.
    const root = new THREE.Object3D();
    const bone = new THREE.Object3D();
    bone.name = 'Chest';
    root.add(bone);
    const a = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0);
    const b = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.6);
    const track = new THREE.QuaternionKeyframeTrack(
      'Chest.quaternion',
      [0, 1],
      [a.x, a.y, a.z, a.w, b.x, b.y, b.z, b.w]
    );
    const mixer = new THREE.AnimationMixer(root);
    mixer.clipAction(new THREE.AnimationClip('animated', 1, [track])).play();

    const base = new THREE.Quaternion();
    let hasBase = false;
    // Half of the one-second clip. A full second would wrap the LoopRepeat back
    // to its first key and assert nothing.
    for (let frame = 0; frame < 30; frame += 1) {
      if (hasBase) bone.quaternion.copy(base);
      mixer.update(1 / 60);
      base.copy(bone.quaternion);
      hasBase = true;
      bone.quaternion.premultiply(offset);
    }

    // Halfway along a 0 -> 0.6 rad ramp is ~17 degrees: the pose must have
    // travelled with the clip, not been held at the first frame.
    expect(angleFromRest(bone)).toBeGreaterThan(12);
    expect(angleFromRest(bone)).toBeLessThan(24);
  });
});
