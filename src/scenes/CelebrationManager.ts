import Phaser from 'phaser';
import { CONFIG } from '../config';
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
 * Handles the victory celebration sequence with fireworks and explosions
 */
export class CelebrationManager {
  private scene: Phaser.Scene;
  private grid: Grid;
  private particleManager: ParticleManager;
  private screenShake: ScreenShake;
  private audioManager: AudioManager;
  private hapticFeedback: HapticFeedback;
  private callbacks: CelebrationCallbacks;

  constructor(
    scene: Phaser.Scene,
    grid: Grid,
    particleManager: ParticleManager,
    screenShake: ScreenShake,
    audioManager: AudioManager,
    hapticFeedback: HapticFeedback,
    callbacks: CelebrationCallbacks
  ) {
    this.scene = scene;
    this.grid = grid;
    this.particleManager = particleManager;
    this.screenShake = screenShake;
    this.audioManager = audioManager;
    this.hapticFeedback = hapticFeedback;
    this.callbacks = callbacks;
  }

  /**
   * Play the full victory celebration sequence
   */
  async playCelebration(remainingMoves: number, score: number, stars: number, bonus: number): Promise<void> {
    const celebrationDuration = 3000; // 3 seconds total
    const startTime = Date.now();

    // Start continuous fireworks
    const fireworkInterval = this.scene.time.addEvent({
      delay: 200,
      callback: () => {
        const x = 50 + Math.random() * (CONFIG.SCREEN.WIDTH - 100);
        const y = 100 + Math.random() * (CONFIG.SCREEN.HEIGHT / 2);
        this.particleManager.emitFirework(x, y);

        if (Math.random() > 0.6) {
          this.audioManager.playMatch();
        }
      },
      loop: true,
    });

    // Emit initial burst of confetti and celebration stars
    this.particleManager.emitConfetti(CONFIG.SCREEN.WIDTH / 2, CONFIG.SCREEN.HEIGHT / 3, 80);
    this.particleManager.emitCelebrationStars(CONFIG.SCREEN.WIDTH / 2, CONFIG.SCREEN.HEIGHT / 2, 12);

    // Use remaining moves to blow up tiles on the board
    if (remainingMoves > 0) {
      await this.celebrationExplosions(remainingMoves);
    }

    // Wait for remaining celebration time
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, celebrationDuration - elapsed);

    await this.delay(remaining);

    // Stop fireworks
    fireworkInterval.destroy();

    // Final big firework burst
    for (let i = 0; i < 5; i++) {
      const x = 80 + Math.random() * (CONFIG.SCREEN.WIDTH - 160);
      const y = 150 + Math.random() * (CONFIG.SCREEN.HEIGHT / 3);
      this.scene.time.delayedCall(i * 100, () => {
        this.particleManager.emitFirework(x, y);
      });
    }

    // Wait a tiny bit for final burst
    await this.delay(300);

    // Trigger completion callback
    this.callbacks.onComplete(score, stars, bonus);
  }

  private async celebrationExplosions(movesRemaining: number): Promise<void> {
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

    // Calculate how many explosions we can do (max based on remaining moves, but cap it)
    const explosionCount = Math.min(movesRemaining, 10, Math.ceil(tiles.length / 3));
    const delayBetween = 200;

    for (let i = 0; i < explosionCount && tiles.length > 0; i++) {
      // Pick a random tile
      const randomIdx = Math.floor(Math.random() * tiles.length);
      const targetTile = tiles[randomIdx];

      // Get position
      const pos = this.callbacks.cellToScreen(targetTile.row, targetTile.col);

      // Create explosion effect
      this.particleManager.emitExplosion(pos.x, pos.y, 2);
      this.screenShake.shake(3, 80);
      this.audioManager.playBomb();
      this.hapticFeedback.light();

      // Clear tiles in a small radius (like a bomb)
      const clearRadius = 1;
      const tilesToClear: Tile[] = [];

      for (let dr = -clearRadius; dr <= clearRadius; dr++) {
        for (let dc = -clearRadius; dc <= clearRadius; dc++) {
          const r = targetTile.row + dr;
          const c = targetTile.col + dc;
          if (r >= 0 && r < this.grid.rows && c >= 0 && c < this.grid.cols) {
            const tile = this.grid.getTile(r, c);
            if (tile) {
              tilesToClear.push(tile);
              const idx = tiles.indexOf(tile);
              if (idx !== -1) tiles.splice(idx, 1);
            }
          }
        }
      }

      // Animate clearing these tiles
      await this.animateCelebrationClear(tilesToClear);

      // Small delay before next explosion
      if (i < explosionCount - 1) {
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
