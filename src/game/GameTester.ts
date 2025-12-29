import { Grid } from './Grid';
import { MatchDetector } from './MatchDetector';
import { Position } from '../types';

export class GameTester {
  private grid: Grid;
  private matchDetector: MatchDetector;

  constructor(grid: Grid, matchDetector: MatchDetector) {
    this.grid = grid;
    this.matchDetector = matchDetector;
  }

  validateGrid(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for null tiles where there shouldn't be any
    for (let row = 0; row < this.grid.rows; row++) {
      for (let col = 0; col < this.grid.cols; col++) {
        const cell = this.grid.getCell(row, col);
        if (!cell?.blocked && !cell?.tile) {
          errors.push(`Empty cell at (${row}, ${col})`);
        }
      }
    }

    // Check for tiles with incorrect positions
    this.grid.forEachCell(cell => {
      if (cell.tile && (cell.tile.row !== cell.row || cell.tile.col !== cell.col)) {
        errors.push(
          `Tile ${cell.tile.id} at cell (${cell.row}, ${cell.col}) has incorrect position (${cell.tile.row}, ${cell.tile.col})`
        );
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  findValidMoves(): { from: Position; to: Position }[] {
    const validMoves: { from: Position; to: Position }[] = [];

    for (let row = 0; row < this.grid.rows; row++) {
      for (let col = 0; col < this.grid.cols; col++) {
        const tile = this.grid.getTile(row, col);
        if (!tile) continue;

        // Try all adjacent swaps
        const adjacent = [
          { row: row - 1, col },
          { row: row + 1, col },
          { row, col: col - 1 },
          { row, col: col + 1 },
        ];

        for (const adj of adjacent) {
          const adjTile = this.grid.getTile(adj.row, adj.col);
          if (!adjTile) continue;

          // Temporarily swap
          this.grid.swapTiles({ row, col }, adj);

          // Check for matches
          const matches = this.matchDetector.findAllMatches(this.grid);

          // Swap back
          this.grid.swapTiles({ row, col }, adj);

          if (matches.length > 0) {
            validMoves.push({
              from: { row, col },
              to: adj,
            });
          }
        }
      }
    }

    return validMoves;
  }

  getRandomValidMove(): { from: Position; to: Position } | null {
    const validMoves = this.findValidMoves();
    if (validMoves.length === 0) return null;
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  printGridState(): void {
    console.log('=== Grid State ===');
    for (let row = 0; row < this.grid.rows; row++) {
      let rowStr = '';
      for (let col = 0; col < this.grid.cols; col++) {
        const tile = this.grid.getTile(row, col);
        if (tile) {
          const typeChar = tile.type[0].toUpperCase();
          const powerup = tile.isPowerup ? '*' : ' ';
          rowStr += `[${typeChar}${powerup}] `;
        } else {
          rowStr += '[ ] ';
        }
      }
      console.log(rowStr);
    }
    console.log('==================');
  }

  countTilesByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    this.grid.forEachCell(cell => {
      if (cell.tile) {
        counts[cell.tile.type] = (counts[cell.tile.type] || 0) + 1;
      }
    });
    return counts;
  }
}
