import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TagHistoryPoint } from '../types';

const WORKER_TIMEOUT_MS = 5_000;

type TrendModule = typeof import('../trendProcessing');

class ControllableWorker {
  static instances: ControllableWorker[] = [];
  static constructorError: Error | null = null;

  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  posted: unknown[] = [];
  postMessageError: Error | null = null;
  terminated = false;

  constructor() {
    if (ControllableWorker.constructorError) throw ControllableWorker.constructorError;
    ControllableWorker.instances.push(this);
  }

  postMessage(message: unknown): void {
    this.posted.push(message);
    if (this.postMessageError) throw this.postMessageError;
  }

  terminate(): void {
    this.terminated = true;
  }

  emitMessage(data: unknown): void {
    this.onmessage?.({ data } as MessageEvent);
  }

  emitError(message = 'worker crashed'): void {
    this.onerror?.({ message } as ErrorEvent);
  }

  emitMessageError(): void {
    this.onmessageerror?.({ data: undefined } as MessageEvent);
  }
}

const history = (value: number): TagHistoryPoint[][] => [
  [{ timestamp: 1_100, value, quality: 'GOOD' }],
];

const expectedRows = (value: number) => [{ timestamp: 1_000, tag: value, tag__quality: 'GOOD' }];

interface PostedTrendRequest {
  id: number;
  tagIds: string[];
  histories: TagHistoryPoint[][];
  maxRows: number;
}

const postedRequest = (worker: ControllableWorker, index = 0): PostedTrendRequest =>
  worker.posted[index] as PostedTrendRequest;

const requestId = (worker: ControllableWorker, index = 0): number =>
  postedRequest(worker, index).id;

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('SCADA trend worker lifecycle', () => {
  let trend: TrendModule;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    ControllableWorker.instances = [];
    ControllableWorker.constructorError = null;
    vi.stubGlobal('Worker', ControllableWorker);
    trend = await import('../trendProcessing');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('falls back locally when constructing the worker throws', async () => {
    ControllableWorker.constructorError = new Error('worker unavailable');

    await expect(trend.processTrendHistory(['tag'], history(11))).resolves.toEqual(
      expectedRows(11)
    );
    expect(ControllableWorker.instances).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cleans the admitted job and replaces a worker whose postMessage throws', async () => {
    const firstPromise = trend.processTrendHistory(['tag'], history(12));
    const firstWorker = ControllableWorker.instances[0];
    firstWorker.postMessageError = new Error('structured clone failed');
    const secondPromise = trend.processTrendHistory(['tag'], history(13));

    await expect(firstPromise).resolves.toEqual(expectedRows(12));
    await expect(secondPromise).resolves.toEqual(expectedRows(13));
    expect(firstWorker.terminated).toBe(true);
    expect(vi.getTimerCount()).toBe(0);

    const replacementPromise = trend.processTrendHistory(['tag'], history(14));
    const replacement = ControllableWorker.instances[1];
    expect(replacement).toBeDefined();
    replacement.emitMessage({ id: requestId(replacement), rows: expectedRows(14) });
    await expect(replacementPromise).resolves.toEqual(expectedRows(14));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('times out a silent worker, settles every admitted job, and clears every timer', async () => {
    let firstSettled = false;
    let secondSettled = false;
    const firstPromise = trend.processTrendHistory(['tag'], history(21)).then((rows) => {
      firstSettled = true;
      return rows;
    });
    const secondPromise = trend.processTrendHistory(['tag'], history(22)).then((rows) => {
      secondSettled = true;
      return rows;
    });
    const activeWorker = ControllableWorker.instances[0];

    expect(vi.getTimerCount()).toBe(2);
    await vi.advanceTimersByTimeAsync(WORKER_TIMEOUT_MS - 1);
    expect([firstSettled, secondSettled]).toEqual([false, false]);

    await vi.advanceTimersByTimeAsync(1);
    expect([firstSettled, secondSettled]).toEqual([true, true]);
    await expect(firstPromise).resolves.toEqual(expectedRows(21));
    await expect(secondPromise).resolves.toEqual(expectedRows(22));
    expect(activeWorker.terminated).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['error', 'messageerror'] as const)(
    'falls back and resets the worker after a worker %s event',
    async (failure) => {
      const promise = trend.processTrendHistory(['tag'], history(31));
      const activeWorker = ControllableWorker.instances[0];

      if (failure === 'error') activeWorker.emitError();
      else activeWorker.emitMessageError();

      await expect(promise).resolves.toEqual(expectedRows(31));
      expect(activeWorker.terminated).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    }
  );

  it.each([
    ['missing request id', { id: undefined, rows: [] }],
    ['non-array rows', { rows: 'corrupt' }],
    ['non-finite timestamp', { rows: [{ timestamp: Number.NaN, tag: 41 }] }],
    ['invalid quality', { rows: [{ timestamp: 1_000, tag__quality: 'BROKEN' }] }],
    ['non-finite value', { rows: [{ timestamp: 1_000, tag: Number.POSITIVE_INFINITY }] }],
    ['value without quality', { rows: [{ timestamp: 1_000, tag: 41 }] }],
    ['good quality without value', { rows: [{ timestamp: 1_000, tag__quality: 'GOOD' }] }],
    ['bad quality with a value', { rows: [{ timestamp: 1_000, tag: 41, tag__quality: 'BAD' }] }],
  ])('falls back for a malformed response with %s', async (_name, response) => {
    const promise = trend.processTrendHistory(['tag'], history(41));
    const activeWorker = ControllableWorker.instances[0];
    const id = requestId(activeWorker);
    let result: Awaited<typeof promise> | undefined;
    void promise.then((rows) => {
      result = rows;
    });

    activeWorker.emitMessage({ id, ...response });
    await flushMicrotasks();

    expect(result).toEqual(expectedRows(41));
    expect(activeWorker.terminated).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('sanitizes corrupt source history when a malformed worker response triggers fallback', async () => {
    const corruptHistory = [
      { timestamp: 1_100, value: 43, quality: 'GOOD' },
      { timestamp: Number.NaN, value: 99, quality: 'GOOD' },
      { timestamp: 2_100, value: Number.POSITIVE_INFINITY, quality: 'GOOD' },
      { timestamp: 3_100, value: 99, quality: 'BROKEN' },
    ] as unknown as TagHistoryPoint[];
    const promise = trend.processTrendHistory(['tag'], [corruptHistory]);
    const activeWorker = ControllableWorker.instances[0];

    activeWorker.emitMessage({
      id: requestId(activeWorker),
      rows: [{ timestamp: Number.NaN, tag: 99, tag__quality: 'GOOD' }],
    });

    await expect(promise).resolves.toEqual(expectedRows(43));
    expect(activeWorker.terminated).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects a valid-shaped worker response that exceeds the requested row ceiling', async () => {
    const promise = trend.processTrendHistory(['tag'], history(44), 2);
    const activeWorker = ControllableWorker.instances[0];

    activeWorker.emitMessage({
      id: requestId(activeWorker),
      rows: [
        { timestamp: 1_000, tag: 1, tag__quality: 'GOOD' },
        { timestamp: 2_000, tag: 2, tag__quality: 'GOOD' },
        { timestamp: 3_000, tag: 3, tag__quality: 'GOOD' },
      ],
    });

    await expect(promise).resolves.toEqual(expectedRows(44));
    expect(activeWorker.terminated).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('bounds, sanitizes, and snapshots worker input before retaining or cloning it', async () => {
    const source = Array.from({ length: trend.MAX_TREND_INPUT_POINTS + 1 }, (_, index) => ({
      timestamp: index * 1_000,
      value: index,
      quality: 'GOOD' as const,
      ignoredPayload: 'must not be cloned',
    }));
    const promise = trend.processTrendHistory(
      ['tag', 'timestamp', '__proto__', `tag${trend.TREND_QUALITY_SUFFIX}`],
      [source, history(101)[0], history(102)[0], history(103)[0]],
      Number.POSITIVE_INFINITY
    );
    const activeWorker = ControllableWorker.instances[0];
    const posted = postedRequest(activeWorker);

    expect(posted.tagIds).toEqual(['tag']);
    expect(posted.maxRows).toBe(trend.MAX_TREND_ROWS);
    expect(posted.histories[0]).toHaveLength(trend.MAX_TREND_INPUT_POINTS);
    expect(posted.histories[0][0]).toEqual({ timestamp: 0, value: 0, quality: 'GOOD' });
    expect(posted.histories[0][0]).not.toBe(source[0]);
    expect(posted.histories[0].at(-1)?.timestamp).toBe(trend.MAX_TREND_INPUT_POINTS * 1_000);

    source[0].value = 999;
    activeWorker.emitError();
    const rows = await promise;

    expect(rows).toHaveLength(trend.MAX_TREND_ROWS);
    expect(rows[0]).toEqual({ timestamp: 0, tag: 0, tag__quality: 'GOOD' });
    expect(rows.at(-1)?.tag).toBe(trend.MAX_TREND_INPUT_POINTS);
    expect(activeWorker.terminated).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('caps worker tag cardinality before allocating response key sets', async () => {
    const tagIds = Array.from({ length: trend.MAX_TREND_TAGS + 1 }, (_, index) => `tag-${index}`);
    const histories = tagIds.map((_, index) => [
      { timestamp: 1_100, value: index, quality: 'GOOD' as const },
    ]);
    const promise = trend.processTrendHistory(tagIds, histories);
    const activeWorker = ControllableWorker.instances[0];

    expect(postedRequest(activeWorker).tagIds).toEqual(tagIds.slice(0, trend.MAX_TREND_TAGS));
    activeWorker.emitError();
    const rows = await promise;

    expect(rows).toHaveLength(1);
    expect(rows[0][`tag-${trend.MAX_TREND_TAGS - 1}`]).toBe(trend.MAX_TREND_TAGS - 1);
    expect(rows[0][`tag-${trend.MAX_TREND_TAGS}`]).toBeUndefined();
    expect(activeWorker.terminated).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('caps pending worker admission and releases every admitted timer after completion', async () => {
    const admitted = Array.from({ length: trend.MAX_PENDING_TREND_JOBS }, (_, index) =>
      trend.processTrendHistory(['tag'], history(60 + index))
    );
    const activeWorker = ControllableWorker.instances[0];
    const overflow = trend.processTrendHistory(['tag'], history(99));

    expect(activeWorker.posted).toHaveLength(trend.MAX_PENDING_TREND_JOBS);
    expect(vi.getTimerCount()).toBe(trend.MAX_PENDING_TREND_JOBS);
    await expect(overflow).resolves.toEqual(expectedRows(99));

    admitted.forEach((_promise, index) => {
      activeWorker.emitMessage({
        id: requestId(activeWorker, index),
        rows: expectedRows(60 + index),
      });
    });
    await expect(Promise.all(admitted)).resolves.toEqual(
      Array.from({ length: trend.MAX_PENDING_TREND_JOBS }, (_, index) => expectedRows(60 + index))
    );
    expect(activeWorker.terminated).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ignores unknown and late responses without corrupting a live job', async () => {
    const firstPromise = trend.processTrendHistory(['tag'], history(51));
    const activeWorker = ControllableWorker.instances[0];
    const firstId = requestId(activeWorker);
    activeWorker.emitMessage({ id: firstId, rows: expectedRows(51) });
    await expect(firstPromise).resolves.toEqual(expectedRows(51));
    expect(vi.getTimerCount()).toBe(0);

    let secondSettled = false;
    const secondPromise = trend.processTrendHistory(['tag'], history(52)).then((rows) => {
      secondSettled = true;
      return rows;
    });
    const secondId = requestId(activeWorker, 1);

    activeWorker.emitMessage({ id: firstId, rows: expectedRows(999) });
    activeWorker.emitMessage({ id: secondId + 1_000, rows: expectedRows(999) });
    await flushMicrotasks();
    expect(secondSettled).toBe(false);
    expect(activeWorker.terminated).toBe(false);
    expect(vi.getTimerCount()).toBe(1);

    activeWorker.emitMessage({ id: secondId, rows: expectedRows(52) });
    await expect(secondPromise).resolves.toEqual(expectedRows(52));
    expect(vi.getTimerCount()).toBe(0);
  });
});
