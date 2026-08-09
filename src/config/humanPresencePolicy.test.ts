import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FEATURE_FLAGS, HUMAN_PRESENCE_POLICY } from './featureFlags';

const source = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('v0.40 uncrewed-site contract', () => {
  it('keeps every human-presence policy switch immutable and disabled', () => {
    expect(Object.isFrozen(HUMAN_PRESENCE_POLICY)).toBe(true);
    expect(Object.values(HUMAN_PRESENCE_POLICY)).toEqual([false, false, false, false, false]);
    expect(FEATURE_FLAGS.WORKER_DIALOGUE_ENABLED).toBe(false);
  });

  it('does not mount personnel, remote avatars, or personality layers in the world', () => {
    const millScene = source('src/components/MillScene.tsx');

    expect(millScene).not.toMatch(
      /OperationalPersonnel|OperationalRemotePlayers|WorkerPersonalityLayer|world-personnel/
    );
  });

  it('keeps autonomous vehicles visibly uncrewed', () => {
    const vehicleSources = [
      source('src/components/models/ForkliftModel.tsx'),
      source('src/components/truckbay/OptimizedTruckBay.tsx'),
      source('src/components/TruckBay.tsx'),
    ].join('\n');

    expect(vehicleSources).not.toMatch(
      /SeatedVehicleOperator|<DockSpotter|<WarehouseWorkerWithPalletJack|=== DRIVER ===/
    );
  });

  it('does not initialize workers, human chatter, or workforce navigation', () => {
    const runtimeSources = [
      source('src/App.tsx'),
      source('src/components/ui-new/GameInterface.tsx'),
      source('src/components/ui-new/dock/Dock.tsx'),
      source('src/components/ui-new/panels/OverviewPanel.tsx'),
      source('src/components/ui-new/sidebar/ContextSidebar.tsx'),
      source('src/components/ui-new/sidebar/panelPreloader.ts'),
      source('src/components/ui-new/sidebar/MachineInspector.tsx'),
      source('src/components/mobile/MobilePanel.tsx'),
      source('src/components/ui-new/panels/SettingsPanel.tsx'),
      source('src/components/FarmArea.tsx'),
      source('src/components/game/GamificationBar.tsx'),
      source('src/components/AlertSystem.tsx'),
      source('src/components/ui/PredictiveMaintenancePanel.tsx'),
      source('src/hooks/useAchievementTracker.ts'),
      source('src/hooks/useKnowledgeIntegration.ts'),
      source('src/stores/achievementsStore.ts'),
    ].join('\n');

    expect(runtimeSources).not.toMatch(
      /createInitialWorkers|startWorkerVoices|startRadioChatter|useSafetySimulation|useWorkerMoodStore|selectedWorker|case 'workforce'|label="Workforce"|WorkerLeaderboard|WorkerDetailPanel|OperationsCampaignPanel|ScenarioPlayground|EngagementSignaturePanel|FlourishingDashboard|OwnershipPanel|VotingPanel|AIWelfarePanel|Spoken PA|simulation voice|setTtsEnabled|Scarecrow|scarecrow|Assign technician|Technician:|worker evacuated|worker satisfaction|workers help|worker cooperation|workerEvasions|forklift stopped for pedestrian|yielded to personnel/
    );
  });
});
