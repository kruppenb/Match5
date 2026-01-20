import { CONFIG } from '../../config';

describe('CONFIG', () => {
  describe('GRID', () => {
    test('has reduced GAP for tighter layout', () => {
      expect(CONFIG.GRID.GAP).toBe(2);
    });

    test('has valid tile size', () => {
      expect(CONFIG.GRID.TILE_SIZE).toBeGreaterThan(0);
      expect(CONFIG.GRID.TILE_SIZE).toBeLessThanOrEqual(120);
    });
  });

  describe('COLORS', () => {
    const colorNames = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

    test('has all required colors defined', () => {
      colorNames.forEach(color => {
        expect(CONFIG.COLORS[color]).toBeDefined();
        expect(typeof CONFIG.COLORS[color]).toBe('number');
      });
    });

    test('colors are valid hex values', () => {
      colorNames.forEach(color => {
        const value = CONFIG.COLORS[color];
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(0xffffff);
      });
    });

    test('colors are vibrant (high saturation)', () => {
      // All colors should have at least one channel > 200 (0xC8)
      colorNames.forEach(colorName => {
        const value = CONFIG.COLORS[colorName];
        const r = (value >> 16) & 0xff;
        const g = (value >> 8) & 0xff;
        const b = value & 0xff;
        const max = Math.max(r, g, b);
        expect(max).toBeGreaterThan(150); // Ensure vibrant colors
      });
    });
  });

  describe('UI', () => {
    test('has board overlay colors defined', () => {
      expect(CONFIG.UI.COLORS.BACKGROUND).toBeDefined();
      expect(CONFIG.UI.COLORS.PANEL).toBeDefined();
    });

    test('has proper padding to prevent edge overlaps', () => {
      expect(CONFIG.UI.PADDING).toBeGreaterThanOrEqual(10);
    });

    test('has adequate unified header height for all UI components', () => {
      // Unified header contains level, objectives, hero bar, moves, and menu
      expect(CONFIG.UI.HEADER_HEIGHT).toBeGreaterThanOrEqual(50);
    });

    test('has hero bar dimensions defined', () => {
      expect(CONFIG.UI.HERO_BAR_WIDTH).toBeGreaterThan(0);
      expect(CONFIG.UI.HERO_BAR_HEIGHT).toBeGreaterThan(0);
    });

    test('move counter size is touch-friendly', () => {
      // Minimum 32px for good touch targets
      expect(CONFIG.UI.MOVE_COUNTER_SIZE).toBeGreaterThanOrEqual(32);
    });
  });
});
