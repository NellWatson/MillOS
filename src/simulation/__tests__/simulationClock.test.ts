import { describe, expect, it } from 'vitest';
import {
  formatSimulationTimestamp,
  fromSimulationMinutes,
  normalizeSimulationHour,
  toSimulationMinutes,
} from '../simulationClock';

describe('simulation clock contract', () => {
  it('normalizes hours without consulting wall time', () => {
    expect(normalizeSimulationHour(25.5)).toBe(1.5);
    expect(normalizeSimulationHour(-1)).toBe(23);
    expect(normalizeSimulationHour(Number.NaN)).toBe(0);
  });

  it('round-trips an elapsed simulation timestamp', () => {
    const timestamp = toSimulationMinutes({ day: 3, hour: 7.25 });
    expect(timestamp).toBe(4755);
    expect(fromSimulationMinutes(timestamp)).toEqual({ day: 3, hour: 7.25 });
    expect(formatSimulationTimestamp(timestamp)).toBe('Day 4, 07:15');
  });

  it('clamps malformed values to the simulation origin', () => {
    expect(toSimulationMinutes({ day: -2, hour: Number.NaN })).toBe(0);
    expect(fromSimulationMinutes(-10)).toEqual({ day: 0, hour: 0 });
  });
});
