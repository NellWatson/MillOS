import React from 'react';
import {
  Volume2,
  Monitor,
  Gauge,
  Music,
  Wind,
  Eye,
  Activity,
  RotateCcw,
  Grid3X3,
} from 'lucide-react';
import { useGraphicsStore, GraphicsQuality } from '../../../stores/graphicsStore';
import { useGameSimulationStore } from '../../../stores/gameSimulationStore';
import { audioManager } from '../../../utils/audioManager';

// Hook for audio state (re-used from UIOverlay logic)
function useAudioState() {
  const [_, forceUpdate] = React.useState({});
  React.useEffect(() => {
    return audioManager.subscribe(() => forceUpdate({}));
  }, []);
  return {
    muted: audioManager.muted,
    volume: audioManager.volume,
    musicEnabled: audioManager.musicEnabled,
    musicVolume: audioManager.musicVolume,
    ttsEnabled: audioManager.ttsEnabled,
    setMuted: (v: boolean) => {
      audioManager.muted = v;
    },
    setVolume: (v: number) => {
      audioManager.volume = v;
    },
    setMusicEnabled: (v: boolean) => {
      audioManager.musicEnabled = v;
    },
    setMusicVolume: (v: number) => {
      audioManager.musicVolume = v;
    },
    setTtsEnabled: (v: boolean) => {
      audioManager.ttsEnabled = v;
    },
  };
}

export const SettingsPanel: React.FC<{
  productionSpeed: number;
  setProductionSpeed: (v: number) => void;
  showZones?: boolean;
  setShowZones?: (v: boolean) => void;
}> = ({ productionSpeed, setProductionSpeed, showZones, setShowZones }) => {
  const graphics = useGraphicsStore();
  const setGraphicsQuality = useGraphicsStore((state) => state.setGraphicsQuality);
  const clearPersistedState = useGameSimulationStore((state) => state.clearPersistedState);
  const audio = useAudioState();

  return (
    <div className="p-4 space-y-6 h-full overflow-y-auto custom-scrollbar">
      {/* Simulation Speed */}
      <section>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Gauge size={14} className="text-orange-500" />
          Simulation Control
        </h3>
        <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-400">Production Speed</span>
            <span className="text-orange-400 font-mono font-bold">
              {(productionSpeed * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={productionSpeed}
            onChange={(e) => setProductionSpeed(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
        </div>
      </section>

      {/* Audio Settings */}
      <section>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Volume2 size={14} className="text-cyan-400" />
          Audio
        </h3>
        <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5 space-y-4">
          {/* Master Volume */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-300">Master Volume</span>
              <button
                onClick={() => audio.setMuted(!audio.muted)}
                aria-label={audio.muted ? 'Unmute audio' : 'Mute audio'}
                className="text-[10px] text-cyan-400 hover:text-cyan-300"
              >
                {audio.muted ? 'UNMUTE' : 'MUTE'}
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={audio.volume}
              onChange={(e) => audio.setVolume(parseFloat(e.target.value))}
              disabled={audio.muted}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-50"
            />
          </div>

          {/* Music Volume */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Music size={12} className="text-slate-400" />
                <span className="text-xs text-slate-300">Music</span>
              </div>
              <button
                onClick={() => audio.setMusicEnabled(!audio.musicEnabled)}
                aria-label={audio.musicEnabled ? 'Disable music' : 'Enable music'}
                aria-pressed={audio.musicEnabled}
                className={`text-[10px] px-2 py-0.5 rounded ${audio.musicEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}
              >
                {audio.musicEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={audio.musicVolume}
              onChange={(e) => audio.setMusicVolume(parseFloat(e.target.value))}
              disabled={!audio.musicEnabled}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
            />
          </div>

          {/* TTS Toggle */}
          <div className="flex justify-between items-center pt-2 border-t border-white/5">
            <span className="text-xs text-slate-300">PA Announcements</span>
            <button
              onClick={() => audio.setTtsEnabled(!audio.ttsEnabled)}
              aria-label={audio.ttsEnabled ? 'Disable PA announcements' : 'Enable PA announcements'}
              aria-pressed={audio.ttsEnabled}
              className={`text-[10px] px-2 py-0.5 rounded ${audio.ttsEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-400'}`}
            >
              {audio.ttsEnabled ? 'ENABLED' : 'MUTED'}
            </button>
          </div>
        </div>
      </section>

      {/* Graphics Settings */}
      <section>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Monitor size={14} className="text-purple-400" />
          Graphics
        </h3>

        <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5 space-y-4">
          {/* Quality Presets */}
          <div className="grid grid-cols-4 gap-1" role="radiogroup" aria-label="Graphics quality">
            {(['low', 'medium', 'high', 'ultra'] as GraphicsQuality[]).map((quality) => (
              <button
                key={quality}
                onClick={() => setGraphicsQuality(quality)}
                aria-label={`Set graphics quality to ${quality}`}
                aria-pressed={graphics.graphics.quality === quality}
                className={`py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                  graphics.graphics.quality === quality
                    ? quality === 'low'
                      ? 'bg-slate-600 text-white'
                      : quality === 'medium'
                        ? 'bg-yellow-600 text-white'
                        : quality === 'high'
                          ? 'bg-cyan-600 text-white'
                          : 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {quality}
              </button>
            ))}
          </div>

          {/* Toggles */}
          <div className="space-y-1">
            <Toggle
              label="Dust Particles"
              icon={<Wind size={12} />}
              value={graphics.graphics.enableDustParticles}
              onChange={(v) => graphics.setGraphicsSetting('enableDustParticles', v)}
            />
            <Toggle
              label="Ambient Occlusion"
              icon={<Eye size={12} />}
              value={graphics.graphics.enableSSAO}
              onChange={(v) => graphics.setGraphicsSetting('enableSSAO', v)}
            />
            <Toggle
              label="Machine Vibration"
              icon={<Activity size={12} />}
              value={graphics.graphics.enableMachineVibration}
              onChange={(v) => graphics.setGraphicsSetting('enableMachineVibration', v)}
            />
            {setShowZones && (
              <Toggle
                label="Zone Markers"
                icon={<Grid3X3 size={12} />}
                value={showZones ?? true}
                onChange={setShowZones}
              />
            )}
          </div>
        </div>
      </section>

      {/* Simulation Reset Section */}
      <section>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <RotateCcw size={14} className="text-amber-500" />
          Simulation
        </h3>
        <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5 space-y-2">
          <button
            onClick={clearPersistedState}
            className="w-full py-2 rounded-lg text-xs font-medium bg-amber-900/30 text-amber-400 hover:bg-amber-900/50 flex items-center justify-center gap-2 transition-colors"
          >
            Reset to 10am
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('millos-settings');
              localStorage.removeItem('millos-game-simulation');
              setGraphicsQuality('medium');
              window.location.reload();
            }}
            className="w-full py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-900/20 flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw size={12} />
            Reset Simulation
          </button>
        </div>
      </section>
    </div>
  );
};

const Toggle: React.FC<{
  label: string;
  icon: React.ReactNode;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, icon, value, onChange }) => (
  <button
    onClick={() => onChange(!value)}
    aria-label={`${value ? 'Disable' : 'Enable'} ${label}`}
    aria-pressed={value}
    className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${value ? 'bg-slate-700/50 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
  >
    <div className="flex items-center gap-2 text-xs">
      {icon}
      <span>{label}</span>
    </div>
    <div
      className={`w-2 h-2 rounded-full ${value ? 'bg-green-400' : 'bg-slate-600'}`}
      aria-hidden="true"
    />
  </button>
);
