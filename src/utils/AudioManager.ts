/**
 * AudioManager handles all game sounds using the Web Audio API.
 * Generates synthesized sounds for a lightweight, dependency-free audio system.
 */
export class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxVolume = 0.5;
  private musicVolume = 0.3;
  private isMuted = false;
  private isInitialized = false;

  // Frequency constants for notes
  private readonly NOTES = {
    C4: 261.63,
    D4: 293.66,
    E4: 329.63,
    F4: 349.23,
    G4: 392.00,
    A4: 440.00,
    B4: 493.88,
    C5: 523.25,
    D5: 587.33,
    E5: 659.25,
    F5: 698.46,
    G5: 783.99,
  };

  constructor() {
    // Initialize on user interaction to comply with browser autoplay policies
    this.init = this.init.bind(this);
  }

  /**
   * Initialize the audio context (must be called after user interaction)
   */
  init(): boolean {
    if (this.isInitialized) return true;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.sfxVolume;
      this.isInitialized = true;

      // Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      return true;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
      return false;
    }
  }

  /**
   * Play a match sound (satisfying pop)
   */
  playMatch(): void {
    if (!this.canPlay()) return;
    this.playTone(this.NOTES.E5, 0.1, 'sine', 0.3);
  }

  /**
   * Play cascade combo sound (escalating pitch)
   */
  playCascade(cascadeLevel: number): void {
    if (!this.canPlay()) return;

    // Increase pitch with cascade level
    const baseFreq = this.NOTES.C4;
    const freq = baseFreq * Math.pow(1.2, Math.min(cascadeLevel, 7));

    this.playTone(freq, 0.15, 'sine', 0.4);

    // Add sparkle for higher cascades
    if (cascadeLevel >= 3) {
      setTimeout(() => {
        this.playTone(freq * 1.5, 0.1, 'sine', 0.2);
      }, 50);
    }
  }

  /**
   * Play powerup creation sound
   */
  playPowerupCreate(): void {
    if (!this.canPlay()) return;

    // Rising arpeggio
    const notes = [this.NOTES.C4, this.NOTES.E4, this.NOTES.G4, this.NOTES.C5];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.15, 'sine', 0.3);
      }, i * 50);
    });
  }

  /**
   * Play rocket launch sound
   */
  playRocket(): void {
    if (!this.canPlay()) return;

    // Whoosh effect - rising then falling frequency
    const ctx = this.audioContext!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.1);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.2 * this.sfxVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  /**
   * Play bomb explosion sound
   */
  playBomb(): void {
    if (!this.canPlay()) return;

    const ctx = this.audioContext!;

    // Low frequency boom
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.5 * this.sfxVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);

    // Add noise burst for impact
    this.playNoise(0.15, 0.3);
  }

  /**
   * Play color bomb activation sound
   */
  playColorBomb(): void {
    if (!this.canPlay()) return;

    // Magical sparkle sound
    const notes = [this.NOTES.C5, this.NOTES.E5, this.NOTES.G5, this.NOTES.C5 * 2];

    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, 'sine', 0.25);
        this.playTone(freq * 1.5, 0.15, 'sine', 0.15); // Harmonics
      }, i * 80);
    });
  }

  /**
   * Play propeller sound
   */
  playPropeller(): void {
    if (!this.canPlay()) return;

    // Whirring sound
    const ctx = this.audioContext!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, ctx.currentTime);

    // Modulate frequency for helicopter effect
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 15;
    lfoGain.gain.value = 100;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start();

    gain.gain.setValueAtTime(0.2 * this.sfxVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    lfo.stop(ctx.currentTime + 0.4);
  }

  /**
   * Play win fanfare
   */
  playWin(): void {
    if (!this.canPlay()) return;

    // Triumphant arpeggio
    const notes = [
      this.NOTES.C4, this.NOTES.E4, this.NOTES.G4,
      this.NOTES.C5, this.NOTES.E5, this.NOTES.G5,
      this.NOTES.C5 * 2,
    ];

    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.3, 'sine', 0.4);
      }, i * 100);
    });

    // Final chord
    setTimeout(() => {
      this.playTone(this.NOTES.C5, 0.5, 'sine', 0.3);
      this.playTone(this.NOTES.E5, 0.5, 'sine', 0.3);
      this.playTone(this.NOTES.G5, 0.5, 'sine', 0.3);
    }, 700);
  }

  /**
   * Play lose sound
   */
  playLose(): void {
    if (!this.canPlay()) return;

    // Descending sad tones
    const notes = [this.NOTES.E4, this.NOTES.D4, this.NOTES.C4];

    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.4, 'sine', 0.3);
      }, i * 200);
    });
  }

  /**
   * Play UI button click
   */
  playClick(): void {
    if (!this.canPlay()) return;
    this.playTone(800, 0.05, 'sine', 0.2);
  }

  /**
   * Play swap sound
   */
  playSwap(): void {
    if (!this.canPlay()) return;
    this.playTone(400, 0.08, 'sine', 0.15);
    setTimeout(() => {
      this.playTone(500, 0.08, 'sine', 0.15);
    }, 40);
  }

  /**
   * Play invalid move sound
   */
  playInvalid(): void {
    if (!this.canPlay()) return;
    this.playTone(200, 0.1, 'square', 0.15);
    setTimeout(() => {
      this.playTone(150, 0.1, 'square', 0.15);
    }, 80);
  }

  // ==================== Helper Methods ====================

  private canPlay(): boolean {
    if (!this.isInitialized) {
      this.init();
    }
    return this.isInitialized && !this.isMuted && this.audioContext !== null;
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume: number = 0.3
  ): void {
    if (!this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;

    gain.gain.setValueAtTime(volume * this.sfxVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  private playNoise(duration: number, volume: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Fill with white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();

    source.buffer = buffer;
    gain.gain.setValueAtTime(volume * this.sfxVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    source.connect(gain);
    gain.connect(this.masterGain);

    source.start();
  }

  // ==================== Volume Controls ====================

  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.sfxVolume;
    }
  }

  getSfxVolume(): number {
    return this.sfxVolume;
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    // Would be used if we add background music
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  mute(): void {
    this.isMuted = true;
    if (this.masterGain) {
      this.masterGain.gain.value = 0;
    }
  }

  unmute(): void {
    this.isMuted = false;
    if (this.masterGain) {
      this.masterGain.gain.value = this.sfxVolume;
    }
  }

  toggleMute(): boolean {
    if (this.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.isMuted;
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Destroy the audio manager
   */
  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.masterGain = null;
      this.isInitialized = false;
    }
  }
}

// Singleton instance
let audioManagerInstance: AudioManager | null = null;

export function getAudioManager(): AudioManager {
  if (!audioManagerInstance) {
    audioManagerInstance = new AudioManager();
  }
  return audioManagerInstance;
}
