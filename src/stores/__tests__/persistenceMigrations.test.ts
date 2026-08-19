import { describe, expect, it } from 'vitest';
import { sanitizeKnowledgeState, sanitizeUIState } from '../persistenceMigrations';

describe('persistence migrations', () => {
  it('loads a clean first run from absent or malformed roots', () => {
    expect(sanitizeUIState(null)).toEqual({});
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

  it('filters autonomous Datalink collections', () => {
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
