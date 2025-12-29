# Feature: Obstacles

**Phase:** [Phase 2: Gameplay](../phases/phase-2-gameplay.md) (Grass), [Phase 3: Content](../phases/phase-3-content.md) (Ice, Chains, Boxes)  
**Priority:** High  
**Status:** 🔴 Not Started

---

## Overview

Obstacles add strategic depth and variety to levels. Each obstacle type has unique properties that affect how tiles can be matched, moved, or cleared.

---

## Obstacle Types

### 1. Grass 🌿

**Phase:** 2 (First obstacle)  
**Visual:** Green grass pattern visible under tiles  
**Purpose:** Primary level objective

**Behavior:**
- Sits under regular tiles
- Tile on top can match normally
- Cleared when tile above is matched
- One match = grass cleared
- Often the main objective: "Clear all grass"

```typescript
class GrassObstacle implements Obstacle {
  type = 'grass';
  
  // Grass doesn't block anything
  blocksTileMovement(): boolean { return false; }
  blocksTileMatching(): boolean { return false; }
  blocksTilePresence(): boolean { return false; }
  
  // Clears when matched on top
  onTileMatched(): boolean {
    return true; // Fully cleared
  }
  
  render(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.fillStyle = '#4a7c23';
    ctx.fillRect(x - size/2, y - size/2, size, size);
    // Draw grass blades
    ctx.strokeStyle = '#6ba832';
    for (let i = 0; i < 5; i++) {
      const bx = x - size/3 + (i * size/6);
      ctx.beginPath();
      ctx.moveTo(bx, y + size/3);
      ctx.quadraticCurveTo(bx, y, bx + 3, y - size/4);
      ctx.stroke();
    }
  }
}
```

---

### 2. Ice ❄️

**Phase:** 3  
**Visual:** Translucent ice overlay on tile  
**Purpose:** Adds extra match requirement

**Behavior:**
- Encases tile in ice (1 or 2 layers)
- Tile can still be matched
- Tile CAN be swapped
- Each match removes one ice layer
- When ice fully broken, tile cleared normally

```typescript
class IceObstacle implements Obstacle {
  type = 'ice';
  layers: number;
  
  constructor(layers: 1 | 2 = 1) {
    this.layers = layers;
  }
  
  blocksTileMovement(): boolean { return false; } // Can swap
  blocksTileMatching(): boolean { return false; } // Can match
  blocksTilePresence(): boolean { return false; } // Has tile
  
  onTileMatched(): boolean {
    this.layers--;
    return this.layers <= 0;
  }
  
  render(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.fillStyle = this.layers === 2 
      ? 'rgba(200, 230, 255, 0.7)'  // Thicker ice
      : 'rgba(200, 230, 255, 0.4)'; // Thin ice
    
    ctx.fillRect(x - size/2 + 2, y - size/2 + 2, size - 4, size - 4);
    
    // Ice cracks for single layer
    if (this.layers === 1) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.moveTo(x - size/4, y - size/4);
      ctx.lineTo(x, y);
      ctx.lineTo(x + size/4, y - size/6);
      ctx.stroke();
    }
  }
}
```

**Variations:**
| Ice Type | Layers | Matches to Clear |
|----------|--------|------------------|
| Ice | 1 | 1 |
| Double Ice | 2 | 2 |

---

### 3. Chain 🔗

**Phase:** 3  
**Visual:** Metal chain wrapped around tile  
**Purpose:** Restricts tile movement

**Behavior:**
- Locks tile in place
- Tile CANNOT be swapped
- Tile CAN be matched (if adjacent tiles form match)
- Powerups can break chains
- One match/hit = chain broken

```typescript
class ChainObstacle implements Obstacle {
  type = 'chain';
  
  blocksTileMovement(): boolean { return true; }  // Cannot swap!
  blocksTileMatching(): boolean { return false; } // Can still match
  blocksTilePresence(): boolean { return false; } // Has tile
  
  onTileMatched(): boolean {
    return true; // Single match breaks chain
  }
  
  onPowerupHit(): boolean {
    return true; // Powerups break chains too
  }
  
  render(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = 4;
    
    // Draw chain links around tile
    const links = 4;
    for (let i = 0; i < links; i++) {
      const angle = (i / links) * Math.PI * 2;
      const lx = x + Math.cos(angle) * (size/2 - 4);
      const ly = y + Math.sin(angle) * (size/2 - 4);
      
      ctx.beginPath();
      ctx.ellipse(lx, ly, 6, 4, angle, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
```

---

### 4. Box/Crate 📦

**Phase:** 3  
**Visual:** Wooden crate filling cell  
**Purpose:** Blocks space, requires adjacent matches

**Behavior:**
- Fills entire cell (no tile underneath)
- CANNOT be matched directly
- Cleared by adjacent matches
- Powerup hits also clear boxes
- May have 1-3 layers

```typescript
class BoxObstacle implements Obstacle {
  type = 'box';
  layers: number;
  
  constructor(layers: 1 | 2 | 3 = 1) {
    this.layers = layers;
  }
  
  blocksTileMovement(): boolean { return true; }
  blocksTileMatching(): boolean { return true; }
  blocksTilePresence(): boolean { return true; } // No tile here!
  
  onAdjacentMatch(): boolean {
    this.layers--;
    return this.layers <= 0;
  }
  
  onPowerupHit(): boolean {
    this.layers--;
    return this.layers <= 0;
  }
  
  render(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    const boxSize = size - 8;
    
    // Wood color based on layers
    const colors = ['#8B4513', '#A0522D', '#CD853F'];
    ctx.fillStyle = colors[this.layers - 1] || colors[0];
    ctx.fillRect(x - boxSize/2, y - boxSize/2, boxSize, boxSize);
    
    // Wood grain
    ctx.strokeStyle = '#6B3513';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - boxSize/2, y);
    ctx.lineTo(x + boxSize/2, y);
    ctx.moveTo(x, y - boxSize/2);
    ctx.lineTo(x, y + boxSize/2);
    ctx.stroke();
    
    // Layer indicator
    if (this.layers > 1) {
      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(this.layers.toString(), x, y + 6);
    }
  }
}
```

---

### 5. Stone 🪨

**Phase:** 3  
**Visual:** Gray stone block  
**Purpose:** Permanent blocker for level design

**Behavior:**
- Fills entire cell
- CANNOT be destroyed by any means
- Tiles fall around stones
- Used to create interesting grid shapes

```typescript
class StoneObstacle implements Obstacle {
  type = 'stone';
  
  blocksTileMovement(): boolean { return true; }
  blocksTileMatching(): boolean { return true; }
  blocksTilePresence(): boolean { return true; }
  
  // Stone is indestructible
  onAdjacentMatch(): boolean { return false; }
  onPowerupHit(): boolean { return false; }
  
  render(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    const stoneSize = size - 4;
    
    // Stone gradient
    const gradient = ctx.createRadialGradient(
      x - stoneSize/4, y - stoneSize/4, 0,
      x, y, stoneSize
    );
    gradient.addColorStop(0, '#888');
    gradient.addColorStop(1, '#555');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x - stoneSize/2, y - stoneSize/2, stoneSize, stoneSize, 8);
    ctx.fill();
    
    // Cracks for detail
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 5);
    ctx.lineTo(x - 2, y - 3);
    ctx.lineTo(x + 8, y + 2);
    ctx.stroke();
  }
}
```

---

## Future Obstacles (Ideas)

### Honey/Slime 🍯
- Spreads to adjacent cells each turn if not cleared
- Creates urgency

### Portal 🌀
- Tiles teleport between connected portals
- Adds complexity to falling

### Bubble 🫧
- Tile floats up instead of down
- Reverses gravity in column

### Lock & Key 🔐
- Key items must be collected to unlock locked cells

---

## Obstacle Interaction Matrix

| Obstacle | Has Tile? | Can Swap? | Can Match? | Cleared By |
|----------|-----------|-----------|------------|------------|
| Grass | ✅ | ✅ | ✅ | Match on top |
| Ice | ✅ | ✅ | ✅ | Match on top (per layer) |
| Chain | ✅ | ❌ | ✅ | Match/Powerup |
| Box | ❌ | ❌ | ❌ | Adjacent match/Powerup |
| Stone | ❌ | ❌ | ❌ | Nothing (permanent) |

---

## Gravity with Obstacles

When tiles fall, they must navigate around blockers:

```typescript
function applyGravityWithObstacles(grid: Grid): void {
  for (let col = 0; col < grid.cols; col++) {
    // Process from bottom to top
    let fallTarget = grid.rows - 1;
    
    for (let row = grid.rows - 1; row >= 0; row--) {
      const cell = grid.getCell(row, col);
      
      // Skip blocked cells and cells with blocking obstacles
      if (!cell || cell.blocked || cell.obstacle?.blocksTilePresence()) {
        // Tiles above this can't fall past here
        // Reset fall target to above this blocker
        fallTarget = row - 1;
        continue;
      }
      
      if (cell.tile) {
        // Move tile to fall target if different
        if (row !== fallTarget) {
          const targetCell = grid.getCell(fallTarget, col)!;
          targetCell.tile = cell.tile;
          cell.tile = null;
          
          // Animate
          animateFall(targetCell.tile, row, fallTarget);
        }
        fallTarget--;
      }
    }
  }
}
```

---

## Level Design with Obstacles

### Tutorial Sequence

| Level | Introduces | Complexity |
|-------|------------|------------|
| 1-5 | Grass only | Very easy |
| 6-10 | More grass, harder patterns | Easy |
| 11-15 | Ice (1 layer) | Medium |
| 16-18 | Double Ice | Medium |
| 19-22 | Chains | Medium |
| 23-28 | Boxes (1 layer) | Medium-Hard |
| 29-32 | Multi-layer boxes | Hard |
| 33-40 | Stone blockers | Hard |
| 41+ | All obstacles combined | Expert |

### Example Level with Multiple Obstacles

```
Level 35 Layout:
. . G G G G . .
. G I I I I G .
G I C . . C I G
G I . B B . I G
G I . B B . I G
G I C . . C I G
. G I I I I G .
. . G G G G . .

Legend:
. = Normal cell
G = Grass
I = Ice (1 layer)
C = Chain
B = Box
```

---

## Obstacle Events & Tracking

```typescript
class ObstacleTracker {
  private counts: Map<string, number> = new Map();
  
  initialize(grid: Grid): void {
    grid.forEachCell(cell => {
      if (cell.obstacle) {
        const type = cell.obstacle.type;
        this.counts.set(type, (this.counts.get(type) || 0) + 1);
      }
    });
  }
  
  onObstacleCleared(obstacle: Obstacle): void {
    const type = obstacle.type;
    const remaining = (this.counts.get(type) || 1) - 1;
    this.counts.set(type, remaining);
    
    // Emit event for objectives
    this.emit('obstacleCleared', { type, remaining });
    
    if (remaining === 0) {
      this.emit('allCleared', { type });
    }
  }
  
  getRemaining(type: string): number {
    return this.counts.get(type) || 0;
  }
}
```

---

## Testing Obstacles

```typescript
describe('Obstacles', () => {
  describe('Grass', () => {
    it('should clear when tile is matched on top', () => {
      const cell = createCellWithGrass();
      cell.obstacle!.onTileMatched();
      
      expect(cell.obstacle).toBeNull();
    });
  });
  
  describe('Ice', () => {
    it('should require 2 matches for double ice', () => {
      const ice = new IceObstacle(2);
      
      expect(ice.onTileMatched()).toBe(false); // Not cleared yet
      expect(ice.layers).toBe(1);
      expect(ice.onTileMatched()).toBe(true);  // Now cleared
    });
  });
  
  describe('Chain', () => {
    it('should prevent tile movement', () => {
      const chain = new ChainObstacle();
      
      expect(chain.blocksTileMovement()).toBe(true);
      expect(chain.blocksTileMatching()).toBe(false);
    });
  });
  
  describe('Box', () => {
    it('should be cleared by adjacent matches', () => {
      const box = new BoxObstacle(1);
      
      expect(box.onAdjacentMatch()).toBe(true);
    });
    
    it('should require multiple hits for layered boxes', () => {
      const box = new BoxObstacle(3);
      
      expect(box.onAdjacentMatch()).toBe(false);
      expect(box.onAdjacentMatch()).toBe(false);
      expect(box.onAdjacentMatch()).toBe(true);
    });
  });
});
```

---

## Related Features

- [Level Objectives](level-objectives.md)
- [Grid System](grid-system.md)
- [Matching Mechanics](matching-mechanics.md)
