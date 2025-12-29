# Phase 3: Content & Variety

**Status:** 🔴 Not Started  
**Duration:** 2-3 weeks  
**Prerequisites:** [Phase 2: Core Gameplay](phase-2-gameplay.md)  
**Goal:** More obstacles, powerup combinations, and level variety

---

## Overview

This phase expands the game's variety significantly. New obstacles create unique challenges, powerup combinations add strategic depth, and difficulty scaling keeps players engaged.

---

## Deliverables Checklist

### New Obstacles
- [ ] **Ice** - Single layer, cleared with one match
- [ ] **Double Ice** - Two layers, needs two matches
- [ ] **Chains** - Locks tile in place, can still be matched
- [ ] **Boxes/Crates** - Blocks cells, cleared by adjacent matches
- [ ] **Stone** - Indestructible, blocks cell permanently

### Powerup Combinations
- [ ] Rocket + Rocket = Cross (row AND column)
- [ ] Bomb + Bomb = 5x5 explosion
- [ ] Rocket + Bomb = 3 rows OR 3 columns
- [ ] Color Bomb + Rocket = All tiles become rockets
- [ ] Color Bomb + Bomb = All tiles become bombs
- [ ] Color Bomb + Color Bomb = Clear entire board

### Level Variety
- [ ] Non-rectangular grid shapes
- [ ] Blocker cells (holes in grid)
- [ ] Wider variety of objectives
- [ ] 30+ total levels
- [ ] Difficulty progression curve

### Difficulty Scaling
- [ ] Tile variety: 3-6 colors based on level
- [ ] Fewer moves for harder levels
- [ ] More complex objective combinations
- [ ] Strategic obstacle placement

---

## Obstacle Specifications

### Ice Obstacle

**Visual**: Translucent ice overlay on tile
**Behavior**:
- Tile underneath is visible but frozen
- Can be matched normally
- One match breaks the ice (1 layer)
- Tile becomes normal after ice breaks

**Double Ice**:
- Thicker, more opaque ice
- Requires 2 matches to fully clear
- First match removes outer layer
- Second match removes inner layer + clears tile

```typescript
class IceObstacle implements Obstacle {
  type = 'ice';
  layers: number;
  
  constructor(layers: 1 | 2 = 1) {
    this.layers = layers;
  }
  
  onTileMatched(): boolean {
    this.layers--;
    return this.layers <= 0;
  }
  
  canTileMove(): boolean {
    return true; // Frozen tiles CAN be swapped
  }
}
```

### Chain Obstacle

**Visual**: Metal chain wrapped around tile
**Behavior**:
- Tile is locked in position
- CANNOT be swapped with adjacent tiles
- CAN be matched if adjacent tiles create a match
- One match breaks the chain
- Powerup explosions also break chains

```typescript
class ChainObstacle implements Obstacle {
  type = 'chain';
  
  canTileMove(): boolean {
    return false; // Cannot swap
  }
  
  canBeMatched(): boolean {
    return true; // Can still participate in matches
  }
  
  onTileMatched(): boolean {
    return true; // Single match clears
  }
}
```

### Box/Crate Obstacle

**Visual**: Wooden crate blocking cell
**Behavior**:
- Occupies entire cell (no tile underneath)
- Cannot be matched
- Cleared by adjacent match or powerup
- Tiles cannot pass through
- May have 1-3 layers

```typescript
class BoxObstacle implements Obstacle {
  type = 'box';
  layers: number;
  
  constructor(layers: 1 | 2 | 3 = 1) {
    this.layers = layers;
  }
  
  onAdjacentMatch(): boolean {
    this.layers--;
    return this.layers <= 0;
  }
  
  blocksTile(): boolean {
    return true; // No tile in this cell
  }
}
```

### Stone Obstacle

**Visual**: Gray stone block
**Behavior**:
- Permanently blocks cell
- Cannot be destroyed by any means
- Used to create interesting grid shapes
- Tiles fall around stones

---

## Powerup Combinations

When two powerups are swapped together, they combine for enhanced effects:

### Combination Matrix

| Powerup 1 | Powerup 2 | Result |
|-----------|-----------|--------|
| Rocket H | Rocket V | Cross blast (row + column) |
| Rocket | Rocket (same) | Double line blast |
| Bomb | Bomb | 5x5 explosion |
| Rocket | Bomb | 3 parallel lines |
| Color Bomb | Rocket | All tiles of color → rockets |
| Color Bomb | Bomb | All tiles of color → bombs |
| Color Bomb | Color Bomb | Clear entire board! |
| Color Bomb | Any tile | Clear all of that tile's color |

### Implementation

```typescript
class PowerupCombiner {
  combine(powerup1: Powerup, powerup2: Powerup): CombinedEffect {
    const types = [powerup1.type, powerup2.type].sort();
    
    if (types[0] === 'rocket' && types[1] === 'rocket') {
      return { type: 'cross_blast', origin: powerup1.position };
    }
    
    if (types[0] === 'bomb' && types[1] === 'bomb') {
      return { type: 'mega_bomb', origin: powerup1.position, radius: 2 };
    }
    
    if (types[0] === 'bomb' && types[1] === 'rocket') {
      return { type: 'triple_line', origin: powerup1.position };
    }
    
    if (types[0] === 'color_bomb' && types[1] === 'color_bomb') {
      return { type: 'clear_board' };
    }
    
    if (types[0] === 'color_bomb') {
      const targetColor = powerup2.tileColor;
      const transformTo = types[1] === 'bomb' ? 'bomb' : 'rocket';
      return { type: 'transform_all', color: targetColor, into: transformTo };
    }
    
    return null; // No special combination
  }
}
```

---

## Non-Rectangular Grids

Create interesting level layouts by blocking certain cells:

```
Standard Grid:        L-Shaped:           Cross:
□ □ □ □ □ □ □ □      □ □ □ □ X X X X     X X □ □ □ X X
□ □ □ □ □ □ □ □      □ □ □ □ X X X X     X X □ □ □ X X
□ □ □ □ □ □ □ □      □ □ □ □ X X X X     □ □ □ □ □ □ □
□ □ □ □ □ □ □ □      □ □ □ □ □ □ □ □     □ □ □ □ □ □ □
□ □ □ □ □ □ □ □      □ □ □ □ □ □ □ □     □ □ □ □ □ □ □
□ □ □ □ □ □ □ □      □ □ □ □ □ □ □ □     X X □ □ □ X X
□ □ □ □ □ □ □ □      □ □ □ □ □ □ □ □     X X □ □ □ X X
□ □ □ □ □ □ □ □      □ □ □ □ □ □ □ □
```

### Tile Falling with Gaps

```typescript
function findFallTarget(col: number, startRow: number): number {
  for (let row = startRow + 1; row < ROWS; row++) {
    const cell = grid[row][col];
    if (cell.blocked || cell.obstacle?.blocksTile()) {
      return row - 1; // Stop above blocker
    }
    if (cell.tile === null) {
      continue; // Keep falling
    }
  }
  return ROWS - 1; // Fall to bottom
}
```

---

## Extended Level Progression (Levels 11-30)

| Level | New Element | Notes |
|-------|-------------|-------|
| 11 | Ice (1 layer) | Introduce ice |
| 12 | Ice | More ice tiles |
| 13 | Ice | Collect + ice |
| 14 | Double Ice | Introduce 2-layer ice |
| 15 | Double Ice | Strategic placement |
| 16 | Chains | Introduce chains |
| 17 | Chains | Chained + ice combo |
| 18 | Chains | Complex pattern |
| 19 | Boxes | Introduce boxes |
| 20 | Boxes | Box patterns |
| 21 | Stone | Introduce blockers |
| 22 | Stone | L-shaped level |
| 23 | 6 tile colors | Add 6th color |
| 24 | Mixed obstacles | Ice + chains |
| 25 | Mixed obstacles | Full variety |
| 26-30 | Mastery | Complex combinations |

---

## New Objective Types

### Collect Items
- Specific tile types fall from top
- Must match to collect
- "Collect 15 red gems"

### Break Obstacles
- "Clear all ice"
- "Destroy 8 boxes"

### Combo Objectives
- "Clear 20 grass AND collect 10 blues"
- Multiple objectives, all must complete

---

## Success Criteria

Phase 3 is complete when:

1. ✅ Ice obstacle works (1 and 2 layers)
2. ✅ Chain obstacle locks tiles correctly
3. ✅ Box obstacle cleared by adjacent matches
4. ✅ Stone blocks cells permanently
5. ✅ All 6 powerup combinations work
6. ✅ Non-rectangular grids render correctly
7. ✅ Tiles fall correctly around blockers
8. ✅ 30+ playable levels
9. ✅ Difficulty scales appropriately
10. ✅ 6 tile colors available for hard levels

---

## Related Features

- [Obstacles](../features/obstacles.md)
- [Powerups](../features/powerups.md)

---

## Next Phase

Proceed to [Phase 4: Polish & Effects](phase-4-polish.md) to add juice, particle effects, sound, and make the game feel amazing.
