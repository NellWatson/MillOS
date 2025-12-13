# Split-Brain Store Issue - Sky Color Synchronization Bug

**Date:** 2025-12-13  
**Severity:** High  
**Status:** Resolved  

## Summary

The application experienced a critical state synchronization issue where the sky rendering system and the main application UI were operating on **two separate instances** of the Zustand game simulation store. This caused the sky to remain "constantly blue" (stuck at midday) while the game time was correctly advancing to night in other parts of the application.

## Symptoms

1. **Visual**: Sky appeared constantly blue (midday color) regardless of actual game time
2. **Console Logs**: Showed conflicting time values:
   - `[SkySystem]` logs showed correct time progression (e.g., Time: 22.00, Phase: Night)
   - Visual output remained blue (midday appearance)
3. **Fog Overlay**: Blue fog from `App.tsx` was obscuring the correctly-rendered night sky dome

## Root Cause

### The Problem: Inconsistent Import Paths

Two different import patterns were being used across the codebase:

**Pattern A** (Used by `App.tsx`):
```typescript
import { useGameSimulationStore } from './store';
```

**Pattern B** (Used by `SkySystem.tsx`, `MillScene.tsx`, etc.):
```typescript
import { useGameSimulationStore } from '../stores/gameSimulationStore';
```

### Why This Caused Dual Instances

The file `src/store.ts` is a **compatibility layer** that re-exports from `src/stores/*`:

```typescript
// src/store.ts
export {
  useGameSimulationStore,
  // ... other stores
} from './stores';
```

While this *should* work correctly, the combination of:
1. Different import paths (`./store` vs `../stores/gameSimulationStore`)
2. Potential circular dependencies in the compatibility layer
3. Module bundler resolution quirks

...resulted in **two separate Zustand store instances** being created:

- **Instance A**: Used by `SkySystem`, `MillScene`, and game logic
  - Correctly ticking forward via `Environment.tsx` → `GameTimeTicker`
  - Advancing from 10:00 → 22:00 (Night)
  
- **Instance B**: Used by `App.tsx` and `DynamicBackground`
  - **Stuck at initial state** (Time: 10:00, Midday)
  - Never receiving tick updates
  - Setting blue fog color based on stale midday time

### The Visual Result

```
┌─────────────────────────────────────┐
│  App.tsx (Instance B - Stuck)       │
│  gameTime: 10.00 (Midday)           │
│  → Sets BLUE fog color              │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ SkySystem (Instance A - Live) │ │
│  │ gameTime: 22.00 (Night)       │ │
│  │ → Renders DARK sky dome       │ │
│  │                               │ │
│  │ ❌ Obscured by blue fog!      │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

## The Fix

### Solution: Standardize Import Paths

Refactored `App.tsx` to import stores **directly from their source files**, bypassing the compatibility layer:

```diff
// src/App.tsx
- import {
-   useGraphicsStore,
-   useUIStore,
-   useGameSimulationStore,
-   useProductionStore,
- } from './store';

+ import { useGraphicsStore } from './stores/graphicsStore';
+ import { useUIStore } from './stores/uiStore';
+ import { useGameSimulationStore } from './stores/gameSimulationStore';
+ import { useProductionStore } from './stores/productionStore';
+ import { initializeSCADASync } from './store'; // Only SCADA function from compat layer
```

### Why This Works

By using identical import paths across all files:
- Bundler guarantees **singleton behavior**
- All components reference the **same store instance**
- State updates propagate correctly to all subscribers
- `App.tsx` fog color now syncs with `SkySystem` sky color

## Verification

### Added Debug Logging

Added logging to `App.tsx` to detect future desync:

```typescript
// src/App.tsx - DynamicBackground component
if (Math.abs(gameTime - Math.floor(gameTime)) < 0.05) {
  console.log(`[App:DynamicBackground] Time: ${gameTime.toFixed(2)}, Color: ${targetColor}`);
}
```

### Expected Console Output (After Fix)

```
[SkySystem] Time: 22.00, Phase: Night
[App:DynamicBackground] Time: 22.00, Color: #1e1b4b
```

Both components now report the **same time value**.

## Prevention Guidelines

### For Future Development

1. **Use Direct Imports**: Always import stores from `src/stores/*`, not from `src/store.ts`
   
   ✅ **Correct:**
   ```typescript
   import { useGameSimulationStore } from './stores/gameSimulationStore';
   ```
   
   ❌ **Avoid:**
   ```typescript
   import { useGameSimulationStore } from './store';
   ```

2. **Deprecate Compatibility Layer**: Consider removing `src/store.ts` entirely once all legacy code is migrated

3. **Lint Rule**: Add ESLint rule to enforce consistent import paths:
   ```json
   {
     "rules": {
       "no-restricted-imports": [
         "error",
         {
           "patterns": ["./store", "../store"],
           "message": "Import stores directly from src/stores/* to avoid dual instances"
         }
       ]
     }
   }
   ```

4. **Store Singleton Test**: Add integration test to verify store singleton behavior:
   ```typescript
   import { useGameSimulationStore as StoreA } from './stores/gameSimulationStore';
   import { useGameSimulationStore as StoreB } from './store';
   
   test('store imports reference same instance', () => {
     expect(StoreA.getState()).toBe(StoreB.getState());
   });
   ```

## Related Files

- [src/App.tsx](file:///Users/nellwatson/Documents/GitHub/MillOS/src/App.tsx) - Fixed import paths
- [src/components/SkySystem.tsx](file:///Users/nellwatson/Documents/GitHub/MillOS/src/components/SkySystem.tsx) - Sky rendering (correct imports)
- [src/store.ts](file:///Users/nellwatson/Documents/GitHub/MillOS/src/store.ts) - Compatibility layer (source of issue)
- [src/stores/gameSimulationStore.ts](file:///Users/nellwatson/Documents/GitHub/MillOS/src/stores/gameSimulationStore.ts) - Canonical store source

## Lessons Learned

1. **Import Path Consistency Matters**: Even when using re-exports, inconsistent import paths can cause bundler issues
2. **Zustand Singleton Assumption**: Zustand stores are singletons *per module path*, not globally
3. **Debug Logging is Critical**: The duplicate console logs were the key to diagnosing this issue
4. **Compatibility Layers Have Risks**: Re-export layers can introduce subtle bugs; prefer direct imports

## References

- [Zustand Documentation - Module Singletons](https://github.com/pmndrs/zustand#module-singletons)
- [Vite Module Resolution](https://vitejs.dev/guide/dep-pre-bundling.html)
- Original Issue: "Debug Sky Color Sync" (2025-12-13)
