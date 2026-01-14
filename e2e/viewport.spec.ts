import { test, expect } from '@playwright/test';

test.describe('Mobile Viewport Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the game to initialize
    await page.waitForSelector('#game canvas', { timeout: 10000 });
  });

  test('canvas fills viewport on iPhone 12 (390x844)', async ({ page }) => {
    // iPhone 12 viewport: 390 x 844 CSS pixels
    const viewport = page.viewportSize();
    console.log(`Viewport: ${viewport?.width}x${viewport?.height}`);

    // Get the canvas element
    const canvas = page.locator('#game canvas');
    await expect(canvas).toBeVisible();

    // Get canvas dimensions
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();

    if (canvasBox && viewport) {
      // Canvas should fill most of the viewport (accounting for safe areas)
      expect(canvasBox.width).toBeGreaterThanOrEqual(viewport.width * 0.95);
      expect(canvasBox.height).toBeGreaterThanOrEqual(viewport.height * 0.95);

      // Canvas should not exceed viewport
      expect(canvasBox.width).toBeLessThanOrEqual(viewport.width);
      expect(canvasBox.height).toBeLessThanOrEqual(viewport.height);
    }
  });

  test('game container uses full available space', async ({ page }) => {
    const gameContainer = page.locator('#game');
    await expect(gameContainer).toBeVisible();

    const containerBox = await gameContainer.boundingBox();
    const viewport = page.viewportSize();

    expect(containerBox).not.toBeNull();
    expect(viewport).not.toBeNull();

    if (containerBox && viewport) {
      // Container should fill viewport (minus safe areas)
      expect(containerBox.width).toBeGreaterThanOrEqual(viewport.width * 0.9);
      expect(containerBox.height).toBeGreaterThanOrEqual(viewport.height * 0.9);
    }
  });

  test('no horizontal scrolling on mobile', async ({ page }) => {
    // Check that the page doesn't have horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('no vertical scrolling on mobile', async ({ page }) => {
    // Check that the page doesn't have vertical overflow
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const clientHeight = await page.evaluate(() => document.documentElement.clientHeight);

    expect(scrollHeight).toBeLessThanOrEqual(clientHeight);
  });

  test('viewport meta tag is correctly set', async ({ page }) => {
    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');

    expect(viewportMeta).toContain('width=device-width');
    expect(viewportMeta).toContain('initial-scale=1.0');
    expect(viewportMeta).toContain('maximum-scale=1.0');
    expect(viewportMeta).toContain('user-scalable=no');
    expect(viewportMeta).toContain('viewport-fit=cover');
  });

  test('PWA meta tags are present', async ({ page }) => {
    // Check apple-mobile-web-app-capable
    const webAppCapable = await page.locator('meta[name="apple-mobile-web-app-capable"]').getAttribute('content');
    expect(webAppCapable).toBe('yes');

    // Check apple-mobile-web-app-status-bar-style
    const statusBarStyle = await page.locator('meta[name="apple-mobile-web-app-status-bar-style"]').getAttribute('content');
    expect(statusBarStyle).toBe('black-translucent');
  });

  test('canvas is interactive (accepts touch)', async ({ page }) => {
    const canvas = page.locator('#game canvas');

    // Tap on the canvas
    await canvas.tap();

    // Canvas should still be visible after tap
    await expect(canvas).toBeVisible();
  });

  test('game loads to title scene', async ({ page }) => {
    // Wait for the canvas to be interactive
    await page.waitForTimeout(500);

    // Take a screenshot for visual verification
    await page.screenshot({ path: 'e2e/screenshots/title-scene.png' });

    const canvas = page.locator('#game canvas');
    await expect(canvas).toBeVisible();
  });
});

test.describe('Responsive Layout Tests', () => {
  test('title screen elements are visible on iPhone 12', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game canvas', { timeout: 10000 });

    // Wait for initial load
    await page.waitForTimeout(1000);

    const canvas = page.locator('#game canvas');
    const canvasBox = await canvas.boundingBox();

    expect(canvasBox).not.toBeNull();
    expect(canvasBox!.width).toBeGreaterThan(0);
    expect(canvasBox!.height).toBeGreaterThan(0);
  });

  test('screen dimensions are correctly reported', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game canvas', { timeout: 10000 });

    const viewport = page.viewportSize();
    const dimensions = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    }));

    console.log('Viewport:', viewport);
    console.log('Window dimensions:', dimensions);

    // innerWidth/innerHeight should match viewport
    if (viewport) {
      expect(dimensions.innerWidth).toBe(viewport.width);
      expect(dimensions.innerHeight).toBe(viewport.height);
    }
  });
});
