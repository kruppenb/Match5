# Feature: Audio

**Phase:** [Phase 4: Polish](../phases/phase-4-polish.md)  
**Priority:** Medium  
**Status:** 🔴 Not Started

---

## Overview

Audio adds essential feedback and immersion. Sound effects provide instant feedback for actions, while music sets the mood. Good audio design makes the game feel responsive and satisfying.

---

## Sound Effects

### Match Sounds

| Sound | Trigger | Description |
|-------|---------|-------------|
| match_3 | 3 tiles matched | Soft pop |
| match_4 | 4 tiles matched | Slightly higher pop |
| match_5 | 5+ tiles matched | Ascending chime |
| cascade_1 | First cascade | Standard pop |
| cascade_2 | Second cascade | Higher pitch |
| cascade_3 | Third cascade | Even higher |
| cascade_4+ | 4th+ cascade | Maximum excitement |

### Powerup Sounds

| Sound | Trigger | Description |
|-------|---------|-------------|
| powerup_create | Any powerup created | Magical whoosh |
| rocket_launch | Rocket activates | Swoosh/whoosh |
| rocket_hit | Rocket clears tile | Quick pop |
| bomb_fuse | Bomb about to explode | Sizzle |
| bomb_explode | Bomb explodes | Deep boom |
| color_bomb_activate | Color bomb used | Sparkle/chime |
| color_bomb_clear | Each tile cleared | Light ding |

### UI Sounds

| Sound | Trigger | Description |
|-------|---------|-------------|
| button_click | Any button pressed | Click |
| swap_valid | Valid swap made | Soft whoosh |
| swap_invalid | Invalid swap | Thunk/buzz |
| level_start | Level begins | Upbeat intro |
| level_win | Level completed | Fanfare |
| level_lose | Level failed | Descending tones |
| star_earn | Star earned | Chime |
| objective_complete | Objective finished | Celebration |

---

## Audio Manager Implementation

```typescript
import { Howl, Howler } from 'howler';

class AudioManager {
  private sounds: Map<string, Howl> = new Map();
  private music: Howl | null = null;
  
  private sfxVolume = 0.7;
  private musicVolume = 0.4;
  private enabled = true;
  
  async init(): Promise<void> {
    // Load all sound effects
    const sfxFiles = [
      'match', 'cascade', 'powerup_create',
      'rocket', 'bomb', 'color_bomb',
      'button', 'swap', 'win', 'lose',
    ];
    
    for (const name of sfxFiles) {
      this.sounds.set(name, new Howl({
        src: [`/assets/audio/${name}.mp3`, `/assets/audio/${name}.ogg`],
        volume: this.sfxVolume,
        preload: true,
      }));
    }
    
    // Load music
    this.music = new Howl({
      src: ['/assets/audio/music.mp3', '/assets/audio/music.ogg'],
      volume: this.musicVolume,
      loop: true,
      preload: true,
    });
  }
  
  play(name: string, options?: { volume?: number; rate?: number }): void {
    if (!this.enabled) return;
    
    const sound = this.sounds.get(name);
    if (sound) {
      const id = sound.play();
      if (options?.volume) sound.volume(options.volume, id);
      if (options?.rate) sound.rate(options.rate, id);
    }
  }
  
  playMusic(): void {
    if (!this.enabled || !this.music) return;
    this.music.play();
  }
  
  stopMusic(): void {
    this.music?.stop();
  }
  
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      Howler.mute(true);
    } else {
      Howler.mute(false);
    }
  }
  
  setSfxVolume(volume: number): void {
    this.sfxVolume = volume;
    this.sounds.forEach(sound => sound.volume(volume));
  }
  
  setMusicVolume(volume: number): void {
    this.musicVolume = volume;
    this.music?.volume(volume);
  }
}

export const audio = new AudioManager();
```

---

## Cascade Sound System

Play escalating sounds for combo chains:

```typescript
class CascadeSoundPlayer {
  private cascadeLevel = 0;
  private baseRate = 1.0;
  private rateIncrement = 0.1;
  
  onCascade(): void {
    this.cascadeLevel++;
    
    const rate = Math.min(this.baseRate + this.cascadeLevel * this.rateIncrement, 2.0);
    const volume = Math.min(0.7 + this.cascadeLevel * 0.05, 1.0);
    
    audio.play('cascade', { rate, volume });
  }
  
  resetCascade(): void {
    this.cascadeLevel = 0;
  }
}
```

---

## Match Sound Variations

Play slightly different sounds to avoid repetition:

```typescript
class MatchSoundPlayer {
  private lastVariation = 0;
  
  playMatch(matchSize: number): void {
    // Vary pitch slightly
    const pitchVariation = 0.95 + Math.random() * 0.1; // 0.95 - 1.05
    
    // Different sounds for different match sizes
    if (matchSize >= 5) {
      audio.play('match_5', { rate: pitchVariation });
    } else if (matchSize === 4) {
      audio.play('match_4', { rate: pitchVariation });
    } else {
      // Rotate through 3 variations
      this.lastVariation = (this.lastVariation + 1) % 3;
      audio.play(`match_${this.lastVariation}`, { rate: pitchVariation });
    }
  }
}
```

---

## Spatial Audio (Optional)

Make sounds feel positioned based on where they occur:

```typescript
class SpatialAudio {
  playSpatial(name: string, x: number, screenWidth: number): void {
    // Calculate pan (-1 to 1)
    const pan = (x / screenWidth) * 2 - 1;
    
    const sound = audio.sounds.get(name);
    if (sound) {
      const id = sound.play();
      sound.stereo(pan * 0.5, id); // Subtle panning
    }
  }
}
```

---

## Sound Design Tips

### Creating Your Own Sounds

**BFXR/SFXR** - Retro sound generator
1. Download from https://sfbgames.itch.io/bfxr
2. Use presets (Pickup, Explosion, Powerup)
3. Tweak parameters
4. Export as WAV

**Recording/Editing**
1. Use Audacity (free)
2. Record household sounds
3. Layer and process
4. Export as MP3/OGG

### Sound Characteristics

| Sound Type | Characteristics |
|------------|-----------------|
| Match | Short, satisfying pop. 50-100ms |
| Cascade | Similar to match but brighter |
| Powerup create | Ascending, magical. 200-300ms |
| Rocket | Whoosh with Doppler effect |
| Bomb | Deep impact with reverb |
| Win | Triumphant fanfare. 1-2 seconds |
| Lose | Sympathetic, not harsh |

---

## Music

### Background Music Considerations

For a puzzle game:
- Upbeat but not distracting
- Loopable (seamless loop point)
- Consistent energy level
- No lyrics (distracting)
- 1-3 minute loop

### Music Fading

```typescript
class MusicManager {
  fadeIn(duration: number = 1000): void {
    this.music.volume(0);
    this.music.play();
    this.music.fade(0, this.musicVolume, duration);
  }
  
  fadeOut(duration: number = 500): void {
    this.music.fade(this.musicVolume, 0, duration);
    setTimeout(() => this.music.stop(), duration);
  }
  
  duck(duration: number = 200): void {
    // Lower music during important sounds
    this.music.fade(this.musicVolume, this.musicVolume * 0.3, duration);
    setTimeout(() => {
      this.music.fade(this.musicVolume * 0.3, this.musicVolume, duration);
    }, duration + 500);
  }
}
```

---

## Free Audio Resources

### Sound Effects
- [Freesound.org](https://freesound.org) - Free sounds, various licenses
- [OpenGameArt.org](https://opengameart.org) - Game-ready assets
- [Kenney.nl](https://kenney.nl/assets/category/Audio) - Public domain sounds
- [Mixkit](https://mixkit.co/free-sound-effects/) - Free sounds

### Music
- [Kevin MacLeod](https://incompetech.com) - Royalty free music
- [OpenGameArt.org](https://opengameart.org/art-search-advanced?field_art_type_tid%5B%5D=12) - Game music
- [Free Music Archive](https://freemusicarchive.org) - Various licenses

### Generators
- [BFXR](https://sfbgames.itch.io/bfxr) - 8-bit sound generator
- [ChipTone](https://sfbgames.itch.io/chiptone) - Another sound generator

---

## Mobile Considerations

### iOS Audio Unlock

iOS Safari requires user interaction before playing audio:

```typescript
class iOSAudioUnlock {
  private unlocked = false;
  
  init(): void {
    const unlock = () => {
      if (this.unlocked) return;
      
      // Create and play silent sound
      const ctx = Howler.ctx;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
      
      // Play and immediately stop all sounds to unlock
      audio.sounds.forEach(sound => {
        const id = sound.play();
        sound.stop(id);
      });
      
      this.unlocked = true;
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
    
    document.addEventListener('touchstart', unlock);
    document.addEventListener('click', unlock);
  }
}
```

### Haptic Feedback

Combine sound with vibration:

```typescript
class Haptics {
  light(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }
  
  medium(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(25);
    }
  }
  
  heavy(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }
}

// Usage with sounds
onMatch(size: number): void {
  audio.playMatch(size);
  haptics.light();
}

onBombExplode(): void {
  audio.play('bomb');
  haptics.heavy();
}
```

---

## Audio Settings UI

```typescript
class AudioSettings {
  render(): void {
    return `
      <div class="audio-settings">
        <label>
          Sound Effects
          <input type="range" 
                 min="0" max="100" 
                 value="${audio.sfxVolume * 100}"
                 onchange="audio.setSfxVolume(this.value / 100)" />
        </label>
        
        <label>
          Music
          <input type="range" 
                 min="0" max="100" 
                 value="${audio.musicVolume * 100}"
                 onchange="audio.setMusicVolume(this.value / 100)" />
        </label>
        
        <label>
          <input type="checkbox" 
                 checked="${audio.enabled}"
                 onchange="audio.setEnabled(this.checked)" />
          Sound Enabled
        </label>
      </div>
    `;
  }
}
```

---

## Integration with Game Events

```typescript
class GameAudioIntegration {
  constructor(private audio: AudioManager) {
    // Subscribe to game events
    events.on('match', this.onMatch.bind(this));
    events.on('cascade', this.onCascade.bind(this));
    events.on('powerup:create', this.onPowerupCreate.bind(this));
    events.on('powerup:activate', this.onPowerupActivate.bind(this));
    events.on('level:start', this.onLevelStart.bind(this));
    events.on('level:win', this.onLevelWin.bind(this));
    events.on('level:lose', this.onLevelLose.bind(this));
  }
  
  onMatch(match: Match): void {
    this.audio.playMatch(match.tiles.length);
  }
  
  onCascade(level: number): void {
    this.cascadeSounds.onCascade();
  }
  
  onPowerupCreate(type: string): void {
    this.audio.play('powerup_create');
  }
  
  onPowerupActivate(type: string): void {
    switch (type) {
      case 'rocket':
        this.audio.play('rocket');
        break;
      case 'bomb':
        this.audio.play('bomb_fuse');
        setTimeout(() => this.audio.play('bomb'), 200);
        break;
      case 'color_bomb':
        this.audio.play('color_bomb');
        break;
    }
  }
  
  onLevelWin(): void {
    this.audio.duck();
    this.audio.play('win');
  }
  
  onLevelLose(): void {
    this.audio.duck();
    this.audio.play('lose');
  }
}
```

---

## Related Features

- [Animations](animations.md)
- [Powerups](powerups.md)
