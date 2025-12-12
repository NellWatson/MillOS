/**
 * GPUMemoryMonitor - Debug overlay for GPU memory usage
 *
 * Shows real-time GPU resource counts and memory estimates.
 * Only renders in development or when explicitly enabled.
 *
 * Usage:
 *   <GPUMemoryMonitor enabled={showDebug} position="top-right" />
 */

import React, { useEffect, useState, memo } from 'react';
import { gpuResourceManager, MemoryUsage } from '../utils/GPUResourceManager';

interface GPUMemoryMonitorProps {
  enabled?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  refreshIntervalMs?: number;
}

const positionStyles: Record<string, React.CSSProperties> = {
  'top-left': { top: 10, left: 10 },
  'top-right': { top: 10, right: 10 },
  'bottom-left': { bottom: 10, left: 10 },
  'bottom-right': { bottom: 10, right: 10 },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getColorForPercent(percent: number): string {
  if (percent < 50) return '#22c55e'; // green
  if (percent < 75) return '#eab308'; // yellow
  if (percent < 90) return '#f97316'; // orange
  return '#ef4444'; // red
}

export const GPUMemoryMonitor = memo(function GPUMemoryMonitor({
  enabled = true,
  position = 'top-right',
  refreshIntervalMs = 1000,
}: GPUMemoryMonitorProps) {
  const [stats, setStats] = useState<MemoryUsage | null>(null);
  const [isContextLost, setIsContextLost] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    // Initial stats
    setStats(gpuResourceManager.getMemoryUsage());

    // Refresh interval
    const interval = setInterval(() => {
      setStats(gpuResourceManager.getMemoryUsage());
      setIsContextLost(!gpuResourceManager.isContextAvailable());
    }, refreshIntervalMs);

    // Context loss listeners
    const unsubLost = gpuResourceManager.onContextLost(() => setIsContextLost(true));
    const unsubRestored = gpuResourceManager.onContextRestored(() => setIsContextLost(false));

    return () => {
      clearInterval(interval);
      unsubLost();
      unsubRestored();
    };
  }, [enabled, refreshIntervalMs]);

  if (!enabled || !stats) return null;

  const categories = [
    { name: 'Geometries', data: stats.geometries },
    { name: 'Textures', data: stats.textures },
    { name: 'Materials', data: stats.materials },
    { name: 'RenderTargets', data: stats.renderTargets },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        color: '#fff',
        padding: '12px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '11px',
        minWidth: '200px',
        backdropFilter: 'blur(4px)',
        border: isContextLost ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div
        style={{
          fontWeight: 'bold',
          marginBottom: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>GPU Resources</span>
        {isContextLost && (
          <span style={{ color: '#ef4444', fontSize: '10px' }}>CONTEXT LOST</span>
        )}
      </div>

      {categories.map(({ name, data }) => (
        <div key={name} style={{ marginBottom: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>{name}:</span>
            <span>
              {data.count} ({formatBytes(data.bytes)})
            </span>
          </div>
          <div
            style={{
              height: '3px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(data.budgetPercent, 100)}%`,
                backgroundColor: getColorForPercent(data.budgetPercent),
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      ))}

      <div
        style={{
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
          <span>Total:</span>
          <span style={{ color: getColorForPercent(stats.total.budgetPercent) }}>
            {formatBytes(stats.total.bytes)} ({stats.total.budgetPercent.toFixed(0)}%)
          </span>
        </div>
      </div>
    </div>
  );
});

export default GPUMemoryMonitor;
