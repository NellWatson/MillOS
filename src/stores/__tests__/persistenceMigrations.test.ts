import { describe, expect, it } from 'vitest';
import {
  sanitizeGameSimulationState,
  sanitizeKnowledgeState,
  sanitizeScenarioState,
  sanitizeUIState,
} from '../persistenceMigrations';

describe('persistence migrations', () => {
  it('loads a clean first run from absent or malformed roots', () => {
    expect(sanitizeUIState(null)).toEqual({});
    expect(sanitizeGameSimulationState('broken')).toEqual({});
    expect(sanitizeScenarioState([])).toEqual({});
    expect(sanitizeKnowledgeState(undefined)).toEqual({});
  });

  it('preserves supported UI choices and discards corrupt values', () => {
    expect(
      sanitizeUIState({
        hasSeenIntro: true,
        theme: 'dark',
        uiScale: 9,
        showFPSCounter: false,
        legendPosition: { x: 50, y: Number.NaN },
        fpsMode: 'yes',
      })
    ).toEqual({
      hasSeenIntro: true,
      theme: 'dark',
      uiScale: 1.5,
      showFPSCounter: false,
    });
  });

  it('clamps simulation values and rebuilds only supported nested state', () => {
    expect(
      sanitizeGameSimulationState({
        gameTime: 99,
        gameSpeed: -1,
        weather: 'snow',
        currentShift: 'night',
        shiftData: {
          currentShift: 'night',
          priorities: ['Inspect mill', 42, 'Inspect mill'],
          shiftProduction: { target: 100, actual: 80, efficiency: 80 },
          handoffConversations: 'broken',
        },
        celebrations: { packerBellEnabled: true, zeroIncidentStreak: -4 },
      })
    ).toEqual({
      gameTime: 24,
      gameSpeed: 0,
      currentShift: 'night',
      shiftData: {
        currentShift: 'night',
        priorities: ['Inspect mill'],
        shiftProduction: { target: 100, actual: 80, efficiency: 80 },
      },
      celebrations: { packerBellEnabled: true, zeroIncidentStreak: 0 },
    });
  });

  it('bounds scenario history and filters knowledge collections', () => {
    const history = Array.from({ length: 120 }, (_, index) => ({ id: index }));
    expect(
      sanitizeScenarioState({
        completedScenarios: ['one', 2, 'one', 'two'],
        scenarioHistory: [...history, 'broken'],
      })
    ).toMatchObject({
      completedScenarios: ['one', 'two'],
      scenarioHistory: history.slice(-100),
    });
    expect(
      sanitizeKnowledgeState({
        unlockedEntries: ['a', 3, 'a'],
        readEntries: 'broken',
        showTooltips: false,
        showAINarration: 'yes',
      })
    ).toEqual({
      unlockedEntries: ['a'],
      showTooltips: false,
    });
  });
});
