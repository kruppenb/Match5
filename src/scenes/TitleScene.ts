import Phaser from 'phaser';
import { CONFIG } from '../config';
import { ProgressStorage } from '../storage/ProgressStorage';
import { getCurrencyManager } from '../meta/CurrencyManager';
import { getProgressionEventManager } from '../meta/ProgressionEventManager';
import { getMiniGameRotation } from '../meta/MiniGameRotation';
import { MetaStorage } from '../storage/MetaStorage';
import { BackgroundEffects } from '../utils/BackgroundEffects';

export interface TitleSceneData {
  earnedCoins?: number;
  earnedDiamonds?: number;
}

export class TitleScene extends Phaser.Scene {
  private coinsText!: Phaser.GameObjects.Text;
  private diamondsText!: Phaser.GameObjects.Text;
  private coinsPillX!: number;
  private diamondsPillX!: number;
  private barY!: number;
  private backgroundEffects!: BackgroundEffects;

  constructor() {
    super('TitleScene');
  }

  preload(): void {
    this.load.image('bg_title', 'assets/backgrounds/title_screen.jpg.jpeg');
  }

  create(data?: TitleSceneData): void {
    console.log('Title Scene Created');

    this.checkDailyLogin();

    this.renderBackground();
    this.createHeader();
    this.createCurrencyBar();
    this.createLevelCard();
    this.createLeftTabs();

    // Show currency earned animation if returning from a completed level
    if (data?.earnedCoins || data?.earnedDiamonds) {
      this.time.delayedCall(300, () => {
        this.showCurrencyEarnedAnimation(data.earnedCoins || 0, data.earnedDiamonds || 0);
      });
    }
  }

  private getBottomShowcasePadding(): number {
    const { height } = this.scale;
    return Phaser.Math.Clamp(Math.round(height * 0.14), 50, 110);
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

      this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.3).setDepth(-9);
    } else {
      this.add.rectangle(width / 2, height / 2, width, height, CONFIG.UI.COLORS.BACKGROUND);
    }

    // Add ambient background effects (sparkles + light overlay)
    this.backgroundEffects = new BackgroundEffects(this, 'title');
    this.backgroundEffects.create();
  }

  private createHeader(): void {
    const { width } = this.scale;

    this.add.text(width / 2, 45, 'PRINCESS MATCH', {
      fontSize: '32px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);
  }

  private createCurrencyBar(): void {
    const { width } = this.scale;
    const currencyManager = getCurrencyManager();
    this.barY = 100;
    const pillWidth = 90;
    const pillHeight = 36;
    const gap = 12;
    const iconOffset = 18; // Distance from left edge to icon center

    // Coins pill
    this.coinsPillX = width / 2 - gap / 2 - pillWidth / 2;
    this.createCurrencyPill(this.coinsPillX, this.barY, pillWidth, pillHeight, 'coin');

    // Coin icon with glow - centered vertically
    const coinIconX = this.coinsPillX - pillWidth / 2 + iconOffset;
    this.add.circle(coinIconX, this.barY, 14, 0xffd700, 0.3);
    this.add.circle(coinIconX, this.barY, 11, 0xffd700);
    this.add.circle(coinIconX, this.barY, 7, 0xffec8b);
    this.add.text(coinIconX, this.barY, '$', {
      fontSize: '10px',
      fontFamily: 'Arial Black',
      color: '#b8860b',
    }).setOrigin(0.5);

    // Coins text - centered in remaining space
    this.coinsText = this.add.text(this.coinsPillX + 8, this.barY, currencyManager.formatCoins(currencyManager.getCoins()), {
      fontSize: '16px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1,
    }).setOrigin(0.5);

    // Diamonds pill
    this.diamondsPillX = width / 2 + gap / 2 + pillWidth / 2;
    this.createCurrencyPill(this.diamondsPillX, this.barY, pillWidth, pillHeight, 'diamond');

    // Diamond icon with glow - use circle positioning like coins
    const diamondIconX = this.diamondsPillX - pillWidth / 2 + iconOffset;
    // Outer glow
    this.add.circle(diamondIconX, this.barY, 13, 0x00bfff, 0.25);
    // Main diamond shape - draw relative to center
    const dg = this.add.graphics();
    dg.fillStyle(0x00bfff, 1);
    dg.fillTriangle(diamondIconX, this.barY - 9, diamondIconX + 7, this.barY, diamondIconX, this.barY + 9);
    dg.fillTriangle(diamondIconX, this.barY - 9, diamondIconX - 7, this.barY, diamondIconX, this.barY + 9);
    // Inner highlight
    dg.fillStyle(0x87ceeb, 1);
    dg.fillTriangle(diamondIconX, this.barY - 4, diamondIconX + 3, this.barY, diamondIconX, this.barY + 4);
    dg.fillTriangle(diamondIconX, this.barY - 4, diamondIconX - 3, this.barY, diamondIconX, this.barY + 4);

    // Diamonds text - centered in remaining space
    this.diamondsText = this.add.text(this.diamondsPillX + 8, this.barY, currencyManager.getDiamonds().toString(), {
      fontSize: '16px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1,
    }).setOrigin(0.5);
  }

  private createCurrencyPill(x: number, y: number, width: number, height: number, type: 'coin' | 'diamond'): void {
    const graphics = this.add.graphics();

    // Shadow
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillRoundedRect(x - width / 2 + 2, y - height / 2 + 2, width, height, height / 2);

    // Main pill gradient effect (dark to darker)
    graphics.fillStyle(0x1a1a2e, 0.95);
    graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height, height / 2);

    // Top highlight
    graphics.fillStyle(0x3a3a5e, 0.5);
    graphics.fillRoundedRect(x - width / 2 + 2, y - height / 2 + 2, width - 4, height / 2 - 2, { tl: height / 2 - 2, tr: height / 2 - 2, bl: 0, br: 0 });

    // Border with color tint
    const borderColor = type === 'coin' ? 0xffd700 : 0x00bfff;
    graphics.lineStyle(2, borderColor, 0.6);
    graphics.strokeRoundedRect(x - width / 2, y - height / 2, width, height, height / 2);
  }

  private createLevelCard(): void {
    const { width, height } = this.scale;
    const currentLevel = ProgressStorage.getHighestLevel();
    const cardY = height / 2 - 120;
    const cardWidth = 220;
    const cardHeight = 200;

    const card = this.add.graphics();

    // Outer glow
    card.fillStyle(0x4a90d9, 0.15);
    card.fillRoundedRect(width / 2 - cardWidth / 2 - 6, cardY - cardHeight / 2 - 6, cardWidth + 12, cardHeight + 12, 26);

    // Shadow
    card.fillStyle(0x000000, 0.4);
    card.fillRoundedRect(width / 2 - cardWidth / 2 + 4, cardY - cardHeight / 2 + 4, cardWidth, cardHeight, 20);

    // Main card background (gradient simulation)
    card.fillStyle(0x1e2a3a, 0.98);
    card.fillRoundedRect(width / 2 - cardWidth / 2, cardY - cardHeight / 2, cardWidth, cardHeight, 20);

    // Inner border
    card.lineStyle(2, 0x4a90d9, 0.8);
    card.strokeRoundedRect(width / 2 - cardWidth / 2, cardY - cardHeight / 2, cardWidth, cardHeight, 20);

    // "LEVEL" label with decorative lines
    const labelY = cardY - 60;
    card.lineStyle(1, 0x6ab0f9, 0.5);
    card.lineBetween(width / 2 - 60, labelY, width / 2 - 35, labelY);
    card.lineBetween(width / 2 + 35, labelY, width / 2 + 60, labelY);

    this.add.text(width / 2, labelY, 'LEVEL', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#8ab4d9',
      letterSpacing: 4,
    }).setOrigin(0.5);

    // Level number with glow effect
    const levelText = this.add.text(width / 2, cardY - 20, currentLevel.toString(), {
      fontSize: '52px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#4a90d9',
      strokeThickness: 2,
    }).setOrigin(0.5);

    // Subtle pulse on level number
    this.tweens.add({
      targets: levelText,
      alpha: 0.9,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Play button with premium look
    const playBtnY = cardY + 55;
    const btnWidth = 160;
    const btnHeight = 52;

    const playBtnGraphics = this.add.graphics();

    // Button shadow
    playBtnGraphics.fillStyle(0x000000, 0.4);
    playBtnGraphics.fillRoundedRect(width / 2 - btnWidth / 2 + 3, playBtnY - btnHeight / 2 + 3, btnWidth, btnHeight, 26);

    // Main button gradient simulation
    playBtnGraphics.fillStyle(0x2d8a2d, 1);
    playBtnGraphics.fillRoundedRect(width / 2 - btnWidth / 2, playBtnY - btnHeight / 2, btnWidth, btnHeight, 26);

    // Top highlight
    playBtnGraphics.fillStyle(0x55cc55, 0.6);
    playBtnGraphics.fillRoundedRect(width / 2 - btnWidth / 2 + 4, playBtnY - btnHeight / 2 + 4, btnWidth - 8, btnHeight / 2 - 4, { tl: 22, tr: 22, bl: 0, br: 0 });

    // Button border
    playBtnGraphics.lineStyle(2, 0x66dd66, 0.9);
    playBtnGraphics.strokeRoundedRect(width / 2 - btnWidth / 2, playBtnY - btnHeight / 2, btnWidth, btnHeight, 26);

    // Interactive overlay
    const playBtn = this.add.rectangle(width / 2, playBtnY, btnWidth, btnHeight, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    playBtn.on('pointerover', () => {
      playBtnGraphics.clear();
      playBtnGraphics.fillStyle(0x000000, 0.4);
      playBtnGraphics.fillRoundedRect(width / 2 - btnWidth / 2 + 3, playBtnY - btnHeight / 2 + 3, btnWidth, btnHeight, 26);
      playBtnGraphics.fillStyle(0x3a9a3a, 1);
      playBtnGraphics.fillRoundedRect(width / 2 - btnWidth / 2, playBtnY - btnHeight / 2, btnWidth, btnHeight, 26);
      playBtnGraphics.fillStyle(0x66dd66, 0.6);
      playBtnGraphics.fillRoundedRect(width / 2 - btnWidth / 2 + 4, playBtnY - btnHeight / 2 + 4, btnWidth - 8, btnHeight / 2 - 4, { tl: 22, tr: 22, bl: 0, br: 0 });
      playBtnGraphics.lineStyle(2, 0x88ff88, 0.9);
      playBtnGraphics.strokeRoundedRect(width / 2 - btnWidth / 2, playBtnY - btnHeight / 2, btnWidth, btnHeight, 26);
    });

    playBtn.on('pointerout', () => {
      playBtnGraphics.clear();
      playBtnGraphics.fillStyle(0x000000, 0.4);
      playBtnGraphics.fillRoundedRect(width / 2 - btnWidth / 2 + 3, playBtnY - btnHeight / 2 + 3, btnWidth, btnHeight, 26);
      playBtnGraphics.fillStyle(0x2d8a2d, 1);
      playBtnGraphics.fillRoundedRect(width / 2 - btnWidth / 2, playBtnY - btnHeight / 2, btnWidth, btnHeight, 26);
      playBtnGraphics.fillStyle(0x55cc55, 0.6);
      playBtnGraphics.fillRoundedRect(width / 2 - btnWidth / 2 + 4, playBtnY - btnHeight / 2 + 4, btnWidth - 8, btnHeight / 2 - 4, { tl: 22, tr: 22, bl: 0, br: 0 });
      playBtnGraphics.lineStyle(2, 0x66dd66, 0.9);
      playBtnGraphics.strokeRoundedRect(width / 2 - btnWidth / 2, playBtnY - btnHeight / 2, btnWidth, btnHeight, 26);
    });

    playBtn.on('pointerdown', () => this.startCurrentLevel());

    const playText = this.add.text(width / 2, playBtnY, 'PLAY', {
      fontSize: '24px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#1a5a1a',
      strokeThickness: 2,
    }).setOrigin(0.5);

    // Pulsing animation for the whole button area
    this.tweens.add({
      targets: [playBtn, playText],
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createLeftTabs(): void {
    const { height } = this.scale;
    const tabX = 45;
    const tabSize = 52;
    const spacing = 8;

    // Position tabs on the left side, below the level card
    const levelCardBottom = height / 2 - 120 + 100; // cardY + cardHeight/2
    const topBound = levelCardBottom + 30;
    const bottomBound = height - this.getBottomShowcasePadding() - 80;

    const totalHeight = 4 * tabSize + 3 * spacing;
    const usableHeight = Math.max(0, bottomBound - topBound);
    const startY = topBound + Math.max(0, Math.floor((usableHeight - totalHeight) / 2));

    const rotation = getMiniGameRotation();
    const timeLeft = rotation.getTimeUntilRotation();
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const daysLeft = Math.floor(hoursLeft / 24);
    const remainingHours = hoursLeft % 24;
    const timerText = daysLeft > 0 ? `${daysLeft}d` : `${remainingHours}h`;

    const eventManager = getProgressionEventManager();
    const hasRewards = eventManager.getAvailableCheckpoints().length > 0;

    // Create icon-based tabs (square with icon and small label below)
    this.createIconTab(tabX, startY + 0 * (tabSize + spacing), tabSize, '🛒', 'Shop', null, () => {
      this.scene.start('ShopScene');
    });

    this.createIconTab(tabX, startY + 1 * (tabSize + spacing), tabSize, '🎮', 'Games', timerText, () => {
      this.scene.start('MiniGameHubScene');
    });

    this.createIconTab(tabX, startY + 2 * (tabSize + spacing), tabSize, '⚡', 'Event', hasRewards ? '!' : null, () => {
      this.showEventProgress();
    }, hasRewards);

    this.createIconTab(tabX, startY + 3 * (tabSize + spacing), tabSize, '📋', 'Levels', null, () => {
      this.scene.start('ReplayLevelsScene');
    });

    // Settings button at bottom left
    const gearY = height - 50;
    this.createSettingsButton(tabX, gearY);

    // Reset button (dev only)
    const resetBtn = this.add.text(16, height - 16, 'Reset', {
      fontSize: '10px',
      color: '#333333',
    }).setOrigin(0, 1)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        ProgressStorage.reset();
        MetaStorage.reset();
        this.scene.restart();
      })
      .on('pointerover', () => resetBtn.setColor('#ff6666'))
      .on('pointerout', () => resetBtn.setColor('#333333'));
  }

  private createIconTab(
    x: number,
    y: number,
    size: number,
    icon: string,
    label: string,
    badge: string | null,
    onClick: () => void,
    hasNotification: boolean = false
  ): void {
    const graphics = this.add.graphics();

    // Shadow
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillRoundedRect(x - size / 2 + 2, y - size / 2 + 2, size, size, 12);

    // Main background with gradient effect
    graphics.fillStyle(0x1a1a2e, 0.95);
    graphics.fillRoundedRect(x - size / 2, y - size / 2, size, size, 12);

    // Top highlight
    graphics.fillStyle(0x3a3a5e, 0.4);
    graphics.fillRoundedRect(x - size / 2 + 3, y - size / 2 + 3, size - 6, size / 2 - 4, { tl: 9, tr: 9, bl: 0, br: 0 });

    // Border
    graphics.lineStyle(1.5, 0x4a6a8a, 0.7);
    graphics.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 12);

    // Interactive area
    this.add.rectangle(x, y, size, size, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        graphics.clear();
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillRoundedRect(x - size / 2 + 2, y - size / 2 + 2, size, size, 12);
        graphics.fillStyle(0x2a2a4e, 0.95);
        graphics.fillRoundedRect(x - size / 2, y - size / 2, size, size, 12);
        graphics.fillStyle(0x4a4a6e, 0.5);
        graphics.fillRoundedRect(x - size / 2 + 3, y - size / 2 + 3, size - 6, size / 2 - 4, { tl: 9, tr: 9, bl: 0, br: 0 });
        graphics.lineStyle(1.5, 0x6a8aaa, 0.9);
        graphics.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 12);
      })
      .on('pointerout', () => {
        graphics.clear();
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillRoundedRect(x - size / 2 + 2, y - size / 2 + 2, size, size, 12);
        graphics.fillStyle(0x1a1a2e, 0.95);
        graphics.fillRoundedRect(x - size / 2, y - size / 2, size, size, 12);
        graphics.fillStyle(0x3a3a5e, 0.4);
        graphics.fillRoundedRect(x - size / 2 + 3, y - size / 2 + 3, size - 6, size / 2 - 4, { tl: 9, tr: 9, bl: 0, br: 0 });
        graphics.lineStyle(1.5, 0x4a6a8a, 0.7);
        graphics.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 12);
      })
      .on('pointerdown', onClick);

    // Icon
    this.add.text(x, y - 6, icon, {
      fontSize: '20px',
    }).setOrigin(0.5);

    // Label below icon
    this.add.text(x, y + 16, label, {
      fontSize: '9px',
      fontFamily: 'Arial',
      color: '#aabbcc',
    }).setOrigin(0.5);

    // Badge (timer or notification)
    if (badge) {
      const badgeColor = hasNotification ? 0xff4444 : 0x4a90d9;
      const badgeWidth = hasNotification ? 16 : Math.max(24, badge.length * 6 + 8);
      const badgeX = x + size / 2 - badgeWidth / 2 + 2;
      const badgeY = y - size / 2 + 8;

      this.add.graphics()
        .fillStyle(badgeColor, 1)
        .fillRoundedRect(badgeX - badgeWidth / 2, badgeY - 8, badgeWidth, 14, 7);

      this.add.text(badgeX, badgeY, badge, {
        fontSize: '9px',
        fontFamily: 'Arial Bold',
        color: '#ffffff',
      }).setOrigin(0.5);
    }
  }

  private createSettingsButton(x: number, y: number): void {
    const size = 40;
    const graphics = this.add.graphics();

    graphics.fillStyle(0x1a1a2e, 0.8);
    graphics.fillCircle(x, y, size / 2);
    graphics.lineStyle(1.5, 0x4a6a8a, 0.6);
    graphics.strokeCircle(x, y, size / 2);

    this.add.circle(x, y, size / 2, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        graphics.clear();
        graphics.fillStyle(0x2a2a4e, 0.9);
        graphics.fillCircle(x, y, size / 2);
        graphics.lineStyle(1.5, 0x6a8aaa, 0.8);
        graphics.strokeCircle(x, y, size / 2);
      })
      .on('pointerout', () => {
        graphics.clear();
        graphics.fillStyle(0x1a1a2e, 0.8);
        graphics.fillCircle(x, y, size / 2);
        graphics.lineStyle(1.5, 0x4a6a8a, 0.6);
        graphics.strokeCircle(x, y, size / 2);
      })
      .on('pointerdown', () => this.showSettings());

    this.add.text(x, y, '⚙️', {
      fontSize: '18px',
    }).setOrigin(0.5);
  }

  private startCurrentLevel(): void {
    const currentLevel = ProgressStorage.getHighestLevel();
    this.scene.start('PreLevelScene', { levelId: currentLevel, returnScene: 'TitleScene' });
  }

  private checkDailyLogin(): void {
    const currencyManager = getCurrencyManager();
    const bonus = currencyManager.checkDailyLogin();

    if (bonus) {
      this.time.delayedCall(500, () => {
        this.showDailyLoginBonus(bonus.coins, bonus.diamonds);
      });
    }
  }

  private showDailyLoginBonus(coins: number, diamonds: number): void {
    const { width, height } = this.scale;

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setInteractive();

    const panel = this.add.rectangle(width / 2, height / 2, 280, 200, 0x2a2a3e)
      .setStrokeStyle(3, 0x4a90d9);

    const title = this.add.text(width / 2, height / 2 - 70, 'Daily Bonus!', {
      fontSize: '28px',
      fontFamily: 'Arial Black',
      color: '#ffd700',
    }).setOrigin(0.5);

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

  private updateCurrencyDisplay(): void {
    const currencyManager = getCurrencyManager();
    this.coinsText.setText(currencyManager.formatCoins(currencyManager.getCoins()));
    this.diamondsText.setText(currencyManager.getDiamonds().toString());
  }

  private showCurrencyEarnedAnimation(earnedCoins: number, earnedDiamonds: number): void {
    const currencyManager = getCurrencyManager();
    const { width, height } = this.scale;

    // Starting point for the floating icons (center of screen, slightly below)
    const startY = height / 2;

    // Animate coins if earned
    if (earnedCoins > 0) {
      // Create floating +coins text
      const plusCoinsText = this.add.text(width / 2 - 40, startY, `+${earnedCoins}`, {
        fontSize: '28px',
        fontFamily: 'Arial Black',
        color: '#ffd700',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(100);

      // Create a small coin icon that will fly to the currency bar
      const coinIcon = this.add.circle(width / 2 - 40, startY - 30, 12, 0xffd700).setDepth(100);
      const coinInner = this.add.circle(width / 2 - 40, startY - 30, 8, 0xffec8b).setDepth(101);

      // Animate the plus text floating up and fading
      this.tweens.add({
        targets: plusCoinsText,
        y: startY - 80,
        alpha: 0,
        duration: 1500,
        ease: 'Power2',
        onComplete: () => plusCoinsText.destroy(),
      });

      // Animate coin icon flying to the currency bar
      this.tweens.add({
        targets: [coinIcon, coinInner],
        x: this.coinsPillX,
        y: this.barY,
        scale: 0.5,
        duration: 800,
        ease: 'Power2',
        delay: 200,
        onComplete: () => {
          coinIcon.destroy();
          coinInner.destroy();

          // Flash the coins text green and animate the count
          this.animateCurrencyCountUp(
            this.coinsText,
            currencyManager.getCoins() - earnedCoins,
            currencyManager.getCoins(),
            true
          );
        },
      });
    }

    // Animate diamonds if earned
    if (earnedDiamonds > 0) {
      // Create floating +diamonds text
      const plusDiamondsText = this.add.text(width / 2 + 40, startY, `+${earnedDiamonds}`, {
        fontSize: '28px',
        fontFamily: 'Arial Black',
        color: '#00bfff',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(100);

      // Create a small diamond icon that will fly to the currency bar
      const diamondGraphics = this.add.graphics().setDepth(100);
      const diamondX = width / 2 + 40;
      const diamondY = startY - 30;
      diamondGraphics.fillStyle(0x00bfff, 1);
      diamondGraphics.fillTriangle(diamondX, diamondY - 10, diamondX + 8, diamondY, diamondX, diamondY + 10);
      diamondGraphics.fillTriangle(diamondX, diamondY - 10, diamondX - 8, diamondY, diamondX, diamondY + 10);

      // Animate the plus text floating up and fading
      this.tweens.add({
        targets: plusDiamondsText,
        y: startY - 80,
        alpha: 0,
        duration: 1500,
        ease: 'Power2',
        onComplete: () => plusDiamondsText.destroy(),
      });

      // Animate diamond icon flying to the currency bar
      // Since graphics can't be tweened directly, we'll use a container
      const diamondContainer = this.add.container(diamondX, diamondY).setDepth(100);
      // Recreate diamond in container at origin
      const dg = this.add.graphics();
      dg.fillStyle(0x00bfff, 1);
      dg.fillTriangle(0, -10, 8, 0, 0, 10);
      dg.fillTriangle(0, -10, -8, 0, 0, 10);
      diamondContainer.add(dg);
      diamondGraphics.destroy();

      this.tweens.add({
        targets: diamondContainer,
        x: this.diamondsPillX,
        y: this.barY,
        scale: 0.5,
        duration: 800,
        ease: 'Power2',
        delay: 200,
        onComplete: () => {
          diamondContainer.destroy();

          // Flash the diamonds text green and animate the count
          this.animateCurrencyCountUp(
            this.diamondsText,
            currencyManager.getDiamonds() - earnedDiamonds,
            currencyManager.getDiamonds(),
            false
          );
        },
      });
    }
  }

  private animateCurrencyCountUp(
    textObj: Phaser.GameObjects.Text,
    fromValue: number,
    toValue: number,
    isCoins: boolean
  ): void {
    const currencyManager = getCurrencyManager();
    const duration = 600;
    const originalColor = '#ffffff';
    const flashColor = '#44ff44';

    // Flash green
    textObj.setColor(flashColor);

    // Pulse animation
    this.tweens.add({
      targets: textObj,
      scale: 1.3,
      duration: 150,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    // Count up animation
    const startTime = this.time.now;
    const countUpEvent = this.time.addEvent({
      delay: 16, // ~60fps
      callback: () => {
        const elapsed = this.time.now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        const currentValue = Math.round(fromValue + (toValue - fromValue) * easeProgress);

        if (isCoins) {
          textObj.setText(currencyManager.formatCoins(currentValue));
        } else {
          textObj.setText(currentValue.toString());
        }

        if (progress >= 1) {
          countUpEvent.destroy();
          // Restore original color after a brief delay
          this.time.delayedCall(300, () => {
            textObj.setColor(originalColor);
          });
        }
      },
      loop: true,
    });
  }

  private showEventProgress(): void {
    const { width, height } = this.scale;
    const eventManager = getProgressionEventManager();
    const event = eventManager.getCurrentEvent();
    const points = eventManager.getPoints();
    const claimed = eventManager.getClaimedCheckpoints();

    const allElements: Phaser.GameObjects.GameObject[] = [];

    // Overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
      .setInteractive();
    allElements.push(overlay);

    const panelWidth = width - 32;
    const panelHeight = 420;
    const panelY = height / 2;

    // Panel shadow
    const panelShadow = this.add.graphics();
    panelShadow.fillStyle(0x000000, 0.5);
    panelShadow.fillRoundedRect(width / 2 - panelWidth / 2 + 4, panelY - panelHeight / 2 + 4, panelWidth, panelHeight, 16);
    allElements.push(panelShadow);

    // Panel background
    const panelGraphics = this.add.graphics();
    panelGraphics.fillStyle(0x1e2a3a, 0.98);
    panelGraphics.fillRoundedRect(width / 2 - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 16);
    // Top gradient highlight
    panelGraphics.fillStyle(0x3a5a7e, 0.3);
    panelGraphics.fillRoundedRect(width / 2 - panelWidth / 2 + 4, panelY - panelHeight / 2 + 4, panelWidth - 8, 50, { tl: 12, tr: 12, bl: 0, br: 0 });
    // Border
    panelGraphics.lineStyle(2, 0x4a90d9, 0.9);
    panelGraphics.strokeRoundedRect(width / 2 - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 16);
    allElements.push(panelGraphics);

    // Title with decorative lines
    const titleY = panelY - panelHeight / 2 + 35;
    panelGraphics.lineStyle(1, 0xffd700, 0.4);
    panelGraphics.lineBetween(width / 2 - 100, titleY, width / 2 - 60, titleY);
    panelGraphics.lineBetween(width / 2 + 60, titleY, width / 2 + 100, titleY);

    const title = this.add.text(width / 2, titleY, event.name, {
      fontSize: '22px',
      fontFamily: 'Arial Black',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    allElements.push(title);

    // Points display with styled pill
    const pointsPillY = panelY - panelHeight / 2 + 72;
    const pointsPillWidth = 140;
    const pointsPill = this.add.graphics();
    pointsPill.fillStyle(0x2a3a4e, 1);
    pointsPill.fillRoundedRect(width / 2 - pointsPillWidth / 2, pointsPillY - 14, pointsPillWidth, 28, 14);
    pointsPill.lineStyle(2, 0x4a90d9, 0.7);
    pointsPill.strokeRoundedRect(width / 2 - pointsPillWidth / 2, pointsPillY - 14, pointsPillWidth, 28, 14);
    allElements.push(pointsPill);

    const pointsText = this.add.text(width / 2, pointsPillY, `${points} Points`, {
      fontSize: '16px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
    }).setOrigin(0.5);
    allElements.push(pointsText);

    // Info button with tooltip functionality
    const infoX = width / 2 + pointsPillWidth / 2 + 20;
    const infoBg = this.add.circle(infoX, pointsPillY, 14, 0x3a5a7e)
      .setStrokeStyle(2, 0x6ab0f9);
    allElements.push(infoBg);

    const infoIcon = this.add.text(infoX, pointsPillY, 'i', {
      fontSize: '14px',
      fontFamily: 'Georgia',
      fontStyle: 'italic',
      color: '#ffffff',
    }).setOrigin(0.5);
    allElements.push(infoIcon);

    // Info tooltip (initially hidden)
    const tooltipWidth = 200;
    const tooltipHeight = 80;
    const tooltipX = width / 2;
    const tooltipY = pointsPillY + 55;

    const tooltipContainer = this.add.container(tooltipX, tooltipY);
    tooltipContainer.setAlpha(0);
    allElements.push(tooltipContainer);

    const tooltipBg = this.add.graphics();
    tooltipBg.fillStyle(0x2a3a4e, 0.98);
    tooltipBg.fillRoundedRect(-tooltipWidth / 2, -tooltipHeight / 2, tooltipWidth, tooltipHeight, 10);
    tooltipBg.lineStyle(1.5, 0x6ab0f9, 0.8);
    tooltipBg.strokeRoundedRect(-tooltipWidth / 2, -tooltipHeight / 2, tooltipWidth, tooltipHeight, 10);
    // Arrow pointing up
    tooltipBg.fillStyle(0x2a3a4e, 0.98);
    tooltipBg.fillTriangle(0, -tooltipHeight / 2 - 8, -8, -tooltipHeight / 2, 8, -tooltipHeight / 2);
    tooltipContainer.add(tooltipBg);

    const tooltipTitle = this.add.text(0, -tooltipHeight / 2 + 15, 'How to earn points:', {
      fontSize: '11px',
      fontFamily: 'Arial Bold',
      color: '#6ab0f9',
    }).setOrigin(0.5);
    tooltipContainer.add(tooltipTitle);

    const tooltipText = this.add.text(0, 5, '• Complete levels: +100 pts\n• 3 Stars: +50 bonus pts\n• Replay levels: +25 pts', {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: '#cccccc',
      lineSpacing: 3,
    }).setOrigin(0.5);
    tooltipContainer.add(tooltipText);

    // Make info button interactive
    infoBg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        infoBg.setFillStyle(0x4a7a9e);
        this.tweens.add({
          targets: tooltipContainer,
          alpha: 1,
          duration: 200,
        });
      })
      .on('pointerout', () => {
        infoBg.setFillStyle(0x3a5a7e);
        this.tweens.add({
          targets: tooltipContainer,
          alpha: 0,
          duration: 200,
        });
      });

    // Checkpoints section
    const checkpointStartY = panelY - panelHeight / 2 + 145;
    const barWidth = panelWidth - 40;
    const barHeight = 40;
    const barSpacing = 48;

    event.checkpoints.forEach((checkpoint, index) => {
      const y = checkpointStartY + index * barSpacing;
      const isReached = points >= checkpoint.pointsRequired;
      const isClaimed = claimed.includes(index);

      // Checkpoint bar with gradient effect
      const barGraphics = this.add.graphics();

      // Shadow
      barGraphics.fillStyle(0x000000, 0.3);
      barGraphics.fillRoundedRect(width / 2 - barWidth / 2 + 2, y - barHeight / 2 + 2, barWidth, barHeight, 8);

      // Main bar
      const barColor = isClaimed ? 0x2a4a2a : (isReached ? 0x3a7a3a : 0x2a3a4e);
      barGraphics.fillStyle(barColor, 1);
      barGraphics.fillRoundedRect(width / 2 - barWidth / 2, y - barHeight / 2, barWidth, barHeight, 8);

      // Top highlight
      barGraphics.fillStyle(isReached ? 0x5aaa5a : 0x4a5a6e, 0.3);
      barGraphics.fillRoundedRect(width / 2 - barWidth / 2 + 2, y - barHeight / 2 + 2, barWidth - 4, barHeight / 2 - 2, { tl: 6, tr: 6, bl: 0, br: 0 });

      // Border
      const borderColor = isClaimed ? 0x44aa44 : (isReached ? 0x66cc66 : 0x4a6a8a);
      barGraphics.lineStyle(1.5, borderColor, 0.8);
      barGraphics.strokeRoundedRect(width / 2 - barWidth / 2, y - barHeight / 2, barWidth, barHeight, 8);
      allElements.push(barGraphics);

      // Reward icon
      const rewardIcon = this.add.text(width / 2 - barWidth / 2 + 25, y, checkpoint.label.includes('Coins') ? '💰' : '💎', {
        fontSize: '18px',
      }).setOrigin(0.5);
      allElements.push(rewardIcon);

      // Label
      const label = this.add.text(width / 2 - barWidth / 2 + 50, y, checkpoint.label, {
        fontSize: '13px',
        fontFamily: 'Arial Bold',
        color: isReached ? '#ffffff' : '#999999',
      }).setOrigin(0, 0.5);
      allElements.push(label);

      // Points required badge
      const reqBadgeWidth = 55;
      const reqBadgeX = width / 2 + barWidth / 2 - 85;
      const reqBadge = this.add.graphics();
      reqBadge.fillStyle(0x1a2a3a, 0.9);
      reqBadge.fillRoundedRect(reqBadgeX - reqBadgeWidth / 2, y - 10, reqBadgeWidth, 20, 10);
      allElements.push(reqBadge);

      const req = this.add.text(reqBadgeX, y, `${checkpoint.pointsRequired}`, {
        fontSize: '11px',
        fontFamily: 'Arial Bold',
        color: '#8ab4d9',
      }).setOrigin(0.5);
      allElements.push(req);

      // Claim button or checkmark
      if (isReached && !isClaimed) {
        const claimBtnGraphics = this.add.graphics();
        const claimBtnX = width / 2 + barWidth / 2 - 30;

        // Button shadow
        claimBtnGraphics.fillStyle(0x000000, 0.3);
        claimBtnGraphics.fillRoundedRect(claimBtnX - 22 + 2, y - 14 + 2, 44, 28, 6);

        // Button background
        claimBtnGraphics.fillStyle(0xdd8800, 1);
        claimBtnGraphics.fillRoundedRect(claimBtnX - 22, y - 14, 44, 28, 6);

        // Top highlight
        claimBtnGraphics.fillStyle(0xffaa33, 0.6);
        claimBtnGraphics.fillRoundedRect(claimBtnX - 20, y - 12, 40, 10, { tl: 4, tr: 4, bl: 0, br: 0 });
        allElements.push(claimBtnGraphics);

        const claimBtn = this.add.rectangle(claimBtnX, y, 44, 28, 0x000000, 0)
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => {
            claimBtnGraphics.clear();
            claimBtnGraphics.fillStyle(0x000000, 0.3);
            claimBtnGraphics.fillRoundedRect(claimBtnX - 22 + 2, y - 14 + 2, 44, 28, 6);
            claimBtnGraphics.fillStyle(0xeeaa22, 1);
            claimBtnGraphics.fillRoundedRect(claimBtnX - 22, y - 14, 44, 28, 6);
            claimBtnGraphics.fillStyle(0xffcc55, 0.6);
            claimBtnGraphics.fillRoundedRect(claimBtnX - 20, y - 12, 40, 10, { tl: 4, tr: 4, bl: 0, br: 0 });
          })
          .on('pointerout', () => {
            claimBtnGraphics.clear();
            claimBtnGraphics.fillStyle(0x000000, 0.3);
            claimBtnGraphics.fillRoundedRect(claimBtnX - 22 + 2, y - 14 + 2, 44, 28, 6);
            claimBtnGraphics.fillStyle(0xdd8800, 1);
            claimBtnGraphics.fillRoundedRect(claimBtnX - 22, y - 14, 44, 28, 6);
            claimBtnGraphics.fillStyle(0xffaa33, 0.6);
            claimBtnGraphics.fillRoundedRect(claimBtnX - 20, y - 12, 40, 10, { tl: 4, tr: 4, bl: 0, br: 0 });
          })
          .on('pointerdown', () => {
            eventManager.claimCheckpoint(index);
            this.updateCurrencyDisplay();
            allElements.forEach(o => o.destroy());
            this.showEventProgress();
          });
        allElements.push(claimBtn);

        const claimText = this.add.text(claimBtnX, y, 'GET', {
          fontSize: '11px',
          fontFamily: 'Arial Black',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 1,
        }).setOrigin(0.5);
        allElements.push(claimText);
      } else if (isClaimed) {
        const checkCircle = this.add.circle(width / 2 + barWidth / 2 - 30, y, 14, 0x44aa44)
          .setStrokeStyle(2, 0x66cc66);
        allElements.push(checkCircle);

        const check = this.add.text(width / 2 + barWidth / 2 - 30, y, '✓', {
          fontSize: '16px',
          fontFamily: 'Arial Bold',
          color: '#ffffff',
        }).setOrigin(0.5);
        allElements.push(check);
      } else {
        // Locked indicator
        const lockIcon = this.add.text(width / 2 + barWidth / 2 - 30, y, '🔒', {
          fontSize: '14px',
        }).setOrigin(0.5).setAlpha(0.5);
        allElements.push(lockIcon);
      }
    });

    // Close button - positioned with proper spacing
    const closeBtnY = panelY + panelHeight / 2 - 30;
    const closeBtnWidth = 120;
    const closeBtnHeight = 42;

    const closeBtnGraphics = this.add.graphics();
    // Shadow
    closeBtnGraphics.fillStyle(0x000000, 0.4);
    closeBtnGraphics.fillRoundedRect(width / 2 - closeBtnWidth / 2 + 2, closeBtnY - closeBtnHeight / 2 + 2, closeBtnWidth, closeBtnHeight, 21);
    // Main button
    closeBtnGraphics.fillStyle(0x3a4a5e, 1);
    closeBtnGraphics.fillRoundedRect(width / 2 - closeBtnWidth / 2, closeBtnY - closeBtnHeight / 2, closeBtnWidth, closeBtnHeight, 21);
    // Top highlight
    closeBtnGraphics.fillStyle(0x5a6a7e, 0.4);
    closeBtnGraphics.fillRoundedRect(width / 2 - closeBtnWidth / 2 + 3, closeBtnY - closeBtnHeight / 2 + 3, closeBtnWidth - 6, closeBtnHeight / 2 - 3, { tl: 18, tr: 18, bl: 0, br: 0 });
    // Border
    closeBtnGraphics.lineStyle(1.5, 0x6a8aaa, 0.7);
    closeBtnGraphics.strokeRoundedRect(width / 2 - closeBtnWidth / 2, closeBtnY - closeBtnHeight / 2, closeBtnWidth, closeBtnHeight, 21);
    allElements.push(closeBtnGraphics);

    const closeBtn = this.add.rectangle(width / 2, closeBtnY, closeBtnWidth, closeBtnHeight, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        closeBtnGraphics.clear();
        closeBtnGraphics.fillStyle(0x000000, 0.4);
        closeBtnGraphics.fillRoundedRect(width / 2 - closeBtnWidth / 2 + 2, closeBtnY - closeBtnHeight / 2 + 2, closeBtnWidth, closeBtnHeight, 21);
        closeBtnGraphics.fillStyle(0x4a5a6e, 1);
        closeBtnGraphics.fillRoundedRect(width / 2 - closeBtnWidth / 2, closeBtnY - closeBtnHeight / 2, closeBtnWidth, closeBtnHeight, 21);
        closeBtnGraphics.fillStyle(0x6a7a8e, 0.5);
        closeBtnGraphics.fillRoundedRect(width / 2 - closeBtnWidth / 2 + 3, closeBtnY - closeBtnHeight / 2 + 3, closeBtnWidth - 6, closeBtnHeight / 2 - 3, { tl: 18, tr: 18, bl: 0, br: 0 });
        closeBtnGraphics.lineStyle(1.5, 0x8aaacc, 0.9);
        closeBtnGraphics.strokeRoundedRect(width / 2 - closeBtnWidth / 2, closeBtnY - closeBtnHeight / 2, closeBtnWidth, closeBtnHeight, 21);
      })
      .on('pointerout', () => {
        closeBtnGraphics.clear();
        closeBtnGraphics.fillStyle(0x000000, 0.4);
        closeBtnGraphics.fillRoundedRect(width / 2 - closeBtnWidth / 2 + 2, closeBtnY - closeBtnHeight / 2 + 2, closeBtnWidth, closeBtnHeight, 21);
        closeBtnGraphics.fillStyle(0x3a4a5e, 1);
        closeBtnGraphics.fillRoundedRect(width / 2 - closeBtnWidth / 2, closeBtnY - closeBtnHeight / 2, closeBtnWidth, closeBtnHeight, 21);
        closeBtnGraphics.fillStyle(0x5a6a7e, 0.4);
        closeBtnGraphics.fillRoundedRect(width / 2 - closeBtnWidth / 2 + 3, closeBtnY - closeBtnHeight / 2 + 3, closeBtnWidth - 6, closeBtnHeight / 2 - 3, { tl: 18, tr: 18, bl: 0, br: 0 });
        closeBtnGraphics.lineStyle(1.5, 0x6a8aaa, 0.7);
        closeBtnGraphics.strokeRoundedRect(width / 2 - closeBtnWidth / 2, closeBtnY - closeBtnHeight / 2, closeBtnWidth, closeBtnHeight, 21);
      })
      .on('pointerdown', () => {
        allElements.forEach(o => o.destroy());
      });
    allElements.push(closeBtn);

    const closeText = this.add.text(width / 2, closeBtnY, 'Close', {
      fontSize: '16px',
      fontFamily: 'Arial Bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    allElements.push(closeText);
  }

  private showSettings(): void {
    const { width, height } = this.scale;

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setInteractive();

    const panel = this.add.rectangle(width / 2, height / 2, 250, 150, 0x2a2a3e)
      .setStrokeStyle(3, 0x4a90d9);

    const title = this.add.text(width / 2, height / 2 - 50, 'Settings', {
      fontSize: '24px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
    }).setOrigin(0.5);

    const comingSoon = this.add.text(width / 2, height / 2, 'Coming soon...', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#888888',
    }).setOrigin(0.5);

    const closeBtn = this.add.rectangle(width / 2, height / 2 + 45, 80, 30, 0x4a4a5e)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        overlay.destroy();
        panel.destroy();
        title.destroy();
        comingSoon.destroy();
        closeBtn.destroy();
        closeText.destroy();
      });

    const closeText = this.add.text(width / 2, height / 2 + 45, 'Close', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
  }
}
