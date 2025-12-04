import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useMillStore } from '../../store';

interface SafetyPosterProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  type?: 'safety_first' | 'look_out' | 'incident_free' | 'ppe_required';
}

export const SafetyPoster: React.FC<SafetyPosterProps> = ({
  position,
  rotation = [0, 0, 0],
  type = 'safety_first',
}) => {
  const safetyMetrics = useMillStore((state) => state.safetyMetrics);

  // Calculate days without incident
  const daysWithoutIncident = useMemo(() => {
    if (!safetyMetrics?.lastIncidentTime) return 30;
    const now = Date.now();
    const lastIncident = safetyMetrics.lastIncidentTime;
    const diffTime = Math.abs(now - lastIncident);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }, [safetyMetrics?.lastIncidentTime]);

  // Poster content based on type
  const posterContent = useMemo(() => {
    switch (type) {
      case 'safety_first':
        return {
          background: '#dc2626',
          border: '#991b1b',
          title: 'SAFETY FIRST',
          subtitle: 'Production Second',
          icon: '⚠',
          textColor: '#fef3c7',
        };
      case 'look_out':
        return {
          background: '#f97316',
          border: '#c2410c',
          title: 'LOOK OUT',
          subtitle: 'For Each Other',
          icon: '👁',
          textColor: '#fff7ed',
        };
      case 'incident_free':
        return {
          background: '#22c55e',
          border: '#15803d',
          title: `${daysWithoutIncident} DAYS`,
          subtitle: 'Without Incident!',
          icon: '✓',
          textColor: '#f0fdf4',
        };
      case 'ppe_required':
        return {
          background: '#eab308',
          border: '#a16207',
          title: 'PPE REQUIRED',
          subtitle: 'Hard Hat • Safety Vest',
          icon: '🦺',
          textColor: '#1e293b',
        };
      default:
        return {
          background: '#3b82f6',
          border: '#1e40af',
          title: 'STAY SAFE',
          subtitle: 'Stay Alert',
          icon: 'ℹ',
          textColor: '#eff6ff',
        };
    }
  }, [type, daysWithoutIncident]);

  // Memoized poster backing
  const posterTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 384;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = posterContent.background;
    ctx.fillRect(0, 0, 256, 384);

    // Border
    ctx.strokeStyle = posterContent.border;
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, 256, 384);

    // Warning stripes for safety_first type
    if (type === 'safety_first' || type === 'ppe_required') {
      ctx.fillStyle = posterContent.border;
      for (let i = 0; i < 10; i++) {
        const x = i * 30;
        ctx.fillRect(x, 0, 15, 384);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [type, posterContent.background, posterContent.border]);

  return (
    <group position={position} rotation={rotation}>
      {/* Poster backing */}
      <mesh>
        <planeGeometry args={[0.5, 0.7]} />
        <meshStandardMaterial map={posterTexture} roughness={0.7} />
      </mesh>

      {/* HTML overlay for text */}
      <Html
        position={[0, 0, 0.01]}
        transform
        distanceFactor={0.35}
        style={{
          width: '140px',
          textAlign: 'center',
          color: posterContent.textColor,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'bold',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div style={{ padding: '8px' }}>
          <div style={{ fontSize: '28px', lineHeight: '1' }}>{posterContent.icon}</div>
          <div style={{ fontSize: '14px', marginTop: '6px', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
            {posterContent.title}
          </div>
          <div style={{ fontSize: '9px', marginTop: '4px', opacity: 0.9 }}>
            {posterContent.subtitle}
          </div>
        </div>
      </Html>

      {/* Mounting tape at corners */}
      {[
        [-0.22, 0.32],
        [0.22, 0.32],
        [-0.22, -0.32],
        [0.22, -0.32],
      ].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.005]}>
          <planeGeometry args={[0.04, 0.04]} />
          <meshStandardMaterial color="#fef3c7" transparent opacity={0.8} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
};

// Convenience component to place multiple posters
interface SafetyPostersGroupProps {
  positions?: Array<{ pos: [number, number, number]; rotation?: [number, number, number]; type?: SafetyPosterProps['type'] }>;
}

export const SafetyPostersGroup: React.FC<SafetyPostersGroupProps> = ({ positions }) => {
  const defaultPositions = useMemo(
    () => [
      { pos: [-28, 3, -10] as [number, number, number], rotation: [0, Math.PI / 2, 0] as [number, number, number], type: 'safety_first' as const },
      { pos: [28, 3, 0] as [number, number, number], rotation: [0, -Math.PI / 2, 0] as [number, number, number], type: 'look_out' as const },
      { pos: [0, 3, -35] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], type: 'incident_free' as const },
      { pos: [-28, 3, 10] as [number, number, number], rotation: [0, Math.PI / 2, 0] as [number, number, number], type: 'ppe_required' as const },
    ],
    []
  );

  const posters = positions ?? defaultPositions;

  return (
    <group>
      {posters.map((poster, i) => (
        <SafetyPoster
          key={i}
          position={poster.pos}
          rotation={poster.rotation}
          type={poster.type}
        />
      ))}
    </group>
  );
};
