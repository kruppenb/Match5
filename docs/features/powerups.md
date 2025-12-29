# Feature: Powerups

**Phase:** [Phase 1: POC](../phases/phase-1-poc.md) (Basic), [Phase 3: Content](../phases/phase-3-content.md) (Combinations)  
**Priority:** Critical  
**Status:** 🔴 Not Started

---

## Overview

Powerups are special tiles created when matching 4+ tiles. They provide powerful effects that help clear the board and complete objectives. Combining powerups creates even more spectacular effects.

---

## Powerup Types

### Rocket (Line Blast)

**Created by:** 4 tiles in a row/column  
**Effect:** Clears entire row OR column  
**Visual:** Arrow/rocket icon pointing in direction

| Match Direction | Rocket Direction | Effect |
|-----------------|------------------|--------|
| Horizontal (4 in row) | Horizontal → | Clears entire row |
| Vertical (4 in column) | Vertical ↑ | Clears entire column |

```typescript
class RocketPowerup implements Powerup {
  type = 'rocket';
  direction: 'horizontal' | 'vertical';
  
  constructor(matchDirection: 'horizontal' | 'vertical') {
    this.direction = matchDirection;
  }
  
  activate(grid: Grid, row: number, col: number): Tile[] {
    const affectedTiles: Tile[] = [];
    
    if (this.direction === 'horizontal') {
      for (let c = 0; c < grid.cols; c++) {
        const cell = grid.getCell(row, c);
        if (cell?.tile) affectedTiles.push(cell.tile);
      }
    } else {
      for (let r = 0; r < grid.rows; r++) {
        const cell = grid.getCell(r, col);
        if (cell?.tile) affectedTiles.push(cell.tile);
      }
    }
    
    return affectedTiles;
  }
}
```

**Animation:**
- Rocket icon animates moving across row/column
- Trail effect behind rocket
- Tiles explode as rocket passes
- Sound: Whoosh/swoosh

---

### Bomb (TNT)

**Created by:** L-shaped or T-shaped match (5+ tiles)  
**Effect:** Clears 3x3 area around bomb  
**Visual:** TNT/bomb icon with fuse

```typescript
class BombPowerup implements Powerup {
  type = 'bomb';
  radius = 1; // 3x3 = radius 1 from center
  
  activate(grid: Grid, row: number, col: number): Tile[] {
    const affectedTiles: Tile[] = [];
    
    for (let r = row - this.radius; r <= row + this.radius; r++) {
      for (let c = col - this.radius; c <= col + this.radius; c++) {
        const cell = grid.getCell(r, c);
        if (cell?.tile) affectedTiles.push(cell.tile);
      }
    }
    
    return affectedTiles;
  }
}
```

**Animation:**
- Bomb shakes before exploding
- Radial explosion effect
- Camera shake
- Sound: Explosion

---

### Color Bomb (Light Ball)

**Created by:** 5 tiles in a row/column  
**Effect:** Clears ALL tiles of chosen color  
**Visual:** Rainbow/disco ball or glowing orb

```typescript
class ColorBombPowerup implements Powerup {
  type = 'color_bomb';
  targetColor: string | null = null;
  
  activate(grid: Grid, row: number, col: number): Tile[] {
    const affectedTiles: Tile[] = [];
    
    // When activated with a colored tile, clear all of that color
    if (this.targetColor) {
      grid.forEachCell(cell => {
        if (cell.tile?.type === this.targetColor) {
          affectedTiles.push(cell.tile);
        }
      });
    }
    
    return affectedTiles;
  }
  
  setTargetColor(color: string): void {
    this.targetColor = color;
  }
}
```

**Activation Methods:**
1. Swap with any colored tile → Clears all tiles of that color
2. Match with same-colored tiles → Clear all of that color
3. Tap to activate (optional) → Player picks color

**Animation:**
- Rainbow wave emanates from bomb
- Each affected tile sparkles then clears
- Lightning/energy connects tiles
- Sound: Magical chimes/sparkles

---

## Powerup Creation

```typescript
class PowerupFactory {
  create(matchType: string, position: { row: number; col: number }, matchDirection: string): Tile {
    switch (matchType) {
      case 'rocket':
        return {
          type: `rocket_${matchDirection === 'horizontal' ? 'h' : 'v'}`,
          row: position.row,
          col: position.col,
          isPowerup: true,
          powerup: new RocketPowerup(matchDirection),
        };
        
      case 'bomb':
        return {
          type: 'bomb',
          row: position.row,
          col: position.col,
          isPowerup: true,
          powerup: new BombPowerup(),
        };
        
      case 'color_bomb':
        return {
          type: 'color_bomb',
          row: position.row,
          col: position.col,
          isPowerup: true,
          powerup: new ColorBombPowerup(),
        };
    }
  }
}
```

---

## Powerup Combinations (Phase 3)

When two powerups are swapped together, they combine for enhanced effects:

### Combination Matrix

| Powerup 1 | Powerup 2 | Result Effect |
|-----------|-----------|---------------|
| Rocket | Rocket | Cross blast (row + column) |
| Bomb | Bomb | 5x5 mega explosion |
| Rocket | Bomb | 3 parallel rows OR columns |
| Color Bomb | Rocket | All of color become rockets |
| Color Bomb | Bomb | All of color become bombs |
| Color Bomb | Color Bomb | Clear entire board |

### Implementation

```typescript
class PowerupCombiner {
  combine(p1: Powerup, p2: Powerup, grid: Grid, position: { row: number; col: number }): CombinationEffect {
    const types = [p1.type, p2.type].sort().join('+');
    
    switch (types) {
      case 'rocket+rocket':
        return this.crossBlast(grid, position);
        
      case 'bomb+bomb':
        return this.megaBomb(grid, position);
        
      case 'bomb+rocket':
        return this.tripleLines(grid, position, p1, p2);
        
      case 'color_bomb+rocket':
        return this.transformAllToRockets(grid, p1, p2);
        
      case 'color_bomb+bomb':
        return this.transformAllToBombs(grid, p1, p2);
        
      case 'color_bomb+color_bomb':
        return this.clearEntireBoard(grid);
    }
  }
  
  private crossBlast(grid: Grid, pos: { row: number; col: number }): CombinationEffect {
    const tiles: Tile[] = [];
    
    // Clear entire row
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.getCell(pos.row, c);
      if (cell?.tile) tiles.push(cell.tile);
    }
    
    // Clear entire column
    for (let r = 0; r < grid.rows; r++) {
      if (r === pos.row) continue; // Already added
      const cell = grid.getCell(r, pos.col);
      if (cell?.tile) tiles.push(cell.tile);
    }
    
    return {
      type: 'cross_blast',
      tiles,
      animation: 'cross',
    };
  }
  
  private megaBomb(grid: Grid, pos: { row: number; col: number }): CombinationEffect {
    const tiles: Tile[] = [];
    const radius = 2; // 5x5 area
    
    for (let r = pos.row - radius; r <= pos.row + radius; r++) {
      for (let c = pos.col - radius; c <= pos.col + radius; c++) {
        const cell = grid.getCell(r, c);
        if (cell?.tile) tiles.push(cell.tile);
      }
    }
    
    return {
      type: 'mega_bomb',
      tiles,
      animation: 'large_explosion',
    };
  }
  
  private tripleLines(grid: Grid, pos: { row: number; col: number }, p1: Powerup, p2: Powerup): CombinationEffect {
    const tiles: Tile[] = [];
    const rocketType = p1.type === 'rocket' ? p1 : p2;
    const direction = (rocketType as RocketPowerup).direction;
    
    if (direction === 'horizontal') {
      // Clear 3 rows
      for (let r = pos.row - 1; r <= pos.row + 1; r++) {
        for (let c = 0; c < grid.cols; c++) {
          const cell = grid.getCell(r, c);
          if (cell?.tile) tiles.push(cell.tile);
        }
      }
    } else {
      // Clear 3 columns
      for (let c = pos.col - 1; c <= pos.col + 1; c++) {
        for (let r = 0; r < grid.rows; r++) {
          const cell = grid.getCell(r, c);
          if (cell?.tile) tiles.push(cell.tile);
        }
      }
    }
    
    return {
      type: 'triple_lines',
      tiles,
      animation: 'triple_rocket',
    };
  }
  
  private transformAllToRockets(grid: Grid, p1: Powerup, p2: Powerup): CombinationEffect {
    const colorBomb = p1.type === 'color_bomb' ? p1 : p2;
    const rocket = p1.type === 'rocket' ? p1 : p2;
    const targetColor = (rocket as any).originalTileColor || this.getRandomColor(grid);
    
    const transformTargets: Tile[] = [];
    
    grid.forEachCell(cell => {
      if (cell.tile?.type === targetColor) {
        transformTargets.push(cell.tile);
      }
    });
    
    return {
      type: 'transform_rockets',
      tiles: transformTargets,
      transformInto: 'rocket',
      animation: 'transform_wave',
    };
  }
  
  private clearEntireBoard(grid: Grid): CombinationEffect {
    const tiles: Tile[] = [];
    
    grid.forEachCell(cell => {
      if (cell.tile) tiles.push(cell.tile);
    });
    
    return {
      type: 'clear_board',
      tiles,
      animation: 'rainbow_explosion',
    };
  }
}
```

---

## Combination Animations

### Cross Blast (Rocket + Rocket)
1. Both rockets fly to center
2. Merge with flash
3. Energy wave expands in + shape
4. Tiles clear in sequence from center

### Mega Bomb (Bomb + Bomb)
1. Bombs collide and merge
2. Larger bomb appears
3. Dramatic explosion (5x5)
4. Major screen shake

### Triple Lines (Rocket + Bomb)
1. Bomb energizes rocket
2. Rocket splits into 3
3. All 3 rockets fire simultaneously
4. Parallel destruction

### Transform All (Color Bomb + Rocket/Bomb)
1. Color bomb scans board (rainbow wave)
2. Matching tiles highlight
3. Tiles transform into powerups
4. All transformed powerups activate!

### Clear Board (Color Bomb + Color Bomb)
1. Both bombs merge
2. Rainbow explosion from center
3. Wave clears everything
4. Maximum screen shake
5. Bonus points rain down

---

## Powerup Visual Design

### Rocket
```
Horizontal:    Vertical:
   ▶▶▶           ▲
   ═══           ║
   ▶▶▶           ║
                 ▲
```
- Arrow pointing in direction
- Animated flame/trail
- Glowing effect

### Bomb
```
   ╭─╮
   │●│
   ╰┬╯
    ┊  (fuse)
```
- TNT box or sphere bomb
- Animated sparking fuse
- Shaking anticipation

### Color Bomb
```
    ✦
   ╱ ╲
  ◢███◣
   ╲ ╱
    ✦
```
- Rainbow/chromatic shifting
- Pulsing glow
- Sparkle particles

---

## Activation Rules

| Trigger | Action |
|---------|--------|
| Swap with regular tile | Activate powerup |
| Match powerup with same colors | Activate powerup |
| Swap two powerups | Combine and activate |
| Affected by another powerup | Chain activate |
| Tap powerup (optional) | Activate powerup |

### Chain Reactions

When a powerup is activated and hits another powerup:

```typescript
class ChainReactor {
  processChain(grid: Grid, initialPowerup: Tile, affectedTiles: Tile[]): void {
    const powerupsToActivate = affectedTiles.filter(t => t.isPowerup);
    
    for (const powerup of powerupsToActivate) {
      // Queue for activation (don't activate immediately for better visuals)
      this.activationQueue.push({
        powerup,
        delay: this.calculateDelay(initialPowerup, powerup),
      });
    }
    
    // Process queue with timing
    this.processQueue();
  }
}
```

---

## Points & Scoring

| Action | Base Points |
|--------|-------------|
| 3 match | 30 |
| 4 match (Rocket created) | 60 |
| 5+ match (Color Bomb) | 100 |
| L/T shape (Bomb) | 80 |
| Rocket activation | +10 per tile |
| Bomb activation | +10 per tile |
| Color Bomb activation | +15 per tile |
| Combo (Rocket + Rocket) | +200 bonus |
| Combo (Bomb + Bomb) | +300 bonus |
| Combo (CB + CB) | +1000 bonus |

---

## Testing Powerups

```typescript
describe('Powerups', () => {
  describe('Rocket', () => {
    it('should clear entire row when horizontal rocket activates', () => {
      const grid = createGrid(8, 8);
      const rocket = new RocketPowerup('horizontal');
      const affected = rocket.activate(grid, 3, 4);
      
      expect(affected.length).toBe(8); // Entire row
    });
  });
  
  describe('Bomb', () => {
    it('should clear 3x3 area', () => {
      const grid = createGrid(8, 8);
      const bomb = new BombPowerup();
      const affected = bomb.activate(grid, 4, 4);
      
      expect(affected.length).toBe(9); // 3x3
    });
    
    it('should handle edge positions', () => {
      const grid = createGrid(8, 8);
      const bomb = new BombPowerup();
      const affected = bomb.activate(grid, 0, 0);
      
      expect(affected.length).toBe(4); // Corner only 2x2 available
    });
  });
  
  describe('Combinations', () => {
    it('should create cross blast for rocket + rocket', () => {
      const combiner = new PowerupCombiner();
      const result = combiner.combine(
        new RocketPowerup('horizontal'),
        new RocketPowerup('vertical'),
        grid,
        { row: 4, col: 4 }
      );
      
      expect(result.type).toBe('cross_blast');
      expect(result.tiles.length).toBe(15); // row + col - 1 overlap
    });
  });
});
```

---

## Related Features

- [Matching Mechanics](matching-mechanics.md)
- [Grid System](grid-system.md)
- [Animations](animations.md)
