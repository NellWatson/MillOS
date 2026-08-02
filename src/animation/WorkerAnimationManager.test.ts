import { describe, expect, it } from 'vitest';
import { getInitialWorkerLod, resolveWorkerLod } from './WorkerAnimationManager';

describe('getInitialWorkerLod', () => {
  it('stages personnel assets on Medium without reducing High or Ultra detail', () => {
    expect(getInitialWorkerLod('low')).toBe('low');
    expect(getInitialWorkerLod('medium')).toBe('medium');
    expect(getInitialWorkerLod('high')).toBe('high');
    expect(getInitialWorkerLod('ultra')).toBe('high');
  });
});

describe('resolveWorkerLod', () => {
  it('keeps Low quality on the billboard model at every distance', () => {
    expect(
      resolveWorkerLod({
        quality: 'low',
        current: 'high',
        distance: 0,
        lodDistance: 15,
      })
    ).toBe('low');
  });

  it('allows Medium quality to show detailed personnel at conversational distance', () => {
    expect(
      resolveWorkerLod({
        quality: 'medium',
        current: 'medium',
        distance: 12,
        lodDistance: 35,
      })
    ).toBe('high');
  });

  it('uses hysteresis to keep a detailed Medium worker stable near the exit boundary', () => {
    expect(
      resolveWorkerLod({
        quality: 'medium',
        current: 'high',
        distance: 27,
        lodDistance: 35,
      })
    ).toBe('high');
    expect(
      resolveWorkerLod({
        quality: 'medium',
        current: 'high',
        distance: 29,
        lodDistance: 35,
      })
    ).toBe('medium');
  });

  it('reserves the billboard for personnel beyond the medium visibility band', () => {
    expect(
      resolveWorkerLod({
        quality: 'medium',
        current: 'medium',
        distance: 61,
        lodDistance: 35,
      })
    ).toBe('low');
    expect(
      resolveWorkerLod({
        quality: 'medium',
        current: 'low',
        distance: 50,
        lodDistance: 35,
      })
    ).toBe('medium');
  });

  it('handles invalid measurements conservatively', () => {
    expect(
      resolveWorkerLod({
        quality: 'high',
        current: 'medium',
        distance: Number.NaN,
        lodDistance: 55,
      })
    ).toBe('low');
  });
});
