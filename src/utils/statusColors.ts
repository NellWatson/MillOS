/**
 * Utility functions for consistent status color management across the application
 */

/**
 * Get the warning color for forklift status indicators
 * @param isStopped - Whether the forklift is emergency stopped
 * @param isInCrossing - Whether the forklift is in a pedestrian crossing
 * @returns Hex color string
 */
export const getForkliftWarningColor = (isStopped: boolean, isInCrossing: boolean): string =>
  isStopped ? '#ef4444' : isInCrossing ? '#3b82f6' : '#f59e0b';

/**
 * Get the color for machine status indicators
 * @param status - Machine status string
 * @returns Hex color string
 */
export const getStatusColor = (status: string): string => {
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
