# useMillStore Migration Quick Reference

## TL;DR

Replace `useMillStore` with domain-specific stores based on what state you're accessing.

## Quick Lookup Table

| If you access... | Use this store | Import |
|-----------------|---------------|--------|
| graphics, quality, enableSSAO, enableBloom | `useGraphicsStore` | `import { useGraphicsStore } from '../stores'` |
| gameTime, weather, currentShift | `useGameSimulationStore` | `import { useGameSimulationStore } from '../stores'` |
| machines, workers, metrics | `useProductionStore` | `import { useProductionStore } from '../stores'` |
| safetyMetrics, safetyIncidents, forklift* | `useSafetyStore` | `import { useSafetyStore } from '../stores'` |
| alerts, theme, announcements | `useUIStore` | `import { useUIStore } from '../stores'` |

## Find-Replace Patterns

### Single Property Access
```tsx
// Before
const quality = useMillStore((state) => state.graphics.quality);

// After
const quality = useGraphicsStore((state) => state.quality);
```

### Multiple Properties (Same Store)
```tsx
// Before
const machines = useMillStore((state) => state.machines);
const workers = useMillStore((state) => state.workers);

// After
const machines = useProductionStore((state) => state.machines);
const workers = useProductionStore((state) => state.workers);
```

### Multiple Properties (Different Stores)
```tsx
// Before
const quality = useMillStore((state) => state.graphics.quality);
const gameTime = useMillStore((state) => state.gameTime);

// After
const quality = useGraphicsStore((state) => state.quality);
const gameTime = useGameSimulationStore((state) => state.gameTime);
```

### getState() Calls
```tsx
// Before
const state = useMillStore.getState();
const machines = state.machines;

// After
const production = useProductionStore.getState();
const machines = production.machines;
```

## Common Migration Examples

### Example 1: Graphics Component
```tsx
// Before
import { useMillStore } from '../store';

const MyComponent = () => {
  const quality = useMillStore((state) => state.graphics.quality);
  const setQuality = useMillStore((state) => state.setGraphicsQuality);
  // ...
};

// After
import { useGraphicsStore } from '../stores';

const MyComponent = () => {
  const quality = useGraphicsStore((state) => state.quality);
  const setQuality = useGraphicsStore((state) => state.setGraphicsQuality);
  // ...
};
```

### Example 2: Safety Component
```tsx
// Before
import { useMillStore } from '../store';

const SafetyPanel = () => {
  const incidents = useMillStore((state) => state.safetyIncidents);
  const metrics = useMillStore((state) => state.safetyMetrics);
  const addIncident = useMillStore((state) => state.addSafetyIncident);
  // ...
};

// After
import { useSafetyStore } from '../stores';

const SafetyPanel = () => {
  const incidents = useSafetyStore((state) => state.safetyIncidents);
  const metrics = useSafetyStore((state) => state.safetyMetrics);
  const addIncident = useSafetyStore((state) => state.addSafetyIncident);
  // ...
};
```

### Example 3: Multi-Store Component
```tsx
// Before
import { useMillStore } from '../store';

const Dashboard = () => {
  const quality = useMillStore((state) => state.graphics.quality);
  const gameTime = useMillStore((state) => state.gameTime);
  const machines = useMillStore((state) => state.machines);
  const safetyMetrics = useMillStore((state) => state.safetyMetrics);
  const theme = useMillStore((state) => state.theme);
  // ...
};

// After
import {
  useGraphicsStore,
  useGameSimulationStore,
  useProductionStore,
  useSafetyStore,
  useUIStore
} from '../stores';

const Dashboard = () => {
  const quality = useGraphicsStore((state) => state.quality);
  const gameTime = useGameSimulationStore((state) => state.gameTime);
  const machines = useProductionStore((state) => state.machines);
  const safetyMetrics = useSafetyStore((state) => state.safetyMetrics);
  const theme = useUIStore((state) => state.theme);
  // ...
};
```

## Validation Checklist

After migrating each file:

- [ ] Replace import statement
- [ ] Update all hook calls
- [ ] Remove nested `.graphics`/`.safety` etc. property access
- [ ] Run `npm run build`
- [ ] Run `npm run typecheck`
- [ ] Verify component still works in UI
- [ ] Commit changes

## Property Quick Reference

### Graphics Store
```
✓ graphics (entire object)
✓ quality
✓ setGraphicsQuality
✓ setGraphicsSetting
✓ enableSSAO, enableBloom, enableVignette
✓ enableChromaticAberration, enableFilmGrain
✓ enableDepthOfField, enableContactShadows
✓ enableHighResShadows, shadowMapSize
✓ enableLightShafts, enableAtmosphericHaze
✓ dustParticleCount, enableDustParticles, enableGrainFlow
```

### Game Simulation Store
```
✓ gameTime, tickGameTime
✓ weather, setWeather
✓ currentShift, triggerShiftChange, shiftChangeActive
✓ gameSpeed, setGameSpeed
```

### Production Store
```
✓ machines, setMachines
✓ workers, updateWorkerScore
✓ metrics, totalBagsProduced, productionSpeed
✓ updateMachineMetrics, updateMachineStatus
✓ incrementBagsProduced
✓ dockStatus, updateDockStatus
✓ scadaLive, productionEfficiency
✓ productionTarget, workerLeaderboard
✓ workerSatisfaction
```

### Safety Store
```
✓ safetyMetrics, safetyIncidents
✓ addSafetyIncident, clearSafetyIncidents
✓ forkliftMetrics, resetForkliftMetrics
✓ forkliftEmergencyStop, setForkliftEmergencyStop
✓ recordSafetyStop, recordWorkerEvasion
✓ incidentHeatMap, showIncidentHeatMap
✓ setShowIncidentHeatMap, clearIncidentHeatMap
✓ safetyConfig, setSafetyConfig
✓ speedZones, addSpeedZone, removeSpeedZone
✓ daysSinceIncident
✓ emergencyActive, emergencyDrillMode
✓ startEmergencyDrill, endEmergencyDrill
```

### UI Store
```
✓ alerts, aiDecisions, addAIDecision
✓ theme
✓ showHeatMap, setShowHeatMap, clearHeatMap
✓ heatMapData
✓ announcements, addAnnouncement
✓ dismissAnnouncement, clearOldAnnouncements
✓ achievements, showMiniMap
✓ legendPosition, setLegendPosition
✓ showGamificationBar, setShowGamificationBar
✓ panelMinimized, setPanelMinimized
✓ showShortcuts, setShowShortcuts
✓ fpsMode, setFpsMode
```

## Common Pitfalls

### ❌ Forgot to remove nested property
```tsx
// Wrong
const quality = useGraphicsStore((state) => state.graphics.quality);
//                                              ^^^^^^^^^ remove this
```

### ✅ Correct
```tsx
const quality = useGraphicsStore((state) => state.quality);
```

### ❌ Using wrong store
```tsx
// Wrong - safetyMetrics is in SafetyStore, not UIStore
const metrics = useUIStore((state) => state.safetyMetrics);
```

### ✅ Correct
```tsx
const metrics = useSafetyStore((state) => state.safetyMetrics);
```

### ❌ Import from old location
```tsx
// Wrong
import { useMillStore } from '../store';
```

### ✅ Correct
```tsx
import { useGraphicsStore } from '../stores';
// or
import { useGraphicsStore } from '../../stores';
```

## Files Already Extracted (Can Reference)

These files in `src/components/ui/` have already been extracted and use the pattern correctly:

- `EmergencyControlPanel.tsx` - Multi-store example
- `GraphicsSettingsPanel.tsx` - Graphics + UI
- `WeatherControlPanel.tsx` - Game Simulation + UI
- `SafetyAnalyticsPanel.tsx` - Safety + UI
- Individual smaller panels

Look at these for migration examples!

## Phase 1 Priority Files (Start Here)

Easiest migrations - single store only:

1. `components/Machines.tsx` → Graphics
2. `components/FPSMonitor.tsx` → Graphics
3. `components/PostProcessing.tsx` → Graphics
4. `components/AlertSystem.tsx` → Safety
5. `components/ForkliftSystem.tsx` → Safety
6. `components/ShiftBriefing.tsx` → Production
7. `components/AmbientDetails.tsx` → Game Simulation

---

**Last Updated:** 2025-12-04
