import React, { useMemo } from 'react';
import { Sun, Sunset, Moon } from 'lucide-react';
import { useGameSimulationStore } from '../../stores/gameSimulationStore';

// Speed options: 0 = paused, 1 = 1x, 60 = 60x (1 sec = 1 min), 300 = 5 min/sec
const SPEED_OPTIONS = [
  { value: 0, label: 'Paused', display: 'II' },
  { value: 1, label: '1x', display: '1x' },
  { value: 60, label: '60x', display: '60x' },
  { value: 300, label: '300x', display: '5m/s' },
];

// Isolated Mill Clock component - uses store's gameTime for unified time across app
export const MillClockDisplay: React.FC<{ theme: 'dark' | 'light' }> = React.memo(({ theme }) => {
  // Subscribe to gameTime, throttled to reduce re-renders (updates when integer hour changes or every ~30 game seconds)
  const gameTime = useGameSimulationStore((state) => state.gameTime);
  const gameSpeed = useGameSimulationStore((state) => state.gameSpeed);
  const setGameSpeed = useGameSimulationStore((state) => state.setGameSpeed);

  // Find current speed index for display
  const speedIndex = useMemo(() => {
    const idx = SPEED_OPTIONS.findIndex((opt) => opt.value === gameSpeed);
    return idx >= 0 ? idx : 2; // Default to 60x if not found
  }, [gameSpeed]);

  const hours = Math.floor(gameTime);
  const minutes = Math.floor((gameTime % 1) * 60);

  const shift = useMemo(() => {
    if (hours >= 6 && hours < 14) return { name: 'Day Shift', color: 'text-yellow-400', Icon: Sun };
    if (hours >= 14 && hours < 22)
      return { name: 'Evening Shift', color: 'text-orange-400', Icon: Sunset };
    return { name: 'Night Shift', color: 'text-blue-400', Icon: Moon };
  }, [hours]);

  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  const togglePause = () => setGameSpeed(gameSpeed === 0 ? 60 : 0);
  const cycleSpeed = () => {
    const nextIndex = (speedIndex + 1) % SPEED_OPTIONS.length;
    // Skip paused when cycling, go to 1x instead
    setGameSpeed(SPEED_OPTIONS[nextIndex === 0 ? 1 : nextIndex].value);
  };
  const speedLabel = SPEED_OPTIONS[speedIndex].label;

  return (
    <div
      className={`flex items-center justify-between rounded-lg px-2 py-1.5 mb-2 border ${
        theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-slate-900/50 border-slate-800'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <shift.Icon className={`w-5 h-5 ${shift.color}`} />
        <div>
          <div
            className={`text-lg font-mono font-bold tracking-wider leading-tight ${
              gameSpeed === 0
                ? theme === 'light'
                  ? 'text-slate-400'
                  : 'text-slate-500'
                : theme === 'light'
                  ? 'text-slate-800'
                  : 'text-white'
            }`}
          >
            {timeString}
          </div>
          <div className={`text-[9px] font-medium uppercase tracking-wider ${shift.color}`}>
            {shift.name}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={togglePause}
          className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
            gameSpeed === 0
              ? 'bg-cyan-500/20 text-cyan-400'
              : theme === 'light'
                ? 'bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-700'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
          title={gameSpeed === 0 ? 'Resume' : 'Pause'}
        >
          {gameSpeed === 0 ? (
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6zm8 0h4v16h-4z" />
            </svg>
          )}
        </button>
        <button
          onClick={cycleSpeed}
          className={`px-1.5 h-6 rounded text-[9px] font-mono font-bold transition-all min-w-[36px] ${
            theme === 'light'
              ? 'bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-700'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
          title="Cycle speed"
        >
          {speedLabel}
        </button>
      </div>
    </div>
  );
});

MillClockDisplay.displayName = 'MillClockDisplay';
