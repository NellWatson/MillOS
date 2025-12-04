import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  ChevronDown,
  ChevronUp,
  Eye,
  Sparkles,
  Wind,
  Activity,
  Layers,
  Sun,
  User,
  Monitor,
  Gauge,
  Keyboard,
  RotateCcw,
} from 'lucide-react';
import { useMillStore, GraphicsQuality } from '../../store';
import { FPSDisplay } from '../FPSMonitor';

export const GraphicsSettingsPanel: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const graphics = useMillStore((state) => state.graphics);
  const setGraphicsQuality = useMillStore((state) => state.setGraphicsQuality);
  const setGraphicsSetting = useMillStore((state) => state.setGraphicsSetting);
  const theme = useMillStore((state) => state.theme);

  const qualityColors: Record<GraphicsQuality, string> = {
    low: 'text-slate-400',
    medium: 'text-yellow-400',
    high: 'text-cyan-400',
    ultra: 'text-purple-400',
  };

  const toggleSettings: Array<{
    key: keyof typeof graphics;
    label: string;
    icon: React.ReactNode;
    category: string;
  }> = [
    // Post-processing
    {
      key: 'enableSSAO',
      label: 'Ambient Occlusion',
      icon: <Eye className="w-3 h-3" />,
      category: 'Post-Processing',
    },
    {
      key: 'enableBloom',
      label: 'Bloom Glow',
      icon: <Sparkles className="w-3 h-3" />,
      category: 'Post-Processing',
    },
    {
      key: 'enableVignette',
      label: 'Vignette',
      icon: <Monitor className="w-3 h-3" />,
      category: 'Post-Processing',
    },
    {
      key: 'enableChromaticAberration',
      label: 'Chromatic Aberration',
      icon: <Layers className="w-3 h-3" />,
      category: 'Post-Processing',
    },
    {
      key: 'enableFilmGrain',
      label: 'Film Grain',
      icon: <Wind className="w-3 h-3" />,
      category: 'Post-Processing',
    },
    // Scene effects
    {
      key: 'enableDustParticles',
      label: 'Dust Particles',
      icon: <Wind className="w-3 h-3" />,
      category: 'Particles',
    },
    {
      key: 'enableGrainFlow',
      label: 'Grain Flow',
      icon: <Wind className="w-3 h-3" />,
      category: 'Particles',
    },
    {
      key: 'enableAtmosphericHaze',
      label: 'Atmospheric Haze',
      icon: <Wind className="w-3 h-3" />,
      category: 'Particles',
    },
    // Machine enhancements
    {
      key: 'enableMachineVibration',
      label: 'Machine Vibration',
      icon: <Activity className="w-3 h-3" />,
      category: 'Machines',
    },
    {
      key: 'enableProceduralTextures',
      label: 'Detailed Textures',
      icon: <Layers className="w-3 h-3" />,
      category: 'Machines',
    },
    {
      key: 'enableWeathering',
      label: 'Weathering Effects',
      icon: <Wind className="w-3 h-3" />,
      category: 'Machines',
    },
    // Lighting & Shadows
    {
      key: 'enableLightShafts',
      label: 'Light Shafts',
      icon: <Sun className="w-3 h-3" />,
      category: 'Lighting',
    },
    {
      key: 'enableContactShadows',
      label: 'Contact Shadows',
      icon: <Layers className="w-3 h-3" />,
      category: 'Lighting',
    },
    {
      key: 'enableHighResShadows',
      label: 'High-Res Shadows',
      icon: <Eye className="w-3 h-3" />,
      category: 'Lighting',
    },
  ];

  // Group settings by category
  const categories = ['Post-Processing', 'Particles', 'Machines', 'Lighting'];

  return (
    <div
      className={`border-t pt-2 mt-2 ${theme === 'light' ? 'border-slate-200' : 'border-slate-700/50'}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between text-xs font-medium transition-colors py-1 ${
          theme === 'light'
            ? 'text-slate-600 hover:text-slate-800'
            : 'text-slate-300 hover:text-white'
        }`}
      >
        <span className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-purple-400" />
          Graphics Quality
          <span className={`text-[10px] font-bold uppercase ${qualityColors[graphics.quality]}`}>
            {graphics.quality}
          </span>
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 pt-2 overflow-hidden"
          >
            {/* Quality Presets */}
            <div className="flex gap-1">
              {(['low', 'medium', 'high', 'ultra'] as GraphicsQuality[]).map((quality) => (
                <button
                  key={quality}
                  onClick={() => setGraphicsQuality(quality)}
                  className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                    graphics.quality === quality
                      ? quality === 'low'
                        ? 'bg-slate-600 text-white'
                        : quality === 'medium'
                          ? 'bg-yellow-600 text-white'
                          : quality === 'high'
                            ? 'bg-cyan-600 text-white'
                            : 'bg-purple-600 text-white'
                      : theme === 'light'
                        ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {quality}
                </button>
              ))}
            </div>

            {/* Detailed Settings by Category */}
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {categories.map((category) => (
                <div key={category}>
                  <div
                    className={`text-[9px] uppercase tracking-wider mb-1 ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}
                  >
                    {category}
                  </div>
                  <div className="space-y-0.5">
                    {toggleSettings
                      .filter((s) => s.category === category)
                      .map(({ key, label, icon }) => (
                        <button
                          key={key}
                          onClick={() =>
                            setGraphicsSetting(
                              key as keyof typeof graphics,
                              !graphics[key as keyof typeof graphics]
                            )
                          }
                          className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs transition-all ${
                            graphics[key as keyof typeof graphics]
                              ? theme === 'light'
                                ? 'bg-slate-200 text-slate-800'
                                : 'bg-slate-700/50 text-white'
                              : theme === 'light'
                                ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                : 'bg-slate-800/30 text-slate-500 hover:bg-slate-800/50'
                          }`}
                        >
                          <span
                            className={
                              graphics[key as keyof typeof graphics]
                                ? 'text-green-500'
                                : theme === 'light'
                                  ? 'text-slate-400'
                                  : 'text-slate-600'
                            }
                          >
                            {icon}
                          </span>
                          <span className="flex-1 text-left">{label}</span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              graphics[key as keyof typeof graphics]
                                ? 'bg-green-500'
                                : theme === 'light'
                                  ? 'bg-slate-300'
                                  : 'bg-slate-600'
                            }`}
                          />
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Particle Count Slider */}
            <div
              className={`border-t pt-2 ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}
            >
              <div className="flex justify-between text-xs mb-1">
                <span
                  className={`flex items-center gap-1 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}
                >
                  <Wind className="w-3 h-3" />
                  Particle Count
                </span>
                <span className="text-cyan-500 font-mono font-bold">
                  {graphics.dustParticleCount}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="500"
                step="25"
                value={graphics.dustParticleCount}
                onChange={(e) => setGraphicsSetting('dustParticleCount', parseInt(e.target.value))}
                disabled={!graphics.enableDustParticles}
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-cyan-500 ${
                  theme === 'light' ? 'bg-slate-200' : 'bg-slate-800'
                } ${!graphics.enableDustParticles ? 'opacity-50' : ''}`}
              />
              <div
                className={`flex justify-between text-[9px] mt-0.5 ${theme === 'light' ? 'text-slate-400' : 'text-slate-600'}`}
              >
                <span>0</span>
                <span>250</span>
                <span>500</span>
              </div>
            </div>

            {/* Worker LOD Distance Slider */}
            <div
              className={`border-t pt-2 ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}
            >
              <div className="flex justify-between text-xs mb-1">
                <span
                  className={`flex items-center gap-1 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}
                >
                  <User className="w-3 h-3" />
                  Worker LOD Distance
                </span>
                <span className="text-cyan-500 font-mono font-bold">
                  {graphics.workerLodDistance}m
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={graphics.workerLodDistance}
                onChange={(e) => setGraphicsSetting('workerLodDistance', parseInt(e.target.value))}
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-cyan-500 ${
                  theme === 'light' ? 'bg-slate-200' : 'bg-slate-800'
                }`}
              />
              <div
                className={`flex justify-between text-[9px] mt-0.5 ${theme === 'light' ? 'text-slate-400' : 'text-slate-600'}`}
              >
                <span>10m</span>
                <span>55m</span>
                <span>100m</span>
              </div>
            </div>

            {/* FPS Monitor */}
            <div
              className={`border-t pt-2 ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-3.5 h-3.5 text-green-500" />
                <span
                  className={`text-[9px] uppercase tracking-wider ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}
                >
                  Performance
                </span>
              </div>
              <FPSDisplay showDetailed={true} />
            </div>

            {/* Keyboard Shortcuts */}
            <div
              className={`border-t pt-2 ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Keyboard className="w-3.5 h-3.5 text-blue-500" />
                <span
                  className={`text-[9px] uppercase tracking-wider ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}
                >
                  Shortcuts
                </span>
              </div>
              {/* Graphics Quality */}
              <div
                className={`text-[8px] uppercase tracking-wider mb-1 ${theme === 'light' ? 'text-slate-400' : 'text-slate-600'}`}
              >
                Quality
              </div>
              <div className="grid grid-cols-4 gap-1 text-[10px] mb-2">
                <div
                  className={`flex items-center justify-center rounded px-1 py-1 ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-800/50'}`}
                >
                  <kbd
                    className={`px-1 py-0.5 rounded font-mono text-[9px] ${theme === 'light' ? 'bg-slate-200 text-slate-600' : 'bg-slate-700 text-slate-300'}`}
                  >
                    F1
                  </kbd>
                </div>
                <div
                  className={`flex items-center justify-center rounded px-1 py-1 ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-800/50'}`}
                >
                  <kbd
                    className={`px-1 py-0.5 rounded font-mono text-[9px] ${theme === 'light' ? 'bg-yellow-100 text-yellow-700' : 'bg-yellow-900/50 text-yellow-300'}`}
                  >
                    F2
                  </kbd>
                </div>
                <div
                  className={`flex items-center justify-center rounded px-1 py-1 ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-800/50'}`}
                >
                  <kbd
                    className={`px-1 py-0.5 rounded font-mono text-[9px] ${theme === 'light' ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-900/50 text-cyan-300'}`}
                  >
                    F3
                  </kbd>
                </div>
                <div
                  className={`flex items-center justify-center rounded px-1 py-1 ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-800/50'}`}
                >
                  <kbd
                    className={`px-1 py-0.5 rounded font-mono text-[9px] ${theme === 'light' ? 'bg-purple-100 text-purple-700' : 'bg-purple-900/50 text-purple-300'}`}
                  >
                    F4
                  </kbd>
                </div>
              </div>
              {/* Controls */}
              <div
                className={`text-[8px] uppercase tracking-wider mb-1 ${theme === 'light' ? 'text-slate-400' : 'text-slate-600'}`}
              >
                Controls
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div
                  className={`flex items-center gap-1.5 rounded px-1.5 py-1 ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-800/50'}`}
                >
                  <kbd
                    className={`px-1.5 py-0.5 rounded font-mono ${theme === 'light' ? 'bg-slate-200 text-slate-600' : 'bg-slate-700 text-slate-300'}`}
                  >
                    P
                  </kbd>
                  <span className={theme === 'light' ? 'text-slate-500' : 'text-slate-400'}>
                    Pause
                  </span>
                </div>
                <div
                  className={`flex items-center gap-1.5 rounded px-1.5 py-1 ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-800/50'}`}
                >
                  <kbd
                    className={`px-1.5 py-0.5 rounded font-mono ${theme === 'light' ? 'bg-slate-200 text-slate-600' : 'bg-slate-700 text-slate-300'}`}
                  >
                    A
                  </kbd>
                  <span className={theme === 'light' ? 'text-slate-500' : 'text-slate-400'}>
                    AI Panel
                  </span>
                </div>
                <div
                  className={`flex items-center gap-1.5 rounded px-1.5 py-1 ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-800/50'}`}
                >
                  <kbd
                    className={`px-1.5 py-0.5 rounded font-mono ${theme === 'light' ? 'bg-slate-200 text-slate-600' : 'bg-slate-700 text-slate-300'}`}
                  >
                    Z
                  </kbd>
                  <span className={theme === 'light' ? 'text-slate-500' : 'text-slate-400'}>
                    Zones
                  </span>
                </div>
                <div
                  className={`flex items-center gap-1.5 rounded px-1.5 py-1 ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-800/50'}`}
                >
                  <kbd
                    className={`px-1.5 py-0.5 rounded font-mono ${theme === 'light' ? 'bg-slate-200 text-slate-600' : 'bg-slate-700 text-slate-300'}`}
                  >
                    H
                  </kbd>
                  <span className={theme === 'light' ? 'text-slate-500' : 'text-slate-400'}>
                    Heatmap
                  </span>
                </div>
                <div
                  className={`flex items-center gap-1.5 rounded px-1.5 py-1 ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-800/50'}`}
                >
                  <kbd
                    className={`px-1.5 py-0.5 rounded font-mono ${theme === 'light' ? 'bg-slate-200 text-slate-600' : 'bg-slate-700 text-slate-300'}`}
                  >
                    +/-
                  </kbd>
                  <span className={theme === 'light' ? 'text-slate-500' : 'text-slate-400'}>
                    Speed
                  </span>
                </div>
                <div
                  className={`flex items-center gap-1.5 rounded px-1.5 py-1 ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-800/50'}`}
                >
                  <kbd
                    className={`px-1.5 py-0.5 rounded font-mono ${theme === 'light' ? 'bg-slate-200 text-slate-600' : 'bg-slate-700 text-slate-300'}`}
                  >
                    ESC
                  </kbd>
                  <span className={theme === 'light' ? 'text-slate-500' : 'text-slate-400'}>
                    Close
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Info */}
            <div
              className={`text-[9px] pt-1 border-t ${theme === 'light' ? 'border-slate-200 text-slate-400' : 'border-slate-800 text-slate-500'}`}
            >
              <p>
                <span className={theme === 'light' ? 'text-slate-500' : 'text-slate-400'}>
                  Low:
                </span>{' '}
                Best for older devices
              </p>
              <p>
                <span className="text-yellow-500">Medium:</span> Balanced performance
              </p>
              <p>
                <span className="text-cyan-500">High:</span> Enhanced visuals
              </p>
              <p>
                <span className="text-purple-500">Ultra:</span> Maximum quality
              </p>
            </div>

            {/* Reset Game Time Button */}
            <button
              onClick={() => useMillStore.getState().resetGameState()}
              className={`w-full mt-2 py-1.5 rounded text-[10px] font-medium transition-all flex items-center justify-center gap-1 ${
                theme === 'light'
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'bg-amber-900/50 text-amber-300 hover:bg-amber-800/50'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              Reset Simulation
            </button>

            {/* Reset All Settings Button */}
            <button
              onClick={() => {
                localStorage.removeItem('millos-settings');
                setGraphicsQuality('medium');
                window.location.reload();
              }}
              className={`w-full mt-1 py-1.5 rounded text-[10px] font-medium transition-all flex items-center justify-center gap-1 ${
                theme === 'light'
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'bg-red-900/50 text-red-300 hover:bg-red-800/50'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              Reset All Settings
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
