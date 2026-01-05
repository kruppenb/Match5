# Match5 Game

A tile-matching puzzle game (Royal Match / Candy Crush style) built with **Phaser 3** and **TypeScript**.

## Tech Stack

- **Engine**: Phaser 3.87
- **Language**: TypeScript (strict mode)
- **Build**: Vite
- **Testing**: Vitest
- **Target**: Mobile browser PWA (iOS Safari primary)

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run test     # Run tests
```

## Code Structure

### `src/scenes/` - Phaser Scenes (UI & Game Flow)
The game uses Phaser's scene system for navigation.

| File | Purpose |
|------|---------|
| `TitleScene.ts` | Main menu with play button, currency display, hero selection |
| `LevelSelectScene.ts` | Level grid, star display, world progression |
| `PreLevelScene.ts` | Pre-level screen with booster selection, hero charge purchase |
| `GameScene.ts` | Core gameplay - grid rendering, match processing, win/lose logic |
| `ShopScene.ts` | Purchase boosters with coins |
| `MiniGameHubScene.ts` | Hub for mini-games (spin wheel, treasure hunt, lucky match) |
| `SpinWheelScene.ts` | Spin-the-wheel mini-game |
| `TreasureHuntScene.ts` | Pick-3-chests mini-game |
| `LuckyMatchScene.ts` | Memory card matching mini-game |
| `ReplayLevelsScene.ts` | Replay completed levels for daily bonuses |

### `src/game/` - Core Game Logic
Pure game mechanics, no rendering code.

| File | Purpose |
|------|---------|
| `Grid.ts` | Grid state, cell access, tile placement, gravity |
| `MatchDetector.ts` | Pattern detection (3-match, L/T shapes, 5-in-a-row) |
| `GravitySystem.ts` | Tile falling and refill logic |
| `Level.ts` | Level loading, layout parsing |
| `Obstacle.ts` | Obstacle behaviors (ice, chains, boxes, grass, stone) |
| `SpecialObstacleProcessor.ts` | Barrel, ice bucket processing |
| `ObjectiveTracker.ts` | Track objective progress (clear X grass, collect Y tiles) |
| `BoosterManager.ts` | Booster inventory and activation logic |
| `HeroPowerSystem.ts` | Hero charge accumulation and power activation |
| `GameState.ts` | Game state machine (playing, won, lost) |
| `powerupUtils.ts` | Powerup creation helpers |

### `src/scenes/` - GameScene Helpers
Large pieces extracted from GameScene for organization.

| File | Purpose |
|------|---------|
| `InputHandler.ts` | Touch/swipe input for tile selection |
| `MatchProcessor.ts` | Orchestrates match detection, clearing, cascades |
| `PowerupActivator.ts` | Executes powerup effects (rockets, bombs, color bombs) |
| `PowerupAnimations.ts` | Visual effects for powerup activation |
| `BoosterExecutor.ts` | Applies booster effects to grid |
| `CelebrationManager.ts` | Win/lose screens, confetti, animations |
| `UIComponents.ts` | Shared UI elements (buttons, panels) |

### `src/rendering/` - Visual Rendering
| File | Purpose |
|------|---------|
| `TileRenderer.ts` | Tile sprites, powerup visuals, selection highlights |
| `ObstacleRenderer.ts` | Obstacle layer rendering (ice, chains, grass) |

### `src/meta/` - Meta Game Systems
Economy, progression, and persistence outside core gameplay.

| File | Purpose |
|------|---------|
| `CurrencyManager.ts` | Coins and diamonds management |
| `InventoryManager.ts` | Booster inventory tracking |
| `ProgressionEventManager.ts` | Limited-time events with checkpoint rewards |
| `MiniGameRotation.ts` | Daily mini-game availability |

### `src/storage/` - Persistence
| File | Purpose |
|------|---------|
| `ProgressStorage.ts` | Level completion, stars, highest level |
| `MetaStorage.ts` | Currencies, inventory, event progress |

### `src/utils/` - Utilities
| File | Purpose |
|------|---------|
| `AudioManager.ts` | Sound effects and music |
| `ParticleManager.ts` | Particle effects (explosions, sparkles) |
| `Easing.ts` | Animation easing functions |
| `ComboDisplay.ts` | Combo counter UI |
| `ScorePopup.ts` | Floating score numbers |
| `ScreenShake.ts` | Camera shake effects |
| `HapticFeedback.ts` | Device vibration |
| `BackgroundEffects.ts` | Floating particles, ambient effects |

### `src/data/`
| File | Purpose |
|------|---------|
| `levels.ts` | Level definitions (grid layouts, objectives, obstacles) |

### `src/` Root Files
| File | Purpose |
|------|---------|
| `main.ts` | Phaser game initialization, scene registration |
| `config.ts` | Game constants (grid size, timing, rewards, hero configs) |
| `types.ts` | TypeScript interfaces and types |

## Key Concepts

### Powerups
- **Rocket** (4-match): Clears row or column based on match direction
- **Bomb** (L/T shape): 3x3 explosion
- **Color Bomb** (5-match): Clears all tiles of tapped color
- **Propeller**: Flies to and clears obstacle/objective tiles

### Obstacles
- `grass`: Cleared when tile above matches
- `ice`: 1-2 layers, cleared by matches on that cell
- `chain`: Locks tile in place until cleared
- `box`: Blocks cell, cleared by adjacent matches
- `stone`: Indestructible blocker
- `barrel`, `ice_bucket`: Special collectible obstacles

### Boosters (pre-game powerups)
- `hammer`: Destroy single tile
- `row_arrow`: Clear entire row
- `col_arrow`: Clear entire column
- `shuffle`: Reshuffle board

### Heroes
Three selectable heroes with chargeable powers:
- **Thor**: Lightning strikes random tiles
- **Iron Man**: Missile barrage with 2x2 explosions
- **Elsa**: Ice wave clears multiple rows/columns

## Assets

Assets are in `public/assets/`:
- `sprites/gems/` - Tile sprites by color (red, blue, green, yellow, purple, orange)
- `sprites/powerups/` - Rocket, bomb, color bomb, propeller sprites
- `sprites/boosters/` - Booster item sprites
- `sprites/characters/` - Hero sprites
- `backgrounds/` - Scene backgrounds
- `audio/` - Sound effects

### Icon Usage (IMPORTANT)

**NEVER use emoji placeholders for icons.** Always use the proper game assets:

#### Booster Icons
Load in `preload()`, display with `this.add.image()`:
```typescript
// Preload
this.load.image('booster_hammer', 'assets/sprites/boosters/hammer.png');
this.load.image('booster_row_arrow', 'assets/sprites/boosters/arrow_h.png');
this.load.image('booster_col_arrow', 'assets/sprites/boosters/beam_v.png');
this.load.image('booster_shuffle', 'assets/sprites/boosters/lucky67.png');

// Display (24x24 is good for UI)
this.add.image(x, y, 'booster_hammer').setDisplaySize(24, 24);
```

#### Currency Icons
Draw with Phaser graphics (no image files):

**Coins** - Golden circle with $ symbol:
```typescript
this.add.circle(x, y, 14, 0xffd700, 0.3);  // Outer glow
this.add.circle(x, y, 11, 0xffd700);        // Main circle
this.add.circle(x, y, 7, 0xffec8b);         // Inner highlight
this.add.text(x, y, '$', { fontSize: '10px', fontFamily: 'Arial Black', color: '#b8860b' }).setOrigin(0.5);
```

**Diamonds** - Blue diamond shape:
```typescript
this.add.circle(x, y, 13, 0x00bfff, 0.25);  // Glow
const g = this.add.graphics();
g.fillStyle(0x00bfff, 1);
g.fillTriangle(x, y - 9, x + 7, y, x, y + 9);  // Right half
g.fillTriangle(x, y - 9, x - 7, y, x, y + 9);  // Left half
g.fillStyle(0x87ceeb, 1);
g.fillTriangle(x, y - 4, x + 3, y, x, y + 4);  // Inner highlight right
g.fillTriangle(x, y - 4, x - 3, y, x, y + 4);  // Inner highlight left
```

#### Powerup Icons
```typescript
this.load.image('rocket_h', 'assets/sprites/powerups/rocket_h.png');
this.load.image('rocket_v', 'assets/sprites/powerups/rocket_v.png');
this.load.image('bomb', 'assets/sprites/powerups/bomb.png');
this.load.image('color_bomb', 'assets/sprites/powerups/color_bomb.png');
this.load.image('propeller', 'assets/sprites/powerups/propeller.png');
```

## Tests

Tests are colocated with source files in `__tests__/` folders:
- `src/game/__tests__/` - Grid, match detection, powerup, booster tests
- `src/utils/__tests__/` - Easing, audio, haptic tests

Run with `npm test`.
