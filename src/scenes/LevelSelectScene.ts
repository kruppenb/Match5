import Phaser from 'phaser';
import { CONFIG } from '../config';
import { Level } from '../game/Level';
import { ProgressStorage } from '../storage/ProgressStorage';
import { getCurrencyManager } from '../meta/CurrencyManager';
import { getProgressionEventManager } from '../meta/ProgressionEventManager';
import { MetaStorage } from '../storage/MetaStorage';

export class LevelSelectScene extends Phaser.Scene {
  private coinsText!: Phaser.GameObjects.Text;
  private diamondsText!: Phaser.GameObjects.Text;

  constructor() {
    super('LevelSelectScene');
  }

  create(): void {
    console.log('Level Select Scene Created');

    // Check for daily login bonus
    this.checkDailyLogin();

    // Background
    this.add.graphics()
      .fillStyle(CONFIG.UI.COLORS.BACKGROUND, 1)
      .fillRect(0, 0, CONFIG.SCREEN.WIDTH, CONFIG.SCREEN.HEIGHT);

    // Currency display (top right)
    this.createCurrencyDisplay();

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

    // Meta buttons (Shop, Mini-Games, Events)
    this.createMetaButtons();

    // Reset progress button (for testing)
    const resetBtn = this.add.text(20, CONFIG.SCREEN.HEIGHT - 30, 'Reset', {
      fontSize: '12px',
      color: '#666666',
    }).setInteractive({ useHandCursor: true });

    resetBtn.on('pointerdown', () => {
      ProgressStorage.reset();
      MetaStorage.reset();
      this.scene.restart();
    });
    resetBtn.on('pointerover', () => resetBtn.setColor('#ff6666'));
    resetBtn.on('pointerout', () => resetBtn.setColor('#666666'));
  }

  private checkDailyLogin(): void {
    const currencyManager = getCurrencyManager();
    const bonus = currencyManager.checkDailyLogin();

    if (bonus) {
      // Show daily login popup after a short delay
      this.time.delayedCall(500, () => {
        this.showDailyLoginBonus(bonus.coins, bonus.diamonds);
      });
    }
  }

  private showDailyLoginBonus(coins: number, diamonds: number): void {
    const { width, height } = this.scale;

    // Overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setInteractive();

    // Panel
    const panel = this.add.rectangle(width / 2, height / 2, 280, 200, 0x2a2a3e)
      .setStrokeStyle(3, 0x4a90d9);

    // Title
    const title = this.add.text(width / 2, height / 2 - 70, 'Daily Bonus!', {
      fontSize: '28px',
      fontFamily: 'Arial Black',
      color: '#ffd700',
    }).setOrigin(0.5);

    // Rewards
    const coinsText = this.add.text(width / 2, height / 2 - 20, `+${coins} Coins`, {
      fontSize: '22px',
      fontFamily: 'Arial Bold',
      color: '#ffd700',
    }).setOrigin(0.5);

    const diamondsText = this.add.text(width / 2, height / 2 + 15, `+${diamonds} Diamonds`, {
      fontSize: '18px',
      fontFamily: 'Arial Bold',
      color: '#00bfff',
    }).setOrigin(0.5);

    // Claim button
    const claimBtn = this.add.rectangle(width / 2, height / 2 + 65, 120, 40, 0x44aa44)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => claimBtn.setFillStyle(0x55bb55))
      .on('pointerout', () => claimBtn.setFillStyle(0x44aa44))
      .on('pointerdown', () => {
        overlay.destroy();
        panel.destroy();
        title.destroy();
        coinsText.destroy();
        diamondsText.destroy();
        claimBtn.destroy();
        claimText.destroy();
        this.updateCurrencyDisplay();
      });

    const claimText = this.add.text(width / 2, height / 2 + 65, 'CLAIM!', {
      fontSize: '18px',
      fontFamily: 'Arial Bold',
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  private createCurrencyDisplay(): void {
    const currencyManager = getCurrencyManager();
    const currencyY = 36; // Same line as title

    // Coins - positioned with background pill
    const coinsValue = currencyManager.formatCoins(currencyManager.getCoins());
    this.add.circle(CONFIG.SCREEN.WIDTH - 95, currencyY, 8, 0xffd700);
    this.coinsText = this.add.text(CONFIG.SCREEN.WIDTH - 83, currencyY, coinsValue, {
      fontSize: '12px',
      fontFamily: 'Arial Bold',
      color: '#ffffff',
    }).setOrigin(0, 0.5);

    // Diamonds - right edge
    this.add.polygon(CONFIG.SCREEN.WIDTH - 30, currencyY, [[0, -6], [5, 0], [0, 6], [-5, 0]], 0x00bfff);
    this.diamondsText = this.add.text(CONFIG.SCREEN.WIDTH - 20, currencyY, currencyManager.getDiamonds().toString(), {
      fontSize: '12px',
      fontFamily: 'Arial Bold',
      color: '#ffffff',
    }).setOrigin(0, 0.5);
  }

  private updateCurrencyDisplay(): void {
    const currencyManager = getCurrencyManager();
    this.coinsText.setText(currencyManager.formatCoins(currencyManager.getCoins()));
    this.diamondsText.setText(currencyManager.getDiamonds().toString());
  }

  private createMetaButtons(): void {
    const { width, height } = this.scale;
    const buttonY = height - 70;
    const buttonWidth = 90;
    const buttonHeight = 45;
    const spacing = 10;
    const totalWidth = 3 * buttonWidth + 2 * spacing;
    const startX = (width - totalWidth) / 2 + buttonWidth / 2;

    // Shop button
    this.createMetaButton(startX, buttonY, buttonWidth, buttonHeight, '🛒', 'Shop', () => {
      this.scene.start('ShopScene');
    });

    // Mini-Games button
    this.createMetaButton(startX + buttonWidth + spacing, buttonY, buttonWidth, buttonHeight, '🎮', 'Games', () => {
      this.scene.start('MiniGameHubScene');
    });

    // Event button
    const eventManager = getProgressionEventManager();
    const availableCheckpoints = eventManager.getAvailableCheckpoints();
    const hasRewards = availableCheckpoints.length > 0;

    this.createMetaButton(startX + 2 * (buttonWidth + spacing), buttonY, buttonWidth, buttonHeight, '⚡', 'Event', () => {
      this.showEventProgress();
    }, hasRewards);
  }

  private createMetaButton(
    x: number,
    y: number,
    width: number,
    height: number,
    icon: string,
    label: string,
    onClick: () => void,
    hasNotification: boolean = false
  ): void {
    const btn = this.add.rectangle(x, y, width, height, 0x3a3a4e)
      .setStrokeStyle(2, 0x4a90d9)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => btn.setFillStyle(0x4a4a5e))
      .on('pointerout', () => btn.setFillStyle(0x3a3a4e))
      .on('pointerdown', onClick);

    this.add.text(x, y - 8, icon, {
      fontSize: '18px',
    }).setOrigin(0.5);

    this.add.text(x, y + 12, label, {
      fontSize: '11px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Notification badge
    if (hasNotification) {
      this.add.circle(x + width / 2 - 8, y - height / 2 + 8, 8, 0xff4444);
      this.add.text(x + width / 2 - 8, y - height / 2 + 8, '!', {
        fontSize: '10px',
        fontFamily: 'Arial Bold',
        color: '#ffffff',
      }).setOrigin(0.5);
    }
  }

  private showEventProgress(): void {
    const { width, height } = this.scale;
    const eventManager = getProgressionEventManager();
    const event = eventManager.getCurrentEvent();
    const points = eventManager.getPoints();
    const claimed = eventManager.getClaimedCheckpoints();

    // Overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
      .setInteractive();

    // Panel
    const panelHeight = 350;
    const panel = this.add.rectangle(width / 2, height / 2, width - 40, panelHeight, 0x2a2a3e)
      .setStrokeStyle(3, 0x4a90d9);

    // Title
    this.add.text(width / 2, height / 2 - panelHeight / 2 + 30, event.name, {
      fontSize: '24px',
      fontFamily: 'Arial Black',
      color: '#ffd700',
    }).setOrigin(0.5);

    // Points display
    this.add.text(width / 2, height / 2 - panelHeight / 2 + 60, `Points: ${points}`, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Checkpoints
    const checkpointStartY = height / 2 - panelHeight / 2 + 100;
    event.checkpoints.forEach((checkpoint, index) => {
      const y = checkpointStartY + index * 45;
      const isReached = points >= checkpoint.pointsRequired;
      const isClaimed = claimed.includes(index);

      // Checkpoint bar
      const barWidth = width - 100;
      this.add.rectangle(width / 2, y, barWidth, 35, isClaimed ? 0x335533 : (isReached ? 0x44aa44 : 0x3a3a4e))
        .setStrokeStyle(2, isReached ? 0x66cc66 : 0x555555);

      // Label
      this.add.text(width / 2 - barWidth / 2 + 10, y, checkpoint.label, {
        fontSize: '12px',
        fontFamily: 'Arial',
        color: isReached ? '#ffffff' : '#888888',
      }).setOrigin(0, 0.5);

      // Points required
      this.add.text(width / 2 + barWidth / 2 - 60, y, `${checkpoint.pointsRequired}pts`, {
        fontSize: '11px',
        fontFamily: 'Arial',
        color: '#aaaaaa',
      }).setOrigin(0.5);

      // Claim button or checkmark
      if (isReached && !isClaimed) {
        this.add.rectangle(width / 2 + barWidth / 2 - 25, y, 40, 25, 0xffaa00)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            eventManager.claimCheckpoint(index);
            this.updateCurrencyDisplay();
            overlay.destroy();
            panel.destroy();
            this.showEventProgress(); // Refresh
          });

        this.add.text(width / 2 + barWidth / 2 - 25, y, 'GET', {
          fontSize: '10px',
          fontFamily: 'Arial Bold',
          color: '#000000',
        }).setOrigin(0.5);
      } else if (isClaimed) {
        this.add.text(width / 2 + barWidth / 2 - 25, y, '✓', {
          fontSize: '18px',
          color: '#44ff44',
        }).setOrigin(0.5);
      }
    });

    // Close button
    this.add.rectangle(width / 2, height / 2 + panelHeight / 2 - 35, 100, 35, 0x4a4a5e)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        // Destroy all event panel elements (simple approach - just restart scene)
        this.scene.restart();
      });

    this.add.text(width / 2, height / 2 + panelHeight / 2 - 35, 'Close', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
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
