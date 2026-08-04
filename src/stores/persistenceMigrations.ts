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

export interface PersistedGameSimulationState {
  gameTime?: number;
  gameSpeed?: number;
  weather?: 'clear' | 'cloudy' | 'rain' | 'storm';
  currentShift?: 'morning' | 'afternoon' | 'night';
  shiftData?: PlainRecord;
  celebrations?: {
    packerBellEnabled?: boolean;
    zeroIncidentStreak?: number;
  };
}

export function sanitizeGameSimulationState(value: unknown): PersistedGameSimulationState {
  const source = asRecord(value);
  if (!source) return {};
  const output: PersistedGameSimulationState = {};
  const gameTime = finiteNumber(source.gameTime, 0, 24);
  const gameSpeed = finiteNumber(source.gameSpeed, 0, 3600);
  if (gameTime !== undefined) output.gameTime = gameTime;
  if (gameSpeed !== undefined) output.gameSpeed = gameSpeed;
  if (
    source.weather === 'clear' ||
    source.weather === 'cloudy' ||
    source.weather === 'rain' ||
    source.weather === 'storm'
  ) {
    output.weather = source.weather;
  }
  if (
    source.currentShift === 'morning' ||
    source.currentShift === 'afternoon' ||
    source.currentShift === 'night'
  ) {
    output.currentShift = source.currentShift;
  }

  const shiftData = asRecord(source.shiftData);
  if (shiftData) {
    const sanitizedShift: PlainRecord = {};
    if (
      shiftData.currentShift === 'morning' ||
      shiftData.currentShift === 'afternoon' ||
      shiftData.currentShift === 'night'
    ) {
      sanitizedShift.currentShift = shiftData.currentShift;
    }
    const shiftStartTime = finiteNumber(shiftData.shiftStartTime, 0, Number.MAX_SAFE_INTEGER);
    if (shiftStartTime !== undefined) sanitizedShift.shiftStartTime = shiftStartTime;
    const handoverPhase = shiftData.handoverPhase;
    if (
      handoverPhase === 'idle' ||
      handoverPhase === 'briefing' ||
      handoverPhase === 'handover' ||
      handoverPhase === 'summary'
    ) {
      sanitizedShift.handoverPhase = handoverPhase;
    }
    const stringListKeys = [
      'previousShiftNotes',
      'priorities',
      'clockedInWorkerIds',
      'clockedOutWorkerIds',
    ] as const;
    stringListKeys.forEach((key) => {
      const list = stringArray(shiftData[key], 200);
      if (list) sanitizedShift[key] = list;
    });
    if (typeof shiftData.outgoingSupervisor === 'string') {
      sanitizedShift.outgoingSupervisor = shiftData.outgoingSupervisor;
    }
    if (typeof shiftData.incomingSupervisor === 'string') {
      sanitizedShift.incomingSupervisor = shiftData.incomingSupervisor;
    }
    if (Array.isArray(shiftData.shiftIncidents)) {
      sanitizedShift.shiftIncidents = shiftData.shiftIncidents
        .filter((item) => asRecord(item) !== null)
        .slice(-200);
    }
    if (Array.isArray(shiftData.workerAssignments)) {
      sanitizedShift.workerAssignments = shiftData.workerAssignments
        .filter((item) => asRecord(item) !== null)
        .slice(-200);
    }
    if (Array.isArray(shiftData.handoffConversations)) {
      sanitizedShift.handoffConversations = shiftData.handoffConversations
        .filter((item) => asRecord(item) !== null)
        .slice(-200);
    }
    const shiftProduction = asRecord(shiftData.shiftProduction);
    if (shiftProduction) {
      const target = finiteNumber(shiftProduction.target, 0, 1_000_000_000);
      const actual = finiteNumber(shiftProduction.actual, 0, 1_000_000_000);
      const efficiency = finiteNumber(shiftProduction.efficiency, 0, 1000);
      if (target !== undefined && actual !== undefined && efficiency !== undefined) {
        sanitizedShift.shiftProduction = { target, actual, efficiency };
      }
    }
    output.shiftData = sanitizedShift;
  }

  const celebrations = asRecord(source.celebrations);
  if (celebrations) {
    const packerBellEnabled = booleanValue(celebrations.packerBellEnabled);
    const zeroIncidentStreak = finiteNumber(
      celebrations.zeroIncidentStreak,
      0,
      Number.MAX_SAFE_INTEGER
    );
    output.celebrations = {
      ...(packerBellEnabled === undefined ? {} : { packerBellEnabled }),
      ...(zeroIncidentStreak === undefined ? {} : { zeroIncidentStreak }),
    };
  }
  return output;
}

export interface PersistedScenarioState {
  completedScenarios?: string[];
  scenarioHistory?: PlainRecord[];
}

export function sanitizeScenarioState(value: unknown): PersistedScenarioState {
  const source = asRecord(value);
  if (!source) return {};
  const completedScenarios = stringArray(source.completedScenarios, 500);
  const scenarioHistory = Array.isArray(source.scenarioHistory)
    ? source.scenarioHistory
        .filter((item): item is PlainRecord => asRecord(item) !== null)
        .slice(-100)
    : undefined;
  return {
    ...(completedScenarios ? { completedScenarios } : {}),
    ...(scenarioHistory ? { scenarioHistory } : {}),
  };
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
