import Phaser from 'phaser';
import { Grid } from '../game/Grid';
import { GameState } from '../game/GameState';
import { BoosterManager } from '../game/BoosterManager';
import { Position, Tile, BoosterType } from '../types';
import { CONFIG } from '../config';
import { ScreenShake } from '../utils/ScreenShake';
import { ParticleManager } from '../utils/ParticleManager';
import { AudioManager } from '../utils/AudioManager';
import { HapticFeedback } from '../utils/HapticFeedback';
import { BoosterBar } from './UIComponents';

export interface BoosterExecutorCallbacks {
  cellToScreen: (row: number, col: number) => { x: number; y: number };
  clearSingleTile: (tile: Tile) => Promise<void>;
  applyGravity: () => Promise<void>;
  processMatches: () => Promise<void>;
  updateObstacleObjectives: (clearedByType: Record<string, number>) => void;
  removeObstacleSprite: (row: number, col: number) => void;
  updateObstacleSprite: (row: number, col: number) => void;
  getTileSprite: (tileId: string) => Phaser.GameObjects.Container | undefined;
  deleteTileSprite: (tileId: string) => void;
  createTileSprite: (tile: Tile) => void;
}

export class BoosterExecutor {
  private scene: Phaser.Scene;
  private grid: Grid;
  private gameState: GameState;
  private boosterManager: BoosterManager;
  private boosterBar: BoosterBar;
  private screenShake: ScreenShake;
  private particleManager: ParticleManager;
  private audioManager: AudioManager;
  private hapticFeedback: HapticFeedback;
  private callbacks: BoosterExecutorCallbacks;
  private tileSprites: Map<string, Phaser.GameObjects.Container>;

  constructor(
    scene: Phaser.Scene,
    grid: Grid,
    gameState: GameState,
    boosterManager: BoosterManager,
    boosterBar: BoosterBar,
    screenShake: ScreenShake,
    particleManager: ParticleManager,
    audioManager: AudioManager,
    hapticFeedback: HapticFeedback,
    tileSprites: Map<string, Phaser.GameObjects.Container>,
    callbacks: BoosterExecutorCallbacks
  ) {
    this.scene = scene;
    this.grid = grid;
    this.gameState = gameState;
    this.boosterManager = boosterManager;
    this.boosterBar = boosterBar;
    this.screenShake = screenShake;
    this.particleManager = particleManager;
    this.audioManager = audioManager;
    this.hapticFeedback = hapticFeedback;
    this.tileSprites = tileSprites;
    this.callbacks = callbacks;
  }

  async execute(type: BoosterType, target?: Position): Promise<boolean> {
    // Check if booster is available
    if (!this.boosterManager.hasBooster(type)) {
      this.boosterBar.cancelActiveBooster();
      this.boosterManager.cancelBooster();
      return false;
    }

    // Use the booster
    this.boosterManager.useBooster(type);
    this.boosterBar.updateInventory(this.boosterManager.getInventory());
    this.boosterBar.cancelActiveBooster();
    this.boosterManager.cancelBooster();

    // Play sound and haptic
    this.audioManager.playPowerupCreate();
    this.hapticFeedback.heavy();

    switch (type) {
      case 'hammer':
        if (target) await this.executeHammer(target);
        break;
      case 'row_arrow':
        if (target) await this.executeRowArrow(target);
        break;
      case 'col_arrow':
        if (target) await this.executeColArrow(target);
        break;
      case 'shuffle':
        await this.executeShuffle();
        break;
    }

    // Process any resulting matches
    await this.callbacks.processMatches();
    return true;
  }

  private async executeHammer(target: Position): Promise<void> {
    const cell = this.grid.getCell(target.row, target.col);
    if (!cell) return;

    const tile = cell.tile;
    const obstacle = cell.obstacle;

    // Must have either a tile or an obstacle to target
    if (!tile && !obstacle) return;

    // Play animation
    const pos = this.callbacks.cellToScreen(target.row, target.col);
    this.screenShake.shake(3, 100);

    // Emit particles based on what we're smashing
    if (tile) {
      this.particleManager.emitMatchParticles(pos.x, pos.y, CONFIG.COLORS[tile.type as keyof typeof CONFIG.COLORS] || 0xffffff, 12);
    } else {
      // Obstacle-only cell (ice, box, etc.) - use white/blue particles
      this.particleManager.emitMatchParticles(pos.x, pos.y, 0x88ccff, 12);
    }

    // Damage obstacle (1 layer)
    if (obstacle) {
      const clearedObstacle = this.grid.clearObstacle(target.row, target.col);
      if (clearedObstacle) {
        // Fully destroyed
        this.callbacks.removeObstacleSprite(target.row, target.col);
        this.callbacks.updateObstacleObjectives({ [clearedObstacle.type]: 1 });
      } else if (cell.obstacle) {
        // Just damaged, update sprite to show reduced layers
        this.callbacks.updateObstacleSprite(target.row, target.col);
      }
    }

    // Clear the tile if present
    if (tile) {
      await this.callbacks.clearSingleTile(tile);
    }

    // Apply gravity
    await this.callbacks.applyGravity();
  }

  private async executeRowArrow(target: Position): Promise<void> {
    const tilesToClear: Tile[] = [];
    const positions: Position[] = [];

    for (let col = 0; col < this.grid.cols; col++) {
      positions.push({ row: target.row, col });
      const tile = this.grid.getTile(target.row, col);
      if (tile) tilesToClear.push(tile);
    }

    // Play row clear animation
    this.screenShake.shake(5, 150);

    // Emit particles along the row
    for (const pos of positions) {
      const screenPos = this.callbacks.cellToScreen(pos.row, pos.col);
      const cell = this.grid.getCell(pos.row, pos.col);
      const tile = cell?.tile;
      if (tile) {
        this.particleManager.emitMatchParticles(screenPos.x, screenPos.y, CONFIG.COLORS[tile.type as keyof typeof CONFIG.COLORS] || 0xffffff, 6);
      } else if (cell?.obstacle) {
        // Obstacle-only cell - emit ice-blue particles
        this.particleManager.emitMatchParticles(screenPos.x, screenPos.y, 0x88ccff, 6);
      }
    }

    // Clear obstacles and tiles
    await this.clearBoosterTargets(positions, tilesToClear);

    // Apply gravity
    await this.callbacks.applyGravity();
  }

  private async executeColArrow(target: Position): Promise<void> {
    const tilesToClear: Tile[] = [];
    const positions: Position[] = [];

    for (let row = 0; row < this.grid.rows; row++) {
      positions.push({ row, col: target.col });
      const tile = this.grid.getTile(row, target.col);
      if (tile) tilesToClear.push(tile);
    }

    // Play column clear animation
    this.screenShake.shake(5, 150);

    // Emit particles along the column
    for (const pos of positions) {
      const screenPos = this.callbacks.cellToScreen(pos.row, pos.col);
      const cell = this.grid.getCell(pos.row, pos.col);
      const tile = cell?.tile;
      if (tile) {
        this.particleManager.emitMatchParticles(screenPos.x, screenPos.y, CONFIG.COLORS[tile.type as keyof typeof CONFIG.COLORS] || 0xffffff, 6);
      } else if (cell?.obstacle) {
        // Obstacle-only cell - emit ice-blue particles
        this.particleManager.emitMatchParticles(screenPos.x, screenPos.y, 0x88ccff, 6);
      }
    }

    // Clear obstacles and tiles
    await this.clearBoosterTargets(positions, tilesToClear);

    // Apply gravity
    await this.callbacks.applyGravity();
  }

  private async executeShuffle(): Promise<void> {
    // Collect all tiles and their positions
    const tileData: { tile: Tile; row: number; col: number }[] = [];
    this.grid.forEachCell((cell) => {
      if (cell.tile && !cell.blocked) {
        tileData.push({ tile: cell.tile, row: cell.row, col: cell.col });
      }
    });

    if (tileData.length < 2) return;

    // Create 67 overlay animation
    const overlay = this.create67Overlay();

    // Store original positions for animation
    const originalPositions = new Map<string, { x: number; y: number }>();
    tileData.forEach(({ tile }) => {
      const sprite = this.tileSprites.get(tile.id);
      if (sprite) {
        originalPositions.set(tile.id, { x: sprite.x, y: sprite.y });
      }
    });

    // Phase 1: Animate tiles flying to center chaos
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;
    const flyToCenter: Promise<void>[] = [];

    tileData.forEach(({ tile }, index) => {
      const sprite = this.tileSprites.get(tile.id);
      if (sprite) {
        const angle = (index / tileData.length) * Math.PI * 2;
        const radius = 50 + Math.random() * 30;
        const targetX = centerX + Math.cos(angle) * radius;
        const targetY = centerY + Math.sin(angle) * radius;

        flyToCenter.push(
          new Promise(resolve => {
            this.scene.tweens.add({
              targets: sprite,
              x: targetX,
              y: targetY,
              scale: 0.6,
              angle: Math.random() * 360,
              duration: 300,
              ease: 'Cubic.easeIn',
              onComplete: () => resolve(),
            });
          })
        );
      }
    });

    await Promise.all(flyToCenter);

    // Phase 2: Spin around center while shuffling
    const spinDuration = 500;
    const spinPromises: Promise<void>[] = [];

    tileData.forEach(({ tile }) => {
      const sprite = this.tileSprites.get(tile.id);
      if (sprite) {
        spinPromises.push(
          new Promise(resolve => {
            this.scene.tweens.add({
              targets: sprite,
              angle: sprite.angle + 720,
              duration: spinDuration,
              ease: 'Linear',
              onComplete: () => resolve(),
            });
          })
        );
      }
    });

    // Wait for spin
    await Promise.all(spinPromises);

    // Shuffle tile positions (not types - we swap actual grid positions)
    const shuffledPositions = [...tileData];
    for (let i = shuffledPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      // Swap the row/col assignments
      const tempRow = shuffledPositions[i].row;
      const tempCol = shuffledPositions[i].col;
      shuffledPositions[i].row = shuffledPositions[j].row;
      shuffledPositions[i].col = shuffledPositions[j].col;
      shuffledPositions[j].row = tempRow;
      shuffledPositions[j].col = tempCol;
    }

    // Update grid with new positions
    // First clear all tile positions
    tileData.forEach(({ tile }) => {
      this.grid.setTile(tile.row, tile.col, null);
    });

    // Then set new positions
    shuffledPositions.forEach(({ tile, row, col }) => {
      tile.row = row;
      tile.col = col;
      this.grid.setTile(row, col, tile);
    });

    // Remove initial matches - this may replace some tiles with new ones
    // Track which tile IDs existed before so we know which are new
    const existingTileIds = new Set<string>();
    this.tileSprites.forEach((_, tileId) => existingTileIds.add(tileId));
    
    this.removeInitialMatches();

    // Phase 3: Animate tiles flying back to their new positions
    const flyBack: Promise<void>[] = [];

    this.grid.forEachCell((cell) => {
      if (cell.tile) {
        const sprite = this.tileSprites.get(cell.tile.id);
        if (sprite) {
          // Existing tile - animate it to its new position
          const targetPos = this.callbacks.cellToScreen(cell.row, cell.col);

          flyBack.push(
            new Promise(resolve => {
              this.scene.tweens.add({
                targets: sprite,
                x: targetPos.x,
                y: targetPos.y,
                scale: 1,
                angle: 0,
                duration: 300,
                ease: 'Cubic.easeOut',
                onComplete: () => resolve(),
              });
            })
          );
        } else if (!existingTileIds.has(cell.tile.id)) {
          // New tile created by removeInitialMatches - create sprite at center, then animate out
          const centerX = this.scene.scale.width / 2;
          const centerY = this.scene.scale.height / 2;
          
          // Create the sprite at center position first
          this.callbacks.createTileSprite(cell.tile);
          const newSprite = this.tileSprites.get(cell.tile.id);
          
          if (newSprite) {
            // Position at center with small scale
            newSprite.setPosition(centerX, centerY);
            newSprite.setScale(0.6);
            newSprite.setAngle(Math.random() * 360);
            
            const targetPos = this.callbacks.cellToScreen(cell.row, cell.col);
            
            flyBack.push(
              new Promise(resolve => {
                this.scene.tweens.add({
                  targets: newSprite,
                  x: targetPos.x,
                  y: targetPos.y,
                  scale: 1,
                  angle: 0,
                  duration: 300,
                  ease: 'Cubic.easeOut',
                  onComplete: () => resolve(),
                });
              })
            );
          }
        }
      }
    });

    await Promise.all(flyBack);

    // Small delay to ensure all animations are fully complete
    await this.wait(50);

    // Kill ALL tweens on ALL tracked sprites and destroy them
    // This ensures no animation artifacts remain
    const spritesToDestroy = Array.from(this.tileSprites.entries());
    for (const [tileId, sprite] of spritesToDestroy) {
      this.scene.tweens.killTweensOf(sprite);
      sprite.destroy(true);
      this.tileSprites.delete(tileId);
    }

    // Now recreate all sprites fresh at their correct positions
    this.grid.forEachCell((cell) => {
      if (cell.tile) {
        this.callbacks.createTileSprite(cell.tile);
      }
    });

    // Remove 67 overlay with fade
    this.remove67Overlay(overlay);
  }

  private removeInitialMatches(): void {
    // Import MatchDetector dynamically to avoid circular deps
    const { MatchDetector } = require('../game/MatchDetector');
    const matchDetector = new MatchDetector();

    let attempts = 0;
    while (attempts < 100) {
      const matches = matchDetector.findAllMatches(this.grid);
      if (matches.length === 0) break;

      // Replace matched tiles with new random ones
      matches.forEach((match: any) => {
        match.tiles.forEach((tile: Tile) => {
          const newTile = this.grid.createRandomTile(tile.row, tile.col);
          this.grid.setTile(tile.row, tile.col, newTile);
        });
      });

      attempts++;
    }
  }

  private async clearBoosterTargets(positions: Position[], tilesToClear: Tile[]): Promise<void> {
    // Track obstacles cleared
    const obstaclesClearedByType: Record<string, number> = {};

    // Damage obstacles at all positions (1 layer each)
    for (const pos of positions) {
      const cell = this.grid.getCell(pos.row, pos.col);
      if (!cell?.obstacle) continue;

      const clearedObstacle = this.grid.clearObstacle(pos.row, pos.col);
      if (clearedObstacle) {
        // Fully destroyed
        obstaclesClearedByType[clearedObstacle.type] = (obstaclesClearedByType[clearedObstacle.type] || 0) + 1;
        this.callbacks.removeObstacleSprite(pos.row, pos.col);
      } else if (cell.obstacle) {
        // Just damaged, update sprite to show reduced layers
        this.callbacks.updateObstacleSprite(pos.row, pos.col);
      }
    }

    // Update objectives
    this.callbacks.updateObstacleObjectives(obstaclesClearedByType);

    // Add score
    this.gameState.addMatchScore(tilesToClear.length, false);

    // Clear tiles with animation
    const promises: Promise<void>[] = [];
    for (const tile of tilesToClear) {
      const sprite = this.tileSprites.get(tile.id);
      if (sprite) {
        promises.push(
          new Promise(resolve => {
            this.scene.tweens.add({
              targets: sprite,
              alpha: 0,
              scale: 0,
              duration: CONFIG.TIMING.CLEAR_DURATION,
              ease: 'Back.easeIn',
              onComplete: () => {
                sprite.destroy();
                this.tileSprites.delete(tile.id);
                resolve();
              },
            });
          })
        );
      }
      this.grid.setTile(tile.row, tile.col, null);
    }

    await Promise.all(promises);
  }

  private create67Overlay(): Phaser.GameObjects.Container {
    const { width, height } = this.scene.scale;
    const container = this.scene.add.container(width / 2, height / 2);
    container.setDepth(500);

    // Semi-transparent background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.3);
    bg.fillRect(-width / 2, -height / 2, width, height);
    container.add(bg);

    // Create the 6
    const six = this.scene.add.text(-60, 0, '6', {
      fontSize: '120px',
      fontStyle: 'bold',
      color: '#ff6b6b',
      stroke: '#ffffff',
      strokeThickness: 4,
    }).setOrigin(0.5);
    container.add(six);

    // Create the 7
    const seven = this.scene.add.text(60, 0, '7', {
      fontSize: '120px',
      fontStyle: 'bold',
      color: '#4ecdc4',
      stroke: '#ffffff',
      strokeThickness: 4,
    }).setOrigin(0.5);
    container.add(seven);

    // Store tweens on the container so we can kill them later
    const tweens: Phaser.Tweens.Tween[] = [];

    // Animate 6 bouncing
    tweens.push(this.scene.tweens.add({
      targets: six,
      y: -20,
      duration: 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    }));

    // Animate 7 bouncing (offset timing)
    tweens.push(this.scene.tweens.add({
      targets: seven,
      y: -20,
      duration: 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 100,
    }));

    // Store tweens on container for cleanup
    container.setData('tweens', tweens);

    // Scale in animation
    container.setScale(0);
    this.scene.tweens.add({
      targets: container,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    return container;
  }

  private remove67Overlay(container: Phaser.GameObjects.Container): void {
    // Kill all stored tweens first
    const tweens = container.getData('tweens') as Phaser.Tweens.Tween[] | undefined;
    if (tweens) {
      tweens.forEach(tween => {
        if (tween && tween.isPlaying()) {
          tween.stop();
        }
      });
    }

    // Kill any tweens on children
    container.each((child: Phaser.GameObjects.GameObject) => {
      this.scene.tweens.killTweensOf(child);
    });

    this.scene.tweens.add({
      targets: container,
      scale: 0,
      alpha: 0,
      duration: 200,
      ease: 'Back.easeIn',
      onComplete: () => {
        // Destroy with all children
        container.destroy(true);
      },
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
