import type { Quality, TagHistoryPoint } from './types';

export const TREND_QUALITY_SUFFIX = '__quality';
export const MAX_TREND_ROWS = 900;

export interface TrendRow {
  timestamp: number;
  [key: string]: number | Quality | undefined;
}

export interface TrendProcessingRequest {
  id: number;
  tagIds: string[];
  histories: TagHistoryPoint[][];
  maxRows?: number;
}

export interface TrendProcessingResponse {
  id: number;
  rows: TrendRow[];
}

/**
 * Aligns historian samples to one-second buckets and deliberately leaves bad
 * or stale samples as gaps. The quality field remains available to the table
 * and export surfaces instead of being silently interpolated.
 */
export function mergeAndDownsampleTrendHistory(
  tagIds: string[],
  histories: TagHistoryPoint[][],
  maxRows = MAX_TREND_ROWS
): TrendRow[] {
  const timeMap = new Map<number, TrendRow>();

  tagIds.forEach((tagId, historyIndex) => {
    for (const point of histories[historyIndex] ?? []) {
      const timestamp = Math.floor(point.timestamp / 1000) * 1000;
      const row = timeMap.get(timestamp) ?? { timestamp };
      row[`${tagId}${TREND_QUALITY_SUFFIX}`] = point.quality;
      if (point.quality === 'GOOD' || point.quality === 'UNCERTAIN') {
        row[tagId] = point.value;
      } else {
        delete row[tagId];
      }
      timeMap.set(timestamp, row);
    }
  });

  const rows = Array.from(timeMap.values()).sort((left, right) => left.timestamp - right.timestamp);
  if (rows.length <= maxRows) return rows;

  const sampled: TrendRow[] = [rows[0]];
  const interiorCount = Math.max(0, maxRows - 2);
  const stride = (rows.length - 2) / Math.max(1, interiorCount);
  for (let index = 0; index < interiorCount; index += 1) {
    sampled.push(rows[1 + Math.floor(index * stride)]);
  }
  sampled.push(rows[rows.length - 1]);
  return sampled;
}

let nextRequestId = 1;
let worker: Worker | null = null;
const pending = new Map<
  number,
  { resolve: (rows: TrendRow[]) => void; reject: (error: Error) => void }
>();

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (worker) return worker;

  worker = new Worker(new URL('./trendWorker.ts', import.meta.url), {
    type: 'module',
    name: 'millos-scada-trends',
  });
  worker.onmessage = (event: MessageEvent<TrendProcessingResponse>) => {
    const job = pending.get(event.data.id);
    if (!job) return;
    pending.delete(event.data.id);
    job.resolve(event.data.rows);
  };
  worker.onerror = (event) => {
    const error = new Error(event.message || 'SCADA trend worker failed');
    pending.forEach((job) => job.reject(error));
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

export async function processTrendHistory(
  tagIds: string[],
  histories: TagHistoryPoint[][],
  maxRows = MAX_TREND_ROWS
): Promise<TrendRow[]> {
  const activeWorker = getWorker();
  if (!activeWorker) {
    return mergeAndDownsampleTrendHistory(tagIds, histories, maxRows);
  }

  const id = nextRequestId++;
  return new Promise<TrendRow[]>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    activeWorker.postMessage({ id, tagIds, histories, maxRows } satisfies TrendProcessingRequest);
  }).catch(() => mergeAndDownsampleTrendHistory(tagIds, histories, maxRows));
}
