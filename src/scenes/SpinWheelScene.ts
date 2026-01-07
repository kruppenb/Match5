import Phaser from 'phaser';
import { Reward } from '../types';
import { getCurrencyManager } from '../meta/CurrencyManager';

interface WheelSlice {
  reward: Reward;
  weight: number;
  color: number;
  label: string;
  iconType: 'coins' | 'diamonds' | 'booster';
  boosterId?: string;
}

const WHEEL_SLICES: WheelSlice[] = [
  { reward: { type: 'coins', amount: 100 }, weight: 25, color: 0xffd700, label: '100', iconType: 'coins' },
  { reward: { type: 'coins', amount: 250 }, weight: 20, color: 0xffa500, label: '250', iconType: 'coins' },
  { reward: { type: 'coins', amount: 500 }, weight: 10, color: 0xff6347, label: '500', iconType: 'coins' },
  { reward: { type: 'booster', amount: 2, id: 'hammer' }, weight: 15, color: 0x4169e1, label: 'x2', iconType: 'booster', boosterId: 'hammer' },
  { reward: { type: 'booster', amount: 2, id: 'row_arrow' }, weight: 12, color: 0x8b0000, label: 'x2', iconType: 'booster', boosterId: 'row_arrow' },
  { reward: { type: 'diamonds', amount: 5 }, weight: 8, color: 0x9400d3, label: '5', iconType: 'diamonds' },
  { reward: { type: 'diamonds', amount: 15 }, weight: 5, color: 0xff1493, label: '15', iconType: 'diamonds' },
  { reward: { type: 'booster', amount: 2, id: 'shuffle' }, weight: 5, color: 0x00ced1, label: 'x2', iconType: 'booster', boosterId: 'shuffle' },
];

export class SpinWheelScene extends Phaser.Scene {
  private wheel!: Phaser.GameObjects.Container;
  private pointer!: Phaser.GameObjects.Triangle;
  private isSpinning: boolean = false;
  private spinButton!: Phaser.GameObjects.Rectangle;
  private resultText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'SpinWheelScene' });
  }

  preload(): void {
    this.load.image('booster_hammer', 'assets/sprites/boosters/hammer.png');
    this.load.image('booster_row_arrow', 'assets/sprites/boosters/arrow_h.png');
    this.load.image('booster_shuffle', 'assets/sprites/boosters/lucky67.png');
    // Load UI assets
    this.load.image('ui_coin', 'assets/sprites/ui/coin.png');
    this.load.image('ui_diamond', 'assets/sprites/ui/diamond.png');
    this.load.image('ui_wheel_bg', 'assets/sprites/ui/wheel_bg.png');
    this.load.image('ui_wheel_pointer', 'assets/sprites/ui/wheel_pointer.png');
  }

  create(): void {
    const { width, height } = this.scale;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Title
    this.add.text(width / 2, 60, 'SPIN THE WHEEL!', {
      fontSize: '32px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Create wheel
    this.createWheel();

    // Create pointer
    this.createPointer();

    // Spin button
    this.createSpinButton();

    // Result text (hidden initially)
    this.resultText = this.add.text(width / 2, height - 180, '', {
      fontSize: '28px',
      fontFamily: 'Arial Black',
      color: '#44ff44',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);

    // Back button
    this.createBackButton();
  }

  private createWheel(): void {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2 - 50;
    const radius = 150;

    this.wheel = this.add.container(centerX, centerY);

    const sliceAngle = (Math.PI * 2) / WHEEL_SLICES.length;

    // Draw wheel slices
    const graphics = this.add.graphics();

    WHEEL_SLICES.forEach((slice, i) => {
      const startAngle = i * sliceAngle - Math.PI / 2;
      const endAngle = startAngle + sliceAngle;

      // Draw slice
      graphics.fillStyle(slice.color);
      graphics.beginPath();
      graphics.moveTo(0, 0);
      graphics.arc(0, 0, radius, startAngle, endAngle);
      graphics.closePath();
      graphics.fill();

      // Border
      graphics.lineStyle(2, 0xffffff);
      graphics.beginPath();
      graphics.moveTo(0, 0);
      graphics.arc(0, 0, radius, startAngle, endAngle);
      graphics.closePath();
      graphics.stroke();

      // Label with proper icons
      const labelAngle = startAngle + sliceAngle / 2;
      const labelRadius = radius * 0.65;
      const labelX = Math.cos(labelAngle) * labelRadius;
      const labelY = Math.sin(labelAngle) * labelRadius;

      // Create icon based on type
      if (slice.iconType === 'booster' && slice.boosterId) {
        const boosterKey = `booster_${slice.boosterId}`;
        if (this.textures.exists(boosterKey)) {
          const icon = this.add.image(labelX, labelY - 8, boosterKey)
            .setDisplaySize(24, 24)
            .setRotation(labelAngle + Math.PI / 2);
          this.wheel.add(icon);
        }
        const label = this.add.text(labelX, labelY + 12, slice.label, {
          fontSize: '12px',
          fontFamily: 'Arial Bold',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 2,
        }).setOrigin(0.5).setRotation(labelAngle + Math.PI / 2);
        this.wheel.add(label);
      } else if (slice.iconType === 'coins') {
        // Use generated asset if available
        if (this.textures.exists('ui_coin')) {
          const coinImg = this.add.image(labelX, labelY - 6, 'ui_coin')
            .setDisplaySize(20, 20)
            .setRotation(labelAngle + Math.PI / 2);
          this.wheel.add(coinImg);
        } else {
          const coinGraphics = this.add.graphics();
          coinGraphics.setPosition(labelX, labelY - 6);
          coinGraphics.setRotation(labelAngle + Math.PI / 2);
          coinGraphics.fillStyle(0xffd700, 1);
          coinGraphics.fillCircle(0, 0, 10);
          coinGraphics.fillStyle(0xffec8b, 1);
          coinGraphics.fillCircle(0, -2, 5);
          this.wheel.add(coinGraphics);
        }
        const label = this.add.text(labelX, labelY + 10, slice.label, {
          fontSize: '12px',
          fontFamily: 'Arial Bold',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 2,
        }).setOrigin(0.5).setRotation(labelAngle + Math.PI / 2);
        this.wheel.add(label);
      } else if (slice.iconType === 'diamonds') {
        // Use generated asset if available
        if (this.textures.exists('ui_diamond')) {
          const diamondImg = this.add.image(labelX, labelY - 6, 'ui_diamond')
            .setDisplaySize(20, 20)
            .setRotation(labelAngle + Math.PI / 2);
          this.wheel.add(diamondImg);
        } else {
          const diamondGraphics = this.add.graphics();
          diamondGraphics.setPosition(labelX, labelY - 6);
          diamondGraphics.setRotation(labelAngle + Math.PI / 2);
          diamondGraphics.fillStyle(0x00bfff, 1);
          diamondGraphics.fillTriangle(0, -8, 6, 0, 0, 8);
          diamondGraphics.fillTriangle(0, -8, -6, 0, 0, 8);
          diamondGraphics.fillStyle(0x87ceeb, 1);
          diamondGraphics.fillTriangle(0, -3, 2, 0, 0, 3);
          this.wheel.add(diamondGraphics);
        }
        const label = this.add.text(labelX, labelY + 10, slice.label, {
          fontSize: '12px',
          fontFamily: 'Arial Bold',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 2,
        }).setOrigin(0.5).setRotation(labelAngle + Math.PI / 2);
        this.wheel.add(label);
      }
    });

    this.wheel.add(graphics);
    this.wheel.sendToBack(graphics);

    // Center circle
    const centerCircle = this.add.circle(0, 0, 20, 0xffffff);
    centerCircle.setStrokeStyle(3, 0x333333);
    this.wheel.add(centerCircle);
  }

  private createPointer(): void {
    const { width, height } = this.scale;
    const centerY = height / 2 - 50;

    this.pointer = this.add.triangle(
      width / 2,
      centerY - 170,
      0, 0,
      -20, -40,
      20, -40,
      0xff4444
    ).setRotation(Math.PI);

    this.pointer.setStrokeStyle(3, 0xffffff);
  }

  private createSpinButton(): void {
    const { width, height } = this.scale;

    this.spinButton = this.add.rectangle(width / 2, height - 100, 180, 60, 0x44aa44)
      .setStrokeStyle(3, 0x66cc66)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        if (!this.isSpinning) this.spinButton.setFillStyle(0x55bb55);
      })
      .on('pointerout', () => {
        if (!this.isSpinning) this.spinButton.setFillStyle(0x44aa44);
      })
      .on('pointerdown', () => this.spin());

    this.add.text(width / 2, height - 100, 'SPIN!', {
      fontSize: '28px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  private spin(): void {
    if (this.isSpinning) return;

    this.isSpinning = true;
    this.spinButton.setFillStyle(0x666666);
    this.resultText.setAlpha(0);

    // Weighted random selection
    const result = this.weightedRandom();
    const resultIndex = WHEEL_SLICES.indexOf(result);

    // Calculate target angle
    const sliceAngle = 360 / WHEEL_SLICES.length;
    const targetSliceCenter = resultIndex * sliceAngle + sliceAngle / 2;
    const randomOffset = (Math.random() - 0.5) * (sliceAngle * 0.6); // Random within slice
    const targetAngle = 360 * 5 + (360 - targetSliceCenter) + randomOffset; // 5 full rotations

    // Spin animation
    this.tweens.add({
      targets: this.wheel,
      angle: targetAngle,
      duration: 4000,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.awardPrize(result);
      },
    });

    // Pointer bounce effect
    this.tweens.add({
      targets: this.pointer,
      scaleY: 0.8,
      yoyo: true,
      repeat: 15,
      duration: 150,
      ease: 'Sine.easeInOut',
    });
  }

  private weightedRandom(): WheelSlice {
    const totalWeight = WHEEL_SLICES.reduce((sum, slice) => sum + slice.weight, 0);
    let random = Math.random() * totalWeight;

    for (const slice of WHEEL_SLICES) {
      random -= slice.weight;
      if (random <= 0) {
        return slice;
      }
    }

    return WHEEL_SLICES[0];
  }

  private awardPrize(slice: WheelSlice): void {
    const currencyManager = getCurrencyManager();
    currencyManager.awardReward(slice.reward, 'spin_wheel');

    // Show result
    let resultMessage = '';
    switch (slice.reward.type) {
      case 'coins':
        resultMessage = `+${slice.reward.amount} Coins!`;
        break;
      case 'diamonds':
        resultMessage = `+${slice.reward.amount} Diamonds!`;
        break;
      case 'booster':
        const boosterNames: Record<string, string> = {
          hammer: 'Hammer',
          row_arrow: 'Row Arrow',
          shuffle: 'Shuffle',
        };
        const name = boosterNames[slice.boosterId || ''] || 'Booster';
        resultMessage = `Won ${slice.reward.amount}x ${name}!`;
        break;
    }

    this.resultText.setText(resultMessage);
    this.tweens.add({
      targets: this.resultText,
      alpha: 1,
      scale: { from: 0.5, to: 1 },
      duration: 500,
      ease: 'Back.easeOut',
    });

    this.isSpinning = false;
    this.spinButton.setFillStyle(0x44aa44);

    // Celebration particles
    this.createCelebration();
  }

  private createCelebration(): void {
    const { width, height } = this.scale;

    for (let i = 0; i < 20; i++) {
      const x = width / 2 + (Math.random() - 0.5) * 200;
      const y = height / 2;
      const colors = [0xffd700, 0xff6347, 0x44ff44, 0x4169e1, 0xff1493];
      const color = colors[Math.floor(Math.random() * colors.length)];

      const particle = this.add.circle(x, y, 8, color);

      this.tweens.add({
        targets: particle,
        x: x + (Math.random() - 0.5) * 300,
        y: y + Math.random() * 300 - 200,
        alpha: 0,
        scale: 0,
        duration: 1500,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  private createBackButton(): void {
    const backBtn = this.add.rectangle(60, 50, 100, 40, 0x4a4a5e)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backBtn.setFillStyle(0x5a5a6e))
      .on('pointerout', () => backBtn.setFillStyle(0x4a4a5e))
      .on('pointerdown', () => this.scene.start('MiniGameHubScene'));

    this.add.text(60, 50, '← Back', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
  }
}
