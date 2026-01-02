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

  create(): void {
    const { width, height } = this.scale;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, CONFIG.UI.COLORS.BACKGROUND);

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

  private createHeader(): void {
    const { width } = this.scale;
    const currencyManager = getCurrencyManager();

    // Header panel - reduced height
    this.add.rectangle(width / 2, 40, width, 60, CONFIG.UI.COLORS.PANEL);

    // Title on left side
    this.add.text(20, 40, 'MINI GAMES', {
      fontSize: '24px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
    }).setOrigin(0, 0.5);

    // Diamonds display on right side
    this.add.polygon(width - 75, 40, [[0, -10], [8, 0], [0, 10], [-8, 0]], 0x00bfff);
    this.diamondsText = this.add.text(width - 60, 40, currencyManager.getDiamonds().toString(), {
      fontSize: '18px',
      fontFamily: 'Arial Bold',
      color: '#ffffff',
    }).setOrigin(0, 0.5);
  }

  private createRotationTimer(): void {
    const { width } = this.scale;
    const rotation = getMiniGameRotation();

    this.add.text(width / 2, 90, 'Games rotate in:', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    this.rotationText = this.add.text(width / 2, 108, rotation.formatTimeUntilRotation(), {
      fontSize: '14px',
      fontFamily: 'Arial Bold',
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

    const cardWidth = width - 40;
    const cardHeight = 160;
    let y = 200;

    currentGames.forEach((game) => {
      this.createGameCard(game, width / 2, y, cardWidth, cardHeight);
      y += cardHeight + 15;
    });

    // Show "Coming Soon" for unavailable game
    const allGames = rotation.getAllGames();
    const unavailableGame = allGames.find(g => !currentGames.some(cg => cg.id === g.id));
    if (unavailableGame) {
      this.createLockedGameCard(unavailableGame, width / 2, y, cardWidth, 140);
    }
  }

  private createGameCard(game: MiniGameConfig, x: number, y: number, width: number, height: number): void {
    const rotation = getMiniGameRotation();
    const canAfford = rotation.canAfford(game.id);
    const stats = rotation.getGameStats(game.id);

    // Card background
    this.add.rectangle(x, y, width, height, 0x3a3a4e)
      .setStrokeStyle(3, canAfford ? 0x4a90d9 : 0x555555);

    // Icon
    this.add.circle(x - width / 2 + 60, y, 40, 0x2a2a3e);
    this.add.text(x - width / 2 + 60, y, this.getGameEmoji(game.id), {
      fontSize: '36px',
    }).setOrigin(0.5);

    // Game name
    this.add.text(x - width / 2 + 120, y - 30, game.name, {
      fontSize: '22px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
    }).setOrigin(0, 0.5);

    // Description
    this.add.text(x - width / 2 + 120, y, game.description, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#aaaaaa',
    }).setOrigin(0, 0.5);

    // Stats
    this.add.text(x - width / 2 + 120, y + 30, `Played: ${stats.totalPlays} times`, {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#888888',
    }).setOrigin(0, 0.5);

    // Play button
    const btnWidth = 100;
    const btnX = x + width / 2 - 70;
    const playBtn = this.add.rectangle(btnX, y, btnWidth, 50, canAfford ? 0x9933ff : 0x555555)
      .setStrokeStyle(2, canAfford ? 0xbb66ff : 0x666666);

    if (canAfford) {
      playBtn.setInteractive({ useHandCursor: true })
        .on('pointerover', () => playBtn.setFillStyle(0xaa44ff))
        .on('pointerout', () => playBtn.setFillStyle(0x9933ff))
        .on('pointerdown', () => this.playGame(game));
    }

    // Diamond cost
    this.add.polygon(btnX - 25, y - 5, [[0, -8], [6, 0], [0, 8], [-6, 0]], 0x00bfff);
    this.add.text(btnX, y - 5, game.diamondCost.toString(), {
      fontSize: '16px',
      fontFamily: 'Arial Bold',
      color: canAfford ? '#ffffff' : '#888888',
    }).setOrigin(0, 0.5);

    this.add.text(btnX, y + 15, 'PLAY', {
      fontSize: '12px',
      fontFamily: 'Arial Bold',
      color: canAfford ? '#ffffff' : '#888888',
    }).setOrigin(0.5);
  }

  private createLockedGameCard(game: MiniGameConfig, x: number, y: number, width: number, height: number): void {
    // Card background (grayed out)
    this.add.rectangle(x, y, width, height, 0x2a2a3a)
      .setStrokeStyle(2, 0x444444);

    // Lock icon
    this.add.text(x - width / 2 + 60, y, '🔒', {
      fontSize: '36px',
    }).setOrigin(0.5).setAlpha(0.5);

    // Game name
    this.add.text(x - width / 2 + 120, y - 15, game.name, {
      fontSize: '20px',
      fontFamily: 'Arial Black',
      color: '#666666',
    }).setOrigin(0, 0.5);

    // Coming soon text
    this.add.text(x - width / 2 + 120, y + 15, 'Coming in next rotation!', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#888888',
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
    const backBtn = this.add.rectangle(60, this.scale.height - 50, 100, 40, 0x4a4a5e)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backBtn.setFillStyle(0x5a5a6e))
      .on('pointerout', () => backBtn.setFillStyle(0x4a4a5e))
      .on('pointerdown', () => this.scene.start('LevelSelectScene'));

    this.add.text(60, this.scale.height - 50, '← Back', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
  }
}
