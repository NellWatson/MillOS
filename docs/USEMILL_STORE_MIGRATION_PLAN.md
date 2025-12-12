# useMillStore Anti-Pattern Migration Plan

## Executive Summary

**Problem:** The `useMillStore` hook in `src/stores/index.ts` (lines 40-65) subscribes to ALL 5 stores on every render, causing massive re-render cascades and performance degradation.

**Impact:** 44 files with 179+ total usages across the codebase.

**Solution:** Migrate components to use domain-specific stores directly instead of the combined `useMillStore` hook.

---

## Analysis Results

### Store Usage Breakdown

| Store Domain | Property Accesses | Primary Files |
|-------------|------------------|---------------|
| **Safety** | 60 | Emergency systems, forklift controls, incidents |
| **UI** | 37 | Alerts, themes, panels, gamification |
| **Graphics** | 35 | Quality settings, rendering options |
| **Game Simulation** | 24 | Time, weather, shifts |
| **Production** | 23 | Machines, workers, metrics |

### Migration Complexity

- **Phase 1 (Easy):** 21 files using single store (50% of files)
- **Phase 2 (Complex):** 21 files using multiple stores (50% of files)
- **Phase 3 (Tests):** Test files with mock dependencies

---

## Phase 1: Single-Store Files (Low Risk)

These files only access ONE store and can be migrated with simple find-replace.

### Graphics Store (7 files)

| File | Usages | Properties | Migration |
|------|--------|------------|-----------|
| `components/Machines.tsx` | 4 | graphics, quality | `useGraphicsStore` |
| `components/FPSMonitor.tsx` | 3 | graphics, quality, setGraphicsQuality | `useGraphicsStore` |
| `components/HolographicDisplays.tsx` | 2 | graphics, quality | `useGraphicsStore` |
| `components/PostProcessing.tsx` | 1 | graphics | `useGraphicsStore` |
| `components/infrastructure/FactoryFloor.tsx` | 1 | graphics | `useGraphicsStore` |
| `components/infrastructure/SafetyEquipment.tsx` | 1 | graphics | `useGraphicsStore` |
| `components/infrastructure/UtilityConduits.tsx` | 1 | graphics | `useGraphicsStore` |

**Migration Example (Machines.tsx):**
```tsx
// Before
import { useMillStore } from '../store';
const graphicsQuality = useMillStore((state) => state.graphics.quality);

// After
import { useGraphicsStore } from '../stores';
const graphicsQuality = useGraphicsStore((state) => state.quality);
```

### Game Simulation Store (3 files)

| File | Usages | Properties | Migration |
|------|--------|------------|-----------|
| `components/ui/MillClockDisplay.tsx` | 3 | gameTime, gameSpeed, setGameSpeed | `useGameSimulationStore` |
| `components/AmbientDetails.tsx` | 1 | gameTime | `useGameSimulationStore` |
| `components/SpatialAudioTracker.tsx` | 1 | gameTime | `useGameSimulationStore` |

**Migration Example (MillClockDisplay.tsx):**
```tsx
// Before
import { useMillStore } from '../../store';
const gameTime = useMillStore((state) => state.gameTime);
const gameSpeed = useMillStore((state) => state.gameSpeed);
const setGameSpeed = useMillStore((state) => state.setGameSpeed);

// After
import { useGameSimulationStore } from '../../stores';
const gameTime = useGameSimulationStore((state) => state.gameTime);
const gameSpeed = useGameSimulationStore((state) => state.gameSpeed);
const setGameSpeed = useGameSimulationStore((state) => state.setGameSpeed);
```

### Production Store (4 files)

| File | Usages | Properties | Migration |
|------|--------|------------|-----------|
| `components/ShiftBriefing.tsx` | 2 | machines, workers | `useProductionStore` |
| `components/TruckBay.refactored.tsx` | 1 | updateDockStatus | `useProductionStore` |
| `components/TruckBay.tsx` | 1 | updateDockStatus | `useProductionStore` |
| `scada/useSCADA.ts` | 1 | machines | `useProductionStore` |

**Migration Example (ShiftBriefing.tsx):**
```tsx
// Before
import { useMillStore } from '../store';
const machines = useMillStore((state) => state.machines);
const workers = useMillStore((state) => state.workers);

// After
import { useProductionStore } from '../stores';
const machines = useProductionStore((state) => state.machines);
const workers = useProductionStore((state) => state.workers);
```

### Safety Store (5 files)

| File | Usages | Properties | Migration |
|------|--------|------------|-----------|
| `components/EmergencyOverlay.tsx` | 4 | safetyIncidents, safetyMetrics, forkliftEmergencyStop, emergencyActive | `useSafetyStore` |
| `components/ui/EmergencyStopButton.tsx` | 3 | forkliftEmergencyStop, setForkliftEmergencyStop, addSafetyIncident | `useSafetyStore` |
| `components/AlertSystem.tsx` | 1 | safetyMetrics | `useSafetyStore` |
| `components/ForkliftSystem.tsx` | 1 | recordSafetyStop | `useSafetyStore` |
| `components/ambient/SafetyPosters.tsx` | 1 | safetyMetrics | `useSafetyStore` |

**Migration Example (EmergencyOverlay.tsx):**
```tsx
// Before
import { useMillStore } from '../store';
const safetyIncidents = useMillStore((state) => state.safetyIncidents);
const safetyMetrics = useMillStore((state) => state.safetyMetrics);
const forkliftEmergencyStop = useMillStore((state) => state.forkliftEmergencyStop);
const emergencyActive = useMillStore((state) => state.emergencyActive);

// After
import { useSafetyStore } from '../stores';
const safetyIncidents = useSafetyStore((state) => state.safetyIncidents);
const safetyMetrics = useSafetyStore((state) => state.safetyMetrics);
const forkliftEmergencyStop = useSafetyStore((state) => state.forkliftEmergencyStop);
const emergencyActive = useSafetyStore((state) => state.emergencyActive);
```

### UI Store (2 files)

| File | Usages | Properties | Migration |
|------|--------|------------|-----------|
| `components/FirstPersonController.tsx` | 2 | fpsMode | `useUIStore` |
| `components/ui/KeyboardShortcutsModal.tsx` | 1 | theme | `useUIStore` |

**Migration Example (FirstPersonController.tsx):**
```tsx
// Before
import { useMillStore } from '../store';
const fpsMode = useMillStore((state) => state.fpsMode);

// After
import { useUIStore } from '../stores';
const fpsMode = useUIStore((state) => state.fpsMode);
```

---

## Phase 2: Multi-Store Files (Higher Risk)

These files access MULTIPLE stores and require careful refactoring.

### Critical Files (Highest Complexity)

#### 1. `components/UIOverlay.tsx` (50 usages)
**Stores:** Safety (21), UI (12), Game Simulation (5), Graphics (3)

**Strategy:** Split into smaller components by domain
```tsx
// Before: One massive component with 50 useMillStore calls

// After: Separate components
const SafetyPanel = () => {
  const safetyMetrics = useSafetyStore((state) => state.safetyMetrics);
  const emergencyActive = useSafetyStore((state) => state.emergencyActive);
  // ... other safety state
};

const WeatherPanel = () => {
  const weather = useGameSimulationStore((state) => state.weather);
  const setWeather = useGameSimulationStore((state) => state.setWeather);
  // ... other game simulation state
};

const GraphicsPanel = () => {
  const graphics = useGraphicsStore((state) => state);
  const setQuality = useGraphicsStore((state) => state.setGraphicsQuality);
  // ... other graphics state
};
```

**Properties by Store:**
- **Safety (21):** safetyMetrics, emergencyActive, emergencyDrillMode, startEmergencyDrill, endEmergencyDrill, forkliftEmergencyStop, setForkliftEmergencyStop, addSafetyIncident, safetyIncidents, clearSafetyIncidents, forkliftMetrics, incidentHeatMap, showIncidentHeatMap, setShowIncidentHeatMap, clearIncidentHeatMap, resetForkliftMetrics, speedZones, addSpeedZone, removeSpeedZone, safetyConfig, setSafetyConfig
- **UI (12):** theme, showHeatMap, setShowHeatMap, clearHeatMap, legendPosition, setLegendPosition, showGamificationBar, setShowGamificationBar, panelMinimized, setPanelMinimized, showShortcuts, setShowShortcuts
- **Game Simulation (5):** shiftChangeActive, currentShift, triggerShiftChange, weather, setWeather
- **Graphics (3):** graphics, setGraphicsQuality, setGraphicsSetting

#### 2. `components/Environment.tsx` (18 usages)
**Stores:** Game Simulation (3), Graphics (3), UI (2)

**Strategy:** Group related hooks at top of component
```tsx
// Game simulation
const gameTime = useGameSimulationStore((state) => state.gameTime);
const tickGameTime = useGameSimulationStore((state) => state.tickGameTime);
const weather = useGameSimulationStore((state) => state.weather);

// Graphics
const quality = useGraphicsStore((state) => state.quality);
const enableLightShafts = useGraphicsStore((state) => state.enableLightShafts);

// UI
const heatMapData = useUIStore((state) => state.heatMapData);
const showHeatMap = useUIStore((state) => state.showHeatMap);
```

#### 3. `components/GameFeatures.tsx` (16 usages)
**Stores:** UI (6), Production (5)

**Strategy:** Split announcement system from leaderboard
```tsx
// Announcement component
const AnnouncementSystem = () => {
  const announcements = useUIStore((state) => state.announcements);
  const addAnnouncement = useUIStore((state) => state.addAnnouncement);
  const dismissAnnouncement = useUIStore((state) => state.dismissAnnouncement);
  // ...
};

// Production targets
const ProductionTargets = () => {
  const productionTarget = useProductionStore((state) => state.productionTarget);
  const totalBagsProduced = useProductionStore((state) => state.totalBagsProduced);
  const workers = useProductionStore((state) => state.workers);
  // ...
};
```

#### 4. `hooks/useKeyboardShortcuts.ts` (14 usages)
**Stores:** Graphics (1), Safety (3), UI (unknown from analysis)

**Strategy:** Import multiple stores in hook
```tsx
import { useGraphicsStore } from '../stores';
import { useSafetyStore } from '../stores';
import { useUIStore } from '../stores';

export function useKeyboardShortcuts(options) {
  const setGraphicsQuality = useGraphicsStore((state) => state.setGraphicsQuality);
  const forkliftEmergencyStop = useSafetyStore((state) => state.forkliftEmergencyStop);
  const setForkliftEmergencyStop = useSafetyStore((state) => state.setForkliftEmergencyStop);
  // ...
}
```

### Medium Complexity Files

#### 5. `components/AICommandCenter.tsx` (9 usages)
**Stores:** UI (2), Production (3), Game Simulation (3), Safety (1)

#### 6. `components/MillScene.tsx` (8 usages)
**Stores:** Safety (2), Production (5), Graphics (2)

#### 7. `components/ui/EmergencyControlPanel.tsx` (8 usages)
**Stores:** Safety (4), Game Simulation (3), UI (1)

#### 8. `components/ui/SafetyAnalyticsPanel.tsx` (8 usages)
**Stores:** Safety (7), UI (1)

#### 9. `components/ui/WeatherControlPanel.tsx` (6 usages)
**Stores:** Game Simulation (2), UI (4)

#### 10. `components/ConveyorSystem.tsx` (5 usages)
**Stores:** Graphics (2), Production (1)

### Remaining Multi-Store Files (11 files)

- `components/DustParticles.tsx` (5 usages) - Graphics + Game Simulation
- `components/WorkerSystem.tsx` (5 usages) - Safety + UI + Production
- `components/ui/GraphicsSettingsPanel.tsx` (5 usages) - Graphics + UI
- `components/ProductionMetrics.tsx` (4 usages) - Production + Safety
- `components/ui/ZoneCustomizationPanel.tsx` (4 usages) - Safety + UI
- `utils/aiEngine.ts` (4 usages) - Special case: uses getState()
- `App.tsx` (3 usages) - Graphics + UI
- `components/infrastructure/FactoryWalls.tsx` (3 usages) - Game Simulation + Safety + Graphics
- `components/ui/IncidentHistoryPanel.tsx` (3 usages) - Safety + UI
- `components/ui/SafetyConfigPanel.tsx` (3 usages) - Safety + UI
- `components/infrastructure/FactoryRoof.tsx` (2 usages) - Game Simulation + Graphics

---

## Phase 3: Special Cases

### Test Files
**File:** `utils/__tests__/aiEngine.test.ts`

**Strategy:** Update mocks to use domain-specific stores
```tsx
// Before
vi.mocked(useMillStore.getState).mockReturnValue(mockStoreState);

// After
vi.mocked(useProductionStore.getState).mockReturnValue({ machines: [...], workers: [...] });
vi.mocked(useUIStore.getState).mockReturnValue({ alerts: [...], aiDecisions: [...] });
```

### Non-React Files Using getState()
**File:** `utils/aiEngine.ts`

**Strategy:** Import individual stores' getState methods
```tsx
// Before
import { useMillStore } from '../store';
const store = useMillStore.getState();

// After
import { useProductionStore, useUIStore } from '../stores';
const production = useProductionStore.getState();
const ui = useUIStore.getState();
```

---

## Migration Execution Plan

### Step 1: Create Migration Validation Script
```bash
# Script to verify no regressions after each file migration
npm run build && npm run typecheck && npm run lint
```

### Step 2: Phase 1 Migration (2-3 hours)
Migrate all 21 single-store files in order:
1. Graphics files (7) - Lowest risk
2. Safety files (5)
3. Production files (4)
4. Game Simulation files (3)
5. UI files (2)

**Process per file:**
1. Read file
2. Identify all `useMillStore` calls
3. Replace import and hook calls
4. Run validation script
5. Commit with message: `refactor: migrate [filename] from useMillStore to use[Store]Store`

### Step 3: Phase 2 - Split Large Components (4-6 hours)
Priority order:
1. `UIOverlay.tsx` - Extract sub-panels first
2. `Environment.tsx` - Group hooks by domain
3. `GameFeatures.tsx` - Split announcement/leaderboard
4. Medium complexity files (9 files)
5. Remaining multi-store files (11 files)

### Step 4: Phase 3 - Tests and Utils (1-2 hours)
1. Update test mocks
2. Refactor `aiEngine.ts` getState usage
3. Update any remaining imports in `stores/index.ts`

### Step 5: Deprecate useMillStore (1 hour)
1. Add deprecation warning to `useMillStore`
2. Update documentation
3. Add eslint rule to prevent future usage

---

## Risk Mitigation

### Before Starting
- [ ] Create feature branch: `refactor/migrate-useMillStore`
- [ ] Run full test suite baseline
- [ ] Ensure all tests pass
- [ ] Document current bundle size

### During Migration
- [ ] Run build after EVERY file
- [ ] Commit after EVERY successful migration
- [ ] Test UI manually for each major component
- [ ] Monitor bundle size changes

### After Completion
- [ ] Full regression test
- [ ] Performance comparison (FPS, re-render counts)
- [ ] Bundle size analysis
- [ ] Update CLAUDE.md with new patterns

---

## Expected Benefits

### Performance Improvements
- **Reduced re-renders:** Components only re-render when their specific store changes
- **Smaller hook subscriptions:** Subscribe to 1 store instead of 5
- **Better tree-shaking:** Unused store code can be eliminated

### Code Quality
- **Clearer dependencies:** Obvious which domain a component uses
- **Better encapsulation:** Components don't access unrelated state
- **Easier refactoring:** Domain changes don't cascade across all files

### Developer Experience
- **Faster builds:** TypeScript has clearer dependency graph
- **Better autocomplete:** Store types are more specific
- **Simpler debugging:** Can trace which store caused a re-render

---

## Success Metrics

### Before Migration
```bash
# Baseline measurements
- useMillStore usages: 179+ (44 files)
- Average component re-renders: [TO BE MEASURED]
- Bundle size: [TO BE MEASURED]
```

### After Migration
```bash
# Target metrics
- useMillStore usages: 0 (deprecated)
- Average component re-renders: 50-70% reduction
- Bundle size: Similar or smaller (tree-shaking benefits)
- TypeScript compile time: 10-20% faster
```

---

## Rollback Plan

If critical issues arise:
1. Revert to main branch
2. Cherry-pick working migrations
3. Create smaller, incremental PRs
4. Focus on highest-impact files first

---

## Appendix: Store Property Reference

### Graphics Store Properties
- graphics, quality, enableSSAO, enableBloom, enableVignette, enableChromaticAberration
- enableFilmGrain, enableDepthOfField, enableContactShadows, enableHighResShadows
- shadowMapSize, setGraphicsQuality, setGraphicsSetting, enableLightShafts
- enableAtmosphericHaze, dustParticleCount, enableDustParticles, enableGrainFlow

### Game Simulation Store Properties
- gameTime, tickGameTime, weather, setWeather, currentShift, triggerShiftChange
- shiftChangeActive, gameSpeed, setGameSpeed, time, shift

### Production Store Properties
- machines, workers, metrics, totalBagsProduced, productionSpeed, setMachines
- updateMachineMetrics, updateMachineStatus, incrementBagsProduced, dockStatus
- updateDockStatus, scadaLive, productionEfficiency, productionTarget
- workerLeaderboard, updateWorkerScore, workerSatisfaction

### Safety Store Properties
- safetyMetrics, safetyIncidents, clearSafetyIncidents, addSafetyIncident
- forkliftMetrics, resetForkliftMetrics, recordSafetyStop, recordWorkerEvasion
- incidentHeatMap, showIncidentHeatMap, setShowIncidentHeatMap, clearIncidentHeatMap
- forkliftEmergencyStop, setForkliftEmergencyStop, safetyConfig, setSafetyConfig
- speedZones, addSpeedZone, removeSpeedZone, daysSinceIncident, emergencyActive
- emergencyDrillMode, startEmergencyDrill, endEmergencyDrill

### UI Store Properties
- alerts, addAIDecision, aiDecisions, theme, showHeatMap, setShowHeatMap
- clearHeatMap, heatMapData, announcements, addAnnouncement, dismissAnnouncement
- clearOldAnnouncements, achievements, showMiniMap, legendPosition, setLegendPosition
- showGamificationBar, setShowGamificationBar, panelMinimized, setPanelMinimized
- showShortcuts, setShowShortcuts, fpsMode, setFpsMode

---

**Generated:** 2025-12-04
**Analyzer Script:** `analyze-useMillStore.cjs`
**Total Files Analyzed:** 44
**Total Migrations Required:** 179+ hook calls
