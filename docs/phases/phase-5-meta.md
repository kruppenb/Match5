# Phase 5: Meta Game

**Status:** 🔴 Not Started  
**Duration:** 2-3 weeks  
**Prerequisites:** [Phase 4: Polish](phase-4-polish.md)  
**Goal:** Progression systems, PWA features, and replayability

---

## Overview

This phase adds the "meta" layer that keeps players coming back. Star ratings, a level map, and progression systems give purpose to playing. PWA features make the game feel like a native app.

---

## Deliverables Checklist

### Star Rating System
- [ ] 1-3 stars per level based on performance
- [ ] Star calculation (score, moves remaining, combos)
- [ ] Stars displayed on level select
- [ ] Total stars tracked
- [ ] Star gates (need X stars to unlock area)

### Level Map
- [ ] Visual map/path of levels
- [ ] Current level highlighted
- [ ] Locked/unlocked visual states
- [ ] Areas/worlds grouping levels
- [ ] Smooth scrolling navigation

### Progression & Save
- [ ] Save progress to localStorage
- [ ] Current level unlocked
- [ ] Stars per level
- [ ] Best scores
- [ ] Settings preferences
- [ ] Cloud save (optional, needs backend)

### PWA Features
- [ ] Web App Manifest
- [ ] Service Worker for offline
- [ ] Install prompt
- [ ] App icon for home screen
- [ ] Splash screen
- [ ] Full-screen mode
- [ ] Status bar styling

### Optional Features
- [ ] Lives system
- [ ] Daily challenge
- [ ] Coin/currency
- [ ] Boosters shop
- [ ] Statistics tracking

---

## Star Rating System

Stars are based on score thresholds per level:

```typescript
interface LevelConfig {
  // ... existing properties
  starThresholds: {
    oneStar: number;   // Minimum to pass
    twoStar: number;   // Good performance
    threeStar: number; // Excellent performance
  };
}

class StarCalculator {
  calculate(level: LevelConfig, finalScore: number): 1 | 2 | 3 {
    if (finalScore >= level.starThresholds.threeStar) return 3;
    if (finalScore >= level.starThresholds.twoStar) return 2;
    return 1; // Completing level = minimum 1 star
  }
}
```

### Score Factors
- Base points per match (10 per tile)
- Combo multiplier (1.5x, 2x, etc.)
- Powerup bonus points
- **Remaining moves bonus** (big multiplier!)

```typescript
function calculateFinalScore(
  baseScore: number,
  remainingMoves: number,
  level: LevelConfig
): number {
  // Each remaining move triggers a random powerup
  // which adds to score (this is the "fireworks" at end)
  const moveBonus = remainingMoves * 500;
  return baseScore + moveBonus;
}
```

---

## Level Map Design

### Visual Layout

```
    ╭─────╮
    │  1  │ ← Start here
    ╰──┬──╯
       │
    ╭──┴──╮
    │  2  │
    ╰──┬──╯
       │
    ╭──┴──╮       ╭─────╮
    │  3  ├───────│  B  │ ← Bonus level
    ╰──┬──╯       ╰─────╯
       │
    ╭──┴──╮
    │  4  │
    ╰──┬──╯
       │
    [═════════════]  ← Star gate (need 10 stars)
       │
    ╭──┴──╮
    │  5  │ ← New area
    ╰─────╯
```

### Implementation

```typescript
interface LevelNode {
  id: number;
  position: { x: number; y: number };
  connections: number[]; // IDs of connected levels
  unlockRequirement?: {
    type: 'level' | 'stars';
    value: number;
  };
  isBonus?: boolean;
}

const levelMap: LevelNode[] = [
  { id: 1, position: { x: 200, y: 600 }, connections: [2] },
  { id: 2, position: { x: 200, y: 500 }, connections: [3] },
  { id: 3, position: { x: 200, y: 400 }, connections: [4, 'B1'] },
  // ...
];
```

### Level Node States

| State | Visual | Condition |
|-------|--------|-----------|
| Locked | Grayed out, lock icon | Previous not complete |
| Available | Highlighted, pulsing | Can be played |
| Completed | Stars shown | At least 1 star |
| Perfect | Gold border, 3 stars | 3 stars earned |

---

## Save System

### Data Structure

```typescript
interface SaveData {
  version: number;
  currentLevel: number;
  levelProgress: Record<number, {
    completed: boolean;
    stars: number;
    bestScore: number;
  }>;
  totalStars: number;
  settings: {
    musicVolume: number;
    sfxVolume: number;
    haptics: boolean;
  };
  stats: {
    totalMatches: number;
    totalPowerups: number;
    gamesPlayed: number;
    timePlayed: number;
  };
  lastPlayed: string; // ISO date
}

class SaveManager {
  private readonly SAVE_KEY = 'match5_save';
  private data: SaveData;
  
  load(): SaveData {
    const saved = localStorage.getItem(this.SAVE_KEY);
    if (saved) {
      this.data = JSON.parse(saved);
      this.migrate(); // Handle version updates
    } else {
      this.data = this.getDefaultData();
    }
    return this.data;
  }
  
  save(): void {
    this.data.lastPlayed = new Date().toISOString();
    localStorage.setItem(this.SAVE_KEY, JSON.stringify(this.data));
  }
  
  completeLevel(levelId: number, stars: number, score: number): void {
    const existing = this.data.levelProgress[levelId];
    
    this.data.levelProgress[levelId] = {
      completed: true,
      stars: Math.max(existing?.stars || 0, stars),
      bestScore: Math.max(existing?.bestScore || 0, score),
    };
    
    this.data.currentLevel = Math.max(this.data.currentLevel, levelId + 1);
    this.recalculateTotalStars();
    this.save();
  }
  
  private recalculateTotalStars(): void {
    this.data.totalStars = Object.values(this.data.levelProgress)
      .reduce((sum, level) => sum + level.stars, 0);
  }
}
```

---

## PWA Implementation

### Web App Manifest

```json
// public/manifest.json
{
  "name": "Match5",
  "short_name": "Match5",
  "description": "A tile-matching puzzle game",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#1a1a2e",
  "theme_color": "#4a90d9",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### Service Worker

```typescript
// public/sw.js
const CACHE_NAME = 'match5-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/main.js',
  '/style.css',
  '/assets/sprites.png',
  '/assets/audio/match.mp3',
  // ... other assets
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

### HTML Setup

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="theme-color" content="#4a90d9">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Match5">
  <link rel="apple-touch-icon" href="/icons/icon-192.png">
  <link rel="manifest" href="/manifest.json">
  <title>Match5</title>
</head>
<body>
  <!-- Game canvas -->
</body>
</html>
```

### Install Prompt

```typescript
class PWAInstaller {
  private deferredPrompt: any = null;
  
  init(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });
  }
  
  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) return false;
    
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    
    return outcome === 'accepted';
  }
  
  isPWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
  }
}
```

---

## Optional: Lives System

For longer engagement (skip if just for personal use):

```typescript
interface LivesConfig {
  maxLives: 5;
  regenTimeMinutes: 30;
}

class LivesSystem {
  private lives: number;
  private lastLostTime: Date | null;
  
  getLives(): number {
    this.regenerate();
    return this.lives;
  }
  
  useLive(): boolean {
    if (this.lives <= 0) return false;
    this.lives--;
    this.lastLostTime = new Date();
    this.save();
    return true;
  }
  
  private regenerate(): void {
    if (this.lives >= 5 || !this.lastLostTime) return;
    
    const now = new Date();
    const elapsed = now.getTime() - this.lastLostTime.getTime();
    const regenTime = 30 * 60 * 1000; // 30 minutes
    const livesToAdd = Math.floor(elapsed / regenTime);
    
    if (livesToAdd > 0) {
      this.lives = Math.min(5, this.lives + livesToAdd);
      this.lastLostTime = new Date(
        this.lastLostTime.getTime() + livesToAdd * regenTime
      );
    }
  }
  
  getTimeUntilNextLife(): number {
    // Returns milliseconds until next life regenerates
  }
}
```

---

## Optional: Daily Challenge

```typescript
interface DailyChallenge {
  date: string; // YYYY-MM-DD
  seed: number; // Random seed for this day
  levelConfig: LevelConfig;
}

class DailyChallengeSystem {
  getToday(): DailyChallenge {
    const date = new Date().toISOString().split('T')[0];
    const seed = this.hashDate(date);
    
    return {
      date,
      seed,
      levelConfig: this.generateLevel(seed),
    };
  }
  
  private hashDate(date: string): number {
    // Simple hash for deterministic random
    let hash = 0;
    for (const char of date) {
      hash = ((hash << 5) - hash) + char.charCodeAt(0);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  
  private generateLevel(seed: number): LevelConfig {
    // Use seeded random to generate consistent level
  }
}
```

---

## Level Content (50+ Levels)

### World Structure

| World | Levels | Theme | New Elements |
|-------|--------|-------|--------------|
| 1 - Garden | 1-10 | Spring colors | Grass, basic |
| 2 - Castle | 11-20 | Royal theme | Ice |
| 3 - Kitchen | 21-30 | Food theme | Chains, boxes |
| 4 - Library | 31-40 | Books/scrolls | Complex layouts |
| 5 - Tower | 41-50 | Sky theme | All combined |

### Star Gates

- After level 10: Need 20 stars (avg 2 per level)
- After level 20: Need 45 stars
- After level 30: Need 75 stars
- After level 40: Need 110 stars

---

## Success Criteria

Phase 5 is complete when:

1. ✅ 1-3 star rating system works
2. ✅ Level map displays with scroll
3. ✅ Locked/unlocked states visual
4. ✅ Star gates block progress appropriately
5. ✅ Progress saves to localStorage
6. ✅ Settings persist
7. ✅ PWA manifest configured
8. ✅ Service worker caches assets
9. ✅ Can install to home screen
10. ✅ Works offline
11. ✅ 50+ levels playable
12. ✅ Game is fun and complete!

---

## Related Features

- [Level Objectives](../features/level-objectives.md)

---

## Post-Launch Ideas

- Seasonal events/themes
- Leaderboards (needs backend)
- Achievements
- Different game modes
- User-generated levels
- Multiplayer challenges
