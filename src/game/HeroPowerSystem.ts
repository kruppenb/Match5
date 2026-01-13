import Phaser from 'phaser';
import { CONFIG } from '../config';
import { HeroType, HeroPowerBarState, Position, Tile } from '../types';
import { Grid } from './Grid';
import { getObstacleBehavior } from './Obstacle';

interface HeroPowerCallbacks {
  cellToScreen: (row: number, col: number) => { x: number; y: number };
  getTileSprite: (tileId: string) => Phaser.GameObjects.Container | undefined;
  clearTiles: (tiles: Tile[]) => Promise<void>;
  applyGravity: () => Promise<void>;
  processMatches: () => Promise<void>;
  playSound: (type: 'match' | 'powerup' | 'combo') => void;
  shake: (intensity: 'light' | 'medium' | 'heavy') => void;
  haptic: (type: string) => void;
  emitParticles: (x: number, y: number, color: number, count: number) => void;
  // Obstacle callbacks
  removeObstacleSprite: (row: number, col: number) => void;
  updateObstacleSprite: (row: number, col: number) => void;
  updateObstacleObjectives: (clearedByType: Record<string, number>) => void;
}

interface ChargeSource {
  x: number;
  y: number;
  color: number;
}

export class HeroPowerSystem {
  private scene: Phaser.Scene;
  private grid: Grid;
  private callbacks: HeroPowerCallbacks;

  // State
  private state: HeroPowerBarState = {
    currentCharge: 0,
    isReady: false,
    isSelectionOpen: false,
    selectedHero: null,
    isActivating: false,
  };

  // UI Elements
  private barContainer!: Phaser.GameObjects.Container;
  private barBg!: Phaser.GameObjects.Graphics;
  private barFill!: Phaser.GameObjects.Graphics;
  private barFrame!: Phaser.GameObjects.Graphics;
  private chargeText!: Phaser.GameObjects.Text;
  private readyText!: Phaser.GameObjects.Text;
  private heroIcon!: Phaser.GameObjects.Text;

  // Popup elements
  private popupContainer!: Phaser.GameObjects.Container | null;

  // Bar dimensions
  private readonly barX: number;
  private readonly barY: number;
  private readonly barWidth = 180;
  private readonly barHeight = 32;

  // Flash animation state
  private isFlashing = false;

  constructor(
    scene: Phaser.Scene,
    grid: Grid,
    callbacks: HeroPowerCallbacks,
    initialCharge: number = 0
  ) {
    this.scene = scene;
    this.grid = grid;
    this.callbacks = callbacks;
    this.state.currentCharge = initialCharge;

    // Position bar at top of screen, below header and objective bar
    this.barX = scene.scale.width / 2;
    this.barY = CONFIG.UI.HEADER_HEIGHT + CONFIG.UI.OBJECTIVE_BAR_HEIGHT * 2 + 8;

    this.createBarUI();
    this.updateBarVisual();
  }

  private createBarUI(): void {
    this.barContainer = this.scene.add.container(this.barX, this.barY);
    this.barContainer.setDepth(100);

    // Background shadow
    const shadow = this.scene.add.graphics();
    shadow.fillStyle(0x000000, 0.4);
    shadow.fillRoundedRect(-this.barWidth / 2 + 2, 2, this.barWidth, this.barHeight, 10);
    this.barContainer.add(shadow);

    // Background
    this.barBg = this.scene.add.graphics();
    this.barBg.fillStyle(0x1a1a2e, 0.95);
    this.barBg.fillRoundedRect(-this.barWidth / 2, 0, this.barWidth, this.barHeight, 10);
    this.barContainer.add(this.barBg);

    // Fill (will be updated dynamically)
    this.barFill = this.scene.add.graphics();
    this.barContainer.add(this.barFill);

    // Frame/border
    this.barFrame = this.scene.add.graphics();
    this.barFrame.lineStyle(2, 0x4a90d9, 0.9);
    this.barFrame.strokeRoundedRect(-this.barWidth / 2, 0, this.barWidth, this.barHeight, 10);
    this.barContainer.add(this.barFrame);

    // Hero icon on left
    this.heroIcon = this.scene.add.text(-this.barWidth / 2 + 18, this.barHeight / 2, '⚡', {
      fontSize: '18px',
    }).setOrigin(0.5);
    this.barContainer.add(this.heroIcon);

    // Charge percentage text
    this.chargeText = this.scene.add.text(this.barWidth / 2 - 10, this.barHeight / 2, '0%', {
      fontSize: '14px',
      fontFamily: 'Arial Bold',
      color: '#ffffff',
    }).setOrigin(1, 0.5);
    this.barContainer.add(this.chargeText);

    // "READY!" text (hidden until full)
    this.readyText = this.scene.add.text(0, this.barHeight / 2, 'READY!', {
      fontSize: '16px',
      fontFamily: 'Arial Black',
      color: '#ffaa00',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);
    this.barContainer.add(this.readyText);

    // Make bar interactive when ready
    const hitArea = this.scene.add.rectangle(0, this.barHeight / 2, this.barWidth, this.barHeight, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    this.barContainer.add(hitArea);

    hitArea.on('pointerdown', () => {
      if (this.state.isReady && !this.state.isSelectionOpen && !this.state.isActivating) {
        this.showHeroSelection();
      }
    });
  }

  private updateBarVisual(): void {
    const fillPercent = Math.min(this.state.currentCharge / CONFIG.HERO_POWERS.MAX_CHARGE, 1);
    const fillWidth = (this.barWidth - 6) * fillPercent;
    const padding = 3;

    this.barFill.clear();
    if (fillPercent > 0) {
      // Color gradient based on charge level
      let color = 0x4a90d9; // Blue
      if (fillPercent >= 1) {
        color = 0xffaa00; // Gold when full
      } else if (fillPercent >= 0.75) {
        color = 0x66cc66; // Green
      } else if (fillPercent >= 0.5) {
        color = 0x44aacc; // Cyan
      }

      this.barFill.fillStyle(color, 1);
      this.barFill.fillRoundedRect(
        -this.barWidth / 2 + padding,
        padding,
        fillWidth,
        this.barHeight - padding * 2,
        7
      );

      // Shine effect on top
      this.barFill.fillStyle(0xffffff, 0.2);
      this.barFill.fillRoundedRect(
        -this.barWidth / 2 + padding,
        padding,
        fillWidth,
        (this.barHeight - padding * 2) / 2,
        { tl: 7, tr: 7, bl: 0, br: 0 }
      );
    }

    // Update charge text
    this.chargeText.setText(`${Math.floor(this.state.currentCharge)}%`);

    // Update ready state
    this.state.isReady = fillPercent >= 1;

    if (this.state.isReady) {
      this.chargeText.setAlpha(0);
      this.readyText.setAlpha(1);

      // Pulse animation for ready state
      if (!this.scene.tweens.isTweening(this.barContainer)) {
        this.scene.tweens.add({
          targets: this.barContainer,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        // Glow effect on frame
        this.barFrame.clear();
        this.barFrame.lineStyle(3, 0xffaa00, 1);
        this.barFrame.strokeRoundedRect(-this.barWidth / 2, 0, this.barWidth, this.barHeight, 10);
      }
    } else {
      this.chargeText.setAlpha(1);
      this.readyText.setAlpha(0);
      this.scene.tweens.killTweensOf(this.barContainer);
      this.barContainer.setScale(1);

      this.barFrame.clear();
      this.barFrame.lineStyle(2, 0x4a90d9, 0.9);
      this.barFrame.strokeRoundedRect(-this.barWidth / 2, 0, this.barWidth, this.barHeight, 10);
    }
  }

  addCharge(tilesCleared: number, cascadeLevel: number = 0, powerupActivated: boolean = false, sources?: ChargeSource[]): void {
    if (this.state.isReady || this.state.isActivating) return;

    let chargeGain = tilesCleared * CONFIG.HERO_POWERS.CHARGE_PER_TILE;

    if (cascadeLevel > 0) {
      chargeGain += cascadeLevel * CONFIG.HERO_POWERS.CHARGE_PER_CASCADE;
    }

    if (powerupActivated) {
      chargeGain += CONFIG.HERO_POWERS.CHARGE_PER_POWERUP;
    }

    const previousCharge = this.state.currentCharge;
    this.state.currentCharge = Math.min(
      CONFIG.HERO_POWERS.MAX_CHARGE,
      this.state.currentCharge + chargeGain
    );

    // Animate flying energy sprites if sources provided
    if (sources && sources.length > 0 && chargeGain > 0) {
      this.animateFlyingEnergy(sources);
    }

    // Flash the bar when charging
    if (chargeGain > 0 && previousCharge < CONFIG.HERO_POWERS.MAX_CHARGE) {
      this.flashBar();
    }

    this.updateBarVisual();
  }

  private animateFlyingEnergy(sources: ChargeSource[]): void {
    // Target position is the bar
    const targetX = this.barX;
    const targetY = this.barY + this.barHeight / 2;

    // Limit number of energy sprites to avoid performance issues
    const maxSprites = Math.min(sources.length, 8);
    const selectedSources = sources.slice(0, maxSprites);

    selectedSources.forEach((source, index) => {
      // Stagger the spawn slightly
      this.scene.time.delayedCall(index * 30, () => {
        this.createEnergySprite(source.x, source.y, targetX, targetY, source.color);
      });
    });
  }

  private createEnergySprite(startX: number, startY: number, targetX: number, targetY: number, color: number): void {
    // Create glowing energy orb
    const container = this.scene.add.container(startX, startY);
    container.setDepth(150);

    // Glow background
    const glow = this.scene.add.graphics();
    glow.fillStyle(color, 0.4);
    glow.fillCircle(0, 0, 12);
    container.add(glow);

    // Core orb
    const orb = this.scene.add.graphics();
    orb.fillStyle(color, 1);
    orb.fillCircle(0, 0, 6);
    container.add(orb);

    // White center
    const center = this.scene.add.graphics();
    center.fillStyle(0xffffff, 0.8);
    center.fillCircle(0, 0, 3);
    container.add(center);

    // Animate to target with curved path
    const distance = Phaser.Math.Distance.Between(startX, startY, targetX, targetY);
    const duration = Math.min(400, 200 + distance * 0.3);

    // Calculate control point for bezier curve (arc upward)
    const midX = (startX + targetX) / 2;
    const midY = Math.min(startY, targetY) - 40;

    // Use path for curved motion
    const path = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(startX, startY),
      new Phaser.Math.Vector2(midX, midY),
      new Phaser.Math.Vector2(targetX, targetY)
    );

    // Create follower
    const startPoint = { t: 0 };
    this.scene.tweens.add({
      targets: startPoint,
      t: 1,
      duration: duration,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        const point = path.getPoint(startPoint.t);
        container.setPosition(point.x, point.y);
        // Scale down as it approaches
        const scale = 1 - startPoint.t * 0.3;
        container.setScale(scale);
      },
      onComplete: () => {
        // Flash at target
        const flash = this.scene.add.circle(targetX, targetY, 15, 0xffffff, 0.8);
        flash.setDepth(151);
        this.scene.tweens.add({
          targets: flash,
          alpha: 0,
          scale: 0.5,
          duration: 100,
          onComplete: () => flash.destroy(),
        });
        container.destroy();
      },
    });

    // Pulsing glow animation
    this.scene.tweens.add({
      targets: glow,
      alpha: { from: 0.4, to: 0.8 },
      duration: 80,
      yoyo: true,
      repeat: -1,
    });
  }

  private flashBar(): void {
    // Don't start a new flash if already flashing
    if (this.isFlashing) return;

    this.isFlashing = true;

    // Create flash overlay
    const flashOverlay = this.scene.add.graphics();
    flashOverlay.fillStyle(0xffffff, 0.6);
    flashOverlay.fillRoundedRect(-this.barWidth / 2, 0, this.barWidth, this.barHeight, 10);
    this.barContainer.add(flashOverlay);

    // Flash animation
    this.scene.tweens.add({
      targets: flashOverlay,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => {
        flashOverlay.destroy();
        this.isFlashing = false;
      },
    });

    // Also pulse the bar slightly
    if (!this.state.isReady) {
      this.scene.tweens.add({
        targets: this.barContainer,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 100,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    }
  }

  private showHeroSelection(): void {
    if (this.popupContainer) return;

    this.state.isSelectionOpen = true;
    const { width, height } = this.scene.scale;

    this.popupContainer = this.scene.add.container(width / 2, height / 2);
    this.popupContainer.setDepth(200);

    // Dark overlay
    const overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.85)
      .setInteractive();
    this.popupContainer.add(overlay);

    // Panel
    const panelWidth = 300;
    const panelHeight = 340;

    // Panel shadow
    const panelShadow = this.scene.add.graphics();
    panelShadow.fillStyle(0x000000, 0.5);
    panelShadow.fillRoundedRect(-panelWidth / 2 + 4, -panelHeight / 2 + 4, panelWidth, panelHeight, 20);
    this.popupContainer.add(panelShadow);

    // Panel background
    const panel = this.scene.add.graphics();
    panel.fillStyle(0x1e2a3a, 0.98);
    panel.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 20);
    panel.lineStyle(3, 0xffaa00, 1);
    panel.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 20);
    this.popupContainer.add(panel);

    // Title with glow
    const titleGlow = this.scene.add.text(0, -panelHeight / 2 + 35, 'HERO POWER READY!', {
      fontSize: '20px',
      fontFamily: 'Arial Black',
      color: '#ffaa00',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.popupContainer.add(titleGlow);

    // Hero cards
    const heroes: HeroType[] = ['thor', 'ironman', 'elsa'];
    const cardWidth = 80;
    const cardHeight = 140;
    const cardSpacing = 10;
    const startX = -((cardWidth + cardSpacing) * (heroes.length - 1)) / 2;
    const cardY = 10;

    heroes.forEach((heroType, index) => {
      const heroConfig = CONFIG.HERO_POWERS.HEROES[heroType];
      const x = startX + index * (cardWidth + cardSpacing);

      this.createHeroCard(x, cardY, cardWidth, cardHeight, heroType, heroConfig);
    });

    // Instruction text
    const instruction = this.scene.add.text(0, panelHeight / 2 - 45, 'Tap a hero to activate!', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    this.popupContainer.add(instruction);

    // Animate popup in
    this.popupContainer.setScale(0.8);
    this.popupContainer.setAlpha(0);
    this.scene.tweens.add({
      targets: this.popupContainer,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  private createHeroCard(
    x: number,
    y: number,
    width: number,
    height: number,
    heroType: HeroType,
    config: typeof CONFIG.HERO_POWERS.HEROES.thor
  ): void {
    if (!this.popupContainer) return;

    const cardContainer = this.scene.add.container(x, y);
    this.popupContainer.add(cardContainer);

    // Card background
    const cardBg = this.scene.add.graphics();
    cardBg.fillStyle(0x2a3a4e, 1);
    cardBg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
    cardBg.lineStyle(2, config.color, 0.8);
    cardBg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
    cardContainer.add(cardBg);

    // Try to load hero sprite, fallback to icon
    const spriteKey = `hero_${heroType}`;
    if (this.scene.textures.exists(spriteKey)) {
      const heroSprite = this.scene.add.image(0, -25, spriteKey);
      heroSprite.setDisplaySize(60, 60);
      cardContainer.add(heroSprite);
    } else {
      // Fallback: colored circle with icon
      const iconBg = this.scene.add.circle(0, -25, 28, config.color);
      cardContainer.add(iconBg);

      const icon = this.scene.add.text(0, -25, config.icon, {
        fontSize: '28px',
      }).setOrigin(0.5);
      cardContainer.add(icon);
    }

    // Hero name
    const name = this.scene.add.text(0, 15, config.name, {
      fontSize: '13px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
    }).setOrigin(0.5);
    cardContainer.add(name);

    // Power name
    const powerName = this.scene.add.text(0, 35, config.powerName, {
      fontSize: '9px',
      fontFamily: 'Arial',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    cardContainer.add(powerName);

    // Interactive hit area
    const hitArea = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    cardContainer.add(hitArea);

    hitArea.on('pointerover', () => {
      cardBg.clear();
      cardBg.fillStyle(0x3a4a5e, 1);
      cardBg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
      cardBg.lineStyle(3, config.color, 1);
      cardBg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
      cardContainer.setScale(1.05);
    });

    hitArea.on('pointerout', () => {
      cardBg.clear();
      cardBg.fillStyle(0x2a3a4e, 1);
      cardBg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
      cardBg.lineStyle(2, config.color, 0.8);
      cardBg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
      cardContainer.setScale(1);
    });

    hitArea.on('pointerdown', () => {
      this.selectHero(heroType);
    });
  }

  private async selectHero(hero: HeroType): Promise<void> {
    this.state.selectedHero = hero;
    this.state.isSelectionOpen = false;

    // Animate popup out
    if (this.popupContainer) {
      await new Promise<void>(resolve => {
        this.scene.tweens.add({
          targets: this.popupContainer,
          scaleX: 0.8,
          scaleY: 0.8,
          alpha: 0,
          duration: 150,
          ease: 'Back.easeIn',
          onComplete: () => {
            this.popupContainer?.destroy();
            this.popupContainer = null;
            resolve();
          },
        });
      });
    }

    // Activate the power
    await this.activatePower(hero);
  }

  private async activatePower(hero: HeroType): Promise<void> {
    this.state.isActivating = true;

    // Reset bar
    this.state.currentCharge = 0;
    this.state.isReady = false;
    this.updateBarVisual();

    // Get hero config
    const config = CONFIG.HERO_POWERS.HEROES[hero];

    // Show hero pop-in animation
    await this.showHeroPopIn(hero, config);

    // Execute hero's power
    switch (hero) {
      case 'thor':
        await this.executeThorPower();
        break;
      case 'ironman':
        await this.executeIronManPower();
        break;
      case 'elsa':
        await this.executeElsaPower();
        break;
    }

    this.state.isActivating = false;
    this.state.selectedHero = null;

    // Process any cascades from the power
    await this.callbacks.applyGravity();
    await this.callbacks.processMatches();
  }

  private async showHeroPopIn(hero: HeroType, config: typeof CONFIG.HERO_POWERS.HEROES.thor): Promise<void> {
    const { width, height } = this.scene.scale;

    const heroContainer = this.scene.add.container(-100, height / 2);
    heroContainer.setDepth(150);

    // Hero portrait background
    const portraitBg = this.scene.add.circle(0, 0, 60, config.color, 0.3);
    heroContainer.add(portraitBg);

    const portraitRing = this.scene.add.circle(0, 0, 55, config.color);
    portraitRing.setStrokeStyle(4, 0xffffff);
    heroContainer.add(portraitRing);

    // Try hero sprite, fallback to icon
    const spriteKey = `hero_${hero}`;
    if (this.scene.textures.exists(spriteKey)) {
      const sprite = this.scene.add.image(0, 0, spriteKey);
      sprite.setDisplaySize(80, 80);
      heroContainer.add(sprite);
    } else {
      const icon = this.scene.add.text(0, 0, config.icon, {
        fontSize: '50px',
      }).setOrigin(0.5);
      heroContainer.add(icon);
    }

    // Power name banner
    const banner = this.scene.add.text(0, 75, config.powerName.toUpperCase(), {
      fontSize: '16px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    heroContainer.add(banner);

    // Slide in animation
    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: heroContainer,
        x: width / 2,
        duration: 300,
        ease: 'Back.easeOut',
        onComplete: () => {
          // Dramatic pause
          this.scene.time.delayedCall(400, () => {
            // Slide out
            this.scene.tweens.add({
              targets: heroContainer,
              x: width + 100,
              duration: 250,
              ease: 'Back.easeIn',
              onComplete: () => {
                heroContainer.destroy();
                resolve();
              },
            });
          });
        },
      });
    });
  }

  private async executeThorPower(): Promise<void> {
    const { min, max } = CONFIG.HERO_POWERS.THOR_STRIKE_COUNT;
    const strikeCount = min + Math.floor(Math.random() * (max - min + 1));

    // PRIORITIZE destructible obstacles (grass, ice, box, barrel, ice_bucket, chain)
    const destructibleObstacles = this.getDestructibleObstaclePositions();

    // Get positions with tiles (for remaining strikes)
    const tilePositions: Position[] = [];
    for (let row = 0; row < this.grid.rows; row++) {
      for (let col = 0; col < this.grid.cols; col++) {
        const cell = this.grid.getCell(row, col);
        if (cell && cell.tile && !cell.blocked) {
          tilePositions.push({ row, col });
        }
      }
    }

    // Shuffle both lists
    const shuffledObstacles = destructibleObstacles.sort(() => Math.random() - 0.5);
    const shuffledTiles = tilePositions.sort(() => Math.random() - 0.5);

    // Prioritize obstacles: use as many strikes on obstacles as possible
    const obstacleStrikeCount = Math.min(strikeCount, shuffledObstacles.length);
    const tileStrikeCount = Math.min(strikeCount - obstacleStrikeCount, shuffledTiles.length);

    const strikePositions: Position[] = [
      ...shuffledObstacles.slice(0, obstacleStrikeCount),
      ...shuffledTiles.slice(0, tileStrikeCount),
    ];

    // Collect tiles to clear
    const tilesToClear: Tile[] = [];
    for (const pos of strikePositions) {
      const cell = this.grid.getCell(pos.row, pos.col);
      if (cell?.tile) {
        tilesToClear.push(cell.tile);
      }
    }

    // Lightning strike effects
    this.callbacks.playSound('powerup');
    this.callbacks.shake('heavy');
    this.callbacks.haptic('heavy');

    // Create lightning bolts for each strike
    for (const pos of strikePositions) {
      await this.createLightningBolt(pos.row, pos.col);
    }

    // Damage obstacles at strike positions
    this.damageObstaclesAt(strikePositions);

    // Clear tiles
    if (tilesToClear.length > 0) {
      await this.callbacks.clearTiles(tilesToClear);
    }
  }

  private async createLightningBolt(row: number, col: number): Promise<void> {
    const pos = this.callbacks.cellToScreen(row, col);

    // Create lightning graphic
    const lightning = this.scene.add.graphics();
    lightning.setDepth(160);

    // Draw jagged lightning bolt from top of screen
    const startY = -50;
    const endY = pos.y;
    const segments = 8;
    const segmentHeight = (endY - startY) / segments;

    let currentX = pos.x;
    let currentY = startY;

    lightning.lineStyle(4, 0xffff00, 1);
    lightning.beginPath();
    lightning.moveTo(currentX, currentY);

    for (let i = 0; i < segments; i++) {
      const nextY = currentY + segmentHeight;
      const nextX = pos.x + (Math.random() - 0.5) * 40;
      lightning.lineTo(nextX, nextY);
      currentX = nextX;
      currentY = nextY;
    }
    lightning.lineTo(pos.x, endY);
    lightning.strokePath();

    // Glow effect
    const glow = this.scene.add.graphics();
    glow.setDepth(159);
    glow.lineStyle(12, 0x6ab0f9, 0.4);
    glow.beginPath();
    glow.moveTo(pos.x, startY);
    glow.lineTo(pos.x, endY);
    glow.strokePath();

    // Impact flash
    const flash = this.scene.add.circle(pos.x, pos.y, 30, 0xffffff, 0.8);
    flash.setDepth(161);

    // Particles
    this.callbacks.emitParticles(pos.x, pos.y, 0xffff00, 12);

    // Animate and cleanup
    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: [lightning, glow, flash],
        alpha: 0,
        duration: 200,
        delay: 100,
        onComplete: () => {
          lightning.destroy();
          glow.destroy();
          flash.destroy();
          resolve();
        },
      });
    });
  }

  private async executeIronManPower(): Promise<void> {
    const missileCount = CONFIG.HERO_POWERS.IRONMAN_MISSILE_COUNT;
    const explosionSize = CONFIG.HERO_POWERS.IRONMAN_EXPLOSION_SIZE;

    // Find positions with blocking obstacles and score them
    const positionsWithObstacles: { pos: Position; obstacleCount: number }[] = [];
    const allValidPositions: Position[] = [];

    for (let row = 0; row < this.grid.rows - (explosionSize - 1); row++) {
      for (let col = 0; col < this.grid.cols - (explosionSize - 1); col++) {
        let obstacleCount = 0;
        for (let dr = 0; dr < explosionSize; dr++) {
          for (let dc = 0; dc < explosionSize; dc++) {
            const cell = this.grid.getCell(row + dr, col + dc);
            if (cell?.obstacle) {
              const behavior = getObstacleBehavior(cell.obstacle.type);
              if (behavior.blocksTile && !behavior.isIndestructible) {
                obstacleCount++;
              }
            }
          }
        }
        allValidPositions.push({ row, col });
        if (obstacleCount > 0) {
          positionsWithObstacles.push({ pos: { row, col }, obstacleCount });
        }
      }
    }

    // Sort by obstacle count (more obstacles = higher priority)
    positionsWithObstacles.sort((a, b) => b.obstacleCount - a.obstacleCount);

    // Prioritize positions with obstacles
    const targetPositions: Position[] = [];
    const usedPositions: Set<string> = new Set();

    // First, pick positions with obstacles (up to missileCount)
    for (const { pos } of positionsWithObstacles) {
      if (targetPositions.length >= missileCount) break;
      const key = `${pos.row},${pos.col}`;
      if (!usedPositions.has(key)) {
        targetPositions.push(pos);
        usedPositions.add(key);
      }
    }

    // Fill remaining with random positions
    const shuffledRemaining = allValidPositions
      .filter(p => !usedPositions.has(`${p.row},${p.col}`))
      .sort(() => Math.random() - 0.5);

    for (const pos of shuffledRemaining) {
      if (targetPositions.length >= missileCount) break;
      targetPositions.push(pos);
    }

    // Collect all positions in explosion areas
    const explosionPositions: Position[] = [];
    const tilesToClear: Set<string> = new Set();
    const allTiles: Tile[] = [];

    for (const target of targetPositions) {
      for (let dr = 0; dr < explosionSize; dr++) {
        for (let dc = 0; dc < explosionSize; dc++) {
          const row = target.row + dr;
          const col = target.col + dc;
          explosionPositions.push({ row, col });
          const cell = this.grid.getCell(row, col);
          if (cell?.tile && !tilesToClear.has(cell.tile.id)) {
            tilesToClear.add(cell.tile.id);
            allTiles.push(cell.tile);
          }
        }
      }
    }

    this.callbacks.playSound('powerup');

    // Fire missiles with staggered timing
    const missilePromises = targetPositions.map((target, index) => {
      return new Promise<void>(resolve => {
        this.scene.time.delayedCall(index * 150, async () => {
          await this.fireMissile(target.row, target.col, explosionSize);
          resolve();
        });
      });
    });

    await Promise.all(missilePromises);

    // Damage obstacles in explosion areas
    this.damageObstaclesAt(explosionPositions);

    // Clear all tiles
    if (allTiles.length > 0) {
      await this.callbacks.clearTiles(allTiles);
    }
  }

  private async fireMissile(targetRow: number, targetCol: number, _size: number): Promise<void> {
    const { width: sceneWidth } = this.scene.scale;
    const target = this.callbacks.cellToScreen(targetRow, targetCol);

    // Missile starts from top-right
    const missile = this.scene.add.container(sceneWidth + 20, -20);
    missile.setDepth(160);

    // Missile body
    const body = this.scene.add.graphics();
    body.fillStyle(0xff4444, 1);
    body.fillEllipse(0, 0, 20, 8);
    body.fillStyle(0xffaa00, 1);
    body.fillCircle(-12, 0, 5);
    missile.add(body);

    // Trail
    const trail = this.scene.add.graphics();
    trail.fillStyle(0xffaa00, 0.5);
    trail.fillEllipse(-20, 0, 15, 4);
    missile.add(trail);

    // Rotate toward target
    const angle = Phaser.Math.Angle.Between(sceneWidth + 20, -20, target.x, target.y);
    missile.setRotation(angle);

    // Animate missile to target
    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: missile,
        x: target.x,
        y: target.y,
        duration: 300,
        ease: 'Quad.easeIn',
        onComplete: () => {
          missile.destroy();

          // Explosion effect
          this.createExplosion(target.x, target.y);
          this.callbacks.shake('medium');
          this.callbacks.haptic('medium');

          resolve();
        },
      });
    });
  }

  private createExplosion(x: number, y: number): void {
    // Explosion rings
    for (let i = 0; i < 3; i++) {
      const ring = this.scene.add.circle(x, y, 10, 0xffaa00, 0.8 - i * 0.2);
      ring.setDepth(161);

      this.scene.tweens.add({
        targets: ring,
        radius: 40 + i * 20,
        alpha: 0,
        duration: 300,
        delay: i * 50,
        onComplete: () => ring.destroy(),
      });
    }

    // Flash
    const flash = this.scene.add.circle(x, y, 50, 0xffffff, 0.6);
    flash.setDepth(160);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.5,
      duration: 200,
      onComplete: () => flash.destroy(),
    });

    // Particles
    this.callbacks.emitParticles(x, y, 0xff6600, 15);
  }

  private async executeElsaPower(): Promise<void> {
    const lineCount = CONFIG.HERO_POWERS.ELSA_LINES_COUNT;

    // Count obstacles in each row and column
    const rowObstacleCounts: number[] = [];
    const colObstacleCounts: number[] = [];

    for (let row = 0; row < this.grid.rows; row++) {
      let count = 0;
      for (let col = 0; col < this.grid.cols; col++) {
        const cell = this.grid.getCell(row, col);
        if (cell?.obstacle) {
          const behavior = getObstacleBehavior(cell.obstacle.type);
          if (behavior.blocksTile && !behavior.isIndestructible) {
            count++;
          }
        }
      }
      rowObstacleCounts.push(count);
    }

    for (let col = 0; col < this.grid.cols; col++) {
      let count = 0;
      for (let row = 0; row < this.grid.rows; row++) {
        const cell = this.grid.getCell(row, col);
        if (cell?.obstacle) {
          const behavior = getObstacleBehavior(cell.obstacle.type);
          if (behavior.blocksTile && !behavior.isIndestructible) {
            count++;
          }
        }
      }
      colObstacleCounts.push(count);
    }

    // Determine whether to use rows or columns based on obstacle density
    const totalRowObstacles = rowObstacleCounts.reduce((a, b) => a + b, 0);
    const totalColObstacles = colObstacleCounts.reduce((a, b) => a + b, 0);

    // Prefer direction with more obstacles, or random if equal
    let useRows: boolean;
    if (totalRowObstacles > totalColObstacles) {
      useRows = true;
    } else if (totalColObstacles > totalRowObstacles) {
      useRows = false;
    } else {
      useRows = Math.random() > 0.5;
    }

    const obstacleCounts = useRows ? rowObstacleCounts : colObstacleCounts;
    const maxLines = useRows ? this.grid.rows : this.grid.cols;

    // Sort lines by obstacle count (descending), then shuffle within same count
    const linesWithCounts = Array.from({ length: maxLines }, (_, i) => ({
      index: i,
      count: obstacleCounts[i],
    }));
    linesWithCounts.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return Math.random() - 0.5;
    });

    // Pick lines, prioritizing those with obstacles
    const selectedLines = linesWithCounts
      .slice(0, Math.min(lineCount, maxLines))
      .map(l => l.index);

    // Collect tiles and positions for obstacles
    const tilesToClear: Tile[] = [];
    const obstaclePositions: Position[] = [];

    for (const lineIndex of selectedLines) {
      if (useRows) {
        for (let col = 0; col < this.grid.cols; col++) {
          const cell = this.grid.getCell(lineIndex, col);
          if (cell?.tile) {
            tilesToClear.push(cell.tile);
          }
          if (cell?.obstacle) {
            obstaclePositions.push({ row: lineIndex, col });
          }
        }
      } else {
        for (let row = 0; row < this.grid.rows; row++) {
          const cell = this.grid.getCell(row, lineIndex);
          if (cell?.tile) {
            tilesToClear.push(cell.tile);
          }
          if (cell?.obstacle) {
            obstaclePositions.push({ row, col: lineIndex });
          }
        }
      }
    }

    this.callbacks.playSound('powerup');

    // Freeze effect on each line
    for (const lineIndex of selectedLines) {
      await this.createFreezeWave(lineIndex, useRows);
    }

    // Damage obstacles in frozen lines
    this.damageObstaclesAt(obstaclePositions);

    // Shatter effect
    await this.createShatterEffect(tilesToClear);

    // Clear tiles
    if (tilesToClear.length > 0) {
      await this.callbacks.clearTiles(tilesToClear);
    }
  }

  private async createFreezeWave(lineIndex: number, isRow: boolean): Promise<void> {
    if (isRow) {
      // Freeze wave across row
      const startPos = this.callbacks.cellToScreen(lineIndex, 0);
      const endPos = this.callbacks.cellToScreen(lineIndex, this.grid.cols - 1);

      const wave = this.scene.add.rectangle(
        startPos.x - 50,
        startPos.y,
        20,
        60,
        0x87ceeb,
        0.7
      );
      wave.setDepth(160);

      // Ice tint overlay for the row
      const overlay = this.scene.add.rectangle(
        (startPos.x + endPos.x) / 2,
        startPos.y,
        endPos.x - startPos.x + 80,
        60,
        0x87ceeb,
        0
      );
      overlay.setDepth(159);

      await new Promise<void>(resolve => {
        this.scene.tweens.add({
          targets: wave,
          x: endPos.x + 50,
          duration: 300,
          ease: 'Quad.easeOut',
          onUpdate: () => {
            // Create ice particles along the way
            if (Math.random() > 0.7) {
              this.callbacks.emitParticles(wave.x, wave.y, 0x87ceeb, 3);
            }
          },
          onComplete: () => {
            wave.destroy();
          },
        });

        this.scene.tweens.add({
          targets: overlay,
          alpha: 0.4,
          duration: 200,
          yoyo: true,
          onComplete: () => {
            overlay.destroy();
            resolve();
          },
        });
      });
    } else {
      // Freeze wave down column
      const startPos = this.callbacks.cellToScreen(0, lineIndex);
      const endPos = this.callbacks.cellToScreen(this.grid.rows - 1, lineIndex);

      const wave = this.scene.add.rectangle(
        startPos.x,
        startPos.y - 50,
        60,
        20,
        0x87ceeb,
        0.7
      );
      wave.setDepth(160);

      const overlay = this.scene.add.rectangle(
        startPos.x,
        (startPos.y + endPos.y) / 2,
        60,
        endPos.y - startPos.y + 80,
        0x87ceeb,
        0
      );
      overlay.setDepth(159);

      await new Promise<void>(resolve => {
        this.scene.tweens.add({
          targets: wave,
          y: endPos.y + 50,
          duration: 300,
          ease: 'Quad.easeOut',
          onUpdate: () => {
            if (Math.random() > 0.7) {
              this.callbacks.emitParticles(wave.x, wave.y, 0x87ceeb, 3);
            }
          },
          onComplete: () => {
            wave.destroy();
          },
        });

        this.scene.tweens.add({
          targets: overlay,
          alpha: 0.4,
          duration: 200,
          yoyo: true,
          onComplete: () => {
            overlay.destroy();
            resolve();
          },
        });
      });
    }

    this.callbacks.haptic('light');
  }

  private async createShatterEffect(tiles: Tile[]): Promise<void> {
    this.callbacks.shake('heavy');
    this.callbacks.haptic('heavy');

    // Create shatter particles for each tile
    for (const tile of tiles) {
      const pos = this.callbacks.cellToScreen(tile.row, tile.col);

      // Ice crystal shatter
      for (let i = 0; i < 4; i++) {
        const shard = this.scene.add.graphics();
        shard.setDepth(161);
        shard.fillStyle(0x87ceeb, 0.8);

        // Random triangle shard
        const size = 8 + Math.random() * 8;
        shard.fillTriangle(
          pos.x, pos.y - size,
          pos.x - size / 2, pos.y + size / 2,
          pos.x + size / 2, pos.y + size / 2
        );

        const angle = (i / 4) * Math.PI * 2;
        const distance = 30 + Math.random() * 20;

        this.scene.tweens.add({
          targets: shard,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          alpha: 0,
          rotation: Math.random() * Math.PI,
          duration: 300,
          onComplete: () => shard.destroy(),
        });
      }
    }

    // Brief pause for effect
    await new Promise<void>(resolve => {
      this.scene.time.delayedCall(150, resolve);
    });
  }

  getState(): HeroPowerBarState {
    return { ...this.state };
  }

  isActivating(): boolean {
    return this.state.isActivating;
  }

  isSelectionOpen(): boolean {
    return this.state.isSelectionOpen;
  }

  /**
   * Damage obstacles at the given positions
   * Returns the count of each obstacle type that was fully cleared
   */
  private damageObstaclesAt(positions: Position[]): Record<string, number> {
    const clearedByType: Record<string, number> = {};

    for (const pos of positions) {
      const cell = this.grid.getCell(pos.row, pos.col);
      if (!cell?.obstacle) continue;

      // Skip indestructible obstacles
      const behavior = getObstacleBehavior(cell.obstacle.type);
      if (behavior.isIndestructible) continue;

      const obstacleType = cell.obstacle.type;
      const clearedObstacle = this.grid.clearObstacle(pos.row, pos.col);

      if (clearedObstacle) {
        // Fully destroyed
        clearedByType[obstacleType] = (clearedByType[obstacleType] || 0) + 1;
        this.callbacks.removeObstacleSprite(pos.row, pos.col);
      } else if (cell.obstacle) {
        // Just damaged, update sprite to show reduced layers
        this.callbacks.updateObstacleSprite(pos.row, pos.col);
      }
    }

    // Update objectives
    if (Object.keys(clearedByType).length > 0) {
      this.callbacks.updateObstacleObjectives(clearedByType);
    }

    return clearedByType;
  }

  /**
   * Get positions with destructible obstacles (grass, ice, box, barrel, ice_bucket, chain)
   * These should be prioritized by hero powers
   */
  private getDestructibleObstaclePositions(): Position[] {
    const positions: Position[] = [];
    for (let row = 0; row < this.grid.rows; row++) {
      for (let col = 0; col < this.grid.cols; col++) {
        const cell = this.grid.getCell(row, col);
        if (cell?.obstacle) {
          const behavior = getObstacleBehavior(cell.obstacle.type);
          // Prioritize any destructible obstacle (including grass, ice, chain, box, etc.)
          if (!behavior.isIndestructible) {
            positions.push({ row, col });
          }
        }
      }
    }
    return positions;
  }

  destroy(): void {
    this.barContainer?.destroy();
    this.popupContainer?.destroy();
  }
}
