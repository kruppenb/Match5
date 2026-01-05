# Background Effects - Particles & Light Overlay

## Overview

Add ambient visual effects to static background images to make scenes feel alive and magical without distorting the artwork (especially important for composite images with characters like the princess/castle scene).

## Goals

- Make backgrounds feel dynamic and alive
- Preserve character artwork integrity (no stretching/scrolling)
- Match the magical/fantasy theme of the game
- Keep performance mobile-friendly (60 FPS target)

## Implementation Plan

### Phase 1: Particle System Setup

#### 1.1 Create Particle Texture
- [ ] Create a small sparkle/dust texture (8x8 or 16x16 px)
- [ ] Save as `public/assets/sprites/effects/sparkle.png`
- [ ] Consider multiple particle types:
  - `sparkle.png` - Star/diamond shape for magical feel
  - `dust.png` - Soft circle for floating dust motes
  - `leaf.png` - For garden levels

#### 1.2 Background Particle Emitter
Location: `GameScene.ts` in `renderBackground()` method

```typescript
private bgParticles?: Phaser.GameObjects.Particles.ParticleEmitter;

private createBackgroundParticles(): void {
  const width = CONFIG.SCREEN.WIDTH;
  const height = CONFIG.SCREEN.HEIGHT;
  
  this.bgParticles = this.add.particles(0, 0, 'sparkle', {
    x: { min: 0, max: width },
    y: { min: 0, max: height },
    scale: { start: 0.4, end: 0 },
    alpha: { start: 0.6, end: 0 },
    speed: { min: 10, max: 30 },
    lifespan: 4000,
    frequency: 300,        // New particle every 300ms
    quantity: 1,
    blendMode: 'ADD',
    gravityY: -15          // Gentle float upward
  });
  
  this.bgParticles.setDepth(-5); // Behind grid, in front of background
}
```

#### 1.3 Level-Specific Particle Themes
Different particle styles per world/level range:

| Levels | Theme | Particle Type | Color Tint |
|--------|-------|---------------|------------|
| 1-10 | Garden | Leaves + sparkles | Green/gold |
| 11-20 | Castle | Magic sparkles | Blue/white |
| 21-30 | Kitchen | Steam/dust | White/gray |
| 31-40 | Library | Dust motes | Gold/amber |
| 41+ | Sky Tower | Stars + clouds | White/cyan |

### Phase 2: Light Overlay Effects

#### 2.1 Pulsing Glow
Add a subtle light source that pulses gently:

```typescript
private lightOverlay?: Phaser.GameObjects.Graphics;

private createLightOverlay(): void {
  const width = CONFIG.SCREEN.WIDTH;
  const height = CONFIG.SCREEN.HEIGHT;
  
  this.lightOverlay = this.add.graphics();
  this.lightOverlay.setDepth(-6);
  this.lightOverlay.setBlendMode('ADD');
  
  // Radial gradient simulation
  const centerX = width / 2;
  const centerY = height / 3; // Upper area glow
  
  for (let r = 300; r > 0; r -= 20) {
    const alpha = 0.02 * (1 - r / 300);
    this.lightOverlay.fillStyle(0xffffee, alpha);
    this.lightOverlay.fillCircle(centerX, centerY, r);
  }
  
  // Animate the glow
  this.tweens.add({
    targets: this.lightOverlay,
    alpha: { from: 0.5, to: 1 },
    duration: 3000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });
}
```

#### 2.2 Vignette Effect (Optional)
Darken edges to draw focus to center:

```typescript
private createVignette(): void {
  const width = CONFIG.SCREEN.WIDTH;
  const height = CONFIG.SCREEN.HEIGHT;
  
  const vignette = this.add.graphics();
  vignette.setDepth(100); // On top of everything
  
  // Draw darkened edges
  vignette.fillStyle(0x000000, 0.3);
  vignette.fillRect(0, 0, width, height);
  
  // Cut out bright center
  vignette.fillStyle(0x000000, 0);
  vignette.beginPath();
  // Use blend mode to create gradient edge
}
```

### Phase 3: Configuration & Performance

#### 3.1 Add to CONFIG
```typescript
// In config.ts
EFFECTS: {
  BACKGROUND_PARTICLES: {
    ENABLED: true,
    FREQUENCY: 300,
    MAX_PARTICLES: 20,
    SPEED_MIN: 10,
    SPEED_MAX: 30
  },
  LIGHT_OVERLAY: {
    ENABLED: true,
    PULSE_DURATION: 3000,
    INTENSITY: 0.1
  }
}
```

#### 3.2 Performance Considerations
- [ ] Limit max active particles (20-30 recommended)
- [ ] Use object pooling (Phaser handles this automatically)
- [ ] Test on target iOS devices
- [ ] Add toggle in settings for low-end devices
- [ ] Reduce particle frequency if FPS drops below 55

#### 3.3 Cleanup
```typescript
// In scene shutdown/destroy
if (this.bgParticles) {
  this.bgParticles.destroy();
}
if (this.lightOverlay) {
  this.lightOverlay.destroy();
}
```

### Phase 4: Polish & Variations

#### 4.1 Interactive Particles (Stretch Goal)
- Particles react to tile matches
- Burst of particles on powerup activation
- Particles flow toward matched tiles

#### 4.2 Time-of-Day Effects (Stretch Goal)
- Morning: Warm golden light
- Day: Bright white sparkles
- Evening: Orange/pink hues
- Night: Blue tones with stars

## File Changes Required

| File | Changes |
|------|---------|
| `src/scenes/GameScene.ts` | Add particle/light creation in `renderBackground()` |
| `src/config.ts` | Add EFFECTS configuration |
| `public/assets/sprites/effects/` | New particle textures |
| `src/scenes/TitleScene.ts` | Optional: Add effects to title screen |

## Assets Needed

1. **sparkle.png** (16x16) - 4-point star, white, soft edges
2. **dust.png** (8x8) - Soft circle, white
3. **leaf.png** (12x16) - Small leaf shape, green (optional)

## Testing Checklist

- [ ] Particles render behind grid but in front of background
- [ ] Light overlay pulses smoothly
- [ ] No visual artifacts on different backgrounds
- [ ] Maintains 60 FPS on iPhone 12 or equivalent
- [ ] Effects clean up properly on scene change
- [ ] Toggle works in settings (if implemented)

## References

- [Phaser 3 Particle Emitter](https://photonstorm.github.io/phaser3-docs/Phaser.GameObjects.Particles.ParticleEmitter.html)
- Current particle usage: `ParticleManager.ts`
