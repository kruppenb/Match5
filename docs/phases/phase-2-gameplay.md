# Phase 2: Core Gameplay Loop

**Status:** ✅ Complete
**Duration:** 2-3 weeks
**Prerequisites:** [Phase 1: POC](phase-1-poc.md)
**Goal:** Complete gameplay loop with objectives, win/lose conditions, and first obstacle

---

## Overview

This phase transforms the POC into an actual game with goals, challenge, and progression. Players will have objectives to complete within a limited number of moves.

---

## Deliverables Checklist

### Level System
- [x] Level data structure (JSON format)
- [x] Load level from configuration
- [x] Variable grid layouts (not always 8x8)
- [x] Pre-placed tiles and powerups
- [x] Level selection screen (basic)
- [x] Save/load progress (localStorage)

### Objectives System
- [x] **Clear Grass** - Remove grass tiles under blocks
- [x] **Collect Items** - Gather X items of specific type (framework ready)
- [x] **Score Target** - Reach minimum score (framework ready)
- [x] Display objectives in UI
- [x] Track objective progress during play
- [x] Multiple objectives per level (framework ready)

### Move System
- [x] Move counter display
- [x] Decrement on each swap (not on cascades)
- [x] Visual warning when moves are low (3 or less)
- [x] No moves = level failed

### Win/Lose States
- [x] Win condition: All objectives complete
- [x] Lose condition: Out of moves
- [x] Win screen with celebration
- [x] Lose screen with retry option
- [x] Extra moves after win give bonus score

### First Obstacle: Grass
- [x] Grass tile visual (under regular tiles)
- [x] Cleared when matched on top
- [x] Tracked as objective
- [x] Can have multiple layers (single for now)

### User Interface
- [x] Level number display
- [x] Move counter
- [x] Objective icons with progress
- [x] Pause button
- [ ] Settings menu (volume, etc.) - deferred to Phase 4

---

## Level Data Structure

```typescript
// types/Level.ts
interface LevelConfig {
  id: number;
  grid: {
    rows: number;
    cols: number;
  };
  moves: number;
  tileVariety: number; // 3-6 different tile types
  objectives: Objective[];
  layout: CellConfig[][]; // Pre-defined grid layout
}

interface Objective {
  type: 'clear_grass' | 'collect' | 'score';
  target: number;
  tileType?: string; // For collect objectives
}

interface CellConfig {
  tile?: string;      // 'red', 'blue', etc., or 'random'
  powerup?: string;   // 'rocket_h', 'bomb', etc.
  obstacle?: string;  // 'grass', 'ice', etc.
  blocked?: boolean;  // Empty/blocked cell
}
```

### Example Level
```json
{
  "id": 1,
  "grid": { "rows": 8, "cols": 8 },
  "moves": 20,
  "tileVariety": 4,
  "objectives": [
    { "type": "clear_grass", "target": 10 }
  ],
  "layout": [
    [".", ".", ".", ".", ".", ".", ".", "."],
    [".", "G", "G", "G", "G", "G", "G", "."],
    [".", "G", ".", ".", ".", ".", "G", "."],
    [".", "G", ".", ".", ".", ".", "G", "."],
    [".", "G", ".", ".", ".", ".", "G", "."],
    [".", "G", ".", ".", ".", ".", "G", "."],
    [".", "G", "G", "G", "G", "G", "G", "."],
    [".", ".", ".", ".", ".", ".", ".", "."]
  ]
}
```

Legend:
- `.` = Normal cell (random tile)
- `G` = Grass underneath
- `X` = Blocked cell
- `R` = Pre-placed rocket
- `B` = Pre-placed bomb

---

## Game Flow

```
┌─────────────────┐
│  Level Select   │
│  (1) (2) (3)... │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Level Start    │
│  Show objectives│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Game Loop     │◄──────┐
│  - Make move    │       │
│  - Check match  │       │
│  - Update grid  │       │
│  - Check win    │───────┤
└────────┬────────┘       │
         │                │
    ┌────┴────┐           │
    ▼         ▼           │
┌───────┐ ┌───────┐       │
│  WIN  │ │ LOSE  │       │
│ Stars │ │ Retry │───────┘
└───┬───┘ └───────┘
    │
    ▼
┌─────────────────┐
│  Next Level     │
└─────────────────┘
```

---

## Objective System Implementation

```typescript
// systems/ObjectiveTracker.ts
class ObjectiveTracker {
  private objectives: Map<string, { target: number; current: number }>;
  
  constructor(levelObjectives: Objective[]) {
    this.objectives = new Map();
    for (const obj of levelObjectives) {
      this.objectives.set(obj.type, { target: obj.target, current: 0 });
    }
  }
  
  onGrassCleared(count: number): void {
    this.updateProgress('clear_grass', count);
  }
  
  onItemCollected(type: string, count: number): void {
    this.updateProgress(`collect_${type}`, count);
  }
  
  onScoreAdded(points: number): void {
    this.updateProgress('score', points);
  }
  
  private updateProgress(type: string, amount: number): void {
    const obj = this.objectives.get(type);
    if (obj) {
      obj.current = Math.min(obj.current + amount, obj.target);
      this.emit('progress', { type, current: obj.current, target: obj.target });
    }
  }
  
  isComplete(): boolean {
    for (const obj of this.objectives.values()) {
      if (obj.current < obj.target) return false;
    }
    return true;
  }
}
```

---

## Grass Obstacle Mechanics

The grass obstacle is the foundational objective type:

### Visual
- Green grass texture underneath tiles
- Visible at edges/gaps between tiles
- Maybe slight animation (swaying)

### Behavior
- Any match made on a grass tile clears the grass
- The tile itself is still cleared/matched as normal
- Grass doesn't affect tile movement
- Powerup explosions also clear grass

### Implementation
```typescript
interface Cell {
  tile: Tile | null;
  obstacle: Obstacle | null;
}

class GrassObstacle implements Obstacle {
  type = 'grass';
  layers = 1;
  
  onTileMatched(): boolean {
    this.layers--;
    return this.layers <= 0; // Returns true when fully cleared
  }
  
  render(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    // Draw grass texture
  }
}
```

---

## UI Layout

```
┌─────────────────────────────────┐
│  ≡  Level 5            ⚙️ ⏸️   │  <- Header
├─────────────────────────────────┤
│  🌿 8/10    ⭐ 1250    🔢 15   │  <- Objectives bar
├─────────────────────────────────┤
│                                 │
│                                 │
│         [GAME GRID]             │
│                                 │
│                                 │
│                                 │
├─────────────────────────────────┤
│      [BOOSTER BUTTONS]          │  <- Optional for later
└─────────────────────────────────┘
```

---

## Level Progression (First 10 Levels)

| Level | Grid | Moves | Tile Types | Objectives | Notes |
|-------|------|-------|------------|------------|-------|
| 1 | 7x7 | 25 | 4 | Clear 8 grass | Tutorial - easy |
| 2 | 7x7 | 22 | 4 | Clear 12 grass | Slightly more |
| 3 | 8x8 | 20 | 4 | Clear 15 grass | Bigger grid |
| 4 | 8x8 | 20 | 4 | Clear 18 grass | Grass in pattern |
| 5 | 8x8 | 18 | 4 | Clear 20 grass | Fewer moves |
| 6 | 8x8 | 18 | 5 | Clear 15 grass | Add 5th tile |
| 7 | 8x8 | 18 | 5 | Clear 22 grass | Harder pattern |
| 8 | 8x8 | 16 | 5 | Clear 20 grass | Tight moves |
| 9 | 9x9 | 20 | 5 | Clear 25 grass | Large grid |
| 10 | 8x8 | 15 | 5 | Clear 24 grass | Boss level feel |

---

## Success Criteria

Phase 2 is complete when:

1. ✅ Levels load from configuration
2. ✅ Grass tiles display under regular tiles  
3. ✅ Matching on grass clears the grass
4. ✅ Move counter decrements on swaps
5. ✅ Win when all grass is cleared
6. ✅ Lose when out of moves
7. ✅ Win/lose screens appear
8. ✅ Can retry failed levels
9. ✅ Can progress to next level
10. ✅ 10 playable levels exist
11. ✅ Progress saved in localStorage
12. ✅ Basic level select screen works

---

## Related Features

- [Level Objectives](../features/level-objectives.md)
- [Obstacles](../features/obstacles.md)

---

## Next Phase

Proceed to [Phase 3: Content & Variety](phase-3-content.md) to add more obstacles, powerup combinations, and expand level variety.
