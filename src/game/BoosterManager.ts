import { BoosterType, BoosterInventory, Position, Tile } from '../types';
import { CONFIG } from '../config';
import { Grid } from './Grid';
import { MetaStorage } from '../storage/MetaStorage';

export class BoosterManager {
  private activeBooster: BoosterType | null = null;

  constructor() {
    // Boosters are loaded from persistent storage - no initialization needed
  }

  reset(): void {
    // Just clear active booster, inventory persists across levels
    this.activeBooster = null;
  }

  getInventory(): BoosterInventory {
    const stored = MetaStorage.getBoosterInventory();
    return {
      hammer: stored.hammer || 0,
      row_arrow: stored.row_arrow || 0,
      col_arrow: stored.col_arrow || 0,
      shuffle: stored.shuffle || 0,
    };
  }

  getCount(type: BoosterType): number {
    return MetaStorage.getBoosterCount(type);
  }

  hasBooster(type: BoosterType): boolean {
    return this.getCount(type) > 0;
  }

  useBooster(type: BoosterType): boolean {
    if (!this.hasBooster(type)) {
      return false;
    }
    return MetaStorage.useBooster(type);
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
