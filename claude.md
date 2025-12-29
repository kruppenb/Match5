# Match5 Game - Copilot Instructions

## Project Overview

Match5 is a tile-matching puzzle game inspired by Royal Match and Candy Crush Saga. The game features a grid-based puzzle where players swipe to match 3 or more icons of the same color/shape to complete level objectives.

## Technology Stack

- **Framework**: Web-based using HTML5 Canvas or PixiJS for rendering
- **Language**: TypeScript
- **Build Tool**: Vite
- **Target Platform**: Mobile browser (iOS Safari) - runs as a Progressive Web App (PWA)
- **Game Engine Consideration**: Can be pure canvas/WebGL or use Phaser.js/PixiJS

## Core Game Mechanics

### Matching System
- Players swipe/drag to swap adjacent tiles
- Minimum match: 3 tiles in a row/column
- Matches of 4+ create powerups
- Matches of 5+ create super powerups
- Cascade/chain reactions when tiles fall after matches

### Powerup System (Phase 1)
- **Rocket/Line Blast** (4 match): Clears entire row OR column
- **Bomb/TNT** (L/T shape or 5 in a row): Clears 3x3 area around it
- **Color Bomb/Light Ball** (5+ match): Clears all tiles of a selected color

### Powerup Combinations (Later Phases)
- Rocket + Rocket = Cross blast (row AND column)
- Bomb + Bomb = Larger explosion (5x5)
- Color Bomb + Rocket = All tiles of color become rockets
- Color Bomb + Bomb = All tiles of color become bombs
- Color Bomb + Color Bomb = Clear entire board

### Level Objectives
- Clear grass/tiles underneath blocks
- Collect specific items
- Reach target score
- Clear obstacles (ice, chains, boxes)
- Limited moves per level

### Obstacles (Introduced Gradually)
1. **Grass** - Cleared when matched on top
2. **Ice** - Single layer, cleared with one match
3. **Double Ice** - Two layers, needs two matches
4. **Chains** - Lock tiles in place
5. **Boxes/Crates** - Block tile movement, cleared by adjacent matches
6. **Stone** - Cannot be moved or matched, must be destroyed by powerups
7. **Portals** - Tiles teleport between connected portals
8. **Honey/Slime** - Spreads each turn if not cleared

## Project Structure

```
Match5/
├── .github/
│   └── copilot-instructions.md
├── docs/
│   ├── plan.md                    # Master plan overview
│   ├── phases/
│   │   ├── phase-1-poc.md         # Proof of Concept
│   │   ├── phase-2-gameplay.md    # Core Gameplay Loop
│   │   ├── phase-3-content.md     # Content & Levels
│   │   ├── phase-4-polish.md      # Polish & Effects
│   │   └── phase-5-meta.md        # Meta Game Features
│   └── features/
│       ├── grid-system.md
│       ├── matching-mechanics.md
│       ├── powerups.md
│       ├── obstacles.md
│       ├── level-objectives.md
│       ├── animations.md
│       └── audio.md
├── src/
│   ├── index.html
│   ├── main.ts
│   ├── game/
│   │   ├── Game.ts
│   │   ├── Grid.ts
│   │   ├── Tile.ts
│   │   ├── Match.ts
│   │   ├── Powerup.ts
│   │   └── Level.ts
│   ├── input/
│   │   └── SwipeHandler.ts
│   ├── rendering/
│   │   └── Renderer.ts
│   └── utils/
│       └── helpers.ts
├── assets/
│   ├── images/
│   └── audio/
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Development Guidelines

### Code Style
- Use TypeScript strict mode
- Prefer composition over inheritance
- Keep game logic separate from rendering
- Use constants for game configuration (grid size, colors, timing)

### Mobile-First Design
- Touch input is primary (swipe gestures)
- Mouse input for desktop testing
- Responsive canvas sizing
- Target 60 FPS on mobile devices

### Testing Strategy
- Unit tests for matching logic
- Visual testing for animations
- Performance profiling on actual iOS device

## Deployment

The game will be deployed as a PWA that can be:
1. Hosted on any static hosting (Vercel, Netlify, GitHub Pages)
2. Added to iOS home screen via Safari "Add to Home Screen"
3. This avoids App Store publishing while providing native-like experience

## Key Files to Reference

- [docs/plan.md](docs/plan.md) - Master development plan
- [docs/phases/phase-1-poc.md](docs/phases/phase-1-poc.md) - Current phase details
- [docs/features/powerups.md](docs/features/powerups.md) - Powerup specifications
