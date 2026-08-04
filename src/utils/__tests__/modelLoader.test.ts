import { describe, expect, it, vi } from 'vitest';
import { checkModelExists, isBundledModel } from '../modelLoader';

describe('modelLoader', () => {
  it('recognises delivery-validated bundled models without a network probe', () => {
    expect(isBundledModel('forklift')).toBe(true);
    expect(isBundledModel('worker')).toBe(true);
    expect(isBundledModel('silo')).toBe(false);
  });

  it('coalesces concurrent availability checks for optional models', async () => {
    const fetchMock = vi.fn(async () => {
      await Promise.resolve();
      return new Response(null, {
        status: 200,
        headers: { 'Content-Type': 'model/gltf-binary' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const path = '/models/test/optional-model.glb';
    const [first, second] = await Promise.all([checkModelExists(path), checkModelExists(path)]);

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(path, { method: 'HEAD' });

    vi.unstubAllGlobals();
  });
});
