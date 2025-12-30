import Phaser from 'phaser';

/**
 * Screen shake intensity levels
 */
export enum ShakeIntensity {
  LIGHT = 0.002,    // Light match
  MEDIUM = 0.004,   // 4+ match
  HEAVY = 0.008,    // Powerup activation
  EXTREME = 0.012,  // Big combo or bomb
  MEGA = 0.02,      // Color bomb + color bomb
}

/**
 * ScreenShake manager for impactful game feel
 * Provides various shake effects for different game events
 */
export class ScreenShake {
  private scene: Phaser.Scene;
  private isShaking = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Basic screen shake with customizable intensity and duration
   */
  shake(intensity: number = ShakeIntensity.MEDIUM, duration: number = 200): void {
    if (!this.scene.cameras.main) return;

    // Don't stack shakes - use the stronger one
    if (this.isShaking) {
      const shakeEffect = (this.scene.cameras.main as any).shakeEffect;
      const currentIntensity = shakeEffect?.intensity?.x || 0;
      if (currentIntensity >= intensity) return;
    }

    this.isShaking = true;
    this.scene.cameras.main.shake(duration, intensity, false, (
      _camera: Phaser.Cameras.Scene2D.Camera,
      progress: number
    ) => {
      if (progress >= 1) {
        this.isShaking = false;
      }
    });
  }

  /**
   * Light shake for basic matches
   */
  light(): void {
    this.shake(ShakeIntensity.LIGHT, 100);
  }

  /**
   * Medium shake for 4+ matches
   */
  medium(): void {
    this.shake(ShakeIntensity.MEDIUM, 150);
  }

  /**
   * Heavy shake for powerup activation
   */
  heavy(): void {
    this.shake(ShakeIntensity.HEAVY, 200);
  }

  /**
   * Extreme shake for big combos or bombs
   */
  extreme(): void {
    this.shake(ShakeIntensity.EXTREME, 250);
  }

  /**
   * Mega shake for board-clearing effects
   */
  mega(): void {
    this.shake(ShakeIntensity.MEGA, 300);
  }

  /**
   * Shake based on match size
   */
  forMatchSize(size: number): void {
    if (size >= 7) {
      this.extreme();
    } else if (size >= 5) {
      this.heavy();
    } else if (size >= 4) {
      this.medium();
    }
    // 3 matches don't shake
  }

  /**
   * Shake based on cascade level
   */
  forCascade(cascadeCount: number): void {
    if (cascadeCount >= 5) {
      this.extreme();
    } else if (cascadeCount >= 3) {
      this.heavy();
    } else if (cascadeCount >= 2) {
      this.medium();
    }
  }

  /**
   * Shake for powerup type
   */
  forPowerup(powerupType: string): void {
    switch (powerupType) {
      case 'color_bomb':
        this.extreme();
        break;
      case 'bomb':
        this.heavy();
        break;
      case 'rocket_h':
      case 'rocket_v':
        this.medium();
        break;
      case 'propeller':
        this.light();
        break;
    }
  }

  /**
   * Shake for powerup combination
   */
  forPowerupCombination(type1: string, type2: string): void {
    const types = [type1, type2].sort();
    const comboKey = types.join('+');

    switch (comboKey) {
      case 'color_bomb+color_bomb':
        this.mega();
        break;
      case 'bomb+color_bomb':
      case 'color_bomb+rocket_h':
      case 'color_bomb+rocket_v':
        this.extreme();
        break;
      case 'bomb+bomb':
      case 'bomb+rocket_h':
      case 'bomb+rocket_v':
        this.heavy();
        break;
      default:
        this.medium();
    }
  }

  /**
   * Stop any current shake effect
   */
  stop(): void {
    if (this.scene.cameras.main) {
      // Reset camera position
      this.scene.cameras.main.setScroll(0, 0);
      this.isShaking = false;
    }
  }
}
