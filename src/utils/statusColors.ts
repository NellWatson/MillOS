/**
 * Unified Status Color Utilities
 *
 * Centralized color management for all status indicators across the application.
 * This ensures consistent visual language for machine, dock, and vehicle statuses.
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/** Machine operational status */
export type MachineStatus = 'running' | 'idle' | 'maintenance' | 'warning' | 'error' | 'critical';

/** Dock/truck bay status */
export type DockStatus = 'arriving' | 'loading' | 'departing' | 'clear';

// =============================================================================
// FORKLIFT STATUS
// =============================================================================

/**
 * Get the warning color for forklift status indicators
 * @param isStopped - Whether the forklift is emergency stopped
 * @param isInCrossing - Whether the forklift is in a shared route crossing
 * @returns Hex color string
 */
export const getForkliftWarningColor = (isStopped: boolean, isInCrossing: boolean): string =>
  isStopped ? '#ef4444' : isInCrossing ? '#3b82f6' : '#f59e0b';

// =============================================================================
// MACHINE STATUS COLORS
// =============================================================================

/**
 * Get the hex color for machine status indicators (3D rendering)
 * @param status - Machine status string
 * @returns Hex color string
 */
export const getMachineStatusColor = (status: MachineStatus | string): string => {
  switch (status) {
    case 'running':
      return '#22c55e';
    case 'idle':
      return '#eab308';
    case 'maintenance':
      return '#f59e0b';
    case 'warning':
      return '#f59e0b';
    case 'error':
    case 'critical':
      return '#ef4444';
    default:
      return '#6b7280';
  }
};

/** @deprecated Use getMachineStatusColor instead */
export const getStatusColor = getMachineStatusColor;

// =============================================================================
// DOCK STATUS COLORS
// =============================================================================

/**
 * Get hex color for dock/truck bay status (3D holographic displays)
 * @param status - Dock status
 * @returns Hex color string
 */
export const getDockStatusColor = (status: DockStatus | string): string => {
  switch (status) {
    case 'arriving':
      return '#3b82f6'; // blue
    case 'loading':
      return '#f97316'; // orange
    case 'departing':
      return '#22c55e'; // green
    case 'clear':
      return '#64748b'; // gray
    default:
      return '#64748b';
  }
};
