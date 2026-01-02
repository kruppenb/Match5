import Phaser from 'phaser';
import { Grid } from './Grid';
import { GameState } from './GameState';
import { Tile, Cell } from '../types';

export interface ObstacleProcessorCallbacks {
  cellToScreen: (row: number, col: number) => { x: number; y: number };
  removeObstacleSprite: (row: number, col: number) => void;
  updateObstacleSprite: (row: number, col: number) => void;
  createObstacleSprite: (cell: Cell) => void;
  getTileSprite: (tileId: string) => Phaser.GameObjects.Container | undefined;
  deleteTileSprite: (tileId: string) => void;
  killTweensOf: (target: any) => void;
}

/**
 * Handles special obstacle effects like barrel explosions and ice bucket spawning
 */
export class SpecialObstacleProcessor {
  private scene: Phaser.Scene;
  private grid: Grid;
  private gameState: GameState;
  private tileSize: number;
  private callbacks: ObstacleProcessorCallbacks;

  constructor(
    scene: Phaser.Scene,
    grid: Grid,
    gameState: GameState,
    tileSize: number,
    callbacks: ObstacleProcessorCallbacks
  ) {
    this.scene = scene;
    this.grid = grid;
    this.gameState = gameState;
    this.tileSize = tileSize;
    this.callbacks = callbacks;
  }

  /**
   * Process special effects when barrel or ice_bucket are destroyed
   */
  processSpecialObstacleEffects(
    clearedObstacles: { row: number; col: number; type: string }[],
    tilesToClear: Set<Tile>
  ): void {
    for (const obs of clearedObstacles) {
      if (obs.type === 'barrel') {
        this.processBarrelExplosion(obs.row, obs.col, tilesToClear);
      } else if (obs.type === 'ice_bucket') {
        this.processIceBucketEffect(obs.row, obs.col);
      }
    }
  }

  /**
   * Barrel explodes and clears adjacent tiles + damages obstacles
   */
  private processBarrelExplosion(row: number, col: number, tilesToClear: Set<Tile>): void {
    const adjacentCells = this.grid.getAdjacentCells(row, col);

    for (const cell of adjacentCells) {
      // Clear tile if exists
      if (cell.tile && !tilesToClear.has(cell.tile)) {
        tilesToClear.add(cell.tile);
      }

      // Damage obstacle if exists
      if (cell.obstacle) {
        const damaged = this.grid.damageAdjacentObstacles(row, col);
        damaged.forEach(d => {
          if (d.cleared) {
            this.callbacks.removeObstacleSprite(d.row, d.col);
          } else {
            this.callbacks.updateObstacleSprite(d.row, d.col);
          }
        });
      }
    }

    // Visual explosion effect
    const pos = this.callbacks.cellToScreen(row, col);
    this.createExplosionEffect(pos.x, pos.y);
  }

  /**
   * Ice bucket spawns ice on adjacent cells (replaces tiles with ice blocks)
   */
  private processIceBucketEffect(row: number, col: number): void {
    const adjacentCells = this.grid.getAdjacentCells(row, col);

    for (const cell of adjacentCells) {
      // Get the tile before spawning ice (to remove its sprite)
      const existingTile = this.grid.getTile(cell.row, cell.col);

      // Spawn ice (replaces any tile in the cell)
      const result = this.grid.spawnIceOnCell(cell.row, cell.col);
      if (result.spawned) {
        // Remove the tile sprite if there was one
        if (existingTile) {
          const tileSprite = this.callbacks.getTileSprite(existingTile.id);
          if (tileSprite) {
            this.callbacks.killTweensOf(tileSprite);
            tileSprite.destroy(true);
            this.callbacks.deleteTileSprite(existingTile.id);
          }
        }

        // Refresh the cell reference since tile was removed
        const updatedCell = this.grid.getCell(cell.row, cell.col);
        if (updatedCell) {
          // Create ice sprite for the new obstacle
          this.callbacks.createObstacleSprite(updatedCell);
        }

        // Visual frost effect
        const pos = this.callbacks.cellToScreen(cell.row, cell.col);
        this.createFrostEffect(pos.x, pos.y);
      }
    }
  }

  /**
   * Visual explosion effect for barrel
   */
  private createExplosionEffect(x: number, y: number): void {
    // Orange/red explosion particles
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const particle = this.scene.add.circle(x, y, 8, 0xff6600);
      particle.setDepth(10);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * this.tileSize * 0.8,
        y: y + Math.sin(angle) * this.tileSize * 0.8,
        alpha: 0,
        scale: 0.3,
        duration: 300,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }

    // Central flash
    const flash = this.scene.add.circle(x, y, this.tileSize * 0.6, 0xffff00, 0.8);
    flash.setDepth(10);
    this.scene.tweens.add({
      targets: flash,
      scale: 1.5,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy(),
    });
  }

  /**
   * Visual frost effect for ice bucket
   */
  private createFrostEffect(x: number, y: number): void {
    // Blue frost particles
    for (let i = 0; i < 6; i++) {
      const offsetX = (Math.random() - 0.5) * this.tileSize * 0.6;
      const offsetY = (Math.random() - 0.5) * this.tileSize * 0.6;
      const particle = this.scene.add.circle(x + offsetX, y + offsetY, 4, 0x88ddff);
      particle.setDepth(10);

      this.scene.tweens.add({
        targets: particle,
        y: particle.y - 20,
        alpha: 0,
        scale: 0.5,
        duration: 400,
        ease: 'Power1',
        onComplete: () => particle.destroy(),
      });
    }
  }

  /**
   * Update objectives based on cleared obstacle types
   */
  updateObstacleObjectives(clearedByType: Record<string, number>): void {
    const tracker = this.gameState.getObjectiveTracker();

    if (clearedByType['grass']) {
      tracker.onGrassCleared(clearedByType['grass']);
    }
    if (clearedByType['ice']) {
      tracker.onIceCleared(clearedByType['ice']);
    }
    if (clearedByType['chain']) {
      tracker.onChainCleared(clearedByType['chain']);
    }
    if (clearedByType['box']) {
      tracker.onBoxCleared(clearedByType['box']);
    }
  }
}
