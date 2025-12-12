/**
 * TimeClock Component
 *
 * A time clock station near the factory entrance where workers clock in/out.
 * Displays current game time and has a card reader with status LED.
 */

import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { useGameSimulationStore } from '../../stores/gameSimulationStore';

// Format game time (0-24) to HH:MM display
const formatGameTime = (time: number): string => {
  const hours = Math.floor(time);
  const minutes = Math.floor((time % 1) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Get shift name from time
const getShiftName = (time: number): string => {
  if (time >= 6 && time < 14) return 'MORNING';
  if (time >= 14 && time < 22) return 'AFTERNOON';
  return 'NIGHT';
};

// Card Reader with LED
const CardReader: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const shiftChangeActive = useGameSimulationStore((state) => state.shiftChangeActive);

  return (
    <group position={position}>
      {/* Reader body */}
      <mesh castShadow>
        <boxGeometry args={[0.15, 0.25, 0.05]} />
        <meshStandardMaterial color="#1f2937" roughness={0.3} />
      </mesh>
      {/* Card slot */}
      <mesh position={[0, -0.05, 0.03]}>
        <boxGeometry args={[0.1, 0.01, 0.02]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} />
      </mesh>
      {/* Status LED - blinks during shift change */}
      <mesh position={[0, 0.08, 0.03]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial
          color={shiftChangeActive ? '#f59e0b' : '#22c55e'}
          emissive={shiftChangeActive ? '#f59e0b' : '#22c55e'}
          emissiveIntensity={shiftChangeActive ? 1.0 : 0.5}
        />
      </mesh>
    </group>
  );
};

// Main TimeClock component
export const TimeClock: React.FC<{
  position?: [number, number, number];
}> = ({ position = [-52, 0, 35] }) => {
  const gameTime = useGameSimulationStore((state) => state.gameTime);
  const currentShift = useGameSimulationStore((state) => state.currentShift);
  const shiftChangeActive = useGameSimulationStore((state) => state.shiftChangeActive);

  const timeDisplay = useMemo(() => formatGameTime(gameTime), [gameTime]);
  const shiftName = useMemo(() => getShiftName(gameTime), [gameTime]);

  return (
    <group position={position}>
      {/* Wall mount plate */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[0.6, 0.8, 0.05]} />
        <meshStandardMaterial color="#374151" roughness={0.4} />
      </mesh>

      {/* Clock housing */}
      <mesh position={[0, 1.65, 0.03]} castShadow>
        <boxGeometry args={[0.5, 0.35, 0.08]} />
        <meshStandardMaterial color="#1f2937" roughness={0.3} />
      </mesh>

      {/* Digital display screen */}
      <mesh position={[0, 1.65, 0.08]}>
        <boxGeometry args={[0.45, 0.28, 0.01]} />
        <meshStandardMaterial
          color="#0f172a"
          emissive="#1e3a5f"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* HTML overlay for time display */}
      <Html position={[0, 1.65, 0.1]} center transform scale={0.12}>
        <div className="bg-slate-900 p-3 rounded font-mono text-center min-w-[180px]">
          {/* Time display */}
          <div className="text-3xl font-bold text-cyan-400 tracking-wider">
            {timeDisplay}
          </div>
          {/* Shift indicator */}
          <div
            className={`text-xs font-semibold mt-1 px-2 py-0.5 rounded inline-block ${
              currentShift === 'morning'
                ? 'bg-amber-500/20 text-amber-400'
                : currentShift === 'afternoon'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-purple-500/20 text-purple-400'
            }`}
          >
            {shiftName} SHIFT
          </div>
          {/* Shift change indicator */}
          {shiftChangeActive && (
            <div className="text-xs text-amber-400 mt-1 animate-pulse">
              SHIFT CHANGE IN PROGRESS
            </div>
          )}
        </div>
      </Html>

      {/* Card reader */}
      <CardReader position={[0, 1.25, 0.03]} />

      {/* Sign above */}
      <mesh position={[0, 2.1, 0]} castShadow>
        <boxGeometry args={[0.5, 0.15, 0.02]} />
        <meshStandardMaterial color="#1e40af" roughness={0.4} />
      </mesh>
      <Html position={[0, 2.1, 0.02]} center>
        <div className="text-white text-xs font-bold whitespace-nowrap">
          CLOCK IN / OUT
        </div>
      </Html>

      {/* Small light for visibility */}
      <pointLight
        position={[0, 1.8, 0.3]}
        intensity={5}
        distance={3}
        color="#67e8f9"
      />
    </group>
  );
};

export default TimeClock;
