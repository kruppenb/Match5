import Phaser from 'phaser';
import { Grid } from './Grid';
import { blocksTile } from './Obstacle';
import { CONFIG } from '../config';
import { Tile } from '../types';

export interface GravityCallbacks {
  cellToScreen: (row: number, col: number) => { x: number; y: number };
  createTileSprite: (tile: Tile, startRow?: number) => void;
  getTileSprite: (tileId: string) => Phaser.GameObjects.Container | undefined;
}

/**
 * Handles tile gravity - making tiles fall down and spawning new tiles
 */
export class GravitySystem {
  private scene: Phaser.Scene;
  private grid: Grid;
  private callbacks: GravityCallbacks;

  constructor(scene: Phaser.Scene, grid: Grid, callbacks: GravityCallbacks) {
    this.scene = scene;
    this.grid = grid;
    this.callbacks = callbacks;
  }

  /**
   * Apply gravity to all tiles - make them fall and spawn new ones
   */
  async applyGravity(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (let col = 0; col < this.grid.cols; col++) {
      // writeRow tracks where to place the next tile (bottom up)
      let writeRow = this.grid.rows - 1;

      // Find bottom-most non-blocked position
      while (writeRow >= 0) {
        const cell = this.grid.getCell(writeRow, col);
        if (cell?.obstacle && blocksTile(cell.obstacle)) {
          writeRow--;
        } else {
          break;
        }
      }

      // Move existing tiles down to fill gaps
      // Scan from bottom to top, placing each tile at the lowest available position
      for (let readRow = writeRow; readRow >= 0; readRow--) {
        const cell = this.grid.getCell(readRow, col);

        // Skip cells with blocking obstacles
        if (cell?.obstacle && blocksTile(cell.obstacle)) {
          // Encountered a blocker - update writeRow to just above it
          writeRow = readRow - 1;
          continue;
        }

        const tile = this.grid.getTile(readRow, col);
        if (tile) {
          if (readRow !== writeRow) {
            // Tile needs to fall down (readRow is above writeRow)
            this.grid.setTile(writeRow, col, tile);
            this.grid.setTile(readRow, col, null);

            // Create sprite if missing
            if (!this.callbacks.getTileSprite(tile.id)) {
              this.callbacks.createTileSprite(tile, readRow);
            }

            promises.push(this.animateFall(tile, readRow, writeRow));
          } else {
            // Tile staying in place - ensure it has a sprite
            if (!this.callbacks.getTileSprite(tile.id)) {
              this.callbacks.createTileSprite(tile);
            }
          }
          writeRow--;

          // Skip past blocking obstacles for next write position
          while (writeRow >= 0) {
            const nextCell = this.grid.getCell(writeRow, col);
            if (nextCell?.obstacle && blocksTile(nextCell.obstacle)) {
              writeRow--;
            } else {
              break;
            }
          }
        }
      }

      // Spawn new tiles for empty spaces at top
      let spawnOffset = 0;
      for (let targetRow = writeRow; targetRow >= 0; targetRow--) {
        const cell = this.grid.getCell(targetRow, col);
        if (cell?.obstacle && blocksTile(cell.obstacle)) {
          continue; // Don't spawn where there's a blocking obstacle
        }

        if (!cell?.tile) {
          const startRow = -1 - spawnOffset;
          const newTile = this.grid.createRandomTile(targetRow, col);
          this.grid.setTile(targetRow, col, newTile);
          this.callbacks.createTileSprite(newTile, startRow);
          promises.push(this.animateFall(newTile, startRow, targetRow));
          spawnOffset++;
        }
      }
    }

    await Promise.all(promises);
  }

  /**
   * Animate a tile falling from one row to another
   */
  private animateFall(tile: Tile, fromRow: number, toRow: number): Promise<void> {
    const sprite = this.callbacks.getTileSprite(tile.id);
    if (!sprite) return Promise.resolve();

    const targetPos = this.callbacks.cellToScreen(toRow, tile.col);
    const distance = Math.abs(toRow - fromRow);
    const duration = CONFIG.TIMING.FALL_DURATION + (distance * 30);

    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: sprite,
        x: targetPos.x,
        y: targetPos.y,
        duration: duration,
        ease: 'Cubic.easeIn',
        onComplete: () => resolve(),
      });
    });
  }
}
