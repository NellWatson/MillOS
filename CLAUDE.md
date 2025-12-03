# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MillOS is an AI-powered grain mill digital twin simulator - a 3D React application that visualizes a virtual grain mill factory with interactive machines, workers, conveyors, and real-time production metrics.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server on port 3000
npm run build        # Production build
npm run preview      # Preview production build
```

**Environment Setup:** Copy your Gemini API key to `.env.local` as `GEMINI_API_KEY`

## Architecture

### Tech Stack
- **3D Rendering:** React Three Fiber (@react-three/fiber) + Drei helpers
- **State Management:** Zustand (src/store.ts)
- **Animations:** Framer Motion for UI, Three.js for 3D
- **Styling:** Tailwind CSS
- **Build:** Vite with React plugin

### Key Source Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root component with Canvas setup, panel state, keyboard handlers |
| `src/store.ts` | Zustand store for workers, machines, alerts, AI decisions, metrics |
| `src/types.ts` | TypeScript interfaces and worker roster data |
| `src/components/MillScene.tsx` | Main 3D scene composition, machine placement by zones |

### Scene Architecture (MillScene.tsx)

The factory is organized into 4 production zones:
1. **Zone 1 (z=-22):** Silos (Alpha-Epsilon) - raw material storage
2. **Zone 2 (z=-6):** Roller Mills (RM-101 to RM-106) - milling floor
3. **Zone 3 (z=6, elevated):** Plansifters (A-C) - sifting, positioned at y=9
4. **Zone 4 (z=20):** Packers (Lines 1-3) - packaging output

### Component Categories

**3D Systems** (inside MillScene):
- `Machines.tsx` - Renders silos, mills, sifters, packers with status indicators
- `ConveyorSystem.tsx` - Animated conveyor belts and product flow
- `WorkerSystem.tsx` - Worker avatars with pathfinding
- `ForkliftSystem.tsx` - Autonomous forklifts
- `SpoutingSystem.tsx` - Grain flow pipes between machines
- `DustParticles.tsx` - Atmospheric particle effects
- `Environment.tsx` - Lighting and factory environment

**UI Overlays** (React DOM):
- `UIOverlay.tsx` - Production controls, machine info panels
- `AICommandCenter.tsx` - AI decision slide-out panel
- `AlertSystem.tsx` - Toast notifications
- `WorkerDetailPanel.tsx` - Worker profile modal
- `ProductionMetrics.tsx` - Charts and KPIs
- `HolographicDisplays.tsx` - In-scene 3D UI elements

### State Flow

The app uses both React local state (App.tsx) and Zustand global state (store.ts):
- Local: `productionSpeed`, `showZones`, `showAIPanel`, selection states
- Global: workers, machines, alerts, AI decisions, metrics

### Path Aliases

`@/*` maps to project root (configured in tsconfig.json and vite.config.ts)

## Code Style Rules

### No Emojis - Use Icons Instead

Never use emoji characters in the codebase. Always use Lucide React icons instead.

**Exception:** The 🏭 mill emoji is permitted in these specific branding locations:
- Favicon (`index.html`)
- Loading screen icon (`index.html`)
- Top-left header logo (`UIOverlay.tsx`)

Example:

```tsx
// Bad - using emoji
const icon = '🚨';
<span>{icon}</span>

// Good - using Lucide icons
import { Siren } from 'lucide-react';
<Siren className="w-5 h-5" />
```

Available icon imports from `lucide-react`:
- Alerts: `Siren`, `AlertTriangle`, `CheckCircle`, `Info`, `Shield`
- AI/Tech: `Bot`, `Brain`, `Zap`, `Eye`
- Workers: `User`, `Briefcase`, `HardHat`, `Wrench`, `FlaskConical`, `Shield`

## Known Graphics Issues

### Flickering on Medium+ Quality Settings

Certain effects cause visual flickering (brightness pulsing, "dancing shadows") on medium and higher quality settings. These have been disabled or fixed:

| Component | Issue | Resolution |
|-----------|-------|------------|
| **AtmosphericHaze** | Large transparent boxes with `THREE.BackSide` cause depth sorting conflicts | Disabled in MillScene.tsx |
| **Post-processing (Bloom/Vignette)** | EffectComposer causes flickering with scene lighting | Disabled on medium preset in store.ts |
| **MeshReflectorMaterial** | Floor reflector causes temporal instability | Only enabled on high/ultra |
| **ContactShadows position** | Originally at y=0.01, too close to floor | Raised to y=0.05 |
| **Shadow bias** | Was -0.0001 (too aggressive) | Changed to -0.001 |
| **Camera near/far** | Was 0.1/500 (poor depth precision) | Changed to 0.5/300 |

### Graphics Quality Presets (store.ts)

When adding new visual effects, be aware of what's enabled per quality level:

- **Low:** No shadows, no post-processing, meshBasicMaterial, minimal effects
- **Medium:** Shadows, HDRI environment, standard materials, NO post-processing
- **High/Ultra:** Full effects including post-processing, reflector floor, AmbientDetails

### Preventing Future Flickering

When adding new 3D effects:

1. **Transparent materials with BackSide:** Add `depthTest: false` to prevent depth conflicts
2. **Large overlay volumes:** Avoid or use very low opacity with `depthWrite: false`
3. **Post-processing effects:** Test on medium settings before enabling by default
4. **Shadow-casting lights:** Only use ONE shadow-casting directional light
5. **Floor overlays:** Position at y >= 0.03 to prevent z-fighting with floor
