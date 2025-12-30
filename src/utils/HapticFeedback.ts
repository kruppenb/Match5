/**
 * HapticFeedback provides vibration feedback for mobile devices.
 * Uses the Vibration API which has limited support on iOS Safari.
 */
export class HapticFeedback {
  private supported: boolean;
  private enabled: boolean = true;

  constructor() {
    this.supported = 'vibrate' in navigator;
  }

  /**
   * Check if haptic feedback is supported
   */
  isSupported(): boolean {
    return this.supported;
  }

  /**
   * Enable haptic feedback
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable haptic feedback
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Toggle haptic feedback
   */
  toggle(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  /**
   * Check if haptic feedback is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Light vibration - for basic matches
   */
  light(): void {
    this.vibrate(10);
  }

  /**
   * Medium vibration - for powerup creation
   */
  medium(): void {
    this.vibrate(25);
  }

  /**
   * Heavy vibration - for powerup activation
   */
  heavy(): void {
    this.vibrate(50);
  }

  /**
   * Double tap vibration - for successful swap
   */
  doubleTap(): void {
    this.vibrate([10, 30, 10]);
  }

  /**
   * Triple tap vibration - for cascade
   */
  tripleTap(): void {
    this.vibrate([10, 20, 10, 20, 10]);
  }

  /**
   * Rumble pattern - for big combos
   */
  rumble(): void {
    this.vibrate([50, 50, 50, 50, 100]);
  }

  /**
   * Success pattern - for level complete
   */
  success(): void {
    this.vibrate([30, 50, 30, 50, 100]);
  }

  /**
   * Error pattern - for invalid move
   */
  error(): void {
    this.vibrate([100, 50, 100]);
  }

  /**
   * Custom vibration pattern
   * @param pattern Single duration or array of [vibrate, pause, vibrate, pause, ...]
   */
  vibrate(pattern: number | number[]): void {
    if (!this.supported || !this.enabled) return;

    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Silently fail if vibration fails
    }
  }

  /**
   * Stop any ongoing vibration
   */
  stop(): void {
    if (!this.supported) return;

    try {
      navigator.vibrate(0);
    } catch (e) {
      // Silently fail
    }
  }

  /**
   * Vibrate based on match size
   */
  forMatchSize(size: number): void {
    if (size >= 5) {
      this.heavy();
    } else if (size >= 4) {
      this.medium();
    } else if (size >= 3) {
      this.light();
    }
  }

  /**
   * Vibrate based on cascade level
   */
  forCascade(cascadeLevel: number): void {
    if (cascadeLevel >= 4) {
      this.rumble();
    } else if (cascadeLevel >= 3) {
      this.tripleTap();
    } else if (cascadeLevel >= 2) {
      this.doubleTap();
    }
  }

  /**
   * Vibrate for powerup type
   */
  forPowerup(powerupType: string): void {
    switch (powerupType) {
      case 'color_bomb':
        this.rumble();
        break;
      case 'bomb':
        this.heavy();
        break;
      case 'rocket_h':
      case 'rocket_v':
        this.medium();
        break;
      case 'propeller':
        this.doubleTap();
        break;
      default:
        this.medium();
    }
  }

  /**
   * Vibrate for powerup combination
   */
  forPowerupCombination(): void {
    this.rumble();
  }
}

// Singleton instance
let hapticInstance: HapticFeedback | null = null;

export function getHapticFeedback(): HapticFeedback {
  if (!hapticInstance) {
    hapticInstance = new HapticFeedback();
  }
  return hapticInstance;
}
