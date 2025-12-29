# Feature: Matching Mechanics

**Phase:** [Phase 1: POC](../phases/phase-1-poc.md)  
**Priority:** Critical  
**Status:** 🔴 Not Started

---

## Overview

The matching system is the core gameplay mechanic. It detects when tiles form valid patterns, clears them, handles cascades, and determines when powerups should be created.

---

## Match Rules

### Basic Matches
- **Minimum**: 3 tiles of same type in a row/column
- **4 in a row**: Creates Rocket powerup
- **5 in a row**: Creates Color Bomb powerup
- **L or T shape**: Creates Bomb powerup

### Match Priority
When multiple match types are possible, prioritize:
1. Color Bomb (5+ in line)
2. Bomb (L/T shape)
3. Rocket (4 in line)
4. Basic match (3 in line)

---

## Match Detection Algorithm

### Step 1: Find All Matches

```typescript
interface Match {
  tiles: Tile[];
  type: 'horizontal' | 'vertical' | 'L' | 'T' | 'complex';
  powerupPosition?: { row: number; col: number };
  powerupType?: 'rocket_h' | 'rocket_v' | 'bomb' | 'color_bomb';
}

class MatchDetector {
  findAllMatches(grid: Grid): Match[] {
    const horizontalMatches = this.findHorizontalMatches(grid);
    const verticalMatches = this.findVerticalMatches(grid);
    
    // Merge overlapping matches to detect L/T shapes
    const mergedMatches = this.mergeMatches(horizontalMatches, verticalMatches);
    
    // Determine powerup types for each match
    return mergedMatches.map(match => this.classifyMatch(match));
  }
  
  private findHorizontalMatches(grid: Grid): Match[] {
    const matches: Match[] = [];
    
    for (let row = 0; row < grid.rows; row++) {
      let matchStart = 0;
      
      for (let col = 1; col <= grid.cols; col++) {
        const currentTile = grid.getCell(row, col)?.tile;
        const startTile = grid.getCell(row, matchStart)?.tile;
        
        const sameType = currentTile && startTile && 
                         currentTile.type === startTile.type;
        
        if (col < grid.cols && sameType) {
          continue; // Extend match
        }
        
        // Match ended, check if valid
        const matchLength = col - matchStart;
        if (matchLength >= 3) {
          const tiles: Tile[] = [];
          for (let c = matchStart; c < col; c++) {
            tiles.push(grid.getCell(row, c)!.tile!);
          }
          matches.push({ tiles, type: 'horizontal' });
        }
        
        matchStart = col;
      }
    }
    
    return matches;
  }
  
  private findVerticalMatches(grid: Grid): Match[] {
    const matches: Match[] = [];
    
    for (let col = 0; col < grid.cols; col++) {
      let matchStart = 0;
      
      for (let row = 1; row <= grid.rows; row++) {
        const currentTile = grid.getCell(row, col)?.tile;
        const startTile = grid.getCell(matchStart, col)?.tile;
        
        const sameType = currentTile && startTile && 
                         currentTile.type === startTile.type;
        
        if (row < grid.rows && sameType) {
          continue;
        }
        
        const matchLength = row - matchStart;
        if (matchLength >= 3) {
          const tiles: Tile[] = [];
          for (let r = matchStart; r < row; r++) {
            tiles.push(grid.getCell(r, col)!.tile!);
          }
          matches.push({ tiles, type: 'vertical' });
        }
        
        matchStart = row;
      }
    }
    
    return matches;
  }
}
```

### Step 2: Merge Overlapping Matches

```typescript
private mergeMatches(horizontal: Match[], vertical: Match[]): Match[] {
  const allMatches = [...horizontal, ...vertical];
  const merged: Match[] = [];
  const processed = new Set<Tile>();
  
  for (const match of allMatches) {
    // Check if any tile in this match overlaps with another match
    const overlapping = allMatches.filter(other => 
      other !== match && 
      match.tiles.some(t => other.tiles.includes(t))
    );
    
    if (overlapping.length > 0) {
      // Combine all overlapping matches
      const combinedTiles = new Set<Tile>();
      match.tiles.forEach(t => combinedTiles.add(t));
      overlapping.forEach(o => o.tiles.forEach(t => combinedTiles.add(t)));
      
      // Check if already processed
      if ([...combinedTiles].some(t => processed.has(t))) continue;
      
      combinedTiles.forEach(t => processed.add(t));
      
      merged.push({
        tiles: [...combinedTiles],
        type: this.determineShapeType(combinedTiles),
      });
    } else if (!match.tiles.some(t => processed.has(t))) {
      match.tiles.forEach(t => processed.add(t));
      merged.push(match);
    }
  }
  
  return merged;
}

private determineShapeType(tiles: Set<Tile>): 'L' | 'T' | 'complex' | 'horizontal' | 'vertical' {
  // Analyze tile positions to determine shape
  const rows = new Set([...tiles].map(t => t.row));
  const cols = new Set([...tiles].map(t => t.col));
  
  if (rows.size === 1) return 'horizontal';
  if (cols.size === 1) return 'vertical';
  
  // L shape: 2 rows, 2+ cols or 2+ rows, 2 cols with specific pattern
  // T shape: 3+ in one direction, 3 in perpendicular crossing center
  
  // Simplified: if not linear, it's L or T shape
  return tiles.size >= 5 ? 'T' : 'L';
}
```

### Step 3: Classify Match & Determine Powerup

```typescript
private classifyMatch(match: Match): Match {
  const count = match.tiles.length;
  
  // 5+ in a line = Color Bomb
  if (count >= 5 && (match.type === 'horizontal' || match.type === 'vertical')) {
    return {
      ...match,
      powerupType: 'color_bomb',
      powerupPosition: this.getMatchCenter(match),
    };
  }
  
  // L or T shape = Bomb
  if (match.type === 'L' || match.type === 'T') {
    return {
      ...match,
      powerupType: 'bomb',
      powerupPosition: this.getIntersectionPoint(match),
    };
  }
  
  // 4 in a line = Rocket
  if (count === 4) {
    const isHorizontal = match.type === 'horizontal';
    return {
      ...match,
      powerupType: isHorizontal ? 'rocket_h' : 'rocket_v',
      powerupPosition: this.getSwappedTilePosition(match),
    };
  }
  
  // 3 in a line = No powerup
  return match;
}

private getSwappedTilePosition(match: Match): { row: number; col: number } {
  // Powerup appears where the player's swapped tile was
  // This requires tracking which tile was moved
  // Default to center if not tracked
  return this.getMatchCenter(match);
}

private getMatchCenter(match: Match): { row: number; col: number } {
  const rows = match.tiles.map(t => t.row);
  const cols = match.tiles.map(t => t.col);
  
  return {
    row: Math.floor((Math.min(...rows) + Math.max(...rows)) / 2),
    col: Math.floor((Math.min(...cols) + Math.max(...cols)) / 2),
  };
}
```

---

## Tile Clearing

```typescript
class MatchClearer {
  async clearMatches(grid: Grid, matches: Match[]): Promise<void> {
    // Collect all tiles to clear
    const tilesToClear = new Set<Tile>();
    matches.forEach(m => m.tiles.forEach(t => tilesToClear.add(t)));
    
    // Play clear animation for all tiles simultaneously
    await this.animateClear([...tilesToClear]);
    
    // Actually remove tiles from grid
    for (const tile of tilesToClear) {
      const cell = grid.getCell(tile.row, tile.col);
      if (cell) {
        // Handle obstacles
        if (cell.obstacle) {
          const cleared = cell.obstacle.onTileMatched();
          if (cleared) {
            cell.obstacle = null;
            this.onObstacleCleared(cell.obstacle);
          }
        }
        
        cell.tile = null;
      }
    }
    
    // Create powerups from matches
    for (const match of matches) {
      if (match.powerupType && match.powerupPosition) {
        this.createPowerup(grid, match.powerupType, match.powerupPosition);
      }
    }
  }
  
  private async animateClear(tiles: Tile[]): Promise<void> {
    return new Promise(resolve => {
      // Scale tiles to 0 with bounce
      tiles.forEach(tile => {
        // Emit particles
        this.emitParticles(tile.screenX, tile.screenY, tile.type);
        
        // Animate
        this.tween(tile.sprite, {
          scaleX: 0,
          scaleY: 0,
          duration: 150,
          ease: 'Back.easeIn',
        });
      });
      
      // Play sound
      this.playSound('match');
      
      setTimeout(resolve, 150);
    });
  }
}
```

---

## Gravity & Falling

After tiles are cleared, remaining tiles fall to fill gaps:

```typescript
class GridFiller {
  async applyGravity(grid: Grid): Promise<void> {
    const animations: Promise<void>[] = [];
    
    // Process column by column
    for (let col = 0; col < grid.cols; col++) {
      let emptyRow = grid.rows - 1;
      
      // Find tiles and move them down
      for (let row = grid.rows - 1; row >= 0; row--) {
        const cell = grid.getCell(row, col);
        if (!cell || cell.blocked) continue;
        
        if (cell.tile) {
          if (row !== emptyRow) {
            // Move tile from row to emptyRow
            const tile = cell.tile;
            const targetCell = grid.getCell(emptyRow, col)!;
            
            cell.tile = null;
            targetCell.tile = tile;
            tile.row = emptyRow;
            
            // Animate fall
            animations.push(this.animateFall(tile, row, emptyRow));
          }
          emptyRow--;
        }
      }
      
      // Spawn new tiles for remaining empty spaces
      for (let row = emptyRow; row >= 0; row--) {
        const cell = grid.getCell(row, col);
        if (!cell || cell.blocked) continue;
        
        const newTile = this.createRandomTile();
        newTile.row = row;
        newTile.col = col;
        cell.tile = newTile;
        
        // Animate from above screen
        const spawnRow = row - (emptyRow - row + 1);
        animations.push(this.animateFall(newTile, spawnRow, row));
      }
    }
    
    await Promise.all(animations);
  }
  
  private async animateFall(tile: Tile, fromRow: number, toRow: number): Promise<void> {
    const distance = toRow - fromRow;
    const duration = 50 + distance * 30; // Longer fall = longer duration
    
    return new Promise(resolve => {
      this.tween(tile.sprite, {
        y: this.rowToY(toRow),
        duration,
        ease: 'Bounce.easeOut',
        onComplete: resolve,
      });
    });
  }
}
```

---

## Cascade Detection

After tiles fall, check for new matches (chain reaction):

```typescript
class GameLoop {
  async processMatches(grid: Grid): Promise<void> {
    let cascadeCount = 0;
    
    while (true) {
      const matches = this.matchDetector.findAllMatches(grid);
      
      if (matches.length === 0) {
        break; // No more matches
      }
      
      cascadeCount++;
      this.onCascade(cascadeCount); // Trigger combo display/sound
      
      // Clear matches
      await this.matchClearer.clearMatches(grid, matches);
      
      // Apply gravity
      await this.gridFiller.applyGravity(grid);
      
      // Small delay between cascades for visual clarity
      await this.delay(100);
    }
    
    this.onCascadeComplete(cascadeCount);
  }
}
```

---

## Move Validation

Only allow swaps that create a match:

```typescript
class MoveValidator {
  isValidMove(grid: Grid, from: Cell, to: Cell): boolean {
    // Temporarily swap
    grid.swapTiles(from, to);
    
    // Check for matches
    const matches = this.matchDetector.findAllMatches(grid);
    
    // Swap back
    grid.swapTiles(from, to);
    
    return matches.length > 0;
  }
}

class SwipeHandler {
  onSwipe(from: Cell, to: Cell): void {
    if (this.moveValidator.isValidMove(this.grid, from, to)) {
      // Animate swap
      this.animateSwap(from, to);
      // Then process matches
    } else {
      // Animate failed swap (swap and snap back)
      this.animateFailedSwap(from, to);
    }
  }
}
```

---

## No Moves Detection

Check if player has any valid moves:

```typescript
class MoveChecker {
  hasValidMoves(grid: Grid): boolean {
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const cell = grid.getCell(row, col);
        if (!cell?.tile) continue;
        
        // Check right neighbor
        const right = grid.getCell(row, col + 1);
        if (right?.tile && this.moveValidator.isValidMove(grid, cell, right)) {
          return true;
        }
        
        // Check bottom neighbor
        const bottom = grid.getCell(row + 1, col);
        if (bottom?.tile && this.moveValidator.isValidMove(grid, cell, bottom)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  handleNoMoves(grid: Grid): void {
    // Option 1: Shuffle the board
    this.shuffleBoard(grid);
    
    // Option 2: End the game
    // this.gameOver();
  }
}
```

---

## Testing Match Detection

```typescript
describe('MatchDetector', () => {
  it('should detect horizontal match of 3', () => {
    const grid = createGridFromString(`
      R R R . .
      . . . . .
    `);
    
    const matches = detector.findAllMatches(grid);
    expect(matches).toHaveLength(1);
    expect(matches[0].tiles).toHaveLength(3);
  });
  
  it('should detect L-shape and create bomb', () => {
    const grid = createGridFromString(`
      R R R . .
      R . . . .
      R . . . .
    `);
    
    const matches = detector.findAllMatches(grid);
    expect(matches).toHaveLength(1);
    expect(matches[0].powerupType).toBe('bomb');
  });
  
  it('should detect 5 in a row and create color bomb', () => {
    const grid = createGridFromString(`
      R R R R R
      . . . . .
    `);
    
    const matches = detector.findAllMatches(grid);
    expect(matches[0].powerupType).toBe('color_bomb');
  });
});
```

---

## Related Features

- [Grid System](grid-system.md)
- [Powerups](powerups.md)
