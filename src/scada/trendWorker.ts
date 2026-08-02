/// <reference lib="webworker" />

import {
  mergeAndDownsampleTrendHistory,
  type TrendProcessingRequest,
  type TrendProcessingResponse,
} from './trendProcessing';

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.onmessage = (event: MessageEvent<TrendProcessingRequest>) => {
  const { id, tagIds, histories, maxRows } = event.data;
  workerScope.postMessage({
    id,
    rows: mergeAndDownsampleTrendHistory(tagIds, histories, maxRows),
  } satisfies TrendProcessingResponse);
};

export {};
