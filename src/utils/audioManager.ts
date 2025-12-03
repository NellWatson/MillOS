// Audio manager for realistic factory sounds using Web Audio API

class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private lastHornTime: Map<string, number> = new Map();
  private lastBeepTime: Map<string, number> = new Map();
  private _muted: boolean = false;
  private _volume: number = 0.5;
  private listeners: Set<() => void> = new Set();

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
  private forkliftEngines: Map<string, { source: OscillatorNode; gain: GainNode; lfo: OscillatorNode }> = new Map();

  get muted(): boolean {
    return this._muted;
  }

  set muted(value: boolean) {
    this._muted = value;
    this.updateMasterVolume();
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

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.updateMasterVolume();
    }
    return this.audioContext;
  }

  private getMasterGain(): GainNode {
    this.getContext();
    return this.masterGain!;
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
  private createNoiseBuffer(duration: number, type: 'white' | 'pink' | 'brown' = 'white'): AudioBuffer {
    const ctx = this.getContext();
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

      // Machinery hum - low frequency drone
      {
        const buffer = this.createNoiseBuffer(4, 'brown');
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
        } catch (e) {}
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

      // Grinding noise with harmonic content based on RPM
      const buffer = this.createNoiseBuffer(2, 'pink');
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

    } catch (e) {}
  }

  stopMillSound(machineId: string) {
    const node = this.machineNodes.get(machineId);
    if (node) {
      try {
        node.source.stop();
      } catch (e) {}
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

      const buffer = this.createNoiseBuffer(2, 'white');
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

    } catch (e) {}
  }

  // Packer pneumatic/mechanical sound
  playPackerSound(machineId: string) {
    if (this.machineNodes.has(machineId)) return;
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();

      // Pneumatic hiss and mechanical clicks
      const buffer = this.createNoiseBuffer(3, 'white');
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

    } catch (e) {}
  }

  stopMachineSound(machineId: string) {
    const node = this.machineNodes.get(machineId);
    if (node) {
      try {
        node.source.stop();
      } catch (e) {}
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

    } catch (e) {}
  }

  // Alert/warning sound
  playAlert() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
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

    } catch (e) {}
  }

  // Grain pouring/flowing sound
  playGrainFlow(duration: number = 1) {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      const currentTime = ctx.currentTime;

      const buffer = this.createNoiseBuffer(duration + 0.5, 'white');
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

    } catch (e) {}
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

      // Deep rumbling engine sound
      const buffer = this.createNoiseBuffer(3, 'brown');
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
    } catch (e) {}
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
      } catch (e) {}
      this.truckEngines.delete(truckId);
    }
  }

  // Truck air brake release
  playAirBrake() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
      const currentTime = ctx.currentTime;

      const buffer = this.createNoiseBuffer(0.8, 'white');
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
    } catch (e) {}
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
      const currentTime = ctx.currentTime;

      // Soft boot on concrete sound
      const buffer = this.createNoiseBuffer(0.15, 'brown');
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
    } catch (e) {}
  }

  // === UI SOUNDS ===

  // Click sound for UI interactions
  playClick() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
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
    } catch (e) {}
  }

  // Hover sound (subtle)
  playHover() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
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
    } catch (e) {}
  }

  // Panel open/close sound
  playPanelOpen() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
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
    } catch (e) {}
  }

  playPanelClose() {
    if (this.getEffectiveVolume() === 0) return;

    try {
      const ctx = this.getContext();
      const masterGain = this.getMasterGain();
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
    } catch (e) {}
  }

  // Resume audio context if suspended (needed for user interaction requirement)
  async resume() {
    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }

  // Stop all sounds
  stopAll() {
    this.stopAmbientSounds();
    this.machineNodes.forEach((node, id) => {
      this.stopMachineSound(id);
    });
    this.forkliftEngines.forEach((engine, id) => {
      try {
        engine.source.stop();
        engine.lfo.stop();
      } catch (e) {}
    });
    this.forkliftEngines.clear();
    this.truckEngines.forEach((engine, id) => {
      this.stopTruckEngine(id);
    });
  }
}

export const audioManager = new AudioManager();
