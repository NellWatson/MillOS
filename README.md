<div align="center">

<br/>

<p>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Three.js-R169-black?style=for-the-badge&logo=three.js&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/SCADA-ISA--18.2-00A86B?style=for-the-badge" alt="SCADA" />
</p>

# MillOS

### AI-Powered Grain Mill Digital Twin Simulator with Industrial SCADA Integration

*An Agentic Engineering Experiment by Nell Watson*

<br/>

A browser-based 3D industrial simulation featuring autonomous workers, intelligent forklifts,<br/>real-time production metrics, SCADA integration, and an AI command center — all visualizing a complete grain milling operation.

<br/>

![MillOS Screenshot](src/0.10%20Archive/assets/Screenshot.png)

</div>

---

## A Note from Nell Watson

This project represents something I find genuinely exciting about where we are in late 2025: **the emergence of agentic AI as a creative and engineering partner**.

MillOS was not built the traditional way. There is no team of developers who spent months writing boilerplate, debugging physics engines, or hand-tuning shader parameters. Instead, this simulation emerged through sustained dialogue with Claude—describing intentions, reviewing generated code, iterating on failures, and gradually shaping a coherent vision into reality.

What you're seeing here is a snapshot of the current state of the art in **agentic game and simulation engineering**. The term "agentic" matters: it describes AI systems that don't merely respond to prompts but maintain context across complex multi-step tasks, reason about architecture, debug their own mistakes, and collaborate meaningfully on creative and technical challenges. This isn't autocomplete. It's genuine partnership.

The implications extend far beyond one grain mill simulation:

- **Accessibility**: Domain experts who understand industrial processes can now build sophisticated simulations without traditional programming expertise
- **Velocity**: What once required months of specialized development can emerge in days through iterative human-AI collaboration
- **Fidelity**: Complex systems like ISA-18.2 compliant SCADA integration—typically the domain of specialized consultancies—become achievable for small teams or individuals
- **Iteration**: The conversation never ends; refinements, new features, and corrections flow naturally through continued dialogue

I share this project not as a finished product but as evidence of a threshold being crossed. The tools that built this simulation will only grow more capable. The workflows being pioneered today will become standard practice tomorrow. And the people who learn to collaborate effectively with agentic AI—directing intent while trusting execution—will shape what gets built in this new era.

If you're exploring agentic development yourself, I hope MillOS serves as both inspiration and a practical reference. The future of simulation, gaming, and software engineering is being written right now, one conversation at a time.

— **Nell Watson**, December 2025

---

## Overview

MillOS is a fully interactive digital twin of a grain mill factory, built with React Three Fiber. Watch 10 autonomous workers patrol the factory floor, observe 2 intelligent forklifts navigate around obstacles, and monitor real-time SCADA data as 14 machines process grain across 4 production zones. The integrated SCADA system provides industrial-grade monitoring with 90 process tags, ISA-18.2 compliant alarms, and support for real PLC connections via OPC-UA and Modbus protocols.

<table>
<tr>
<td align="center"><strong>14</strong><br/>Interactive Machines</td>
<td align="center"><strong>90</strong><br/>SCADA Tags</td>
<td align="center"><strong>10</strong><br/>Autonomous Workers</td>
<td align="center"><strong>4</strong><br/>Production Zones</td>
</tr>
<tr>
<td align="center"><strong>6</strong><br/>Protocol Adapters</td>
<td align="center"><strong>ISA-18.2</strong><br/>Alarm Standard</td>
<td align="center"><strong>24h</strong><br/>History Retention</td>
<td align="center"><strong>500+</strong><br/>Animated Particles</td>
</tr>
</table>

---

## Features

### Four Production Zones

| Zone | Equipment | Function |
|:----:|-----------|----------|
| **1** | 5 Silos (Alpha–Epsilon) | Raw material storage with real-time capacity tracking |
| **2** | 6 Roller Mills (RM-101–106) | Milling floor with RPM, temperature & vibration monitoring |
| **3** | 3 Plansifters (A–C) | Elevated sifting platforms with oscillation animation |
| **4** | 3 Packer Lines | High-speed packaging at 42 bags/minute |

### Autonomous Worker System

Ten individually modeled workers with:
- **Role-based uniforms** — Supervisors, Engineers, Operators, QC, Maintenance, Safety Officers
- **Realistic walk cycles** — Full limb animation with natural movement
- **Intelligent patrolling** — Workers navigate aisles and avoid obstacles
- **Forklift evasion** — Workers detect approaching vehicles and step aside
- **Detailed profiles** — Experience levels, certifications, shift schedules

### Smart Forklift Fleet

Two autonomous forklifts with:
- Path-based navigation using waypoint systems
- Dynamic collision avoidance (workers and other forklifts)
- Visual cargo states (loaded/empty pallets)
- Warning lights (amber = moving, red = stopped for safety)

### Fire Drill Evacuation System

Fully functional emergency evacuation simulation:
- **Real-time alarm** with continuous emergency siren
- **Four exit points** (Front, Back, West, East) with glowing markers
- **Worker evacuation** at running speed (6 units/sec) to nearest exit
- **Forklift emergency stop** during active drills
- **Live progress tracking** with evacuation timer and worker count
- **Completion detection** with final evacuation time

### First-Person Mode

Immersive walkthrough experience with:
- **WASD movement** with collision detection against machines
- **Sprint mode** (Shift key) for faster exploration
- **Mouse look** with pointer lock controls
- **105° FOV** for immersive factory tours
- **Physical boundaries** preventing access beyond world edges

### Weather System

Dynamic environmental conditions:
- **Clear** sunny factory conditions
- **Cloudy** overcast atmosphere
- **Rain** with visual effects
- **Storm** dramatic weather with enhanced effects

### Multiplayer

Explore the factory together with WebRTC peer-to-peer connections:
- **Room codes** for easy session joining
- **Up to 8 players** with unique avatar colors
- **Real-time position sync** at 20Hz with interpolation
- **Shared machine control** with locking to prevent conflicts
- **AI decision voting** for collaborative factory management
- **In-game chat** for coordination
- **Host migration** when the original host disconnects

### AI Command Center

Real-time decision feed simulating agentic AI operations:

| Type | Icon | Example |
|------|:----:|---------|
| Assignment | 👤 | Dispatching workers to machines |
| Optimization | ⚡ | Adjusting production parameters |
| Prediction | 🔮 | Scheduling preventive maintenance |
| Maintenance | 🔧 | Component care recommendations |
| Safety | 🛡️ | Hazard detection and alerts |

Each decision includes confidence scores, reasoning, and expected business impact.

### Live Production Metrics

Real-time KPIs with 30-minute historical trends:
- Throughput (tonnes/hour)
- Overall Equipment Efficiency
- Quality Grade (Grade A certification)
- System Uptime
- Energy Consumption

### Immersive 3D Environment

- **Grain spouting** — Curved pipes (Catmull-Rom splines) connecting all zones
- **Conveyor system** — Animated belt with 60 flour bags and 25 rotating rollers
- **Loading bay** — Two cycling delivery trucks (GRAIN CO & FLOUR EXPRESS)
- **Holographic displays** — Status billboards floating in 3D space
- **Atmospheric effects** — 500+ dust particles with instanced rendering
- **Industrial lighting** — Colored accent spots and skylights

### SCADA Integration

Full industrial SCADA system with real-time process monitoring:

| Feature | Description |
|---------|-------------|
| **90 Process Tags** | ISA-5.1 compliant naming (e.g., `RM101.TT001.PV`) |
| **5-Tab Monitor Panel** | Tags, Alarms, Trends, Test, Config |
| **ISA-18.2 Alarms** | UNACK/ACKED/RTN state machine with 4 priority levels |
| **Historical Trends** | 24-hour retention in IndexedDB with CSV/JSON export |
| **Fault Injection** | Sensor failures, spikes, drift, stuck values, noise |
| **Protocol Adapters** | Simulation, REST, MQTT, WebSocket, OPC-UA, Modbus |

**Protocol Support:**

| Protocol | Browser-Native | Connection Method |
|----------|:--------------:|-------------------|
| Simulation | Yes | In-browser physics engine |
| REST API | Yes | Direct `fetch()` polling |
| MQTT | Yes | WebSocket (port 8883) |
| WebSocket | Yes | Direct connection |
| OPC-UA | No | Via backend proxy |
| Modbus TCP | No | Via backend proxy |

**Tag Hierarchy by Zone:**

| Zone | Equipment | Tags |
|:----:|-----------|:----:|
| 1 | 5 Silos (Alpha-Epsilon) | 20 |
| 2 | 6 Roller Mills (RM-101-106) | 36 |
| 3 | 3 Plansifters (A-C) | 12 |
| 4 | 3 Packers (Lines 1-3) | 12 |
| - | Utility/Ambient Systems | 10 |

See [SCADA_PLAN.md](SCADA_PLAN.md) for complete API documentation.

---

## Quick Start

### Prerequisites

- Node.js 18+
- Gemini API key (for AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/millos.git
cd millos

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Add your GEMINI_API_KEY to .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the simulation.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 3000) |
| `npm run build` | Create production build |
| `npm run preview` | Preview production build locally |
| `npm test` | Run test suite |

### SCADA Backend Proxy (Optional)

For OPC-UA or Modbus connections to real PLCs:

```bash
cd scada-proxy
npm install
npm run dev          # Development mode
# Or with Docker
docker-compose up    # Includes MQTT broker
```

Configure in `.env`:
```bash
PORT=3001
OPCUA_ENDPOINT=opc.tcp://192.168.1.100:4840
MODBUS_HOST=192.168.1.101
MODBUS_PORT=502
```

---

## Controls

### Orbit Camera Mode (Default)

| Input | Action |
|-------|--------|
| **Left-drag** | Orbit camera around scene |
| **Right-drag** | Pan camera position |
| **Scroll** | Zoom in/out |
| **Click machine** | Open machine detail panel |
| **Click worker** | Open worker profile |

### First-Person Mode

| Input | Action |
|-------|--------|
| **V** | Toggle first-person mode |
| **WASD** | Move forward/left/back/right |
| **Shift** | Sprint (3.6x speed) |
| **Mouse** | Look around |
| **Esc** | Exit first-person mode |

### Global Shortcuts

| Input | Action |
|-------|--------|
| **Z** | Toggle safety zone visibility |
| **I** | Toggle AI Command Center |
| **S** | Toggle SCADA Panel |
| **H** | Toggle heatmap view |
| **M** | Toggle multiplayer lobby |
| **F1-F4** | Graphics quality presets |
| **Spacebar** | Emergency stop |
| **?** | Show keyboard shortcuts |

---

## Architecture

```
src/
├── App.tsx                     # Root component, canvas setup, event handlers
├── store.ts                    # Zustand state management
├── types.ts                    # TypeScript interfaces & worker roster
│
├── components/
│   ├── MillScene.tsx           # Main 3D scene composition
│   │
│   │   # 3D Systems
│   ├── Machines.tsx            # Silos, mills, sifters, packers
│   ├── ConveyorSystem.tsx      # Animated belt & flour bags
│   ├── SpoutingSystem.tsx      # Curved grain pipes
│   ├── WorkerSystem.tsx        # Worker avatars & pathfinding
│   ├── ForkliftSystem.tsx      # Autonomous vehicles
│   ├── DustParticles.tsx       # Instanced particle effects
│   ├── Environment.tsx         # Lighting & factory structure
│   ├── HolographicDisplays.tsx # In-scene 3D UI billboards
│   ├── FirstPersonController.tsx # WASD first-person walkthrough
│   ├── SkySystem.tsx           # Dynamic sky & weather
│   │
│   │   # Physics (Rapier)
│   ├── physics/
│   │   ├── FactoryColliders.tsx         # Machine collision boxes
│   │   ├── PhysicsWorker.tsx            # Worker physics bodies
│   │   ├── PhysicsForklift.tsx          # Forklift physics
│   │   ├── PhysicsFirstPersonController.tsx # FPS physics
│   │   ├── ExitZoneSensors.tsx          # Fire drill exit detection
│   │   └── PhysicsDebug.tsx             # Debug visualization
│   │
│   │   # UI Overlays (React DOM)
│   ├── UIOverlay.tsx           # Production controls & machine info
│   ├── AICommandCenter.tsx     # AI decision slide-out panel
│   ├── SCADAPanel.tsx          # SCADA monitor with 5 tabs
│   ├── WorkerDetailPanel.tsx   # Worker profile modal
│   ├── ProductionMetrics.tsx   # Charts & KPIs
│   └── AlertSystem.tsx         # Toast notifications
│
├── scada/                      # SCADA Integration Layer
│   ├── types.ts                # TypeScript interfaces
│   ├── tagDatabase.ts          # 90 process tags (ISA-5.1 naming)
│   ├── AlarmManager.ts         # ISA-18.2 alarm state machine
│   ├── HistoryStore.ts         # IndexedDB with 24h retention
│   ├── SCADAService.ts         # Main orchestration service
│   ├── SCADABridge.ts          # SCADA-to-3D visual mapping
│   ├── useSCADA.ts             # React hooks
│   ├── useSCADAVisuals.ts      # 3D visualization hooks
│   └── adapters/
│       ├── SimulationAdapter.ts    # Physics-based simulation
│       ├── RESTAdapter.ts          # HTTP polling
│       ├── MQTTAdapter.ts          # MQTT over WebSocket
│       └── WebSocketAdapter.ts     # Direct WebSocket
│
├── multiplayer/                # WebRTC Multiplayer System
│   ├── types.ts                # Player, room, message types
│   ├── MultiplayerManager.ts   # Session orchestration
│   ├── SignalingService.ts     # Room creation & peer discovery
│   ├── PeerConnection.ts       # WebRTC data channel wrapper
│   ├── PlayerInterpolation.ts  # Smooth remote player movement
│   ├── HostMigration.ts        # Failover when host disconnects
│   └── hooks/                  # React hooks (useMultiplayerSync)
│
├── hooks/                      # Reusable React Hooks
│   ├── useKeyboardShortcuts.ts # Keyboard navigation (F1-F4, Z, I, H, etc.)
│   ├── useProceduralTextures.ts # Metal, concrete, wall textures
│   └── useDisposable.ts        # Three.js resource cleanup
│
└── test/                       # Test suite
    └── setup.ts                # Vitest configuration

scada-proxy/                    # Backend Proxy Service
├── src/
│   ├── index.ts                # Express server
│   ├── TagRegistry.ts          # Tag management
│   └── adapters/
│       ├── OPCUAAdapter.ts     # OPC-UA client
│       └── ModbusAdapter.ts    # Modbus TCP client
├── Dockerfile
├── docker-compose.yml
└── mosquitto/                  # MQTT broker config
```

### State Management

MillOS uses **Zustand** for lightweight, performant global state:

```typescript
interface MillStore {
  // Entities
  workers: Worker[]           // 10 workers with positions, tasks, status
  machines: Machine[]         // 14 machines with metrics and status

  // AI System
  aiDecisions: AIDecision[]   // Rolling feed (max 20)

  // Production
  metrics: ProductionMetrics  // Throughput, efficiency, quality, uptime
  productionSpeed: number     // Animation multiplier (0-2.0)

  // UI State
  selectedWorker: string | null
  selectedMachine: string | null
  showZones: boolean
  showAIPanel: boolean
}
```

### Collision System

A custom **PositionRegistry** singleton enables inter-entity awareness:
- Workers register positions each frame
- Forklifts check path clearance 5 units ahead
- Safety radii: 2.5 units (workers), 4 units (forklifts)

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **3D Rendering** | React Three Fiber, @react-three/drei |
| **Physics Engine** | Rapier (@react-three/rapier) |
| **State Management** | Zustand |
| **UI Animation** | Framer Motion |
| **Charts** | Recharts |
| **Styling** | Tailwind CSS |
| **Build Tool** | Vite |
| **Language** | TypeScript |
| **AI Integration** | Google Gemini API |
| **SCADA Protocols** | OPC-UA (node-opcua), Modbus (jsmodbus) |
| **Testing** | Vitest, Playwright (E2E) |
| **Data Storage** | IndexedDB (via idb) |
| **Containerization** | Docker, Docker Compose |

---

## Roadmap

### Completed

- [x] Full SCADA integration with 90 process tags
- [x] ISA-18.2 compliant alarm management
- [x] Multiple protocol adapters (REST, MQTT, WebSocket)
- [x] OPC-UA and Modbus backend proxy
- [x] Historical data with 24-hour retention
- [x] Fault injection for testing scenarios
- [x] Refactored hook architecture (keyboard, textures)
- [x] Comprehensive test suite with Vitest
- [x] Docker containerization for backend services
- [x] CI/CD workflows (GitHub Actions)
- [x] Fire drill evacuation system with real-time tracking
- [x] First-person walkthrough mode (WASD + mouse)
- [x] Rapier physics engine integration
- [x] Dynamic weather system (clear, cloudy, rain, storm)
- [x] Factory exterior with branded signage
- [x] End-to-end testing with Playwright
- [x] WebRTC peer-to-peer multiplayer with host migration

### Planned

- [ ] Live Gemini API integration for dynamic AI decisions
- [ ] VR mode with WebXR controls
- [ ] Historical playback and time-travel debugging
- [ ] Custom scenario editor
- [ ] Mobile touch controls
- [ ] Integration with real SCADA historians (OSIsoft PI, Wonderware)

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- Built with [Claude Code](https://claude.ai/code) (Opus 4.5), with assistance from GPT-5.1-codex-max xhigh, Gemini 2.5, and Gemini 3.0 Pro
- Built with [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- State management by [Zustand](https://github.com/pmndrs/zustand)
- UI animations with [Framer Motion](https://www.framer.com/motion/)
- Charts powered by [Recharts](https://recharts.org)
- Styled with [Tailwind CSS](https://tailwindcss.com)

---

<div align="center">

**MillOS v0.20**

*Transforming grain milling through digital twin technology and industrial SCADA integration*

<br/>

Made with ❤️ by [Nell Watson](https://github.com/nellwatson)

</div>
