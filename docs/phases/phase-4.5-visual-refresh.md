# Phase 4.5: Visual Refresh

**Status:** 🔴 Not Started
**Duration:** 1-2 weeks
**Prerequisites:** [Phase 4: Polish](phase-4-polish.md)
**Goal:** Transform the game into a high-quality, visually stunning mobile experience

---

## Overview

This phase focuses on elevating the visual quality of the game to match premium mobile match-3 games like Royal Match and Candy Crush. The current implementation uses programmatically drawn vector shapes - this phase replaces them with high-quality 2D/3D sprite assets and adds environmental polish.

---

## Current State Assessment

### What We Have Now
- **Tiles:** Vector shapes drawn with Phaser Graphics (gems, droplets, stars, etc.)
- **Background:** Solid dark color (`0x1a1a2e`)
- **Board:** Simple rounded rectangle cell backgrounds
- **Obstacles:** Basic programmatic drawings (grass patterns, ice cracks, chain links)
- **Assets:** Only a favicon.svg in `/public`

### Target Quality
- **Tiles:** Pre-rendered 3D gem sprites with lighting, reflections, and depth
- **Background:** Themed environment images with parallax/depth layers
- **Board:** Decorative frame with themed borders and lighting effects
- **Obstacles:** High-quality textured sprites that fit the theme

---

## Deliverables Checklist

### 1. Gem/Tile Sprites
- [ ] Design 6 distinct gem types with unique silhouettes
- [ ] Create 3D-rendered or hand-painted sprites for each gem type
- [ ] Add highlight/shine layer for visual pop
- [ ] Create sprite variants for different states (idle, selected, about to match)
- [ ] Ensure gems are instantly distinguishable at small sizes
- [ ] Color-blind friendly design considerations

**Gem Design Guidelines:**
| Color | Shape | Reference Style |
|-------|-------|-----------------|
| Red | Ruby/Diamond cut | Faceted gem with inner glow |
| Blue | Teardrop/Sapphire | Liquid-looking with reflection |
| Green | Emerald/Leaf | Organic shape with vein details |
| Yellow | Star/Topaz | Radiant with golden shine |
| Purple | Amethyst cluster | Crystal formation with sparkle |
| Orange | Sun/Citrine | Warm radiance effect |

### 2. Powerup Sprites
- [ ] Horizontal Rocket - sleek design with motion blur hints
- [ ] Vertical Rocket - same design, rotated
- [ ] Bomb - classic round bomb with fuse animation frames
- [ ] Color Bomb - rainbow orb with swirling effect (animated)
- [ ] Propeller - paper airplane with motion trails
- [ ] Create "charged" variants showing power building

### 3. Background System
- [ ] Design main background image (1080x1920 minimum for retina)
- [ ] Create depth layers for parallax effect (optional)
- [ ] Implement subtle background animation (particles, floating elements)
- [ ] Design 3-5 themed backgrounds for different world areas
- [ ] Add vignette/gradient overlay for depth

**Suggested Themes:**
1. **Garden** (Levels 1-10): Lush greenery, flowers, butterflies
2. **Castle** (Levels 11-20): Stone walls, torches, royal banners
3. **Kitchen** (Levels 21-30): Cozy setting, warm colors, steam
4. **Library** (Levels 31-40): Bookshelves, candles, magical elements
5. **Sky Tower** (Levels 41-50): Clouds, stars, aurora effects

### 4. Game Board Frame
- [ ] Design decorative board frame/border
- [ ] Add corner ornaments that match theme
- [ ] Create subtle inner shadow on play area
- [ ] Add ambient glow/lighting around board edges
- [ ] Design board "tray" that tiles sit in

**Board Frame Elements:**
```
┌─────────────────────────┐
│  ╔═══════════════════╗  │  <- Outer decorative border
│  ║                   ║  │
│  ║   [Play Area]     ║  │  <- Inner shadow/depth
│  ║                   ║  │
│  ╚═══════════════════╝  │
│       [Ornaments]       │  <- Corner decorations
└─────────────────────────┘
```

### 5. Obstacle Sprites
- [ ] **Grass:** Lush grass texture with subtle sway animation
- [ ] **Ice:** Crystalline overlay with refraction effect
- [ ] **Double Ice:** Thicker, frosted variant
- [ ] **Chain:** Metallic links with shine
- [ ] **Box/Crate:** Wood texture with grain, damage states
- [ ] **Stone:** Rocky texture with moss/cracks

### 6. Cell/Tile Background
- [ ] Design cell background texture (subtle pattern)
- [ ] Create alternating cell pattern (checkerboard or subtle variation)
- [ ] Add depth shadow under each cell
- [ ] Design "empty" cell state for blocked positions

### 7. UI Visual Upgrade
- [ ] Redesign move counter with themed frame
- [ ] Update objective icons with higher quality versions
- [ ] Add decorative header bar design
- [ ] Create themed buttons (menu, retry, etc.)
- [ ] Design end screen overlays with polish

---

## Technical Implementation

### Asset Organization
```
assets/
├── sprites/
│   ├── gems/
│   │   ├── red.png
│   │   ├── blue.png
│   │   ├── green.png
│   │   ├── yellow.png
│   │   ├── purple.png
│   │   └── orange.png
│   ├── powerups/
│   │   ├── rocket_h.png
│   │   ├── rocket_v.png
│   │   ├── bomb.png
│   │   ├── bomb_animated.json  (spritesheet)
│   │   ├── color_bomb.png
│   │   └── propeller.png
│   ├── obstacles/
│   │   ├── grass.png
│   │   ├── ice_1.png
│   │   ├── ice_2.png
│   │   ├── chain.png
│   │   ├── box_1.png
│   │   ├── box_2.png
│   │   ├── box_3.png
│   │   └── stone.png
│   └── ui/
│       ├── frame_corner.png
│       ├── frame_edge.png
│       ├── button_play.png
│       └── ...
├── backgrounds/
│   ├── garden/
│   │   ├── bg_main.png
│   │   ├── bg_layer1.png (optional parallax)
│   │   └── bg_layer2.png
│   ├── castle/
│   └── ...
└── spritesheets/
    ├── gems_atlas.json
    └── effects_atlas.json
```

### Sprite Specifications
| Asset Type | Size | Format | Notes |
|------------|------|--------|-------|
| Gem sprites | 128x128px | PNG-24 | Transparent, pre-multiplied alpha |
| Powerup sprites | 128x128px | PNG-24 | May need animation frames |
| Obstacle overlays | 128x128px | PNG-24 | Semi-transparent for ice |
| Background | 1080x1920px | JPG/PNG | Optimized for file size |
| UI elements | Variable | PNG-24 | 9-slice where applicable |

### Loading Strategy
```typescript
// Preload phase
preload(): void {
  // Load gem spritesheet for efficiency
  this.load.atlas('gems', 'assets/spritesheets/gems_atlas.png',
                          'assets/spritesheets/gems_atlas.json');

  // Load background for current theme
  const theme = this.getThemeForLevel(this.levelId);
  this.load.image(`bg_${theme}`, `assets/backgrounds/${theme}/bg_main.png`);

  // Load obstacle sprites
  this.load.image('obstacle_grass', 'assets/sprites/obstacles/grass.png');
  // ...
}
```

### Rendering Changes

**Current (TileRenderer.ts):**
```typescript
// Programmatic drawing
static drawGem(graphics: Graphics, color: number, halfSize: number): void {
  graphics.fillStyle(color, 1);
  graphics.beginPath();
  // ... vector drawing code
}
```

**New (SpriteRenderer.ts):**
```typescript
// Sprite-based rendering
class SpriteRenderer {
  createTileSprite(scene: Scene, tile: Tile): Sprite {
    const frame = tile.type; // 'red', 'blue', etc.
    const sprite = scene.add.sprite(0, 0, 'gems', frame);
    sprite.setScale(this.tileSize / 128); // Scale to fit cell
    return sprite;
  }
}
```

---

## Asset Creation Options

### Option 1: AI-Generated Assets
- Use Midjourney/DALL-E/Stable Diffusion to generate gem concepts
- Clean up in image editor
- Pros: Fast, unique style
- Cons: May need iteration, consistency challenges

### Option 2: Asset Marketplaces
- [itch.io](https://itch.io/game-assets) - Indie game assets
- [Unity Asset Store](https://assetstore.unity.com) - High quality packs
- [Craftpix](https://craftpix.net) - Match-3 specific assets
- [GameDevMarket](https://www.gamedevmarket.net)
- Pros: Professional quality, ready to use
- Cons: Cost, may not be unique

### Option 3: Commission Artist
- Hire on Fiverr, Upwork, or ArtStation
- Pros: Custom, cohesive style
- Cons: Time, cost, communication

### Option 4: Hand-Create
- Use Blender for 3D renders
- Use Aseprite/Photoshop for 2D
- Pros: Full control, learning experience
- Cons: Significant time investment

**Recommended Approach:**
Start with high-quality free/purchased assets to establish the visual target, then iterate or commission custom assets if needed.

---

## Visual Style Guide

### Color Palette
```
Primary Background: #1a1a2e (deep blue-purple)
Secondary: #2a2a3e (lighter panel color)
Accent Gold: #ffd700 (highlights, stars, rewards)
Accent Green: #44ff44 (success, grass)
Warning Red: #ff4444 (low moves, errors)
```

### Gem Color Values (Reference)
```
Red:    #ff4444 -> Warm ruby red
Blue:   #4444ff -> Deep sapphire blue
Green:  #44ff44 -> Emerald green
Yellow: #ffff44 -> Golden topaz
Purple: #aa44ff -> Amethyst violet
Orange: #ffaa44 -> Citrine amber
```

### Visual Hierarchy
1. **Gems** - Highest contrast, most saturated
2. **Powerups** - Glowing, attention-grabbing
3. **Obstacles** - Visible but not distracting
4. **Board** - Subtle frame, supports gems
5. **Background** - Atmospheric, doesn't compete

### Lighting Direction
- Consistent top-left light source across all assets
- Gems have top-left highlight, bottom-right shadow
- Creates unified, cohesive look

---

## Animation Considerations

### Idle Animations (Subtle)
- Gems: Gentle pulse/shimmer every few seconds
- Powerups: Continuous glow pulse
- Color bomb: Slowly rotating rainbow
- Bomb fuse: Subtle spark animation

### State Animations
- **Hover/Selected:** Slight scale up (1.05x)
- **About to Match:** Quick pulse
- **Clearing:** Pop + particles (existing)

---

## Performance Considerations

### Mobile Optimization
- Use texture atlases to reduce draw calls
- Keep sprites under 2048x2048 per atlas
- Compress backgrounds (JPG for static, PNG for transparency)
- Consider WebP format for modern browsers
- Lazy load backgrounds for levels not yet visited

### Memory Management
- Unload unused theme assets when switching worlds
- Use object pooling for particles/effects
- Target < 50MB total asset size

---

## Testing Checklist

### Visual Quality
- [ ] Gems are easily distinguishable at game size
- [ ] Colors work for color-blind players (test with simulator)
- [ ] No visual artifacts or aliasing
- [ ] Consistent style across all elements

### Performance
- [ ] Maintains 60fps on target devices
- [ ] Load time under 3 seconds on 4G
- [ ] No memory leaks during extended play
- [ ] Smooth animations on older devices

### Mobile Experience
- [ ] Assets look sharp on retina displays
- [ ] Touch targets remain accurate with new sprites
- [ ] No visual overflow or clipping
- [ ] Backgrounds work in both orientations (if supported)

---

## Success Criteria

Phase 4.5 is complete when:

1. [ ] All 6 gem types have high-quality sprite assets
2. [ ] All powerups use sprite-based rendering
3. [ ] At least one themed background is implemented
4. [ ] Game board has decorative frame
5. [ ] All obstacles use quality sprite assets
6. [ ] Cell backgrounds have subtle texture/pattern
7. [ ] UI elements match the visual style
8. [ ] Performance targets are met (60fps, <3s load)
9. [ ] Game looks comparable to commercial match-3 games
10. [ ] Visual style is cohesive and polished

---

## Resources

### Inspiration
- [Royal Match](https://www.youtube.com/watch?v=example) - Clean, polished style
- [Candy Crush](https://www.king.com/game/candycrush) - Iconic gem designs
- [Homescapes](https://www.playrix.com/homescapes/) - Cozy aesthetic
- [Toon Blast](https://www.peakgames.com/toon-blast/) - Colorful, cartoonish

### Tools
- [TexturePacker](https://www.codeandweb.com/texturepacker) - Sprite atlases
- [TinyPNG](https://tinypng.com) - Image compression
- [Aseprite](https://www.aseprite.org) - Pixel art editor
- [Blender](https://www.blender.org) - 3D rendering (free)

### Asset Sources
- [Kenney.nl](https://kenney.nl/assets) - Free game assets
- [OpenGameArt](https://opengameart.org) - Free community assets
- [itch.io Assets](https://itch.io/game-assets/tag-match-3) - Match-3 specific

---

## Next Phase

After completing the visual refresh, proceed to [Phase 5: Meta Game](phase-5-meta.md) to add progression systems, star ratings, level maps, and PWA features.
