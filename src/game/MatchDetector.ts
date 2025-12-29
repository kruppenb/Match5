import { Grid } from './Grid';
import { Match, Tile, Position } from '../types';
import { CONFIG } from '../config';

export class MatchDetector {
  findAllMatches(grid: Grid): Match[] {
    // First, find 2x2 square matches (creates propeller)
    const squareMatches = this.findSquareMatches(grid);

    // Get tiles that are part of square matches to exclude from line detection
    const squareTileIds = new Set<string>();
    squareMatches.forEach(m => m.tiles.forEach(t => squareTileIds.add(t.id)));

    const horizontalMatches = this.findHorizontalMatches(grid, squareTileIds);
    const verticalMatches = this.findVerticalMatches(grid, squareTileIds);

    // Merge overlapping matches to detect L/T shapes
    const mergedMatches = this.mergeMatches(grid, horizontalMatches, verticalMatches);

    // Combine square matches with line matches
    return [...squareMatches, ...mergedMatches];
  }

  private findSquareMatches(grid: Grid): Match[] {
    const matches: Match[] = [];
    const usedPositions = new Set<string>();

    // Scan for 2x2 squares (check each position as top-left corner)
    for (let row = 0; row < grid.rows - 1; row++) {
      for (let col = 0; col < grid.cols - 1; col++) {
        const posKey = `${row},${col}`;
        if (usedPositions.has(posKey)) continue;

        const topLeft = grid.getTile(row, col);
        const topRight = grid.getTile(row, col + 1);
        const bottomLeft = grid.getTile(row + 1, col);
        const bottomRight = grid.getTile(row + 1, col + 1);

        // Check all 4 tiles exist, same type, not powerups
        if (topLeft && topRight && bottomLeft && bottomRight &&
            !topLeft.isPowerup && !topRight.isPowerup &&
            !bottomLeft.isPowerup && !bottomRight.isPowerup &&
            topLeft.type === topRight.type &&
            topLeft.type === bottomLeft.type &&
            topLeft.type === bottomRight.type) {

          const tiles = [topLeft, topRight, bottomLeft, bottomRight];

          // Mark positions as used to prevent overlapping squares
          usedPositions.add(`${row},${col}`);
          usedPositions.add(`${row},${col + 1}`);
          usedPositions.add(`${row + 1},${col}`);
          usedPositions.add(`${row + 1},${col + 1}`);

          matches.push({
            tiles,
            type: 'square',
            powerupType: 'propeller',
            powerupPosition: { row, col }, // Top-left position
          });
        }
      }
    }

    return matches;
  }

  private findHorizontalMatches(grid: Grid, excludeTileIds: Set<string> = new Set()): Match[] {
    const matches: Match[] = [];

    for (let row = 0; row < grid.rows; row++) {
      let matchStart = 0;

      for (let col = 1; col <= grid.cols; col++) {
        const currentTile = grid.getTile(row, col);
        const startTile = grid.getTile(row, matchStart);

        // Skip tiles that are part of square matches
        const currentExcluded = currentTile && excludeTileIds.has(currentTile.id);
        const startExcluded = startTile && excludeTileIds.has(startTile.id);

        const sameType = currentTile && startTile &&
                        currentTile.type === startTile.type &&
                        !currentTile.isPowerup && !startTile.isPowerup &&
                        !currentExcluded && !startExcluded;

        if (col < grid.cols && sameType) {
          continue; // Extend match
        }

        // Match ended, check if valid
        const matchLength = col - matchStart;
        if (matchLength >= CONFIG.MATCH.MIN_MATCH) {
          const tiles: Tile[] = [];
          for (let c = matchStart; c < col; c++) {
            const tile = grid.getTile(row, c);
            if (tile && !excludeTileIds.has(tile.id)) tiles.push(tile);
          }
          if (tiles.length >= CONFIG.MATCH.MIN_MATCH) {
            matches.push({
              tiles,
              type: 'horizontal',
            });
          }
        }

        matchStart = col;
      }
    }

    return matches;
  }

  private findVerticalMatches(grid: Grid, excludeTileIds: Set<string> = new Set()): Match[] {
    const matches: Match[] = [];

    for (let col = 0; col < grid.cols; col++) {
      let matchStart = 0;

      for (let row = 1; row <= grid.rows; row++) {
        const currentTile = grid.getTile(row, col);
        const startTile = grid.getTile(matchStart, col);

        // Skip tiles that are part of square matches
        const currentExcluded = currentTile && excludeTileIds.has(currentTile.id);
        const startExcluded = startTile && excludeTileIds.has(startTile.id);

        const sameType = currentTile && startTile &&
                        currentTile.type === startTile.type &&
                        !currentTile.isPowerup && !startTile.isPowerup &&
                        !currentExcluded && !startExcluded;

        if (row < grid.rows && sameType) {
          continue;
        }

        const matchLength = row - matchStart;
        if (matchLength >= CONFIG.MATCH.MIN_MATCH) {
          const tiles: Tile[] = [];
          for (let r = matchStart; r < row; r++) {
            const tile = grid.getTile(r, col);
            if (tile && !excludeTileIds.has(tile.id)) tiles.push(tile);
          }
          if (tiles.length >= CONFIG.MATCH.MIN_MATCH) {
            matches.push({
              tiles,
              type: 'vertical',
            });
          }
        }

        matchStart = row;
      }
    }

    return matches;
  }

  private mergeMatches(grid: Grid, horizontal: Match[], vertical: Match[]): Match[] {
    const allMatches = [...horizontal, ...vertical];
    const merged: Match[] = [];
    const processed = new Set<string>();

    for (const match of allMatches) {
      // Get unique key for this match
      const key = match.tiles.map(t => t.id).sort().join(',');
      
      if (processed.has(key)) continue;

      // Check if any tile in this match overlaps with other matches
      const overlapping = allMatches.filter(other => 
        other !== match && 
        match.tiles.some(t => other.tiles.some(ot => ot.id === t.id))
      );

      if (overlapping.length > 0) {
        // Combine all overlapping matches
        const combinedTiles = new Set<Tile>();
        match.tiles.forEach(t => combinedTiles.add(t));
        overlapping.forEach(o => o.tiles.forEach(t => combinedTiles.add(t)));

        const allKeys = Array.from(combinedTiles).map(t => t.id).sort().join(',');
        if (processed.has(allKeys)) continue;
        
        processed.add(allKeys);

        const mergedMatch = this.classifyMatch(grid, Array.from(combinedTiles));
        merged.push(mergedMatch);
      } else {
        processed.add(key);
        merged.push(this.classifyMatch(grid, match.tiles));
      }
    }

    return merged;
  }

  private classifyMatch(_grid: Grid, tiles: Tile[]): Match {
    if (tiles.length === 0) {
      return { tiles, type: 'horizontal' };
    }

    // Analyze shape
    const rows = new Set(tiles.map(t => t.row));
    const cols = new Set(tiles.map(t => t.col));

    // Linear matches
    if (rows.size === 1) {
      // Horizontal line
      if (tiles.length >= CONFIG.MATCH.COLOR_BOMB_MATCH) {
        return {
          tiles,
          type: 'horizontal',
          powerupType: 'color_bomb',
          powerupPosition: this.getMatchCenter(tiles),
        };
      } else if (tiles.length === CONFIG.MATCH.ROCKET_MATCH) {
        return {
          tiles,
          type: 'horizontal',
          powerupType: 'rocket_h',
          powerupPosition: this.getMatchCenter(tiles),
        };
      }
      return { tiles, type: 'horizontal' };
    }

    if (cols.size === 1) {
      // Vertical line
      if (tiles.length >= CONFIG.MATCH.COLOR_BOMB_MATCH) {
        return {
          tiles,
          type: 'vertical',
          powerupType: 'color_bomb',
          powerupPosition: this.getMatchCenter(tiles),
        };
      } else if (tiles.length === CONFIG.MATCH.ROCKET_MATCH) {
        return {
          tiles,
          type: 'vertical',
          powerupType: 'rocket_v',
          powerupPosition: this.getMatchCenter(tiles),
        };
      }
      return { tiles, type: 'vertical' };
    }

    // L or T shape (multiple rows and columns)
    if (tiles.length >= CONFIG.MATCH.BOMB_SHAPE_MATCH) {
      return {
        tiles,
        type: rows.size === 2 ? 'L' : 'T',
        powerupType: 'bomb',
        powerupPosition: this.getIntersectionPoint(tiles),
      };
    }

    return { tiles, type: 'horizontal' };
  }

  private getMatchCenter(tiles: Tile[]): Position {
    const rows = tiles.map(t => t.row);
    const cols = tiles.map(t => t.col);

    return {
      row: Math.floor((Math.min(...rows) + Math.max(...rows)) / 2),
      col: Math.floor((Math.min(...cols) + Math.max(...cols)) / 2),
    };
  }

  private getIntersectionPoint(tiles: Tile[]): Position {
    // For L/T shapes, find the tile that appears in both horizontal and vertical parts
    const rowCounts = new Map<number, number>();
    const colCounts = new Map<number, number>();

    tiles.forEach(t => {
      rowCounts.set(t.row, (rowCounts.get(t.row) || 0) + 1);
      colCounts.set(t.col, (colCounts.get(t.col) || 0) + 1);
    });

    // Find row and col with most tiles (intersection)
    let maxRow = 0, maxRowCount = 0;
    let maxCol = 0, maxColCount = 0;

    rowCounts.forEach((count, row) => {
      if (count > maxRowCount) {
        maxRowCount = count;
        maxRow = row;
      }
    });

    colCounts.forEach((count, col) => {
      if (count > maxColCount) {
        maxColCount = count;
        maxCol = col;
      }
    });

    return { row: maxRow, col: maxCol };
  }
}
