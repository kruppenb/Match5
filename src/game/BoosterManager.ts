import { BoosterType, BoosterInventory, Position, Tile } from '../types';
import { CONFIG } from '../config';
import { Grid } from './Grid';

export class BoosterManager {
  private inventory: BoosterInventory;
  private activeBooster: BoosterType | null = null;

  constructor() {
    this.inventory = this.createStartingInventory();
  }

  private createStartingInventory(): BoosterInventory {
    const count = CONFIG.BOOSTERS.STARTING_COUNT;
    return {
      hammer: count,
      row_arrow: count,
      col_arrow: count,
      shuffle: count,
    };
  }

  reset(): void {
    this.inventory = this.createStartingInventory();
    this.activeBooster = null;
  }

  getInventory(): BoosterInventory {
    return { ...this.inventory };
  }

  getCount(type: BoosterType): number {
    return this.inventory[type];
  }

  hasBooster(type: BoosterType): boolean {
    return this.inventory[type] > 0;
  }

  useBooster(type: BoosterType): boolean {
    if (!this.hasBooster(type)) {
      return false;
    }
    this.inventory[type]--;
    return true;
  }

  getActiveBooster(): BoosterType | null {
    return this.activeBooster;
  }

  setActiveBooster(type: BoosterType | null): void {
    this.activeBooster = type;
  }

  isBoosterActive(): boolean {
    return this.activeBooster !== null;
  }

  cancelBooster(): void {
    this.activeBooster = null;
  }

  requiresTarget(type: BoosterType): boolean {
    return CONFIG.BOOSTERS.CONFIGS[type]?.requiresTarget ?? false;
  }

  getAffectedTiles(type: BoosterType, grid: Grid, target?: Position): Tile[] {
    const tiles: Tile[] = [];

    switch (type) {
      case 'hammer':
        if (target) {
          const tile = grid.getTile(target.row, target.col);
          if (tile) {
            tiles.push(tile);
          }
        }
        break;

      case 'row_arrow':
        if (target) {
          for (let col = 0; col < grid.cols; col++) {
            const tile = grid.getTile(target.row, col);
            if (tile) {
              tiles.push(tile);
            }
          }
        }
        break;

      case 'col_arrow':
        if (target) {
          for (let row = 0; row < grid.rows; row++) {
            const tile = grid.getTile(row, target.col);
            if (tile) {
              tiles.push(tile);
            }
          }
        }
        break;

      case 'shuffle':
        // Shuffle affects all tiles but doesn't clear them
        grid.forEachCell((cell) => {
          if (cell.tile) {
            tiles.push(cell.tile);
          }
        });
        break;
    }

    return tiles;
  }

  getAffectedPositions(type: BoosterType, grid: Grid, target?: Position): Position[] {
    const positions: Position[] = [];

    switch (type) {
      case 'hammer':
        if (target) {
          positions.push({ row: target.row, col: target.col });
        }
        break;

      case 'row_arrow':
        if (target) {
          for (let col = 0; col < grid.cols; col++) {
            positions.push({ row: target.row, col });
          }
        }
        break;

      case 'col_arrow':
        if (target) {
          for (let row = 0; row < grid.rows; row++) {
            positions.push({ row, col: target.col });
          }
        }
        break;

      case 'shuffle':
        // Shuffle doesn't have specific positions
        break;
    }

    return positions;
  }
}
