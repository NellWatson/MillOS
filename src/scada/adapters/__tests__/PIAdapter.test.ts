import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { PIAdapter } from '../PIAdapter';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function response(
  body: unknown,
  options: { ok?: boolean; status?: number; statusText?: string } = {}
): Response {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    statusText: options.statusText ?? 'OK',
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function responseWithPendingBody(body: Promise<unknown>): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: vi.fn(() => body),
  } as unknown as Response;
}

async function flushMicrotasks(turns = 12): Promise<void> {
  for (let index = 0; index < turns; index += 1) await Promise.resolve();
}

function createAdapter(timeout = 50): PIAdapter {
  return new PIAdapter({
    type: 'pi',
    baseUrl: 'https://pi.example.test/piwebapi',
    serverPath: '\\\\PI\\Production',
    authMethod: 'bearer',
    bearerToken: 'test-token',
    timeout,
  });
}

const START = new Date('2026-01-01T00:00:00.000Z');
const END = new Date('2026-01-01T01:00:00.000Z');

describe('PIAdapter adversarial contracts', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('disconnect aborts an in-flight connect and rejects its late response', async () => {
    const transport = deferred<Response>();
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return transport.promise;
    });
    const adapter = createAdapter();

    const pendingConnect = adapter.connect();
    await adapter.disconnect();
    const timerCountAfterDisconnect = vi.getTimerCount();
    transport.resolve(response({ ProductVersion: '2023' }));
    const outcome = await pendingConnect.then(
      () => 'resolved',
      () => 'rejected'
    );

    expect(signal?.aborted).toBe(true);
    expect(timerCountAfterDisconnect).toBe(0);
    expect(outcome).toBe('rejected');
    expect(adapter.isConnected()).toBe(false);
  });

  it('rejects a response that arrives after its timeout even if the transport ignores abort', async () => {
    const transport = deferred<Response>();
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return transport.promise;
    });
    const adapter = createAdapter(25);

    const pendingConnect = adapter.connect();
    await vi.advanceTimersByTimeAsync(25);
    transport.resolve(response({ ProductVersion: '2023' }));
    const outcome = await pendingConnect.then(
      () => 'resolved',
      () => 'rejected'
    );

    expect(signal?.aborted).toBe(true);
    expect(outcome).toBe('rejected');
    expect(adapter.isConnected()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('uses the default timeout when configuration supplies NaN', async () => {
    const transport = deferred<Response>();
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return transport.promise;
    });
    const adapter = createAdapter(Number.NaN);

    const pendingConnect = adapter.connect();
    await vi.advanceTimersByTimeAsync(1);
    transport.resolve(response({ ProductVersion: '2023' }));
    await pendingConnect;

    expect(signal?.aborted).toBe(false);
    expect(adapter.isConnected()).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('caps an excessive request timeout at five minutes', async () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => undefined));
    const adapter = createAdapter(Number.MAX_SAFE_INTEGER);

    const pendingConnect = adapter.connect();
    await vi.advanceTimersByTimeAsync(299_999);
    expect(adapter.isConnected()).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    await expect(pendingConnect).rejects.toThrow('aborted');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('coalesces equivalent concurrent connection attempts', async () => {
    const transport = deferred<Response>();
    fetchMock.mockImplementationOnce(() => transport.promise);
    const adapter = createAdapter();

    const first = adapter.connect();
    const second = adapter.connect();
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    transport.resolve(response({ ProductVersion: '2023' }));
    await Promise.all([first, second]);

    expect(adapter.isConnected()).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps response body parsing inside the request timeout', async () => {
    const body = deferred<unknown>();
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return Promise.resolve(responseWithPendingBody(body.promise));
    });
    const adapter = createAdapter(25);

    const pending = adapter.getRecordedValues('RM101.TT001.PV', START, END);
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(25);

    await expect(pending).resolves.toEqual([]);
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);

    body.resolve({ WebId: 'stale-web-id' });
    await flushMicrotasks();
    await expect(adapter.getStatistics()).resolves.toMatchObject({ tagCount: 0 });
  });

  it('disconnect aborts pending response body parsing without caching a late body', async () => {
    const body = deferred<unknown>();
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return Promise.resolve(responseWithPendingBody(body.promise));
    });
    const adapter = createAdapter();

    const pending = adapter.getRecordedValues('RM101.TT001.PV', START, END);
    await flushMicrotasks();
    await adapter.disconnect();

    await expect(pending).resolves.toEqual([]);
    expect(signal?.aborted).toBe(true);
    body.resolve({ WebId: 'stale-web-id' });
    await flushMicrotasks();
    await expect(adapter.getStatistics()).resolves.toMatchObject({ tagCount: 0 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('coalesces concurrent WebId lookups for the same tag', async () => {
    const lookup = deferred<Response>();
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/points?')) return lookup.promise;
      return Promise.resolve(response({ Items: [] }));
    });
    const adapter = createAdapter();

    const first = adapter.getRecordedValues('RM101.TT001.PV', START, END);
    const second = adapter.getRecordedValues('RM101.TT001.PV', START, END);
    lookup.resolve(response({ WebId: 'web-id-1' }));
    await Promise.all([first, second]);

    const lookupCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/points?'));
    expect(lookupCalls).toHaveLength(1);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/recorded?'))).toHaveLength(
      2
    );
  });

  it('drops malformed history rows and returns isolated snapshots', async () => {
    const payload = {
      Items: [
        {
          Timestamp: '2026-01-01T00:00:00.000Z',
          Value: '12.5',
          Good: true,
          Questionable: false,
          Substituted: false,
        },
        {
          Timestamp: '2026-01-01T00:01:00.000Z',
          Value: true,
          Good: true,
          Questionable: true,
          Substituted: false,
        },
        {
          Timestamp: 'invalid',
          Value: 4,
          Good: true,
          Questionable: false,
          Substituted: false,
        },
        {
          Timestamp: '2026-01-01T00:02:00.000Z',
          Value: Number.POSITIVE_INFINITY,
          Good: true,
          Questionable: false,
          Substituted: false,
        },
        {
          Timestamp: '2026-01-01T00:03:00.000Z',
          Value: '12broken',
          Good: true,
          Questionable: false,
          Substituted: false,
        },
        null,
      ],
    };
    fetchMock
      .mockResolvedValueOnce(response({ WebId: 'web-id-1' }))
      .mockResolvedValueOnce(response(payload))
      .mockResolvedValueOnce(response(payload));
    const adapter = createAdapter();

    const first = await adapter.getRecordedValues('RM101.TT001.PV', START, END);
    first[0].value = 999;
    const second = await adapter.getRecordedValues('RM101.TT001.PV', START, END);

    expect(second).toEqual([
      { timestamp: START.getTime(), value: 12.5, quality: 'GOOD' },
      {
        timestamp: new Date('2026-01-01T00:01:00.000Z').getTime(),
        value: 1,
        quality: 'UNCERTAIN',
      },
    ]);
    expect(second).not.toBe(first);
    expect(second[0]).not.toBe(first[0]);
  });

  it('contains transport read failures after a successful WebId lookup', async () => {
    fetchMock
      .mockResolvedValueOnce(response({ WebId: 'web-id-1' }))
      .mockRejectedValueOnce(new Error('historian offline'));
    const adapter = createAdapter();

    await expect(adapter.getRecordedValues('RM101.TT001.PV', START, END)).resolves.toEqual([]);
    expect(adapter.isConnected()).toBe(false);
  });

  it('rejects invalid ranges before network access', async () => {
    const adapter = createAdapter();

    await expect(
      adapter.getRecordedValues('RM101.TT001.PV', new Date(Number.NaN), END)
    ).resolves.toEqual([]);
    await expect(adapter.getPlotValues('RM101.TT001.PV', END, START, 100)).resolves.toEqual([]);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normalizes non-finite query limits and caps hostile finite limits', async () => {
    fetchMock
      .mockResolvedValueOnce(response({ WebId: 'web-id-1' }))
      .mockResolvedValueOnce(response({ Items: [] }))
      .mockResolvedValueOnce(response({ Items: [] }))
      .mockResolvedValueOnce(response({ Items: [] }));
    const adapter = createAdapter();

    await adapter.getRecordedValues('RM101.TT001.PV', START, END, {
      maxPoints: Number.NaN,
    });
    await adapter.getRecordedValues('RM101.TT001.PV', START, END, {
      maxPoints: Number.MAX_SAFE_INTEGER,
    });
    await adapter.getPlotValues('RM101.TT001.PV', START, END, Number.MAX_SAFE_INTEGER);

    expect(String(fetchMock.mock.calls[1][0])).toContain('maxCount=10000');
    expect(String(fetchMock.mock.calls[2][0])).toContain('maxCount=100000');
    expect(String(fetchMock.mock.calls[3][0])).toContain('intervals=100000');
  });

  it('rejects malformed or oversized batches before allocating transport work', async () => {
    const adapter = createAdapter();
    const tagIds = Array.from({ length: 257 }, (_, index) => `TAG.${index}`);

    await expect(adapter.getMultipleTagHistory(tagIds, START, END)).rejects.toThrow(
      'limited to 256 tags'
    );
    await expect(adapter.getMultipleTagHistory([''], START, END)).rejects.toThrow(
      'non-empty strings'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('limits multi-tag transport fanout to eight requests', async () => {
    const bodies: Array<Deferred<unknown>> = [];
    let nextWebId = 0;
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/points?')) {
        nextWebId += 1;
        return Promise.resolve(response({ WebId: `web-id-${nextWebId}` }));
      }
      const body = deferred<unknown>();
      bodies.push(body);
      return Promise.resolve(responseWithPendingBody(body.promise));
    });
    const adapter = createAdapter();
    const tagIds = [...Array.from({ length: 8 }, (_, index) => `TAG.${index}`), '__proto__'];

    const pending = adapter.getMultipleTagHistory(tagIds, START, END);
    await flushMicrotasks(40);
    expect(bodies).toHaveLength(8);

    bodies[0]?.resolve({ Items: [] });
    await flushMicrotasks(40);
    expect(bodies).toHaveLength(9);

    for (const body of bodies.slice(1)) body.resolve({ Items: [] });
    await expect(pending).resolves.toEqual(Object.fromEntries(tagIds.map((tagId) => [tagId, []])));
    expect(vi.getTimerCount()).toBe(0);
  });
});
