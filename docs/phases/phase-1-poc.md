# Phase 1: Proof of Concept

**Status:** 🔴 Not Started  
**Duration:** 1-2 weeks  
**Goal:** Playable grid with basic matching and powerup creation

---

## Overview

This phase establishes the core foundation of the game. By the end, you should have a functional match-3 prototype that:
- Displays a colorful grid
- Responds to touch/mouse input
- Detects and clears matches
- Creates powerups for larger matches
- Refills the grid with new tiles

---

## Deliverables Checklist

### Grid & Rendering
- [ ] Create responsive canvas that fills mobile screen
- [ ] Render 8x8 grid of tiles (configurable)
- [ ] Display 4 different tile types (colors/shapes)
- [ ] Tiles have clear, distinct visual appearance
- [ ] Grid is centered and properly scaled

### Input Handling
- [ ] Detect touch start / mouse down
- [ ] Track swipe direction (up, down, left, right)
- [ ] Validate swipe is to adjacent tile only
- [ ] Visual feedback during swipe (tile follows finger slightly)
- [ ] Snap back if invalid move

### Match Detection
- [ ] Detect horizontal matches (3+)
- [ ] Detect vertical matches (3+)
- [ ] Detect L-shaped matches
- [ ] Detect T-shaped matches
- [ ] Only allow moves that create matches (optional for POC)

### Tile Clearing & Falling
- [ ] Clear matched tiles with simple animation
- [ ] Remaining tiles fall to fill gaps
- [ ] Physics-based or eased falling motion
- [ ] Spawn new tiles from top of grid
- [ ] Check for chain reactions (cascades)

### Powerup Creation
- [ ] **Rocket** - Created from 4-in-a-row match
  - Horizontal match → Horizontal Rocket
  - Vertical match → Vertical Rocket
- [ ] **Bomb** - Created from L or T shaped match
- [ ] **Color Bomb** - Created from 5+ in-a-row match
- [ ] Powerups displayed distinctly (different sprite/icon)
- [ ] Powerups can be matched like normal tiles

### Powerup Activation
- [ ] Tapping/matching Rocket clears row OR column
- [ ] Tapping/matching Bomb clears 3x3 area
- [ ] Tapping/matching Color Bomb + tile clears all of that color

---

## Technical Tasks

### Setup Project
```bash
# Initialize project
npm create vite@latest match5-game -- --template vanilla-ts
cd match5-game
npm install

# Install Phaser (recommended) or PixiJS
npm install phaser
# OR npm install pixi.js

# Start dev server
npm run dev
```

### File Structure for Phase 1
```
src/
├── index.html
├── main.ts              # Entry point, game initialization
├── config.ts            # Game constants (grid size, colors, timing)
├── scenes/
│   └── GameScene.ts     # Main game scene
├── objects/
│   ├── Grid.ts          # Grid management
│   ├── Tile.ts          # Individual tile
│   └── Powerup.ts       # Powerup types
├── systems/
│   ├── MatchDetector.ts # Find matches on grid
│   ├── InputHandler.ts  # Swipe detection
│   └── GridFiller.ts    # Handle falling & spawning
└── styles.css           # Minimal styling
```

### Configuration Constants
```typescript
// config.ts
export const CONFIG = {
  GRID: {
    ROWS: 8,
    COLS: 8,
    TILE_SIZE: 64,
    GAP: 4,
  },
  TILES: {
    COLORS: ['red', 'blue', 'green', 'yellow'], // Start with 4
    // Later: Add 'purple', 'orange' for harder levels
  },
  MATCH: {
    MIN_MATCH: 3,
    ROCKET_MATCH: 4,
    BOMB_MATCH: 5, // L/T shape
    COLOR_BOMB_MATCH: 5, // 5 in a row
  },
  TIMING: {
    SWAP_DURATION: 150,
    FALL_DURATION: 100,
    CLEAR_DURATION: 200,
  },
};
```

---

## Algorithm Notes

### Match Detection Algorithm

```typescript
function findMatches(grid: Tile[][]): Match[] {
  const matches: Match[] = [];
  
  // Check horizontal matches
  for (let row = 0; row < ROWS; row++) {
    let matchStart = 0;
    for (let col = 1; col <= COLS; col++) {
      if (col < COLS && grid[row][col].type === grid[row][matchStart].type) {
        continue;
      }
      const matchLength = col - matchStart;
      if (matchLength >= 3) {
        matches.push({
          tiles: grid[row].slice(matchStart, col),
          direction: 'horizontal',
          length: matchLength,
        });
      }
      matchStart = col;
    }
  }
  
  // Check vertical matches (similar logic, iterate by column)
  // ...
  
  // Merge overlapping matches for L/T shapes
  return mergeMatches(matches);
}
```

### Tile Falling Algorithm

```typescript
function applyGravity(grid: Tile[][]): void {
  for (let col = 0; col < COLS; col++) {
    let emptyRow = ROWS - 1;
    
    // Move existing tiles down
    for (let row = ROWS - 1; row >= 0; row--) {
      if (grid[row][col] !== null) {
        if (row !== emptyRow) {
          grid[emptyRow][col] = grid[row][col];
          grid[row][col] = null;
          // Animate tile from row to emptyRow
        }
        emptyRow--;
      }
    }
    
    // Spawn new tiles for empty spaces
    for (let row = emptyRow; row >= 0; row--) {
      grid[row][col] = createRandomTile();
      // Animate tile falling from above screen
    }
  }
}
```

---

## Mobile Browser Testing

### Testing on iPhone
1. Find your computer's local IP: `ipconfig` (Windows) or `ifconfig` (Mac)
2. Run dev server: `npm run dev -- --host`
3. On iPhone, open Safari and go to `http://YOUR_IP:5173`
4. Test touch input and performance

### Add to Home Screen (PWA)
1. In Safari, tap Share button
2. Select "Add to Home Screen"
3. Game opens full-screen without browser UI

### Responsive Sizing
```typescript
// Calculate tile size based on screen
const screenWidth = window.innerWidth;
const screenHeight = window.innerHeight;
const maxGridWidth = screenWidth * 0.95;
const maxGridHeight = screenHeight * 0.7; // Leave room for UI

const tileSize = Math.min(
  Math.floor(maxGridWidth / COLS),
  Math.floor(maxGridHeight / ROWS)
);
```

---

## Visual Style (Phase 1)

For POC, use simple but distinct visuals:

### Option A: Colored Shapes (Simple)
- Red Circle
- Blue Square
- Green Triangle
- Yellow Diamond
- (Purple Pentagon, Orange Hexagon for later)

### Option B: Emoji Tiles (Very Simple)
- 🔴 🔵 🟢 🟡 (or fruits/gems emoji)
- Good for rapid prototyping
- Replace with proper art later

### Powerup Visuals
- **Rocket**: Arrow shape or rocket icon on tile
- **Bomb**: Tile with fuse or explosion icon
- **Color Bomb**: Rainbow/disco ball or star

---

## Success Criteria

Phase 1 is complete when you can:

1. ✅ Open the game on iPhone Safari
2. ✅ See an 8x8 grid of colorful tiles
3. ✅ Swipe to swap adjacent tiles
4. ✅ Invalid swipes snap back
5. ✅ Matches of 3+ are detected and cleared
6. ✅ Matching 4 in a row creates a Rocket
7. ✅ Matching 5 in a row creates a Color Bomb
8. ✅ L/T shapes create a Bomb
9. ✅ Activating Rocket clears a line
10. ✅ Activating Bomb clears 3x3
11. ✅ Activating Color Bomb clears all of chosen color
12. ✅ Tiles fall to fill gaps
13. ✅ New tiles spawn from top
14. ✅ Chain reactions (cascades) work
15. ✅ Game runs at 60fps on mobile

---

## Related Features

- [Grid System](../features/grid-system.md)
- [Matching Mechanics](../features/matching-mechanics.md)
- [Powerups](../features/powerups.md)

---

## Next Phase

Once complete, proceed to [Phase 2: Core Gameplay](phase-2-gameplay.md) to add level objectives, win/lose conditions, and the first obstacle type.
