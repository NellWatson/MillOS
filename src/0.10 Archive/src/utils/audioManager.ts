// Audio manager for realistic factory sounds using Web Audio API

class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private lastHornTime: Map<string, number> = new Map();
  private lastBeepTime: Map<string, number> = new Map();
  private _muted: boolean = false;
  private _volume: number = 0.5;
  private listeners: Set<() => void> = new Set();
  private _initialized: boolean = false;

  get initialized(): boolean {
    return this._initialized;
  }

  // Ambient sound nodes
  private ambientNodes: {
    machineryHum?: { source: AudioBufferSourceNode; gain: GainNode };
    conveyorNoise?: { source: AudioBufferSourceNode; gain: GainNode };
    ventilation?: { source: AudioBufferSourceNode; gain: GainNode };
    grainFlow?: { source: AudioBufferSourceNode; gain: GainNode };
  } = {};

  // Machine-specific sound nodes
  private machineNodes: Map<string, { source: AudioBufferSourceNode; gain: GainNode }> = new Map();

  // Forklift engine sounds
  private forkliftEngines: Map<string, { source: AudioBufferSourceNode; gain: GainNode; lfo: OscillatorNode }> = new Map();

  // Radio chatter state
  private radioChatterActive: boolean = false;
  private radioChatterInterval: ReturnType<typeof setInterval> | null = null;

  // Outdoor ambient sounds
  private outdoorNodes: {
    birds?: { source: AudioBufferSourceNode; gain: GainNode };
    wind?: { source: AudioBufferSourceNode; gain: GainNode };
    traffic?: { source: AudioBufferSourceNode; gain: GainNode };
  } = {};

  // Camera position for spatial audio (updated externally)
  private cameraPosition: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };

  // Sound source positions for spatial calculation
  private soundPositions: Map<string, { x: number; y: number; z: number }> = new Map();

  // Background music
  private musicAudio: HTMLAudioElement | null = null;
  private _musicEnabled: boolean = true;
  private _musicVolume: number = 0.3;
  private _currentTrackIndex: number = 0;

  // TTS (Text-to-Speech) for PA announcements
  private _ttsEnabled: boolean = true; // On by default
  private _ttsVoice: SpeechSynthesisVoice | null = null;
  private _ttsVoiceLoaded: boolean = false;

  // Available music tracks (shuffled on init)
  // Music by Kevin MacLeod (incompetech.com) - Licensed under CC BY 3.0/4.0
  // Note: Hardcoded /v0.10/ base path for this version
  private readonly allMusicTracks = [
    { id: 'the_builder', name: 'The Builder', file: '/v0.10/The Builder.mp3' },
    { id: 'space_jazz', name: 'Space Jazz', file: '/v0.10/Space Jazz.mp3' },
    { id: 'upbeat_forever', name: 'Upbeat Forever', file: '/v0.10/Upbeat Forever.mp3' },
    { id: 'fuzzball_parade', name: 'Fuzzball Parade', file: '/v0.10/Fuzzball Parade.mp3' },
    { id: 'i_got_a_stick', name: 'I Got a Stick', file: '/v0.10/I Got a Stick Feat James Gavins.mp3' },
    { id: 'boogie_party', name: 'Boogie Party', file: '/v0.10/Boogie Party.mp3' },
    { id: 'voxel_revolution', name: 'Voxel Revolution', file: '/v0.10/Voxel Revolution.mp3' },
    { id: 'newer_wave', name: 'Newer Wave', file: '/v0.10/Newer Wave.mp3' },
    { id: 'neon_laser_horizon', name: 'Neon Laser Horizon', file: '/v0.10/Neon Laser Horizon.mp3' },
    { id: 'cloud_dancer', name: 'Cloud Dancer', file: '/v0.10/Cloud Dancer.mp3' },
  ];

  // Shuffled playlist (Fisher-Yates shuffle on init)
  private musicTracks: { id: string; name: string; file: string }[];

  constructor() {
    // Shuffle tracks on initialization using Fisher-Yates algorithm
    this.musicTracks = [...this.allMusicTracks];
    this.shufflePlaylist();
  }

  private shufflePlaylist(): void {
    for (let i = this.musicTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.musicTracks[i], this.musicTracks[j]] = [this.musicTracks[j], this.musicTracks[i]];
    }
  }

  get muted(): boolean {
    return this._muted;
  }

  set muted(value: boolean) {
    this._muted = value;
    this.updateMasterVolume();
    this.updateMusicVolume();
    this.notifyListeners();
  }

  get volume(): number {
    return this._volume;
  }

  set volume(value: number) {
    this._volume = Math.max(0, Math.min(1, value));
    this.updateMasterVolume();
    this.notifyListeners();
  }

  get musicEnabled(): boolean {
    return this._musicEnabled;
  }

  set musicEnabled(value: boolean) {
    this._musicEnabled = value;
    if (value) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
    this.notifyListeners();
  }

  get musicVolume(): number {
    return this._musicVolume;
  }

  set musicVolume(value: number) {
    this._musicVolume = Math.max(0, Math.min(1, value));
    this.updateMusicVolume();
    this.notifyListeners();
  }

  get currentTrack(): { id: string; name: string; file: string } {
    return this.musicTracks[this._currentTrackIndex];
  }

  get trackCount(): number {
    return this.musicTracks.length;
  }

  get trackIndex(): number {
    return this._currentTrackIndex;
  }

  nextTrack(): void {
    this._currentTrackIndex = this._currentTrackIndex + 1;
    // Reshuffle playlist when we've played all tracks
    if (this._currentTrackIndex >= this.musicTracks.length) {
      this._currentTrackIndex = 0;
      this.shufflePlaylist();
    }
    if (this._musicEnabled && this.musicAudio) {
      this.musicAudio.src = this.currentTrack.file;
      this.musicAudio.play().catch(() => {});
    }
    this.notifyListeners();
  }

  prevTrack(): void {
    this._currentTrackIndex = (this._currentTrackIndex - 1 + this.musicTracks.length) % this.musicTracks.length;
    if (this._musicEnabled && this.musicAudio) {
      this.musicAudio.src = this.currentTrack.file;
      this.musicAudio.play().catch(() => {});
    }
    this.notifyListeners();
  }

  private updateMusicVolume(): void {
    if (this.musicAudio) {
      // Music has its own independent volume control
      this.musicAudio.volume = this._muted ? 0 : this._musicVolume;
    }
  }

  startMusic(): void {
    if (!this._musicEnabled) return;

    if (!this.musicAudio) {
      this.musicAudio = new Audio(this.currentTrack.file);
      this.musicAudio.loop = false; // Don't loop single track - advance through playlist
      this.updateMusicVolume();

      // Auto-advance to next track when current ends
      this.musicAudio.addEventListener('ended', () => {
        this.nextTrack();
      });
    } else if (this.musicAudio.src !== window.location.origin + this.currentTrack.file) {
      this.musicAudio.src = this.currentTrack.file;
    }

    this.musicAudio.play().catch(() => {
      // Music playback failed (user interaction required)
    });
  }

  stopMusic(): void {
    if (this.musicAudio) {
      this.musicAudio.pause();
      this.musicAudio.currentTime = 0;
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  private getContext(): AudioContext | null {
    if (!this._initialized) {
      return null;
    }
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.updateMasterVolume();
    }
    return this.audioContext;
  }

  private getMasterGain(): GainNode | null {
    const ctx = this.getContext();
    if (!ctx) return null;
    return this.masterGain;
  }

  private updateMasterVolume(): void {
    if (this.masterGain) {
      const targetVolume = this._muted ? 0 : this._volume;
      this.masterGain.gain.setTargetAtTime(targetVolume, this.audioContext?.currentTime || 0, 0.1);
    }
  }

  private getEffectiveVolume(): number {
    return this._muted ? 0 : this._volume;
  }

  // Create noise buffer for various industrial sounds
  private createNoiseBuffer(duration: number, type: 'white' | 'pink' | 'brown' = 'white'): AudioBuffer | null {
    const ctx = this.getContext();
    if (!ctx) return null;
    const sampleRate = ctx.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;

      if (type === 'white') {
        data[i] = white;
      } else if (type === 'pink') {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      } else { // brown
        data[i] = (b0 = (b0 + (0.02 * white)) / 1.02) * 3.5;
      }
    }
    return buffer;
  }

  // === FORKLIFT SOUNDS ===

  // Play a realistic industrial air horn
  playHorn(forkliftId: string) {
    if (this.getEffectiveVolume() === 0) return;

    const now = Date.now();
    const lastPlayed = this.lastHornTime.get(forkliftId) || 0;
    if (now - lastPlayed < 800) return;
    this.lastHornTime.set(forkliftId, now);

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Create multiple oscillators for a rich air horn sound
      const frequencies = [220, 277, 330]; // A3, C#4, E4 - creates a major chord
      const gains: GainNode[] = [];
      const oscillators: OscillatorNode[] = [];

      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        // Use sawtooth for richer harmonics
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq * 0.98, currentTime);
        osc.frequency.linearRampToValueAtTime(freq, currentTime + 0.05);

        // Low-pass filter for warmer sound
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, currentTime);
        filter.Q.setValueAtTime(2, currentTime);

        // Envelope
        const vol = 0.12 / frequencies.length;
        gain.gain.setValueAtTime(0, currentTime);
        gain.gain.linearRampToValueAtTime(vol, currentTime + 0.02);
        gain.gain.setValueAtTime(vol, currentTime + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.4);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc.start(currentTime);
        osc.stop(currentTime + 0.45);

        oscillators.push(osc);
        gains.push(gain);
      });

      // Add some noise for air release
      const noiseBuffer = this.createNoiseBuffer(0.5, 'pink');
      if (!noiseBuffer) return;
      const noiseSource = ctx.createBufferSource();
      const noiseGain = ctx.createGain();
      const noiseFilter = ctx.createBiquadFilter();

      noiseSource.buffer = noiseBuffer;
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(400, currentTime);
      noiseFilter.Q.setValueAtTime(1, currentTime);

      noiseGain.gain.setValueAtTime(0, currentTime);
      noiseGain.gain.linearRampToValueAtTime(0.03, currentTime + 0.02);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.4);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);

      noiseSource.start(currentTime);
      noiseSource.stop(currentTime + 0.45);

    } catch (e) {
      // Audio not supported or blocked
    }
  }

  // Play realistic backup alarm (classic industrial beeper)
  playBackupBeep(forkliftId: string) {
    if (this.getEffectiveVolume() === 0) return;

    const now = Date.now();
    const lastPlayed = this.lastBeepTime.get(forkliftId) || 0;
    if (now - lastPlayed < 600) return;
    this.lastBeepTime.set(forkliftId, now);

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Classic backup alarm - alternating tones
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Two-tone alarm
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(1200, currentTime);

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(1000, currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, currentTime);

      // Pulsing envelope
      gain.gain.setValueAtTime(0, currentTime);
      gain.gain.linearRampToValueAtTime(0.06, currentTime + 0.01);
      gain.gain.setValueAtTime(0.06, currentTime + 0.15);
      gain.gain.linearRampToValueAtTime(0, currentTime + 0.2);
      gain.gain.setValueAtTime(0, currentTime + 0.25);
      gain.gain.linearRampToValueAtTime(0.06, currentTime + 0.26);
      gain.gain.setValueAtTime(0.06, currentTime + 0.4);
      gain.gain.linearRampToValueAtTime(0, currentTime + 0.45);

      const merger = ctx.createGain();
      osc1.connect(merger);
      osc2.connect(merger);
      merger.gain.setValueAtTime(0.5, currentTime);
      merger.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc1.start(currentTime);
      osc2.start(currentTime);
      osc1.stop(currentTime + 0.5);
      osc2.stop(currentTime + 0.5);

    } catch (e) {
      // Audio not supported or blocked
    }
  }

  // === AMBIENT FACTORY SOUNDS ===

  // Start ambient factory soundscape
  startAmbientSounds() {
    if (this.ambientNodes.machineryHum) return; // Already running

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;

      // Machinery hum - low frequency drone
      {
        const buffer = this.createNoiseBuffer(4, 'brown');
        if (!buffer) return;
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        source.buffer = buffer;
        source.loop = true;

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(120, ctx.currentTime);
        filter.Q.setValueAtTime(5, ctx.currentTime);

        gain.gain.setValueAtTime(0.08, ctx.currentTime);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        source.start();

        this.ambientNodes.machineryHum = { source, gain };
      }

      // Conveyor belt noise - rhythmic mechanical sound
      {
        const buffer = this.createNoiseBuffer(2, 'pink');
        if (!buffer) return;
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        source.buffer = buffer;
        source.loop = true;

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(300, ctx.currentTime);
        filter.Q.setValueAtTime(2, ctx.currentTime);

        gain.gain.setValueAtTime(0.03, ctx.currentTime);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        source.start();

        this.ambientNodes.conveyorNoise = { source, gain };
      }

      // Ventilation/HVAC - whooshing air sound
      {
        const buffer = this.createNoiseBuffer(3, 'white');
        if (!buffer) return;
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        source.buffer = buffer;
        source.loop = true;

        filter.type = 'highpass';
        filter.frequency.setValueAtTime(500, ctx.currentTime);
        filter.Q.setValueAtTime(0.5, ctx.currentTime);

        gain.gain.setValueAtTime(0.015, ctx.currentTime);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        source.start();

        this.ambientNodes.ventilation = { source, gain };
      }

      // Grain flow through pipes - continuous subtle trickling sound
      {
        const buffer = this.createNoiseBuffer(2, 'white');
        if (!buffer) return;
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        source.buffer = buffer;
        source.loop = true;

        // High-frequency for grain-like trickling
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2500, ctx.currentTime);
        filter.Q.setValueAtTime(3, ctx.currentTime);

        gain.gain.setValueAtTime(0.012, ctx.currentTime);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        source.start();

        this.ambientNodes.grainFlow = { source, gain };
      }

    } catch (e) {
      // Audio not supported or blocked
    }
  }

  stopAmbientSounds() {
    Object.values(this.ambientNodes).forEach(node => {
      if (node) {
        try {
          node.source.stop();
        } catch { /* Audio API error - silent */ }
      }
    });
    this.ambientNodes = {};
  }

  // === MACHINE-SPECIFIC SOUNDS ===

  // Roller mill grinding sound
  playMillSound(machineId: string, rpm: number = 1400) {
    if (this.machineNodes.has(machineId)) return;
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;

      // Grinding noise with harmonic content based on RPM
      const buffer = this.createNoiseBuffer(2, 'pink');
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      source.buffer = buffer;
      source.loop = true;

      // Filter frequency based on RPM
      const filterFreq = 200 + (rpm / 10);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(filterFreq, ctx.currentTime);
      filter.Q.setValueAtTime(3, ctx.currentTime);

      // LFO for grinding rhythm
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(rpm / 60, ctx.currentTime); // Convert RPM to Hz
      lfoGain.gain.setValueAtTime(0.02, ctx.currentTime);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);

      source.connect(filter);
      filter.connect(gain);
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      gain.connect(masterGain);

      source.start();
      lfo.start();

      this.machineNodes.set(machineId, { source, gain });

    } catch { /* Audio API error - silent */ }
  }

  stopMillSound(machineId: string) {
    const node = this.machineNodes.get(machineId);
    if (node) {
      try {
        node.source.stop();
      } catch { /* Audio API error - silent */ }
      this.machineNodes.delete(machineId);
    }
  }

  // Sifter shaking sound
  playSifterSound(machineId: string, rpm: number = 200) {
    if (this.machineNodes.has(machineId)) return;
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;

      const buffer = this.createNoiseBuffer(2, 'white');
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      source.buffer = buffer;
      source.loop = true;

      // Higher frequency for sifting/shaking sound
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.Q.setValueAtTime(4, ctx.currentTime);

      // Modulate gain for rhythmic shaking
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(rpm / 60 * 2, ctx.currentTime); // Double the shake rate
      lfoGain.gain.setValueAtTime(0.015, ctx.currentTime);

      gain.gain.setValueAtTime(0.025, ctx.currentTime);

      source.connect(filter);
      filter.connect(gain);
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      gain.connect(masterGain);

      source.start();
      lfo.start();

      this.machineNodes.set(machineId, { source, gain });

    } catch { /* Audio API error - silent */ }
  }

  // Packer pneumatic/mechanical sound
  playPackerSound(machineId: string) {
    if (this.machineNodes.has(machineId)) return;
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;

      // Pneumatic hiss and mechanical clicks
      const buffer = this.createNoiseBuffer(3, 'white');
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      source.buffer = buffer;
      source.loop = true;

      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2000, ctx.currentTime);
      filter.Q.setValueAtTime(1, ctx.currentTime);

      // Rhythmic pneumatic pulses (simulating packaging cycles)
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'square';
      lfo.frequency.setValueAtTime(1, ctx.currentTime); // 1 package per second
      lfoGain.gain.setValueAtTime(0.02, ctx.currentTime);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);

      source.connect(filter);
      filter.connect(gain);
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      gain.connect(masterGain);

      source.start();
      lfo.start();

      this.machineNodes.set(machineId, { source, gain });

    } catch { /* Audio API error - silent */ }
  }

  stopMachineSound(machineId: string) {
    const node = this.machineNodes.get(machineId);
    if (node) {
      try {
        node.source.stop();
      } catch { /* Audio API error - silent */ }
      this.machineNodes.delete(machineId);
    }
  }

  // === ONE-SHOT SOUNDS ===

  // Play a mechanical clunk (for machine state changes)
  playClunk() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, currentTime + 0.1);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, currentTime);

      gain.gain.setValueAtTime(0.15, currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.15);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(currentTime);
      osc.stop(currentTime + 0.2);

    } catch { /* Audio API error - silent */ }
  }

  // Alert/warning sound
  playAlert() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Two-tone alert
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        const startTime = currentTime + i * 0.2;
        osc.frequency.setValueAtTime(880, startTime);
        osc.frequency.setValueAtTime(660, startTime + 0.1);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.08, startTime + 0.02);
        gain.gain.setValueAtTime(0.08, startTime + 0.15);
        gain.gain.linearRampToValueAtTime(0, startTime + 0.18);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(startTime);
        osc.stop(startTime + 0.2);
      }

    } catch { /* Audio API error - silent */ }
  }

  // Grain pouring/flowing sound
  playGrainFlow(duration: number = 1) {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      const buffer = this.createNoiseBuffer(duration + 0.5, 'white');
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      source.buffer = buffer;

      // Grainy, high-frequency sound
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3000, currentTime);
      filter.Q.setValueAtTime(2, currentTime);

      gain.gain.setValueAtTime(0, currentTime);
      gain.gain.linearRampToValueAtTime(0.05, currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, currentTime + duration);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration + 0.3);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      source.start(currentTime);
      source.stop(currentTime + duration + 0.5);

    } catch { /* Audio API error - silent */ }
  }

  // === TRUCK SOUNDS ===

  // Truck engine idle/running sound
  private truckEngines: Map<string, { source: AudioBufferSourceNode; gain: GainNode }> = new Map();

  startTruckEngine(truckId: string, isMoving: boolean = false) {
    if (this.truckEngines.has(truckId)) return;
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;

      // Deep rumbling engine sound
      const buffer = this.createNoiseBuffer(3, 'brown');
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      source.buffer = buffer;
      source.loop = true;

      // Low frequency for diesel engine rumble
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isMoving ? 150 : 80, ctx.currentTime);
      filter.Q.setValueAtTime(3, ctx.currentTime);

      // LFO for engine rhythm
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(isMoving ? 25 : 15, ctx.currentTime);
      lfoGain.gain.setValueAtTime(0.01, ctx.currentTime);

      gain.gain.setValueAtTime(isMoving ? 0.04 : 0.025, ctx.currentTime);

      source.connect(filter);
      filter.connect(gain);
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      gain.connect(masterGain);

      source.start();
      lfo.start();

      this.truckEngines.set(truckId, { source, gain });
    } catch { /* Audio API error - silent */ }
  }

  updateTruckEngine(truckId: string, isMoving: boolean) {
    const engine = this.truckEngines.get(truckId);
    if (engine && this.audioContext) {
      const targetGain = isMoving ? 0.04 : 0.025;
      engine.gain.gain.setTargetAtTime(targetGain, this.audioContext.currentTime, 0.3);
    }
  }

  stopTruckEngine(truckId: string) {
    const engine = this.truckEngines.get(truckId);
    if (engine) {
      try {
        engine.source.stop();
      } catch { /* Audio API error - silent */ }
      this.truckEngines.delete(truckId);
    }
  }

  // Truck air brake release
  playAirBrake() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      const buffer = this.createNoiseBuffer(0.8, 'white');
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      source.buffer = buffer;

      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1500, currentTime);
      filter.frequency.exponentialRampToValueAtTime(500, currentTime + 0.5);

      gain.gain.setValueAtTime(0.08, currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.6);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      source.start(currentTime);
      source.stop(currentTime + 0.7);
    } catch { /* Audio API error - silent */ }
  }

  // === FOOTSTEP SOUNDS ===

  private lastFootstepTime: Map<string, number> = new Map();

  playFootstep(workerId: string) {
    if (this.getEffectiveVolume() === 0) return;

    const now = Date.now();
    const lastPlayed = this.lastFootstepTime.get(workerId) || 0;
    if (now - lastPlayed < 280) return; // Limit footstep rate
    this.lastFootstepTime.set(workerId, now);

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Soft boot on concrete sound
      const buffer = this.createNoiseBuffer(0.15, 'brown');
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      source.buffer = buffer;

      // Random variation in pitch for natural feel
      const pitchVar = 0.8 + Math.random() * 0.4;
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(200 * pitchVar, currentTime);
      filter.Q.setValueAtTime(2, currentTime);

      // Quick attack, fast decay
      const vol = 0.015 + Math.random() * 0.008;
      gain.gain.setValueAtTime(vol, currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.08);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      source.start(currentTime);
      source.stop(currentTime + 0.1);
    } catch { /* Audio API error - silent */ }
  }

  // === AI DECISION SOUNDS ===

  // AI critical decision alert sound
  playAICriticalAlert() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Triple ascending beep with urgency
      const notes = [440, 554, 698]; // A4, C#5, F5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = currentTime + i * 0.12;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.08, startTime + 0.02);
        gain.gain.setValueAtTime(0.08, startTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.11);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(startTime);
        osc.stop(startTime + 0.15);
      });
    } catch { /* Audio API error - silent */ }
  }

  // AI decision notification sound (subtle)
  playAIDecision() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Soft double-blip like a computer thinking
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, currentTime);
      osc.frequency.setValueAtTime(1047, currentTime + 0.08);

      gain.gain.setValueAtTime(0, currentTime);
      gain.gain.linearRampToValueAtTime(0.04, currentTime + 0.01);
      gain.gain.linearRampToValueAtTime(0.02, currentTime + 0.06);
      gain.gain.linearRampToValueAtTime(0.04, currentTime + 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.15);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(currentTime);
      osc.stop(currentTime + 0.18);
    } catch { /* Audio API error - silent */ }
  }

  // AI anomaly detection sound
  playAIAnomaly() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Warning-like wobble sound
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, currentTime);

      // LFO for wobble effect
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(15, currentTime);
      lfoGain.gain.setValueAtTime(30, currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0, currentTime);
      gain.gain.linearRampToValueAtTime(0.06, currentTime + 0.05);
      gain.gain.setValueAtTime(0.06, currentTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.5);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(currentTime);
      lfo.start(currentTime);
      osc.stop(currentTime + 0.55);
      lfo.stop(currentTime + 0.55);
    } catch { /* Audio API error - silent */ }
  }

  // AI success chime (for completed decisions)
  playAISuccess() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Pleasant ascending arpeggio
      const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = currentTime + i * 0.06;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.03, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(startTime);
        osc.stop(startTime + 0.25);
      });
    } catch { /* Audio API error - silent */ }
  }

  // === UI SOUNDS ===

  // Click sound for UI interactions
  playClick() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, currentTime + 0.05);

      gain.gain.setValueAtTime(0.08, currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.06);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(currentTime);
      osc.stop(currentTime + 0.08);
    } catch { /* Audio API error - silent */ }
  }

  // Hover sound (subtle)
  playHover() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, currentTime);

      gain.gain.setValueAtTime(0.02, currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.03);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(currentTime);
      osc.stop(currentTime + 0.04);
    } catch { /* Audio API error - silent */ }
  }

  // Panel open/close sound
  playPanelOpen() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, currentTime);
      osc.frequency.exponentialRampToValueAtTime(500, currentTime + 0.1);

      gain.gain.setValueAtTime(0.05, currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.12);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(currentTime);
      osc.stop(currentTime + 0.15);
    } catch { /* Audio API error - silent */ }
  }

  playPanelClose() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, currentTime + 0.1);

      gain.gain.setValueAtTime(0.05, currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.12);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(currentTime);
      osc.stop(currentTime + 0.15);
    } catch { /* Audio API error - silent */ }
  }

  // Resume audio context if suspended (needed for user interaction requirement)
  async resume() {
    // Mark as initialized - this allows getContext() to create the AudioContext
    this._initialized = true;

    const ctx = this.getContext();
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
    }
  }

  // === SPATIAL AUDIO SUPPORT ===

  // Update camera position for spatial audio calculations
  updateCameraPosition(x: number, y: number, z: number) {
    this.cameraPosition = { x, y, z };
  }

  // Register a sound source position
  registerSoundPosition(id: string, x: number, y: number, z: number) {
    this.soundPositions.set(id, { x, y, z });
  }

  // Calculate volume attenuation based on distance from camera
  private calculateSpatialVolume(sourceId: string, baseVolume: number, maxDistance: number = 50): number {
    const sourcePos = this.soundPositions.get(sourceId);
    if (!sourcePos) return baseVolume;

    const dx = sourcePos.x - this.cameraPosition.x;
    const dy = sourcePos.y - this.cameraPosition.y;
    const dz = sourcePos.z - this.cameraPosition.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Inverse distance falloff with minimum
    const attenuation = Math.max(0, 1 - (distance / maxDistance));
    return baseVolume * attenuation * attenuation; // Squared for more natural falloff
  }

  // Update machine sound volume based on camera distance
  updateMachineSpatialVolume(machineId: string) {
    const node = this.machineNodes.get(machineId);
    if (node && this.audioContext) {
      const spatialGain = this.calculateSpatialVolume(machineId, 0.04, 35);
      node.gain.gain.setTargetAtTime(spatialGain, this.audioContext.currentTime, 0.2);
    }
  }

  // === WORKER VOICE SOUNDS ===

  private workerVoiceActive: boolean = false;
  private workerVoiceInterval: ReturnType<typeof setInterval> | null = null;

  startWorkerVoices() {
    if (this.workerVoiceActive) return;
    this.workerVoiceActive = true;

    const playRandomVoice = () => {
      if (!this.workerVoiceActive || this.getEffectiveVolume() === 0) return;

      const voiceType = Math.random();
      if (voiceType < 0.35) {
        this.playWorkerShout();
      } else if (voiceType < 0.6) {
        this.playWorkerWhistle();
      } else {
        this.playWorkerCall();
      }

      // Schedule next voice (15-45 seconds)
      const nextDelay = 15000 + Math.random() * 30000;
      this.workerVoiceInterval = setTimeout(playRandomVoice, nextDelay);
    };

    // Start with a delay
    this.workerVoiceInterval = setTimeout(playRandomVoice, 10000 + Math.random() * 15000);
  }

  stopWorkerVoices() {
    this.workerVoiceActive = false;
    if (this.workerVoiceInterval) {
      clearTimeout(this.workerVoiceInterval);
      this.workerVoiceInterval = null;
    }
  }

  // Worker shout sound (like "Hey!" or "Clear!")
  private playWorkerShout() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Create a voice-like sound using formants
      const fundamentalFreq = 150 + Math.random() * 100; // Male voice range

      // Multiple oscillators for formant simulation
      const formants = [
        { freq: fundamentalFreq, gain: 0.3 },
        { freq: fundamentalFreq * 2, gain: 0.15 },
        { freq: 700 + Math.random() * 300, gain: 0.1 }, // First formant
        { freq: 1200 + Math.random() * 400, gain: 0.05 }, // Second formant
      ];

      const duration = 0.2 + Math.random() * 0.15;

      formants.forEach(({ freq, gain: formantGain }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, currentTime);
        // Pitch drop for natural speech
        osc.frequency.exponentialRampToValueAtTime(freq * 0.7, currentTime + duration);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, currentTime);

        gain.gain.setValueAtTime(0, currentTime);
        gain.gain.linearRampToValueAtTime(formantGain * 0.015, currentTime + 0.02);
        gain.gain.setValueAtTime(formantGain * 0.015, currentTime + duration * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc.start(currentTime);
        osc.stop(currentTime + duration + 0.1);
      });

    } catch { /* Audio API error - silent */ }
  }

  // Worker whistle (attention-getting)
  private playWorkerWhistle() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Two-tone whistle
      osc.frequency.setValueAtTime(1200, currentTime);
      osc.frequency.setValueAtTime(1600, currentTime + 0.15);
      osc.frequency.setValueAtTime(1200, currentTime + 0.3);

      gain.gain.setValueAtTime(0, currentTime);
      gain.gain.linearRampToValueAtTime(0.02, currentTime + 0.02);
      gain.gain.setValueAtTime(0.02, currentTime + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.5);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(currentTime);
      osc.stop(currentTime + 0.55);

    } catch { /* Audio API error - silent */ }
  }

  // Worker call (muffled distant voice)
  private playWorkerCall() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Use noise filtered to sound like distant muffled speech
      const duration = 0.4 + Math.random() * 0.3;
      const buffer = this.createNoiseBuffer(duration + 0.2, 'pink');
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      source.buffer = buffer;

      // Bandpass for voice-like quality
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400 + Math.random() * 200, currentTime);
      filter.Q.setValueAtTime(3, currentTime);

      // Syllable-like envelope
      gain.gain.setValueAtTime(0, currentTime);
      gain.gain.linearRampToValueAtTime(0.012, currentTime + 0.03);
      gain.gain.linearRampToValueAtTime(0.006, currentTime + duration * 0.3);
      gain.gain.linearRampToValueAtTime(0.012, currentTime + duration * 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      source.start(currentTime);
      source.stop(currentTime + duration + 0.1);

    } catch { /* Audio API error - silent */ }
  }

  // === TIME-OF-DAY AUDIO ===

  private currentTimeOfDay: 'day' | 'night' = 'day';

  // Update ambient sounds based on game time (0-24)
  updateTimeOfDay(gameTime: number) {
    const isNight = gameTime < 6 || gameTime > 20;
    const newTimeOfDay = isNight ? 'night' : 'day';

    if (newTimeOfDay !== this.currentTimeOfDay) {
      this.currentTimeOfDay = newTimeOfDay;
      this.adjustAmbientForTimeOfDay();
    }
  }

  private adjustAmbientForTimeOfDay() {
    if (!this.audioContext) return;
    const currentTime = this.audioContext.currentTime;

    // Adjust outdoor sounds for day/night
    if (this.outdoorNodes.birds) {
      // Birds quieter at night
      const birdVolume = this.currentTimeOfDay === 'night' ? 0.001 : 0.004;
      this.outdoorNodes.birds.gain.gain.setTargetAtTime(birdVolume, currentTime, 2);
    }

    if (this.outdoorNodes.wind) {
      // Wind slightly louder at night (quieter environment makes it more noticeable)
      const windVolume = this.currentTimeOfDay === 'night' ? 0.018 : 0.012;
      this.outdoorNodes.wind.gain.gain.setTargetAtTime(windVolume, currentTime, 2);
    }

    if (this.outdoorNodes.traffic) {
      // Less traffic at night
      const trafficVolume = this.currentTimeOfDay === 'night' ? 0.008 : 0.015;
      this.outdoorNodes.traffic.gain.gain.setTargetAtTime(trafficVolume, currentTime, 2);
    }

    // Play cricket sounds at night (one-shot, will be triggered periodically)
    if (this.currentTimeOfDay === 'night') {
      this.startNightAmbient();
    } else {
      this.stopNightAmbient();
    }
  }

  private nightAmbientInterval: ReturnType<typeof setInterval> | null = null;

  private startNightAmbient() {
    if (this.nightAmbientInterval) return;

    const playCrickets = () => {
      if (this.currentTimeOfDay !== 'night' || this.getEffectiveVolume() === 0) return;
      this.playCricketChirp();
    };

    // Cricket chirps every 2-5 seconds
    this.nightAmbientInterval = setInterval(playCrickets, 2000 + Math.random() * 3000);
  }

  private stopNightAmbient() {
    if (this.nightAmbientInterval) {
      clearInterval(this.nightAmbientInterval);
      this.nightAmbientInterval = null;
    }
  }

  private playCricketChirp() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Cricket chirp is a rapid series of high-frequency pulses
      const chirpCount = 3 + Math.floor(Math.random() * 3);
      const baseFreq = 4000 + Math.random() * 1000;

      for (let i = 0; i < chirpCount; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = currentTime + i * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.008, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(startTime);
        osc.stop(startTime + 0.06);
      }

    } catch { /* Audio API error - silent */ }
  }

  // === CONVEYOR SPATIAL AUDIO ===

  private conveyorNodes: Map<string, { source: AudioBufferSourceNode; gain: GainNode }> = new Map();

  startConveyorSound(conveyorId: string, x: number, y: number, z: number) {
    if (this.conveyorNodes.has(conveyorId)) return;
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;

      // Continuous belt/roller sound
      const buffer = this.createNoiseBuffer(3, 'pink');
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      source.buffer = buffer;
      source.loop = true;

      // Mid-frequency mechanical sound
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(350, ctx.currentTime);
      filter.Q.setValueAtTime(2, ctx.currentTime);

      gain.gain.setValueAtTime(0.015, ctx.currentTime);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      source.start();

      this.conveyorNodes.set(conveyorId, { source, gain });
      this.registerSoundPosition(conveyorId, x, y, z);

    } catch { /* Audio API error - silent */ }
  }

  updateConveyorSpatialVolume(conveyorId: string) {
    const node = this.conveyorNodes.get(conveyorId);
    if (node && this.audioContext) {
      const spatialGain = this.calculateSpatialVolume(conveyorId, 0.015, 30);
      node.gain.gain.setTargetAtTime(spatialGain, this.audioContext.currentTime, 0.2);
    }
  }

  stopConveyorSound(conveyorId: string) {
    const node = this.conveyorNodes.get(conveyorId);
    if (node) {
      try {
        node.source.stop();
      } catch { /* Audio API error - silent */ }
      this.conveyorNodes.delete(conveyorId);
    }
  }

  // === TRUCK ARRIVAL/DEPARTURE SOUNDS ===

  // Truck arrival fanfare (air brakes + horn)
  playTruckArrival() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Deep truck horn (two-tone)
      const hornFreqs = [180, 220];
      hornFreqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, currentTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, currentTime);
        filter.Q.setValueAtTime(2, currentTime);

        gain.gain.setValueAtTime(0, currentTime);
        gain.gain.linearRampToValueAtTime(0.06, currentTime + 0.05);
        gain.gain.setValueAtTime(0.06, currentTime + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.6);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc.start(currentTime);
        osc.stop(currentTime + 0.65);
      });

      // Air brake release after horn
      setTimeout(() => this.playAirBrake(), 700);

    } catch { /* Audio API error - silent */ }
  }

  // Truck departure sound (engine rev + release)
  playTruckDeparture() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Engine rev up
      const buffer = this.createNoiseBuffer(2, 'brown');
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      source.buffer = buffer;

      filter.type = 'lowpass';
      // Frequency ramps up as engine revs
      filter.frequency.setValueAtTime(80, currentTime);
      filter.frequency.linearRampToValueAtTime(200, currentTime + 0.8);
      filter.frequency.linearRampToValueAtTime(150, currentTime + 1.5);
      filter.Q.setValueAtTime(4, currentTime);

      gain.gain.setValueAtTime(0.02, currentTime);
      gain.gain.linearRampToValueAtTime(0.06, currentTime + 0.8);
      gain.gain.linearRampToValueAtTime(0.03, currentTime + 1.5);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 2);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      source.start(currentTime);
      source.stop(currentTime + 2.1);

    } catch { /* Audio API error - silent */ }
  }

  // === FORKLIFT ENGINE SOUNDS ===

  startForkliftEngine(forkliftId: string) {
    if (this.forkliftEngines.has(forkliftId)) return;
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;

      // Deep rumbling diesel engine sound
      const buffer = this.createNoiseBuffer(4, 'brown');
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      source.buffer = buffer;
      source.loop = true;

      // Low frequency engine rumble
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(100, ctx.currentTime);
      filter.Q.setValueAtTime(4, ctx.currentTime);

      // LFO for engine idle rhythm (irregular idle)
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(8 + Math.random() * 2, ctx.currentTime);
      lfoGain.gain.setValueAtTime(0.008, ctx.currentTime);

      gain.gain.setValueAtTime(0.02, ctx.currentTime);

      source.connect(filter);
      filter.connect(gain);
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      gain.connect(masterGain);

      source.start();
      lfo.start();

      this.forkliftEngines.set(forkliftId, { source, gain, lfo });
    } catch { /* Audio API error - silent */ }
  }

  updateForkliftEngine(forkliftId: string, isMoving: boolean, isStopped: boolean) {
    const engine = this.forkliftEngines.get(forkliftId);
    if (engine && this.audioContext) {
      // Adjust volume based on movement state and spatial position
      let targetGain = isMoving ? 0.035 : 0.02;
      if (isStopped) targetGain = 0.025; // Slightly louder when stopped (safety horn was honked)

      // Apply spatial attenuation
      const spatialGain = this.calculateSpatialVolume(forkliftId, targetGain, 40);
      engine.gain.gain.setTargetAtTime(spatialGain, this.audioContext.currentTime, 0.3);

      // Adjust LFO frequency based on movement
      const targetFreq = isMoving ? 12 : 8;
      engine.lfo.frequency.setTargetAtTime(targetFreq, this.audioContext.currentTime, 0.5);
    }
  }

  stopForkliftEngine(forkliftId: string) {
    const engine = this.forkliftEngines.get(forkliftId);
    if (engine) {
      try {
        engine.source.stop();
        engine.lfo.stop();
      } catch { /* Audio API error - silent */ }
      this.forkliftEngines.delete(forkliftId);
    }
  }

  // === RADIO CHATTER SOUNDS ===

  startRadioChatter() {
    if (this.radioChatterActive) return;
    this.radioChatterActive = true;

    // Play random radio sounds at random intervals
    const playRandomChatter = () => {
      if (!this.radioChatterActive || this.getEffectiveVolume() === 0) return;

      const chatterType = Math.random();
      if (chatterType < 0.4) {
        this.playRadioStatic();
      } else if (chatterType < 0.7) {
        this.playRadioBeep();
      } else {
        this.playRadioSquelch();
      }

      // Schedule next chatter (8-25 seconds)
      const nextDelay = 8000 + Math.random() * 17000;
      this.radioChatterInterval = setTimeout(playRandomChatter, nextDelay);
    };

    // Start with a delay
    this.radioChatterInterval = setTimeout(playRandomChatter, 5000 + Math.random() * 10000);
  }

  stopRadioChatter() {
    this.radioChatterActive = false;
    if (this.radioChatterInterval) {
      clearTimeout(this.radioChatterInterval);
      this.radioChatterInterval = null;
    }
  }

  // Radio static burst
  private playRadioStatic() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      const duration = 0.3 + Math.random() * 0.4;
      const buffer = this.createNoiseBuffer(duration + 0.2, 'white');
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      source.buffer = buffer;

      // Radio-like bandpass filter
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, currentTime);
      filter.Q.setValueAtTime(5, currentTime);

      // Quick fade in/out
      gain.gain.setValueAtTime(0, currentTime);
      gain.gain.linearRampToValueAtTime(0.015, currentTime + 0.02);
      gain.gain.setValueAtTime(0.015, currentTime + duration);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration + 0.1);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      source.start(currentTime);
      source.stop(currentTime + duration + 0.2);
    } catch { /* Audio API error - silent */ }
  }

  // Radio acknowledgment beep
  private playRadioBeep() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Double beep
      for (let i = 0; i < 2; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = currentTime + i * 0.12;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1800, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.025, startTime + 0.01);
        gain.gain.setValueAtTime(0.025, startTime + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(startTime);
        osc.stop(startTime + 0.1);
      }
    } catch { /* Audio API error - silent */ }
  }

  // Radio squelch sound (click when releasing talk button)
  private playRadioSquelch() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Squelch is a brief burst of noise followed by silence
      const buffer = this.createNoiseBuffer(0.15, 'white');
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      source.buffer = buffer;

      filter.type = 'highpass';
      filter.frequency.setValueAtTime(800, currentTime);
      filter.frequency.exponentialRampToValueAtTime(3000, currentTime + 0.08);

      gain.gain.setValueAtTime(0.02, currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.1);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      source.start(currentTime);
      source.stop(currentTime + 0.15);
    } catch { /* Audio API error - silent */ }
  }

  // === OUTDOOR AMBIENT SOUNDS ===

  startOutdoorAmbient() {
    if (this.outdoorNodes.birds) return; // Already running

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;

      // Bird sounds - high frequency chirping (simulated with filtered noise)
      {
        const buffer = this.createNoiseBuffer(6, 'white');
        if (!buffer) return;
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();

        source.buffer = buffer;
        source.loop = true;

        // High frequency for bird-like sounds
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(3500, ctx.currentTime);
        filter.Q.setValueAtTime(8, ctx.currentTime);

        // Modulate to create chirping pattern
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(4 + Math.random() * 2, ctx.currentTime);
        lfoGain.gain.setValueAtTime(0.005, ctx.currentTime);

        gain.gain.setValueAtTime(0.004, ctx.currentTime);

        source.connect(filter);
        filter.connect(gain);
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        gain.connect(masterGain);

        source.start();
        lfo.start();

        this.outdoorNodes.birds = { source, gain };
      }

      // Wind - gentle whooshing
      {
        const buffer = this.createNoiseBuffer(8, 'pink');
        if (!buffer) return;
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();

        source.buffer = buffer;
        source.loop = true;

        // Low-mid frequency for wind
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, ctx.currentTime);
        filter.Q.setValueAtTime(0.5, ctx.currentTime);

        // Slow modulation for gusting
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.15, ctx.currentTime);
        lfoGain.gain.setValueAtTime(0.008, ctx.currentTime);

        gain.gain.setValueAtTime(0.012, ctx.currentTime);

        source.connect(filter);
        filter.connect(gain);
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        gain.connect(masterGain);

        source.start();
        lfo.start();

        this.outdoorNodes.wind = { source, gain };
      }

      // Distant traffic - very low rumble
      {
        const buffer = this.createNoiseBuffer(5, 'brown');
        if (!buffer) return;
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        source.buffer = buffer;
        source.loop = true;

        // Very low frequency for distant traffic rumble
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(80, ctx.currentTime);
        filter.Q.setValueAtTime(2, ctx.currentTime);

        gain.gain.setValueAtTime(0.015, ctx.currentTime);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        source.start();

        this.outdoorNodes.traffic = { source, gain };
      }

    } catch { /* Audio API error - silent */ }
  }

  stopOutdoorAmbient() {
    Object.values(this.outdoorNodes).forEach(node => {
      if (node) {
        try {
          node.source.stop();
        } catch { /* Audio API error - silent */ }
      }
    });
    this.outdoorNodes = {};
  }

  // === SPEED ZONE SOUNDS ===

  private lastSpeedZoneTime: Map<string, number> = new Map();

  // Soft chime when entering speed zone
  playSpeedZoneEnter(forkliftId: string) {
    if (this.getEffectiveVolume() === 0) return;

    const now = Date.now();
    const lastPlayed = this.lastSpeedZoneTime.get(forkliftId) || 0;
    if (now - lastPlayed < 2000) return; // Debounce
    this.lastSpeedZoneTime.set(forkliftId, now);

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Two-note descending chime (like "slow down")
      const notes = [880, 660]; // A5 to E5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = currentTime + i * 0.12;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.06, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(startTime);
        osc.stop(startTime + 0.25);
      });
    } catch { /* Audio API error - silent */ }
  }

  // Ascending chime when exiting speed zone
  playSpeedZoneExit(forkliftId: string) {
    if (this.getEffectiveVolume() === 0) return;

    const now = Date.now();
    const lastPlayed = this.lastSpeedZoneTime.get(forkliftId) || 0;
    if (now - lastPlayed < 2000) return;
    this.lastSpeedZoneTime.set(forkliftId, now);

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Two-note ascending chime (like "all clear")
      const notes = [660, 880]; // E5 to A5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = currentTime + i * 0.1;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.05, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(startTime);
        osc.stop(startTime + 0.2);
      });
    } catch { /* Audio API error - silent */ }
  }

  // === EMERGENCY STOP SOUNDS ===

  private emergencyAlarmNode: { source: OscillatorNode; gain: GainNode } | null = null;

  // Start loud emergency alarm
  startEmergencyAlarm() {
    if (this.emergencyAlarmNode) return;
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      // Alternating two-tone siren
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);

      // LFO for siren effect
      lfo.type = 'square';
      lfo.frequency.setValueAtTime(2, ctx.currentTime); // 2 Hz alternation
      lfoGain.gain.setValueAtTime(200, ctx.currentTime); // Frequency deviation

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start();
      lfo.start();

      this.emergencyAlarmNode = { source: osc, gain };
    } catch { /* Audio API error - silent */ }
  }

  stopEmergencyAlarm() {
    if (this.emergencyAlarmNode) {
      try {
        this.emergencyAlarmNode.source.stop();
      } catch { /* Audio API error - silent */ }
      this.emergencyAlarmNode = null;
    }
  }

  // One-shot emergency stop sound (for button press)
  playEmergencyStop() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Loud descending siren burst
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1200, currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, currentTime + 0.5);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, currentTime);

      gain.gain.setValueAtTime(0.15, currentTime);
      gain.gain.setValueAtTime(0.15, currentTime + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.6);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(currentTime);
      osc.stop(currentTime + 0.65);
    } catch { /* Audio API error - silent */ }
  }

  // === FORKLIFT-TO-FORKLIFT ACKNOWLEDGMENT ===

  // Quick double-honk for forklift acknowledgment
  playForkliftAcknowledge(forkliftId: string) {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Two quick beeps
      for (let i = 0; i < 2; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = currentTime + i * 0.15;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, startTime); // A4

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.08, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(startTime);
        osc.stop(startTime + 0.12);
      }
    } catch { /* Audio API error - silent */ }
  }

  // === PA SYSTEM ANNOUNCEMENTS ===

  private paSystemActive: boolean = false;
  private paSystemInterval: ReturnType<typeof setInterval> | null = null;

  startPASystem() {
    if (this.paSystemActive) return;
    this.paSystemActive = true;

    const playRandomAnnouncement = () => {
      if (!this.paSystemActive || this.getEffectiveVolume() === 0) return;

      const announcementType = Math.random();
      if (announcementType < 0.4) {
        this.playPAChime();
      } else if (announcementType < 0.7) {
        this.playShiftBell();
      } else {
        this.playPATone();
      }

      // Schedule next announcement (60-180 seconds)
      const nextDelay = 60000 + Math.random() * 120000;
      this.paSystemInterval = setTimeout(playRandomAnnouncement, nextDelay);
    };

    this.paSystemInterval = setTimeout(playRandomAnnouncement, 30000 + Math.random() * 60000);
  }

  stopPASystem() {
    this.paSystemActive = false;
    if (this.paSystemInterval) {
      clearTimeout(this.paSystemInterval);
      this.paSystemInterval = null;
    }
  }

  private playPAChime() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Classic three-tone chime
      const notes = [523, 659, 784]; // C5, E5, G5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = currentTime + i * 0.3;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.04, startTime + 0.02);
        gain.gain.setValueAtTime(0.04, startTime + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(startTime);
        osc.stop(startTime + 0.55);
      });

      // Follow with muffled speech-like sound
      setTimeout(() => this.playPASpeech(), 1200);
    } catch { /* Audio API error - silent */ }
  }

  private playPASpeech() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      const duration = 2 + Math.random() * 2;
      const buffer = this.createNoiseBuffer(duration + 0.5, 'pink');
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      source.buffer = buffer;
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, currentTime);
      filter.Q.setValueAtTime(2, currentTime);

      // Modulate to simulate speech rhythm
      gain.gain.setValueAtTime(0, currentTime);
      const syllables = Math.floor(duration * 3);
      for (let i = 0; i < syllables; i++) {
        const t = currentTime + (i / syllables) * duration;
        gain.gain.linearRampToValueAtTime(0.008 + Math.random() * 0.004, t);
        gain.gain.linearRampToValueAtTime(0.003, t + 0.1);
      }
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      source.start(currentTime);
      source.stop(currentTime + duration + 0.2);
    } catch { /* Audio API error - silent */ }
  }

  private playShiftBell() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      for (let ring = 0; ring < 3; ring++) {
        const startTime = currentTime + ring * 0.8;
        const frequencies = [800, 1200, 1600, 2000];

        frequencies.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          const volume = 0.025 / (i + 1);
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(volume, startTime + 0.005);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(startTime);
          osc.stop(startTime + 0.65);
        });
      }
    } catch { /* Audio API error - silent */ }
  }

  private playPATone() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, currentTime);
      osc.frequency.setValueAtTime(660, currentTime + 0.3);

      gain.gain.setValueAtTime(0, currentTime);
      gain.gain.linearRampToValueAtTime(0.03, currentTime + 0.02);
      gain.gain.setValueAtTime(0.03, currentTime + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.7);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(currentTime);
      osc.stop(currentTime + 0.75);
    } catch { /* Audio API error - silent */ }
  }

  // === INDUSTRIAL AMBIENT SOUNDS ===

  // Compressor cycling state
  private compressorActive: boolean = false;
  private compressorInterval: ReturnType<typeof setInterval> | null = null;
  private compressorNodes: { source: AudioBufferSourceNode; gain: GainNode } | null = null;

  // Start industrial compressor cycling (kicks on/off periodically)
  startCompressorCycling() {
    if (this.compressorActive) return;
    this.compressorActive = true;

    const cycleCompressor = () => {
      if (!this.compressorActive || this.getEffectiveVolume() === 0) return;

      // Random on duration (8-20 seconds)
      const onDuration = 8000 + Math.random() * 12000;
      // Random off duration (15-45 seconds)
      const offDuration = 15000 + Math.random() * 30000;

      this.startCompressorSound();

      setTimeout(() => {
        this.stopCompressorSound();
        if (this.compressorActive) {
          this.compressorInterval = setTimeout(cycleCompressor, offDuration);
        }
      }, onDuration);
    };

    // Start first cycle after a random delay
    this.compressorInterval = setTimeout(cycleCompressor, 5000 + Math.random() * 10000);
  }

  stopCompressorCycling() {
    this.compressorActive = false;
    if (this.compressorInterval) {
      clearTimeout(this.compressorInterval);
      this.compressorInterval = null;
    }
    this.stopCompressorSound();
  }

  private startCompressorSound() {
    if (this.compressorNodes || this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Air compressor has a rhythmic pumping sound with motor hum
      const buffer = this.createNoiseBuffer(4, 'brown');
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const lowpass = ctx.createBiquadFilter();
      const bandpass = ctx.createBiquadFilter();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      source.buffer = buffer;
      source.loop = true;

      // Low frequency motor rumble
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(200, currentTime);
      lowpass.Q.setValueAtTime(2, currentTime);

      // Add some mid-frequency pump character
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(120, currentTime);
      bandpass.Q.setValueAtTime(4, currentTime);

      // LFO for rhythmic pumping effect (compressor strokes)
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(3.5, currentTime); // About 210 pumps/min
      lfoGain.gain.setValueAtTime(0.015, currentTime);

      // Fade in when compressor starts
      gain.gain.setValueAtTime(0, currentTime);
      gain.gain.linearRampToValueAtTime(0.035, currentTime + 0.5);

      source.connect(lowpass);
      lowpass.connect(bandpass);
      bandpass.connect(gain);
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      gain.connect(masterGain);

      source.start();
      lfo.start();

      this.compressorNodes = { source, gain };

      // Play startup clunk
      this.playCompressorStartup();
    } catch { /* Audio API error - silent */ }
  }

  private stopCompressorSound() {
    if (this.compressorNodes) {
      try {
        const ctx = this.getContext();
        if (ctx) {
          // Fade out before stopping
          this.compressorNodes.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
          setTimeout(() => {
            try {
              this.compressorNodes?.source.stop();
            } catch { /* Audio API error - silent */ }
            this.compressorNodes = null;
          }, 500);
        }
      } catch { /* Audio API error - silent */ }
    }
  }

  // Compressor startup clunk sound
  private playCompressorStartup() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Heavy mechanical clunk
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, currentTime);
      osc.frequency.exponentialRampToValueAtTime(25, currentTime + 0.15);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(100, currentTime);

      gain.gain.setValueAtTime(0.12, currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.25);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(currentTime);
      osc.stop(currentTime + 0.3);
    } catch { /* Audio API error - silent */ }
  }

  // === RANDOM METAL CLANKS ===

  private metalClankActive: boolean = false;
  private metalClankInterval: ReturnType<typeof setInterval> | null = null;

  // Start random metal clanks from factory floor
  startMetalClanks() {
    if (this.metalClankActive) return;
    this.metalClankActive = true;

    const playRandomClank = () => {
      if (!this.metalClankActive || this.getEffectiveVolume() === 0) return;

      const clankType = Math.random();
      if (clankType < 0.3) {
        this.playMetalClankHeavy();
      } else if (clankType < 0.6) {
        this.playMetalClankLight();
      } else if (clankType < 0.85) {
        this.playMetalPing();
      } else {
        this.playChainRattle();
      }

      // Schedule next clank (10-40 seconds)
      const nextDelay = 10000 + Math.random() * 30000;
      this.metalClankInterval = setTimeout(playRandomClank, nextDelay);
    };

    // Start with a delay
    this.metalClankInterval = setTimeout(playRandomClank, 8000 + Math.random() * 12000);
  }

  stopMetalClanks() {
    this.metalClankActive = false;
    if (this.metalClankInterval) {
      clearTimeout(this.metalClankInterval);
      this.metalClankInterval = null;
    }
  }

  // Heavy metal clank (tool dropping, impact)
  private playMetalClankHeavy() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Multiple frequencies for rich metallic sound
      const frequencies = [80, 180, 340, 680];
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.7, currentTime + 0.1);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq, currentTime);
        filter.Q.setValueAtTime(8, currentTime);

        const vol = 0.04 / (i + 1);
        gain.gain.setValueAtTime(vol, currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.15 + i * 0.05);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc.start(currentTime);
        osc.stop(currentTime + 0.25);
      });

      // Add noise burst for impact
      const buffer = this.createNoiseBuffer(0.1, 'white');
      if (!buffer) return;
      const noiseSource = ctx.createBufferSource();
      const noiseGain = ctx.createGain();
      const noiseFilter = ctx.createBiquadFilter();

      noiseSource.buffer = buffer;
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(2000, currentTime);
      noiseFilter.Q.setValueAtTime(1, currentTime);

      noiseGain.gain.setValueAtTime(0.03, currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.05);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);

      noiseSource.start(currentTime);
      noiseSource.stop(currentTime + 0.1);
    } catch { /* Audio API error - silent */ }
  }

  // Light metal clank (wrench, small tool)
  private playMetalClankLight() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      const frequencies = [400, 800, 1600, 2400];
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq + Math.random() * 50, currentTime);

        const vol = 0.025 / (i + 1);
        gain.gain.setValueAtTime(vol, currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.08 + i * 0.02);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(currentTime);
        osc.stop(currentTime + 0.15);
      });
    } catch { /* Audio API error - silent */ }
  }

  // Metal ping (pipe, railing)
  private playMetalPing() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      const baseFreq = 1000 + Math.random() * 500;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, currentTime);

      gain.gain.setValueAtTime(0.04, currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.4);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(currentTime);
      osc.stop(currentTime + 0.45);
    } catch { /* Audio API error - silent */ }
  }

  // Chain rattle
  private playChainRattle() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Series of quick metallic clicks
      const clickCount = 5 + Math.floor(Math.random() * 5);
      for (let i = 0; i < clickCount; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = currentTime + i * 0.04 + Math.random() * 0.02;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200 + Math.random() * 600, startTime);

        gain.gain.setValueAtTime(0.015, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.03);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(startTime);
        osc.stop(startTime + 0.04);
      }
    } catch { /* Audio API error - silent */ }
  }

  // === HYDRAULIC SOUNDS ===

  // Hydraulic lift sound for forklift operations
  playHydraulicLift(forkliftId: string, duration: number = 1.5) {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Hydraulic pump motor whine
      const buffer = this.createNoiseBuffer(duration + 0.5, 'pink');
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const lowpass = ctx.createBiquadFilter();
      const highpass = ctx.createBiquadFilter();

      source.buffer = buffer;

      // Filter to create hydraulic character
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(400, currentTime);
      lowpass.frequency.linearRampToValueAtTime(600, currentTime + duration * 0.3);
      lowpass.frequency.linearRampToValueAtTime(350, currentTime + duration);

      highpass.type = 'highpass';
      highpass.frequency.setValueAtTime(80, currentTime);

      // Envelope
      gain.gain.setValueAtTime(0, currentTime);
      gain.gain.linearRampToValueAtTime(0.025, currentTime + 0.1);
      gain.gain.setValueAtTime(0.025, currentTime + duration - 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

      source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(gain);
      gain.connect(masterGain);

      source.start(currentTime);
      source.stop(currentTime + duration + 0.2);

      // Add hydraulic fluid whoosh
      this.playHydraulicFluid(duration);
    } catch { /* Audio API error - silent */ }
  }

  // Hydraulic lower sound (slower, different character)
  playHydraulicLower(forkliftId: string, duration: number = 2) {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Slower release sound with hiss
      const buffer = this.createNoiseBuffer(duration + 0.5, 'white');
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      source.buffer = buffer;

      // Higher frequency hiss for release
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, currentTime);
      filter.frequency.exponentialRampToValueAtTime(300, currentTime + duration);
      filter.Q.setValueAtTime(2, currentTime);

      gain.gain.setValueAtTime(0, currentTime);
      gain.gain.linearRampToValueAtTime(0.02, currentTime + 0.1);
      gain.gain.setValueAtTime(0.02, currentTime + duration * 0.8);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      source.start(currentTime);
      source.stop(currentTime + duration + 0.2);
    } catch { /* Audio API error - silent */ }
  }

  // Hydraulic fluid movement sound
  private playHydraulicFluid(duration: number) {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      const buffer = this.createNoiseBuffer(duration, 'brown');
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      source.buffer = buffer;

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(150, currentTime);
      filter.Q.setValueAtTime(3, currentTime);

      gain.gain.setValueAtTime(0.015, currentTime);
      gain.gain.setValueAtTime(0.015, currentTime + duration * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      source.start(currentTime);
      source.stop(currentTime + duration + 0.1);
    } catch { /* Audio API error - silent */ }
  }

  // === WEATHER SOUNDS ===

  private weatherNodes: { rain?: { source: AudioBufferSourceNode; gain: GainNode } } = {};
  private isRaining: boolean = false;
  private thunderListeners: Set<() => void> = new Set();

  // Subscribe to thunder events for visual synchronization
  onThunder(callback: () => void): () => void {
    this.thunderListeners.add(callback);
    return () => this.thunderListeners.delete(callback);
  }

  private notifyThunderListeners(): void {
    this.thunderListeners.forEach(listener => listener());
  }

  startRain() {
    if (this.weatherNodes.rain || this.getEffectiveVolume() === 0) return;
    this.isRaining = true;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;

      const buffer = this.createNoiseBuffer(4, 'white');
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const highpass = ctx.createBiquadFilter();
      const lowpass = ctx.createBiquadFilter();

      source.buffer = buffer;
      source.loop = true;

      highpass.type = 'highpass';
      highpass.frequency.setValueAtTime(2000, ctx.currentTime);

      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(8000, ctx.currentTime);

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 2);

      source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(gain);
      gain.connect(masterGain);

      source.start();
      this.weatherNodes.rain = { source, gain };
      this.scheduleThunder();
    } catch { /* Audio API error - silent */ }
  }

  stopRain() {
    this.isRaining = false;
    if (this.weatherNodes.rain) {
      try {
        const ctx = this.getContext();
        if (ctx) {
          this.weatherNodes.rain.gain.gain.setTargetAtTime(0, ctx.currentTime, 1);
          setTimeout(() => {
            try { this.weatherNodes.rain?.source.stop(); } catch { /* Audio API error - silent */ }
            this.weatherNodes.rain = undefined;
          }, 3000);
        }
      } catch { /* Audio API error - silent */ }
    }
  }

  private scheduleThunder() {
    if (!this.isRaining) return;
    const delay = 15000 + Math.random() * 45000;
    setTimeout(() => {
      if (this.isRaining) {
        this.playThunder();
        this.scheduleThunder();
      }
    }, delay);
  }

  private playThunder() {
    if (this.getEffectiveVolume() === 0 || !this.isRaining) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Notify listeners for visual sync (lightning flash)
      this.notifyThunderListeners();

      const duration = 2 + Math.random() * 3;
      const buffer = this.createNoiseBuffer(duration + 1, 'brown');
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      source.buffer = buffer;
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(150, currentTime);

      gain.gain.setValueAtTime(0, currentTime);
      gain.gain.linearRampToValueAtTime(0.08, currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.02, currentTime + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      source.start(currentTime);
      source.stop(currentTime + duration + 0.5);
    } catch { /* Audio API error - silent */ }
  }

  // === PNEUMATIC/SPOUTING SOUNDS ===

  private spoutingNodes: Map<string, { source: AudioBufferSourceNode; gain: GainNode }> = new Map();

  startSpoutingSound(spoutId: string, x: number, y: number, z: number) {
    if (this.spoutingNodes.has(spoutId)) return;
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;

      const buffer = this.createNoiseBuffer(3, 'white');
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      source.buffer = buffer;
      source.loop = true;

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1500, ctx.currentTime);
      filter.Q.setValueAtTime(1, ctx.currentTime);

      gain.gain.setValueAtTime(0.02, ctx.currentTime);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      source.start();
      this.spoutingNodes.set(spoutId, { source, gain });
      this.registerSoundPosition(spoutId, x, y, z);
    } catch { /* Audio API error - silent */ }
  }

  updateSpoutingSpatialVolume(spoutId: string) {
    const node = this.spoutingNodes.get(spoutId);
    if (node && this.audioContext) {
      const spatialGain = this.calculateSpatialVolume(spoutId, 0.02, 25);
      node.gain.gain.setTargetAtTime(spatialGain, this.audioContext.currentTime, 0.2);
    }
  }

  stopSpoutingSound(spoutId: string) {
    const node = this.spoutingNodes.get(spoutId);
    if (node) {
      try { node.source.stop(); } catch { /* Audio API error - silent */ }
      this.spoutingNodes.delete(spoutId);
    }
  }

  // === VENTILATION FAN SOUNDS ===

  private ventilationFanNodes: { source: AudioBufferSourceNode; gain: GainNode } | null = null;

  // Start ventilation fan ambient sound (continuous whooshing)
  startVentilationFanSound() {
    if (this.ventilationFanNodes || this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Whooshing fan sound - mix of noise frequencies
      const buffer = this.createNoiseBuffer(4, 'pink');
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const lowpass = ctx.createBiquadFilter();
      const highpass = ctx.createBiquadFilter();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      source.buffer = buffer;
      source.loop = true;

      // Band-limited fan whoosh
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(800, currentTime);
      lowpass.Q.setValueAtTime(1, currentTime);

      highpass.type = 'highpass';
      highpass.frequency.setValueAtTime(100, currentTime);

      // LFO for subtle blade rotation effect
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(2.5, currentTime); // Blade pass frequency
      lfoGain.gain.setValueAtTime(0.008, currentTime);

      // Fade in
      gain.gain.setValueAtTime(0, currentTime);
      gain.gain.linearRampToValueAtTime(0.025, currentTime + 1);

      source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(gain);
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      gain.connect(masterGain);

      source.start();
      lfo.start();

      this.ventilationFanNodes = { source, gain };
    } catch { /* Audio API error - silent */ }
  }

  stopVentilationFanSound() {
    if (this.ventilationFanNodes) {
      try {
        const ctx = this.getContext();
        if (ctx) {
          this.ventilationFanNodes.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
          setTimeout(() => {
            try { this.ventilationFanNodes?.source.stop(); } catch { /* Audio API error - silent */ }
            this.ventilationFanNodes = null;
          }, 1000);
        }
      } catch { /* Audio API error - silent */ }
    }
  }

  // === POWER FLICKER SOUNDS ===

  private lastFlickerSoundTime: number = 0;

  // Electrical buzz/flicker sound during power fluctuation
  playPowerFlicker() {
    if (this.getEffectiveVolume() === 0) return;

    // Debounce
    const now = Date.now();
    if (now - this.lastFlickerSoundTime < 100) return;
    this.lastFlickerSoundTime = now;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // Electrical buzz - multiple harmonics
      const duration = 0.1 + Math.random() * 0.2;

      // Base 60Hz hum
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(60, currentTime);
      gain1.gain.setValueAtTime(0.04, currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);
      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(currentTime);
      osc1.stop(currentTime + duration);

      // Higher harmonic for buzz character
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(120, currentTime);
      gain2.gain.setValueAtTime(0.02, currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, currentTime + duration * 0.8);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(currentTime);
      osc2.stop(currentTime + duration);

      // Crackling noise
      const buffer = this.createNoiseBuffer(duration, 'white');
      if (buffer) {
        const noiseSource = ctx.createBufferSource();
        const noiseGain = ctx.createGain();
        const noiseFilter = ctx.createBiquadFilter();

        noiseSource.buffer = buffer;

        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(2000, currentTime);

        noiseGain.gain.setValueAtTime(0.03, currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration * 0.5);

        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);

        noiseSource.start(currentTime);
        noiseSource.stop(currentTime + duration);
      }
    } catch { /* Audio API error - silent */ }
  }

  // === WATER DRIP SOUNDS ===

  private lastDripSoundTime: number = 0;

  // Water drip hitting floor/puddle
  playWaterDrip() {
    if (this.getEffectiveVolume() === 0) return;

    // Debounce to prevent too many drip sounds
    const now = Date.now();
    if (now - this.lastDripSoundTime < 200) return;
    this.lastDripSoundTime = now;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      // High-pitched plop sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Random pitch variation for natural feel
      const basePitch = 800 + Math.random() * 400;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(basePitch, currentTime);
      osc.frequency.exponentialRampToValueAtTime(basePitch * 0.3, currentTime + 0.15);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, currentTime);
      filter.Q.setValueAtTime(2, currentTime);

      // Quick attack, medium decay
      gain.gain.setValueAtTime(0.06, currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(currentTime);
      osc.stop(currentTime + 0.25);

      // Add subtle splash noise
      const buffer = this.createNoiseBuffer(0.1, 'white');
      if (buffer) {
        const noiseSource = ctx.createBufferSource();
        const noiseGain = ctx.createGain();
        const noiseFilter = ctx.createBiquadFilter();

        noiseSource.buffer = buffer;

        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(3000, currentTime);
        noiseFilter.Q.setValueAtTime(1, currentTime);

        noiseGain.gain.setValueAtTime(0.02, currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.08);

        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);

        noiseSource.start(currentTime);
        noiseSource.stop(currentTime + 0.1);
      }
    } catch { /* Audio API error - silent */ }
  }

  // === LOADING BAY DOOR SOUNDS ===

  playDoorOpen() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      const duration = 2.5;
      const buffer = this.createNoiseBuffer(duration + 0.5, 'brown');
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      source.buffer = buffer;
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, currentTime);
      filter.frequency.linearRampToValueAtTime(400, currentTime + duration);
      filter.Q.setValueAtTime(2, currentTime);

      gain.gain.setValueAtTime(0, currentTime);
      gain.gain.linearRampToValueAtTime(0.04, currentTime + 0.1);
      gain.gain.setValueAtTime(0.04, currentTime + duration - 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      source.start(currentTime);
      source.stop(currentTime + duration + 0.2);

      setTimeout(() => this.playDoorClunk(), (duration - 0.2) * 1000);
    } catch { /* Audio API error - silent */ }
  }

  playDoorClose() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      const duration = 2.5;
      const buffer = this.createNoiseBuffer(duration + 0.5, 'brown');
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      source.buffer = buffer;
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, currentTime);
      filter.frequency.linearRampToValueAtTime(150, currentTime + duration);
      filter.Q.setValueAtTime(2, currentTime);

      gain.gain.setValueAtTime(0, currentTime);
      gain.gain.linearRampToValueAtTime(0.04, currentTime + 0.1);
      gain.gain.setValueAtTime(0.04, currentTime + duration - 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      source.start(currentTime);
      source.stop(currentTime + duration + 0.2);

      setTimeout(() => this.playDoorClunk(), (duration - 0.1) * 1000);
    } catch { /* Audio API error - silent */ }
  }

  private playDoorClunk() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      if (!ctx || !masterGain) return;
      const currentTime = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, currentTime + 0.2);

      gain.gain.setValueAtTime(0.08, currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.3);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(currentTime);
      osc.stop(currentTime + 0.35);
    } catch { /* Audio API error - silent */ }
  }

  // === TEXT-TO-SPEECH (TTS) FOR PA ANNOUNCEMENTS ===

  // TTS enabled getter/setter
  get ttsEnabled(): boolean {
    return this._ttsEnabled;
  }

  set ttsEnabled(value: boolean) {
    this._ttsEnabled = value;
    if (!value) {
      this.stopTTS();
    }
    this.notifyListeners();
  }

  // Initialize TTS voice - call after user interaction (browser requirement)
  private initTTSVoice(): void {
    if (this._ttsVoiceLoaded || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;

      // Prefer British English female voices for PA announcements
      // Priority order: Google UK Female > Other UK Female > Any British > Fallback
      const preferredVoices = [
        'Google UK English Female',
        'Google UK English Male', // British male as backup
        'Microsoft Hazel - English (United Kingdom)',
        'Microsoft Susan - English (United Kingdom)',
        'Karen', // macOS Australian (close to British)
        'Daniel', // macOS British male
        'Samantha', // macOS US female (last resort)
      ];

      // First pass: exact name matches in priority order
      for (const preferred of preferredVoices) {
        const found = voices.find((v) => v.name === preferred);
        if (found) {
          this._ttsVoice = found;
          break;
        }
      }

      // Second pass: partial name matches
      if (!this._ttsVoice) {
        for (const preferred of preferredVoices) {
          const found = voices.find((v) => v.name.includes(preferred));
          if (found) {
            this._ttsVoice = found;
            break;
          }
        }
      }

      // Third pass: any UK/GB English voice
      if (!this._ttsVoice) {
        const britishVoice = voices.find(
          (v) => v.lang === 'en-GB' || v.lang === 'en_GB'
        );
        if (britishVoice) {
          this._ttsVoice = britishVoice;
        }
      }

      // Fourth pass: any English female voice
      if (!this._ttsVoice) {
        const englishFemale = voices.find(
          (v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')
        );
        if (englishFemale) {
          this._ttsVoice = englishFemale;
        }
      }

      // Fallback to first English voice
      if (!this._ttsVoice) {
        this._ttsVoice = voices.find((v) => v.lang.startsWith('en')) || voices[0];
      }

      // Log selected voice for debugging
      console.log('[AudioManager] TTS voice selected:', this._ttsVoice?.name, this._ttsVoice?.lang);

      this._ttsVoiceLoaded = true;
    };

    // Chrome loads voices asynchronously
    if (window.speechSynthesis.getVoices().length) {
      loadVoices();
    } else {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  // Speak a PA announcement using TTS
  speakAnnouncement(text: string): void {
    if (!this._ttsEnabled || this._muted || !('speechSynthesis' in window)) {
      return;
    }

    // Ensure voice is loaded
    if (!this._ttsVoiceLoaded) {
      this.initTTSVoice();
    }

    // Cancel any current speech
    this.stopTTS();

    try {
      const utterance = new SpeechSynthesisUtterance(text);

      // Configure voice settings for PA-style delivery
      if (this._ttsVoice) {
        utterance.voice = this._ttsVoice;
      }
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1.0;
      utterance.volume = this._volume * 0.8; // Slightly quieter than effects

      utterance.onerror = () => {
        // TTS error - silent fail
      };

      // Play PA chime first, then speak after delay
      this.playPAChime();
      setTimeout(() => {
        if (this._ttsEnabled && !this._muted) {
          window.speechSynthesis.speak(utterance);
        }
      }, 1200); // Match existing PA chime timing
    } catch {
      // TTS playback failed - silent fail
    }
  }

  // Stop TTS
  stopTTS(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  // Check if TTS is currently speaking
  isSpeaking(): boolean {
    return 'speechSynthesis' in window && window.speechSynthesis.speaking;
  }

  // Stop all sounds
  stopAll() {
    this.stopAmbientSounds();
    this.stopOutdoorAmbient();
    this.stopRadioChatter();
    this.stopWorkerVoices();
    this.stopTTS();
    this.stopNightAmbient();
    this.stopPASystem();
    this.stopRain();
    this.stopEmergencyAlarm();
    this.stopCompressorCycling();
    this.stopMetalClanks();
    this.stopVentilationFanSound();
    this.machineNodes.forEach((node, id) => {
      this.stopMachineSound(id);
    });
    this.forkliftEngines.forEach((engine, id) => {
      this.stopForkliftEngine(id);
    });
    this.forkliftEngines.clear();
    this.truckEngines.forEach((engine, id) => {
      this.stopTruckEngine(id);
    });
    this.conveyorNodes.forEach((node, id) => {
      this.stopConveyorSound(id);
    });
    this.spoutingNodes.forEach((node, id) => {
      this.stopSpoutingSound(id);
    });
  }
}

export const audioManager = new AudioManager();
