# useMillStore Migration Progress Tracker

**Started:** [DATE]
**Target Completion:** [DATE]
**Status:** Not Started

---

## Overall Progress

- [ ] Phase 1: Single-Store Files (21 files)
- [ ] Phase 2: Multi-Store Files (21 files)
- [ ] Phase 3: Tests & Utilities (2 files)
- [ ] Deprecation: Add ESLint rule
- [ ] Documentation: Update CLAUDE.md

**Completed:** 0 / 44 files (0%)

---

## Phase 1: Single-Store Files (21 files)

### Graphics Store (7 files)
- [ ] `components/Machines.tsx` (4 calls)
- [ ] `components/FPSMonitor.tsx` (3 calls)
- [ ] `components/HolographicDisplays.tsx` (2 calls)
- [ ] `components/PostProcessing.tsx` (1 call)
- [ ] `components/infrastructure/FactoryFloor.tsx` (1 call)
- [ ] `components/infrastructure/SafetyEquipment.tsx` (1 call)
- [ ] `components/infrastructure/UtilityConduits.tsx` (1 call)

**Subtotal:** 0 / 7 files

### Game Simulation Store (3 files)
- [ ] `components/ui/MillClockDisplay.tsx` (3 calls)
- [ ] `components/AmbientDetails.tsx` (1 call)
- [ ] `components/SpatialAudioTracker.tsx` (1 call)

**Subtotal:** 0 / 3 files

### Production Store (4 files)
- [ ] `components/ShiftBriefing.tsx` (2 calls)
- [ ] `components/TruckBay.refactored.tsx` (1 call)
- [ ] `components/TruckBay.tsx` (1 call)
- [ ] `scada/useSCADA.ts` (1 call)

**Subtotal:** 0 / 4 files

### Safety Store (5 files)
- [ ] `components/EmergencyOverlay.tsx` (4 calls)
- [ ] `components/ui/EmergencyStopButton.tsx` (3 calls)
- [ ] `components/AlertSystem.tsx` (1 call)
- [ ] `components/ForkliftSystem.tsx` (1 call)
- [ ] `components/ambient/SafetyPosters.tsx` (1 call)

**Subtotal:** 0 / 5 files

### UI Store (2 files)
- [ ] `components/FirstPersonController.tsx` (2 calls)
- [ ] `components/ui/KeyboardShortcutsModal.tsx` (1 call)

**Subtotal:** 0 / 2 files

---

## Phase 2: Multi-Store Files (21 files)

### Critical Priority (5 files)
- [ ] **`components/UIOverlay.tsx`** (50 calls) - Graphics + Safety + UI + Game Sim
  - [ ] Extract `LegendControls` to separate file
  - [ ] Extract `ControlPanel` to separate file
  - [ ] Replace inline components with imports
  - [ ] Migrate remaining hooks
- [ ] `components/Environment.tsx` (18 calls) - Graphics + Game Sim + UI
- [ ] `components/GameFeatures.tsx` (16 calls) - UI + Production
- [ ] `hooks/useKeyboardShortcuts.ts` (14 calls) - Graphics + Safety + UI
- [ ] `components/AICommandCenter.tsx` (9 calls) - UI + Production + Game Sim + Safety

**Subtotal:** 0 / 5 files

### High Priority (4 files)
- [ ] `components/MillScene.tsx` (8 calls) - Safety + Production + Graphics
- [ ] `components/ui/EmergencyControlPanel.tsx` (8 calls) - Safety + Game Sim + UI
- [ ] `components/ui/SafetyAnalyticsPanel.tsx` (8 calls) - Safety + UI
- [ ] `components/ui/WeatherControlPanel.tsx` (6 calls) - Game Sim + UI

**Subtotal:** 0 / 4 files

### Medium Priority (12 files)
- [ ] `components/ConveyorSystem.tsx` (5 calls) - Graphics + Production
- [ ] `components/DustParticles.tsx` (5 calls) - Graphics + Game Sim
- [ ] `components/WorkerSystem.tsx` (5 calls) - Safety + UI + Production
- [ ] `components/ui/GraphicsSettingsPanel.tsx` (5 calls) - Graphics + UI
- [ ] `components/ProductionMetrics.tsx` (4 calls) - Production + Safety
- [ ] `components/ui/ZoneCustomizationPanel.tsx` (4 calls) - Safety + UI
- [ ] `App.tsx` (3 calls) - Graphics + UI
- [ ] `components/infrastructure/FactoryWalls.tsx` (3 calls) - Game Sim + Safety + Graphics
- [ ] `components/ui/IncidentHistoryPanel.tsx` (3 calls) - Safety + UI
- [ ] `components/ui/SafetyConfigPanel.tsx` (3 calls) - Safety + UI
- [ ] `components/infrastructure/FactoryRoof.tsx` (2 calls) - Game Sim + Graphics
- [ ] `components/ui/SafetyMetricsDisplay.tsx` (2 calls) - Safety + UI

**Subtotal:** 0 / 12 files

---

## Phase 3: Tests & Utilities (2 files)

- [ ] `utils/__tests__/aiEngine.test.ts` - Update mocks
- [ ] `utils/aiEngine.ts` - Convert getState() calls

**Subtotal:** 0 / 2 files

---

## Post-Migration Tasks

- [ ] Add deprecation warning to `useMillStore`
- [ ] Add ESLint rule: `no-restricted-imports` for `useMillStore`
- [ ] Update `CLAUDE.md` with new patterns
- [ ] Delete `useMillStore` function (after verification)
- [ ] Update README with performance improvements
- [ ] Create PR with full migration

---

## Validation Checklist (Run After Each File)

After migrating each file:

```bash
# 1. Build check
npm run build

# 2. Type check
npm run typecheck

# 3. Lint check
npm run lint

# 4. Run analysis script to verify progress
node analyze-useMillStore.cjs | grep "Total files using useMillStore"

# 5. Visual test (if UI component)
npm run dev
# Click through affected panels
```

---

## Migration Command Reference

### For Single-Store Files

```bash
# 1. Read the file
# 2. Identify properties accessed
# 3. Replace import:

# Before:
import { useMillStore } from '../store';

# After (Graphics):
import { useGraphicsStore } from '../stores';

# After (Safety):
import { useSafetyStore } from '../stores';

# After (Production):
import { useProductionStore } from '../stores';

# After (Game Simulation):
import { useGameSimulationStore } from '../stores';

# After (UI):
import { useUIStore } from '../stores';

# 4. Replace hook calls (remove nested .graphics/.safety etc):

# Before:
const quality = useMillStore((state) => state.graphics.quality);

# After:
const quality = useGraphicsStore((state) => state.quality);

# 5. Run validation checklist
# 6. Commit
git add [file]
git commit -m "refactor: migrate [file] from useMillStore to use[Domain]Store"
```

### For Multi-Store Files

```bash
# 1. Read file and categorize each property
# 2. Add multiple imports:

import {
  useGraphicsStore,
  useSafetyStore,
  useUIStore
} from '../stores';

# 3. Update each hook call to correct store
# 4. Run validation checklist
# 5. Commit with detailed message listing stores used
```

---

## Performance Metrics

### Before Migration
```
Total useMillStore calls: 179
Total store subscriptions: 895 (179 × 5 stores)
UIOverlay.tsx hooks: 50
Estimated wasted re-renders: [MEASURE]
```

### After Migration
```
Total useMillStore calls: [COUNT]
Total store subscriptions: [COUNT]
UIOverlay.tsx hooks: [COUNT]
Estimated wasted re-renders: [MEASURE]
```

### Bundle Size
```
Before: [SIZE] (gzipped)
After: [SIZE] (gzipped)
Reduction: [SIZE] ([PERCENTAGE]%)
```

---

## Notes & Blockers

**Date:** [DATE]
**Issue:** [DESCRIPTION]
**Resolution:** [DESCRIPTION]

---

## Daily Progress Log

### [DATE]
- Files migrated: [LIST]
- Issues encountered: [LIST]
- Time spent: [HOURS]
- Next session: [PLAN]

### [DATE]
- Files migrated: [LIST]
- Issues encountered: [LIST]
- Time spent: [HOURS]
- Next session: [PLAN]

---

## Quick Stats

Run this command to check current progress:

```bash
# Count remaining useMillStore usages
grep -r "useMillStore" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v "0.10 Archive" | grep -v "stores/index.ts" | wc -l

# Count by store (estimate what's left)
node analyze-useMillStore.cjs | head -20
```

---

**Last Updated:** [DATE]
**Updated By:** [NAME]
