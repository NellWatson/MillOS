import { afterEach, describe, expect, it } from 'vitest';
import {
  CAMERA_PRESETS,
  shouldResolveCameraCollisionForFrame,
  useCameraStore,
} from './CameraController';

describe('camera animation ownership', () => {
  afterEach(() => {
    useCameraStore.setState({
      activePreset: null,
      targetPosition: null,
      targetLookAt: null,
      isAnimating: false,
    });
  });

  it('starts a valid preset flight with the authored pose', () => {
    useCameraStore.getState().setPreset(4);
    const state = useCameraStore.getState();

    expect(state.activePreset).toBe(4);
    expect(state.isAnimating).toBe(true);
    expect(state.targetPosition?.toArray()).toEqual(CAMERA_PRESETS[4].position);
    expect(state.targetLookAt?.toArray()).toEqual(CAMERA_PRESETS[4].target);
  });

  it('releases the preset completely when manual input takes ownership', () => {
    useCameraStore.getState().setPreset(2);
    useCameraStore.getState().cancelAnimation();

    expect(useCameraStore.getState()).toMatchObject({
      activePreset: null,
      targetPosition: null,
      targetLookAt: null,
      isAnimating: false,
    });
  });

  it('finishes an automatic flight without losing the selected preset', () => {
    useCameraStore.getState().setPreset(0);
    useCameraStore.getState().clearAnimation();

    expect(useCameraStore.getState().activePreset).toBe(0);
    expect(useCameraStore.getState().isAnimating).toBe(false);
  });

  it('lets authored flights cross zone boundaries while keeping manual movement protected', () => {
    expect(shouldResolveCameraCollisionForFrame(true, false)).toBe(false);
    expect(shouldResolveCameraCollisionForFrame(true, true)).toBe(true);
    expect(shouldResolveCameraCollisionForFrame(false, false)).toBe(true);
  });
});
