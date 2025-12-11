import React, { useMemo } from 'react';
import { Sun, Sunset, Moon, Pause, Play, FastForward } from 'lucide-react';
import { useGameSimulationStore } from '../../stores/gameSimulationStore';

// Isolated Mill Clock component - uses store's gameTime for unified time across app
export const MillClockDisplay: React.FC<{ theme: 'dark' | 'light' }> = React.memo(({ theme }) => {
  // Subscribe to gameTime, throttled to reduce re-renders (updates when integer hour changes or every ~30 game seconds)
  const gameTime = useGameSimulationStore((state) => state.gameTime);
  const gameSpeed = useGameSimulationStore((state) => state.gameSpeed);
  const setGameSpeed = useGameSimulationStore((state) => state.setGameSpeed);

  const hours = Math.floor(gameTime);
  const minutes = Math.floor((gameTime % 1) * 60);

  const shift = useMemo(() => {
    if (hours >= 6 && hours < 14) return { name: 'Day Shift', color: 'text-yellow-400', Icon: Sun };
    if (hours >= 14 && hours < 22)
      return { name: 'Evening Shift', color: 'text-orange-400', Icon: Sunset };
    return { name: 'Night Shift', color: 'text-blue-400', Icon: Moon };
  }, [hours]);

  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  return (
    <div
      className={`rounded-lg px-2 py-1.5 mb-2 border ${
        theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-slate-900/50 border-slate-800'
      }`}
    >
      {/* Clock and Shift Display */}
      <div className="flex items-center justify-between mb-2">
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
        {/* Current speed indicator */}
        <div
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
            gameSpeed === 0
              ? 'bg-red-500/20 text-red-400'
              : gameSpeed >= 60
                ? 'bg-orange-500/20 text-orange-400'
                : 'bg-green-500/20 text-green-400'
          }`}
        >
          {gameSpeed === 0 ? 'PAUSED' : gameSpeed === 1 ? '1x' : gameSpeed === 60 ? '60x' : '3000x'}
        </div>
      </div>

      {/* Fast Forward Buttons */}
      <div className="flex gap-1">
        <button
          onClick={() => setGameSpeed(0)}
          className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-0.5 ${
            gameSpeed === 0
              ? 'bg-orange-600 text-white'
              : theme === 'light'
                ? 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
          title="Pause"
        >
          <Pause className="w-3 h-3" />
        </button>
        <button
          onClick={() => setGameSpeed(1)}
          className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-0.5 ${
            gameSpeed === 1
              ? 'bg-orange-600 text-white'
              : theme === 'light'
                ? 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
          title="Normal speed (1x)"
        >
          <Play className="w-3 h-3" />
          1x
        </button>
        <button
          onClick={() => setGameSpeed(60)}
          className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-0.5 ${
            gameSpeed === 60
              ? 'bg-orange-600 text-white'
              : theme === 'light'
                ? 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
          title="Fast (60x - 1 min/sec)"
        >
          <FastForward className="w-3 h-3" />
          60x
        </button>
        <button
          onClick={() => setGameSpeed(3000)}
          className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-0.5 ${
            gameSpeed === 3000
              ? 'bg-orange-600 text-white'
              : theme === 'light'
                ? 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
          title="Ultra fast (3000x - 50 min/sec)"
        >
          <FastForward className="w-3 h-3" />
          <FastForward className="w-3 h-3 -ml-1.5" />
        </button>
      </div>
    </div>
  );
});

MillClockDisplay.displayName = 'MillClockDisplay';
