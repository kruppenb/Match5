import { CONFIG } from '../config';
import { Cell, Tile, Position, Obstacle, ObstacleType, PowerupType } from '../types';
import { createGrass } from './Obstacle';

export class Grid {
  private cells: Cell[][];
  public rows: number;
  public cols: number;
  private tileIdCounter = 0;
  private availableColors: string[] = CONFIG.TILES.COLORS;

  constructor(rows: number = CONFIG.GRID.ROWS, cols: number = CONFIG.GRID.COLS) {
    this.rows = rows;
    this.cols = cols;
    this.cells = this.createEmptyGrid();
  }

  private createEmptyGrid(): Cell[][] {
    const grid: Cell[][] = [];
    for (let row = 0; row < this.rows; row++) {
      grid[row] = [];
      for (let col = 0; col < this.cols; col++) {
        grid[row][col] = {
          row,
          col,
          tile: null,
          blocked: false,
          obstacle: null,
        };
      }
    }
    return grid;
  }

  setAvailableColors(colors: string[]): void {
    this.availableColors = colors;
  }

  getAvailableColors(): string[] {
    return this.availableColors;
  }

  initializeFromLayout(layout: string[][], tileVariety: number): void {
    // Set available colors based on variety
    this.availableColors = CONFIG.TILES.ALL_COLORS.slice(0, tileVariety);

    // Resize grid if needed
    const newRows = layout.length;
    const newCols = layout[0]?.length ?? 0;

    if (newRows !== this.rows || newCols !== this.cols) {
      this.rows = newRows;
      this.cols = newCols;
      this.cells = this.createEmptyGrid();
    }

    // Parse layout codes:
    // '.' = normal cell (random tile)
    // 'G' = grass obstacle underneath (random tile on top)
    // 'X' = blocked cell (no tile)
    // 'R' = pre-placed horizontal rocket
    // 'V' = pre-placed vertical rocket
    // 'B' = pre-placed bomb
    // 'C' = pre-placed color bomb
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const code = layout[row]?.[col] ?? '.';
        const cell = this.cells[row][col];

        switch (code) {
          case 'X':
            cell.blocked = true;
            cell.tile = null;
            cell.obstacle = null;
            break;
          case 'G':
            cell.blocked = false;
            cell.obstacle = createGrass();
            cell.tile = this.createRandomTile(row, col);
            break;
          case 'R':
            cell.blocked = false;
            cell.obstacle = null;
            cell.tile = this.createPowerupTile(row, col, 'rocket_h');
            break;
          case 'V':
            cell.blocked = false;
            cell.obstacle = null;
            cell.tile = this.createPowerupTile(row, col, 'rocket_v');
            break;
          case 'B':
            cell.blocked = false;
            cell.obstacle = null;
            cell.tile = this.createPowerupTile(row, col, 'bomb');
            break;
          case 'C':
            cell.blocked = false;
            cell.obstacle = null;
            cell.tile = this.createPowerupTile(row, col, 'color_bomb');
            break;
          case '.':
          default:
            cell.blocked = false;
            cell.obstacle = null;
            cell.tile = this.createRandomTile(row, col);
            break;
        }
      }
    }
  }

  private createPowerupTile(row: number, col: number, powerupType: PowerupType): Tile {
    const type = this.availableColors[Math.floor(Math.random() * this.availableColors.length)];
    return {
      id: `tile_${this.tileIdCounter++}`,
      type,
      row,
      col,
      isPowerup: true,
      powerupType,
    };
  }

  clearObstacle(row: number, col: number): Obstacle | null {
    const cell = this.getCell(row, col);
    if (cell?.obstacle) {
      cell.obstacle.layers--;
      if (cell.obstacle.layers <= 0) {
        const cleared = { ...cell.obstacle };
        cell.obstacle = null;
        return cleared;
      }
    }
    return null;
  }

  getCellsWithObstacle(type?: ObstacleType): Cell[] {
    const cells: Cell[] = [];
    this.forEachCell(cell => {
      if (cell.obstacle) {
        if (!type || cell.obstacle.type === type) {
          cells.push(cell);
        }
      }
    });
    return cells;
  }

  getObstacleCount(type: ObstacleType): number {
    return this.getCellsWithObstacle(type).length;
  }

  getCell(row: number, col: number): Cell | null {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return null;
    }
    return this.cells[row][col];
  }

  setTile(row: number, col: number, tile: Tile | null): void {
    const cell = this.getCell(row, col);
    if (cell && !cell.blocked) {
      cell.tile = tile;
      if (tile) {
        tile.row = row;
        tile.col = col;
      }
    }
  }

  getTile(row: number, col: number): Tile | null {
    const cell = this.getCell(row, col);
    return cell?.tile ?? null;
  }

  swapTiles(pos1: Position, pos2: Position): void {
    const cell1 = this.getCell(pos1.row, pos1.col);
    const cell2 = this.getCell(pos2.row, pos2.col);

    if (!cell1 || !cell2) return;

    const temp = cell1.tile;
    cell1.tile = cell2.tile;
    cell2.tile = temp;

    if (cell1.tile) {
      cell1.tile.row = cell1.row;
      cell1.tile.col = cell1.col;
    }
    if (cell2.tile) {
      cell2.tile.row = cell2.row;
      cell2.tile.col = cell2.col;
    }
  }

  isAdjacent(pos1: Position, pos2: Position): boolean {
    const rowDiff = Math.abs(pos1.row - pos2.row);
    const colDiff = Math.abs(pos1.col - pos2.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }

  createRandomTile(row: number, col: number): Tile {
    const types = this.availableColors;
    const type = types[Math.floor(Math.random() * types.length)];

    return {
      id: `tile_${this.tileIdCounter++}`,
      type,
      row,
      col,
      isPowerup: false,
    };
  }

  fillGrid(): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cell = this.getCell(row, col);
        if (cell && !cell.blocked && !cell.tile) {
          this.setTile(row, col, this.createRandomTile(row, col));
        }
      }
    }
  }

  forEachCell(callback: (cell: Cell) => void): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        callback(this.cells[row][col]);
      }
    }
  }

  getAllTiles(): Tile[] {
    const tiles: Tile[] = [];
    this.forEachCell(cell => {
      if (cell.tile) tiles.push(cell.tile);
    });
    return tiles;
  }
}
