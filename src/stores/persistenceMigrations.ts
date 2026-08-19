type PlainRecord = Record<string, unknown>;

function asRecord(value: unknown): PlainRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as PlainRecord)
    : null;
}

function finiteNumber(value: unknown, minimum: number, maximum: number): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function stringArray(value: unknown, maximum = 500): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return [...new Set(value.filter((item): item is string => typeof item === 'string'))].slice(
    -maximum
  );
}

export interface PersistedUIState {
  hasSeenIntro?: boolean;
  showZones?: boolean;
  showAIPanel?: boolean;
  panelMinimized?: boolean;
  theme?: 'dark' | 'light';
  uiScale?: number;
  legendPosition?: { x: number; y: number };
  showMiniMap?: boolean;
  fpsMode?: boolean;
  showFPSCounter?: boolean;
  blueprintMode?: boolean;
}

export function sanitizeUIState(value: unknown): PersistedUIState {
  const source = asRecord(value);
  if (!source) return {};
  const output: PersistedUIState = {};
  const booleanKeys = [
    'hasSeenIntro',
    'showZones',
    'showAIPanel',
    'panelMinimized',
    'showMiniMap',
    'fpsMode',
    'showFPSCounter',
    'blueprintMode',
  ] as const;
  booleanKeys.forEach((key) => {
    const candidate = booleanValue(source[key]);
    if (candidate !== undefined) output[key] = candidate;
  });
  if (source.theme === 'dark' || source.theme === 'light') output.theme = source.theme;
  const uiScale = finiteNumber(source.uiScale, 0.9, 1.5);
  if (uiScale !== undefined) output.uiScale = uiScale;
  const position = asRecord(source.legendPosition);
  const x = finiteNumber(position?.x, -100000, 100000);
  const y = finiteNumber(position?.y, -100000, 100000);
  if (x !== undefined && y !== undefined) output.legendPosition = { x, y };
  return output;
}

export interface PersistedKnowledgeState {
  unlockedEntries?: string[];
  readEntries?: string[];
  showTooltips?: boolean;
  showLoadingQuotes?: boolean;
  showAINarration?: boolean;
  showUnlockNotifications?: boolean;
}

export function sanitizeKnowledgeState(value: unknown): PersistedKnowledgeState {
  const source = asRecord(value);
  if (!source) return {};
  const output: PersistedKnowledgeState = {};
  const unlockedEntries = stringArray(source.unlockedEntries, 2000);
  const readEntries = stringArray(source.readEntries, 2000);
  if (unlockedEntries) output.unlockedEntries = unlockedEntries;
  if (readEntries) output.readEntries = readEntries;
  const booleanKeys = [
    'showTooltips',
    'showLoadingQuotes',
    'showAINarration',
    'showUnlockNotifications',
  ] as const;
  booleanKeys.forEach((key) => {
    const candidate = booleanValue(source[key]);
    if (candidate !== undefined) output[key] = candidate;
  });
  return output;
}
