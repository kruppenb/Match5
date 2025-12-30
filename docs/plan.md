# Match5 - Master Development Plan

## Project Vision

Create a polished match-5 puzzle game inspired by Royal Match, playable on iPhone through a mobile browser (PWA). The game features satisfying match mechanics, progressive difficulty through obstacles, and engaging powerup combinations.

## Platform Strategy

### Why Browser/PWA?

Publishing to the iOS App Store requires:
- Apple Developer Account ($99/year)
- App review process (can take days/weeks)
- Following strict Apple guidelines
- Dealing with in-app purchase restrictions (30% cut)

**Our Approach: Progressive Web App (PWA)**
- Runs in Safari on iOS
- Can be "installed" via "Add to Home Screen"
- Full-screen experience, no browser UI
- Offline capable
- No app store needed
- Easy to update (just deploy new version)
- Works on desktop too for development

### Technology Recommendations

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Phaser.js** | Full game framework, great docs, WebGL | Larger bundle size | ✅ Best for features |
| **PixiJS** | Fast rendering, lightweight | Need to build game logic | Good middle ground |
| **Pure Canvas** | Smallest bundle, full control | More work | Good for learning |
| **React + Canvas** | Familiar if you know React | Overhead for games | Not recommended |

**Recommended Stack:**
- **Phaser 3** or **PixiJS** for rendering
- **TypeScript** for type safety
- **Vite** for fast development
- **Howler.js** for audio (if not using Phaser)

---

## Development Phases

### [Phase 1: Proof of Concept](phases/phase-1-poc.md)
**Goal:** Playable grid with basic matching and powerup creation  
**Duration:** 1-2 weeks

Key Deliverables:
- Rendered grid with colorful tiles
- Swipe/click-drag input handling
- Match detection (3, 4, 5+)
- Basic powerup creation (Rocket, Bomb, Color Bomb)
- Tiles fall and refill
- Works on mobile browser

Features:
- [Grid System](features/grid-system.md)
- [Matching Mechanics](features/matching-mechanics.md)
- [Powerups (Basic)](features/powerups.md)

---

### [Phase 2: Core Gameplay](phases/phase-2-gameplay.md)
**Goal:** Complete gameplay loop with objectives  
**Duration:** 2-3 weeks

Key Deliverables:
- Level objectives (clear grass, collect items)
- Move counter
- Win/lose conditions
- First obstacle: Grass tiles
- Level selection (10 levels)
- Powerup activation

Features:
- [Level Objectives](features/level-objectives.md)
- [Obstacles (Basic)](features/obstacles.md)

---

### [Phase 3: Content & Variety](phases/phase-3-content.md)
**Goal:** More obstacles, powerup combos, level variety  
**Duration:** 2-3 weeks

Key Deliverables:
- Additional obstacles (Ice, Chains, Boxes)
- Powerup combinations
- 30+ levels with progression
- Difficulty scaling (3-6 tile colors)
- Level editor (optional)

Features:
- [Obstacles (Advanced)](features/obstacles.md)
- [Powerup Combinations](features/powerups.md)

---

### [Phase 4: Polish & Effects](phases/phase-4-polish.md)
**Goal:** Juicy, satisfying game feel
**Duration:** 1-2 weeks

Key Deliverables:
- Particle effects for matches
- Screen shake on big combos
- Smooth animations (easing)
- Sound effects
- Background music
- Haptic feedback (if supported)

Features:
- [Animations](features/animations.md)
- [Audio](features/audio.md)

---

### [Phase 4.5: Visual Refresh](phases/phase-4.5-visual-refresh.md)
**Goal:** High-quality mobile-first visual experience
**Duration:** 1-2 weeks

Key Deliverables:
- 3D/high-quality gem sprites to replace vector drawings
- Themed background images with environmental depth
- Decorative game board frame with lighting effects
- High-quality obstacle sprites (grass, ice, chains, boxes, stone)
- Polished UI elements matching visual theme
- Sprite-based rendering system

Visual Targets:
- 6 distinct gem designs with shine and depth
- 5 themed backgrounds (Garden, Castle, Kitchen, Library, Sky Tower)
- Professional board frame with corner ornaments
- Cohesive visual style matching premium mobile games

---

### [Phase 5: Meta Game](phases/phase-5-meta.md)
**Goal:** Progression and replayability  
**Duration:** 2-3 weeks

Key Deliverables:
- Star rating per level (1-3 stars)
- Level progression map
- Lives system (optional, can skip for personal use)
- Coin/currency (optional)
- Daily challenges (optional)
- PWA installation prompt
- Offline support

---

## Feature Overview

| Feature | Phase | Priority | Document |
|---------|-------|----------|----------|
| Grid Rendering | 1 | Critical | [grid-system.md](features/grid-system.md) |
| Swipe Input | 1 | Critical | [grid-system.md](features/grid-system.md) |
| Match Detection | 1 | Critical | [matching-mechanics.md](features/matching-mechanics.md) |
| Tile Falling | 1 | Critical | [matching-mechanics.md](features/matching-mechanics.md) |
| Rocket Powerup | 1 | Critical | [powerups.md](features/powerups.md) |
| Bomb Powerup | 1 | Critical | [powerups.md](features/powerups.md) |
| Color Bomb | 1 | Critical | [powerups.md](features/powerups.md) |
| Grass Objective | 2 | High | [obstacles.md](features/obstacles.md) |
| Move Limit | 2 | High | [level-objectives.md](features/level-objectives.md) |
| Win/Lose States | 2 | High | [level-objectives.md](features/level-objectives.md) |
| Ice Obstacle | 3 | Medium | [obstacles.md](features/obstacles.md) |
| Chain Obstacle | 3 | Medium | [obstacles.md](features/obstacles.md) |
| Powerup Combos | 3 | Medium | [powerups.md](features/powerups.md) |
| Particle Effects | 4 | Medium | [animations.md](features/animations.md) |
| Sound Effects | 4 | Medium | [audio.md](features/audio.md) |
| Gem Sprites | 4.5 | High | [phase-4.5-visual-refresh.md](phases/phase-4.5-visual-refresh.md) |
| Background Images | 4.5 | High | [phase-4.5-visual-refresh.md](phases/phase-4.5-visual-refresh.md) |
| Board Frame | 4.5 | Medium | [phase-4.5-visual-refresh.md](phases/phase-4.5-visual-refresh.md) |
| Obstacle Sprites | 4.5 | Medium | [phase-4.5-visual-refresh.md](phases/phase-4.5-visual-refresh.md) |
| UI Visual Polish | 4.5 | Medium | [phase-4.5-visual-refresh.md](phases/phase-4.5-visual-refresh.md) |
| Level Map | 5 | Low | [level-objectives.md](features/level-objectives.md) |
| Stars/Rating | 5 | Low | [level-objectives.md](features/level-objectives.md) |

---

## Inspiration & Reference Games

### Royal Match
- Clean, fast-paced gameplay
- Effective powerups (Rockets, TNT, Light Ball)
- Pre-game boosters (placed before level starts)
- In-game boosters (used during play)
- Castle renovation meta-game
- Team/alliance features

### Candy Crush Saga
- Pioneer of modern match-3
- Level-based progression with map
- Various objectives per level
- Limited moves system
- Huge variety of obstacles

### Toon Blast
- Connected tiles instead of swap
- Similar powerup combinations
- Fast, fluid animations
- Team-based events

### Homescapes/Gardenscapes
- Story-driven progression
- Renovation meta-game
- Similar match mechanics to Royal Match

---

## Success Criteria

### Phase 1 Complete When:
- [ ] Can render an 8x8 grid of colored tiles
- [ ] Can swipe to swap adjacent tiles
- [ ] Matches of 3+ are detected and cleared
- [ ] Matching 4 creates a Rocket
- [ ] Matching 5+ creates a Bomb or Color Bomb
- [ ] Tiles fall to fill gaps
- [ ] New tiles spawn from top
- [ ] Runs smoothly on iPhone Safari
- [ ] Can be added to home screen

### Full Game Complete When:
- [ ] 50+ playable levels
- [ ] 5+ obstacle types
- [ ] All powerup combinations work
- [ ] Sound and music
- [ ] Polished animations
- [ ] Level progression saved locally
- [ ] Satisfying to play!

---

## Quick Start for Development

```bash
# Clone and setup
cd Match5
npm create vite@latest . -- --template vanilla-ts
npm install

# Add game library (choose one)
npm install phaser
# OR
npm install pixi.js

# Start development
npm run dev
```

Open on iPhone: Use your local IP (e.g., `http://192.168.1.100:5173`)

---

## Resources

- [Phaser 3 Documentation](https://phaser.io/docs)
- [PixiJS Documentation](https://pixijs.com/)
- [PWA Guide for iOS](https://web.dev/progressive-web-apps/)
- [Game Feel / Juice](https://www.youtube.com/watch?v=Fy0aCDmgnxg)
- [Match-3 Game Design](https://www.gamedeveloper.com/design)
