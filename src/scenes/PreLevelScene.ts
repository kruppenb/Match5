import Phaser from 'phaser';
import { CONFIG } from '../config';
import { ChargeLevel } from '../types';
import { getCurrencyManager } from '../meta/CurrencyManager';
import { LEVELS } from '../data/levels';
import { LevelConfig } from '../types';

export class PreLevelScene extends Phaser.Scene {
  private levelId: number = 1;
  private selectedChargeIndex: number = 0;
  private chargeMeter!: Phaser.GameObjects.Graphics;
  private chargeMeterFill!: Phaser.GameObjects.Graphics;
  private chargeLabel!: Phaser.GameObjects.Text;
  private costText!: Phaser.GameObjects.Text;
  private isReplay: boolean = false;
  private returnScene: string = 'TitleScene';
  private chargeButtons: Phaser.GameObjects.Arc[] = [];

  constructor() {
    super({ key: 'PreLevelScene' });
  }

  preload(): void {
    if (!this.textures.exists('bg_title')) {
      this.load.image('bg_title', 'assets/backgrounds/title_screen.jpg.jpeg');
    }
  }

  init(data: { levelId: number; isReplay?: boolean; returnScene?: string }): void {
    this.levelId = data.levelId || 1;
    this.selectedChargeIndex = 0;
    this.isReplay = data.isReplay ?? false;
    this.returnScene = data.returnScene ?? 'TitleScene';
    this.chargeButtons = [];
    // Reset text references to avoid calling methods on destroyed objects
    this.chargeLabel = undefined!;
    this.costText = undefined!;
    this.chargeMeter = undefined!;
    this.chargeMeterFill = undefined!;
  }

  create(): void {
    // Background
    this.renderBackground();

    // Header
    this.createHeader();

    // Level preview
    this.createLevelPreview();

    // Hero section with charging
    this.createHeroSection();

    // Start button
    this.createStartButton();

    // Back button
    this.createBackButton();
  }

  private renderBackground(): void {
    const { width, height } = this.scale;

    if (this.textures.exists('bg_title')) {
      const bg = this.add.image(width / 2, height, 'bg_title');
      bg.setOrigin(0.5, 1);
      bg.setDepth(-10);

      const scaleX = width / bg.width;
      const scaleY = height / bg.height;
      const scale = Math.max(scaleX, scaleY);
      bg.setScale(scale);

      // Dark overlay for better UI readability
      this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4).setDepth(-9);
      return;
    }

    // Fallback to solid color
    this.add.rectangle(width / 2, height / 2, width, height, CONFIG.UI.COLORS.BACKGROUND);
  }

  private createHeader(): void {
    const { width } = this.scale;
    const currencyManager = getCurrencyManager();

    this.add.rectangle(width / 2, 40, width, 80, CONFIG.UI.COLORS.PANEL);

    this.add.text(width / 2, 40, `Level ${this.levelId}`, {
      fontSize: '28px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Coins display
    this.add.circle(width - 80, 40, 12, 0xffd700);
    this.add.text(width - 60, 40, currencyManager.formatCoins(currencyManager.getCoins()), {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0, 0.5);
  }

  private createLevelPreview(): void {
    const { width } = this.scale;
    const level: LevelConfig | undefined = LEVELS[this.levelId];

    // Preview container
    const previewY = 140;
    this.add.rectangle(width / 2, previewY, width - 40, 100, 0x3a3a4e)
      .setStrokeStyle(2, 0x4a90d9);

    if (level) {
      // Objectives preview
      this.add.text(width / 2, previewY - 25, 'Objectives:', {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#aaaaaa',
      }).setOrigin(0.5);

      const objectiveTexts = level.objectives.map((obj: { type: string; target: number }) => {
        return `${this.getObjectiveIcon(obj.type)} ${obj.target}`;
      }).join('  ');

      this.add.text(width / 2, previewY + 5, objectiveTexts, {
        fontSize: '18px',
        fontFamily: 'Arial',
        color: '#ffffff',
      }).setOrigin(0.5);

      // Moves
      this.add.text(width / 2, previewY + 35, `Moves: ${level.moves}`, {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#ffff44',
      }).setOrigin(0.5);
    }
  }

  private getObjectiveIcon(type: string): string {
    const icons: Record<string, string> = {
      clear_grass: '🌿',
      clear_ice: '🧊',
      clear_boxes: '📦',
      clear_chains: '⛓️',
      collect: '⭐',
      score: '🎯',
    };
    return icons[type] || '❓';
  }

  private createHeroSection(): void {
    const { width } = this.scale;
    const chargeLevels = CONFIG.META.CHARGE_LEVELS as ChargeLevel[];

    // Section title
    this.add.text(width / 2, 220, 'Hero Boost', {
      fontSize: '20px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Hero portrait placeholder
    const heroY = 290;
    this.add.circle(width / 2, heroY, 50, 0x4a90d9)
      .setStrokeStyle(3, 0x6ab0f9);
    this.add.text(width / 2, heroY, '⚡', {
      fontSize: '40px',
    }).setOrigin(0.5);

    // Charge meter
    const meterY = heroY + 80;
    const meterWidth = 200;
    const meterHeight = 20;

    this.chargeMeter = this.add.graphics();
    this.chargeMeter.fillStyle(0x333333);
    this.chargeMeter.fillRoundedRect(width / 2 - meterWidth / 2, meterY, meterWidth, meterHeight, 10);
    this.chargeMeter.lineStyle(2, 0x4a90d9);
    this.chargeMeter.strokeRoundedRect(width / 2 - meterWidth / 2, meterY, meterWidth, meterHeight, 10);

    this.chargeMeterFill = this.add.graphics();
    this.updateChargeMeter();

    // Charge label
    this.chargeLabel = this.add.text(width / 2, meterY + 35, chargeLevels[0].label, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Cost display
    this.costText = this.add.text(width / 2, meterY + 60, 'FREE', {
      fontSize: '18px',
      fontFamily: 'Arial Bold',
      color: '#44ff44',
    }).setOrigin(0.5);

    // Charge level buttons
    const buttonY = meterY + 100;
    const buttonSpacing = 70;
    const startX = width / 2 - (chargeLevels.length - 1) * buttonSpacing / 2;

    chargeLevels.forEach((level, index) => {
      const x = startX + index * buttonSpacing;
      const btn = this.createChargeButton(level, index, x, buttonY);
      this.chargeButtons.push(btn);
    });
  }

  private createChargeButton(level: ChargeLevel, index: number, x: number, y: number): Phaser.GameObjects.Arc {
    const currencyManager = getCurrencyManager();
    const canAfford = currencyManager.getCoins() >= level.coinCost;
    const isSelected = index === this.selectedChargeIndex;

    const btn = this.add.circle(x, y, 25, isSelected ? 0x4a90d9 : (canAfford ? 0x3a3a4e : 0x222222))
      .setStrokeStyle(3, isSelected ? 0x6ab0f9 : (canAfford ? 0x555555 : 0x333333))
      .setInteractive({ useHandCursor: canAfford });

    const labelText = level.percentage === 0 ? '0' : `${level.percentage}%`;
    this.add.text(x, y, labelText, {
      fontSize: '12px',
      fontFamily: 'Arial Bold',
      color: canAfford ? '#ffffff' : '#666666',
    }).setOrigin(0.5);

    if (canAfford) {
      btn.on('pointerover', () => {
        if (index !== this.selectedChargeIndex) {
          btn.setFillStyle(0x4a4a5e);
        }
      });
      btn.on('pointerout', () => {
        if (index !== this.selectedChargeIndex) {
          btn.setFillStyle(0x3a3a4e);
        }
      });
      btn.on('pointerdown', () => this.selectChargeLevel(index));
    }

    return btn;
  }

  private selectChargeLevel(index: number): void {
    this.selectedChargeIndex = index;
    this.updateChargeMeter();
    this.updateChargeButtons();
  }

  private updateChargeButtons(): void {
    const chargeLevels = CONFIG.META.CHARGE_LEVELS as ChargeLevel[];
    const currencyManager = getCurrencyManager();

    this.chargeButtons.forEach((btn, index) => {
      const level = chargeLevels[index];
      const canAfford = currencyManager.getCoins() >= level.coinCost;
      const isSelected = index === this.selectedChargeIndex;

      btn.setFillStyle(isSelected ? 0x4a90d9 : (canAfford ? 0x3a3a4e : 0x222222));
      btn.setStrokeStyle(3, isSelected ? 0x6ab0f9 : (canAfford ? 0x555555 : 0x333333));
    });
  }

  private updateChargeMeter(): void {
    const { width } = this.scale;
    const chargeLevels = CONFIG.META.CHARGE_LEVELS as ChargeLevel[];
    const level = chargeLevels[this.selectedChargeIndex];

    const meterY = 370;
    const meterWidth = 200;
    const meterHeight = 20;
    const fillWidth = (level.percentage / 100) * (meterWidth - 4);

    this.chargeMeterFill.clear();
    if (level.percentage > 0) {
      // Gradient effect
      const color = level.percentage === 100 ? 0xffaa00 : 0x4a90d9;
      this.chargeMeterFill.fillStyle(color);
      this.chargeMeterFill.fillRoundedRect(
        width / 2 - meterWidth / 2 + 2,
        meterY + 2,
        fillWidth,
        meterHeight - 4,
        8
      );
    }

    if (this.chargeLabel) {
      this.chargeLabel.setText(level.label);
      this.chargeLabel.setColor(level.percentage === 100 ? '#ffaa00' : '#aaaaaa');
    }

    if (this.costText) {
      if (level.coinCost === 0) {
        this.costText.setText('FREE');
        this.costText.setColor('#44ff44');
      } else {
        this.costText.setText(`Cost: ${level.coinCost} coins`);
        this.costText.setColor('#ffd700');
      }
    }
  }

  private createStartButton(): void {
    const { width, height } = this.scale;
    const chargeLevels = CONFIG.META.CHARGE_LEVELS as ChargeLevel[];
    const selectedLevel = chargeLevels[this.selectedChargeIndex];
    const currencyManager = getCurrencyManager();
    const canAfford = currencyManager.getCoins() >= selectedLevel.coinCost;

    const startBtn = this.add.rectangle(width / 2, height - 120, 200, 60, canAfford ? 0x44aa44 : 0x666666)
      .setStrokeStyle(3, canAfford ? 0x66cc66 : 0x888888);

    if (canAfford) {
      startBtn.setInteractive({ useHandCursor: true })
        .on('pointerover', () => startBtn.setFillStyle(0x55bb55))
        .on('pointerout', () => startBtn.setFillStyle(0x44aa44))
        .on('pointerdown', () => this.startLevel());
    }

    this.add.text(width / 2, height - 120, 'PLAY!', {
      fontSize: '28px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  private startLevel(): void {
    const chargeLevels = CONFIG.META.CHARGE_LEVELS as ChargeLevel[];
    const selectedLevel = chargeLevels[this.selectedChargeIndex];

    // Spend coins if charging
    if (selectedLevel.coinCost > 0) {
      const currencyManager = getCurrencyManager();
      if (!currencyManager.spendCoins(selectedLevel.coinCost)) {
        return; // Can't afford
      }
    }

    // Start game with charge data
    this.scene.start('GameScene', {
      levelId: this.levelId,
      heroChargePercent: selectedLevel.percentage,
      isReplay: this.isReplay,
    });
  }

  private createBackButton(): void {
    const backBtn = this.add.rectangle(60, this.scale.height - 50, 100, 40, 0x4a4a5e)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backBtn.setFillStyle(0x5a5a6e))
      .on('pointerout', () => backBtn.setFillStyle(0x4a4a5e))
      .on('pointerdown', () => this.scene.start(this.returnScene));

    this.add.text(60, this.scale.height - 50, '← Back', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
  }
}
