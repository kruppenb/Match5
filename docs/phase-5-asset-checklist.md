# Phase 5 Asset Generation Checklist

**Tool:** Nano Banana Pro
**Status:** Updated to reflect current implementation

---

## Summary

The Hero Power System has been **fully implemented with programmatic graphics** in `src/game/HeroPowerSystem.ts`. This means most of the originally planned sprite assets are **no longer required**.

| Category | Original Count | Still Needed | Notes |
|----------|----------------|--------------|-------|
| Booster Icons | 8 | 0-8 | Optional upgrades only |
| Character Portraits | 6 | 0-6 | Optional upgrades only |
| Effect Particles | 7 | 0 | Implemented in code |
| Hero Power Bar UI | 9 | 0 | Implemented in code |
| **Phase 6 Meta UI** | **15** | **15** | **Still required** |

---

## What's Already Implemented in Code

The following features use **Phaser Graphics objects** and do NOT need sprite assets:

- **Power Bar UI** - Background, fill, frame, glow all drawn programmatically
- **Hero Selection Popup** - Panel, cards, highlights all code-drawn
- **Thor Lightning** - Jagged bolts drawn with Graphics paths
- **Iron Man Missiles** - Ellipses and trails with Graphics
- **Iron Man Explosions** - Expanding circles and flashes
- **Elsa Ice Waves** - Rectangles with particle effects
- **Elsa Shatter** - Triangle shards drawn on the fly

The system uses **emoji fallbacks** (⚡🚀❄️) when hero sprites aren't loaded.

---

## Optional Visual Upgrades

These assets already exist but could be upgraded for a more polished look. **Not required for functionality.**

### Existing Booster Icons (Optional Upgrade)

| Asset | Path | Status |
|-------|------|--------|
| Hammer | `boosters/hammer.png` | ✅ Exists |
| Beam V | `boosters/beam_v.png` | ✅ Exists |
| Arrow H | `boosters/arrow_h.png` | ✅ Exists |
| Lucky 67 | `boosters/lucky67.png` | ✅ Exists |

If upgrading, you could also add glow/active states:
- `boosters/hammer_glow.png`
- `boosters/beam_charging.png`
- `boosters/arrow_motion.png`
- `boosters/lucky67_active.png`

### Existing Character Images (Optional Upgrade)

| Asset | Path | Status |
|-------|------|--------|
| Thor | `characters/thor.png` | ✅ Exists |
| Iron Man | `characters/ironman.jpeg` | ✅ Exists |
| Elsa | `characters/elsa.jpeg` | ✅ Exists |

If upgrading to higher quality portraits, use this structure:
```
characters/thor/portrait.png
characters/ironman/portrait.png
characters/elsa/portrait.png
```

---

## Phase 6: Meta Game UI Assets (REQUIRED)

These assets are needed for the meta game features and do not exist yet.

### Currency Icons (64x64px)

#### 31. Gold Coin Icon
- [ ] `public/assets/sprites/ui/coin.png`

**Prompt:**
```
Shiny gold coin game currency icon, chunky 3D style, glowing rim, subtle sparkle, dollar or star symbol embossed, mobile game UI asset, warm golden color, white background
```

---

#### 32. Diamond Icon
- [ ] `public/assets/sprites/ui/diamond.png`

**Prompt:**
```
Brilliant blue diamond gem icon, faceted cut, glowing inner light, sparkle reflections, premium currency style, mobile game UI asset, cyan blue color, white background
```

---

### Reward Assets (128x128px)

#### 33. Treasure Chest (Closed)
- [ ] `public/assets/sprites/ui/chest_closed.png`

**Prompt:**
```
Wooden treasure chest icon closed, metal bands and lock, slightly glowing golden edges, mystery treasure vibe, mobile game style, chunky 3D look, white background
```

---

#### 34. Treasure Chest (Open)
- [ ] `public/assets/sprites/ui/chest_open.png`

**Prompt:**
```
Wooden treasure chest open with golden glow inside, coins and gems spilling out, magical sparkles, reward reveal moment, mobile game style, chunky 3D, white background
```

---

### Mini-Game Assets

#### 35. Spin Wheel Background (400x400px)
- [ ] `public/assets/sprites/ui/wheel_bg.png`

**Prompt:**
```
Colorful fortune wheel game asset, 8 segments in rainbow colors (gold yellow orange red pink purple blue cyan), ornate outer rim, carnival game style, chunky mobile game look, white background
```

---

#### 36. Spin Wheel Pointer (64x80px)
- [ ] `public/assets/sprites/ui/wheel_pointer.png`

**Prompt:**
```
Arrow pointer for spin wheel, glossy red with golden trim, pointing downward, 3D game UI element, shiny material, mobile game style, white background
```

---

#### 37. Playing Card Back (100x140px)
- [ ] `public/assets/sprites/ui/card_back.png`

**Prompt:**
```
Game playing card back design, ornate pattern, deep purple with gold accents, mystery card style, question mark subtle pattern, mobile game asset, rounded corners, white background
```

---

### Navigation Icons (64x64px)

#### 38. Shop Icon
- [ ] `public/assets/sprites/ui/icon_shop.png`

**Prompt:**
```
Shopping cart or shop bag icon, golden and white, coins inside, game store button, mobile game UI style, chunky friendly design, white background
```

---

#### 39. Mini-Games Icon
- [ ] `public/assets/sprites/ui/icon_games.png`

**Prompt:**
```
Game controller or dice icon, playful colorful design, arcade game vibe, mobile game button asset, fun and inviting, white background
```

---

#### 40. Event/Lightning Icon
- [ ] `public/assets/sprites/ui/icon_event.png`

**Prompt:**
```
Lightning bolt in shield or badge, golden energy, special event indicator, mobile game UI icon, power surge theme, glowing effect, white background
```

---

### Powerup Icons for Shop/Rewards (64x64px)

#### 41. Rocket Powerup Icon
- [ ] `public/assets/sprites/ui/powerup_rocket.png`

**Prompt:**
```
Cartoon rocket icon, red and white, exhaust flames, ready to launch, mobile game powerup style, chunky cute design, white background
```

---

#### 42. Bomb Powerup Icon
- [ ] `public/assets/sprites/ui/powerup_bomb.png`

**Prompt:**
```
Cartoon bomb icon, round black bomb with lit fuse, sparks, about to explode, mobile game powerup style, chunky cute design, white background
```

---

#### 43. Color Bomb/Rainbow Icon
- [ ] `public/assets/sprites/ui/powerup_rainbow.png`

**Prompt:**
```
Rainbow burst or color bomb icon, circular with rainbow colors radiating outward, magical sparkles, mobile game powerup style, vibrant colors, white background
```

---

### Additional UI Elements

#### 44. Hero Charge Meter Empty (300x40px)
- [ ] `public/assets/sprites/ui/charge_meter_empty.png`

**Prompt:**
```
Empty power meter bar, dark interior with metallic frame, subtle grid pattern inside, mobile game UI element, horizontal gauge style, white background
```

---

#### 45. Hero Charge Meter Fill (280x30px, tileable)
- [ ] `public/assets/sprites/ui/charge_meter_fill.png`

**Prompt:**
```
Glowing energy fill for power meter, gradient from blue to bright cyan to gold at full, pulsing energy particles, game charge bar fill, can tile horizontally, white background
```

---

## Directory Setup

Run this to create the folder structure for Phase 6 assets:
```bash
mkdir -p public/assets/sprites/ui
```

---

## Asset Generation Tips

- Add `game asset, 2D sprite` to prompts if results are too realistic
- Use `centered composition, single object` if items are off-center
- Add `solid white background` if the background isn't pure white
- Generate at 2x size and downscale for sharper results

---

## Final Checklist

| # | Asset | Size | Status |
|---|-------|------|--------|
| 31 | coin.png | 64x64 | [ ] |
| 32 | diamond.png | 64x64 | [ ] |
| 33 | chest_closed.png | 128x128 | [ ] |
| 34 | chest_open.png | 128x128 | [ ] |
| 35 | wheel_bg.png | 400x400 | [ ] |
| 36 | wheel_pointer.png | 64x80 | [ ] |
| 37 | card_back.png | 100x140 | [ ] |
| 38 | icon_shop.png | 64x64 | [ ] |
| 39 | icon_games.png | 64x64 | [ ] |
| 40 | icon_event.png | 64x64 | [ ] |
| 41 | powerup_rocket.png | 64x64 | [ ] |
| 42 | powerup_bomb.png | 64x64 | [ ] |
| 43 | powerup_rainbow.png | 64x64 | [ ] |
| 44 | charge_meter_empty.png | 300x40 | [ ] |
| 45 | charge_meter_fill.png | 280x30 | [ ] |

**Total Required: 15 assets**
