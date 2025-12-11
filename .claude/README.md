# MillOS Claude Code Configuration

This directory contains custom Claude Code agents and slash commands tailored for the MillOS grain mill digital twin simulator.

## Quick Reference

### Slash Commands

| Command | Description |
|---------|-------------|
| `/validate` | Run full Geoffrey Pattern validation (typecheck, lint, format, build) |
| `/check-types` | Quick TypeScript-only check via `npx tsc --noEmit` |
| `/find-usages <symbol>` | Find all usages of a type/function before modifying |
| `/cascade-check <file>` | Assess cascade risk before changing shared code |
| `/zone-audit` | Audit machine positions against factory zone layout |
| `/graphics-check` | Check for flickering-prone patterns in 3D code |
| `/review-change` | Review recent git changes against quality standards |
| `/dev` | Start the Vite development server |

### Specialized Agents

| Agent | When to Use |
|-------|-------------|
| `typescript-cascade-preventer` | Before modifying types in `src/types.ts` or shared interfaces |
| `geoffrey-pattern-validator` | After any code changes to ensure validation workflow |
| `react-three-fiber-specialist` | For 3D component work, R3F patterns, Three.js integration |
| `graphics-debugger` | When encountering flickering, z-fighting, or visual artifacts |
| `millos-architecture-guard` | Before structural changes, adding components, or state changes |
| `ai-integration-specialist` | For Gemini API work, AI decisions, or AICommandCenter updates |

---

## Agents

### typescript-cascade-preventer

**Purpose**: Prevents cascading TypeScript errors that waste context and time.

**Use when**:
- Modifying interfaces in `src/types.ts`
- Changing component prop types
- Renaming or removing exports
- Any change that affects multiple files

**Key capabilities**:
- Maps all files importing a type before changes
- Identifies cascade risks (Low/Medium/High)
- Provides recovery protocol if cascade occurs
- Enforces incremental validation after each file

**Example workflow**:
```
1. Find all usages: grep -r "MachineName" src/
2. Count affected files
3. Plan updates for ALL files before changing
4. Make changes with all dependents in one edit
5. Run npx tsc --noEmit after each file
```

---

### geoffrey-pattern-validator

**Purpose**: Enforces the Geoffrey Pattern deterministic validation workflow.

**The Pattern**:
1. **GENERATE** (non-deterministic): Create or modify code
2. **VALIDATE** (deterministic): Run `npm run build` - MUST pass
3. **LOOP**: Fix issues → re-validate until clean
4. **COMPLETE**: ONLY mark done when build passes with proof

**Anti-Deception Protocol**:
- Requires actual terminal output showing success
- No self-certification without command output
- Claims require proof in the form of build output

**Validation commands**:
```bash
npm run typecheck    # TypeScript validation
npm run lint         # ESLint checks
npm run format:check # Prettier formatting
npm run build        # Full production build (required)
```

---

### react-three-fiber-specialist

**Purpose**: Expert guidance for React Three Fiber 3D development.

**Covers**:
- R3F component patterns and best practices
- useFrame animations with delta time
- Performance optimization (instancing, memoization, LOD)
- Drei helper usage
- Graphics quality conditional rendering
- Memory management and resource disposal

**MillOS-specific knowledge**:
- Factory zone layout (Zones 1-4)
- Component architecture (Machines, Conveyors, Workers, etc.)
- Quality preset system (low/medium/high/ultra)
- Zustand integration patterns

---

### graphics-debugger

**Purpose**: Diagnose and fix visual rendering issues.

**Handles**:
- Flickering and brightness pulsing
- Z-fighting between surfaces
- Shadow artifacts
- Post-processing conflicts
- Performance issues (low FPS)

**Known MillOS issues documented**:
- AtmosphericHaze depth sorting
- Post-processing on medium quality
- MeshReflectorMaterial instability
- ContactShadows positioning
- Shadow bias tuning
- Camera depth precision

**Debugging workflow**:
1. Identify symptom type
2. Isolate by disabling components
3. Apply known fix patterns
4. Test across all quality presets

---

### millos-architecture-guard

**Purpose**: Ensures architectural consistency and pattern compliance.

**Enforces**:
- Separation of 3D and UI components
- Zustand state management patterns
- Factory zone positioning rules
- Type definitions in `src/types.ts`
- Path alias usage (`@/`)
- No emojis (icons only)

**Zone Layout**:
```
Zone 1 (z=-22): Silos         [Raw Material Storage]
Zone 2 (z=-6):  Roller Mills  [Milling Floor]
Zone 3 (z=6):   Plansifters   [Sifting - Elevated y=9]
Zone 4 (z=20):  Packers       [Packaging Output]
```

**State Flow**:
```
User Action → Zustand Store → React Re-render → Updated 3D/UI
```

---

### ai-integration-specialist

**Purpose**: Handles AI features and Gemini API integration.

**Covers**:
- Gemini API call patterns
- AIDecision type and structure
- AI Command Center UI
- Context building for AI prompts
- Response parsing and validation
- Error handling and fallbacks

**Environment setup**:
```bash
# .env.local
GEMINI_API_KEY=your_api_key_here
```

---

## Commands

### /validate

Runs the complete Geoffrey Pattern validation suite:

```bash
npm run typecheck    # TypeScript
npm run lint         # ESLint
npm run format:check # Prettier
npm run build        # Production build
```

All must pass before marking tasks complete.

---

### /check-types

Quick TypeScript check for rapid feedback:

```bash
npx tsc --noEmit
```

Use after individual file changes before running full build.

---

### /find-usages <symbol>

Before modifying any shared code, find all usages:

- Import statements
- Direct usages
- Type annotations
- Destructuring patterns

Critical for preventing cascade errors.

---

### /cascade-check <file|symbol>

Assess cascade risk before modifying shared code:

- **Low** (1-3 files): Safe with care
- **Medium** (4-10 files): Plan all updates first
- **High** (10+ files): Consider alternatives

---

### /zone-audit

Audits machine positions against the factory zone layout. Reports:

- Machines in correct zones
- Machines outside boundaries
- Recommendations for corrections

---

### /graphics-check

Searches for patterns known to cause visual issues:

- Transparent BackSide materials
- Floor overlays with y < 0.03
- Multiple shadow-casting lights
- Aggressive shadow bias values
- Camera near/far issues

---

### /review-change

Reviews recent git changes against MillOS quality standards:

- TypeScript compliance
- R3F best practices
- Architecture rules
- Code style
- Graphics patterns

---

### /dev

Starts the development server:

```bash
npm run dev
```

Server runs on http://localhost:3000

---

## Directory Structure

```
.claude/
├── README.md              # This file
├── settings.json          # Agent and command metadata
├── agents/
│   ├── typescript-cascade-preventer.md
│   ├── geoffrey-pattern-validator.md
│   ├── react-three-fiber-specialist.md
│   ├── graphics-debugger.md
│   ├── millos-architecture-guard.md
│   └── ai-integration-specialist.md
└── commands/
    ├── validate.md
    ├── check-types.md
    ├── find-usages.md
    ├── cascade-check.md
    ├── zone-audit.md
    ├── graphics-check.md
    ├── review-change.md
    └── dev.md
```

---

## Integration with CLAUDE.md

These agents and commands complement the rules in the project root `CLAUDE.md`:

- **Geoffrey Pattern** → `geoffrey-pattern-validator` agent, `/validate` command
- **TypeScript Cascade Prevention** → `typescript-cascade-preventer` agent, `/cascade-check` command
- **Known Graphics Issues** → `graphics-debugger` agent, `/graphics-check` command
- **Scene Architecture** → `millos-architecture-guard` agent, `/zone-audit` command

The agents have full context of MillOS-specific patterns, quality presets, and architectural decisions documented in CLAUDE.md.
