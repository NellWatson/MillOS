export interface SimulationClockSnapshot {
  readonly day: number;
  readonly hour: number;
}

export const MINUTES_PER_DAY = 24 * 60;

export function normalizeSimulationHour(hour: number): number {
  if (!Number.isFinite(hour)) return 0;
  return ((hour % 24) + 24) % 24;
}

/**
 * Canonical replay timestamp. Simulation events use elapsed simulation minutes,
 * while UI cooldowns and network freshness may continue to use wall time.
 */
export function toSimulationMinutes({ day, hour }: SimulationClockSnapshot): number {
  const safeDay = Number.isFinite(day) ? Math.max(0, Math.trunc(day)) : 0;
  return safeDay * MINUTES_PER_DAY + normalizeSimulationHour(hour) * 60;
}

export function fromSimulationMinutes(totalMinutes: number): SimulationClockSnapshot {
  const safeMinutes = Number.isFinite(totalMinutes) ? Math.max(0, totalMinutes) : 0;
  return {
    day: Math.floor(safeMinutes / MINUTES_PER_DAY),
    hour: (safeMinutes % MINUTES_PER_DAY) / 60,
  };
}

export function formatSimulationTimestamp(totalMinutes: number): string {
  const { day, hour } = fromSimulationMinutes(totalMinutes);
  const wholeHour = Math.floor(hour);
  const minute = Math.floor((hour - wholeHour) * 60 + 1e-6);
  return `Day ${day + 1}, ${String(wholeHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
