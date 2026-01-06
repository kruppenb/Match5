import Phaser from 'phaser';
import { Reward } from '../types';
import { getCurrencyManager } from '../meta/CurrencyManager';
import { MiniGameRewardPresenter, MiniGameTutorial } from './MiniGameRewardPresenter';

interface Pin {
  x: number;
  y: number;
  width: number;
  height: number;
  isVertical: boolean;
  pulled: boolean;
  sprite?: Phaser.GameObjects.Container;
}

interface GameEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'character' | 'treasure' | 'hazard';
  sprite?: Phaser.GameObjects.Container;
  radius: number;
}

interface Level {
  pins: Omit<Pin, 'pulled' | 'sprite'>[];
  entities: Omit<GameEntity, 'vx' | 'vy' | 'sprite'>[];
  safeZone: { x: number; y: number; width: number; height: number };
}

const GRAVITY = 0.3;
const LEVELS: Level[] = [
  {
    pins: [
      { x: 200, y: 300, width: 100, height: 12, isVertical: false },
      { x: 300, y: 450, width: 12, height: 80, isVertical: true },
    ],
    entities: [
      { x: 180, y: 250, type: 'character', radius: 20 },
      { x: 350, y: 250, type: 'treasure', radius: 15 },
      { x: 350, y: 400, type: 'hazard', radius: 18 },
    ],
    safeZone: { x: 150, y: 550, width: 200, height: 80 },
  },
  {
    pins: [
      { x: 150, y: 280, width: 80, height: 12, isVertical: false },
      { x: 280, y: 280, width: 80, height: 12, isVertical: false },
      { x: 230, y: 400, width: 12, height: 100, isVertical: true },
    ],
    entities: [
      { x: 170, y: 230, type: 'character', radius: 20 },
      { x: 300, y: 230, type: 'treasure', radius: 15 },
      { x: 170, y: 350, type: 'hazard', radius: 18 },
    ],
    safeZone: { x: 180, y: 550, width: 150, height: 80 },
  },
  {
    pins: [
      { x: 120, y: 250, width: 100, height: 12, isVertical: false },
      { x: 280, y: 250, width: 100, height: 12, isVertical: false },
      { x: 200, y: 380, width: 100, height: 12, isVertical: false },
      { x: 170, y: 320, width: 12, height: 60, isVertical: true },
    ],
    entities: [
      { x: 150, y: 200, type: 'character', radius: 20 },
      { x: 320, y: 200, type: 'treasure', radius: 15 },
      { x: 320, y: 330, type: 'hazard', radius: 18 },
      { x: 150, y: 430, type: 'hazard', radius: 18 },
    ],
    safeZone: { x: 175, y: 550, width: 150, height: 80 },
  },
];

export class PinPullScene extends Phaser.Scene {
  private currentLevel: number = 0;
  private pins: Pin[] = [];
  private entities: GameEntity[] = [];
  private safeZone!: { x: number; y: number; width: number; height: number };
  private isSimulating: boolean = false;
  private gameOver: boolean = false;
  private levelText!: Phaser.GameObjects.Text;
  private rewardPresenter!: MiniGameRewardPresenter;
  private tutorial!: MiniGameTutorial;
  private safeZoneSprite?: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: 'PinPullScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.rewardPresenter = new MiniGameRewardPresenter(this);
    this.tutorial = new MiniGameTutorial(this);

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a2a3a);

    // Title
    this.add.text(width / 2, 45, 'PIN PULL RESCUE', {
      fontSize: '26px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Level indicator
    this.levelText = this.add.text(width / 2, 85, `Level ${this.currentLevel + 1}`, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#aabbcc',
    }).setOrigin(0.5);

    // Instructions
    this.add.text(width / 2, 115, 'Pull pins to guide character to safety!', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#888888',
    }).setOrigin(0.5);

    // Load level
    this.loadLevel(this.currentLevel);

    // Back button
    this.createBackButton();

    // Tutorial
    this.tutorial.showIfFirstTime('pin_pull', 'Pin Pull Rescue', [
      'Tap pins to remove them',
      'Guide the character to the green safe zone',
      'Avoid hazards (red) along the way',
      'Collect treasure for bonus points!',
    ]);
  }

  update(): void {
    if (this.isSimulating && !this.gameOver) {
      this.simulatePhysics();
    }
  }

  private loadLevel(levelIndex: number): void {
    const level = LEVELS[levelIndex % LEVELS.length];

    // Clear existing
    this.pins.forEach(p => p.sprite?.destroy());
    this.entities.forEach(e => e.sprite?.destroy());
    this.safeZoneSprite?.destroy();

    this.pins = [];
    this.entities = [];
    this.isSimulating = false;
    this.gameOver = false;

    // Create safe zone
    this.safeZone = { ...level.safeZone };
    this.safeZoneSprite = this.add.rectangle(
      this.safeZone.x + this.safeZone.width / 2,
      this.safeZone.y + this.safeZone.height / 2,
      this.safeZone.width,
      this.safeZone.height,
      0x44ff44,
      0.3
    );
    this.safeZoneSprite.setStrokeStyle(3, 0x44ff44);

    // Safe zone label
    this.add.text(
      this.safeZone.x + this.safeZone.width / 2,
      this.safeZone.y + this.safeZone.height / 2,
      'SAFE',
      { fontSize: '16px', fontFamily: 'Arial Bold', color: '#44ff44' }
    ).setOrigin(0.5);

    // Create pins
    level.pins.forEach(pinDef => {
      const pin: Pin = { ...pinDef, pulled: false };
      this.createPinSprite(pin);
      this.pins.push(pin);
    });

    // Create entities
    level.entities.forEach(entDef => {
      const entity: GameEntity = { ...entDef, vx: 0, vy: 0 };
      this.createEntitySprite(entity);
      this.entities.push(entity);
    });

    this.levelText.setText(`Level ${levelIndex + 1}`);
  }

  private createPinSprite(pin: Pin): void {
    const container = this.add.container(pin.x + pin.width / 2, pin.y + pin.height / 2);

    // Pin body
    const body = this.add.rectangle(0, 0, pin.width, pin.height, 0x888888);
    body.setStrokeStyle(2, 0xaaaaaa);
    container.add(body);

    // Pin head (circle at end)
    const headX = pin.isVertical ? 0 : pin.width / 2 + 8;
    const headY = pin.isVertical ? -pin.height / 2 - 8 : 0;
    const head = this.add.circle(headX, headY, 12, 0xdd4444);
    head.setStrokeStyle(2, 0xaa2222);
    container.add(head);

    // Make interactive
    const hitArea = this.add.rectangle(0, 0, pin.width + 30, pin.height + 30, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => this.pullPin(pin));
    container.add(hitArea);

    pin.sprite = container;
  }

  private createEntitySprite(entity: GameEntity): void {
    const container = this.add.container(entity.x, entity.y);

    if (entity.type === 'character') {
      // Character - blue person
      const body = this.add.circle(0, 5, 15, 0x4488ff);
      body.setStrokeStyle(2, 0x2266dd);
      container.add(body);

      const head = this.add.circle(0, -12, 10, 0xffcc99);
      head.setStrokeStyle(2, 0xddaa77);
      container.add(head);

      // Eyes
      container.add(this.add.circle(-3, -14, 2, 0x000000));
      container.add(this.add.circle(3, -14, 2, 0x000000));
    } else if (entity.type === 'treasure') {
      // Treasure - golden coin/gem
      const glow = this.add.circle(0, 0, entity.radius + 5, 0xffd700, 0.3);
      container.add(glow);

      const coin = this.add.circle(0, 0, entity.radius, 0xffd700);
      coin.setStrokeStyle(2, 0xb8860b);
      container.add(coin);

      const shine = this.add.circle(-3, -3, 5, 0xffec8b);
      container.add(shine);

      // $ symbol
      container.add(this.add.text(0, 0, '$', {
        fontSize: '14px',
        fontFamily: 'Arial Black',
        color: '#b8860b',
      }).setOrigin(0.5));
    } else if (entity.type === 'hazard') {
      // Hazard - red spiky danger
      const danger = this.add.circle(0, 0, entity.radius, 0xff4444);
      danger.setStrokeStyle(3, 0xaa0000);
      container.add(danger);

      // Spikes
      const spikes = this.add.graphics();
      spikes.fillStyle(0xff4444, 1);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x1 = Math.cos(angle) * entity.radius;
        const y1 = Math.sin(angle) * entity.radius;
        const x2 = Math.cos(angle) * (entity.radius + 8);
        const y2 = Math.sin(angle) * (entity.radius + 8);
        spikes.fillTriangle(
          x1 - 4 * Math.sin(angle), y1 + 4 * Math.cos(angle),
          x1 + 4 * Math.sin(angle), y1 - 4 * Math.cos(angle),
          x2, y2
        );
      }
      container.add(spikes);

      // X mark
      container.add(this.add.text(0, 0, 'X', {
        fontSize: '16px',
        fontFamily: 'Arial Black',
        color: '#ffffff',
      }).setOrigin(0.5));
    }

    entity.sprite = container;
  }

  private pullPin(pin: Pin): void {
    if (pin.pulled || this.gameOver) return;

    pin.pulled = true;

    // Animate pin being pulled out
    const pullDirection = pin.isVertical ? { y: -100 } : { x: 150 };

    this.tweens.add({
      targets: pin.sprite,
      ...pullDirection,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        pin.sprite?.destroy();
      },
    });

    // Start simulation if not already running
    if (!this.isSimulating) {
      this.isSimulating = true;
    }
  }

  private simulatePhysics(): void {
    const dt = 1;

    this.entities.forEach(entity => {
      // Apply gravity
      entity.vy += GRAVITY * dt;

      // Proposed new position
      let newX = entity.x + entity.vx * dt;
      let newY = entity.y + entity.vy * dt;

      // Check collision with pins
      this.pins.forEach(pin => {
        if (pin.pulled) return;

        const collision = this.checkCircleRectCollision(
          newX, newY, entity.radius,
          pin.x, pin.y, pin.width, pin.height
        );

        if (collision) {
          if (pin.isVertical) {
            // Vertical pin - stop horizontal movement
            if (entity.vx > 0 && entity.x < pin.x) {
              newX = pin.x - entity.radius;
              entity.vx = 0;
            } else if (entity.vx < 0 && entity.x > pin.x + pin.width) {
              newX = pin.x + pin.width + entity.radius;
              entity.vx = 0;
            }
          } else {
            // Horizontal pin - stop vertical movement, slide
            if (entity.vy > 0 && entity.y < pin.y) {
              newY = pin.y - entity.radius;
              entity.vy = 0;
              // Add some friction/sliding
              entity.vx *= 0.98;
            }
          }
        }
      });

      // Wall boundaries
      const { width } = this.scale;
      if (newX - entity.radius < 50) {
        newX = 50 + entity.radius;
        entity.vx = -entity.vx * 0.5;
      }
      if (newX + entity.radius > width - 50) {
        newX = width - 50 - entity.radius;
        entity.vx = -entity.vx * 0.5;
      }

      // Update position
      entity.x = newX;
      entity.y = newY;

      // Update sprite
      if (entity.sprite) {
        entity.sprite.setPosition(entity.x, entity.y);
      }
    });

    // Check win/lose conditions
    this.checkGameEnd();
  }

  private checkCircleRectCollision(
    cx: number, cy: number, cr: number,
    rx: number, ry: number, rw: number, rh: number
  ): boolean {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) < (cr * cr);
  }

  private checkGameEnd(): void {
    const character = this.entities.find(e => e.type === 'character');
    if (!character) return;

    // Check if character reached safe zone
    if (this.isInSafeZone(character)) {
      this.handleWin();
      return;
    }

    // Check collision with hazards
    const hazards = this.entities.filter(e => e.type === 'hazard');
    for (const hazard of hazards) {
      const dx = character.x - hazard.x;
      const dy = character.y - hazard.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < character.radius + hazard.radius) {
        this.handleLose('Hit a hazard!');
        return;
      }
    }

    // Check if fallen off screen
    if (character.y > this.scale.height + 50) {
      this.handleLose('Fell off the screen!');
    }
  }

  private isInSafeZone(entity: GameEntity): boolean {
    return (
      entity.x > this.safeZone.x &&
      entity.x < this.safeZone.x + this.safeZone.width &&
      entity.y > this.safeZone.y &&
      entity.y < this.safeZone.y + this.safeZone.height
    );
  }

  private handleWin(): void {
    this.gameOver = true;
    this.isSimulating = false;

    // Check if treasure was collected
    const treasure = this.entities.find(e => e.type === 'treasure');
    const treasureCollected = treasure && this.isInSafeZone(treasure);

    // Calculate rewards
    const rewards: Reward[] = [];
    const baseCoins = 100 + this.currentLevel * 50;
    rewards.push({ type: 'coins', amount: baseCoins });

    if (treasureCollected) {
      rewards.push({ type: 'coins', amount: 100 });
      rewards.push({ type: 'diamonds', amount: 3 });
    }

    // Award rewards
    rewards.forEach(reward => {
      getCurrencyManager().awardReward(reward, 'pin_pull');
    });

    // Check if more levels
    if (this.currentLevel < LEVELS.length - 1) {
      this.time.delayedCall(1000, () => {
        this.currentLevel++;
        this.loadLevel(this.currentLevel);
      });
    } else {
      // All levels complete
      this.time.delayedCall(500, () => {
        this.rewardPresenter.show({
          won: true,
          rewards,
          message: treasureCollected ? 'Rescued with treasure!' : 'Character rescued!',
        });
      });
    }
  }

  private handleLose(message: string): void {
    this.gameOver = true;
    this.isSimulating = false;

    this.time.delayedCall(500, () => {
      this.rewardPresenter.show({
        won: false,
        rewards: [],
        message,
      });
    });
  }

  private createBackButton(): void {
    const backBtn = this.add.rectangle(60, 45, 100, 40, 0x4a4a5e)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backBtn.setFillStyle(0x5a5a6e))
      .on('pointerout', () => backBtn.setFillStyle(0x4a4a5e))
      .on('pointerdown', () => this.scene.start('MiniGameHubScene'));

    this.add.text(60, 45, '< Back', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
  }
}
