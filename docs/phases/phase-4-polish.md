# Phase 4: Polish & Effects

**Status:** 🔴 Not Started  
**Duration:** 1-2 weeks  
**Prerequisites:** [Phase 3: Content](phase-3-content.md)  
**Goal:** Juicy, satisfying game feel with animations, particles, and sound

---

## Overview

This phase transforms a functional game into a delightful experience. "Game feel" or "juice" is what makes matching tiles satisfying. Every action should have visual and audio feedback.

---

## Deliverables Checklist

### Visual Effects
- [ ] Particle effects on tile matches
- [ ] Particle effects on powerup activation
- [ ] Screen shake on big combos
- [ ] Glow effects on powerups
- [ ] Tile pop/squash animation on clear
- [ ] Cascade combo counter display
- [ ] Score popup numbers

### Animations
- [ ] Smooth tile swapping (eased)
- [ ] Bouncy tile falling
- [ ] Tile anticipation before swap
- [ ] Powerup charging animation
- [ ] Rocket trail effect
- [ ] Bomb explosion ripple
- [ ] Color bomb rainbow wave
- [ ] UI element transitions

### Audio
- [ ] Match sound (satisfying pop)
- [ ] Cascade combo sounds (escalating pitch)
- [ ] Powerup creation sound
- [ ] Rocket whoosh
- [ ] Bomb explosion
- [ ] Color bomb sparkle
- [ ] Win fanfare
- [ ] Lose sound
- [ ] Background music (optional)
- [ ] UI button clicks

### Haptic Feedback
- [ ] Light vibration on match
- [ ] Medium vibration on powerup
- [ ] Heavy vibration on combo

---

## Particle Effects

### Match Particles
When tiles are cleared, emit particles in the tile's color:

```typescript
class MatchParticles {
  emit(x: number, y: number, color: string): void {
    const particles: Particle[] = [];
    
    for (let i = 0; i < 12; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 4, // Bias upward
        life: 30,
        color,
        size: 4 + Math.random() * 4,
      });
    }
    
    this.particles.push(...particles);
  }
  
  update(): void {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3; // Gravity
      p.life--;
      p.size *= 0.95; // Shrink
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }
}
```

### Powerup Particles

**Rocket Trail:**
- Emit particles behind rocket as it moves
- Smoke/fire colored particles
- Fade quickly

**Bomb Explosion:**
- Radial particle burst
- Larger particles, orange/red colors
- Secondary ring effect

**Color Bomb:**
- Rainbow spiral particles
- Stars/sparkles at each cleared tile
- Wave ripple effect across board

---

## Screen Shake

Add shake for impactful moments:

```typescript
class ScreenShake {
  private offset = { x: 0, y: 0 };
  private intensity = 0;
  private decay = 0.9;
  
  shake(intensity: number): void {
    this.intensity = Math.max(this.intensity, intensity);
  }
  
  update(): void {
    if (this.intensity > 0.5) {
      this.offset.x = (Math.random() - 0.5) * this.intensity;
      this.offset.y = (Math.random() - 0.5) * this.intensity;
      this.intensity *= this.decay;
    } else {
      this.offset.x = 0;
      this.offset.y = 0;
      this.intensity = 0;
    }
  }
  
  getOffset(): { x: number; y: number } {
    return this.offset;
  }
}

// Usage
onMatch(matchSize: number): void {
  if (matchSize >= 5) {
    screenShake.shake(8);
  } else if (matchSize >= 4) {
    screenShake.shake(4);
  }
}

onPowerupActivate(type: string): void {
  if (type === 'bomb') {
    screenShake.shake(12);
  } else if (type === 'color_bomb') {
    screenShake.shake(15);
  }
}
```

---

## Animation Easing

Use easing functions for smooth, natural motion:

```typescript
const Easing = {
  // Smooth start and end
  easeInOutQuad: (t: number) => 
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  
  // Bouncy end
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  
  // Elastic bounce
  easeOutElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
  },
  
  // Quick start, slow end (for falling)
  easeOutBounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};
```

### Animation Application

| Animation | Easing | Duration |
|-----------|--------|----------|
| Tile swap | easeInOutQuad | 150ms |
| Tile fall | easeOutBounce | 200ms |
| Tile clear | easeOutBack | 100ms (scale to 0) |
| Powerup spawn | easeOutElastic | 300ms |
| UI popup | easeOutBack | 200ms |
| Combo text | easeOutQuad | 500ms (rise + fade) |

---

## Combo Display

Show escalating feedback for chain reactions:

```typescript
class ComboDisplay {
  private comboCount = 0;
  private texts: ComboText[] = [];
  
  onCascade(): void {
    this.comboCount++;
    
    const messages = [
      '', // 1 (no message)
      'Nice!',
      'Great!',
      'Awesome!',
      'Amazing!',
      'Incredible!',
      'SPECTACULAR!',
    ];
    
    if (this.comboCount >= 2) {
      this.texts.push({
        text: messages[Math.min(this.comboCount, messages.length - 1)],
        x: SCREEN_WIDTH / 2,
        y: SCREEN_HEIGHT / 2,
        scale: 1 + this.comboCount * 0.2,
        life: 60,
        color: this.getComboColor(this.comboCount),
      });
    }
  }
  
  private getComboColor(count: number): string {
    const colors = ['#FFD700', '#FF8C00', '#FF4500', '#FF1493', '#9400D3'];
    return colors[Math.min(count - 2, colors.length - 1)];
  }
  
  resetCombo(): void {
    this.comboCount = 0;
  }
}
```

---

## Audio Implementation

### Using Howler.js

```typescript
import { Howl } from 'howler';

class AudioManager {
  private sounds: Map<string, Howl> = new Map();
  private musicVolume = 0.5;
  private sfxVolume = 0.7;
  
  init(): void {
    this.sounds.set('match', new Howl({
      src: ['assets/audio/match.mp3'],
      volume: this.sfxVolume,
    }));
    
    this.sounds.set('rocket', new Howl({
      src: ['assets/audio/rocket.mp3'],
      volume: this.sfxVolume,
    }));
    
    this.sounds.set('bomb', new Howl({
      src: ['assets/audio/explosion.mp3'],
      volume: this.sfxVolume,
    }));
    
    // Combo sounds with escalating pitch
    for (let i = 1; i <= 7; i++) {
      this.sounds.set(`combo_${i}`, new Howl({
        src: ['assets/audio/match.mp3'],
        volume: this.sfxVolume,
        rate: 1 + (i - 1) * 0.15, // Increase pitch
      }));
    }
  }
  
  play(name: string): void {
    const sound = this.sounds.get(name);
    if (sound) {
      sound.play();
    }
  }
  
  playCombo(comboLevel: number): void {
    const level = Math.min(comboLevel, 7);
    this.play(`combo_${level}`);
  }
}
```

### Sound Design Tips

| Sound | Description | Feel |
|-------|-------------|------|
| Match | Soft pop/click | Satisfying, light |
| Cascade | Higher pitched pops | Escalating excitement |
| Rocket | Whoosh/swoosh | Fast, powerful |
| Bomb | Deep boom + debris | Impactful |
| Color Bomb | Sparkle + chime | Magical, rewarding |
| Win | Fanfare, chimes | Celebratory |
| Lose | Descending tones | Sympathetic, not harsh |

### Free Sound Resources
- [Freesound.org](https://freesound.org)
- [OpenGameArt.org](https://opengameart.org)
- [Kenney.nl](https://kenney.nl/assets) (game assets)
- [SFXR/BFXR](https://sfbgames.itch.io/bfxr) (generate retro sounds)

---

## Haptic Feedback

For iOS Safari, use the Vibration API (limited support):

```typescript
class HapticFeedback {
  private supported = 'vibrate' in navigator;
  
  light(): void {
    if (this.supported) {
      navigator.vibrate(10);
    }
  }
  
  medium(): void {
    if (this.supported) {
      navigator.vibrate(25);
    }
  }
  
  heavy(): void {
    if (this.supported) {
      navigator.vibrate(50);
    }
  }
  
  pattern(pattern: number[]): void {
    if (this.supported) {
      navigator.vibrate(pattern);
    }
  }
}

// Usage
onMatch(): void {
  haptic.light();
}

onPowerup(): void {
  haptic.medium();
}

onBigCombo(): void {
  haptic.pattern([50, 50, 50, 50, 100]); // Rumble pattern
}
```

**Note:** iOS Safari has limited vibration support. Test on actual device.

---

## Polish Checklist (Game Feel)

### On Every Match
- [ ] Tiles scale up slightly then pop
- [ ] Particles emit from cleared tiles
- [ ] Satisfying sound plays
- [ ] Score floats up from match
- [ ] Light screen shake for 4+ matches

### On Cascades
- [ ] Combo counter increments
- [ ] Sound pitch increases
- [ ] Text feedback ("Great!", "Amazing!")
- [ ] Screen shake intensity grows

### On Powerup Creation
- [ ] Distinctive creation sound
- [ ] Powerup pulses/glows
- [ ] Particles spiral into powerup
- [ ] Brief pause (100ms) for impact

### On Powerup Activation
- [ ] Unique activation sound
- [ ] Dramatic particle effects
- [ ] Affected tiles animate out
- [ ] Camera/screen shake
- [ ] Haptic feedback

### On Level Complete
- [ ] Remaining moves become powerups
- [ ] Chain reaction of bonus powerups
- [ ] Stars animate in (1-3)
- [ ] Victory fanfare
- [ ] Confetti particles
- [ ] Score totals up satisfyingly

---

## Success Criteria

Phase 4 is complete when:

1. ✅ Particle effects on all matches
2. ✅ Particle effects on powerups
3. ✅ Screen shake on big events
4. ✅ All animations use easing
5. ✅ Combo counter with text feedback
6. ✅ Sound effects for all actions
7. ✅ Optional background music
8. ✅ UI transitions are smooth
9. ✅ Game "feels" satisfying to play
10. ✅ Performance still 60fps on mobile

---

## Related Features

- [Animations](../features/animations.md)
- [Audio](../features/audio.md)

---

## Next Phase

Proceed to [Phase 5: Meta Game](phase-5-meta.md) to add progression systems, star ratings, and PWA features.
