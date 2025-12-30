import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HapticFeedback, getHapticFeedback } from '../HapticFeedback';

describe('HapticFeedback', () => {
  let haptic: HapticFeedback;
  let originalNavigator: typeof navigator;

  beforeEach(() => {
    // Save original navigator
    originalNavigator = global.navigator;

    // Mock navigator with vibrate support
    Object.defineProperty(global, 'navigator', {
      value: {
        vibrate: vi.fn().mockReturnValue(true),
      },
      writable: true,
      configurable: true,
    });

    haptic = new HapticFeedback();
  });

  afterEach(() => {
    // Restore original navigator
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    vi.clearAllMocks();
  });

  describe('isSupported', () => {
    it('should return true when vibrate is available', () => {
      expect(haptic.isSupported()).toBe(true);
    });

    it('should return false when vibrate is not available', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });
      const noVibrateHaptic = new HapticFeedback();
      expect(noVibrateHaptic.isSupported()).toBe(false);
    });
  });

  describe('enable/disable', () => {
    it('should start enabled', () => {
      expect(haptic.isEnabled()).toBe(true);
    });

    it('should disable when disable() is called', () => {
      haptic.disable();
      expect(haptic.isEnabled()).toBe(false);
    });

    it('should enable when enable() is called', () => {
      haptic.disable();
      haptic.enable();
      expect(haptic.isEnabled()).toBe(true);
    });

    it('should toggle state', () => {
      expect(haptic.toggle()).toBe(false);
      expect(haptic.toggle()).toBe(true);
    });
  });

  describe('vibration methods', () => {
    it('should call navigator.vibrate for light()', () => {
      haptic.light();
      expect(navigator.vibrate).toHaveBeenCalledWith(10);
    });

    it('should call navigator.vibrate for medium()', () => {
      haptic.medium();
      expect(navigator.vibrate).toHaveBeenCalledWith(25);
    });

    it('should call navigator.vibrate for heavy()', () => {
      haptic.heavy();
      expect(navigator.vibrate).toHaveBeenCalledWith(50);
    });

    it('should call navigator.vibrate with pattern for doubleTap()', () => {
      haptic.doubleTap();
      expect(navigator.vibrate).toHaveBeenCalledWith([10, 30, 10]);
    });

    it('should call navigator.vibrate with pattern for rumble()', () => {
      haptic.rumble();
      expect(navigator.vibrate).toHaveBeenCalledWith([50, 50, 50, 50, 100]);
    });

    it('should not vibrate when disabled', () => {
      haptic.disable();
      haptic.light();
      expect(navigator.vibrate).not.toHaveBeenCalled();
    });
  });

  describe('forMatchSize', () => {
    it('should call heavy for 5+ matches', () => {
      haptic.forMatchSize(5);
      expect(navigator.vibrate).toHaveBeenCalledWith(50);
    });

    it('should call medium for 4 matches', () => {
      haptic.forMatchSize(4);
      expect(navigator.vibrate).toHaveBeenCalledWith(25);
    });

    it('should call light for 3 matches', () => {
      haptic.forMatchSize(3);
      expect(navigator.vibrate).toHaveBeenCalledWith(10);
    });

    it('should not vibrate for 2 or fewer', () => {
      haptic.forMatchSize(2);
      expect(navigator.vibrate).not.toHaveBeenCalled();
    });
  });

  describe('forPowerup', () => {
    it('should rumble for color_bomb', () => {
      haptic.forPowerup('color_bomb');
      expect(navigator.vibrate).toHaveBeenCalledWith([50, 50, 50, 50, 100]);
    });

    it('should heavy vibrate for bomb', () => {
      haptic.forPowerup('bomb');
      expect(navigator.vibrate).toHaveBeenCalledWith(50);
    });

    it('should medium vibrate for rockets', () => {
      haptic.forPowerup('rocket_h');
      expect(navigator.vibrate).toHaveBeenCalledWith(25);
    });

    it('should doubleTap for propeller', () => {
      haptic.forPowerup('propeller');
      expect(navigator.vibrate).toHaveBeenCalledWith([10, 30, 10]);
    });
  });

  describe('stop', () => {
    it('should call vibrate with 0 to stop', () => {
      haptic.stop();
      expect(navigator.vibrate).toHaveBeenCalledWith(0);
    });
  });
});

describe('getHapticFeedback', () => {
  it('should return a singleton instance', () => {
    const instance1 = getHapticFeedback();
    const instance2 = getHapticFeedback();
    expect(instance1).toBe(instance2);
  });
});
