# Assets & Icons

Game assets are in `public/assets/`.

## Directory Structure

- `sprites/gems/` - Tile sprites by color (red, blue, green, yellow, purple, orange)
- `sprites/powerups/` - Rocket, bomb, color bomb, propeller sprites
- `sprites/boosters/` - Booster item sprites
- `sprites/characters/` - Hero sprites
- `backgrounds/` - Scene backgrounds
- `audio/` - Sound effects

## Icon Usage

**NEVER use emoji placeholders for icons.** Always use the proper game assets:

### Booster Icons

Load in `preload()`, display with `this.add.image()`:

```typescript
// Preload
this.load.image('booster_hammer', 'assets/sprites/boosters/hammer.png');
this.load.image('booster_row_arrow', 'assets/sprites/boosters/arrow_h.png');
this.load.image('booster_col_arrow', 'assets/sprites/boosters/beam_v.png');
this.load.image('booster_shuffle', 'assets/sprites/boosters/lucky67.png');

// Display (24x24 is good for UI)
this.add.image(x, y, 'booster_hammer').setDisplaySize(24, 24);
```

### Currency Icons

Draw with Phaser graphics (no image files):

**Coins** - Golden circle with $ symbol:
```typescript
this.add.circle(x, y, 14, 0xffd700, 0.3);  // Outer glow
this.add.circle(x, y, 11, 0xffd700);        // Main circle
this.add.circle(x, y, 7, 0xffec8b);         // Inner highlight
this.add.text(x, y, '$', { fontSize: '10px', fontFamily: 'Arial Black', color: '#b8860b' }).setOrigin(0.5);
```

**Diamonds** - Blue diamond shape:
```typescript
this.add.circle(x, y, 13, 0x00bfff, 0.25);  // Glow
const g = this.add.graphics();
g.fillStyle(0x00bfff, 1);
g.fillTriangle(x, y - 9, x + 7, y, x, y + 9);  // Right half
g.fillTriangle(x, y - 9, x - 7, y, x, y + 9);  // Left half
g.fillStyle(0x87ceeb, 1);
g.fillTriangle(x, y - 4, x + 3, y, x, y + 4);  // Inner highlight right
g.fillTriangle(x, y - 4, x - 3, y, x, y + 4);  // Inner highlight left
```

### Powerup Icons

```typescript
this.load.image('rocket_h', 'assets/sprites/powerups/rocket_h.png');
this.load.image('rocket_v', 'assets/sprites/powerups/rocket_v.png');
this.load.image('bomb', 'assets/sprites/powerups/bomb.png');
this.load.image('color_bomb', 'assets/sprites/powerups/color_bomb.png');
this.load.image('propeller', 'assets/sprites/powerups/propeller.png');
```
