import Phaser from 'phaser';
import { CONFIG } from '../config';
import { HeroType, HeroPowerBarState, Position, Tile } from '../types';
import { Grid } from './Grid';

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
  private readonly barWidth = 160;
  private readonly barHeight = 20;

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
    this.barX = CONFIG.SCREEN.WIDTH / 2;
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
    this.heroIcon = this.scene.add.text(-this.barWidth / 2 + 14, this.barHeight / 2, '⚡', {
      fontSize: '14px',
    }).setOrigin(0.5);
    this.barContainer.add(this.heroIcon);

    // Charge percentage text
    this.chargeText = this.scene.add.text(this.barWidth / 2 - 8, this.barHeight / 2, '0%', {
      fontSize: '11px',
      fontFamily: 'Arial Bold',
      color: '#ffffff',
    }).setOrigin(1, 0.5);
    this.barContainer.add(this.chargeText);

    // "READY!" text (hidden until full)
    this.readyText = this.scene.add.text(0, this.barHeight / 2, 'READY!', {
      fontSize: '12px',
      fontFamily: 'Arial Black',
      color: '#ffaa00',
      stroke: '#000000',
      strokeThickness: 2,
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

  addCharge(tilesCleared: number, cascadeLevel: number = 0, powerupActivated: boolean = false): void {
    if (this.state.isReady || this.state.isActivating) return;

    let chargeGain = tilesCleared * CONFIG.HERO_POWERS.CHARGE_PER_TILE;

    if (cascadeLevel > 0) {
      chargeGain += cascadeLevel * CONFIG.HERO_POWERS.CHARGE_PER_CASCADE;
    }

    if (powerupActivated) {
      chargeGain += CONFIG.HERO_POWERS.CHARGE_PER_POWERUP;
    }

    this.state.currentCharge = Math.min(
      CONFIG.HERO_POWERS.MAX_CHARGE,
      this.state.currentCharge + chargeGain
    );

    this.updateBarVisual();
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

    // Get random tile positions
    const validPositions: Position[] = [];
    for (let row = 0; row < this.grid.rows; row++) {
      for (let col = 0; col < this.grid.cols; col++) {
        const cell = this.grid.getCell(row, col);
        if (cell && cell.tile && !cell.blocked) {
          validPositions.push({ row, col });
        }
      }
    }

    // Shuffle and pick strike positions
    const shuffled = validPositions.sort(() => Math.random() - 0.5);
    const strikePositions = shuffled.slice(0, Math.min(strikeCount, shuffled.length));

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

    // Get random target positions (avoiding duplicates)
    const validPositions: Position[] = [];
    for (let row = 0; row < this.grid.rows - 1; row++) {
      for (let col = 0; col < this.grid.cols - 1; col++) {
        validPositions.push({ row, col });
      }
    }

    const shuffled = validPositions.sort(() => Math.random() - 0.5);
    const targetPositions = shuffled.slice(0, missileCount);

    // Collect all tiles in explosion areas
    const tilesToClear: Set<string> = new Set();
    const allTiles: Tile[] = [];

    for (const target of targetPositions) {
      for (let dr = 0; dr < explosionSize; dr++) {
        for (let dc = 0; dc < explosionSize; dc++) {
          const row = target.row + dr;
          const col = target.col + dc;
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

    // Randomly choose rows or columns
    const useRows = Math.random() > 0.5;
    const maxLines = useRows ? this.grid.rows : this.grid.cols;

    // Pick random lines
    const allLines = Array.from({ length: maxLines }, (_, i) => i);
    const shuffled = allLines.sort(() => Math.random() - 0.5);
    const selectedLines = shuffled.slice(0, Math.min(lineCount, maxLines));

    // Collect tiles
    const tilesToClear: Tile[] = [];

    for (const lineIndex of selectedLines) {
      if (useRows) {
        for (let col = 0; col < this.grid.cols; col++) {
          const cell = this.grid.getCell(lineIndex, col);
          if (cell?.tile) {
            tilesToClear.push(cell.tile);
          }
        }
      } else {
        for (let row = 0; row < this.grid.rows; row++) {
          const cell = this.grid.getCell(row, lineIndex);
          if (cell?.tile) {
            tilesToClear.push(cell.tile);
          }
        }
      }
    }

    this.callbacks.playSound('powerup');

    // Freeze effect on each line
    for (const lineIndex of selectedLines) {
      await this.createFreezeWave(lineIndex, useRows);
    }

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

  destroy(): void {
    this.barContainer?.destroy();
    this.popupContainer?.destroy();
  }
}
