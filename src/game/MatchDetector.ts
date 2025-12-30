import { Grid } from './Grid';
import { Match, Tile, Position } from '../types';
import { CONFIG } from '../config';

export class MatchDetector {
  findAllMatches(grid: Grid): Match[] {
    // Find all horizontal and vertical matches first (don't exclude any tiles)
    const horizontalMatches = this.findHorizontalMatches(grid);
    const verticalMatches = this.findVerticalMatches(grid);

    // Merge overlapping line matches to detect L/T shapes (bombs)
    const mergedLineMatches = this.mergeMatches(grid, horizontalMatches, verticalMatches);

    // Get all tile IDs that are part of line matches (including L/T shapes)
    const lineTileIds = new Set<string>();
    mergedLineMatches.forEach(m => m.tiles.forEach(t => lineTileIds.add(t.id)));

    // Find 2x2 square matches, but only for tiles NOT already in line matches
    // This ensures bombs (L/T shapes) take priority over propellers (squares)
    const squareMatches = this.findSquareMatches(grid, lineTileIds);

    // Combine: line matches first (higher priority), then remaining squares
    return [...mergedLineMatches, ...squareMatches];
  }

  private findSquareMatches(grid: Grid, excludeTileIds: Set<string> = new Set()): Match[] {
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

        // Check all 4 tiles exist, same type, not powerups, and not excluded
        if (topLeft && topRight && bottomLeft && bottomRight &&
            !topLeft.isPowerup && !topRight.isPowerup &&
            !bottomLeft.isPowerup && !bottomRight.isPowerup &&
            !excludeTileIds.has(topLeft.id) && !excludeTileIds.has(topRight.id) &&
            !excludeTileIds.has(bottomLeft.id) && !excludeTileIds.has(bottomRight.id) &&
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

    // Analyze shape - count tiles per row and column
    const rows = new Set(tiles.map(t => t.row));
    const cols = new Set(tiles.map(t => t.col));
    const rowCounts = new Map<number, number>();
    const colCounts = new Map<number, number>();

    tiles.forEach(t => {
      rowCounts.set(t.row, (rowCounts.get(t.row) || 0) + 1);
      colCounts.set(t.col, (colCounts.get(t.col) || 0) + 1);
    });

    // Find the longest line in any single row or column
    const maxInRow = Math.max(...rowCounts.values());
    const maxInCol = Math.max(...colCounts.values());
    const maxLineLength = Math.max(maxInRow, maxInCol);

    // PRIORITY 1: Color bomb (5+ in a single row or column)
    if (maxLineLength >= CONFIG.MATCH.COLOR_BOMB_MATCH) {
      // Find which row/col has the longest line for powerup position
      const isHorizontal = maxInRow >= maxInCol;
      let bestRow = 0, bestCol = 0;

      if (isHorizontal) {
        rowCounts.forEach((count, row) => {
          if (count === maxInRow) bestRow = row;
        });
        const rowTiles = tiles.filter(t => t.row === bestRow);
        bestCol = Math.floor((Math.min(...rowTiles.map(t => t.col)) + Math.max(...rowTiles.map(t => t.col))) / 2);
      } else {
        colCounts.forEach((count, col) => {
          if (count === maxInCol) bestCol = col;
        });
        const colTiles = tiles.filter(t => t.col === bestCol);
        bestRow = Math.floor((Math.min(...colTiles.map(t => t.row)) + Math.max(...colTiles.map(t => t.row))) / 2);
      }

      return {
        tiles,
        type: isHorizontal ? 'horizontal' : 'vertical',
        powerupType: 'color_bomb',
        powerupPosition: { row: bestRow, col: bestCol },
      };
    }

    // Simple linear matches (single row or column)
    if (rows.size === 1) {
      // Horizontal line - rocket for 4
      if (tiles.length === CONFIG.MATCH.ROCKET_MATCH) {
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
      // Vertical line - rocket for 4
      if (tiles.length === CONFIG.MATCH.ROCKET_MATCH) {
        return {
          tiles,
          type: 'vertical',
          powerupType: 'rocket_v',
          powerupPosition: this.getMatchCenter(tiles),
        };
      }
      return { tiles, type: 'vertical' };
    }

    // PRIORITY 2: Bomb (L/T shape with 5+ total tiles)
    if (tiles.length >= CONFIG.MATCH.BOMB_SHAPE_MATCH) {
      return {
        tiles,
        type: rows.size === 2 ? 'L' : 'T',
        powerupType: 'bomb',
        powerupPosition: this.getIntersectionPoint(tiles),
      };
    }

    // PRIORITY 3: Rocket (4 in a row within an L/T shape - pick the longer arm)
    if (maxLineLength === CONFIG.MATCH.ROCKET_MATCH) {
      const isHorizontal = maxInRow >= maxInCol;
      return {
        tiles,
        type: isHorizontal ? 'horizontal' : 'vertical',
        powerupType: isHorizontal ? 'rocket_h' : 'rocket_v',
        powerupPosition: this.getMatchCenter(tiles),
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
