import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { HistoryStore } from '../HistoryStore';
import type { TagValue } from '../types';

const originalIndexedDB = (globalThis as any).indexedDB;

describe('HistoryStore fallback', () => {
  beforeAll(() => {
    (globalThis as any).indexedDB = undefined;
  });

  afterAll(() => {
    (globalThis as any).indexedDB = originalIndexedDB;
  });

  it('initializes without IndexedDB and no-ops safely', async () => {
    const store = new HistoryStore();
    await expect(store.init()).resolves.toBeUndefined();

    const sample: TagValue = {
      tagId: 'TEST.TAG',
      value: 1,
      quality: 'GOOD',
      timestamp: Date.now(),
    };

    store.writeTagValue(sample);
    await expect(store.getHistory('TEST.TAG', 0, Date.now())).resolves.toEqual([]);
    await expect(store.getAlarmHistory(0, Date.now())).resolves.toEqual([]);
  });
});
