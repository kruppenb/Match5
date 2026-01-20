import {
  calculateUILayout,
  rectsOverlap,
  rectWithinScreen,
  validateUILayout,
  DEVICE_SCREENS,
  Rect,
} from '../UILayout';
import { CONFIG } from '../../config';

describe('UILayout', () => {
  describe('rectsOverlap', () => {
    test('returns true for overlapping rectangles', () => {
      const a: Rect = { x: 0, y: 0, width: 100, height: 100 };
      const b: Rect = { x: 50, y: 50, width: 100, height: 100 };
      expect(rectsOverlap(a, b)).toBe(true);
    });

    test('returns false for non-overlapping rectangles', () => {
      const a: Rect = { x: 0, y: 0, width: 100, height: 100 };
      const b: Rect = { x: 150, y: 0, width: 100, height: 100 };
      expect(rectsOverlap(a, b)).toBe(false);
    });

    test('returns false for adjacent rectangles', () => {
      const a: Rect = { x: 0, y: 0, width: 100, height: 100 };
      const b: Rect = { x: 100, y: 0, width: 100, height: 100 };
      expect(rectsOverlap(a, b)).toBe(false);
    });
  });

  describe('rectWithinScreen', () => {
    test('returns true for rect within screen', () => {
      const rect: Rect = { x: 10, y: 10, width: 100, height: 100 };
      expect(rectWithinScreen(rect, 500, 500)).toBe(true);
    });

    test('returns false for rect extending past left edge', () => {
      const rect: Rect = { x: -10, y: 10, width: 100, height: 100 };
      expect(rectWithinScreen(rect, 500, 500)).toBe(false);
    });

    test('returns false for rect extending past right edge', () => {
      const rect: Rect = { x: 450, y: 10, width: 100, height: 100 };
      expect(rectWithinScreen(rect, 500, 500)).toBe(false);
    });

    test('returns false for rect extending past bottom edge', () => {
      const rect: Rect = { x: 10, y: 450, width: 100, height: 100 };
      expect(rectWithinScreen(rect, 500, 500)).toBe(false);
    });
  });

  describe('calculateUILayout', () => {
    test('calculates layout for standard screen', () => {
      const layout = calculateUILayout(390, 844);

      // Level text near left edge
      expect(layout.levelText.x).toBeGreaterThanOrEqual(CONFIG.UI.PADDING);
      expect(layout.levelText.x).toBeLessThan(CONFIG.UI.PADDING + 10);
      // Move counter is positioned right-of-center in unified header
      expect(layout.moveCounter.x).toBeGreaterThan(390 / 2);
      // Menu button near right edge
      expect(layout.menuButton.x + layout.menuButton.width).toBeCloseTo(390 - CONFIG.UI.PADDING - 4, 1);
    });

    test('game board fits within available space', () => {
      const layout = calculateUILayout(390, 844, 8, 8);

      expect(layout.gameBoard.x).toBeGreaterThanOrEqual(0);
      expect(layout.gameBoard.y).toBeGreaterThan(CONFIG.UI.HEADER_HEIGHT);
      expect(layout.gameBoard.x + layout.gameBoard.width).toBeLessThanOrEqual(390);
    });
  });

  describe('validateUILayout - iPhone 12 series', () => {
    test('iPhone 12 Mini (375x812) - no overlaps', () => {
      const screen = DEVICE_SCREENS.IPHONE_12_MINI;
      const result = validateUILayout(screen.width, screen.height);

      if (!result.valid) {
        console.log(`${screen.name} layout errors:`, result.errors);
      }
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('iPhone 12 (390x844) - no overlaps', () => {
      const screen = DEVICE_SCREENS.IPHONE_12;
      const result = validateUILayout(screen.width, screen.height);

      if (!result.valid) {
        console.log(`${screen.name} layout errors:`, result.errors);
      }
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('iPhone 12 Pro (390x844) - no overlaps', () => {
      const screen = DEVICE_SCREENS.IPHONE_12_PRO;
      const result = validateUILayout(screen.width, screen.height);

      if (!result.valid) {
        console.log(`${screen.name} layout errors:`, result.errors);
      }
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('iPhone 12 Pro Max (428x926) - no overlaps', () => {
      const screen = DEVICE_SCREENS.IPHONE_12_PRO_MAX;
      const result = validateUILayout(screen.width, screen.height);

      if (!result.valid) {
        console.log(`${screen.name} layout errors:`, result.errors);
      }
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateUILayout - iPhone 13 series', () => {
    test('iPhone 13 Mini (375x812) - no overlaps', () => {
      const screen = DEVICE_SCREENS.IPHONE_13_MINI;
      const result = validateUILayout(screen.width, screen.height);

      if (!result.valid) {
        console.log(`${screen.name} layout errors:`, result.errors);
      }
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('iPhone 13 (390x844) - no overlaps', () => {
      const screen = DEVICE_SCREENS.IPHONE_13;
      const result = validateUILayout(screen.width, screen.height);

      if (!result.valid) {
        console.log(`${screen.name} layout errors:`, result.errors);
      }
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('iPhone 13 Pro (390x844) - no overlaps', () => {
      const screen = DEVICE_SCREENS.IPHONE_13_PRO;
      const result = validateUILayout(screen.width, screen.height);

      if (!result.valid) {
        console.log(`${screen.name} layout errors:`, result.errors);
      }
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('iPhone 13 Pro Max (428x926) - no overlaps', () => {
      const screen = DEVICE_SCREENS.IPHONE_13_PRO_MAX;
      const result = validateUILayout(screen.width, screen.height);

      if (!result.valid) {
        console.log(`${screen.name} layout errors:`, result.errors);
      }
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateUILayout - other common devices', () => {
    test('iPhone SE (375x667) - no overlaps', () => {
      const screen = DEVICE_SCREENS.IPHONE_SE;
      const result = validateUILayout(screen.width, screen.height);

      if (!result.valid) {
        console.log(`${screen.name} layout errors:`, result.errors);
      }
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('iPhone 14 Pro (393x852) - no overlaps', () => {
      const screen = DEVICE_SCREENS.IPHONE_14_PRO;
      const result = validateUILayout(screen.width, screen.height);

      if (!result.valid) {
        console.log(`${screen.name} layout errors:`, result.errors);
      }
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('Android small (360x640) - no overlaps', () => {
      const screen = DEVICE_SCREENS.ANDROID_SMALL;
      const result = validateUILayout(screen.width, screen.height);

      if (!result.valid) {
        console.log(`${screen.name} layout errors:`, result.errors);
      }
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('Android medium (412x915) - no overlaps', () => {
      const screen = DEVICE_SCREENS.ANDROID_MEDIUM;
      const result = validateUILayout(screen.width, screen.height);

      if (!result.valid) {
        console.log(`${screen.name} layout errors:`, result.errors);
      }
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateUILayout - with multiple objectives', () => {
    test('3 objectives on iPhone 12 Mini - no overlaps', () => {
      const screen = DEVICE_SCREENS.IPHONE_12_MINI;
      const result = validateUILayout(screen.width, screen.height, 8, 8, 3);

      if (!result.valid) {
        console.log(`${screen.name} with 3 objectives errors:`, result.errors);
      }
      expect(result.valid).toBe(true);
    });

    test('3 objectives on iPhone 13 - no overlaps', () => {
      const screen = DEVICE_SCREENS.IPHONE_13;
      const result = validateUILayout(screen.width, screen.height, 8, 8, 3);

      if (!result.valid) {
        console.log(`${screen.name} with 3 objectives errors:`, result.errors);
      }
      expect(result.valid).toBe(true);
    });
  });

  describe('validateUILayout - different grid sizes', () => {
    test('6x6 grid on iPhone 12 - no overlaps', () => {
      const screen = DEVICE_SCREENS.IPHONE_12;
      const result = validateUILayout(screen.width, screen.height, 6, 6);

      if (!result.valid) {
        console.log(`${screen.name} 6x6 grid errors:`, result.errors);
      }
      expect(result.valid).toBe(true);
    });

    test('9x9 grid on iPhone 13 Pro Max - no overlaps', () => {
      const screen = DEVICE_SCREENS.IPHONE_13_PRO_MAX;
      const result = validateUILayout(screen.width, screen.height, 9, 9);

      if (!result.valid) {
        console.log(`${screen.name} 9x9 grid errors:`, result.errors);
      }
      expect(result.valid).toBe(true);
    });

    test('7x8 rectangular grid on iPhone 13 - no overlaps', () => {
      const screen = DEVICE_SCREENS.IPHONE_13;
      const result = validateUILayout(screen.width, screen.height, 7, 8);

      if (!result.valid) {
        console.log(`${screen.name} 7x8 grid errors:`, result.errors);
      }
      expect(result.valid).toBe(true);
    });
  });

  describe('Header component layout', () => {
    test('header components have proper horizontal spacing', () => {
      const screen = DEVICE_SCREENS.IPHONE_12_MINI;
      const layout = calculateUILayout(screen.width, screen.height);

      // Level text should not overlap with move counter label
      const levelTextRight = layout.levelText.x + layout.levelText.width;
      const moveCounterLabelLeft = layout.moveCounterLabel.x;
      const headerSpacing = moveCounterLabelLeft - levelTextRight;

      expect(headerSpacing).toBeGreaterThanOrEqual(0);
    });

    test('move counter is positioned right-of-center before menu button', () => {
      const screen = DEVICE_SCREENS.IPHONE_13;
      const layout = calculateUILayout(screen.width, screen.height);

      // Move counter should be to the right of center (in the new unified header layout)
      const moveCounterCenter = layout.moveCounter.x + layout.moveCounter.width / 2;
      expect(moveCounterCenter).toBeGreaterThan(screen.width / 2);
      // And to the left of the menu button
      expect(layout.moveCounter.x + layout.moveCounter.width).toBeLessThan(layout.menuButton.x);
    });

    test('all header elements are within header height', () => {
      const screen = DEVICE_SCREENS.IPHONE_13;
      const layout = calculateUILayout(screen.width, screen.height);

      expect(layout.levelText.y).toBeGreaterThanOrEqual(0);
      expect(layout.levelText.y + layout.levelText.height).toBeLessThanOrEqual(CONFIG.UI.HEADER_HEIGHT);

      expect(layout.moveCounter.y).toBeGreaterThanOrEqual(0);
      expect(layout.moveCounter.y + layout.moveCounter.height).toBeLessThanOrEqual(CONFIG.UI.HEADER_HEIGHT);

      expect(layout.menuButton.y).toBeGreaterThanOrEqual(0);
      expect(layout.menuButton.y + layout.menuButton.height).toBeLessThanOrEqual(CONFIG.UI.HEADER_HEIGHT);
    });
  });

  describe('Game board sizing', () => {
    test('game board tiles are reasonably sized on small screens', () => {
      const screen = DEVICE_SCREENS.IPHONE_SE;
      const layout = calculateUILayout(screen.width, screen.height, 8, 8);

      const tileSize = layout.gameBoard.width / 8;
      // Tiles should be at least 35px for good touch targets
      expect(tileSize).toBeGreaterThanOrEqual(35);
    });

    test('game board does not exceed screen width', () => {
      for (const screen of Object.values(DEVICE_SCREENS)) {
        const layout = calculateUILayout(screen.width, screen.height, 8, 8);
        expect(layout.gameBoard.x).toBeGreaterThanOrEqual(0);
        expect(layout.gameBoard.x + layout.gameBoard.width).toBeLessThanOrEqual(screen.width);
      }
    });
  });
});
