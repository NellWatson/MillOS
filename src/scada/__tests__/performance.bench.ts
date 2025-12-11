/**
 * Performance Benchmarks for SCADA Adapters
 *
 * Run with: npx vitest bench
 *
 * These benchmarks measure:
 * - Tag read throughput (operations/second)
 * - Batch read performance
 * - Memory usage patterns
 * - Subscription callback latency
 */

import { describe, bench, beforeAll, afterAll } from 'vitest';
import { SimulationAdapter } from '../adapters/SimulationAdapter';
import { MILL_TAGS } from '../tagDatabase';
import type { TagDefinition, TagValue } from '../types';

// Subset of tags for benchmarking
const BENCH_TAGS: TagDefinition[] = MILL_TAGS.slice(0, 20);

describe('SimulationAdapter Performance', () => {
  let adapter: SimulationAdapter;

  beforeAll(async () => {
    adapter = new SimulationAdapter(BENCH_TAGS);
    await adapter.connect();
  });

  afterAll(async () => {
    await adapter.disconnect();
  });

  bench('readTag - single tag read', async () => {
    await adapter.readTag('RM101.TT001.PV');
  });

  bench('readTags - batch read (5 tags)', async () => {
    await adapter.readTags([
      'RM101.TT001.PV',
      'RM101.VT001.PV',
      'RM101.ST001.PV',
      'RM101.IT001.PV',
      'RM101.FT001.PV',
    ]);
  });

  bench('readTags - batch read (20 tags)', async () => {
    const tagIds = BENCH_TAGS.map((t) => t.id);
    await adapter.readTags(tagIds);
  });

  bench('readAllTags - all tags', async () => {
    await adapter.readAllTags();
  });

  bench('writeTag - setpoint write', async () => {
    await adapter.writeTag('RM101.ST001.SP', 1500);
  });

  bench('subscribe - callback processing', () => {
    const unsubscribe = adapter.subscribe([], (values: TagValue[]) => {
      // Minimal processing - use the value to prevent optimization
      if (values.length > 0) {
        return;
      }
    });
    unsubscribe();
  });

  bench('getStatistics - stats retrieval', () => {
    adapter.getStatistics();
  });

  bench('getConnectionStatus - status retrieval', () => {
    adapter.getConnectionStatus();
  });
});

describe('Tag Value Processing', () => {
  bench('value quality check', () => {
    const value: TagValue = {
      tagId: 'RM101.TT001.PV',
      value: 45.5,
      timestamp: Date.now(),
      quality: 'GOOD',
    };
    void (value.quality === 'GOOD');
  });

  bench('value range validation', () => {
    const value = 45.5;
    const min = 0;
    const max = 100;
    const isValid = value >= min && value <= max;
    // Use the value to prevent optimization
    if (isValid) {
      return;
    }
  });

  bench('timestamp comparison', () => {
    const now = Date.now();
    const valueTime = now - 1000;
    const age = now - valueTime;
    const isStale = age > 5000;
    // Use the value to prevent optimization
    if (isStale) {
      return;
    }
  });

  bench('Map operations - get/set (1000 tags)', () => {
    const values = new Map<string, TagValue>();
    for (let i = 0; i < 1000; i++) {
      const tagId = `TAG${i}`;
      values.set(tagId, {
        tagId,
        value: Math.random() * 100,
        timestamp: Date.now(),
        quality: 'GOOD',
      });
    }
    for (let i = 0; i < 1000; i++) {
      values.get(`TAG${i}`);
    }
  });
});

describe('Alarm Evaluation Performance', () => {
  bench('threshold check - single value', () => {
    const value = 85.5;
    const hiHi = 90;
    const hi = 75;
    const lo = 25;
    const loLo = 10;

    let alarmState = 'NORMAL';
    if (value >= hiHi || value <= loLo) {
      alarmState = 'CRITICAL';
    } else if (value >= hi || value <= lo) {
      alarmState = 'WARNING';
    }
    // Use the value to prevent optimization
    if (alarmState) {
      return;
    }
  });

  bench('threshold check - batch (100 values)', () => {
    const values = Array.from({ length: 100 }, () => Math.random() * 100);
    const hiHi = 90;
    const hi = 75;
    const lo = 25;
    const loLo = 10;

    const alarms: string[] = [];
    for (const value of values) {
      if (value >= hiHi || value <= loLo) {
        alarms.push('CRITICAL');
      } else if (value >= hi || value <= lo) {
        alarms.push('WARNING');
      }
    }
    // Use the value to prevent optimization
    if (alarms.length > 0) {
      return;
    }
  });

  bench('deadband check', () => {
    const currentValue = 45.5;
    const lastValue = 45.3;
    const deadband = 0.5;
    const hasChanged = Math.abs(currentValue - lastValue) > deadband;
    // Use the value to prevent optimization
    if (hasChanged) {
      return;
    }
  });
});

describe('History Storage Performance', () => {
  const historyBuffer: Array<{ timestamp: number; value: number }> = [];

  beforeAll(() => {
    // Pre-populate buffer with 10000 points
    const now = Date.now();
    for (let i = 0; i < 10000; i++) {
      historyBuffer.push({
        timestamp: now - i * 1000,
        value: Math.random() * 100,
      });
    }
  });

  bench('history append', () => {
    historyBuffer.push({
      timestamp: Date.now(),
      value: Math.random() * 100,
    });
    // Keep buffer size bounded
    if (historyBuffer.length > 10000) {
      historyBuffer.shift();
    }
  });

  bench('history query - last 1 hour (3600 points)', () => {
    const now = Date.now();
    const startTime = now - 3600000;
    const result = historyBuffer.filter((p) => p.timestamp >= startTime);
    // Use the value to prevent optimization
    if (result.length > 0) {
      return;
    }
  });

  bench('history aggregation - average', () => {
    const sum = historyBuffer.reduce((acc, p) => acc + p.value, 0);
    const avg = sum / historyBuffer.length;
    // Use the value to prevent optimization
    if (avg > 0) {
      return;
    }
  });

  bench('history aggregation - min/max', () => {
    let min = Infinity;
    let max = -Infinity;
    for (const point of historyBuffer) {
      if (point.value < min) min = point.value;
      if (point.value > max) max = point.value;
    }
    // Use the values to prevent optimization
    if (min < max) {
      return;
    }
  });

  bench('history downsampling - LTTB (100 points)', () => {
    // Simplified LTTB (Largest Triangle Three Buckets) algorithm
    const targetPoints = 100;
    const bucketSize = Math.floor(historyBuffer.length / targetPoints);
    const result: Array<{ timestamp: number; value: number }> = [];

    for (let i = 0; i < targetPoints; i++) {
      const bucketStart = i * bucketSize;
      const bucketEnd = Math.min(bucketStart + bucketSize, historyBuffer.length);

      // Find point with largest area in bucket
      let maxArea = -1;
      let maxPoint = historyBuffer[bucketStart];

      for (let j = bucketStart; j < bucketEnd; j++) {
        const area = Math.abs(historyBuffer[j].value);
        if (area > maxArea) {
          maxArea = area;
          maxPoint = historyBuffer[j];
        }
      }
      result.push(maxPoint);
    }
    // Use the value to prevent optimization
    if (result.length > 0) {
      return;
    }
  });
});

describe('Subscription Throughput', () => {
  let adapter: SimulationAdapter;
  let callbackCount: number;

  beforeAll(async () => {
    adapter = new SimulationAdapter(BENCH_TAGS);
    await adapter.connect();
    callbackCount = 0;
  });

  afterAll(async () => {
    await adapter.disconnect();
  });

  bench('subscription callback throughput', async () => {
    await new Promise<void>((resolve) => {
      const unsubscribe = adapter.subscribe([], (_values: TagValue[]) => {
        callbackCount++;
        if (callbackCount >= 10) {
          unsubscribe();
          resolve();
        }
      });
    });
  });
});

describe('Memory Efficiency', () => {
  bench('TagValue object creation', () => {
    const values: TagValue[] = [];
    for (let i = 0; i < 100; i++) {
      values.push({
        tagId: `TAG${i}`,
        value: Math.random() * 100,
        timestamp: Date.now(),
        quality: 'GOOD',
      });
    }
    // Use the value to prevent optimization
    if (values.length > 0) {
      return;
    }
  });

  bench('Map vs Object - Map access', () => {
    const map = new Map<string, number>();
    for (let i = 0; i < 100; i++) {
      map.set(`key${i}`, i);
    }
    let sum = 0;
    for (let i = 0; i < 100; i++) {
      sum += map.get(`key${i}`) || 0;
    }
    // Use the value to prevent optimization
    if (sum > 0) {
      return;
    }
  });

  bench('Map vs Object - Object access', () => {
    const obj: Record<string, number> = {};
    for (let i = 0; i < 100; i++) {
      obj[`key${i}`] = i;
    }
    let sum = 0;
    for (let i = 0; i < 100; i++) {
      sum += obj[`key${i}`] || 0;
    }
    // Use the value to prevent optimization
    if (sum > 0) {
      return;
    }
  });
});

describe('Serialization Performance', () => {
  const sampleData = {
    tags: Array.from({ length: 90 }, (_, i) => ({
      tagId: `TAG${i}`,
      value: Math.random() * 100,
      timestamp: Date.now(),
      quality: 'GOOD' as const,
    })),
  };

  bench('JSON.stringify - 90 tag values', () => {
    const result = JSON.stringify(sampleData);
    // Use the value to prevent optimization
    if (result.length > 0) {
      return;
    }
  });

  bench('JSON.parse - 90 tag values', () => {
    const json = JSON.stringify(sampleData);
    const result = JSON.parse(json);
    // Use the value to prevent optimization
    if (result) {
      return;
    }
  });

  bench('structured clone - 90 tag values', () => {
    const result = structuredClone(sampleData);
    // Use the value to prevent optimization
    if (result) {
      return;
    }
  });
});
