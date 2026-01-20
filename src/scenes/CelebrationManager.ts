import Phaser from 'phaser';
import { Grid } from '../game/Grid';
import { Tile } from '../types';
import { ParticleManager } from '../utils/ParticleManager';
import { ScreenShake } from '../utils/ScreenShake';
import { AudioManager } from '../utils/AudioManager';
import { HapticFeedback } from '../utils/HapticFeedback';

export interface CelebrationCallbacks {
  onComplete: (score: number, stars: number, bonus: number) => void;
  cellToScreen: (row: number, col: number) => { x: number; y: number };
  getTileSprite: (tileId: string) => Phaser.GameObjects.Container | undefined;
  deleteTileSprite: (tileId: string) => void;
}

/**
 * Handles the victory celebration sequence with fireworks
 */
export class CelebrationManager {
  private scene: Phaser.Scene;
  private grid: Grid;
  private particleManager: ParticleManager;
  private audioManager: AudioManager;
  private hapticFeedback: HapticFeedback;
  private callbacks: CelebrationCallbacks;

  constructor(
    scene: Phaser.Scene,
    grid: Grid,
    particleManager: ParticleManager,
    _screenShake: ScreenShake, // Kept for API compatibility but unused
    audioManager: AudioManager,
    hapticFeedback: HapticFeedback,
    callbacks: CelebrationCallbacks
  ) {
    this.scene = scene;
    this.grid = grid;
    this.particleManager = particleManager;
    this.audioManager = audioManager;
    this.hapticFeedback = hapticFeedback;
    this.callbacks = callbacks;
  }

  /**
   * Play the full victory celebration sequence
   */
  async playCelebration(remainingMoves: number, score: number, stars: number, bonus: number): Promise<void> {
    const celebrationDuration = 2500; // 2.5 seconds total
    const startTime = Date.now();

    const { width: screenWidth, height: screenHeight } = this.scene.scale;

    // Start continuous fireworks (slower interval, less intense)
    const fireworkInterval = this.scene.time.addEvent({
      delay: 400,
      callback: () => {
        const x = 50 + Math.random() * (screenWidth - 100);
        const y = 100 + Math.random() * (screenHeight / 2);
        this.particleManager.emitFirework(x, y);

        if (Math.random() > 0.7) {
          this.audioManager.playMatch();
        }
      },
      loop: true,
    });

    // Quietly clear remaining tiles without the intense explosions
    if (remainingMoves > 0) {
      await this.quietTileClear(remainingMoves);
    }

    // Wait for remaining celebration time
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, celebrationDuration - elapsed);

    await this.delay(remaining);

    // Stop fireworks
    fireworkInterval.destroy();

    // Final firework burst (reduced count)
    for (let i = 0; i < 3; i++) {
      const x = 80 + Math.random() * (screenWidth - 160);
      const y = 150 + Math.random() * (screenHeight / 3);
      this.scene.time.delayedCall(i * 150, () => {
        this.particleManager.emitFirework(x, y);
      });
    }

    // Wait a tiny bit for final burst
    await this.delay(300);

    // Trigger completion callback
    this.callbacks.onComplete(score, stars, bonus);
  }

  /**
   * Quietly clear remaining tiles with gentle particle effects (no screen shake or explosions)
   */
  private async quietTileClear(movesRemaining: number): Promise<void> {
    // Get all tiles currently on the grid
    const tiles: Tile[] = [];
    for (let row = 0; row < this.grid.rows; row++) {
      for (let col = 0; col < this.grid.cols; col++) {
        const tile = this.grid.getTile(row, col);
        if (tile) {
          tiles.push(tile);
        }
      }
    }

    if (tiles.length === 0) return;

    // Clear tiles in batches without intense effects
    const batchSize = Math.ceil(tiles.length / Math.min(movesRemaining, 5));
    const delayBetween = 150;

    while (tiles.length > 0) {
      const batch = tiles.splice(0, batchSize);

      // Just animate the tiles disappearing with particles
      await this.animateCelebrationClear(batch);

      // Light haptic feedback only
      this.hapticFeedback.light();

      if (tiles.length > 0) {
        await this.delay(delayBetween);
      }
    }
  }

  private async animateCelebrationClear(tiles: Tile[]): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const tile of tiles) {
      const sprite = this.callbacks.getTileSprite(tile.id);
      if (!sprite) continue;

      // Get screen position for particles
      const pos = this.callbacks.cellToScreen(tile.row, tile.col);
      const color = this.getColorValue(tile.type);
      this.particleManager.emitMatchParticles(pos.x, pos.y, color, 8);

      // Animate sprite out
      const promise = new Promise<void>(resolve => {
        this.scene.tweens.add({
          targets: sprite,
          scale: 0,
          alpha: 0,
          duration: 150,
          ease: 'Back.easeIn',
          onComplete: () => {
            sprite.destroy();
            this.callbacks.deleteTileSprite(tile.id);
            resolve();
          },
        });
      });
      promises.push(promise);

      // Remove tile from grid
      this.grid.setTile(tile.row, tile.col, null);
    }

    await Promise.all(promises);
  }

  private getColorValue(colorName: string): number {
    const colorMap: Record<string, number> = {
      red: 0xff4444,
      blue: 0x4444ff,
      green: 0x44ff44,
      yellow: 0xffff44,
      purple: 0xff44ff,
      orange: 0xff8844,
      cyan: 0x44ffff,
      pink: 0xff88aa,
    };
    return colorMap[colorName] || 0xffffff;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      this.scene.time.delayedCall(ms, () => resolve());
    });
  }
}
