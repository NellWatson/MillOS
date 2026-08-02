import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  createWorkerAnimationData,
  normalizeWorkerSpeed,
  WorkerAnimationManager,
} from '../../animation';
import { createInitialWorkers, WORKER_ROSTER } from '../../types';
import { getPersonnelProfileIds, getWorkerAppearance } from './workerTypes';

describe('canonical personnel profiles', () => {
  it('defines a named appearance for every roster member', () => {
    expect(getPersonnelProfileIds().sort()).toEqual(
      WORKER_ROSTER.map((worker) => worker.id).sort()
    );
  });

  it('keeps all ten personnel visually distinguishable', () => {
    const signatures = WORKER_ROSTER.map((worker) => {
      const appearance = getWorkerAppearance(worker.role, worker.color, worker.id);
      return [
        appearance.skinTone,
        appearance.hairColor,
        appearance.hairStyle,
        appearance.eyeColor,
        appearance.bodyType,
        appearance.heightScale,
        appearance.bodyScale,
        appearance.accentColor,
      ].join(':');
    });

    expect(new Set(signatures).size).toBe(WORKER_ROSTER.length);
  });

  it('maps the roster body presentation to the authored runtime bodies', () => {
    for (const worker of WORKER_ROSTER) {
      const appearance = getWorkerAppearance(worker.role, worker.color, worker.id);
      expect(appearance.bodyType).toBe(worker.gender === 'female' ? 'feminine' : 'masculine');
    }
  });

  it('assigns role-correct PPE and equipment', () => {
    for (const worker of WORKER_ROSTER) {
      const appearance = getWorkerAppearance(worker.role, worker.color, worker.id);
      expect(appearance.hasHardHat).toBe(true);

      if (worker.role === 'Operator') {
        expect(appearance.hasHearingProtection).toBe(true);
        expect(appearance.hasGloves).toBe(true);
        expect(appearance.workAction).toBe('operate');
      }

      if (worker.role === 'Quality Control') {
        expect(appearance.hasLabCoat).toBe(true);
        expect(appearance.hasSafetyGlasses).toBe(true);
        expect(appearance.tool).toBe('sample-kit');
        expect(appearance.workAction).toBe('sample');
      }

      if (worker.role === 'Maintenance') {
        expect(appearance.hasToolBelt).toBe(true);
        expect(appearance.hasSafetyGlasses).toBe(true);
        expect(appearance.tool).toBe('wrench');
        expect(appearance.workAction).toBe('repair');
      }

      if (worker.role === 'Safety Officer') {
        expect(appearance.hasRadio).toBe(true);
        expect(appearance.tool).toBe('radio');
        expect(appearance.workAction).toBe('radio');
      }
    }
  });
});

describe('personnel locomotion contract', () => {
  it('starts named personnel at stable side-aisle positions', () => {
    const first = createInitialWorkers();
    const second = createInitialWorkers();

    expect(second).toEqual(first);
    expect(first.every((worker) => Math.abs(worker.position[0]) === 10)).toBe(true);
    expect(first.every((worker) => worker.position[1] === 0)).toBe(true);
    expect(new Set(first.map((worker) => worker.position.join(','))).size).toBe(first.length);
  });

  it('maps roster ratings to credible walking speeds', () => {
    expect(normalizeWorkerSpeed(Number.NaN)).toBe(1.25);
    expect(normalizeWorkerSpeed(5)).toBeCloseTo(1.1);
    expect(normalizeWorkerSpeed(6)).toBeCloseTo(1.32);
    expect(normalizeWorkerSpeed(8)).toBeCloseTo(1.76);
    expect(normalizeWorkerSpeed(100)).toBe(1.8);
  });

  it('initializes identity motion phases deterministically', () => {
    const config = {
      id: 'w6',
      position: [10, 0, 4] as [number, number, number],
      speed: 5,
      direction: 1 as const,
      role: 'Safety Officer',
      workAction: 'radio' as const,
      task: 'Safety inspection',
      status: 'working' as const,
    };

    const first = createWorkerAnimationData(config);
    const second = createWorkerAnimationData(config);

    expect(first.speed).toBe(second.speed);
    expect(first.walkCycle).toBe(second.walkCycle);
    expect(first.workTimer).toBe(second.workTimer);
    expect(first.workPhase).toBe(second.workPhase);
    expect(first.blinkTimer).toBe(second.blinkTimer);
  });

  it('freezes personnel locomotion when the simulation clock is paused', () => {
    const manager = new WorkerAnimationManager('high');
    const group = new THREE.Group();
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(5, 3, 5);
    const config = {
      id: 'w6',
      position: [10, 0, 4] as [number, number, number],
      speed: 6,
      direction: 1 as const,
      role: 'Safety Officer',
      workAction: 'radio' as const,
      task: 'Safety inspection',
      status: 'working' as const,
    };
    manager.register(config, {
      group,
      torso: null,
      head: null,
      leftArm: null,
      rightArm: null,
      leftLeg: null,
      rightLeg: null,
      hips: null,
    });
    const nearestExit = () => ({
      id: 'east',
      label: 'East exit',
      position: { x: 55, z: 0 },
    });

    manager.updateSettings(true, 'high', 100, false, false, false, nearestExit, () => {});
    for (let frame = 0; frame < 20; frame += 1) manager.update(0.05, camera);
    expect(group.position.toArray()).toEqual([10, 0, 4]);

    manager.updateSettings(true, 'high', 100, true, false, false, nearestExit, () => {});
    for (let frame = 0; frame < 20; frame += 1) manager.update(0.05, camera);
    expect(group.position.z).toBeGreaterThan(4);
  });
});
