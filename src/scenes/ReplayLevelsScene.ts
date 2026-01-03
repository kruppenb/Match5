import Phaser from 'phaser';
import { CONFIG } from '../config';
import { ProgressStorage } from '../storage/ProgressStorage';
import { MetaStorage } from '../storage/MetaStorage';

const REPLAY_BONUS_DIAMONDS = 50;

export class ReplayLevelsScene extends Phaser.Scene {
  constructor() {
    super('ReplayLevelsScene');
  }

  preload(): void {
    // Load title screen background (same as TitleScene)
    this.load.image('bg_title', 'assets/backgrounds/title_screen.jpg.jpeg');
  }

  create(): void {
    console.log('Replay Levels Scene Created');

    // Background
    this.renderBackground();

    // Header
    this.createHeader();

    // Daily bonus info
    this.createBonusInfo();

    // Level grid (completed levels only)
    this.createLevelGrid();

    // Back button
    this.createBackButton();
  }

  private renderBackground(): void {
    const { width, height } = this.scale;

    if (this.textures.exists('bg_title')) {
      const bg = this.add.image(width / 2, height / 2, 'bg_title');
      bg.setDepth(-10);
      const scaleX = width / bg.width;
      const scaleY = height / bg.height;
      const scale = Math.max(scaleX, scaleY);
      bg.setScale(scale);
      this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4).setDepth(-9);
    } else {
      this.add.rectangle(width / 2, height / 2, width, height, CONFIG.UI.COLORS.BACKGROUND);
    }
  }

  private createHeader(): void {
    const { width } = this.scale;

    this.add.text(width / 2, 40, 'REPLAY LEVELS', {
      fontSize: '28px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
  }

  private createBonusInfo(): void {
    const { width } = this.scale;
    const replayData = MetaStorage.getDailyReplayData();
    const remaining = 3 - replayData.replaysCompleted;
    const bonusY = 95;

    // Bonus panel background
    const panelWidth = 260;
    const panelHeight = 60;
    const panel = this.add.graphics();
    panel.fillStyle(0x2a2a3e, 0.9);
    panel.fillRoundedRect(width / 2 - panelWidth / 2, bonusY - panelHeight / 2, panelWidth, panelHeight, 12);
    panel.lineStyle(2, remaining > 0 ? 0x00bfff : 0x555555);
    panel.strokeRoundedRect(width / 2 - panelWidth / 2, bonusY - panelHeight / 2, panelWidth, panelHeight, 12);

    if (remaining > 0) {
      // Diamond icon
      this.add.polygon(width / 2 - 80, bonusY, [[0, -10], [8, 0], [0, 10], [-8, 0]], 0x00bfff);

      // Bonus text
      this.add.text(width / 2 - 60, bonusY - 10, 'Daily Bonus', {
        fontSize: '14px',
        fontFamily: 'Arial Bold',
        color: '#ffffff',
      }).setOrigin(0, 0.5);

      this.add.text(width / 2 - 60, bonusY + 10, `+${REPLAY_BONUS_DIAMONDS} per replay`, {
        fontSize: '12px',
        fontFamily: 'Arial',
        color: '#00bfff',
      }).setOrigin(0, 0.5);

      // Remaining count
      this.add.text(width / 2 + 90, bonusY, `${remaining}/3`, {
        fontSize: '20px',
        fontFamily: 'Arial Black',
        color: '#00bfff',
      }).setOrigin(0.5);
    } else {
      this.add.text(width / 2, bonusY, 'Daily bonuses claimed!', {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#888888',
      }).setOrigin(0.5);

      this.add.text(width / 2, bonusY + 18, 'Come back tomorrow', {
        fontSize: '12px',
        fontFamily: 'Arial',
        color: '#666666',
      }).setOrigin(0.5);
    }
  }

  private createLevelGrid(): void {
    const currentLevel = ProgressStorage.getHighestLevel();
    const completedLevels = [];

    // Get all completed levels (levels before current)
    for (let i = 1; i < currentLevel; i++) {
      if (ProgressStorage.isLevelCompleted(i)) {
        completedLevels.push(i);
      }
    }

    if (completedLevels.length === 0) {
      const { width, height } = this.scale;
      this.add.text(width / 2, height / 2, 'No completed levels yet!', {
        fontSize: '18px',
        fontFamily: 'Arial',
        color: '#888888',
      }).setOrigin(0.5);

      this.add.text(width / 2, height / 2 + 30, 'Complete some levels first.', {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#666666',
      }).setOrigin(0.5);
      return;
    }

    const cols = 4;
    const rows = Math.ceil(completedLevels.length / cols);

    // Layout constants
    const marginX = 20;
    const startY = 170; // More spacing from bonus info
    const bottomPadding = 80;

    const availableWidth = CONFIG.SCREEN.WIDTH - marginX * 2;
    const availableHeight = CONFIG.SCREEN.HEIGHT - startY - bottomPadding;

    const gapX = 10;
    const gapY = 12;

    let buttonSize = Math.floor((availableWidth - (cols - 1) * gapX) / cols);
    const maxButtonFromHeight = Math.floor((availableHeight - (rows - 1) * gapY) / rows);
    buttonSize = Math.min(buttonSize, maxButtonFromHeight, 75);

    const gridWidth = cols * buttonSize + (cols - 1) * gapX;
    const startX = (CONFIG.SCREEN.WIDTH - gridWidth) / 2 + buttonSize / 2;

    completedLevels.forEach((levelId, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (buttonSize + gapX);
      const y = startY + row * (buttonSize + gapY + 20);

      this.createLevelButton(x, y, levelId, buttonSize);
    });
  }

  private createLevelButton(x: number, y: number, levelId: number, size: number): void {
    const stars = ProgressStorage.getLevelStars(levelId);
    const canEarnBonus = MetaStorage.canEarnReplayBonus();

    // Button background
    const button = this.add.graphics();
    button.fillStyle(0x44aa44, 1);
    button.fillRoundedRect(x - size / 2, y - size / 2, size, size, 10);
    button.lineStyle(3, 0xffffff, 0.5);
    button.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 10);

    // Level number
    this.add.text(x, y - 8, levelId.toString(), {
      fontSize: `${Math.round(size * 0.38)}px`,
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Stars
    const starSpacing = Math.max(12, Math.round(size * 0.25));
    const starSize = Math.max(5, Math.round(size * 0.1));
    const starY = y + size / 2 + 10;

    for (let i = 0; i < 3; i++) {
      const starX = x + (i - 1) * starSpacing;
      const starColor = i < stars ? 0xffff00 : 0x444444;
      this.drawStar(starX, starY, starSize, starColor);
    }

    // Bonus badge if available
    if (canEarnBonus) {
      const badge = this.add.container(x + size / 2 - 5, y - size / 2 + 5);
      badge.add(this.add.circle(0, 0, 12, 0x00bfff));
      badge.add(this.add.text(0, 0, '💎', { fontSize: '12px' }).setOrigin(0.5));
    }

    // Make interactive
    const hitArea = this.add.rectangle(x, y, size, size, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hitArea.on('pointerdown', () => {
      this.startReplayLevel(levelId);
    });

    hitArea.on('pointerover', () => {
      button.clear();
      button.fillStyle(0x55bb55, 1);
      button.fillRoundedRect(x - size / 2, y - size / 2, size, size, 10);
      button.lineStyle(3, 0xffffff, 1);
      button.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 10);
    });

    hitArea.on('pointerout', () => {
      button.clear();
      button.fillStyle(0x44aa44, 1);
      button.fillRoundedRect(x - size / 2, y - size / 2, size, size, 10);
      button.lineStyle(3, 0xffffff, 0.5);
      button.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 10);
    });
  }

  private drawStar(x: number, y: number, size: number, color: number): void {
    const star = this.add.graphics();
    star.fillStyle(color, 1);

    const points = 5;
    const outerRadius = size;
    const innerRadius = size * 0.4;
    const starPoints: { x: number; y: number }[] = [];

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      starPoints.push({
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius,
      });
    }

    star.beginPath();
    star.moveTo(starPoints[0].x, starPoints[0].y);
    for (let i = 1; i < starPoints.length; i++) {
      star.lineTo(starPoints[i].x, starPoints[i].y);
    }
    star.closePath();
    star.fillPath();
  }

  private createBackButton(): void {
    const { width, height } = this.scale;

    const backBtn = this.add.rectangle(width / 2, height - 45, 120, 40, 0x4a4a5e)
      .setStrokeStyle(2, 0x666666)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backBtn.setFillStyle(0x5a5a6e))
      .on('pointerout', () => backBtn.setFillStyle(0x4a4a5e))
      .on('pointerdown', () => this.scene.start('TitleScene'));

    this.add.text(width / 2, height - 45, '← Back', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  private startReplayLevel(levelId: number): void {
    console.log(`Starting Replay Level ${levelId}`);

    this.scene.start('PreLevelScene', {
      levelId,
      isReplay: true,
      returnScene: 'ReplayLevelsScene',
    });
  }
}
