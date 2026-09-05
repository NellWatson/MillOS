import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAIConfigStore } from '../../stores/aiConfigStore';

describe('Strategic AI state integration', () => {
  const initialState = useAIConfigStore.getInitialState();

  beforeEach(() => {
    useAIConfigStore.setState(initialState, true);
  });

  afterEach(() => {
    useAIConfigStore.setState(initialState, true);
    vi.useRealTimers();
  });

  it('starts from the authored visualization defaults', () => {
    const state = useAIConfigStore.getState();
    expect({
      cascade: state.showCascadeVisualization,
      cost: state.showCostOverlay,
      energy: state.showEnergyDashboard,
      multiObjective: state.showMultiObjective,
      productionTarget: state.showProductionTarget,
      strategic: state.showStrategicOverlay,
      vclDebug: state.showVCLDebug,
    }).toEqual({
      cascade: false,
      cost: false,
      energy: false,
      multiObjective: false,
      productionTarget: false,
      strategic: false,
      vclDebug: true,
    });
  });

  it.each([
    ['showCascadeVisualization', 'setShowCascadeVisualization'],
    ['showCostOverlay', 'setShowCostOverlay'],
    ['showEnergyDashboard', 'setShowEnergyDashboard'],
    ['showMultiObjective', 'setShowMultiObjective'],
    ['showProductionTarget', 'setShowProductionTarget'],
    ['showStrategicOverlay', 'setShowStrategicOverlay'],
    ['showVCLDebug', 'setShowVCLDebug'],
  ] as const)('updates %s through its public action', (field, action) => {
    useAIConfigStore.getState()[action](true);
    expect(useAIConfigStore.getState()[field]).toBe(true);

    useAIConfigStore.getState()[action](false);
    expect(useAIConfigStore.getState()[field]).toBe(false);
  });

  it('records strategic priorities at the action timestamp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-20T12:34:56.000Z'));

    useAIConfigStore
      .getState()
      .setStrategicPriorities(['Protect the roller mill', 'Preserve product quality']);

    expect(useAIConfigStore.getState().strategic).toMatchObject({
      legacyPriorities: ['Protect the roller mill', 'Preserve product quality'],
      lastDecisionTime: Date.parse('2026-08-20T12:34:56.000Z'),
      isThinking: false,
    });
  });

  it('tracks both transitions of strategic thinking state', () => {
    useAIConfigStore.getState().setStrategicThinking(true);
    expect(useAIConfigStore.getState().strategic.isThinking).toBe(true);

    useAIConfigStore.getState().setStrategicThinking(false);
    expect(useAIConfigStore.getState().strategic.isThinking).toBe(false);
  });
});
