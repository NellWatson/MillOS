/**
 * SCADA Module for MillOS
 *
 * Bidirectional SCADA integration layer supporting:
 * - Simulation mode (physics-based value generation)
 * - Live mode (real SCADA data via REST, MQTT, OPC-UA)
 * - 90+ industrial tags with ISA naming convention
 * - ISA-18.2 compliant alarm management
 * - 24-hour rolling history with IndexedDB persistence
 */

// Types
export * from './types';

// Tag Database
export {
  MILL_TAGS,
  getTagsByMachine,
  getTagsByGroup,
  getTagById,
  getWritableTags,
  getTagsWithAlarms,
} from './tagDatabase';

// Core Services
export { SCADAService, getSCADAService, initializeSCADA, shutdownSCADA } from './SCADAService';
export { AlarmManager } from './AlarmManager';
export { HistoryStore } from './HistoryStore';

// Adapters
export { SimulationAdapter } from './adapters/SimulationAdapter';
export { RESTAdapter } from './adapters/RESTAdapter';
export { MQTTAdapter } from './adapters/MQTTAdapter';
export { WebSocketAdapter } from './adapters/WebSocketAdapter';

// Historian Integration (OSIsoft PI, Wonderware/AVEVA)
export { PIAdapter } from './adapters/PIAdapter';
export { WonderwareAdapter } from './adapters/WonderwareAdapter';
export { HistorianRouter } from './HistorianRouter';
export type {
  IHistorian,
  InterpolationMode,
  HistorianQueryOptions,
  HistorianStatistics,
  PIConnectionConfig,
  WonderwareConnectionConfig,
  HistorianConnectionConfig,
} from './HistorianInterface';

// React Hooks
export { useSCADA, useSCADAMachine, useSCADATag, useSCADAAlarms } from './useSCADA';
export type { UseSCADAReturn } from './useSCADA';

// SCADA Bridge - Visual Properties
export {
  calculateMachineVisuals,
  scadaToStoreMetrics,
  getMachineIdFromTag,
  getTagIdsForMachine,
  getAlarmVisualConfig,
  temperatureToColor,
  vibrationToColor,
  levelToColor,
} from './SCADABridge';
export type { MachineVisualProperties, SCADAToStoreSync, AlarmVisualConfig } from './SCADABridge';

// Visual Hooks for 3D Components
export {
  useSCADAMachineVisuals,
  useSCADAAllMachineVisuals,
  useSCADASync,
  useSCADAAlarmVisuals,
  useSCADATemperatureColor,
  useSCADACriticalStatus,
} from './useSCADAVisuals';
