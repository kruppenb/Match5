import Phaser from 'phaser';
import { CONFIG } from '../config';
import { Level } from '../game/Level';
import { ProgressStorage } from '../storage/ProgressStorage';

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelectScene');
  }

  create(): void {
    console.log('Level Select Scene Created');

    // Background
    this.add.graphics()
      .fillStyle(CONFIG.UI.COLORS.BACKGROUND, 1)
      .fillRect(0, 0, CONFIG.SCREEN.WIDTH, CONFIG.SCREEN.HEIGHT);

    // Title
    this.add.text(CONFIG.SCREEN.WIDTH / 2, 40, 'MATCH5', {
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(CONFIG.SCREEN.WIDTH / 2, 85, 'Select a Level', {
      fontSize: '20px',
      color: '#888888',
    }).setOrigin(0.5);

    // Total stars display
    const totalStars = ProgressStorage.getTotalStars();
    this.add.text(CONFIG.SCREEN.WIDTH - 20, 30, `Total Stars: ${totalStars}`, {
      fontSize: '16px',
      color: '#ffff00',
    }).setOrigin(1, 0.5);

    // Level grid
    this.createLevelGrid();

    // Reset progress button (for testing)
    const resetBtn = this.add.text(20, CONFIG.SCREEN.HEIGHT - 30, 'Reset Progress', {
      fontSize: '14px',
      color: '#666666',
    }).setInteractive({ useHandCursor: true });

    resetBtn.on('pointerdown', () => {
      ProgressStorage.reset();
      this.scene.restart();
    });
    resetBtn.on('pointerover', () => resetBtn.setColor('#ff6666'));
    resetBtn.on('pointerout', () => resetBtn.setColor('#666666'));
  }

  private createLevelGrid(): void {
    const totalLevels = Level.getTotalLevels();
    const cols = 5;
    const buttonSize = 70;
    const spacing = 20;
    const startX = (CONFIG.SCREEN.WIDTH - (cols * buttonSize + (cols - 1) * spacing)) / 2 + buttonSize / 2;
    const startY = 160;

    for (let i = 0; i < totalLevels; i++) {
      const levelId = i + 1;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (buttonSize + spacing);
      const y = startY + row * (buttonSize + spacing + 20);

      this.createLevelButton(x, y, levelId, buttonSize);
    }
  }

  private createLevelButton(x: number, y: number, levelId: number, size: number): void {
    const isUnlocked = ProgressStorage.isLevelUnlocked(levelId);
    const isCompleted = ProgressStorage.isLevelCompleted(levelId);
    const stars = ProgressStorage.getLevelStars(levelId);

    // Button background
    const button = this.add.graphics();
    const bgColor = isUnlocked ? (isCompleted ? 0x44aa44 : 0x4466aa) : 0x333333;
    button.fillStyle(bgColor, 1);
    button.fillRoundedRect(x - size / 2, y - size / 2, size, size, 10);
    button.lineStyle(3, isUnlocked ? 0xffffff : 0x555555, 0.5);
    button.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 10);

    // Level number
    const textColor = isUnlocked ? '#ffffff' : '#666666';
    this.add.text(x, y - 5, levelId.toString(), {
      fontSize: '28px',
      fontStyle: 'bold',
      color: textColor,
    }).setOrigin(0.5);

    // Stars (if completed)
    if (isCompleted) {
      const starSpacing = 16;
      for (let i = 0; i < 3; i++) {
        const starX = x + (i - 1) * starSpacing;
        const starY = y + size / 2 + 12;
        const starColor = i < stars ? 0xffff00 : 0x444444;
        this.drawStar(starX, starY, 6, starColor);
      }
    }

    // Lock icon (if locked)
    if (!isUnlocked) {
      const lock = this.add.graphics();
      lock.fillStyle(0x888888, 1);
      // Lock body
      lock.fillRoundedRect(x - 8, y, 16, 12, 2);
      // Lock shackle
      lock.lineStyle(3, 0x888888, 1);
      lock.beginPath();
      lock.arc(x, y - 2, 6, Math.PI, 0);
      lock.strokePath();
    }

    // Make interactive if unlocked
    if (isUnlocked) {
      const hitArea = this.add.rectangle(x, y, size, size, 0x000000, 0);
      hitArea.setInteractive({ useHandCursor: true });

      hitArea.on('pointerdown', () => {
        this.startLevel(levelId);
      });

      hitArea.on('pointerover', () => {
        button.clear();
        button.fillStyle(0x5588cc, 1);
        button.fillRoundedRect(x - size / 2, y - size / 2, size, size, 10);
        button.lineStyle(3, 0xffffff, 1);
        button.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 10);
      });

      hitArea.on('pointerout', () => {
        button.clear();
        button.fillStyle(bgColor, 1);
        button.fillRoundedRect(x - size / 2, y - size / 2, size, size, 10);
        button.lineStyle(3, 0xffffff, 0.5);
        button.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 10);
      });
    }
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

  private startLevel(levelId: number): void {
    console.log(`Starting Level ${levelId}`);
    this.scene.start('GameScene', { levelId });
  }
}
