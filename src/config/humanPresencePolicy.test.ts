import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FEATURE_FLAGS, HUMAN_PRESENCE_POLICY } from './featureFlags';

const source = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('v0.40 uncrewed-site contract', () => {
  it('keeps every human-presence policy switch immutable and disabled', () => {
    expect(Object.isFrozen(HUMAN_PRESENCE_POLICY)).toBe(true);
    expect(Object.values(HUMAN_PRESENCE_POLICY)).toEqual([false, false, false, false, false]);
    expect(FEATURE_FLAGS).not.toHaveProperty('WORKER_DIALOGUE_ENABLED');
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
      /createInitialWorkers|startWorkerVoices|startRadioChatter|useSafetySimulation|useWorkerMoodStore|selectedWorker|case 'workforce'|label="Workforce"|WorkerLeaderboard|WorkerDetailPanel|OperationsCampaignPanel|ScenarioPlayground|EngagementSignaturePanel|FlourishingDashboard|OwnershipPanel|VotingPanel|AIWelfarePanel|Spoken PA|simulation voice|setTtsEnabled|Scarecrow|scarecrow|Assign technician|Technician:|worker evacuated|worker satisfaction|workers help|worker cooperation|routeConflicts|forklift stopped for pedestrian|yielded to personnel/
    );
  });

  it('does not expose character models, portraits, or host voices to production', () => {
    const prohibitedPublicPaths = [
      'public/assets/workers',
      'public/portraits',
      'public/models/worker',
      'public/textures/compressed/worker_color.ktx2',
      'public/textures/compressed/worker_normal.ktx2',
      'public/textures/compressed/worker_roughness.ktx2',
      'public/textures/machines/256/worker_color.jpg',
      'public/textures/machines/512/worker_color.jpg',
    ];
    expect(
      prohibitedPublicPaths.filter((path) => existsSync(resolve(process.cwd(), path)))
    ).toEqual([]);

    const manifest = JSON.parse(source('public/models/asset-manifest.json')) as {
      assets: Array<{ id: string; file: string; role: string }>;
    };
    expect(manifest.assets).toHaveLength(1);
    expect(manifest.assets[0]?.id).toBe('forklift');
    expect(JSON.stringify(manifest.assets)).not.toMatch(/worker|personnel|character|human/i);

    const productionAudioSources = [
      source('src/utils/audioManager.ts'),
      source('src/hooks/useAudioState.ts'),
      source('src/components/game/PAAnnouncementSystem.tsx'),
      source('src/utils/modelLoader.ts'),
      source('src/components/models/index.ts'),
    ].join('\n');
    expect(productionAudioSources).not.toMatch(
      /speechSynthesis|SpeechSynthesis|ttsEnabled|speakAnnouncement|startWorkerVoices|startRadioChatter|playRadioDispatch|WorkerModel|WORKER_ASSET_PATHS|WORKER_VARIANTS/
    );

    const knowledgeSources = [
      source('src/stores/knowledgeStore.ts'),
      source('src/components/knowledge/Datalinks.tsx'),
      source('src/components/knowledge/KnowledgeEntryCard.tsx'),
    ].join('\n');
    expect(knowledgeSources).not.toMatch(/portraitPath|[/\\]portraits[/\\]|<img\b/i);
  });

  it('keeps current design guidance and source-only modules uncrewed', () => {
    const prohibitedSourcePaths = [
      'src/components/ui-new/widgets/PortraitCard.tsx',
      'src/config/portraits.ts',
      'scripts/blender/specs/worker-body.json',
    ];
    expect(
      prohibitedSourcePaths.filter((path) => existsSync(resolve(process.cwd(), path)))
    ).toEqual([]);

    const blenderPrompt = source('scripts/blender/PROMPTS.md');
    expect(blenderPrompt).not.toMatch(/only the forklift and three workers/i);

    const vehicleStudies = JSON.parse(
      source('scripts/blender/specs/forklift-vehicles.json')
    ) as Array<{ name: string }>;
    expect(vehicleStudies.map(({ name }) => name)).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^(?:operator|worker|driver|personnel|avatar|human)/i),
      ])
    );
  });
});
