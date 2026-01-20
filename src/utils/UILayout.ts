/**
 * UI Layout utilities for calculating component positions and detecting overlaps
 */

import { CONFIG } from '../config';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UILayoutBounds {
  levelText: Rect;
  moveCounter: Rect;
  moveCounterLabel: Rect;
  menuButton: Rect;
  objectiveDisplay: Rect;
  gameBoard: Rect;
  boosterBar: Rect;
}

/**
 * Common device screen sizes for testing
 */
export const DEVICE_SCREENS = {
  // iPhone models
  IPHONE_12_MINI: { width: 375, height: 812, name: 'iPhone 12 Mini' },
  IPHONE_12: { width: 390, height: 844, name: 'iPhone 12' },
  IPHONE_12_PRO: { width: 390, height: 844, name: 'iPhone 12 Pro' },
  IPHONE_12_PRO_MAX: { width: 428, height: 926, name: 'iPhone 12 Pro Max' },
  IPHONE_13_MINI: { width: 375, height: 812, name: 'iPhone 13 Mini' },
  IPHONE_13: { width: 390, height: 844, name: 'iPhone 13' },
  IPHONE_13_PRO: { width: 390, height: 844, name: 'iPhone 13 Pro' },
  IPHONE_13_PRO_MAX: { width: 428, height: 926, name: 'iPhone 13 Pro Max' },
  IPHONE_14: { width: 390, height: 844, name: 'iPhone 14' },
  IPHONE_14_PRO: { width: 393, height: 852, name: 'iPhone 14 Pro' },
  IPHONE_SE: { width: 375, height: 667, name: 'iPhone SE' },

  // Android common sizes
  ANDROID_SMALL: { width: 360, height: 640, name: 'Android Small' },
  ANDROID_MEDIUM: { width: 412, height: 915, name: 'Android Medium' },

  // Tablets
  IPAD_MINI: { width: 768, height: 1024, name: 'iPad Mini' },
} as const;

/**
 * Calculate UI component bounds for a given screen size
 */
export function calculateUILayout(
  screenWidth: number,
  screenHeight: number,
  gridRows: number = 8,
  gridCols: number = 8,
  objectiveCount: number = 1
): UILayoutBounds {
  const padding = CONFIG.UI.PADDING;
  const headerHeight = CONFIG.UI.HEADER_HEIGHT; // Single unified header
  const boosterBarHeight = CONFIG.UI.BOOSTER_BAR_HEIGHT;
  const moveCounterSize = CONFIG.UI.MOVE_COUNTER_SIZE;

  // Level text (left side of header)
  const levelTextWidth = 50; // Compact "Lv.XX"
  const levelTextHeight = 20;
  const levelText: Rect = {
    x: padding + 4,
    y: headerHeight / 2 - levelTextHeight / 2,
    width: levelTextWidth,
    height: levelTextHeight,
  };

  // Menu button (right side of header)
  const menuButtonWidth = 50;
  const menuButtonHeight = 26;
  const menuButton: Rect = {
    x: screenWidth - padding - menuButtonWidth - 4,
    y: headerHeight / 2 - menuButtonHeight / 2,
    width: menuButtonWidth,
    height: menuButtonHeight,
  };

  // Move counter (right of center, before menu)
  const moveCounterX = screenWidth - padding - 60 - moveCounterSize / 2;
  const moveCounter: Rect = {
    x: moveCounterX - moveCounterSize / 2,
    y: headerHeight / 2 - moveCounterSize / 2,
    width: moveCounterSize,
    height: moveCounterSize,
  };

  // Move counter label (not shown in compact mode, but kept for compatibility)
  const labelWidth = 0;
  const labelHeight = 0;
  const moveCounterLabel: Rect = {
    x: moveCounter.x,
    y: moveCounter.y,
    width: labelWidth,
    height: labelHeight,
  };

  // Objective display (inline in header, positioned after level text with safe margin)
  const objectiveItemWidth = CONFIG.UI.OBJECTIVE_ICON_SIZE + 32;
  const objectiveWidth = objectiveCount * objectiveItemWidth;
  const objectiveHeight = CONFIG.UI.OBJECTIVE_ICON_SIZE;
  // Position objectives after level text with a gap, centered in remaining space
  const levelTextEnd = levelText.x + levelText.width;
  const availableForObjectives = moveCounter.x - levelTextEnd - 20; // 20px gaps on each side
  const objectiveStartX = levelTextEnd + 10 + Math.max(0, (availableForObjectives - objectiveWidth) / 2);
  const objectiveDisplay: Rect = {
    x: objectiveStartX,
    y: headerHeight / 2 - objectiveHeight / 2,
    width: Math.min(objectiveWidth, availableForObjectives),
    height: objectiveHeight,
  };

  // Game board (center of remaining space below header)
  const availableWidth = screenWidth - padding * 2;
  const availableHeight = screenHeight - headerHeight - boosterBarHeight - padding;

  const maxTileWidth = availableWidth / gridCols;
  const maxTileHeight = availableHeight / gridRows;
  const tileSize = Math.floor(Math.min(maxTileWidth, maxTileHeight));

  const boardWidth = gridCols * tileSize;
  const boardHeight = gridRows * tileSize;
  const boardX = (screenWidth - boardWidth) / 2;
  const boardY = headerHeight + (availableHeight - boardHeight) / 2 + padding / 2;

  const gameBoard: Rect = {
    x: boardX,
    y: boardY,
    width: boardWidth,
    height: boardHeight,
  };

  // Booster bar (bottom of screen)
  const boosterBarWidth = 250;
  const boosterBarActualHeight = 60;
  const boosterBar: Rect = {
    x: screenWidth / 2 - boosterBarWidth / 2,
    y: screenHeight - boosterBarHeight / 2 - boosterBarActualHeight / 2,
    width: boosterBarWidth,
    height: boosterBarActualHeight,
  };

  return {
    levelText,
    moveCounter,
    moveCounterLabel,
    menuButton,
    objectiveDisplay,
    gameBoard,
    boosterBar,
  };
}

/**
 * Check if two rectangles overlap
 */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

/**
 * Check if a rectangle is fully within screen bounds
 */
export function rectWithinScreen(rect: Rect, screenWidth: number, screenHeight: number): boolean {
  return (
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.x + rect.width <= screenWidth &&
    rect.y + rect.height <= screenHeight
  );
}

/**
 * Check all UI components for overlaps and out-of-bounds
 */
export function validateUILayout(
  screenWidth: number,
  screenHeight: number,
  gridRows: number = 8,
  gridCols: number = 8,
  objectiveCount: number = 1
): { valid: boolean; errors: string[] } {
  const layout = calculateUILayout(screenWidth, screenHeight, gridRows, gridCols, objectiveCount);
  const errors: string[] = [];

  // Check header components don't overlap
  if (rectsOverlap(layout.levelText, layout.moveCounterLabel)) {
    errors.push('Level text overlaps with move counter label');
  }
  if (rectsOverlap(layout.levelText, layout.moveCounter)) {
    errors.push('Level text overlaps with move counter');
  }
  if (rectsOverlap(layout.moveCounter, layout.menuButton)) {
    errors.push('Move counter overlaps with menu button');
  }
  if (rectsOverlap(layout.moveCounterLabel, layout.menuButton)) {
    errors.push('Move counter label overlaps with menu button');
  }

  // In the unified header layout, objectives are INSIDE the header (not below it)
  // So we check that objectives don't overlap with level text or menu button
  if (rectsOverlap(layout.objectiveDisplay, layout.levelText)) {
    errors.push('Objective display overlaps with level text');
  }
  if (rectsOverlap(layout.objectiveDisplay, layout.menuButton)) {
    errors.push('Objective display overlaps with menu button');
  }
  // Objectives should still not overlap with game board
  if (rectsOverlap(layout.objectiveDisplay, layout.gameBoard)) {
    errors.push('Objective display overlaps with game board');
  }

  // Check game board doesn't overlap with booster bar
  if (rectsOverlap(layout.gameBoard, layout.boosterBar)) {
    errors.push('Game board overlaps with booster bar');
  }

  // Check all components are within screen bounds
  const components = [
    { name: 'Level text', rect: layout.levelText },
    { name: 'Move counter', rect: layout.moveCounter },
    { name: 'Menu button', rect: layout.menuButton },
    { name: 'Objective display', rect: layout.objectiveDisplay },
    { name: 'Game board', rect: layout.gameBoard },
    { name: 'Booster bar', rect: layout.boosterBar },
  ];

  for (const { name, rect } of components) {
    if (!rectWithinScreen(rect, screenWidth, screenHeight)) {
      if (rect.x < 0) errors.push(`${name} extends past left edge (x=${rect.x.toFixed(1)})`);
      if (rect.y < 0) errors.push(`${name} extends past top edge (y=${rect.y.toFixed(1)})`);
      if (rect.x + rect.width > screenWidth) {
        errors.push(`${name} extends past right edge (x+w=${(rect.x + rect.width).toFixed(1)}, screen=${screenWidth})`);
      }
      if (rect.y + rect.height > screenHeight) {
        errors.push(`${name} extends past bottom edge (y+h=${(rect.y + rect.height).toFixed(1)}, screen=${screenHeight})`);
      }
    }
  }

  // Check minimum sizes
  if (layout.gameBoard.width < 200 || layout.gameBoard.height < 200) {
    errors.push(`Game board too small: ${layout.gameBoard.width}x${layout.gameBoard.height}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
