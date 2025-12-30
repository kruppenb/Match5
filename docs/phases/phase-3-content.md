# Phase 3: Content & Variety

**Status:** 🟢 Complete
**Duration:** 2-3 weeks
**Prerequisites:** [Phase 2: Core Gameplay](phase-2-gameplay.md)
**Goal:** More obstacles, powerup combinations, and level variety

---

## Overview

This phase expands the game's variety significantly. New obstacles create unique challenges, powerup combinations add strategic depth, and difficulty scaling keeps players engaged.

---

## Deliverables Checklist

---

## Art & Assets (Improve placeholders)

**Goal:** Replace temporary emoji/shape placeholders with a small, consistent art pipeline that produces crisp, scalable assets (SVG for icons and raster sprite sheets for runtime).

Deliverables:
- Create SVG icon set for tiles and powerups at 2x and 3x sizes for mobile (suggested base sizes: 64px, 128px, 192px)
- Export a packed sprite sheet (PNG) with trimmed frames for Phaser runtime and a corresponding JSON atlas (TexturePacker or spritesmith)
- Provide fallback vector icons (SVG) for the menu and UI so they look crisp at any resolution
- Create simple animation frames for powerups (rocket trail, bomb spark, color-bomb pulse)
- Define asset naming convention and folder layout:
  - assets/sprites/tiles/tile_{color}.png (or .svg)
  - assets/sprites/powerups/{powerup}_{dir?}_00.png
  - assets/atlas/match5-atlas.png + match5-atlas.json

Pipeline & tools:
- Design icons as SVG in Figma/Illustrator or open-source Inkscape
- Export optimized SVGs using SVGO
- Generate sprite sheets with TexturePacker (recommended) or gulp-spritesmith
- Add a small `scripts/asset-export.js` to automate exporting and atlas generation (optional)

Priorities for Phase 3:
- 1) Replace tile shapes with polished SVG icons (heart, diamond, clover, star)
- 2) Create simple animated sprites for Bomb and Rocket (3-6 frames)
- 3) Bake a 2x sprite atlas for mobile (retina) and include JSON atlas for Phaser

Acceptance criteria:
- Assets load in the Phaser scene and replace graphics-based placeholders
- Visuals remain readable at mobile sizes (no blur)
- Asset pipeline reproducible with a single command


### New Obstacles
- [x] **Ice** - Single layer, cleared with one match
- [x] **Double Ice** - Two layers, needs two matches
- [x] **Chains** - Locks tile in place, can still be matched
- [x] **Boxes/Crates** - Blocks cells, cleared by adjacent matches
- [x] **Stone** - Indestructible, blocks cell permanently

### Powerup Combinations
- [x] Rocket + Rocket = Cross (row AND column)
- [x] Bomb + Bomb = 7x7 explosion
- [x] Rocket + Bomb = 3 rows AND 3 columns
- [x] Color Bomb + Rocket = All tiles of color clear rows/columns
- [x] Color Bomb + Bomb = All tiles of color explode 3x3
- [x] Color Bomb + Color Bomb = Clear entire board
- [x] Propeller combinations (Propeller + Rocket, Bomb, Color Bomb, Propeller)

### Level Variety
- [x] Non-rectangular grid shapes (using blocked cells and stone)
- [x] Blocker cells (holes in grid)
- [x] Wider variety of objectives (grass, ice, chains, boxes)
- [x] 30 total levels (10 original + 20 new)
- [x] Difficulty progression curve

### Difficulty Scaling
- [x] Tile variety: 4-6 colors based on level
- [x] Fewer moves for harder levels
- [x] More complex objective combinations (up to 4 objectives)
- [x] Strategic obstacle placement

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
