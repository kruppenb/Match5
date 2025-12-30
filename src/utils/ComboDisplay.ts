import Phaser from 'phaser';
import { CONFIG } from '../config';

interface ComboText {
  text: Phaser.GameObjects.Text;
  life: number;
  startY: number;
}

/**
 * Combo messages for different cascade levels
 */
const COMBO_MESSAGES = [
  '', // Level 1 - no message (single match)
  'Nice!',
  'Great!',
  'Awesome!',
  'Amazing!',
  'Incredible!',
  'SPECTACULAR!',
  'LEGENDARY!',
];

/**
 * Combo colors (escalating intensity)
 */
const COMBO_COLORS = [
  '#ffffff', // Level 1
  '#ffd700', // Level 2 - Gold
  '#ff8c00', // Level 3 - Dark Orange
  '#ff4500', // Level 4 - Orange Red
  '#ff1493', // Level 5 - Deep Pink
  '#9400d3', // Level 6 - Dark Violet
  '#ff0000', // Level 7 - Red
  '#ff00ff', // Level 8 - Magenta
];

/**
 * ComboDisplay shows escalating feedback text for chain reactions.
 * Each cascade level shows a more impressive message with bigger text.
 */
export class ComboDisplay {
  private scene: Phaser.Scene;
  private activeTexts: ComboText[] = [];
  private comboCount = 0;
  private centerX: number;
  private centerY: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.centerX = CONFIG.SCREEN.WIDTH / 2;
    this.centerY = CONFIG.SCREEN.HEIGHT / 2;
  }

  /**
   * Called when a cascade occurs
   */
  onCascade(): void {
    this.comboCount++;

    // Only show message for cascade level 2+
    if (this.comboCount < 2) return;

    const message = COMBO_MESSAGES[Math.min(this.comboCount, COMBO_MESSAGES.length - 1)];
    const color = COMBO_COLORS[Math.min(this.comboCount, COMBO_COLORS.length - 1)];

    if (!message) return;

    this.showComboText(message, color, this.comboCount);
  }

  /**
   * Show combo text with animation
   */
  private showComboText(message: string, color: string, level: number): void {
    const baseSize = 32;
    const scaleFactor = 1 + (level - 2) * 0.15;
    const fontSize = Math.min(baseSize * scaleFactor, 64);

    // Create text slightly above center
    const startY = this.centerY - 50;
    const text = this.scene.add.text(this.centerX, startY, message, {
      fontSize: `${fontSize}px`,
      fontStyle: 'bold',
      color,
      stroke: '#000000',
      strokeThickness: 4,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 4,
        fill: true,
      },
    });
    text.setOrigin(0.5, 0.5);
    text.setDepth(200);
    text.setScale(0);
    text.setAlpha(1);

    // Store for tracking
    const comboText: ComboText = {
      text,
      life: 90, // Frames
      startY,
    };
    this.activeTexts.push(comboText);

    // Pop-in animation
    this.scene.tweens.add({
      targets: text,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 150,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Settle to normal size
        this.scene.tweens.add({
          targets: text,
          scaleX: 1,
          scaleY: 1,
          duration: 100,
          ease: 'Quad.easeOut',
        });
      },
    });

    // Rise and fade animation
    this.scene.tweens.add({
      targets: text,
      y: startY - 80,
      alpha: 0,
      duration: 800,
      delay: 200,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.removeText(comboText);
      },
    });
  }

  /**
   * Show custom combo multiplier text
   */
  showMultiplier(multiplier: number, x: number, y: number): void {
    if (multiplier <= 1) return;

    const text = this.scene.add.text(x, y, `x${multiplier.toFixed(1)}`, {
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 3,
    });
    text.setOrigin(0.5, 0.5);
    text.setDepth(200);

    // Animate
    this.scene.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => {
        text.destroy();
      },
    });
  }

  /**
   * Remove a combo text from tracking
   */
  private removeText(comboText: ComboText): void {
    const index = this.activeTexts.indexOf(comboText);
    if (index > -1) {
      this.activeTexts.splice(index, 1);
    }
    comboText.text.destroy();
  }

  /**
   * Reset combo counter (call at start of each player move)
   */
  resetCombo(): void {
    this.comboCount = 0;
  }

  /**
   * Get current combo count
   */
  getComboCount(): number {
    return this.comboCount;
  }

  /**
   * Clear all active texts
   */
  clear(): void {
    for (const ct of this.activeTexts) {
      ct.text.destroy();
    }
    this.activeTexts = [];
    this.comboCount = 0;
  }

  /**
   * Update position (if screen size changes)
   */
  setPosition(x: number, y: number): void {
    this.centerX = x;
    this.centerY = y;
  }

  /**
   * Destroy the combo display
   */
  destroy(): void {
    this.clear();
  }
}
