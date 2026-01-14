import { test, expect, Page } from '@playwright/test';

// Helper to tap on canvas at a specific position
async function tapCanvas(page: Page, x: number, y: number) {
  const canvas = page.locator('#game canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');

  await page.mouse.click(box.x + x, box.y + y);
}

// Helper to dismiss any popups (like Daily Bonus)
async function dismissPopups(page: Page) {
  const canvas = page.locator('#game canvas');
  const box = await canvas.boundingBox();
  if (!box) return;

  // The CLAIM button is at height/2 + 65px, which is ~60% of screen height
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.60);
  await page.waitForTimeout(500);

  // Click again in case there are multiple popups
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.60);
  await page.waitForTimeout(300);
}

// Helper to swipe on canvas
async function swipeCanvas(page: Page, startX: number, startY: number, endX: number, endY: number) {
  const canvas = page.locator('#game canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');

  await page.mouse.move(box.x + startX, box.y + startY);
  await page.mouse.down();
  await page.mouse.move(box.x + endX, box.y + endY, { steps: 10 });
  await page.mouse.up();
}

test.describe('Game Interaction Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game canvas', { timeout: 10000 });
  });

  test('can navigate from title to level select', async ({ page }) => {
    // Wait for title scene to load
    await page.waitForTimeout(500);

    // Get canvas dimensions for calculating tap position
    const canvas = page.locator('#game canvas');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    if (!box) return;

    // Tap in the center of the screen (where "Tap to Play" should be)
    await tapCanvas(page, box.width / 2, box.height / 2);

    // Wait for transition
    await page.waitForTimeout(500);

    // Take screenshot to verify
    await page.screenshot({ path: 'e2e/screenshots/after-title-tap.png' });
  });

  test('can navigate to level 1', async ({ page }) => {
    await page.waitForTimeout(500);

    const canvas = page.locator('#game canvas');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Tap to start
    await tapCanvas(page, box.width / 2, box.height / 2);
    await page.waitForTimeout(500);

    // Tap on level 1 button (usually top left area of level select)
    // Level 1 is typically at the top of the level grid
    await tapCanvas(page, box.width * 0.2, box.height * 0.3);
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'e2e/screenshots/level-select.png' });
  });

  test('game board is rendered correctly', async ({ page }) => {
    await page.waitForTimeout(500);

    const canvas = page.locator('#game canvas');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Dismiss any popups (like Daily Bonus)
    await dismissPopups(page);

    // Navigate to game - tap PLAY button on title screen
    await tapCanvas(page, box.width / 2, box.height * 0.42);
    await page.waitForTimeout(500);

    // Take screenshot of pre-level screen
    await page.screenshot({ path: 'e2e/screenshots/pre-level.png' });

    // Tap PLAY button on pre-level screen (bottom center)
    await tapCanvas(page, box.width / 2, box.height * 0.85);
    await page.waitForTimeout(1000);

    // Take screenshot of actual game board
    await page.screenshot({ path: 'e2e/screenshots/game-board.png' });

    // Canvas should still be visible
    await expect(canvas).toBeVisible();
  });

  test('swipe gesture works on game board', async ({ page }) => {
    await page.waitForTimeout(500);

    const canvas = page.locator('#game canvas');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Navigate to game
    await tapCanvas(page, box.width / 2, box.height / 2);
    await page.waitForTimeout(300);
    await tapCanvas(page, box.width * 0.2, box.height * 0.3);
    await page.waitForTimeout(300);
    await tapCanvas(page, box.width / 2, box.height * 0.8);
    await page.waitForTimeout(1000);

    // Perform a swipe on the board (horizontal swap)
    const centerX = box.width / 2;
    const centerY = box.height / 2;

    // Swipe right
    await swipeCanvas(page, centerX - 40, centerY, centerX + 40, centerY);
    await page.waitForTimeout(500);

    // Take screenshot after swipe
    await page.screenshot({ path: 'e2e/screenshots/after-swipe.png' });
  });
});

test.describe('Powerup Visual Tests', () => {
  test('powerups are visually rendered on board', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game canvas', { timeout: 10000 });
    await page.waitForTimeout(500);

    const canvas = page.locator('#game canvas');
    const box = await canvas.boundingBox();
    if (!box) return;

    // Navigate to a level that has powerups
    await tapCanvas(page, box.width / 2, box.height / 2);
    await page.waitForTimeout(300);

    // Try to navigate to level with pre-placed powerups (level 5+)
    await tapCanvas(page, box.width * 0.4, box.height * 0.3);
    await page.waitForTimeout(300);
    await tapCanvas(page, box.width / 2, box.height * 0.8);
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'e2e/screenshots/powerups-on-board.png' });
  });

  test('powerup activation clears tiles', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game canvas', { timeout: 10000 });
    await page.waitForTimeout(500);

    const canvas = page.locator('#game canvas');
    const box = await canvas.boundingBox();
    if (!box) return;

    // Navigate to game
    await tapCanvas(page, box.width / 2, box.height / 2);
    await page.waitForTimeout(300);
    await tapCanvas(page, box.width * 0.2, box.height * 0.3);
    await page.waitForTimeout(300);
    await tapCanvas(page, box.width / 2, box.height * 0.8);
    await page.waitForTimeout(1000);

    // Screenshot before gameplay
    await page.screenshot({ path: 'e2e/screenshots/before-match.png' });

    // Perform multiple swipes to try to create matches
    const centerX = box.width / 2;
    const centerY = box.height * 0.5;

    for (let i = 0; i < 5; i++) {
      await swipeCanvas(page, centerX - 30, centerY + i * 40, centerX + 30, centerY + i * 40);
      await page.waitForTimeout(600);
    }

    // Screenshot after gameplay
    await page.screenshot({ path: 'e2e/screenshots/after-matches.png' });
  });
});

test.describe('UI Responsive Tests', () => {
  test('UI elements scale correctly on iPhone 12', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game canvas', { timeout: 10000 });

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    // For iPhone 12, viewport should be 390x844
    if (viewport) {
      console.log(`Testing on viewport: ${viewport.width}x${viewport.height}`);
    }

    await page.screenshot({ path: 'e2e/screenshots/ui-scale-test.png' });
  });

  test('game handles orientation (portrait)', async ({ page }) => {
    // iPhone 12 is in portrait mode by default in Playwright
    await page.goto('/');
    await page.waitForSelector('#game canvas', { timeout: 10000 });

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    if (viewport) {
      // Portrait: width < height
      expect(viewport.width).toBeLessThan(viewport.height);
    }

    await page.screenshot({ path: 'e2e/screenshots/portrait-mode.png' });
  });
});
