## Sky Color Freeze Investigation

### Summary
- `SkySystem` animates the dome, stars, lights, and sun/moon by reading `gameTime` and `weather` from `useGameSimulationStore` and pushing computed gradient values into the shader uniforms via `SkyAnimationManager` every frame (`src/components/SkySystem.tsx:253`). The scene background is also driven by the same time-based palette (`src/App.tsx`, not shown here), so both the dome and the clear color will only update when `gameTime` changes.
- `gameTime` is **not** advanced inside `SkySystem`; instead, the dedicated `GameTimeTicker` component registers a callback with `EnvironmentAnimationManager` so that `useGameSimulationStore().tickGameTime()` is called every ~0.5 seconds (`src/components/Environment.tsx:123` and `src/components/Environment.tsx:732`). If that ticker is absent or never registered, the global clock never advances and everything that depends on it (including the sky colors) freezes at whatever value existed when the scene first rendered.

### Key Flow
1. `GameTimeTicker` registers `tickGameTime` with `gameTimeRegistry` on mount (`src/components/Environment.tsx:732`).
2. `EnvironmentAnimationManager` (mounted by `FactoryEnvironment`) runs every frame; when `gameTimeRegistry.size > 0` it invokes `tickGameTime(0.5)` once per 0.5 seconds (`src/components/Environment.tsx:123`), which modifies `useGameSimulationStore().gameTime`.
3. `SkyAnimationManager` (included in `SkySystem`) samples that store value and re-computes gradient colors, cloud density, and `sunAngle` for the shader, ensuring the dome and lighting match the current hour (`src/components/SkySystem.tsx:253-304`).

### Investigation Notes
- The sky staying stuck at its initial color indicates that `gameTime` is not advancing even though the render loop is running (`DynamicBackground` logs in `src/App.tsx` were confirming `useFrame` is still executing).
- Possible reasons for `gameTime` not updating:
  * `GameTimeTicker` is not mounted because `FactoryEnvironment` / `EnvironmentAnimationManager` is disabled via `graphics.perfDebug.disableEnvironment` or because the scene path that contains them is conditionally skipped.
  * `EnvironmentAnimationManager` is mounted but the `gameTimeRegistry` entry is missing, either because `registerGameTime` never ran or it unmounted before the first tick.
  * The app is treating the tab as hidden (`useGameSimulationStore().isTabVisible` false) or `gameSpeed` is zero, causing `tickGameTime` to early-return inside the store (`src/stores/gameSimulationStore.ts:379`).
  * The animation registries in `SkyAnimationManager` rely on `skyDomeRegistry.size > 0`; if the sky mesh never registers, no shader update occurs even if `gameTime` is changing (the registration happens when `meshRef.current` is available in `SkySystem`).
- To diagnose, inspect the stores/registries at runtime (e.g. in browser console):
  1. `useGameSimulationStore.getState().gameTime` — verify it is moving.
  2. `useGameSimulationStore.getState().isTabVisible` — ensure it stays `true`.
  3. `useGraphicsStore.getState().graphics.perfDebug.disableEnvironment` — ensure the environment root (and therefore the ticker) is still mounted.
  4. `gameTimeRegistry.size` via the registry import (`src/utils/environmentRegistry.ts`) — confirm the ticker registered successfully.
  5. `skyDomeRegistry.size` (`src/components/SkySystem.tsx`) — ensure the shader material replenishes on mount for the dome.

### Verification Steps
1. With the app running, open the dev console and paste `window.useGameSimulationStore.getState().gameTime` repeatedly to watch it advance. If it reads the same value for many seconds, `GameTimeTicker` is not functioning.
2. Log `window.useGameSimulationStore.getState().setGameSpeed` and manually call `setGameSpeed(180)` along with `tickGameTime(0.5)` to ensure the store responds—the sky should observe this change immediately if the shader loop is working.
3. Toggle `graphics.perfDebug.disableEnvironment` (via dev tools/localStorage) to `false` to guarantee `FactoryEnvironment` mounts and brings along `EnvironmentAnimationManager`.
4. If the sky remains static despite `gameTime` advancing, inspect `skyDomeRegistry.size`/`meshRef.current` to verify the dome shader material registered correctly; if `size === 0`, the mesh registration effect never ran (e.g., `meshRef.current` was null during the effect due to render order).

### Next Steps
1. Ensure `GameTimeTicker` is always included when the sky needs to update (watch for `graphics.perfDebug.disableEnvironment` or similar flags in `src/components/MillScene.tsx:621`).
2. Reconfirm `EnvironmentAnimationManager` always runs when the canvas is active—tab visibility is already guarded via `useGameSimulationStore().isTabVisible`.
3. If this doc is being used to triage a bug, capture the particular condition that caused the ticker to stop (e.g., environment toggled off, tab hidden, registry cleared). Document each condition and the repro so future debugging follows the same path.
