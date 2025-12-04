/**
 * Worker Mood Overlay
 *
 * Renders speech bubbles, mood indicators, and visual effects for worker moods.
 * Theme Hospital inspired - workers grumble charmingly but never storm out.
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useWorkerMoodStore } from '../stores/workerMoodStore';
import type { MoodState } from '../types';
import { Heart, Frown, Smile, Moon, Utensils } from 'lucide-react';

// Mood indicator colors
const MOOD_COLORS: Record<MoodState, string> = {
  content: '#22c55e', // Green
  tired: '#6b7280', // Gray
  frustrated: '#f97316', // Orange
  hangry: '#ef4444', // Red
  elated: '#eab308', // Yellow/Gold
};

// Mood indicator icons (Lucide icon names for reference)
const MOOD_ICONS: Record<MoodState, React.ReactNode> = {
  content: <Smile className="w-3 h-3" />,
  tired: <Moon className="w-3 h-3" />,
  frustrated: <Frown className="w-3 h-3" />,
  hangry: <Utensils className="w-3 h-3" />,
  elated: <Heart className="w-3 h-3" />,
};

interface SpeechBubbleProps {
  text: string;
  position: [number, number, number];
  moodState: MoodState;
}

// Speech bubble component - cartoon style
const SpeechBubble: React.FC<SpeechBubbleProps> = React.memo(({ text, position, moodState }) => {
  const groupRef = useRef<THREE.Group>(null);
  const phaseRef = useRef(Math.random() * Math.PI * 2);

  // Gentle bobbing animation
  useFrame((state) => {
    if (groupRef.current) {
      const bob = Math.sin(state.clock.elapsedTime * 2 + phaseRef.current) * 0.05;
      groupRef.current.position.y = position[1] + 2.2 + bob;
    }
  });

  const bubbleColor = MOOD_COLORS[moodState];

  return (
    <group ref={groupRef} position={[position[0], position[1] + 2.2, position[2]]}>
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <Html
          center
          distanceFactor={8}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              background: 'white',
              border: `2px solid ${bubbleColor}`,
              borderRadius: '12px',
              padding: '6px 10px',
              fontSize: '11px',
              fontFamily: 'system-ui, sans-serif',
              fontWeight: 500,
              color: '#1f2937',
              maxWidth: '140px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              position: 'relative',
              whiteSpace: 'pre-wrap',
            }}
          >
            {text}
            {/* Speech bubble tail */}
            <div
              style={{
                position: 'absolute',
                bottom: '-8px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: `8px solid ${bubbleColor}`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '-5px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: '6px solid white',
              }}
            />
          </div>
        </Html>
      </Billboard>
    </group>
  );
});
SpeechBubble.displayName = 'SpeechBubble';

interface MoodIndicatorProps {
  moodState: MoodState;
  energy: number;
  position: [number, number, number];
}

// Small mood indicator that floats above worker's head
const MoodIndicator: React.FC<MoodIndicatorProps> = React.memo(({ moodState, energy, position }) => {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const pulseRef = useRef(0);

  // Pulse animation for low energy/frustrated states
  useFrame((state) => {
    if (groupRef.current) {
      const shouldPulse = moodState === 'tired' || moodState === 'frustrated' || moodState === 'hangry';
      if (shouldPulse) {
        pulseRef.current = Math.sin(state.clock.elapsedTime * 3) * 0.15 + 1;
        groupRef.current.scale.setScalar(pulseRef.current);
      } else {
        groupRef.current.scale.setScalar(1);
      }
    }
    if (materialRef.current) {
      const alpha = moodState === 'content' ? 0.6 : 0.9;
      materialRef.current.opacity = alpha;
    }
  });

  const color = MOOD_COLORS[moodState];

  return (
    <group ref={groupRef} position={[position[0], position[1] + 1.8, position[2]]}>
      <Billboard>
        {/* Background circle */}
        <mesh>
          <circleGeometry args={[0.15, 16]} />
          <meshBasicMaterial ref={materialRef} color={color} transparent opacity={0.8} />
        </mesh>
        {/* Inner icon area */}
        <mesh position={[0, 0, 0.01]}>
          <circleGeometry args={[0.1, 16]} />
          <meshBasicMaterial color="white" transparent opacity={0.9} />
        </mesh>
      </Billboard>

      {/* HTML overlay for icon */}
      <Billboard>
        <Html center distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <div style={{ color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {MOOD_ICONS[moodState]}
          </div>
        </Html>
      </Billboard>

      {/* Energy bar (small) */}
      <group position={[0, -0.25, 0]}>
        <Billboard>
          {/* Background bar */}
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[0.3, 0.04]} />
            <meshBasicMaterial color="#374151" transparent opacity={0.5} />
          </mesh>
          {/* Energy fill */}
          <mesh position={[(energy / 100 - 1) * 0.15, 0, 0.01]}>
            <planeGeometry args={[0.3 * (energy / 100), 0.03]} />
            <meshBasicMaterial
              color={energy > 50 ? '#22c55e' : energy > 25 ? '#eab308' : '#ef4444'}
              transparent
              opacity={0.8}
            />
          </mesh>
        </Billboard>
      </group>
    </group>
  );
});
MoodIndicator.displayName = 'MoodIndicator';

// Tired worker visual effects (ZZZ floating up, yawn animation indicator)
const TiredEffects: React.FC<{ position: [number, number, number] }> = React.memo(({ position }) => {
  const zzzRefs = useRef<THREE.Group[]>([]);
  const phases = useMemo(() => [0, 0.4, 0.8], []);

  useFrame((state) => {
    zzzRefs.current.forEach((ref, i) => {
      if (ref) {
        const phase = (state.clock.elapsedTime * 0.5 + phases[i]) % 1;
        ref.position.y = position[1] + 2 + phase * 0.5;
        ref.position.x = position[0] + 0.2 + Math.sin(phase * Math.PI * 2) * 0.1;
        const opacity = phase < 0.3 ? phase / 0.3 : phase > 0.7 ? (1 - phase) / 0.3 : 1;
        const scale = 0.05 + phase * 0.05;
        ref.scale.setScalar(scale);
        const material = (ref.children[0] as THREE.Mesh)?.material as THREE.MeshBasicMaterial;
        if (material) material.opacity = opacity * 0.7;
      }
    });
  });

  return (
    <group>
      {phases.map((_, i) => (
        <group
          key={i}
          ref={(el) => {
            if (el) zzzRefs.current[i] = el;
          }}
          position={[position[0] + 0.2, position[1] + 2, position[2]]}
        >
          <Billboard>
            <Text fontSize={1} color="#6b7280" anchorX="center" anchorY="middle">
              Z
            </Text>
          </Billboard>
        </group>
      ))}
    </group>
  );
});
TiredEffects.displayName = 'TiredEffects';

// Main worker mood overlay component
interface WorkerMoodOverlayProps {
  workerId: string;
  position: [number, number, number];
  showIndicator?: boolean;
}

export const WorkerMoodOverlay: React.FC<WorkerMoodOverlayProps> = React.memo(
  ({ workerId, position, showIndicator = true }) => {
    const mood = useWorkerMoodStore((state) => state.workerMoods[workerId]);

    if (!mood) return null;

    return (
      <group>
        {/* Speech bubble when speaking */}
        {mood.isSpeaking && mood.currentPhrase && (
          <SpeechBubble text={mood.currentPhrase} position={position} moodState={mood.state} />
        )}

        {/* Mood indicator (small icon above head) */}
        {showIndicator && !mood.isSpeaking && (
          <MoodIndicator moodState={mood.state} energy={mood.energy} position={position} />
        )}

        {/* Tired effects (ZZZ) */}
        {mood.state === 'tired' && <TiredEffects position={position} />}
      </group>
    );
  }
);
WorkerMoodOverlay.displayName = 'WorkerMoodOverlay';

// Mood system simulation hook - call this in the main scene
export const useMoodSimulation = () => {
  const tickMoodSimulation = useWorkerMoodStore((state) => state.tickMoodSimulation);
  const lastTickRef = useRef(Date.now());

  useFrame(() => {
    const now = Date.now();
    const deltaMs = now - lastTickRef.current;

    // Tick every 1 second of real time (simulating ~1 game minute)
    if (deltaMs >= 1000) {
      const deltaMinutes = deltaMs / 1000; // 1 real second = 1 game minute
      const gameTime = (Date.now() / 1000 / 60) % 24; // Simple game time based on real time
      tickMoodSimulation(gameTime, deltaMinutes);
      lastTickRef.current = now;
    }
  });
};

export default WorkerMoodOverlay;
