import Phaser from 'phaser';
import { CONFIG } from '../config';
import { MiniGameConfig } from '../types';
import { getCurrencyManager } from '../meta/CurrencyManager';
import { getMiniGameRotation } from '../meta/MiniGameRotation';
import { BackgroundEffects } from '../utils/BackgroundEffects';

export class MiniGameHubScene extends Phaser.Scene {
  private diamondsText!: Phaser.GameObjects.Text;
  private rotationText!: Phaser.GameObjects.Text;
  private backgroundEffects!: BackgroundEffects;

  constructor() {
    super({ key: 'MiniGameHubScene' });
  }

  preload(): void {
    this.load.image('bg_title', 'assets/backgrounds/title_screen.jpg.jpeg');
    // Load UI assets
    this.load.image('ui_diamond', 'assets/sprites/ui/diamond.png');
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

    // Add ambient background effects
    this.backgroundEffects = new BackgroundEffects(this, 'title');
    this.backgroundEffects.create();
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

    // Diamond icon - use generated asset if available
    const iconX = diamondPillX - 25;
    if (this.textures.exists('ui_diamond')) {
      this.add.image(iconX, diamondPillY, 'ui_diamond').setDisplaySize(20, 20);
    } else {
      const dg = this.add.graphics();
      dg.fillStyle(0x00bfff, 1);
      dg.fillTriangle(iconX, diamondPillY - 8, iconX + 6, diamondPillY, iconX, diamondPillY + 8);
      dg.fillTriangle(iconX, diamondPillY - 8, iconX - 6, diamondPillY, iconX, diamondPillY + 8);
      dg.fillStyle(0x87ceeb, 1);
      dg.fillTriangle(iconX, diamondPillY - 3, iconX + 2, diamondPillY, iconX, diamondPillY + 3);
    }

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

    this.drawGameIcon(game.id, iconX, y);

    // Game name
    const textStartX = x - cardWidth / 2 + 105;
    const nameText = this.add.text(textStartX, y - 28, game.name, {
      fontSize: '18px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1,
    }).setOrigin(0, 0.5);

    // Add "New!" or "Recommended" badge
    if (game.isNew || game.isRecommended) {
      const badgeX = textStartX + nameText.width + 10;
      const badgeY = y - 28;
      const badgeText = game.isRecommended ? 'HOT' : 'NEW';
      const badgeColor = game.isRecommended ? 0xff6b35 : 0x44dd44;
      const badgeWidth = game.isRecommended ? 36 : 38;

      const badgeGraphics = this.add.graphics();
      badgeGraphics.fillStyle(badgeColor, 1);
      badgeGraphics.fillRoundedRect(badgeX - 2, badgeY - 10, badgeWidth, 20, 10);
      badgeGraphics.lineStyle(1, 0xffffff, 0.5);
      badgeGraphics.strokeRoundedRect(badgeX - 2, badgeY - 10, badgeWidth, 20, 10);

      this.add.text(badgeX + badgeWidth / 2 - 2, badgeY, badgeText, {
        fontSize: '10px',
        fontFamily: 'Arial Black',
        color: '#ffffff',
      }).setOrigin(0.5);
    }

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

    this.drawLockIcon(iconX, y);

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

  private drawGameIcon(gameId: string, x: number, y: number): void {
    const g = this.add.graphics();

    if (gameId === 'spin_wheel') {
      // Draw wheel icon
      g.lineStyle(3, 0xffd700, 1);
      g.strokeCircle(x, y, 16);
      g.fillStyle(0xffd700, 1);
      g.fillCircle(x, y, 4);
      // Wheel spokes
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6;
        const x2 = x + Math.cos(angle) * 14;
        const y2 = y + Math.sin(angle) * 14;
        g.lineBetween(x, y, x2, y2);
      }
    } else if (gameId === 'treasure_hunt') {
      // Draw treasure chest icon
      g.fillStyle(0x8b4513, 1);
      g.fillRect(x - 12, y - 4, 24, 16);
      g.fillStyle(0xa0522d, 1);
      g.fillRect(x - 13, y - 12, 26, 10);
      g.fillStyle(0xffd700, 1);
      g.fillCircle(x, y + 2, 4);
    } else if (gameId === 'lucky_match') {
      // Draw card icon
      g.fillStyle(0x4169e1, 1);
      g.fillRoundedRect(x - 10, y - 14, 20, 28, 3);
      g.fillStyle(0xffffff, 1);
      this.add.text(x, y, '?', {
        fontSize: '18px',
        fontFamily: 'Arial Black',
        color: '#ffffff',
      }).setOrigin(0.5);
    } else if (gameId === 'stack_sort') {
      // Draw tube/stack icon
      g.fillStyle(0x4a6a8a, 1);
      g.fillRoundedRect(x - 14, y - 16, 10, 32, { tl: 2, tr: 2, bl: 5, br: 5 });
      g.fillRoundedRect(x + 4, y - 16, 10, 32, { tl: 2, tr: 2, bl: 5, br: 5 });
      // Balls
      g.fillStyle(0xff4444, 1);
      g.fillCircle(x - 9, y + 10, 4);
      g.fillStyle(0x4488ff, 1);
      g.fillCircle(x - 9, y + 2, 4);
      g.fillStyle(0x44ff44, 1);
      g.fillCircle(x + 9, y + 10, 4);
      g.fillStyle(0xff4444, 1);
      g.fillCircle(x + 9, y + 2, 4);
    } else if (gameId === 'treasure_dig') {
      // Draw shovel icon
      g.fillStyle(0x8b4513, 1);
      g.fillRect(x - 2, y - 5, 4, 20);
      g.fillStyle(0x808080, 1);
      g.fillRoundedRect(x - 8, y - 14, 16, 12, 2);
      g.fillStyle(0xa0a0a0, 1);
      g.fillRect(x - 6, y - 10, 12, 3);
      // Dirt pile
      g.fillStyle(0x5a4020, 1);
      g.fillTriangle(x - 12, y + 14, x, y + 4, x + 12, y + 14);
    } else if (gameId === 'bridge_builder') {
      // Draw bridge icon
      g.fillStyle(0x3a4a5e, 1);
      g.fillRect(x - 18, y + 4, 14, 14);
      g.fillRect(x + 4, y + 4, 14, 14);
      g.fillStyle(0x8b4513, 1);
      g.fillRect(x - 6, y + 2, 12, 4);
      // Character
      g.fillStyle(0x4488ff, 1);
      g.fillRect(x - 14, y - 10, 6, 12);
      g.fillStyle(0xffcc99, 1);
      g.fillCircle(x - 11, y - 14, 4);
    } else if (gameId === 'pin_pull') {
      // Draw pin icon
      g.fillStyle(0x888888, 1);
      g.fillRect(x - 15, y - 2, 30, 6);
      g.fillStyle(0xdd4444, 1);
      g.fillCircle(x + 18, y + 1, 8);
      // Character below
      g.fillStyle(0x4488ff, 1);
      g.fillCircle(x - 5, y + 15, 8);
      g.fillStyle(0xffcc99, 1);
      g.fillCircle(x - 5, y + 6, 5);
    } else if (gameId === 'pipe_connect') {
      // Draw pipe icon
      g.fillStyle(0x4488ff, 1);
      g.fillRect(x - 18, y - 4, 16, 8);
      g.fillRect(x - 6, y - 14, 8, 28);
      g.fillRect(x + 2, y - 4, 16, 8);
      g.fillStyle(0x2266cc, 1);
      g.fillCircle(x - 2, y, 6);
    } else if (gameId === 'save_room') {
      // Draw hazard/room icon
      g.fillStyle(0xff6644, 1);
      g.fillTriangle(x, y - 16, x - 14, y + 12, x + 14, y + 12);
      g.fillStyle(0xffaa44, 1);
      g.fillTriangle(x, y - 8, x - 8, y + 8, x + 8, y + 8);
      g.fillStyle(0x000000, 1);
      g.fillRect(x - 2, y - 4, 4, 8);
      g.fillCircle(x, y + 8, 2);
    } else if (gameId === 'parking_jam') {
      // Draw car icon
      g.fillStyle(0xff4444, 1);
      g.fillRoundedRect(x - 14, y - 8, 28, 16, 4);
      g.fillStyle(0xcc2222, 1);
      g.fillRoundedRect(x - 10, y - 12, 20, 8, { tl: 4, tr: 4, bl: 0, br: 0 });
      g.fillStyle(0x88ccff, 0.8);
      g.fillRoundedRect(x - 6, y - 10, 12, 5, 2);
      // Wheels
      g.fillStyle(0x333333, 1);
      g.fillCircle(x - 8, y + 8, 4);
      g.fillCircle(x + 8, y + 8, 4);
    } else if (gameId === 'slingshot') {
      // Draw slingshot icon
      g.fillStyle(0x8b4513, 1);
      g.fillRect(x - 2, y - 5, 4, 20);
      g.fillRect(x - 10, y - 16, 6, 14);
      g.fillRect(x + 4, y - 16, 6, 14);
      // Rubber band
      g.lineStyle(3, 0x654321, 1);
      g.lineBetween(x - 7, y - 14, x, y - 2);
      g.lineBetween(x + 7, y - 14, x, y - 2);
      // Ball
      g.fillStyle(0xffaa00, 1);
      g.fillCircle(x, y - 2, 6);
    } else {
      // Default game icon
      g.fillStyle(0x888888, 1);
      g.fillCircle(x, y, 14);
    }
  }

  private drawLockIcon(x: number, y: number): void {
    const g = this.add.graphics();
    // Lock body
    g.fillStyle(0x666666, 1);
    g.fillRoundedRect(x - 10, y - 4, 20, 16, 3);
    // Lock shackle
    g.lineStyle(3, 0x666666, 1);
    g.beginPath();
    g.arc(x, y - 8, 8, Math.PI, 0, false);
    g.stroke();
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
      stack_sort: 'StackSortScene',
      treasure_dig: 'TreasureDigScene',
      bridge_builder: 'BridgeBuilderScene',
      pin_pull: 'PinPullScene',
      pipe_connect: 'PipeConnectScene',
      save_room: 'SaveTheRoomScene',
      parking_jam: 'ParkingJamScene',
      slingshot: 'SlingshotScene',
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
