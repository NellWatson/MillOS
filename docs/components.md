# Components Reference

**Status:** legacy component snapshot, source and reachability verification required

**Current orientation:** [MillOS Architecture](./architecture.md)

Reference documentation for all React components in the MillOS application.

## Table of Contents

1. [Root Components](#root-components)
2. [3D Scene Components](#3d-scene-components)
4. [Vehicle Components](#vehicle-components)
5. [Environment Components](#environment-components)
6. [UI Components](#ui-components)
7. [Effect Components](#effect-components)

---

## Root Components

### App.tsx

**Location:** `src/App.tsx`

The root application component that sets up the React Three Fiber canvas and manages top-level state.

#### Responsibilities
- Canvas initialization with camera and renderer settings
- OrbitControls configuration
- Panel state management (AI panel, machine selection)
- Audio initialization on first user interaction
- Keyboard event handling (Escape to close panels)

#### State Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `productionSpeed` | number | 0.8 | Production line speed multiplier (0-2) |
| `showZones` | boolean | true | Toggle safety zone visibility |
| `showAIPanel` | boolean | false | AI Command Center panel visibility |
| `selectedMachine` | MachineData \| null | null | Currently selected machine |
| `audioInitialized` | boolean | false | Audio context initialization state |

#### Key Features
- Auto-rotation of camera when no selection is active
- Panel open/close sound effects
- ESC key to dismiss all panels

---

### MillScene.tsx

**Location:** `src/components/MillScene.tsx`

The main 3D scene composition component that orchestrates all factory elements.

#### Props

```typescript
interface MillSceneProps {
  productionSpeed: number;
  showZones: boolean;
  onSelectMachine: (data: MachineData) => void;
}
```

#### Machine Generation

The component generates machine data with `useMemo`:

```typescript
// Zone 1: Silos at z=-22
const siloNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];

// Zone 2: Roller Mills at z=-6
const millNames = ['RM-101', 'RM-102', 'RM-103', 'RM-104', 'RM-105', 'RM-106'];

// Zone 3: Plansifters at z=6, y=9 (elevated)
const sifterNames = ['Sifter A', 'Sifter B', 'Sifter C'];

// Zone 4: Packers at z=20
const packerNames = ['Pack Line 1', 'Pack Line 2', 'Pack Line 3'];
```

#### Rendered Components

```tsx
<group>
  <FactoryEnvironment />
  <Machines machines={machines} onSelect={onSelectMachine} />
  <SpoutingSystem machines={machines} />
  <FactoryInfrastructure floorSize={FLOOR_SIZE} showZones={showZones} />
  <ConveyorSystem productionSpeed={productionSpeed} />
  <ForkliftSystem />
  <TruckBay productionSpeed={productionSpeed} />
  <DustParticles count={500} />
  <GrainFlow />
  <HolographicDisplays />
</group>
```

---

## 3D Scene Components

### CompactMachines.tsx

**Location:** `src/components/machines/CompactMachines.tsx` (`Machines.tsx` at the components root is dead code and is listed as such by `npm run validate:reachability`)

Renders all factory machinery with type-specific geometry and status indicators.

#### Machine Types

| Type | Geometry | Color | Animation |
|------|----------|-------|-----------|
| `SILO` | Cylinder with cones | #cbd5e1 | None |
| `ROLLER_MILL` | Box with hopper | #3b82f6 | Y-axis vibration |
| `PLANSIFTER` | Suspended box | #f8fafc | XZ-axis oscillation |
| `PACKER` | Box with chute | #f59e0b | None |

#### Status Colors

| Status | Color | Emissive |
|--------|-------|----------|
| `running` | #22c55e (green) | Yes |
| `idle` | #9ca3af (gray) | No |
| `warning` | #f59e0b (amber) | Yes |
| `critical` | #ef4444 (red) | Yes |

#### Machine Sound Integration

```typescript
switch (type) {
  case MachineType.ROLLER_MILL:
    audioManager.playMillSound(data.id, data.metrics.rpm);
    break;
  case MachineType.PLANSIFTER:
    audioManager.playSifterSound(data.id, data.metrics.rpm);
    break;
  case MachineType.PACKER:
    audioManager.playPackerSound(data.id);
    break;
}
```

---

### ConveyorSystem.tsx

**Location:** `src/components/ConveyorSystem.tsx`

Animated conveyor belts with flour bag products.

#### Sub-Components

1. **ConveyorBelt** - Main belt surface with animated texture offset
2. **RollerConveyor** - Rolling cylinder transport
3. **FlourBagMesh** - Individual product meshes

#### Animation

```typescript
useFrame((_, delta) => {
  ref.current.position.x += data.speed * speedMulti * delta;
  if (ref.current.position.x > boundary) {
    ref.current.position.x = -boundary;
  }
});
```

#### Configuration

| Property | Value |
|----------|-------|
| Bag Count | 60 |
| Belt Length | 55 units |
| Roller Count | 25 |

---

## Environment Components

### OptimizedFactoryEnvironment.tsx

**Location:** `src/components/environment/OptimizedFactoryEnvironment.tsx` (with `SceneEnvironmentIBL.tsx`, `SunShadowRig.tsx`, `OptimizedSkySystem.tsx`, `InteriorLightRig.tsx`, `NearHorizonCity.tsx` in the same directory)

Factory environment including lighting, walls, and time-of-day effects.

#### Daylight System

Time-responsive window lighting based on 24-hour game clock:

| Time Period | Hours | Color | Intensity |
|-------------|-------|-------|-----------|
| Night | 20:00-05:00 | #1e3a5f | 0.1 |
| Dawn | 05:00-07:00 | #f97316 | 0.2-0.5 |
| Morning | 07:00-10:00 | #fbbf24 | 0.5-0.8 |
| Midday | 10:00-16:00 | #7dd3fc | 0.8 |
| Afternoon | 16:00-18:00 | #fbbf24 | 0.5-0.7 |
| Dusk | 18:00-20:00 | #f97316 | 0.2-0.5 |

#### Factory Structure

- **Walls** - 4 walls with industrial panels
- **Windows** - Daylight-responsive glass
- **Ceiling** - With 3 skylights
- **Support Beams** - 5 vertical columns
- **Roof Trusses** - Horizontal structural elements
- **Loading Bay Doors** - 3 large doors with warning stripes

---

### DustParticles.tsx

**Location:** `src/components/DustParticles.tsx`

Atmospheric particle effects for factory ambiance.

#### Components

1. **DustParticles** - Floating dust motes (count: 500)
2. **GrainFlow** - Grain particles flowing through system

---

## UI Components

### GameInterface.tsx

**Location:** `src/components/ui-new/GameInterface.tsx`

Main control panel and information display.

#### Features

1. **Mill Clock** - 24-hour simulated time with shift indicators
2. **Production Metrics** - Recharts-powered live graphs
3. **Speed Controls** - Production speed slider (0-200%)
4. **Zone Toggle** - Safety zone visibility
5. **Sound Controls** - Volume slider and mute toggle
6. **AI Panel Button** - Opens AI Command Center
7. **Equipment Legend** - Color-coded equipment guide

#### Time Speed Options

| Speed | Label | Display |
|-------|-------|---------|
| 0 | Paused | II |
| 1 | 1x | 1x |
| 60 | 60x | 60x |
| 300 | 300x | 5m/s |

---

### AICommandCenter.tsx

**Location:** `src/components/AICommandCenter.tsx`

Slide-out panel showing AI decisions and system status.

#### System Metrics

| Metric | Range | Color |
|--------|-------|-------|
| CPU | 15-35% | Cyan |
| Memory | 40-55% | Green |
| Decisions | Cumulative | Purple |

#### Decision Types

| Type | Icon | Color Gradient |
|------|------|----------------|
| assignment | User | blue |
| optimization | Zap | green |
| prediction | Eye | purple |
| maintenance | Wrench | yellow |
| safety | Shield | red |

---

### AlertSystem.tsx

**Location:** `src/components/AlertSystem.tsx`

Toast notification system for factory events.

#### Alert Types

| Type | Icon | Background | Border |
|------|------|------------|--------|
| critical | Siren | red-950 | red-500 |
| warning | AlertTriangle | yellow-950 | yellow-500 |
| success | CheckCircle | green-950 | green-500 |
| safety | Shield | emerald-950 | emerald-500 |
| info | Info | blue-950 | blue-500 |

---

### ProductionMetrics.tsx

**Location:** `src/components/ProductionMetrics.tsx`

Real-time production KPIs and safety metrics.

#### Displayed Metrics

| Metric | Unit | Color |
|--------|------|-------|
| Throughput | t/hr | White |
| Efficiency | % | Green |
| Quality | % | Purple |
| Bags/min | count | Orange |
| Uptime | % | Blue |
| Energy Usage | kWh | Yellow |

#### Safety Dashboard

- Safety stops count
- Route conflicts count
- Time since last incident

---

## Effect Components

### PostProcessing.tsx

**Location:** `src/components/PostProcessing.tsx`

Visual post-processing effects using @react-three/postprocessing.

---

### HolographicDisplays.tsx

**Location:** `src/components/HolographicDisplays.tsx`

In-scene 3D holographic UI elements.

---

### SpoutingSystem.tsx

**Location:** `src/components/SpoutingSystem.tsx`

Grain flow pipes connecting machines.

---

### FactoryInfrastructure.tsx

**Location:** `src/components/FactoryInfrastructure.tsx`

Floor markings, safety zones, and structural elements.
