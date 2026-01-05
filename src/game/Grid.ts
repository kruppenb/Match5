import { CONFIG } from '../config';
import { Cell, Tile, Position, Obstacle, ObstacleType, PowerupType } from '../types';
import {
  createGrass,
  createIce,
  createChain,
  createBox,
  createStone,
  createBarrel,
  createIceBucket,
  canTileMove as obstacleCanTileMove,
  blocksTile,
  clearedByAdjacent,
  damageObstacle,
} from './Obstacle';

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
    // 'G' = grass obstacle underneath (random tile on top) - 1 layer
    // 'g' = double grass (2 layers, needs 2 matches to clear)
    // 'X' = blocked cell (no tile)
    // 'R' = pre-placed horizontal rocket
    // 'V' = pre-placed vertical rocket
    // 'B' = pre-placed bomb
    // 'C' = pre-placed color bomb
    // 'P' = pre-placed propeller
    // 'I' = ice obstacle (always 2 layers) with random tile
    // 'D' = (legacy) same as 'I' - ice is always 2 layers
    // 'H' = chain obstacle with random tile (locks tile)
    // 'O' = box obstacle (1 layer, no tile)
    // '2' = box obstacle (2 layers, no tile)
    // '3' = box obstacle (3 layers, no tile)
    // 'S' = stone obstacle (permanent blocker, no tile)
    // 'L' = barrel obstacle (1 layer, explodes on destruction)
    // 'M' = barrel obstacle (2 layers, explodes on destruction)
    // 'K' = ice bucket obstacle (spawns ice on adjacent cells when destroyed)
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
            cell.obstacle = createGrass(1);
            cell.tile = this.createRandomTile(row, col);
            break;
          case 'g':
            // Double grass (2 layers, needs 2 matches to clear)
            cell.blocked = false;
            cell.obstacle = createGrass(2);
            cell.tile = this.createRandomTile(row, col);
            break;
          case 'I':
            // Single layer ice block (no tile underneath)
            cell.blocked = false;
            cell.obstacle = createIce(1);
            cell.tile = null;
            break;
          case 'D':
            // Double layer ice block (no tile underneath)
            cell.blocked = false;
            cell.obstacle = createIce(2);
            cell.tile = null;
            break;
          case 'H':
            cell.blocked = false;
            cell.obstacle = createChain();
            cell.tile = this.createRandomTile(row, col);
            break;
          case 'O':
            cell.blocked = false;
            cell.obstacle = createBox(1);
            cell.tile = null; // Box blocks tile
            break;
          case '2':
            cell.blocked = false;
            cell.obstacle = createBox(2);
            cell.tile = null;
            break;
          case '3':
            cell.blocked = false;
            cell.obstacle = createBox(3);
            cell.tile = null;
            break;
          case 'S':
            cell.blocked = false;
            cell.obstacle = createStone();
            cell.tile = null; // Stone blocks tile
            break;
          case 'L':
            cell.blocked = false;
            cell.obstacle = createBarrel(1);
            cell.tile = null; // Barrel blocks tile
            break;
          case 'M':
            cell.blocked = false;
            cell.obstacle = createBarrel(2);
            cell.tile = null; // Double barrel
            break;
          case 'K':
            cell.blocked = false;
            cell.obstacle = createIceBucket();
            cell.tile = null; // Ice bucket blocks tile
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
          case 'P':
            cell.blocked = false;
            cell.obstacle = null;
            cell.tile = this.createPowerupTile(row, col, 'propeller');
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

  // Check if a tile at position can be moved/swapped
  canTileMove(row: number, col: number): boolean {
    const cell = this.getCell(row, col);
    if (!cell || cell.blocked) return false;
    if (!cell.tile) return false;
    return obstacleCanTileMove(cell.obstacle);
  }

  // Check if a swap between two positions is valid
  canSwap(pos1: Position, pos2: Position): boolean {
    return this.canTileMove(pos1.row, pos1.col) && this.canTileMove(pos2.row, pos2.col);
  }

  swapTiles(pos1: Position, pos2: Position): boolean {
    const cell1 = this.getCell(pos1.row, pos1.col);
    const cell2 = this.getCell(pos2.row, pos2.col);

    if (!cell1 || !cell2) return false;

    // Check if both tiles can move (not chained)
    if (!this.canSwap(pos1, pos2)) {
      return false;
    }

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
    return true;
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
        // Don't fill if blocked, has tile, or obstacle blocks tile (box, stone)
        if (cell && !cell.blocked && !cell.tile && !blocksTile(cell.obstacle)) {
          this.setTile(row, col, this.createRandomTile(row, col));
        }
      }
    }
  }

  // Check if a cell can have a tile (not blocked by obstacle)
  canHaveTile(row: number, col: number): boolean {
    const cell = this.getCell(row, col);
    if (!cell || cell.blocked) return false;
    return !blocksTile(cell.obstacle);
  }

  // Damage adjacent obstacles (for boxes)
  // Returns list of damaged obstacles and their positions
  damageAdjacentObstacles(row: number, col: number): { row: number; col: number; obstacle: Obstacle; cleared: boolean }[] {
    const damaged: { row: number; col: number; obstacle: Obstacle; cleared: boolean }[] = [];
    const adjacentOffsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const [dr, dc] of adjacentOffsets) {
      const adjRow = row + dr;
      const adjCol = col + dc;
      const cell = this.getCell(adjRow, adjCol);

      if (cell?.obstacle && clearedByAdjacent(cell.obstacle)) {
        const originalObstacle = { ...cell.obstacle };
        const result = damageObstacle(cell.obstacle);
        const cleared = result === null;
        cell.obstacle = result;
        damaged.push({
          row: adjRow,
          col: adjCol,
          obstacle: originalObstacle,
          cleared,
        });
      }
    }

    return damaged;
  }

  // Get all cells that have obstacles cleared by adjacent matches
  getAdjacentClearableObstacles(): Cell[] {
    const cells: Cell[] = [];
    this.forEachCell(cell => {
      if (cell.obstacle && clearedByAdjacent(cell.obstacle)) {
        cells.push(cell);
      }
    });
    return cells;
  }

  // Get adjacent cells (for barrel explosion, ice bucket, etc.)
  getAdjacentCells(row: number, col: number): Cell[] {
    const cells: Cell[] = [];
    const adjacentOffsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of adjacentOffsets) {
      const cell = this.getCell(row + dr, col + dc);
      if (cell && !cell.blocked) {
        cells.push(cell);
      }
    }
    return cells;
  }

  // Spawn ice on a cell (for ice bucket effect)
  // Only spawns if cell has a tile and no existing obstacle
  spawnIceOnCell(row: number, col: number): { spawned: boolean; replacedTile: boolean } {
    const cell = this.getCell(row, col);
    if (cell && !cell.obstacle && !cell.blocked) {
      const hadTile = cell.tile !== null;
      cell.obstacle = createIce(1);
      cell.tile = null; // Ice blocks now replace tiles
      return { spawned: true, replacedTile: hadTile };
    }
    return { spawned: false, replacedTile: false };
  }

  // Clear a tile at position (for barrel explosion effect)
  // Returns the tile that was cleared, or null
  clearTileAt(row: number, col: number): Tile | null {
    const cell = this.getCell(row, col);
    if (cell && cell.tile && !blocksTile(cell.obstacle)) {
      const tile = cell.tile;
      cell.tile = null;
      return tile;
    }
    return null;
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
