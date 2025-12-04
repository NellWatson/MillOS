# Continuation Prompt: Fix Forklift/Worker Oscillation Bug

## Problem
Forklifts and workers visually oscillate (jitter back and forth). User describes as "looping."

## ROOT CAUSE IDENTIFIED
In `ForkliftSystem.tsx` line 760:
```javascript
setIsStopped(!isSafeToMove);  // Called EVERY FRAME!
```

This React setState is called every frame, causing re-renders even when value doesn't change. The oscillation comes from:
1. `forkliftsNearby` array changes slightly each frame (positions update)
2. `isSafeToMove` flips between true/false at boundary conditions
3. `setIsStopped` triggers re-render → visual jitter

Same issue in `WorkerSystem.tsx` line 1048:
```javascript
isEvadingRef.current = false;  // Set every frame when not evading
```

## Files (Now Reverted to Clean State)
- `src/components/ForkliftSystem.tsx` - Simple version, ~1152 lines
- `src/components/WorkerSystem.tsx` - Simple version, ~1653 lines

## THE FIX
**Don't call setState every frame. Only call when value actually changes.**

### ForkliftSystem.tsx - Around line 759-760
Change FROM:
```javascript
const isSafeToMove = pathClear && workersNearby.length === 0 && forkliftsNearby.length === 0;
setIsStopped(!isSafeToMove);
```

Change TO:
```javascript
const isSafeToMove = pathClear && workersNearby.length === 0 && forkliftsNearby.length === 0;
const newIsStopped = !isSafeToMove;
if (newIsStopped !== isStopped) {  // Only update if changed
  setIsStopped(newIsStopped);
}
```

### WorkerSystem.tsx - Around line 1047-1048
Change FROM:
```javascript
} else {
  isEvadingRef.current = false;
```

Change TO:
```javascript
} else {
  if (isEvadingRef.current) {  // Only change if currently evading
    isEvadingRef.current = false;
  }
```

## Additional Hardening (Optional)
Add hysteresis - require condition to be stable before changing state:

```javascript
// Add ref
const stateChangeDelayRef = useRef(0);
const HYSTERESIS_TIME = 0.1; // 100ms

// In useFrame
if (newIsStopped !== isStopped) {
  stateChangeDelayRef.current += delta;
  if (stateChangeDelayRef.current > HYSTERESIS_TIME) {
    setIsStopped(newIsStopped);
    stateChangeDelayRef.current = 0;
  }
} else {
  stateChangeDelayRef.current = 0;
}
```

## Commands
```bash
npm run dev     # Test changes
npm run build   # Verify compiles
```
