import { beforeEach, describe, expect, it } from 'vitest';
import { useScenarioStore, type ScenarioChoice } from './scenarioStore';
import type { FiveAxes } from '../types/bas';

const FINAL_AXES: FiveAxes = {
  autonomyLevel: 70,
  decisionMode: 70,
  informationAccess: 80,
  evaluationDirection: 70,
  collectiveOrientation: 75,
};

const runPath = (choiceIds: string[]) => {
  const store = useScenarioStore.getState();
  store.startScenario('contamination-at-dispatch');
  const scenario = useScenarioStore.getState().activeScenario!;
  choiceIds.forEach((choiceId) => {
    const event = scenario.events.find((candidate) =>
      candidate.choices?.some((choice) => choice.id === choiceId)
    )!;
    const choice = event.choices!.find((candidate) => candidate.id === choiceId) as ScenarioChoice;
    useScenarioStore.setState({ currentTime: event.time + 1 });
    useScenarioStore.getState().recordChoice(choice.id, choice.effects, {
      eventDescription: event.description,
      eventTime: event.time,
      outcome: choice.outcome,
    });
  });
  useScenarioStore.setState({
    currentTime: scenario.duration,
    stabilityReadings: [85, 82, 88],
  });
  useScenarioStore.getState().calculateResults(FINAL_AXES, 88);
  return useScenarioStore.getState().results!;
};

describe('operational scenario scoring and debrief', () => {
  beforeEach(() => {
    useScenarioStore.getState().resetScenario();
  });

  it('ships a timed contamination incident with four consequential decisions', () => {
    const scenario = useScenarioStore.getState().getScenarioById('contamination-at-dispatch');

    expect(scenario).toMatchObject({
      category: 'operational',
      difficulty: 'advanced',
      duration: 165,
    });
    expect(scenario?.events.filter((event) => event.type === 'choice_point')).toHaveLength(4);
    expect(scenario?.learningObjectives).toHaveLength(5);
  });

  it('scores the evidence-led path materially above an unsafe dispatch path', () => {
    const strong = runPath([
      'contain-stop-hold-notify',
      'trace-batch-to-source-lots',
      'recall-affected-release-clear',
      'verify-interlock-handover-restart',
    ]);
    useScenarioStore.getState().resetScenario();
    const unsafe = runPath([
      'continue-then-investigate',
      'sample-staged-pallet',
      'release-on-visual-check',
      'restart-without-handover',
    ]);

    expect(strong.operationalMetrics?.overallScore).toBeGreaterThanOrEqual(85);
    expect(strong.operationalMetrics?.missedSafeguards).toEqual([]);
    expect(strong.operationalMetrics?.choiceAudit).toHaveLength(4);
    expect(strong.operationalMetrics?.choiceAudit[0].responseSeconds).toBe(1);
    expect(unsafe.operationalMetrics?.overallScore).toBeLessThan(50);
    expect(unsafe.operationalMetrics?.missedSafeguards.length).toBeGreaterThanOrEqual(3);
    expect(strong.operationalMetrics!.objectiveScores.safety).toBeGreaterThan(
      unsafe.operationalMetrics!.objectiveScores.safety
    );
    expect(strong.operationalMetrics!.objectiveScores.traceability).toBeGreaterThan(
      unsafe.operationalMetrics!.objectiveScores.traceability
    );
  });
});
