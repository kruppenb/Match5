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

### Boosters
- `hammer`: Destroy single tile
- `row_arrow`: Clear entire row
- `col_arrow`: Clear entire column
- `shuffle`: Reshuffle board

### Heroes
Three selectable heroes with chargeable powers:
- **Thor**: Lightning strikes random tiles
- **Iron Man**: Missile barrage with 2x2 explosions
- **Elsa**: Ice wave clears multiple rows/columns

## Documentation

| Doc | Contents |
|-----|----------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Code structure and file organization |
| [ASSETS.md](docs/ASSETS.md) | Asset paths and icon usage patterns |
| [ASSET_GENERATION.md](docs/ASSET_GENERATION.md) | Gemini AI image generation |
| [docs/features/](docs/features/) | Detailed feature specs (powerups, obstacles, etc.) |
| [docs/phases/](docs/phases/) | Development phase documentation |

## Tests

Tests are colocated with source files in `__tests__/` folders:
- `src/game/__tests__/` - Grid, match detection, powerup, booster tests
- `src/utils/__tests__/` - Easing, audio, haptic tests

Run with `npm test`.

## Quick Reference

### File Locations
- **Scenes**: `src/scenes/` (TitleScene, GameScene, LevelSelectScene, etc.)
- **Game Logic**: `src/game/` (Grid, MatchDetector, powerupUtils, etc.)
- **Rendering**: `src/rendering/` (TileRenderer, ObstacleRenderer)
- **Meta Systems**: `src/meta/` (CurrencyManager, InventoryManager)
- **Utilities**: `src/utils/` (AudioManager, ParticleManager, etc.)
- **Assets**: `public/assets/` (sprites, backgrounds, audio)

### Icon Usage (IMPORTANT)
**Never use emoji placeholders.** See [ASSETS.md](docs/ASSETS.md) for proper asset loading patterns.
