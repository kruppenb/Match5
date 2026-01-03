# Phase 7: Title Screen Redesign

**Status:** 🟡 In Progress
**Prerequisites:** [Phase 6: Meta Game](phase-6-meta.md)
**Goal:** Streamlined home screen focused on "Play Now" with prominent meta features

---

## Overview

Replace the level selection grid with a clean, focused home screen. Players should immediately see their current level and tap to play. Meta features (Shop, Games, Events) become first-class citizens rather than hidden buttons.

**Design Philosophy:** One tap to play. Everything else is easily accessible but not blocking.

---

## Current Problems

1. Level grid is cluttered and unnecessary - players almost always play their current level
2. Shop/Games/Event buttons are small and easy to miss
3. Currency display is cramped in corner
4. No booster selection before starting a level
5. No visual identity or branding presence

---

## New Layout (Top to Bottom)

```
┌─────────────────────────────────────┐
│         PRINCESS MATCH              │  <- Game logo/title
│           ⭐ 47 stars               │  <- Total stars (pride counter)
├─────────────────────────────────────┤
│                                     │
│      ┌─────────────────────┐        │
│      │   🪙 2,450   💎 35  │        │  <- Currency bar (prominent)
│      └─────────────────────┘        │
│                                     │
├─────────────────────────────────────┤
│                                     │
│         ┌───────────────┐           │
│         │               │           │
│         │   LEVEL 24    │           │  <- Current level display
│         │               │           │  <- Hero portrait here?
│         │   [▶ PLAY!]   │           │  <- Big play button
│         │               │           │
│         └───────────────┘           │
│                                     │
├─────────────────────────────────────┤
│  Select Boosters:                   │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐       │
│  │ 🔨 │ │ ➡️ │ │ ⬇️ │ │ 🔀 │       │  <- Booster slots (tap to toggle)
│  │ x3 │ │ x1 │ │ x2 │ │ x0 │       │  <- Owned count
│  └────┘ └────┘ └────┘ └────┘       │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐│
│  │   🛒    │ │   🎮    │ │   ⚡    ││  <- Meta buttons (larger)
│  │  SHOP   │ │  GAMES  │ │  EVENT  ││
│  │         │ │  2d 4h  │ │   !     ││  <- Subtitle/notification
│  └─────────┘ └─────────┘ └─────────┘│
│                                     │
├─────────────────────────────────────┤
│  [All Levels]  [🔄 Replay]   [⚙️]  │  <- Secondary nav (smaller)
│                  💎 2/3             │  <- Daily replay bonus tracker
└─────────────────────────────────────┘
```

---

## Deliverables Checklist

### Main Title Screen
- [x] Game logo/title at top
- [x] Total stars display (small, pride metric)
- [x] Large, centered currency bar (coins + diamonds)
- [x] Current level card (big, tappable)
- [x] Level number prominently displayed
- [ ] Optional: Hero portrait on level card
- [x] Large "PLAY" button

### Booster Selection Bar
- [x] Horizontal row of 4 booster slots
- [x] Show owned count for each
- [x] Tap to select/deselect for next level
- [x] Visual feedback for selected boosters
- [x] Grayed out if count is 0
- [x] Selected boosters passed to GameScene

### Meta Feature Buttons
- [x] Three large buttons in a row
- [x] Shop button with cart icon
- [x] Games button with rotation timer subtitle
- [x] Event button with notification badge
- [x] Each ~100px wide, visually prominent

### Secondary Navigation
- [x] "All Levels" text button (opens level grid)
- [x] "Replay" button (opens replay past levels screen)
- [x] Settings gear icon
- [ ] Both small and unobtrusive

### Level Grid (Separate Screen)
- [x] Moved to its own scene (LevelGridScene)
- [x] Accessed via "All Levels" button
- [x] Keep existing grid layout
- [x] Add back button to return to title

### Replay Past Levels Screen
- [x] New ReplayLevelsScene accessible from title screen
- [x] Shows grid of all completed levels (unlocked levels < current)
- [x] Daily bonus indicator (gems earned for replaying)
- [x] Visual tracker showing 0/3 daily replays completed
- [x] Bonus resets at midnight (local time)
- [x] Each completed replay awards bonus gems (e.g., 50 gems)
- [x] After 3 daily replays, can still play but no bonus
- [x] Back button to return to title

---

## Component Details

### Currency Bar

```typescript
// Centered, larger than current corner display
// Background panel with subtle glow
// Coin icon + count | Diamond icon + count
// Tap either to open shop

interface CurrencyBarConfig {
  width: 280,
  height: 50,
  coinIconSize: 28,
  diamondIconSize: 24,
  fontSize: 22,
  backgroundColor: 0x2a2a3e,
  borderColor: 0x4a90d9,
}
```

### Current Level Card

```typescript
// Large central card showing current level
// Tapping anywhere on card = start level

interface LevelCardConfig {
  width: 280,
  height: 200,
  backgroundColor: 0x3a4a5e,
  borderRadius: 20,
  levelNumberFontSize: 48,
  playButtonWidth: 160,
  playButtonHeight: 50,
}

// Shows:
// - "Level X" in large text
// - Optional: Level preview (objectives icons)
// - Optional: Hero portrait
// - Big green "PLAY!" button
```

### Booster Selection Bar

```typescript
interface BoosterSlot {
  type: BoosterType;
  owned: number;
  selected: boolean;
}

// Behavior:
// - Tap booster with count > 0 to toggle selection
// - Selected boosters have glow/border
// - Multiple boosters can be selected
// - Selected boosters are consumed when level starts
// - Pass selected boosters to GameScene via scene data
```

### Meta Buttons

```typescript
interface MetaButtonConfig {
  width: 100,
  height: 80,
  iconSize: 32,
  labelFontSize: 12,
  subtitleFontSize: 10,
}

// Shop: Icon + "SHOP" label
// Games: Icon + "GAMES" + rotation timer ("2d 4h")
// Event: Icon + "EVENT" + notification badge if rewards available
```

### Replay Past Levels Scene

```typescript
interface DailyReplayBonus {
  date: string;              // YYYY-MM-DD format
  completedCount: number;    // 0-3 replays completed today
  gemsPerReplay: number;     // e.g., 50 gems
  maxDailyReplays: number;   // 3
}

interface ReplayLevelCard {
  levelNumber: number;
  stars: number;             // 1-3 stars earned
  bestScore: number;
  canEarnBonus: boolean;     // true if dailyReplays < 3
}

// Layout:
// ┌─────────────────────────────────────┐
// │  ← Back       REPLAY LEVELS         │
// ├─────────────────────────────────────┤
// │                                     │
// │   💎 Daily Bonus: 2/3 remaining     │  <- Bonus tracker
// │   ┌─────────────────────────────┐   │
// │   │  +50 💎 per level!          │   │  <- Reward callout
// │   └─────────────────────────────┘   │
// │                                     │
// ├─────────────────────────────────────┤
// │                                     │
// │   ┌────┐ ┌────┐ ┌────┐ ┌────┐     │  <- Level grid
// │   │ 1  │ │ 2  │ │ 3  │ │ 4  │     │
// │   │⭐⭐⭐│ │⭐⭐ │ │⭐⭐⭐│ │⭐  │     │
// │   └────┘ └────┘ └────┘ └────┘     │
// │                                     │
// │   ┌────┐ ┌────┐ ┌────┐ ┌────┐     │
// │   │ 5  │ │ 6  │ │ 7  │ │ 8  │     │
// │   │⭐⭐ │ │⭐⭐⭐│ │⭐⭐ │ │⭐  │     │
// │   └────┘ └────┘ └────┘ └────┘     │
// │                                     │
// │          ... scrollable ...         │
// │                                     │
// └─────────────────────────────────────┘

// Behavior:
// - Shows only completed levels (level < currentLevel)
// - Tap any level to replay it
// - If dailyReplays < 3, show gem bonus badge on level cards
// - After winning, award bonus gems and increment dailyReplays
// - At midnight (local), reset dailyReplays to 0
// - If dailyReplays >= 3, can still play but no bonus shown
```

### Daily Replay Storage

```typescript
interface DailyReplayData {
  lastResetDate: string;     // YYYY-MM-DD
  replaysCompleted: number;  // 0-3
}

// Storage key: 'dailyReplay'
// Check on app load: if lastResetDate !== today, reset to 0
// Increment after each successful replay level completion
```

---

## Scene Flow

```
                    ┌─────────────────┐
                    │   TitleScene    │ <- NEW main scene
                    │  (Home Screen)  │
                    └────────┬────────┘
                             │
     ┌───────────────────────┼───────────────────────┐
     │                       │                       │
     ▼                       ▼                       ▼
┌──────────┐          ┌─────────────┐         ┌─────────────┐
│GameScene │          │ LevelGrid   │         │   Shop/     │
│(current) │          │   Scene     │         │  Games/etc  │
└──────────┘          └─────────────┘         └─────────────┘
     │                       │
     ▼                       │
┌──────────┐                 │
│TitleScene│ <───────────────┘
│ (return) │
└──────────┘
     ▲
     │
┌────┴─────┐          ┌─────────────┐
│GameScene │ <────────│ReplayLevels │ <- NEW replay scene
│ (replay) │          │   Scene     │
└──────────┘          └─────────────┘
                             ▲
                             │
                      ┌──────┴──────┐
                      │ TitleScene  │
                      │ (Replay btn)│
                      └─────────────┘
```

### Scene Changes

| Scene | Status | Notes |
|-------|--------|-------|
| TitleScene | NEW | Main home screen |
| LevelSelectScene | RENAME | Becomes LevelGridScene |
| ReplayLevelsScene | NEW | Replay past levels with daily bonus |
| GameScene | MODIFY | Accept selected boosters, handle replay mode |
| PreLevelScene | REMOVE? | Merge into TitleScene |
| ShopScene | KEEP | No changes |
| MiniGameHubScene | KEEP | No changes |

---

## PreLevelScene Merge

The current PreLevelScene functionality can be merged into TitleScene:
- **Hero charging:** Add charge slider to level card (or remove for simplicity)
- **Booster selection:** Now on main screen
- **Level preview:** Shown in level card

Alternatively, keep PreLevelScene for:
- Detailed level objectives preview
- Hero charging UI (if keeping)
- Additional booster purchase prompt

**Decision needed:** Full merge vs. simplified PreLevelScene?

---

### Title Screen Background
- [ ] New background image featuring princess and fantasy castle
- [ ] Same background used for TitleScene and ReplayLevelsScene
- [ ] Soft/blurred style so UI elements stand out
- [ ] Princess positioned lower-center, castle in background
- [ ] Magical sparkles/particles overlay

---

## Visual Design Notes

### Color Palette
- Background: Princess castle scene (new asset)
- Cards/Panels: Semi-transparent dark (#2a2a3e @ 90%)
- Accent: Blue (#4a90d9) for borders, buttons
- Currency: Gold (#ffd700) for coins, Cyan (#00bfff) for diamonds
- Play button: Green (#44aa44)

### Animation Ideas
- Level card: Subtle floating/breathing animation
- Play button: Gentle pulse when idle
- Booster slots: Bounce when selected
- Currency: Sparkle effect on change
- Event button: Pulse if rewards available

### Sound Ideas
- Button taps: Soft click
- Booster select: Pop sound
- Play button: Energetic start sound
- Screen transitions: Whoosh

---

## Implementation Order

1. Create new TitleScene with basic layout
2. Add currency bar (copy/adapt from existing)
3. Add current level card with play button
4. Add booster selection bar
5. Add meta feature buttons
6. Add "All Levels", "Replay", and settings links
7. Rename LevelSelectScene to LevelGridScene
8. **Create ReplayLevelsScene with daily bonus system**
9. **Add DailyReplayManager to handle bonus tracking/reset**
10. Update scene flow in main.ts
11. Update GameScene to accept booster selections and replay mode
12. Decide fate of PreLevelScene
13. Polish animations and transitions

---

## Success Criteria

Phase 7 is complete when:

1. New TitleScene is the first scene shown
2. One tap to play current level
3. Currency prominently displayed
4. Boosters selectable before playing
5. Shop/Games/Event easily accessible
6. All Levels grid still accessible
7. **Replay Past Levels screen accessible with daily bonus**
8. **Daily bonus awards gems for up to 3 replays per day**
9. **Bonus resets at midnight and persists across sessions**
10. Clean, uncluttered appearance
11. Smooth transitions between scenes

---

## Open Questions

1. Keep hero charging feature? If yes, where does UI go?
2. Show level objectives preview on title screen or separate?
3. Include daily login popup on title screen or separate moment?
4. Show event progress bar on title screen?
5. Add hero portrait to level card?
6. **Replay bonus amount: 50 gems per replay? Scale with level difficulty?**
7. **Should replay bonus tracker be visible on title screen or only in ReplayLevelsScene?**
8. **Add special effects/celebration when earning daily replay bonus?**

---

## Future Enhancements

- Animated background (subtle particles, floating gems)
- Seasonal themes (holiday decorations)
- Featured hero showcase
- Limited-time offer banners
- Friend activity feed
