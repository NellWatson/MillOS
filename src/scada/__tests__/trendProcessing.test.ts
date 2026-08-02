import { describe, expect, it } from 'vitest';
import { mergeAndDownsampleTrendHistory, TREND_QUALITY_SUFFIX } from '../trendProcessing';

describe('SCADA trend processing', () => {
  it('preserves bad-quality samples as explicit gaps', () => {
    const tagId = 'RM101.TT001.PV';
    const rows = mergeAndDownsampleTrendHistory(
      [tagId],
      [
        [
          { timestamp: 1_100, value: 42, quality: 'GOOD' },
          { timestamp: 2_100, value: 99, quality: 'BAD' },
        ],
      ]
    );

    expect(rows[0][tagId]).toBe(42);
    expect(rows[1][tagId]).toBeUndefined();
    expect(rows[1][`${tagId}${TREND_QUALITY_SUFFIX}`]).toBe('BAD');
  });

  it('bounds long ranges while preserving first and last samples', () => {
    const history = Array.from({ length: 2_000 }, (_, index) => ({
      timestamp: index * 1_000,
      value: index,
      quality: 'GOOD' as const,
    }));
    const rows = mergeAndDownsampleTrendHistory(['tag'], [history], 100);

    expect(rows).toHaveLength(100);
    expect(rows[0].timestamp).toBe(0);
    expect(rows.at(-1)?.timestamp).toBe(1_999_000);
  });
});
