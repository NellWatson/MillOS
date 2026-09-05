# MillOS Documentation

**Status:** current documentation map

**Reviewed:** 2026-08-31

**Product identity:** `0.40.0`, verified from `package.json`

Use this page to identify the right authority before reading deeply. Source and assembled runtime evidence override stale prose.

## Start here

| Need                                             | Authority                                                                                       |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Understand the current assembled system          | [Architecture](./architecture.md)                                                               |
| Understand the target agent-operating system     | [Agent Operating Architecture](./AGENT_OPERATING_ARCHITECTURE.md)                               |
| Execute that target after authorization          | [Agent Operating System Programme](../_contprompts/millos_agent_operating_system_2026-08-31.md) |
| Inspect implemented agent contracts and evidence | [Agent Contract Spine](./agent/README.md)                                                       |
| Find current state owners and mutation rules     | [State Management](./state-management.md)                                                       |
| Understand current and target AI behaviour       | [AI Integration](./ai-integration.md)                                                           |
| Use or inspect SCADA                             | [SCADA Integration](./SCADA_PLAN.md)                                                            |
| Understand bilateral values and governance       | [Bilateral Autonomy System](./BILATERAL_AUTONOMY_SYSTEM_SPEC.md)                                |
| Navigate compiled source-cited knowledge         | [Wiki index](../_wiki/index.md)                                                                 |
| Run development and validation workflows         | [Development Guide](./development.md)                                                           |

## Document classes

| Class             | Meaning                                                                |
| ----------------- | ---------------------------------------------------------------------- |
| canonical target  | accepted direction for future design                                   |
| current reference | concise map of present source and runtime behaviour                    |
| plan              | authorized only by a later explicit instruction                        |
| generated         | derived from source and checked for drift                              |
| historical        | useful decision history, with no authority over current topology       |
| evidence          | candidate-specific result with a stated fingerprint and evidence level |

Every major design document should declare its class or status near the top. When two documents conflict, prefer current source, assembled runtime evidence, the canonical target, and the newest accepted execution contract in that order.

## Current references

| Document                                  | Role                                                           |
| ----------------------------------------- | -------------------------------------------------------------- |
| [Architecture](./architecture.md)         | runtime assembly, domain map, services, boundaries             |
| [State Management](./state-management.md) | store owners, reads, writes, persistence, coordination         |
| [AI Integration](./ai-integration.md)     | tactical and strategic layers, current seams, target migration |
| [SCADA Integration](./SCADA_PLAN.md)      | tags, adapters, alarms, history, proxy, external boundary      |
| [Agent Contract Spine](./agent/README.md) | Phase 0 evidence, executable registry, generated discovery     |

## Topical guides requiring verification

These guides remain useful entrypoints. They describe earlier snapshots or narrower topics and must be checked against their named current authorities.

| Document                            | Verification boundary                                                     |
| ----------------------------------- | ------------------------------------------------------------------------- |
| [3D Scene](./3d-scene.md)           | verify source, reachability, and assembled runtime                        |
| [Audio System](./audio-system.md)   | verify current audio manager, hooks, catalog, and runtime                 |
| [Safety System](./safety-system.md) | verify current stores, controllers, and browser behaviour                 |
| [Components](./components.md)       | verify every component against reachability and current callers           |
| [Development](./development.md)     | verify commands against `package.json` and rules against `AGENTS.md`      |
| [Deployment](./deployment.md)       | verify workflows, configuration, hosted candidate, and publication status |

## Canonical target and plans

| Document                                                                                        | Status                                                                                              |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [Agent Operating Architecture](./AGENT_OPERATING_ARCHITECTURE.md)                               | canonical target for semantic identity, queries, commands, authority, evidence, and accretion       |
| [Agent Operating System Programme](../_contprompts/millos_agent_operating_system_2026-08-31.md) | phased execution contract; Phases 0 and 1 implemented, later phases held                            |
| [Master Refinement Programme](../_contprompts/millos_master_refinement_2026-07-26.md)           | broad product refinement programme; agent-system work follows the newer target where scopes overlap |
| [Bilateral Autonomy System](./BILATERAL_AUTONOMY_SYSTEM_SPEC.md)                                | values and governance foundation                                                                    |

## Historical design records

These documents preserve rationale and prior implementation shapes. Verify every file path and capability against current source before acting.

| Document                                                         | Historical value                                       |
| ---------------------------------------------------------------- | ------------------------------------------------------ |
| [BAS Implementation Specification](./BAS_IMPLEMENTATION_SPEC.md) | comprehensive early implementation blueprint           |
| [UI Redesign Specification](./UI_REDESIGN_SPEC.md)               | migration into the current dock and sidebar generation |
| [Refactoring Guide](./REFACTORING_GUIDE.md)                      | earlier modularization guidance                        |
| [Store Refactoring Summary](./STORE_REFACTORING_SUMMARY.md)      | store migration history                                |
| [Migration Tracker](./MIGRATION_TRACKER.md)                      | historical migration ledger                            |

## Source entrypoints

| Question                                | Start                                                               |
| --------------------------------------- | ------------------------------------------------------------------- |
| boot and Canvas lifecycle               | `src/main.tsx`, `src/App.tsx`                                       |
| mounted world                           | `src/components/MillScene.tsx`                                      |
| canonical tick transitions              | `src/systems/UnifiedGameTick.ts`                                    |
| domain stores                           | `src/stores/README.md`, `src/stores/`                               |
| compatibility and SCADA synchronization | `src/store.ts`                                                      |
| SCADA                                   | `src/scada/`                                                        |
| tactical and strategic AI               | `src/utils/aiEngine.ts`, `src/stores/aiConfigStore.ts`              |
| assembled runtime diagnostics           | `src/components/RuntimeController.tsx`, `window.__MILLOS_RUNTIME__` |
| operational UI                          | `src/components/ui-new/GameInterface.tsx`                           |
| replay evidence                         | replay stores and `src/components/game/IncidentReplayControls.tsx`  |
| agent identities and contracts          | `src/agent/`, `docs/agent/`, `build/generated/agent/`               |

## Evidence levels

Keep these claims separate:

1. source and type proof;
2. deterministic test proof;
3. built-package proof;
4. assembled browser and runtime proof;
5. human visual, accessibility, or operational review;
6. real external system proof;
7. rights and licence proof;
8. deployment and publication proof.

A higher item does not follow automatically from a lower item. Any source or package change invalidates candidate-specific runtime and human evidence until refreshed.

## Validation entrypoints

`package.json` is the command authority. Common gates include:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run agent:typecheck
npm run agent:manifest:check
npm test
npm run build
npm run validate:assets
npm run validate:depth
npm run validate:shaders
npm run validate:bundle
npm run validate:reachability
```

Rendering and capture commands must obey `.capture.lock`. Performance results require load inspection and repeated, interleaved evidence when the expected effect is close to machine drift.

## Documentation maintenance

1. Mark a document current, canonical, plan, generated, historical, or evidence.
2. Link source and runtime authority for load-bearing claims.
3. Avoid manually copying registries that can be generated.
4. Preserve prior rationale by marking it historical instead of silently rewriting history.
5. Update this map whenever a new canonical document or superseding plan is accepted.
6. Run link and drift checks before treating documentation as current.
