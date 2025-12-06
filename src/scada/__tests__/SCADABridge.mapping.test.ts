import { describe, it, expect } from 'vitest';
import { scadaToStoreMetrics } from '../SCADABridge';
import type { Alarm, TagValue } from '../types';

describe('scadaToStoreMetrics', () => {
  it('maps machine names to tag prefixes for legacy IDs', () => {
    const now = Date.now();
    const values = new Map<string, TagValue>([
      ['RM101.ST001.PV', { tagId: 'RM101.ST001.PV', value: 450, quality: 'GOOD', timestamp: now }],
      ['RM101.TT001.PV', { tagId: 'RM101.TT001.PV', value: 55, quality: 'GOOD', timestamp: now }],
    ]);

    const result = scadaToStoreMetrics('mill-legacy', values, [] as Alarm[], 'RM-101');
    expect(result).not.toBeNull();
    expect(result?.metrics.rpm).toBe(450);
    expect(result?.metrics.temperature).toBe(55);
  });
});
