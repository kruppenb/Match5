import Phaser from 'phaser';
import { CONFIG } from '../config';
import { MiniGameConfig } from '../types';
import { getCurrencyManager } from '../meta/CurrencyManager';
import { getMiniGameRotation } from '../meta/MiniGameRotation';

export class MiniGameHubScene extends Phaser.Scene {
  private diamondsText!: Phaser.GameObjects.Text;
  private rotationText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MiniGameHubScene' });
  }

  preload(): void {
    this.load.image('bg_title', 'assets/backgrounds/title_screen.jpg.jpeg');
  }

  create(): void {
    // Background
    this.renderBackground();

    // Header
    this.createHeader();

    // Rotation timer
    this.createRotationTimer();

    // Available games
    this.createGameCards();

    // Back button
    this.createBackButton();

    // Update timer every second
    this.time.addEvent({
      delay: 60000,
      callback: this.updateRotationTimer,
      callbackScope: this,
      loop: true,
    });
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
      this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5).setDepth(-9);
    } else {
      this.add.rectangle(width / 2, height / 2, width, height, CONFIG.UI.COLORS.BACKGROUND);
    }
  }

  private createHeader(): void {
    const { width } = this.scale;
    const currencyManager = getCurrencyManager();

    // Header panel with gradient effect
    const headerGraphics = this.add.graphics();
    headerGraphics.fillStyle(0x1a1a2e, 0.9);
    headerGraphics.fillRect(0, 0, width, 70);
    headerGraphics.fillStyle(0x3a3a5e, 0.3);
    headerGraphics.fillRect(0, 0, width, 35);
    headerGraphics.lineStyle(1, 0x4a6a8a, 0.5);
    headerGraphics.lineBetween(0, 70, width, 70);

    // Title centered
    this.add.text(width / 2, 25, 'MINI GAMES', {
      fontSize: '26px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Diamonds display with styled pill
    const diamondPillX = width / 2;
    const diamondPillY = 52;
    const pillWidth = 100;
    const pillHeight = 28;

    const pillGraphics = this.add.graphics();
    pillGraphics.fillStyle(0x000000, 0.3);
    pillGraphics.fillRoundedRect(diamondPillX - pillWidth / 2 + 2, diamondPillY - pillHeight / 2 + 2, pillWidth, pillHeight, pillHeight / 2);
    pillGraphics.fillStyle(0x1a1a2e, 0.95);
    pillGraphics.fillRoundedRect(diamondPillX - pillWidth / 2, diamondPillY - pillHeight / 2, pillWidth, pillHeight, pillHeight / 2);
    pillGraphics.lineStyle(2, 0x00bfff, 0.6);
    pillGraphics.strokeRoundedRect(diamondPillX - pillWidth / 2, diamondPillY - pillHeight / 2, pillWidth, pillHeight, pillHeight / 2);

    // Diamond icon
    const dg = this.add.graphics();
    const iconX = diamondPillX - 25;
    dg.fillStyle(0x00bfff, 1);
    dg.fillTriangle(iconX, diamondPillY - 8, iconX + 6, diamondPillY, iconX, diamondPillY + 8);
    dg.fillTriangle(iconX, diamondPillY - 8, iconX - 6, diamondPillY, iconX, diamondPillY + 8);
    dg.fillStyle(0x87ceeb, 1);
    dg.fillTriangle(iconX, diamondPillY - 3, iconX + 2, diamondPillY, iconX, diamondPillY + 3);

    this.diamondsText = this.add.text(diamondPillX + 10, diamondPillY, currencyManager.getDiamonds().toString(), {
      fontSize: '16px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1,
    }).setOrigin(0.5);
  }

  private createRotationTimer(): void {
    const { width } = this.scale;
    const rotation = getMiniGameRotation();

    // Timer container with styled background
    const timerY = 100;
    const timerWidth = 180;
    const timerHeight = 36;

    const timerGraphics = this.add.graphics();
    timerGraphics.fillStyle(0x000000, 0.3);
    timerGraphics.fillRoundedRect(width / 2 - timerWidth / 2 + 2, timerY - timerHeight / 2 + 2, timerWidth, timerHeight, 18);
    timerGraphics.fillStyle(0x1e2a3a, 0.9);
    timerGraphics.fillRoundedRect(width / 2 - timerWidth / 2, timerY - timerHeight / 2, timerWidth, timerHeight, 18);
    timerGraphics.lineStyle(1.5, 0xffaa00, 0.5);
    timerGraphics.strokeRoundedRect(width / 2 - timerWidth / 2, timerY - timerHeight / 2, timerWidth, timerHeight, 18);

    this.add.text(width / 2 - 40, timerY, 'Rotates in:', {
      fontSize: '11px',
      fontFamily: 'Arial',
      color: '#aabbcc',
    }).setOrigin(0.5);

    this.rotationText = this.add.text(width / 2 + 40, timerY, rotation.formatTimeUntilRotation(), {
      fontSize: '14px',
      fontFamily: 'Arial Black',
      color: '#ffaa00',
    }).setOrigin(0.5);
  }

  private updateRotationTimer(): void {
    const rotation = getMiniGameRotation();
    this.rotationText.setText(rotation.formatTimeUntilRotation());
  }

  private createGameCards(): void {
    const { width } = this.scale;
    const rotation = getMiniGameRotation();
    const currentGames = rotation.getCurrentGames();

    const cardWidth = width - 32;
    const cardHeight = 140;
    let y = 200;

    currentGames.forEach((game) => {
      this.createGameCard(game, width / 2, y, cardWidth, cardHeight);
      y += cardHeight + 16;
    });

    // Show "Coming Soon" for unavailable game
    const allGames = rotation.getAllGames();
    const unavailableGame = allGames.find(g => !currentGames.some(cg => cg.id === g.id));
    if (unavailableGame) {
      this.createLockedGameCard(unavailableGame, width / 2, y, cardWidth, 100);
    }
  }

  private createGameCard(game: MiniGameConfig, x: number, y: number, cardWidth: number, height: number): void {
    const rotation = getMiniGameRotation();
    const canAfford = rotation.canAfford(game.id);
    const stats = rotation.getGameStats(game.id);

    // Card shadow
    const cardGraphics = this.add.graphics();
    cardGraphics.fillStyle(0x000000, 0.4);
    cardGraphics.fillRoundedRect(x - cardWidth / 2 + 3, y - height / 2 + 3, cardWidth, height, 14);

    // Card background
    cardGraphics.fillStyle(0x1e2a3a, 0.95);
    cardGraphics.fillRoundedRect(x - cardWidth / 2, y - height / 2, cardWidth, height, 14);

    // Top highlight
    cardGraphics.fillStyle(0x3a5a7e, 0.25);
    cardGraphics.fillRoundedRect(x - cardWidth / 2 + 4, y - height / 2 + 4, cardWidth - 8, height / 2 - 6, { tl: 10, tr: 10, bl: 0, br: 0 });

    // Border
    const borderColor = canAfford ? 0x4a90d9 : 0x3a4a5a;
    cardGraphics.lineStyle(2, borderColor, 0.8);
    cardGraphics.strokeRoundedRect(x - cardWidth / 2, y - height / 2, cardWidth, height, 14);

    // Icon container with glow
    const iconX = x - cardWidth / 2 + 55;
    const iconContainerGraphics = this.add.graphics();
    iconContainerGraphics.fillStyle(canAfford ? 0x4a90d9 : 0x3a4a5a, 0.2);
    iconContainerGraphics.fillCircle(iconX, y, 38);
    iconContainerGraphics.fillStyle(0x1a2a3a, 0.9);
    iconContainerGraphics.fillCircle(iconX, y, 32);
    iconContainerGraphics.lineStyle(2, canAfford ? 0x6ab0f9 : 0x4a5a6a, 0.6);
    iconContainerGraphics.strokeCircle(iconX, y, 32);

    this.add.text(iconX, y, this.getGameEmoji(game.id), {
      fontSize: '32px',
    }).setOrigin(0.5);

    // Game name
    const textStartX = x - cardWidth / 2 + 105;
    this.add.text(textStartX, y - 28, game.name, {
      fontSize: '18px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1,
    }).setOrigin(0, 0.5);

    // Description
    this.add.text(textStartX, y + 2, game.description, {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#aabbcc',
      wordWrap: { width: cardWidth - 200 },
    }).setOrigin(0, 0.5);

    // Stats
    this.add.text(textStartX, y + 28, `Played: ${stats.totalPlays} times`, {
      fontSize: '11px',
      fontFamily: 'Arial',
      color: '#6a7a8a',
    }).setOrigin(0, 0.5);

    // Play button
    const btnWidth = 70;
    const btnHeight = 50;
    const btnX = x + cardWidth / 2 - 50;
    const playBtnGraphics = this.add.graphics();

    // Button shadow
    playBtnGraphics.fillStyle(0x000000, 0.3);
    playBtnGraphics.fillRoundedRect(btnX - btnWidth / 2 + 2, y - btnHeight / 2 + 2, btnWidth, btnHeight, 10);

    // Button background
    const btnColor = canAfford ? 0x7722cc : 0x3a4a5a;
    playBtnGraphics.fillStyle(btnColor, 1);
    playBtnGraphics.fillRoundedRect(btnX - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 10);

    // Top highlight
    playBtnGraphics.fillStyle(canAfford ? 0x9944ee : 0x4a5a6a, 0.5);
    playBtnGraphics.fillRoundedRect(btnX - btnWidth / 2 + 3, y - btnHeight / 2 + 3, btnWidth - 6, btnHeight / 2 - 4, { tl: 7, tr: 7, bl: 0, br: 0 });

    // Border
    playBtnGraphics.lineStyle(1.5, canAfford ? 0xaa55ff : 0x5a6a7a, 0.7);
    playBtnGraphics.strokeRoundedRect(btnX - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 10);

    if (canAfford) {
      this.add.rectangle(btnX, y, btnWidth, btnHeight, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          playBtnGraphics.clear();
          playBtnGraphics.fillStyle(0x000000, 0.3);
          playBtnGraphics.fillRoundedRect(btnX - btnWidth / 2 + 2, y - btnHeight / 2 + 2, btnWidth, btnHeight, 10);
          playBtnGraphics.fillStyle(0x8833dd, 1);
          playBtnGraphics.fillRoundedRect(btnX - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 10);
          playBtnGraphics.fillStyle(0xaa55ff, 0.6);
          playBtnGraphics.fillRoundedRect(btnX - btnWidth / 2 + 3, y - btnHeight / 2 + 3, btnWidth - 6, btnHeight / 2 - 4, { tl: 7, tr: 7, bl: 0, br: 0 });
          playBtnGraphics.lineStyle(1.5, 0xbb77ff, 0.9);
          playBtnGraphics.strokeRoundedRect(btnX - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 10);
        })
        .on('pointerout', () => {
          playBtnGraphics.clear();
          playBtnGraphics.fillStyle(0x000000, 0.3);
          playBtnGraphics.fillRoundedRect(btnX - btnWidth / 2 + 2, y - btnHeight / 2 + 2, btnWidth, btnHeight, 10);
          playBtnGraphics.fillStyle(0x7722cc, 1);
          playBtnGraphics.fillRoundedRect(btnX - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 10);
          playBtnGraphics.fillStyle(0x9944ee, 0.5);
          playBtnGraphics.fillRoundedRect(btnX - btnWidth / 2 + 3, y - btnHeight / 2 + 3, btnWidth - 6, btnHeight / 2 - 4, { tl: 7, tr: 7, bl: 0, br: 0 });
          playBtnGraphics.lineStyle(1.5, 0xaa55ff, 0.7);
          playBtnGraphics.strokeRoundedRect(btnX - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 10);
        })
        .on('pointerdown', () => this.playGame(game));
    }

    // Diamond icon and cost
    const dg = this.add.graphics();
    const diamondX = btnX - 12;
    dg.fillStyle(0x00bfff, 1);
    dg.fillTriangle(diamondX, y - 12, diamondX + 5, y - 5, diamondX, y + 2);
    dg.fillTriangle(diamondX, y - 12, diamondX - 5, y - 5, diamondX, y + 2);
    dg.fillStyle(0x87ceeb, 1);
    dg.fillTriangle(diamondX, y - 8, diamondX + 2, y - 5, diamondX, y - 2);

    this.add.text(btnX + 5, y - 5, game.diamondCost.toString(), {
      fontSize: '14px',
      fontFamily: 'Arial Black',
      color: canAfford ? '#ffffff' : '#666666',
    }).setOrigin(0.5);

    this.add.text(btnX, y + 14, 'PLAY', {
      fontSize: '11px',
      fontFamily: 'Arial Black',
      color: canAfford ? '#ffffff' : '#666666',
    }).setOrigin(0.5);
  }

  private createLockedGameCard(game: MiniGameConfig, x: number, y: number, cardWidth: number, height: number): void {
    // Card shadow
    const cardGraphics = this.add.graphics();
    cardGraphics.fillStyle(0x000000, 0.3);
    cardGraphics.fillRoundedRect(x - cardWidth / 2 + 3, y - height / 2 + 3, cardWidth, height, 14);

    // Card background (muted)
    cardGraphics.fillStyle(0x1a2028, 0.9);
    cardGraphics.fillRoundedRect(x - cardWidth / 2, y - height / 2, cardWidth, height, 14);

    // Border
    cardGraphics.lineStyle(1.5, 0x3a4a5a, 0.5);
    cardGraphics.strokeRoundedRect(x - cardWidth / 2, y - height / 2, cardWidth, height, 14);

    // Lock icon container
    const iconX = x - cardWidth / 2 + 55;
    const iconGraphics = this.add.graphics();
    iconGraphics.fillStyle(0x2a3a4a, 0.8);
    iconGraphics.fillCircle(iconX, y, 28);
    iconGraphics.lineStyle(1.5, 0x3a4a5a, 0.5);
    iconGraphics.strokeCircle(iconX, y, 28);

    this.add.text(iconX, y, '🔒', {
      fontSize: '24px',
    }).setOrigin(0.5).setAlpha(0.6);

    // Game name
    const textStartX = x - cardWidth / 2 + 105;
    this.add.text(textStartX, y - 12, game.name, {
      fontSize: '16px',
      fontFamily: 'Arial Black',
      color: '#5a6a7a',
    }).setOrigin(0, 0.5);

    // Coming soon text
    this.add.text(textStartX, y + 12, 'Coming in next rotation!', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#4a5a6a',
    }).setOrigin(0, 0.5);
  }

  private getGameEmoji(gameId: string): string {
    const emojiMap: Record<string, string> = {
      spin_wheel: '🎡',
      treasure_hunt: '💎',
      lucky_match: '🃏',
    };
    return emojiMap[gameId] || '🎮';
  }

  private playGame(game: MiniGameConfig): void {
    const rotation = getMiniGameRotation();

    if (!rotation.playGame(game.id)) {
      this.showNotEnoughDiamonds();
      return;
    }

    // Update diamonds display
    this.diamondsText.setText(getCurrencyManager().getDiamonds().toString());

    // Navigate to specific mini-game scene
    const sceneMap: Record<string, string> = {
      spin_wheel: 'SpinWheelScene',
      treasure_hunt: 'TreasureHuntScene',
      lucky_match: 'LuckyMatchScene',
    };

    const sceneName = sceneMap[game.id];
    if (sceneName) {
      this.scene.start(sceneName);
    }
  }

  private showNotEnoughDiamonds(): void {
    const { width, height } = this.scale;

    const text = this.add.text(width / 2, height / 2, 'Not enough diamonds!', {
      fontSize: '24px',
      fontFamily: 'Arial Black',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      alpha: 0,
      y: height / 2 - 30,
      duration: 1500,
      onComplete: () => text.destroy(),
    });
  }

  private createBackButton(): void {
    const { width, height } = this.scale;
    const btnX = width / 2;
    const btnY = height - 45;
    const btnWidth = 120;
    const btnHeight = 42;

    const btnGraphics = this.add.graphics();

    // Shadow
    btnGraphics.fillStyle(0x000000, 0.4);
    btnGraphics.fillRoundedRect(btnX - btnWidth / 2 + 2, btnY - btnHeight / 2 + 2, btnWidth, btnHeight, 21);

    // Main button
    btnGraphics.fillStyle(0x3a4a5e, 1);
    btnGraphics.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 21);

    // Top highlight
    btnGraphics.fillStyle(0x5a6a7e, 0.4);
    btnGraphics.fillRoundedRect(btnX - btnWidth / 2 + 3, btnY - btnHeight / 2 + 3, btnWidth - 6, btnHeight / 2 - 3, { tl: 18, tr: 18, bl: 0, br: 0 });

    // Border
    btnGraphics.lineStyle(1.5, 0x6a8aaa, 0.7);
    btnGraphics.strokeRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 21);

    this.add.rectangle(btnX, btnY, btnWidth, btnHeight, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        btnGraphics.clear();
        btnGraphics.fillStyle(0x000000, 0.4);
        btnGraphics.fillRoundedRect(btnX - btnWidth / 2 + 2, btnY - btnHeight / 2 + 2, btnWidth, btnHeight, 21);
        btnGraphics.fillStyle(0x4a5a6e, 1);
        btnGraphics.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 21);
        btnGraphics.fillStyle(0x6a7a8e, 0.5);
        btnGraphics.fillRoundedRect(btnX - btnWidth / 2 + 3, btnY - btnHeight / 2 + 3, btnWidth - 6, btnHeight / 2 - 3, { tl: 18, tr: 18, bl: 0, br: 0 });
        btnGraphics.lineStyle(1.5, 0x8aaacc, 0.9);
        btnGraphics.strokeRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 21);
      })
      .on('pointerout', () => {
        btnGraphics.clear();
        btnGraphics.fillStyle(0x000000, 0.4);
        btnGraphics.fillRoundedRect(btnX - btnWidth / 2 + 2, btnY - btnHeight / 2 + 2, btnWidth, btnHeight, 21);
        btnGraphics.fillStyle(0x3a4a5e, 1);
        btnGraphics.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 21);
        btnGraphics.fillStyle(0x5a6a7e, 0.4);
        btnGraphics.fillRoundedRect(btnX - btnWidth / 2 + 3, btnY - btnHeight / 2 + 3, btnWidth - 6, btnHeight / 2 - 3, { tl: 18, tr: 18, bl: 0, br: 0 });
        btnGraphics.lineStyle(1.5, 0x6a8aaa, 0.7);
        btnGraphics.strokeRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 21);
      })
      .on('pointerdown', () => this.scene.start('TitleScene'));

    this.add.text(btnX, btnY, '← Back', {
      fontSize: '16px',
      fontFamily: 'Arial Bold',
      color: '#ffffff',
    }).setOrigin(0.5);
  }
}
