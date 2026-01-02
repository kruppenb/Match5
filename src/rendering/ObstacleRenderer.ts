import Phaser from 'phaser';
import { CONFIG } from '../config';
import { Obstacle } from '../types';

/**
 * Handles rendering of obstacle sprites (grass, ice, chains, boxes, etc.)
 */
export class ObstacleRenderer {
  private scene: Phaser.Scene;
  private tileSize: number;

  constructor(scene: Phaser.Scene, tileSize: number) {
    this.scene = scene;
    this.tileSize = tileSize;
  }

  /**
   * Create a graphics object representing the obstacle
   */
  createObstacleGraphics(
    obstacle: Obstacle,
    pos: { x: number; y: number }
  ): { graphics: Phaser.GameObjects.Graphics; layerText?: Phaser.GameObjects.Text } {
    const graphics = this.scene.add.graphics();
    const size = this.tileSize - CONFIG.GRID.GAP;
    const halfSize = size / 2;
    let layerText: Phaser.GameObjects.Text | undefined;

    switch (obstacle.type) {
      case 'grass':
        this.drawGrass(graphics, pos, size, halfSize);
        break;

      case 'ice':
        this.drawIce(graphics, pos, size, halfSize, obstacle.layers === 2);
        break;

      case 'chain':
        this.drawChain(graphics, pos, halfSize);
        break;

      case 'box':
        layerText = this.drawBox(graphics, pos, size, halfSize, obstacle.layers);
        break;

      case 'stone':
        this.drawStone(graphics, pos, size, halfSize);
        break;

      case 'barrel':
        layerText = this.drawBarrel(graphics, pos, size, halfSize, obstacle.layers);
        break;

      case 'ice_bucket':
        this.drawIceBucket(graphics, pos, size, halfSize);
        break;
    }

    return { graphics, layerText };
  }

  private drawGrass(
    graphics: Phaser.GameObjects.Graphics,
    pos: { x: number; y: number },
    size: number,
    halfSize: number
  ): void {
    graphics.setDepth(0);
    graphics.fillStyle(CONFIG.UI.COLORS.GRASS, 1);
    graphics.fillRoundedRect(
      pos.x - halfSize + CONFIG.GRID.GAP / 2,
      pos.y - halfSize + CONFIG.GRID.GAP / 2,
      size - CONFIG.GRID.GAP,
      size - CONFIG.GRID.GAP,
      8
    );
    // Grass pattern lines
    graphics.lineStyle(2, CONFIG.UI.COLORS.GRASS_DARK, 0.6);
    for (let i = 0; i < 4; i++) {
      const offsetX = (i - 1.5) * 12;
      graphics.lineBetween(
        pos.x + offsetX,
        pos.y + halfSize * 0.4,
        pos.x + offsetX + 4,
        pos.y - halfSize * 0.3
      );
    }
  }

  private drawIce(
    graphics: Phaser.GameObjects.Graphics,
    pos: { x: number; y: number },
    size: number,
    halfSize: number,
    isDouble: boolean
  ): void {
    graphics.setDepth(1);

    // Main ice block
    graphics.fillStyle(isDouble ? 0x66ccee : 0x99ddff, 1);
    graphics.fillRoundedRect(
      pos.x - halfSize + CONFIG.GRID.GAP / 2,
      pos.y - halfSize + CONFIG.GRID.GAP / 2,
      size - CONFIG.GRID.GAP,
      size - CONFIG.GRID.GAP,
      8
    );

    // Highlight on top edge
    graphics.fillStyle(0xccf4ff, 0.8);
    graphics.fillRoundedRect(
      pos.x - halfSize + CONFIG.GRID.GAP / 2 + 4,
      pos.y - halfSize + CONFIG.GRID.GAP / 2 + 4,
      size - CONFIG.GRID.GAP - 8,
      (size - CONFIG.GRID.GAP) * 0.3,
      4
    );

    // Border
    graphics.lineStyle(2, isDouble ? 0x4499bb : 0x77bbdd, 1);
    graphics.strokeRoundedRect(
      pos.x - halfSize + CONFIG.GRID.GAP / 2,
      pos.y - halfSize + CONFIG.GRID.GAP / 2,
      size - CONFIG.GRID.GAP,
      size - CONFIG.GRID.GAP,
      8
    );

    // Ice crack pattern
    graphics.lineStyle(isDouble ? 2 : 1.5, 0xffffff, isDouble ? 0.6 : 0.4);
    graphics.lineBetween(
      pos.x - halfSize * 0.3, pos.y - halfSize * 0.1,
      pos.x + halfSize * 0.2, pos.y + halfSize * 0.4
    );
    graphics.lineBetween(
      pos.x - halfSize * 0.1, pos.y - halfSize * 0.3,
      pos.x + halfSize * 0.4, pos.y + halfSize * 0.1
    );
    if (isDouble) {
      graphics.lineBetween(
        pos.x - halfSize * 0.5, pos.y + halfSize * 0.2,
        pos.x + halfSize * 0.1, pos.y + halfSize * 0.5
      );
      graphics.lineBetween(
        pos.x + halfSize * 0.2, pos.y - halfSize * 0.4,
        pos.x + halfSize * 0.5, pos.y - halfSize * 0.1
      );
    }
  }

  private drawChain(
    graphics: Phaser.GameObjects.Graphics,
    pos: { x: number; y: number },
    halfSize: number
  ): void {
    graphics.setDepth(2);
    graphics.lineStyle(4, 0x888888, 1);
    const chainSize = halfSize * 0.85;
    // Horizontal chains
    graphics.strokeRect(pos.x - chainSize, pos.y - chainSize * 0.15, chainSize * 0.4, chainSize * 0.3);
    graphics.strokeRect(pos.x + chainSize * 0.6, pos.y - chainSize * 0.15, chainSize * 0.4, chainSize * 0.3);
    // Vertical chains
    graphics.strokeRect(pos.x - chainSize * 0.15, pos.y - chainSize, chainSize * 0.3, chainSize * 0.4);
    graphics.strokeRect(pos.x - chainSize * 0.15, pos.y + chainSize * 0.6, chainSize * 0.3, chainSize * 0.4);
    // Highlight
    graphics.lineStyle(2, 0xaaaaaa, 0.5);
    graphics.strokeCircle(pos.x, pos.y, halfSize * 0.6);
  }

  private drawBox(
    graphics: Phaser.GameObjects.Graphics,
    pos: { x: number; y: number },
    size: number,
    halfSize: number,
    layers: number
  ): Phaser.GameObjects.Text | undefined {
    graphics.setDepth(1);
    const boxColor = layers === 3 ? 0x8B4513 : layers === 2 ? 0xA0522D : 0xCD853F;
    graphics.fillStyle(boxColor, 1);
    graphics.fillRoundedRect(
      pos.x - halfSize + CONFIG.GRID.GAP / 2,
      pos.y - halfSize + CONFIG.GRID.GAP / 2,
      size - CONFIG.GRID.GAP,
      size - CONFIG.GRID.GAP,
      4
    );
    // Wood grain lines
    graphics.lineStyle(2, 0x654321, 0.5);
    graphics.lineBetween(pos.x - halfSize * 0.6, pos.y - halfSize * 0.3, pos.x + halfSize * 0.6, pos.y - halfSize * 0.3);
    graphics.lineBetween(pos.x - halfSize * 0.6, pos.y + halfSize * 0.3, pos.x + halfSize * 0.6, pos.y + halfSize * 0.3);

    // Layer indicator
    if (layers > 1) {
      graphics.fillStyle(0xffffff, 0.3);
      graphics.fillCircle(pos.x, pos.y, halfSize * 0.25);
      return this.scene.add.text(pos.x, pos.y, layers.toString(), {
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5).setDepth(2);
    }
    return undefined;
  }

  private drawStone(
    graphics: Phaser.GameObjects.Graphics,
    pos: { x: number; y: number },
    size: number,
    halfSize: number
  ): void {
    graphics.setDepth(1);
    graphics.fillStyle(0x666666, 1);
    graphics.fillRoundedRect(
      pos.x - halfSize + CONFIG.GRID.GAP / 2,
      pos.y - halfSize + CONFIG.GRID.GAP / 2,
      size - CONFIG.GRID.GAP,
      size - CONFIG.GRID.GAP,
      8
    );
    // Stone texture
    graphics.fillStyle(0x555555, 1);
    graphics.fillCircle(pos.x - halfSize * 0.3, pos.y - halfSize * 0.2, halfSize * 0.15);
    graphics.fillCircle(pos.x + halfSize * 0.2, pos.y + halfSize * 0.3, halfSize * 0.2);
    graphics.fillCircle(pos.x + halfSize * 0.3, pos.y - halfSize * 0.35, halfSize * 0.12);
    // Edge highlight
    graphics.lineStyle(2, 0x888888, 0.5);
    graphics.strokeRoundedRect(
      pos.x - halfSize + CONFIG.GRID.GAP / 2,
      pos.y - halfSize + CONFIG.GRID.GAP / 2,
      size - CONFIG.GRID.GAP,
      size - CONFIG.GRID.GAP,
      8
    );
  }

  private drawBarrel(
    graphics: Phaser.GameObjects.Graphics,
    pos: { x: number; y: number },
    size: number,
    halfSize: number,
    layers: number
  ): Phaser.GameObjects.Text | undefined {
    graphics.setDepth(1);
    const barrelColor = layers === 2 ? 0x8B0000 : 0xCC3300;
    graphics.fillStyle(barrelColor, 1);
    // Barrel body
    graphics.fillRoundedRect(
      pos.x - halfSize + CONFIG.GRID.GAP / 2,
      pos.y - halfSize + CONFIG.GRID.GAP / 2,
      size - CONFIG.GRID.GAP,
      size - CONFIG.GRID.GAP,
      6
    );
    // Metal bands
    graphics.lineStyle(3, 0x444444, 1);
    graphics.lineBetween(pos.x - halfSize * 0.7, pos.y - halfSize * 0.4, pos.x + halfSize * 0.7, pos.y - halfSize * 0.4);
    graphics.lineBetween(pos.x - halfSize * 0.7, pos.y + halfSize * 0.4, pos.x + halfSize * 0.7, pos.y + halfSize * 0.4);
    // TNT/Danger symbol
    graphics.fillStyle(0xffff00, 1);
    graphics.fillCircle(pos.x, pos.y, halfSize * 0.3);
    graphics.fillStyle(0x000000, 1);
    graphics.fillTriangle(
      pos.x, pos.y - halfSize * 0.2,
      pos.x - halfSize * 0.15, pos.y + halfSize * 0.15,
      pos.x + halfSize * 0.15, pos.y + halfSize * 0.15
    );

    // Layer indicator
    if (layers > 1) {
      return this.scene.add.text(pos.x + halfSize * 0.5, pos.y - halfSize * 0.5, layers.toString(), {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5).setDepth(2);
    }
    return undefined;
  }

  private drawIceBucket(
    graphics: Phaser.GameObjects.Graphics,
    pos: { x: number; y: number },
    size: number,
    halfSize: number
  ): void {
    graphics.setDepth(1);
    // Bucket body
    graphics.fillStyle(0x4a90d9, 1);
    graphics.fillRoundedRect(
      pos.x - halfSize + CONFIG.GRID.GAP / 2,
      pos.y - halfSize + CONFIG.GRID.GAP / 2,
      size - CONFIG.GRID.GAP,
      size - CONFIG.GRID.GAP,
      6
    );
    // Handle
    graphics.lineStyle(3, 0x888888, 1);
    graphics.beginPath();
    graphics.arc(pos.x, pos.y - halfSize * 0.3, halfSize * 0.4, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360));
    graphics.strokePath();
    // Ice cubes inside
    graphics.fillStyle(0x88ddff, 0.8);
    graphics.fillRect(pos.x - halfSize * 0.4, pos.y - halfSize * 0.1, halfSize * 0.35, halfSize * 0.35);
    graphics.fillRect(pos.x + halfSize * 0.05, pos.y - halfSize * 0.2, halfSize * 0.35, halfSize * 0.35);
    graphics.fillRect(pos.x - halfSize * 0.2, pos.y + halfSize * 0.2, halfSize * 0.35, halfSize * 0.35);
    // Frost sparkles
    graphics.fillStyle(0xffffff, 0.9);
    graphics.fillCircle(pos.x - halfSize * 0.25, pos.y - halfSize * 0.05, 3);
    graphics.fillCircle(pos.x + halfSize * 0.2, pos.y + halfSize * 0.1, 2);
  }
}
