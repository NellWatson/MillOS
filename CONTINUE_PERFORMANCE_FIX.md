# Performance Investigation - Continuation Prompt

## CURRENT STATUS
- Oscillation bug: FIXED (workers/forklifts move correctly)
- Periodic stutter: STILL PRESENT even on MEDIUM quality
- This rules out AmbientDetails.tsx (only renders on high/ultra)

## Problem
Periodic freeze/stutter every ~1 second. Confirmed on MEDIUM graphics quality.

## What's Been Fixed

### 1. Every-Frame setState Calls (FIXED)
**Files:** `ForkliftSystem.tsx`, `WorkerSystem.tsx`

- `setIsStopped()`, `setIsReversing()`, `setFlash()` - now only called when value changes
- `setHeadRotation()` - added 0.05 rad threshold
- Added 150ms hysteresis to forklift state changes
- Added 1.5s cooldown before worker returns to path after evading

### 2. walkCycle Animation Causing Re-renders (FIXED)
**File:** `WorkerSystem.tsx`

Changed `walkCycle` from React state to ref:
```javascript
// Before: caused re-render every frame for every worker
const [walkCycle, setWalkCycle] = useState(0);
setWalkCycle(prev => prev + delta * 5.5);

// After: no re-renders
const walkCycleRef = useRef(0);
walkCycleRef.current += delta * 5.5;
```

Also updated `HumanModel` to accept `walkCycleRef` as a ref prop instead of a value.

### 3. Position Reset on Re-render (FIXED)
**Files:** `WorkerSystem.tsx`, `ForkliftSystem.tsx`

R3F was resetting positions on every re-render because of `position={new THREE.Vector3(...)}` prop.

Fix: Removed position prop, set initial position via useEffect with `initializedRef` flag:
```javascript
const initializedRef = useRef(false);
useEffect(() => {
  if (ref.current && !initializedRef.current) {
    ref.current.position.set(...data.position);
    initializedRef.current = true;
  }
}, [data.position]);
```

### 4. Position Registry Communication (FIXED)
**File:** `positionRegistry.ts`

- Added `isStopped` field to forklift registry entries
- `isForkliftApproaching()` returns false if forklift is stopped
- Increased dot product threshold from `> 0` to `> 0.3`
- Forklift now registers with current frame's `newIsStopped`, not delayed React state

### 5. Store Update Frequency (FIXED)
**Files:** `Environment.tsx`, `store.ts`

- `GameTimeTicker`: Changed from 60fps to 2fps (every 500ms, batched 5 ticks)
- `clearOldAnnouncements`: Now returns existing state if nothing changed (no unnecessary re-renders)

## Remaining Issue: Periodic ~1 Second Freeze

### Suspected Cause: Too Many useFrame Callbacks

There are **99 useFrame callbacks** across the codebase:
- `AmbientDetails.tsx`: 41 callbacks (only on high/ultra quality)
- `Environment.tsx`: 16 callbacks
- `Machines.tsx`: 9 callbacks
- Other files: 33 callbacks

Each useFrame runs every frame at 60fps. That's ~6000 function calls per second.

### Components Subscribing to gameTime (re-render every 500ms now)

10 components subscribe to `gameTime`:
1. `Environment.tsx` - LensFlareEffect (line 15)
2. `Environment.tsx` - DaylightWindow (line 200)
3. `Environment.tsx` - LightShaft (line 236)
4. `Environment.tsx` - GradientSky (line 259)
5. `DustParticles.tsx` (line 139)
6. `AICommandCenter.tsx` (line 107)
7. `AmbientDetails.tsx` - Clock (line 271)
8. `SpatialAudioTracker.tsx` (line 13)
9. `FactoryInfrastructure.tsx` - VolumetricFog (line 513)
10. `FactoryInfrastructure.tsx` - WallClock (line 915)

## CRITICAL: Object Creation in useFrame (GC Pressure)

### Environment.tsx lines 25-29 (LensFlareEffect)
Creates 3 new Vector3 objects EVERY FRAME:
```javascript
useFrame(({ camera }) => {
  // BAD: Creates garbage every frame
  const lightPos = new THREE.Vector3(...position);
  const toCamera = new THREE.Vector3().subVectors(camera.position, lightPos).normalize();
  const cameraDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
```

**Fix:** Create reusable vectors outside useFrame:
```javascript
const lightPosRef = useRef(new THREE.Vector3());
const toCameraRef = useRef(new THREE.Vector3());
const cameraDirRef = useRef(new THREE.Vector3(0, 0, -1));

useFrame(({ camera }) => {
  lightPosRef.current.set(...position);
  toCameraRef.current.subVectors(camera.position, lightPosRef.current).normalize();
  cameraDirRef.current.set(0, 0, -1).applyQuaternion(camera.quaternion);
```

### ForkliftSystem.tsx line 272
Creates new Vector3 every frame:
```javascript
const direction = new THREE.Vector3().subVectors(target, pos);
```

**Fix:** Use a ref for the direction vector.

## Next Steps to Investigate

### 1. Profile useFrame Callbacks
Add timing to identify which useFrame callbacks are slowest:
```javascript
useFrame((state, delta) => {
  const start = performance.now();
  // ... existing code ...
  const elapsed = performance.now() - start;
  if (elapsed > 1) console.warn('Slow useFrame:', elapsed.toFixed(2) + 'ms');
});
```

### 2. Batch useFrame Callbacks
Consider consolidating multiple useFrame callbacks in the same component into one.

### 3. Throttle Non-Critical Animations
Many animations in AmbientDetails don't need 60fps updates. Could throttle to 30fps or less.

### 4. Check for Garbage Collection
Look for object creation inside useFrame that could cause GC pauses:
- `new THREE.Vector3()` calls
- Array creation
- Object literals

### 5. Consider React.memo
Wrap components that don't need frequent re-renders in `React.memo()`.

## Quick Test
Try running on **low** or **medium** graphics quality. If the freeze disappears, the issue is in `AmbientDetails.tsx` (only rendered on high/ultra).

## Key Files Modified This Session
- `src/components/ForkliftSystem.tsx`
- `src/components/WorkerSystem.tsx`
- `src/utils/positionRegistry.ts`
- `src/components/Environment.tsx`
- `src/store.ts`

## Priority Fix Order (Updated)

Since stutter occurs on MEDIUM, focus on components that run on ALL quality levels:

### 1. FIX IMMEDIATELY: Vector3 GC in useFrame

**ForkliftSystem.tsx line 272:**
```javascript
// BAD: new object every frame
const direction = new THREE.Vector3().subVectors(target, pos);
```
Fix: Add `const directionVec = useRef(new THREE.Vector3())` and reuse it.

**Environment.tsx lines 25-29 (LensFlareEffect):**
```javascript
// BAD: 3 new objects every frame
const lightPos = new THREE.Vector3(...position);
const toCamera = new THREE.Vector3().subVectors(...);
const cameraDir = new THREE.Vector3(0, 0, -1).applyQuaternion(...);
```
Fix: Use refs for all three vectors.

### 2. Components with useFrame on MEDIUM quality

These run regardless of quality setting:
| File | useFrame count | Notes |
|------|----------------|-------|
| Environment.tsx | 16 | LensFlare, GameTimeTicker, lighting |
| Machines.tsx | 9 | Machine animations |
| MillScene.tsx | 4 | HeatMap, MachineManager |
| WorkerSystem.tsx | 3 | Worker + HumanModel animation |
| ForkliftSystem.tsx | 3 | Forklift + WarningLight |
| ConveyorSystem.tsx | 4 | Belt animations |
| DustParticles.tsx | 4 | Particle system |
| HolographicDisplays.tsx | 3 | UI displays |
| SpoutingSystem.tsx | 2 | Grain flow |
| FPSMonitor.tsx | 2 | Stats tracking |

### 3. Suspected Heavy Operations

Search for these patterns in the files above:
```javascript
// Object creation in useFrame (causes GC)
new THREE.Vector3
new THREE.Matrix4
new THREE.Quaternion
[...array]  // spread creates new array
{ ...obj }  // spread creates new object

// Store updates in useFrame (causes re-renders)
useMillStore(state => state.someAction)()
set({ ... })
```

### 4. Intervals Running Every Second

These trigger store updates periodically:
- `GameFeatures.tsx:73` - clearOldAnnouncements every 1s (OPTIMIZED but still runs)
- `UIOverlay.tsx:32` - time update every 1s
- `GameFeatures.tsx:699` - LiveTimestamp every 1s
- `ProductionMetrics.tsx:55` - metrics update interval
- `AlertSystem.tsx:138` - alert generation every 8s

## Quick Debug Steps

1. Open browser DevTools → Performance tab
2. Record 3-5 seconds
3. Look for:
   - Yellow bars (scripting) - indicates JS work
   - Purple bars (rendering) - indicates layout/paint
   - GC events (minor/major) - garbage collection pauses

4. If seeing GC events every ~1s, the Vector3 creation is likely the cause.

## Commands
```bash
npm run dev    # Start dev server
npm run build  # Verify build
```

## Files Modified This Session
- `src/components/ForkliftSystem.tsx` - position init, hysteresis, isStopped registry
- `src/components/WorkerSystem.tsx` - walkCycleRef, position init, cooldown
- `src/utils/positionRegistry.ts` - isStopped field
- `src/components/Environment.tsx` - GameTimeTicker throttled to 500ms
- `src/store.ts` - clearOldAnnouncements optimization
