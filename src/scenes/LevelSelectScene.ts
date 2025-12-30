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
    this.add.text(CONFIG.SCREEN.WIDTH / 2, 36, 'PRINCESS MATCH', {
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(CONFIG.SCREEN.WIDTH / 2, 70, 'Select a Level', {
      fontSize: '16px',
      color: '#888888',
    }).setOrigin(0.5);

    // Total stars display
    const totalStars = ProgressStorage.getTotalStars();
    this.add.text(CONFIG.SCREEN.WIDTH / 2, 95, `⭐ ${totalStars}`, {
      fontSize: '18px',
      color: '#ffff00',
    }).setOrigin(0.5);

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
    const rows = Math.ceil(totalLevels / cols);

    // Layout constants
    const marginX = 15; // left/right screen margin
    const startY = 120; // top of grid
    const bottomPadding = 40; // space for reset button
    const starRowHeight = 16; // space below each button for stars

    // Available space
    const availableWidth = CONFIG.SCREEN.WIDTH - marginX * 2;
    const availableHeight = CONFIG.SCREEN.HEIGHT - startY - bottomPadding;

    // Fixed gaps
    const gapY = 8;
    const gapX = 8;
    
    // Calculate button size from width (primary constraint on narrow mobile)
    let buttonSize = Math.floor((availableWidth - (cols - 1) * gapX) / cols);
    
    // Also check height constraint
    const maxButtonFromHeight = Math.floor((availableHeight - rows * starRowHeight - (rows - 1) * gapY) / rows);
    buttonSize = Math.min(buttonSize, maxButtonFromHeight);

    // Clamp button size to reasonable bounds
    const maxButtonSize = 70;
    const minButtonSize = 40;
    buttonSize = Math.min(maxButtonSize, Math.max(minButtonSize, buttonSize));

    // Row height is button + star space
    const rowHeight = buttonSize + starRowHeight;

    // Center the grid horizontally
    const gridWidth = cols * buttonSize + (cols - 1) * gapX;
    const startX = (CONFIG.SCREEN.WIDTH - gridWidth) / 2 + buttonSize / 2;

    for (let i = 0; i < totalLevels; i++) {
      const levelId = i + 1;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (buttonSize + gapX);
      const y = startY + row * (rowHeight + gapY);

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

    // Level number (position scaled to button size)
    const textColor = isUnlocked ? '#ffffff' : '#666666';
    const numberYOffset = Math.max(8, Math.round(size * 0.17));
    this.add.text(x, y - numberYOffset, levelId.toString(), {
      fontSize: `${Math.round(size * 0.34)}px`,
      fontStyle: 'bold',
      color: textColor,
    }).setOrigin(0.5);

    // Stars (if completed) - size and spacing scale with button
    if (isCompleted) {
      const starSpacing = Math.max(10, Math.round(size * 0.23));
      const starSize = Math.max(4, Math.round(size * 0.09));
      const starY = y + size / 2 + Math.max(8, Math.round(size * 0.12));
      for (let i = 0; i < 3; i++) {
        const starX = x + (i - 1) * starSpacing;
        const starColor = i < stars ? 0xffff00 : 0x444444;
        this.drawStar(starX, starY, starSize, starColor);
      }
    }

    // Lock icon (if locked) — scaled and positioned below number
    if (!isUnlocked) {
      const lock = this.add.graphics();
      lock.fillStyle(0x666666, 1);
      const lockW = Math.max(8, Math.round(size * 0.18));
      const lockH = Math.max(6, Math.round(size * 0.12));
      const lockYOffset = Math.max(6, Math.round(size * 0.12));
      // Lock body (smaller)
      lock.fillRoundedRect(x - lockW / 2, y + lockYOffset, lockW, lockH, 2);
      // Lock shackle (smaller)
      lock.lineStyle(2, 0x999999, 1);
      lock.beginPath();
      lock.arc(x, y + lockYOffset - Math.max(2, Math.round(size * 0.03)), Math.max(4, Math.round(size * 0.06)), Math.PI, 0);
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
