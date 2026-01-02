# Phase 5: Hero Polish & Character Powers

**Status:** 🔴 Not Started  
**Duration:** 2-3 weeks  
**Prerequisites:** [Phase 4.5: Visual Refresh](phase-4.5-visual-refresh.md)  
**Goal:** Transform boosters into awesome, chunky abilities with satisfying visuals, and introduce dynamic character power-ups that activate during chain combos

---

## Overview

This phase is about making the game feel **premium and polished**. No more placeholders - everything should look and feel like a high-quality mobile game. The focus is on:

1. **Booster Visual Overhaul** - Replace basic icons with chunky, awesome ability icons
2. **Character Power System** - Characters pop in during combos and do spectacular things
3. **Final Polish Pass** - Eliminate all placeholder assets and ensure cohesive visual style

---

## Deliverables Checklist

### Booster Icon Upgrades
- [ ] **Hammer** - Upgrade to chunky, powerful smash effect
- [ ] **Beam (Vertical)** - Upgrade to devastating energy beam
- [ ] **Arrow (Horizontal)** - Upgrade to fast, impactful sweep
- [ ] **Lucky 67 Shuffle** - Upgrade with cosmic/magical effect

### Hero Power Bar System
- [ ] Power bar UI component (background, fill, frame)
- [ ] Charge tracking logic (tiles, cascades, powerups)
- [ ] Bar fill animation with glow effects
- [ ] "READY!" flash animation when bar is full
- [ ] Hero selection popup with 3 hero portraits
- [ ] Popup slide-in/slide-out animations
- [ ] Hero selection highlight and confirmation
- [ ] Integration with game flow (pause on ready, resume after activation)

### Hero Powers
- [ ] Thor's Lightning Storm power
- [ ] Iron Man's Missile Barrage power
- [ ] Elsa's Ice Wave power
- [ ] Hero pop-in animation system
- [ ] Power activation visual effects
- [ ] Audio cues for hero appearances and powers

### Asset Completion
- [ ] All booster sprites (final quality, no placeholders)
- [ ] All character sprites (final quality, no placeholders)
- [ ] Hero Power Bar UI assets
- [ ] Hero selection popup assets
- [ ] All particle effects for powers
- [ ] UI polish for booster selection

---

## Part 1: Booster Visual Overhaul

### Current State
The game has 4 boosters with these assets:
- `hammer.png` → destroys single tile
- `arrow_h.png` → clears row
- `beam_v.png` → clears column
- `lucky67.png` → reshuffles board

### Upgraded Booster Designs

#### 1. Hammer (Single Tile Smash)
**Visual Design:**
- Chunky 3D hammer with weathered metal texture
- Energy/lightning crackling around the hammer head
- Runes or 67 branding glowing on the handle
- Impact creates burst effect

**Animation Sequence:**
1. Hammer flies in from top-right with spin
2. Pauses dramatically above target tile
3. SLAMS down with screen shake
4. Energy explosion radiates outward
5. Impact sound effect

**Asset Requirements:**
```
boosters/hammer.png           - Main icon (256x256) - UPGRADE existing
boosters/hammer_glow.png      - Charged/hover state
effects/hammer_impact.png     - Impact particle
effects/energy_burst.png      - Burst particles
audio/hammer_strike.mp3       - Impact sound
```

**AI Image Prompt:**
```
A chunky, powerful fantasy hammer icon for a mobile game, isometric view, 
glowing energy crackling around the metal head, ornate design,
dramatic lighting, game UI style, transparent background, 
high detail, 3D rendered look, weighty and impactful
```

---

#### 2. Beam (Column Clear → Vertical Energy Beam)
**Visual Design:**
- Glowing energy beam with arc-reactor style core
- Chunky metallic emitter at top
- Energy charging effect when selected
- Tiles vaporize in sequence

**Animation Sequence:**
1. Emitter appears at top of target column
2. Core glows and charges (0.3s)
3. MASSIVE beam fires downward
4. Tiles explode in sequence with energy ripples
5. Energy whine + explosion sounds

**Asset Requirements:**
```
boosters/beam_v.png            - Beam icon (256x256) - UPGRADE existing
boosters/beam_charging.png     - Charging state
effects/beam_segment.png       - Beam particle
effects/energy_ring.png        - Impact rings
audio/beam_charge.mp3          - Charging sound
audio/beam_fire.mp3            - Firing sound
```

**AI Image Prompt:**
```
Vertical energy beam icon for mobile game, chunky 3D game icon style,
glowing blue-white core with energy rings, high-tech emitter design,
mobile game UI asset, transparent background, dramatic lighting, high detail
```

---

#### 3. Arrow (Row Clear → Horizontal Sweep)
**Visual Design:**
- Sleek projectile/disc design
- Motion blur streaks showing speed
- Impact sparks on contact
- Trail effect as it crosses

**Animation Sequence:**
1. Projectile spins in from left side
2. Sweeps across the row at high speed
3. Each tile hit creates impact spark
4. Projectile exits right side with trail
5. Whoosh + impact sounds

**Asset Requirements:**
```
boosters/arrow_h.png           - Arrow icon (256x256) - UPGRADE existing
boosters/arrow_motion.png      - Motion blur variant
effects/arrow_impact.png       - Impact sparks
effects/arrow_trail.png        - Motion trail
audio/arrow_throw.mp3          - Launch sound
audio/arrow_hit.mp3            - Each impact
```

**AI Image Prompt:**
```
Horizontal projectile/arrow icon for mobile game, chunky 3D game icon style, 
sleek aerodynamic design with energy glow, motion blur suggesting speed,
game UI asset, transparent background, dramatic lighting, high detail
```

---

#### 4. Lucky 67 Shuffle (Board Reshuffle → Reality Warp)
**Visual Design:**
- Keep the Lucky 67 branding
- Add cosmic/magical swirl effect
- Multiple gem colors spiraling
- Reality-bending visual distortion

**Animation Sequence:**
1. Cosmic portal opens at center of board
2. All tiles get pulled toward center (0.3s)
3. Magic flash - screen effects
4. Tiles explode outward to new positions
5. Magical whoosh + sparkle sounds

**Asset Requirements:**
```
boosters/lucky67.png           - Lucky 67 icon (256x256) - UPGRADE existing
boosters/lucky67_active.png    - Active/glowing state
effects/shuffle_warp.png       - Distortion effect
effects/shuffle_particles.png  - Gem-colored particles
audio/shuffle_charge.mp3       - Building power
audio/shuffle_pop.mp3          - The shuffle moment
```

**AI Image Prompt:**
```
Lucky 67 magical shuffle icon for mobile game, abstract swirl design with 
glowing gems (red, blue, yellow, purple, green, orange) spiraling inward,
cosmic/magical energy effects, "67" incorporated subtly,
game UI style, transparent background, high detail
```

---

## Part 2: Hero Power Bar System

### Concept
A power bar charges up as players earn points during gameplay. Once the bar fills completely, players choose one of three heroes to activate a devastating board-clearing ability. This creates a strategic moment of player choice and provides a guaranteed "hero moment" each level.

### Design Goals
- **One use per level** when playing normally
- **2-3 uses per level** if player gets lucky with cascades
- Creates anticipation as bar fills up
- Player agency in choosing which hero to use
- Spectacular payoff that feels rewarding

### Existing Characters
You already have these character assets:
- `characters/thor.png`
- `characters/ironman.jpeg`
- `characters/elsa.jpeg`

These will be upgraded to high-quality sprites with action poses.

---

### Hero Power Bar Mechanics

#### Bar Charging
| Points Earned | Bar Fill Rate | Notes |
|---------------|---------------|-------|
| Per tile cleared | +1% | Base scoring |
| Per cascade level | +5% bonus | Cascades are rewarded |
| Powerup activation | +3% bonus | Using rockets/bombs |
| Combo multiplier | x1.5 | Applied to all gains |

**Target balance:**
- Average level completion = 1 full bar (100%)
- Lucky cascade run = 200-300% (2-3 uses)
- Bar resets after hero selection

#### Bar UI Design
```
┌─────────────────────────────────────┐
│ [Hero Icon] ████████████░░░░░░ 73%  │
└─────────────────────────────────────┘
```

- Positioned at top of screen, below moves counter
- Glows and pulses as it approaches 100%
- Hero silhouette icon on the left side
- Animated fill with particle effects
- "READY!" flash when bar reaches 100%

---

### Hero Selection Popup

When the bar reaches 100%, gameplay pauses and a hero selection popup appears:

```
┌─────────────────────────────────────────┐
│          ⚡ HERO POWER READY! ⚡         │
├─────────────────────────────────────────┤
│                                         │
│   ┌─────┐    ┌─────┐    ┌─────┐        │
│   │THOR │    │IRON │    │ELSA │        │
│   │ ⚡  │    │ MAN │    │ ❄️  │        │
│   │     │    │ 🚀  │    │     │        │
│   └─────┘    └─────┘    └─────┘        │
│   Lightning   Missile    Ice           │
│   Storm       Barrage    Wave          │
│                                         │
│         Tap a hero to activate!         │
└─────────────────────────────────────────┘
```

**Popup Behavior:**
1. Bar hits 100% → "READY!" animation plays
2. Current cascades complete (don't interrupt)
3. Board freezes, popup slides in from top
4. Three hero portraits displayed with names
5. Subtle idle animations on each hero
6. Player taps to select
7. Popup dismisses, selected hero flies in
8. Hero power activates
9. Bar resets to 0%

**Selection Animation:**
- Selected hero portrait scales up with glow
- Other heroes fade out
- Dramatic transition to power activation

---

### Character Powers

#### 1. Thor - Lightning Storm
**Power:** Lightning strikes 5-7 random tiles on the board (guaranteed value since player chose to use it)

**Visual:**
- Thor portrait pops in from side (0.2s)
- Raises hammer dramatically
- Lightning bolts strike random tiles
- Each strike clears tile + small area damage
- Thunder roar audio

**Animation:**
```
[Thor appears] → [Dramatic pose] → [Lightning strikes] → [Thor exits]
      0.2s           0.3s              0.5s                 0.2s
```

**Asset Requirements:**
```
characters/thor/portrait.png      - Upper body portrait (512x512) - REPLACE thor.png
characters/thor/action.png        - Action pose with raised hammer
effects/lightning_bolt.png        - Lightning bolt effect
audio/thor_appear.mp3             - Appearance sound
audio/thor_power.mp3              - Thunder crack
```

**AI Image Prompt:**
```
Thor character, upper body portrait, heroic pose, holding hammer raised,
lightning crackling in background, cartoon/mobile game style, expressive face,
chunky stylized look, transparent background, vibrant colors
```

---

#### 2. Iron Man - Missile Barrage
**Power:** Fires 4 missiles that each clear a 2x2 area (guaranteed 4 missiles)

**Visual:**
- Iron Man flies in from corner
- Shoulder pods open
- Missiles launch with smoke trails
- Each missile creates explosion on impact
- Tech sounds + explosions

**Animation:**
```
[Fly in] → [Hover + Target Lock] → [Fire Missiles] → [Explosions] → [Fly out]
   0.2s          0.3s                  0.4s            0.3s           0.2s
```

**Asset Requirements:**
```
characters/ironman/portrait.png   - Upper body portrait (512x512) - REPLACE ironman.jpeg
characters/ironman/action.png     - Missiles launching pose
effects/missile.png               - Missile sprite
effects/explosion.png             - Explosion effect
audio/ironman_appear.mp3          - Flight sound
audio/ironman_power.mp3           - Missiles + explosion
```

**AI Image Prompt:**
```
Iron Man character, upper body portrait, flying pose,
glowing chest piece, shoulder missile pods visible, 
cartoon/mobile game style, chunky stylized look,
transparent background, dramatic lighting, vibrant red and gold
```

---

#### 3. Elsa - Ice Wave
**Power:** Freezes 3 random rows or columns, then shatters all frozen tiles

**Visual:**
- Elsa glides in with ice trail
- Extends hands toward board
- Ice crystals spread across 2-3 rows/columns
- Frozen tiles shimmer
- Ice shatters spectacularly

**Animation:**
```
[Glide in] → [Ice Magic Pose] → [Freeze Spread] → [Shatter] → [Exit]
   0.2s           0.3s              0.4s           0.3s        0.2s
```

**Asset Requirements:**
```
characters/elsa/portrait.png      - Upper body portrait (512x512) - REPLACE elsa.jpeg
characters/elsa/action.png        - Casting ice magic pose
effects/ice_crystal.png           - Ice crystal particles
effects/ice_shatter.png           - Shatter effect
audio/elsa_appear.mp3             - Magical chime
audio/elsa_power.mp3              - Ice magic sounds
```

**AI Image Prompt:**
```
Elsa character, upper body portrait, magical ice casting pose,
hands extended with ice magic swirling, confident expression,
cartoon/mobile game style, chunky stylized look,
transparent background, blue and white color scheme
```

---

### Hero Power Bar Implementation

```typescript
// Hero Power Bar System
export type HeroType = 'thor' | 'ironman' | 'elsa';

export interface HeroPower {
  hero: HeroType;
  name: string;
  description: string;
  getAffectedPositions: (grid: Grid) => Position[];
  animationDuration: number;   // Total animation time in ms
}

export interface HeroPowerBarState {
  currentCharge: number;       // 0-100
  isReady: boolean;            // true when >= 100
  isSelectionOpen: boolean;    // true when popup is showing
  selectedHero: HeroType | null;
}

// Charge rates for the power bar
export const POWER_BAR_CONFIG = {
  chargePerTile: 1,            // +1% per tile cleared
  chargePerCascade: 5,         // +5% bonus per cascade level
  chargePerPowerup: 3,         // +3% when powerup activates
  comboMultiplier: 1.5,        // Multiplier for combo chains
  maxCharge: 100,              // Bar fills at 100
};

// Hero configuration
export const HERO_POWERS: Record<HeroType, HeroPower> = {
  thor: {
    hero: 'thor',
    name: 'Lightning Storm',
    description: 'Thor summons lightning to strike random tiles',
    getAffectedPositions: (grid) => {
      // Always returns 5-7 random tile positions
      const count = 5 + Math.floor(Math.random() * 3);
      return getRandomPositions(grid, count);
    },
    animationDuration: 1200,
  },
  ironman: {
    hero: 'ironman',
    name: 'Missile Barrage',
    description: 'Iron Man fires missiles that explode in 2x2 areas',
    getAffectedPositions: (grid) => {
      // Always fires 4 missiles with 2x2 impact each
      const positions: Position[] = [];
      for (let i = 0; i < 4; i++) {
        const center = getRandomPosition(grid);
        positions.push(...get2x2Area(center));
      }
      return [...new Set(positions)]; // Dedupe overlapping areas
    },
    animationDuration: 1400,
  },
  elsa: {
    hero: 'elsa',
    name: 'Ice Wave',
    description: 'Elsa freezes and shatters rows or columns',
    getAffectedPositions: (grid) => {
      // Always freezes 3 random rows or columns
      return getRandomRowsOrCols(grid, 3);
    },
    animationDuration: 1500,
  },
};

// Power bar manager
export class HeroPowerBar {
  private state: HeroPowerBarState = {
    currentCharge: 0,
    isReady: false,
    isSelectionOpen: false,
    selectedHero: null,
  };

  addCharge(amount: number, multiplier: number = 1): void {
    this.state.currentCharge = Math.min(
      this.state.currentCharge + (amount * multiplier),
      POWER_BAR_CONFIG.maxCharge
    );
    if (this.state.currentCharge >= POWER_BAR_CONFIG.maxCharge) {
      this.state.isReady = true;
    }
  }

  openSelection(): void {
    if (this.state.isReady) {
      this.state.isSelectionOpen = true;
    }
  }

  selectHero(hero: HeroType): void {
    this.state.selectedHero = hero;
    this.state.isSelectionOpen = false;
  }

  activatePower(): HeroPower | null {
    if (!this.state.selectedHero) return null;
    const power = HERO_POWERS[this.state.selectedHero];
    this.reset();
    return power;
  }

  reset(): void {
    this.state = {
      currentCharge: 0,
      isReady: false,
      isSelectionOpen: false,
      selectedHero: null,
    };
  }

  getState(): HeroPowerBarState {
    return { ...this.state };
  }
}
```

---

## Part 3: Visual Polish Pass

### Assets to Complete/Replace

#### Booster UI Bar
- [ ] Upgrade booster button backgrounds
- [ ] Cooldown/count indicator overlay
- [ ] Selection highlight effect
- [ ] Disabled state visual

#### Character Pop-in Frame
- [ ] Portrait frame/border design
- [ ] Entry animation (slide + scale)
- [ ] Exit animation (fade + slide)
- [ ] Power name text banner

#### Particle Effects
- [ ] Lightning bolt particles (Thor)
- [ ] Missile trail particles (Iron Man)
- [ ] Ice crystal particles (Elsa)
- [ ] Shuffle swirl particles (Lucky 67)
- [ ] Impact/explosion particles for each booster

#### Audio Polish
- [ ] Character power sounds
- [ ] Power activation sounds
- [ ] Whoosh/impact sounds for each ability
- [ ] Ensure all audio is high quality

---

## Asset Specifications

### Sprite Sizes
| Asset Type | Size | Format | Notes |
|------------|------|--------|-------|
| Booster icons | 256x256px | PNG-24 | With glow/active variants |
| Character portraits | 512x512px | PNG-24 | Upper body, expressive |
| Character action poses | 512x512px | PNG-24 | Power activation pose |
| Effect particles | 128x128px | PNG-24 | Additive blend ready |
| UI elements | Variable | PNG-24 | 9-slice for buttons |

### File Organization
```
public/assets/sprites/
├── boosters/
│   ├── hammer.png         (UPGRADE)
│   ├── hammer_glow.png    (NEW)
│   ├── beam_v.png         (UPGRADE)
│   ├── beam_charging.png  (NEW)
│   ├── arrow_h.png        (UPGRADE)
│   ├── arrow_motion.png   (NEW)
│   ├── lucky67.png        (UPGRADE)
│   └── lucky67_active.png (NEW)
├── characters/
│   ├── thor/
│   │   ├── portrait.png   (REPLACE thor.png)
│   │   └── action.png     (NEW)
│   ├── ironman/
│   │   ├── portrait.png   (REPLACE ironman.jpeg)
│   │   └── action.png     (NEW)
│   └── elsa/
│       ├── portrait.png   (REPLACE elsa.jpeg)
│       └── action.png     (NEW)
└── effects/
    ├── lightning_bolt.png
    ├── missile.png
    ├── missile_explosion.png
    ├── ice_crystal.png
    ├── ice_shatter.png
    ├── energy_burst.png
    └── shuffle_warp.png
```

---

## Implementation Plan

### Week 1: Booster Visual Overhaul
1. Generate/source upgraded booster icons
2. Implement new booster sprites in BoosterBar
3. Create charged/active states
4. Add booster activation animations
5. Polish sound effects for each

### Week 2: Hero Power Bar System
1. Implement HeroPowerBar class with charge tracking
2. Build power bar UI component with fill animation
3. Create hero selection popup with 3 hero portraits
4. Implement popup open/close animations
5. Hook up charging to tile clears, cascades, and powerups

### Week 3: Hero Powers & Polish
1. Implement Thor's Lightning Storm power
2. Implement Iron Man's Missile Barrage power
3. Implement Elsa's Ice Wave power
4. Add hero pop-in and power activation animations
5. Audio integration (charge sounds, power sounds)
6. Particle effect polish for all powers
7. Final testing on mobile devices

---

## Success Criteria

Phase 5 is complete when:

1. [ ] All 4 boosters have chunky, high-quality icons (no emoji/placeholder)
2. [ ] Booster activation animations are satisfying and impactful
3. [ ] Hero Power Bar charges up during gameplay (~1 fill per level normally)
4. [ ] Hero selection popup appears when bar is full
5. [ ] Player can choose between 3 heroes with distinct powers
6. [ ] All 3 hero powers work correctly and feel impactful
7. [ ] Hero pop-in animations are smooth and exciting
8. [ ] All particle effects are polished
9. [ ] Audio cues enhance every power activation
10. [ ] No placeholder assets remain in the game
11. [ ] Performance maintained at 60fps on mobile
12. [ ] Game feels premium and polished

---

## Quality Bar

### "Does it feel awesome?"
Each interaction should pass this test:
- [ ] **Hammer** - Does it feel like wielding godly power?
- [ ] **Beam** - Does it feel high-tech and devastating?
- [ ] **Arrow** - Does it feel fast, precise, and badass?
- [ ] **Lucky 67 Shuffle** - Does it feel magical and exciting?
- [ ] **Hero Power Bar** - Does watching it fill create anticipation?
- [ ] **Hero Selection** - Does choosing a hero feel like a meaningful decision?
- [ ] **Hero Powers** - Do they feel like a spectacular reward for filling the bar?

### Polish Checklist per Feature
- [ ] Anticipation (wind-up before action)
- [ ] Impact (satisfying hit/effect)
- [ ] Follow-through (trails, particles, screen shake)
- [ ] Audio (layered sounds, satisfying)
- [ ] Feedback (screen shake, flash, haptic)

---

## Resources

### AI Image Generation
- [Midjourney](https://midjourney.com) - Best for stylized game art
- [DALL-E 3](https://openai.com/dall-e-3) - Good for icons and UI
- [Leonardo.AI](https://leonardo.ai) - Game asset focused
- [Stable Diffusion](https://stability.ai) - Local/free option

### Sound Effects
- [Freesound.org](https://freesound.org) - Thunder, explosions, ice
- [Zapsplat](https://zapsplat.com) - Game SFX
- [Epidemic Sound](https://epidemicsound.com) - Premium option

### Animation Reference
- Marvel mobile games (Contest of Champions, Future Fight)
- Genshin Impact character bursts
- Clash Royale troop deployment

---

## Next Phase

After completing the hero polish, proceed to [Phase 6: Meta Game](phase-6-meta.md) to add progression systems, level maps, and PWA features.
