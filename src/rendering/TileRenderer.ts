/**
 * TileRenderer - Handles all tile shape drawing logic
 * Extracted from GameScene to reduce file size and improve maintainability
 */

export class TileRenderer {
  /**
   * Draw a tile shape based on its type
   */
  static drawTileShape(graphics: Phaser.GameObjects.Graphics, type: string, color: number, halfSize: number): void {
    graphics.fillStyle(color, 1);
    graphics.lineStyle(3, 0xffffff, 0.5);

    switch (type) {
      case 'red': // Gem/Ruby
        TileRenderer.drawGem(graphics, color, halfSize);
        break;
      case 'blue': // Water droplet
        TileRenderer.drawDroplet(graphics, color, halfSize);
        break;
      case 'green': // Leaf
        TileRenderer.drawLeaf(graphics, color, halfSize);
        break;
      case 'yellow': // Star
        TileRenderer.drawStar(graphics, halfSize, 5);
        break;
      case 'purple': // Amethyst Crystal
        TileRenderer.drawAmethyst(graphics, color, halfSize);
        break;
      case 'orange': // Sun
        TileRenderer.drawSun(graphics, color, halfSize);
        break;
      default:
        // Circle fallback
        graphics.fillCircle(0, 0, halfSize * 0.8);
        graphics.strokeCircle(0, 0, halfSize * 0.8);
    }
  }

  /**
   * Draw a powerup shape based on its type
   */
  static drawPowerupShape(graphics: Phaser.GameObjects.Graphics, powerupType: string, color: number, halfSize: number): void {
    switch (powerupType) {
      case 'rocket_h': // Horizontal rocket
        TileRenderer.drawRocket(graphics, color, halfSize, 'horizontal');
        break;
      case 'rocket_v': // Vertical rocket
        TileRenderer.drawRocket(graphics, color, halfSize, 'vertical');
        break;
      case 'bomb': // Bomb
        TileRenderer.drawBomb(graphics, color, halfSize);
        break;
      case 'color_bomb': // Rainbow orb
        TileRenderer.drawColorBomb(graphics, halfSize);
        break;
      case 'propeller': // Paper airplane
        TileRenderer.drawPropeller(graphics, color, halfSize);
        break;
      default:
        graphics.fillStyle(color, 1);
        graphics.fillCircle(0, 0, halfSize * 0.8);
    }
  }

  static drawGem(graphics: Phaser.GameObjects.Graphics, color: number, halfSize: number): void {
    const s = halfSize * 0.85;

    // Main gem body - hexagonal cut
    graphics.beginPath();
    graphics.moveTo(0, -s);           // Top point
    graphics.lineTo(s * 0.7, -s * 0.4);  // Top right
    graphics.lineTo(s * 0.7, s * 0.4);   // Bottom right
    graphics.lineTo(0, s);               // Bottom point
    graphics.lineTo(-s * 0.7, s * 0.4);  // Bottom left
    graphics.lineTo(-s * 0.7, -s * 0.4); // Top left
    graphics.closePath();
    graphics.fillPath();

    // Inner facets - lighter shade
    graphics.fillStyle(TileRenderer.lightenColor(color, 0.3), 1);
    graphics.beginPath();
    graphics.moveTo(0, -s);
    graphics.lineTo(s * 0.3, 0);
    graphics.lineTo(0, s * 0.3);
    graphics.lineTo(-s * 0.3, 0);
    graphics.closePath();
    graphics.fillPath();

    // Highlight
    graphics.fillStyle(0xffffff, 0.4);
    graphics.fillCircle(-s * 0.25, -s * 0.35, s * 0.15);

    // Outline
    graphics.lineStyle(2, 0xffffff, 0.6);
    graphics.beginPath();
    graphics.moveTo(0, -s);
    graphics.lineTo(s * 0.7, -s * 0.4);
    graphics.lineTo(s * 0.7, s * 0.4);
    graphics.lineTo(0, s);
    graphics.lineTo(-s * 0.7, s * 0.4);
    graphics.lineTo(-s * 0.7, -s * 0.4);
    graphics.closePath();
    graphics.strokePath();
  }

  static drawDroplet(graphics: Phaser.GameObjects.Graphics, color: number, halfSize: number): void {
    const s = halfSize * 0.85;

    // Teardrop shape
    graphics.fillStyle(color, 1);
    graphics.beginPath();
    graphics.moveTo(0, -s);  // Top point
    // Right curve
    graphics.lineTo(s * 0.6, s * 0.1);
    graphics.arc(0, s * 0.1, s * 0.6, 0, Math.PI, false);
    graphics.closePath();
    graphics.fillPath();

    // Inner highlight - wave pattern
    graphics.fillStyle(TileRenderer.lightenColor(color, 0.25), 1);
    graphics.beginPath();
    graphics.arc(0, s * 0.25, s * 0.35, Math.PI * 0.2, Math.PI * 0.8, false);
    graphics.lineTo(-s * 0.15, s * 0.1);
    graphics.lineTo(s * 0.15, s * 0.1);
    graphics.closePath();
    graphics.fillPath();

    // Shine
    graphics.fillStyle(0xffffff, 0.5);
    graphics.fillCircle(-s * 0.15, -s * 0.3, s * 0.12);
    graphics.fillCircle(-s * 0.25, -s * 0.1, s * 0.08);

    // Outline
    graphics.lineStyle(2, 0xffffff, 0.5);
    graphics.beginPath();
    graphics.moveTo(0, -s);
    graphics.lineTo(s * 0.6, s * 0.1);
    graphics.arc(0, s * 0.1, s * 0.6, 0, Math.PI, false);
    graphics.closePath();
    graphics.strokePath();
  }

  static drawLeaf(graphics: Phaser.GameObjects.Graphics, color: number, halfSize: number): void {
    const s = halfSize * 0.85;

    // Leaf body - using arcs and lines to approximate curves
    graphics.fillStyle(color, 1);
    graphics.beginPath();
    graphics.moveTo(0, -s);  // Tip
    // Right side - approximate curve with lines
    graphics.lineTo(s * 0.3, -s * 0.6);
    graphics.lineTo(s * 0.5, -s * 0.2);
    graphics.lineTo(s * 0.5, s * 0.3);
    graphics.lineTo(s * 0.3, s * 0.6);
    // Bottom to stem
    graphics.lineTo(0, s);
    // Left side (mirror)
    graphics.lineTo(-s * 0.3, s * 0.6);
    graphics.lineTo(-s * 0.5, s * 0.3);
    graphics.lineTo(-s * 0.5, -s * 0.2);
    graphics.lineTo(-s * 0.3, -s * 0.6);
    graphics.closePath();
    graphics.fillPath();

    // Center vein
    graphics.lineStyle(3, TileRenderer.darkenColor(color, 0.2), 1);
    graphics.lineBetween(0, -s * 0.7, 0, s * 0.7);

    // Side veins
    graphics.lineStyle(2, TileRenderer.darkenColor(color, 0.15), 1);
    graphics.lineBetween(0, -s * 0.3, s * 0.35, 0);
    graphics.lineBetween(0, -s * 0.3, -s * 0.35, 0);
    graphics.lineBetween(0, s * 0.1, s * 0.3, s * 0.4);
    graphics.lineBetween(0, s * 0.1, -s * 0.3, s * 0.4);

    // Highlight
    graphics.fillStyle(0xffffff, 0.25);
    graphics.beginPath();
    graphics.moveTo(-s * 0.15, -s * 0.6);
    graphics.lineTo(-s * 0.3, -s * 0.2);
    graphics.lineTo(-s * 0.2, s * 0.2);
    graphics.lineTo(-s * 0.05, s * 0.1);
    graphics.lineTo(-s * 0.05, -s * 0.5);
    graphics.closePath();
    graphics.fillPath();
  }

  static drawAmethyst(graphics: Phaser.GameObjects.Graphics, color: number, halfSize: number): void {
    const s = halfSize * 0.85;

    // Back crystals (darker, behind)
    graphics.fillStyle(TileRenderer.darkenColor(color, 0.3), 1);
    // Left back crystal
    graphics.beginPath();
    graphics.moveTo(-s * 0.6, s * 0.7);
    graphics.lineTo(-s * 0.45, -s * 0.4);
    graphics.lineTo(-s * 0.3, s * 0.7);
    graphics.closePath();
    graphics.fillPath();
    // Right back crystal
    graphics.beginPath();
    graphics.moveTo(s * 0.6, s * 0.7);
    graphics.lineTo(s * 0.5, -s * 0.2);
    graphics.lineTo(s * 0.35, s * 0.7);
    graphics.closePath();
    graphics.fillPath();

    // Main center crystal (tallest)
    graphics.fillStyle(color, 1);
    graphics.beginPath();
    graphics.moveTo(0, -s * 0.95);  // Top point
    graphics.lineTo(s * 0.25, -s * 0.3);  // Right upper facet
    graphics.lineTo(s * 0.2, s * 0.7);   // Right bottom
    graphics.lineTo(-s * 0.2, s * 0.7);  // Left bottom
    graphics.lineTo(-s * 0.25, -s * 0.3); // Left upper facet
    graphics.closePath();
    graphics.fillPath();

    // Center crystal highlight facet
    graphics.fillStyle(TileRenderer.lightenColor(color, 0.25), 1);
    graphics.beginPath();
    graphics.moveTo(0, -s * 0.95);
    graphics.lineTo(s * 0.12, -s * 0.2);
    graphics.lineTo(s * 0.08, s * 0.5);
    graphics.lineTo(-s * 0.08, s * 0.5);
    graphics.lineTo(-s * 0.12, -s * 0.2);
    graphics.closePath();
    graphics.fillPath();

    // Left front crystal
    graphics.fillStyle(TileRenderer.darkenColor(color, 0.1), 1);
    graphics.beginPath();
    graphics.moveTo(-s * 0.35, s * 0.7);
    graphics.lineTo(-s * 0.5, -s * 0.5);
    graphics.lineTo(-s * 0.25, -s * 0.1);
    graphics.lineTo(-s * 0.15, s * 0.7);
    graphics.closePath();
    graphics.fillPath();

    // Right front crystal
    graphics.fillStyle(TileRenderer.darkenColor(color, 0.15), 1);
    graphics.beginPath();
    graphics.moveTo(s * 0.4, s * 0.7);
    graphics.lineTo(s * 0.45, -s * 0.35);
    graphics.lineTo(s * 0.25, 0);
    graphics.lineTo(s * 0.2, s * 0.7);
    graphics.closePath();
    graphics.fillPath();

    // Sparkle highlights
    graphics.fillStyle(0xffffff, 0.7);
    graphics.fillCircle(-s * 0.08, -s * 0.6, s * 0.08);
    graphics.fillStyle(0xffffff, 0.5);
    graphics.fillCircle(s * 0.35, -s * 0.15, s * 0.05);
    graphics.fillCircle(-s * 0.4, -s * 0.3, s * 0.04);

    // Base/rock
    graphics.fillStyle(0x4a4a5a, 1);
    graphics.fillRect(-s * 0.65, s * 0.6, s * 1.3, s * 0.25);
    graphics.fillStyle(0x3a3a4a, 1);
    graphics.fillRect(-s * 0.55, s * 0.7, s * 1.1, s * 0.15);
  }

  static drawMiniStar(graphics: Phaser.GameObjects.Graphics, x: number, y: number, size: number): void {
    const points = 4;
    const outerRadius = size;
    const innerRadius = size * 0.4;

    graphics.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      if (i === 0) {
        graphics.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
      } else {
        graphics.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
      }
    }
    graphics.closePath();
    graphics.fillPath();
  }

  static drawSun(graphics: Phaser.GameObjects.Graphics, color: number, halfSize: number): void {
    const s = halfSize * 0.85;
    const rays = 8;

    // Outer rays
    graphics.fillStyle(color, 1);
    for (let i = 0; i < rays; i++) {
      const angle = (i * 2 * Math.PI) / rays;
      const nextAngle = ((i + 0.5) * 2 * Math.PI) / rays;

      graphics.beginPath();
      graphics.moveTo(0, 0);
      graphics.lineTo(Math.cos(angle) * s, Math.sin(angle) * s);
      graphics.lineTo(Math.cos(nextAngle) * s * 0.5, Math.sin(nextAngle) * s * 0.5);
      graphics.closePath();
      graphics.fillPath();
    }

    // Center circle
    graphics.fillCircle(0, 0, s * 0.5);

    // Inner glow
    graphics.fillStyle(TileRenderer.lightenColor(color, 0.3), 1);
    graphics.fillCircle(0, 0, s * 0.35);

    // Highlight
    graphics.fillStyle(0xffffff, 0.4);
    graphics.fillCircle(-s * 0.12, -s * 0.12, s * 0.15);

    // Face details (optional cute face)
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillCircle(-s * 0.12, -s * 0.05, s * 0.06);
    graphics.fillCircle(s * 0.12, -s * 0.05, s * 0.06);
    // Smile
    graphics.lineStyle(2, 0x000000, 0.3);
    graphics.beginPath();
    graphics.arc(0, s * 0.08, s * 0.12, 0.2, Math.PI - 0.2, false);
    graphics.strokePath();
  }

  static drawStar(graphics: Phaser.GameObjects.Graphics, halfSize: number, points: number): void {
    const outerRadius = halfSize * 0.9;
    const innerRadius = halfSize * 0.4;
    const starPoints: { x: number; y: number }[] = [];

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      starPoints.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }

    graphics.beginPath();
    graphics.moveTo(starPoints[0].x, starPoints[0].y);
    for (let i = 1; i < starPoints.length; i++) {
      graphics.lineTo(starPoints[i].x, starPoints[i].y);
    }
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
  }

  // Color utility functions
  static lightenColor(color: number, amount: number): number {
    const r = Math.min(255, ((color >> 16) & 0xff) + 255 * amount);
    const g = Math.min(255, ((color >> 8) & 0xff) + 255 * amount);
    const b = Math.min(255, (color & 0xff) + 255 * amount);
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }

  static darkenColor(color: number, amount: number): number {
    const r = Math.max(0, ((color >> 16) & 0xff) * (1 - amount));
    const g = Math.max(0, ((color >> 8) & 0xff) * (1 - amount));
    const b = Math.max(0, (color & 0xff) * (1 - amount));
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }

  static drawRocket(graphics: Phaser.GameObjects.Graphics, color: number, halfSize: number, direction: 'horizontal' | 'vertical'): void {
    const s = halfSize * 0.75;

    if (direction === 'horizontal') {
      // Rocket body (horizontal)
      graphics.fillStyle(color, 1);
      graphics.beginPath();
      graphics.moveTo(s * 0.9, 0);  // Nose
      graphics.lineTo(s * 0.3, -s * 0.35);  // Top of body
      graphics.lineTo(-s * 0.6, -s * 0.35);  // Back top
      graphics.lineTo(-s * 0.6, s * 0.35);   // Back bottom
      graphics.lineTo(s * 0.3, s * 0.35);   // Bottom of body
      graphics.closePath();
      graphics.fillPath();

      // Nose cone highlight
      graphics.fillStyle(TileRenderer.lightenColor(color, 0.3), 1);
      graphics.beginPath();
      graphics.moveTo(s * 0.9, 0);
      graphics.lineTo(s * 0.5, -s * 0.2);
      graphics.lineTo(s * 0.5, s * 0.2);
      graphics.closePath();
      graphics.fillPath();

      // Fins
      graphics.fillStyle(TileRenderer.darkenColor(color, 0.2), 1);
      // Top fin
      graphics.fillTriangle(-s * 0.6, -s * 0.35, -s * 0.9, -s * 0.7, -s * 0.3, -s * 0.35);
      // Bottom fin
      graphics.fillTriangle(-s * 0.6, s * 0.35, -s * 0.9, s * 0.7, -s * 0.3, s * 0.35);

      // Exhaust flames
      graphics.fillStyle(0xff6600, 1);
      graphics.fillTriangle(-s * 0.6, -s * 0.2, -s, 0, -s * 0.6, s * 0.2);
      graphics.fillStyle(0xffff00, 1);
      graphics.fillTriangle(-s * 0.6, -s * 0.12, -s * 0.85, 0, -s * 0.6, s * 0.12);

      // Window
      graphics.fillStyle(0x88ddff, 1);
      graphics.fillCircle(s * 0.15, 0, s * 0.15);
      graphics.fillStyle(0xffffff, 0.5);
      graphics.fillCircle(s * 0.12, -s * 0.05, s * 0.06);

      // Outline
      graphics.lineStyle(2, 0xffffff, 0.7);
      graphics.strokeCircle(s * 0.15, 0, s * 0.15);

    } else {
      // Rocket body (vertical)
      graphics.fillStyle(color, 1);
      graphics.beginPath();
      graphics.moveTo(0, -s * 0.9);  // Nose
      graphics.lineTo(s * 0.35, -s * 0.3);  // Right of body
      graphics.lineTo(s * 0.35, s * 0.6);   // Right back
      graphics.lineTo(-s * 0.35, s * 0.6);  // Left back
      graphics.lineTo(-s * 0.35, -s * 0.3); // Left of body
      graphics.closePath();
      graphics.fillPath();

      // Nose cone highlight
      graphics.fillStyle(TileRenderer.lightenColor(color, 0.3), 1);
      graphics.beginPath();
      graphics.moveTo(0, -s * 0.9);
      graphics.lineTo(s * 0.2, -s * 0.5);
      graphics.lineTo(-s * 0.2, -s * 0.5);
      graphics.closePath();
      graphics.fillPath();

      // Fins
      graphics.fillStyle(TileRenderer.darkenColor(color, 0.2), 1);
      // Left fin
      graphics.fillTriangle(-s * 0.35, s * 0.6, -s * 0.7, s * 0.9, -s * 0.35, s * 0.3);
      // Right fin
      graphics.fillTriangle(s * 0.35, s * 0.6, s * 0.7, s * 0.9, s * 0.35, s * 0.3);

      // Exhaust flames
      graphics.fillStyle(0xff6600, 1);
      graphics.fillTriangle(-s * 0.2, s * 0.6, 0, s, s * 0.2, s * 0.6);
      graphics.fillStyle(0xffff00, 1);
      graphics.fillTriangle(-s * 0.12, s * 0.6, 0, s * 0.85, s * 0.12, s * 0.6);

      // Window
      graphics.fillStyle(0x88ddff, 1);
      graphics.fillCircle(0, -s * 0.15, s * 0.15);
      graphics.fillStyle(0xffffff, 0.5);
      graphics.fillCircle(-s * 0.05, -s * 0.18, s * 0.06);

      // Outline
      graphics.lineStyle(2, 0xffffff, 0.7);
      graphics.strokeCircle(0, -s * 0.15, s * 0.15);
    }
  }

  static drawBomb(graphics: Phaser.GameObjects.Graphics, color: number, halfSize: number): void {
    const s = halfSize * 0.7;

    // Main bomb body (slightly oval)
    graphics.fillStyle(0x333344, 1);
    graphics.fillCircle(0, s * 0.1, s);

    // Metallic bands
    graphics.fillStyle(0x555566, 1);
    graphics.fillRect(-s * 0.85, -s * 0.1, s * 1.7, s * 0.15);
    graphics.fillRect(-s * 0.85, s * 0.25, s * 1.7, s * 0.15);

    // Highlight
    graphics.fillStyle(0x666688, 0.6);
    graphics.beginPath();
    graphics.arc(-s * 0.3, -s * 0.2, s * 0.5, Math.PI, Math.PI * 1.7, false);
    graphics.lineTo(-s * 0.3, s * 0.1);
    graphics.closePath();
    graphics.fillPath();

    // Top cap
    graphics.fillStyle(0x444455, 1);
    graphics.fillCircle(0, -s * 0.75, s * 0.3);

    // Fuse hole
    graphics.fillStyle(0x222233, 1);
    graphics.fillCircle(0, -s * 0.75, s * 0.15);

    // Fuse
    graphics.lineStyle(4, 0x8B4513, 1);
    graphics.beginPath();
    graphics.moveTo(0, -s * 0.85);
    graphics.lineTo(s * 0.15, -s * 1.05);
    graphics.lineTo(s * 0.2, -s * 1.3);
    graphics.strokePath();

    // Spark/flame at end of fuse
    graphics.fillStyle(0xff4400, 1);
    graphics.fillCircle(s * 0.2, -s * 1.35, s * 0.18);
    graphics.fillStyle(0xffaa00, 1);
    graphics.fillCircle(s * 0.2, -s * 1.35, s * 0.12);
    graphics.fillStyle(0xffff00, 1);
    graphics.fillCircle(s * 0.2, -s * 1.35, s * 0.06);

    // Sparkles
    graphics.fillStyle(0xffff88, 1);
    TileRenderer.drawMiniStar(graphics, s * 0.35, -s * 1.45, s * 0.08);
    TileRenderer.drawMiniStar(graphics, s * 0.05, -s * 1.5, s * 0.06);
    TileRenderer.drawMiniStar(graphics, s * 0.3, -s * 1.2, s * 0.05);

    // Skull or warning symbol (optional - makes it look dangerous)
    graphics.fillStyle(color, 0.8);
    // Simple X
    graphics.lineStyle(3, color, 0.8);
    graphics.lineBetween(-s * 0.2, -s * 0.05, s * 0.2, s * 0.35);
    graphics.lineBetween(s * 0.2, -s * 0.05, -s * 0.2, s * 0.35);
  }

  static drawColorBomb(graphics: Phaser.GameObjects.Graphics, halfSize: number): void {
    const s = halfSize * 0.85;
    const colors = [0xff0000, 0xff7700, 0xffff00, 0x00ff00, 0x0088ff, 0x8800ff];

    // Outer glow rings
    for (let i = 0; i < 3; i++) {
      const ringRadius = s * (1 - i * 0.15);
      graphics.lineStyle(3, colors[i % colors.length], 0.3 + i * 0.1);
      graphics.strokeCircle(0, 0, ringRadius);
    }

    // Rainbow swirl segments
    const segments = 12;
    for (let i = 0; i < segments; i++) {
      const color = colors[i % colors.length];
      const angle1 = (i * 2 * Math.PI) / segments - Math.PI / 2;
      const angle2 = ((i + 1) * 2 * Math.PI) / segments - Math.PI / 2;

      graphics.fillStyle(color, 1);
      graphics.beginPath();
      graphics.moveTo(0, 0);
      graphics.arc(0, 0, s * 0.75, angle1, angle2, false);
      graphics.closePath();
      graphics.fillPath();
    }

    // Inner orb with gradient effect
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(0, 0, s * 0.4);

    // Rainbow inner ring
    for (let i = 0; i < 6; i++) {
      graphics.fillStyle(colors[i], 1);
      const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
      graphics.fillCircle(
        Math.cos(angle) * s * 0.25,
        Math.sin(angle) * s * 0.25,
        s * 0.1
      );
    }

    // Center sparkle
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(0, 0, s * 0.15);
    TileRenderer.drawMiniStar(graphics, 0, 0, s * 0.2);

    // Outer sparkles
    graphics.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 6; i++) {
      const angle = (i * 2 * Math.PI) / 6;
      TileRenderer.drawMiniStar(graphics, Math.cos(angle) * s * 0.85, Math.sin(angle) * s * 0.85, s * 0.1);
    }
  }

  static drawPropeller(graphics: Phaser.GameObjects.Graphics, color: number, halfSize: number): void {
    const s = halfSize * 0.85;

    // Paper airplane design
    // Main body
    graphics.fillStyle(color, 1);
    graphics.beginPath();
    graphics.moveTo(0, -s * 0.9);  // Nose
    graphics.lineTo(s * 0.7, s * 0.6);  // Right wing tip
    graphics.lineTo(s * 0.15, s * 0.3);  // Right wing fold
    graphics.lineTo(s * 0.15, s * 0.8);  // Right tail
    graphics.lineTo(0, s * 0.5);  // Tail center
    graphics.lineTo(-s * 0.15, s * 0.8);  // Left tail
    graphics.lineTo(-s * 0.15, s * 0.3);  // Left wing fold
    graphics.lineTo(-s * 0.7, s * 0.6);  // Left wing tip
    graphics.closePath();
    graphics.fillPath();

    // Wing fold line (darker)
    graphics.fillStyle(TileRenderer.darkenColor(color, 0.15), 1);
    graphics.beginPath();
    graphics.moveTo(0, -s * 0.9);
    graphics.lineTo(s * 0.15, s * 0.3);
    graphics.lineTo(s * 0.15, s * 0.8);
    graphics.lineTo(0, s * 0.5);
    graphics.lineTo(-s * 0.15, s * 0.8);
    graphics.lineTo(-s * 0.15, s * 0.3);
    graphics.closePath();
    graphics.fillPath();

    // Center fold highlight
    graphics.fillStyle(TileRenderer.lightenColor(color, 0.2), 1);
    graphics.beginPath();
    graphics.moveTo(0, -s * 0.9);
    graphics.lineTo(s * 0.08, s * 0.3);
    graphics.lineTo(0, s * 0.5);
    graphics.lineTo(-s * 0.08, s * 0.3);
    graphics.closePath();
    graphics.fillPath();

    // Motion lines
    graphics.lineStyle(2, 0xffffff, 0.4);
    graphics.lineBetween(-s * 0.4, s * 0.85, -s * 0.6, s);
    graphics.lineBetween(-s * 0.2, s * 0.9, -s * 0.35, s * 1.05);
    graphics.lineBetween(s * 0.4, s * 0.85, s * 0.6, s);
    graphics.lineBetween(s * 0.2, s * 0.9, s * 0.35, s * 1.05);
  }
}
