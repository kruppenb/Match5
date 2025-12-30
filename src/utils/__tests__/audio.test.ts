import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioManager, getAudioManager } from '../AudioManager';

// Mock AudioContext
class MockOscillator {
  type: OscillatorType = 'sine';
  frequency = { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
  connect = vi.fn().mockReturnThis();
  start = vi.fn();
  stop = vi.fn();
  disconnect = vi.fn();
}

class MockGainNode {
  gain = { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
  connect = vi.fn().mockReturnThis();
  disconnect = vi.fn();
}

class MockBufferSource {
  buffer: AudioBuffer | null = null;
  connect = vi.fn().mockReturnThis();
  start = vi.fn();
  disconnect = vi.fn();
}

class MockAudioContext {
  state = 'running';
  sampleRate = 44100;
  currentTime = 0;
  destination = {};

  createOscillator = vi.fn(() => new MockOscillator());
  createGain = vi.fn(() => new MockGainNode());
  createBufferSource = vi.fn(() => new MockBufferSource());
  createBuffer = vi.fn((channels: number, length: number, sampleRate: number) => ({
    numberOfChannels: channels,
    length,
    sampleRate,
    getChannelData: vi.fn(() => new Float32Array(length)),
  }));
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}

describe('AudioManager', () => {
  let audio: AudioManager;
  let originalAudioContext: typeof window.AudioContext;
  let mockContext: MockAudioContext;

  beforeEach(() => {
    // Save original
    originalAudioContext = (window as any).AudioContext;

    // Setup mock
    mockContext = new MockAudioContext();
    (window as any).AudioContext = vi.fn(() => mockContext);

    audio = new AudioManager();
  });

  afterEach(() => {
    audio.destroy();
    (window as any).AudioContext = originalAudioContext;
    vi.clearAllMocks();
  });

  describe('init', () => {
    it('should create AudioContext when init is called', () => {
      const result = audio.init();
      expect(result).toBe(true);
      expect(window.AudioContext).toHaveBeenCalled();
    });

    it('should return true on subsequent init calls', () => {
      audio.init();
      const result = audio.init();
      expect(result).toBe(true);
    });

    it('should resume suspended context', () => {
      mockContext.state = 'suspended';
      audio.init();
      expect(mockContext.resume).toHaveBeenCalled();
    });
  });

  describe('volume controls', () => {
    it('should set SFX volume', () => {
      audio.init();
      audio.setSfxVolume(0.8);
      expect(audio.getSfxVolume()).toBe(0.8);
    });

    it('should clamp SFX volume to 0-1', () => {
      audio.init();
      audio.setSfxVolume(1.5);
      expect(audio.getSfxVolume()).toBe(1);

      audio.setSfxVolume(-0.5);
      expect(audio.getSfxVolume()).toBe(0);
    });

    it('should set music volume', () => {
      audio.init();
      audio.setMusicVolume(0.6);
      expect(audio.getMusicVolume()).toBe(0.6);
    });
  });

  describe('mute controls', () => {
    it('should start unmuted', () => {
      expect(audio.getIsMuted()).toBe(false);
    });

    it('should mute when mute() is called', () => {
      audio.init();
      audio.mute();
      expect(audio.getIsMuted()).toBe(true);
    });

    it('should unmute when unmute() is called', () => {
      audio.init();
      audio.mute();
      audio.unmute();
      expect(audio.getIsMuted()).toBe(false);
    });

    it('should toggle mute state', () => {
      audio.init();
      expect(audio.toggleMute()).toBe(true);
      expect(audio.toggleMute()).toBe(false);
    });
  });

  describe('sound playback', () => {
    beforeEach(() => {
      audio.init();
    });

    it('should create oscillator for match sound', () => {
      audio.playMatch();
      expect(mockContext.createOscillator).toHaveBeenCalled();
      expect(mockContext.createGain).toHaveBeenCalled();
    });

    it('should create oscillators for cascade sound', () => {
      audio.playCascade(3);
      expect(mockContext.createOscillator).toHaveBeenCalled();
    });

    it('should create oscillator for rocket sound', () => {
      audio.playRocket();
      expect(mockContext.createOscillator).toHaveBeenCalled();
    });

    it('should create oscillator for bomb sound', () => {
      audio.playBomb();
      expect(mockContext.createOscillator).toHaveBeenCalled();
    });

    it('should not play sounds when muted', () => {
      audio.mute();
      mockContext.createOscillator.mockClear();
      audio.playMatch();
      expect(mockContext.createOscillator).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should close audio context when destroyed', () => {
      audio.init();
      audio.destroy();
      expect(mockContext.close).toHaveBeenCalled();
    });
  });
});

describe('getAudioManager', () => {
  it('should return a singleton instance', () => {
    const instance1 = getAudioManager();
    const instance2 = getAudioManager();
    expect(instance1).toBe(instance2);
  });
});
