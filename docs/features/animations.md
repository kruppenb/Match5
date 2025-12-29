# Feature: Animations

**Phase:** [Phase 4: Polish](../phases/phase-4-polish.md)  
**Priority:** Medium  
**Status:** 🔴 Not Started

---

## Overview

Animations are crucial for game feel. Every action should have visual feedback that makes the game satisfying to play. This document covers all animation types and implementation patterns.

---

## Animation System

### Core Animation Class

```typescript
interface Animation {
  target: any;
  property: string;
  from: number;
  to: number;
  duration: number;
  elapsed: number;
  easing: EasingFunction;
  onComplete?: () => void;
}

class AnimationManager {
  private animations: Animation[] = [];
  
  animate(config: {
    target: any;
    property: string;
    to: number;
    duration: number;
    easing?: EasingFunction;
    onComplete?: () => void;
  }): void {
    this.animations.push({
      target: config.target,
      property: config.property,
      from: config.target[config.property],
      to: config.to,
      duration: config.duration,
      elapsed: 0,
      easing: config.easing || Easing.linear,
      onComplete: config.onComplete,
    });
  }
  
  update(deltaTime: number): void {
    for (let i = this.animations.length - 1; i >= 0; i--) {
      const anim = this.animations[i];
      anim.elapsed += deltaTime;
      
      const progress = Math.min(anim.elapsed / anim.duration, 1);
      const easedProgress = anim.easing(progress);
      
      anim.target[anim.property] = anim.from + (anim.to - anim.from) * easedProgress;
      
      if (progress >= 1) {
        anim.onComplete?.();
        this.animations.splice(i, 1);
      }
    }
  }
}
```

---

## Easing Functions

```typescript
const Easing = {
  linear: (t: number) => t,
  
  // Smooth
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  // Cubic (smoother)
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  // Back (overshoot)
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  
  // Elastic (bouncy)
  easeOutElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  
  // Bounce
  easeOutBounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};
```

---

## Tile Animations

### Tile Swap

```typescript
class TileSwapAnimation {
  async animate(tile1: Tile, tile2: Tile): Promise<void> {
    const pos1 = { x: tile1.x, y: tile1.y };
    const pos2 = { x: tile2.x, y: tile2.y };
    
    // Anticipation - slight move in opposite direction first
    await Promise.all([
      this.tween(tile1, {
        x: pos1.x - (pos2.x - pos1.x) * 0.1,
        y: pos1.y - (pos2.y - pos1.y) * 0.1,
        duration: 30,
        easing: Easing.easeOutQuad,
      }),
      this.tween(tile2, {
        x: pos2.x - (pos1.x - pos2.x) * 0.1,
        y: pos2.y - (pos1.y - pos2.y) * 0.1,
        duration: 30,
        easing: Easing.easeOutQuad,
      }),
    ]);
    
    // Main swap
    await Promise.all([
      this.tween(tile1, {
        x: pos2.x,
        y: pos2.y,
        duration: 120,
        easing: Easing.easeOutBack,
      }),
      this.tween(tile2, {
        x: pos1.x,
        y: pos1.y,
        duration: 120,
        easing: Easing.easeOutBack,
      }),
    ]);
  }
}
```

### Failed Swap (No Match)

```typescript
async animateFailedSwap(tile1: Tile, tile2: Tile): Promise<void> {
  const pos1 = { x: tile1.x, y: tile1.y };
  const pos2 = { x: tile2.x, y: tile2.y };
  
  // Swap
  await Promise.all([
    this.tween(tile1, { x: pos2.x, y: pos2.y, duration: 80 }),
    this.tween(tile2, { x: pos1.x, y: pos1.y, duration: 80 }),
  ]);
  
  // Pause
  await this.delay(50);
  
  // Swap back with shake
  await Promise.all([
    this.tween(tile1, { x: pos1.x, y: pos1.y, duration: 80 }),
    this.tween(tile2, { x: pos2.x, y: pos2.y, duration: 80 }),
  ]);
  
  // Shake both
  await this.shake(tile1, 3);
  await this.shake(tile2, 3);
}
```

### Tile Clear

```typescript
async animateTileClear(tile: Tile): Promise<void> {
  // Pop effect - scale up then down to 0
  await this.tween(tile, {
    scale: 1.2,
    duration: 50,
    easing: Easing.easeOutQuad,
  });
  
  await Promise.all([
    this.tween(tile, {
      scale: 0,
      duration: 100,
      easing: Easing.easeInBack,
    }),
    this.tween(tile, {
      alpha: 0,
      duration: 100,
    }),
  ]);
}
```

### Tile Fall

```typescript
async animateTileFall(tile: Tile, fromY: number, toY: number): Promise<void> {
  const distance = toY - fromY;
  const duration = Math.min(50 + distance * 15, 300);
  
  tile.y = fromY;
  
  await this.tween(tile, {
    y: toY,
    duration,
    easing: Easing.easeOutBounce,
  });
  
  // Squash and stretch on landing
  await this.tween(tile, {
    scaleY: 0.8,
    scaleX: 1.2,
    duration: 50,
    easing: Easing.easeOutQuad,
  });
  
  await this.tween(tile, {
    scaleY: 1,
    scaleX: 1,
    duration: 80,
    easing: Easing.easeOutElastic,
  });
}
```

---

## Powerup Animations

### Powerup Creation

```typescript
async animatePowerupCreate(tile: Tile): Promise<void> {
  // Start invisible and small
  tile.scale = 0;
  tile.alpha = 1;
  
  // Particles spiral in
  this.particles.spiralIn(tile.x, tile.y, 20);
  
  // Tile scales up with elastic
  await this.tween(tile, {
    scale: 1.3,
    duration: 200,
    easing: Easing.easeOutElastic,
  });
  
  await this.tween(tile, {
    scale: 1,
    duration: 100,
    easing: Easing.easeInOutQuad,
  });
  
  // Glow pulse
  this.addGlowEffect(tile);
}
```

### Rocket Activation

```typescript
async animateRocket(rocket: Tile, direction: 'horizontal' | 'vertical'): Promise<void> {
  const startPos = { x: rocket.x, y: rocket.y };
  
  // Charge up
  await this.tween(rocket, {
    scale: 1.5,
    duration: 100,
    easing: Easing.easeOutQuad,
  });
  
  // Shake before launch
  await this.shake(rocket, 5, 50);
  
  // Launch!
  const targetPos = direction === 'horizontal' 
    ? { x: this.screenWidth + 100, y: rocket.y }
    : { x: rocket.x, y: -100 };
  
  // Also send one in opposite direction
  const rocketClone = this.cloneSprite(rocket);
  const oppositePos = direction === 'horizontal'
    ? { x: -100, y: rocket.y }
    : { x: rocket.x, y: this.screenHeight + 100 };
  
  await Promise.all([
    this.tween(rocket, { ...targetPos, duration: 200, easing: Easing.easeInQuad }),
    this.tween(rocketClone, { ...oppositePos, duration: 200, easing: Easing.easeInQuad }),
  ]);
  
  // Emit trail particles during flight
  this.particles.rocketTrail(startPos, targetPos);
}
```

### Bomb Explosion

```typescript
async animateBomb(bomb: Tile): Promise<void> {
  // Grow and shake
  await Promise.all([
    this.tween(bomb, { scale: 1.5, duration: 200 }),
    this.shake(bomb, 8, 200),
  ]);
  
  // Flash
  bomb.tint = 0xffffff;
  await this.delay(50);
  
  // Explode
  this.particles.explosion(bomb.x, bomb.y, 30);
  this.screenShake.shake(12);
  
  await this.tween(bomb, {
    scale: 3,
    alpha: 0,
    duration: 150,
    easing: Easing.easeOutQuad,
  });
  
  // Shockwave ring
  this.effects.shockwave(bomb.x, bomb.y);
}
```

### Color Bomb Activation

```typescript
async animateColorBomb(bomb: Tile, targetTiles: Tile[]): Promise<void> {
  // Rainbow pulse
  await this.rainbowPulse(bomb, 300);
  
  // Energy beams to each target
  for (const target of targetTiles) {
    this.effects.lightningBeam(bomb, target);
    await this.delay(30); // Stagger
  }
  
  // Bomb disappears
  await this.tween(bomb, {
    scale: 2,
    alpha: 0,
    duration: 200,
  });
  
  // Each target sparkles and clears
  await Promise.all(targetTiles.map(async (tile, i) => {
    await this.delay(i * 20);
    this.particles.sparkle(tile.x, tile.y, tile.type);
    await this.animateTileClear(tile);
  }));
}
```

---

## UI Animations

### Score Popup

```typescript
animateScorePopup(points: number, x: number, y: number): void {
  const text = this.createText(`+${points}`, x, y);
  text.scale = 0;
  
  // Pop in
  this.tween(text, { scale: 1.2, duration: 100, easing: Easing.easeOutBack });
  
  // Float up and fade
  this.tween(text, {
    y: y - 80,
    alpha: 0,
    duration: 600,
    delay: 100,
    easing: Easing.easeOutQuad,
    onComplete: () => text.destroy(),
  });
}
```

### Combo Text

```typescript
animateComboText(combo: number, text: string): void {
  const comboText = this.createText(text, this.centerX, this.centerY);
  comboText.scale = 0;
  
  // Scale based on combo
  const targetScale = 1 + combo * 0.2;
  
  // Zoom in
  await this.tween(comboText, {
    scale: targetScale * 1.3,
    duration: 150,
    easing: Easing.easeOutBack,
  });
  
  // Slight bounce back
  await this.tween(comboText, {
    scale: targetScale,
    duration: 100,
  });
  
  // Hold
  await this.delay(200);
  
  // Fade out
  await this.tween(comboText, {
    scale: targetScale * 1.5,
    alpha: 0,
    duration: 200,
  });
  
  comboText.destroy();
}
```

### Move Counter Decrement

```typescript
animateMoveDecrement(moveDisplay: Text): void {
  // Quick scale pulse
  this.tween(moveDisplay, {
    scale: 1.3,
    duration: 50,
    easing: Easing.easeOutQuad,
    onComplete: () => {
      this.tween(moveDisplay, {
        scale: 1,
        duration: 100,
        easing: Easing.easeOutElastic,
      });
    },
  });
  
  // Red flash if low
  if (parseInt(moveDisplay.text) <= 3) {
    moveDisplay.tint = 0xff4444;
    this.tween(moveDisplay, {
      tint: 0xffffff,
      duration: 300,
    });
  }
}
```

---

## Screen Effects

### Screen Shake

```typescript
class ScreenShake {
  private offset = { x: 0, y: 0 };
  private intensity = 0;
  
  shake(intensity: number, duration: number = 200): void {
    this.intensity = intensity;
    
    const startTime = Date.now();
    const update = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress >= 1) {
        this.offset = { x: 0, y: 0 };
        return;
      }
      
      const currentIntensity = intensity * (1 - progress);
      this.offset = {
        x: (Math.random() - 0.5) * currentIntensity * 2,
        y: (Math.random() - 0.5) * currentIntensity * 2,
      };
      
      requestAnimationFrame(update);
    };
    
    update();
  }
  
  getOffset(): { x: number; y: number } {
    return this.offset;
  }
}
```

### Flash Effect

```typescript
flash(color: number = 0xffffff, duration: number = 100): void {
  const overlay = this.createRectangle(0, 0, this.width, this.height, color);
  overlay.alpha = 0.8;
  
  this.tween(overlay, {
    alpha: 0,
    duration,
    onComplete: () => overlay.destroy(),
  });
}
```

---

## Particle System

### Basic Particle

```typescript
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

class ParticleSystem {
  private particles: Particle[] = [];
  
  emit(x: number, y: number, config: ParticleConfig): void {
    for (let i = 0; i < config.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = config.speed * (0.5 + Math.random() * 0.5);
      
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - config.gravity * 0.5,
        life: config.life,
        maxLife: config.life,
        size: config.size * (0.5 + Math.random() * 0.5),
        color: config.color,
        alpha: 1,
      });
    }
  }
  
  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.2; // Gravity
      p.life -= dt;
      p.alpha = p.life / p.maxLife;
      p.size *= 0.98;
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
```

---

## Animation Timing Reference

| Animation | Duration | Easing |
|-----------|----------|--------|
| Tile swap | 120ms | easeOutBack |
| Failed swap | 80ms + 80ms | linear |
| Tile clear | 150ms | easeInBack |
| Tile fall | 50-300ms | easeOutBounce |
| Powerup create | 300ms | easeOutElastic |
| Rocket launch | 200ms | easeInQuad |
| Bomb explode | 200ms | easeOutQuad |
| Screen shake | 200ms | linear decay |
| Score popup | 600ms | easeOutQuad |
| Combo text | 450ms | easeOutBack |

---

## Related Features

- [Audio](audio.md)
- [Powerups](powerups.md)
