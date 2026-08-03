import { afterEach, describe, expect, it, vi } from 'vitest';
import { importWithBoundedRetry } from '../recoverableLazy';

describe('importWithBoundedRetry', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the first successful import result', async () => {
    const importer = vi.fn().mockResolvedValue({ default: 'feature' });

    await expect(
      importWithBoundedRetry(importer, { attempts: 2, attemptTimeoutMs: 50, retryDelayMs: 0 })
    ).resolves.toEqual({ default: 'feature' });
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('recovers from a transient import failure within the attempt budget', async () => {
    const importer = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary network failure'))
      .mockResolvedValueOnce({ default: 'feature' });

    await expect(
      importWithBoundedRetry(importer, { attempts: 2, attemptTimeoutMs: 50, retryDelayMs: 0 })
    ).resolves.toEqual({ default: 'feature' });
    expect(importer).toHaveBeenCalledTimes(2);
  });

  it('rejects after the bounded attempt budget is exhausted', async () => {
    const importer = vi.fn().mockRejectedValue(new Error('chunk unavailable'));

    await expect(
      importWithBoundedRetry(importer, { attempts: 2, attemptTimeoutMs: 50, retryDelayMs: 0 })
    ).rejects.toThrow('chunk unavailable');
    expect(importer).toHaveBeenCalledTimes(2);
  });

  it('times out an import that never settles', async () => {
    vi.useFakeTimers();
    const importer = vi.fn(() => new Promise<never>(() => undefined));
    const result = importWithBoundedRetry(importer, {
      attempts: 1,
      attemptTimeoutMs: 25,
      retryDelayMs: 0,
    });

    const expectation = expect(result).rejects.toThrow('Optional feature load exceeded 25ms');
    await vi.advanceTimersByTimeAsync(25);
    await expectation;
    expect(importer).toHaveBeenCalledTimes(1);
  });
});
