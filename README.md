# Match5 - Puzzle Game

A tile-matching puzzle game inspired by Royal Match, built with TypeScript and Phaser 3.

## Development

```bash
# Install dependencies
npm install

# Run development server (accessible on network for mobile testing)
npm run dev

# Build for production
npm run build
```

## Testing on Mobile

1. Start the dev server: `npm run dev`
2. Find your computer's local IP address
3. On your iPhone, open Safari and navigate to `http://YOUR_IP:5173`
4. For best experience, tap Share > Add to Home Screen

## Current Status: Phase 1 POC

✅ Grid rendering with colored tiles
✅ Swipe input (touch and mouse)
✅ Match detection (3, 4, 5+ tiles)
✅ Powerup creation (Rocket, Bomb, Color Bomb)
✅ Tile clearing animation
✅ Gravity and tile falling
✅ Cascade reactions

## Next Steps

- Powerup activation
- Particles and effects
- Sound effects
- Level objectives

See [docs/plan.md](docs/plan.md) for full development plan.
