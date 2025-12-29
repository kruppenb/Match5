# Feature: Grid System

**Phase:** [Phase 1: POC](../phases/phase-1-poc.md)  
**Priority:** Critical  
**Status:** 🔴 Not Started

---

## Overview

The grid system is the foundation of the game. It manages the game board, tile positions, and provides the structure for all game mechanics.

---

## Requirements

### Grid Properties
- Configurable dimensions (default 8x8)
- Support for non-rectangular shapes (blocked cells)
- Responsive sizing based on screen
- Proper spacing between tiles

### Cell Types
- **Normal**: Contains a tile
- **Blocked**: Empty, tiles cannot pass through
- **Obstacle**: Contains obstacle (grass, ice, etc.)

---

## Technical Specification

### Grid Data Structure

```typescript
interface GridConfig {
  rows: number;
  cols: number;
  tileSize: number;
  gap: number;
}

interface Cell {
  row: number;
  col: number;
  tile: Tile | null;
  obstacle: Obstacle | null;
  blocked: boolean;
}

class Grid {
  private cells: Cell[][];
  private config: GridConfig;
  
  constructor(config: GridConfig) {
    this.config = config;
    this.cells = this.createEmptyGrid();
  }
  
  private createEmptyGrid(): Cell[][] {
    const grid: Cell[][] = [];
    for (let row = 0; row < this.config.rows; row++) {
      grid[row] = [];
      for (let col = 0; col < this.config.cols; col++) {
        grid[row][col] = {
          row,
          col,
          tile: null,
          obstacle: null,
          blocked: false,
        };
      }
    }
    return grid;
  }
  
  getCell(row: number, col: number): Cell | null {
    if (row < 0 || row >= this.config.rows) return null;
    if (col < 0 || col >= this.config.cols) return null;
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
  
  swapTiles(cell1: Cell, cell2: Cell): void {
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
  
  isAdjacent(cell1: Cell, cell2: Cell): boolean {
    const rowDiff = Math.abs(cell1.row - cell2.row);
    const colDiff = Math.abs(cell1.col - cell2.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }
}
```

---

## Responsive Sizing

The grid must fit on various screen sizes:

```typescript
class GridRenderer {
  private calculateTileSize(screenWidth: number, screenHeight: number): number {
    const margin = 20;
    const uiHeight = 120; // Space for UI elements
    
    const availableWidth = screenWidth - margin * 2;
    const availableHeight = screenHeight - uiHeight - margin * 2;
    
    const maxTileWidth = Math.floor(availableWidth / this.grid.cols);
    const maxTileHeight = Math.floor(availableHeight / this.grid.rows);
    
    return Math.min(maxTileWidth, maxTileHeight, 80); // Max 80px
  }
  
  getGridOffset(): { x: number; y: number } {
    const gridWidth = this.grid.cols * this.tileSize;
    const gridHeight = this.grid.rows * this.tileSize;
    
    return {
      x: (this.screenWidth - gridWidth) / 2,
      y: (this.screenHeight - gridHeight) / 2 + 50, // Offset for top UI
    };
  }
  
  cellToScreen(row: number, col: number): { x: number; y: number } {
    const offset = this.getGridOffset();
    return {
      x: offset.x + col * this.tileSize + this.tileSize / 2,
      y: offset.y + row * this.tileSize + this.tileSize / 2,
    };
  }
  
  screenToCell(x: number, y: number): { row: number; col: number } | null {
    const offset = this.getGridOffset();
    const col = Math.floor((x - offset.x) / this.tileSize);
    const row = Math.floor((y - offset.y) / this.tileSize);
    
    if (row < 0 || row >= this.grid.rows) return null;
    if (col < 0 || col >= this.grid.cols) return null;
    
    return { row, col };
  }
}
```

---

## Grid Initialization from Level

```typescript
interface LevelLayout {
  grid: string[][];  // 2D array of cell definitions
}

function initializeGrid(layout: LevelLayout, tileTypes: string[]): Grid {
  const grid = new Grid({
    rows: layout.grid.length,
    cols: layout.grid[0].length,
    tileSize: 64,
    gap: 4,
  });
  
  for (let row = 0; row < layout.grid.length; row++) {
    for (let col = 0; col < layout.grid[row].length; col++) {
      const cellDef = layout.grid[row][col];
      const cell = grid.getCell(row, col)!;
      
      switch (cellDef) {
        case 'X':
          cell.blocked = true;
          break;
        case 'G':
          cell.obstacle = new GrassObstacle();
          cell.tile = createRandomTile(tileTypes);
          break;
        case 'I':
          cell.obstacle = new IceObstacle(1);
          cell.tile = createRandomTile(tileTypes);
          break;
        case '.':
        default:
          cell.tile = createRandomTile(tileTypes);
          break;
      }
    }
  }
  
  // Ensure no initial matches
  grid.shuffleUntilNoMatches();
  
  return grid;
}
```

---

## Rendering

### Phaser Example

```typescript
class GridScene extends Phaser.Scene {
  private grid: Grid;
  private tileSprites: Map<Tile, Phaser.GameObjects.Sprite>;
  
  create(): void {
    this.tileSprites = new Map();
    
    this.grid.forEachCell((cell) => {
      if (cell.blocked) return;
      
      // Draw cell background
      const pos = this.cellToScreen(cell.row, cell.col);
      this.add.rectangle(pos.x, pos.y, this.tileSize - 4, this.tileSize - 4, 0x333333);
      
      // Draw obstacle if present
      if (cell.obstacle) {
        this.drawObstacle(cell.obstacle, pos.x, pos.y);
      }
      
      // Draw tile if present
      if (cell.tile) {
        const sprite = this.add.sprite(pos.x, pos.y, 'tiles', cell.tile.type);
        this.tileSprites.set(cell.tile, sprite);
      }
    });
  }
  
  updateTilePosition(tile: Tile, animated: boolean = true): void {
    const sprite = this.tileSprites.get(tile);
    if (!sprite) return;
    
    const pos = this.cellToScreen(tile.row, tile.col);
    
    if (animated) {
      this.tweens.add({
        targets: sprite,
        x: pos.x,
        y: pos.y,
        duration: 150,
        ease: 'Back.easeOut',
      });
    } else {
      sprite.x = pos.x;
      sprite.y = pos.y;
    }
  }
}
```

### Canvas Example

```typescript
class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  
  renderGrid(grid: Grid): void {
    grid.forEachCell((cell) => {
      const pos = this.cellToScreen(cell.row, cell.col);
      
      // Skip blocked cells
      if (cell.blocked) return;
      
      // Draw cell background
      this.ctx.fillStyle = '#333';
      this.ctx.fillRect(
        pos.x - this.tileSize / 2 + 2,
        pos.y - this.tileSize / 2 + 2,
        this.tileSize - 4,
        this.tileSize - 4
      );
      
      // Draw obstacle
      if (cell.obstacle) {
        this.renderObstacle(cell.obstacle, pos.x, pos.y);
      }
      
      // Draw tile
      if (cell.tile) {
        this.renderTile(cell.tile, pos.x, pos.y);
      }
    });
  }
  
  private renderTile(tile: Tile, x: number, y: number): void {
    const colors: Record<string, string> = {
      red: '#ff4444',
      blue: '#4444ff',
      green: '#44ff44',
      yellow: '#ffff44',
      purple: '#aa44ff',
      orange: '#ffaa44',
    };
    
    this.ctx.fillStyle = colors[tile.type] || '#888';
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.tileSize / 2 - 4, 0, Math.PI * 2);
    this.ctx.fill();
  }
}
```

---

## Input Handling

### Touch/Mouse Events

```typescript
class SwipeHandler {
  private startCell: Cell | null = null;
  private startPos: { x: number; y: number } | null = null;
  
  constructor(private grid: Grid, private onSwap: (from: Cell, to: Cell) => void) {
    this.setupEvents();
  }
  
  private setupEvents(): void {
    const canvas = document.getElementById('game') as HTMLCanvasElement;
    
    canvas.addEventListener('mousedown', this.onStart.bind(this));
    canvas.addEventListener('mousemove', this.onMove.bind(this));
    canvas.addEventListener('mouseup', this.onEnd.bind(this));
    
    canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }
  
  private onStart(e: MouseEvent): void {
    const pos = this.getEventPosition(e);
    const cellPos = this.screenToCell(pos.x, pos.y);
    
    if (cellPos) {
      this.startCell = this.grid.getCell(cellPos.row, cellPos.col);
      this.startPos = pos;
    }
  }
  
  private onMove(e: MouseEvent): void {
    if (!this.startCell || !this.startPos) return;
    
    const pos = this.getEventPosition(e);
    const dx = pos.x - this.startPos.x;
    const dy = pos.y - this.startPos.y;
    const threshold = this.tileSize / 2;
    
    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      // Determine swipe direction
      const direction = this.getSwipeDirection(dx, dy);
      const targetCell = this.getAdjacentCell(this.startCell, direction);
      
      if (targetCell && !targetCell.blocked) {
        this.onSwap(this.startCell, targetCell);
      }
      
      this.reset();
    }
  }
  
  private getSwipeDirection(dx: number, dy: number): 'up' | 'down' | 'left' | 'right' {
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    }
    return dy > 0 ? 'down' : 'up';
  }
  
  private getAdjacentCell(cell: Cell, direction: string): Cell | null {
    const offsets = {
      up: { row: -1, col: 0 },
      down: { row: 1, col: 0 },
      left: { row: 0, col: -1 },
      right: { row: 0, col: 1 },
    };
    
    const offset = offsets[direction];
    return this.grid.getCell(cell.row + offset.row, cell.col + offset.col);
  }
}
```

---

## Performance Considerations

1. **Minimize redraws**: Only redraw changed cells
2. **Object pooling**: Reuse tile objects instead of creating new ones
3. **Sprite batching**: If using WebGL, batch similar sprites
4. **Dirty rectangles**: Track which parts of screen need redraw

```typescript
class OptimizedGrid {
  private dirtyCells: Set<Cell> = new Set();
  
  markDirty(cell: Cell): void {
    this.dirtyCells.add(cell);
  }
  
  render(): void {
    for (const cell of this.dirtyCells) {
      this.renderCell(cell);
    }
    this.dirtyCells.clear();
  }
}
```

---

## Testing

```typescript
describe('Grid', () => {
  it('should create grid with correct dimensions', () => {
    const grid = new Grid({ rows: 8, cols: 8, tileSize: 64, gap: 4 });
    expect(grid.rows).toBe(8);
    expect(grid.cols).toBe(8);
  });
  
  it('should return null for out of bounds cells', () => {
    const grid = new Grid({ rows: 8, cols: 8, tileSize: 64, gap: 4 });
    expect(grid.getCell(-1, 0)).toBeNull();
    expect(grid.getCell(8, 0)).toBeNull();
  });
  
  it('should correctly identify adjacent cells', () => {
    const grid = new Grid({ rows: 8, cols: 8, tileSize: 64, gap: 4 });
    const cell1 = grid.getCell(3, 3)!;
    const cell2 = grid.getCell(3, 4)!;
    const cell3 = grid.getCell(5, 5)!;
    
    expect(grid.isAdjacent(cell1, cell2)).toBe(true);
    expect(grid.isAdjacent(cell1, cell3)).toBe(false);
  });
});
```

---

## Related Features

- [Matching Mechanics](matching-mechanics.md)
- [Obstacles](obstacles.md)
