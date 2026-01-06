import Phaser from 'phaser';
import { Reward } from '../types';
import { getCurrencyManager } from '../meta/CurrencyManager';
import { MiniGameRewardPresenter, MiniGameTutorial } from './MiniGameRewardPresenter';

interface Block {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'wood' | 'stone' | 'glass' | 'target';
  health: number;
  body?: Phaser.Physics.Arcade.Image;
  destroyed: boolean;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  sprite?: Phaser.GameObjects.Container;
}

const GRAVITY = 0.4;
const SLINGSHOT_X = 80;
const SLINGSHOT_Y = 500;
const MAX_SHOTS = 5;

export class SlingshotScene extends Phaser.Scene {
  private blocks: Block[] = [];
  private projectile?: Projectile;
  private shotsRemaining: number = MAX_SHOTS;
  private targetsRemaining: number = 0;
  private score: number = 0;
  private isDragging: boolean = false;
  private aimLine?: Phaser.GameObjects.Graphics;
  private shotsText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private rewardPresenter!: MiniGameRewardPresenter;
  private tutorial!: MiniGameTutorial;
  private gameOver: boolean = false;
  private projectileReady: boolean = true;
  private slingshotSprite?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'SlingshotScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.rewardPresenter = new MiniGameRewardPresenter(this);
    this.tutorial = new MiniGameTutorial(this);

    // Reset state
    this.shotsRemaining = MAX_SHOTS;
    this.score = 0;
    this.gameOver = false;
    this.projectileReady = true;
    this.blocks = [];

    // Sky background
    const skyGradient = this.add.graphics();
    skyGradient.fillGradientStyle(0x87ceeb, 0x87ceeb, 0x4a90d9, 0x4a90d9);
    skyGradient.fillRect(0, 0, width, height);

    // Ground
    this.add.rectangle(width / 2, height - 30, width, 60, 0x44aa44);
    this.add.rectangle(width / 2, height - 58, width, 4, 0x338833);

    // Title
    this.add.text(width / 2, 35, 'SLINGSHOT KNOCKOUT', {
      fontSize: '22px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // UI
    const uiBg = this.add.graphics();
    uiBg.fillStyle(0x000000, 0.4);
    uiBg.fillRoundedRect(width / 2 - 120, 55, 240, 35, 17);

    this.shotsText = this.add.text(width / 2 - 60, 72, `Shots: ${this.shotsRemaining}`, {
      fontSize: '14px',
      fontFamily: 'Arial Bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.scoreText = this.add.text(width / 2 + 60, 72, `Score: ${this.score}`, {
      fontSize: '14px',
      fontFamily: 'Arial Bold',
      color: '#ffd700',
    }).setOrigin(0.5);

    // Create slingshot
    this.createSlingshot();

    // Create level
    this.createLevel();

    // Aim line
    this.aimLine = this.add.graphics();

    // Input
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);

    // Back button
    this.createBackButton();

    // Tutorial
    this.tutorial.showIfFirstTime('slingshot', 'Slingshot Knockout', [
      'Drag back from the slingshot to aim',
      'Release to fire!',
      'Hit the red targets to win',
      'Destroy blocks for bonus points!',
    ]);
  }

  update(): void {
    if (this.projectile?.active) {
      this.updateProjectile();
      this.checkCollisions();
    }
  }

  private createSlingshot(): void {
    this.slingshotSprite = this.add.container(SLINGSHOT_X, SLINGSHOT_Y);

    // Slingshot base
    const base = this.add.graphics();
    base.fillStyle(0x8b4513, 1);
    base.fillRect(-8, -60, 16, 80);
    base.fillRect(-20, 10, 40, 15);
    this.slingshotSprite.add(base);

    // Fork
    const fork = this.add.graphics();
    fork.fillStyle(0x654321, 1);
    fork.fillRect(-25, -80, 10, 30);
    fork.fillRect(15, -80, 10, 30);
    this.slingshotSprite.add(fork);

    // Rubber band will be drawn dynamically
  }

  private createLevel(): void {
    const { width } = this.scale;
    const structureX = width - 150;
    const groundY = this.scale.height - 60;

    // Create a simple structure with targets
    const structure: Omit<Block, 'body' | 'destroyed'>[] = [
      // Base layer
      { x: structureX - 40, y: groundY - 25, width: 20, height: 50, type: 'wood', health: 2 },
      { x: structureX + 40, y: groundY - 25, width: 20, height: 50, type: 'wood', health: 2 },

      // Platform
      { x: structureX, y: groundY - 60, width: 120, height: 15, type: 'wood', health: 2 },

      // Second layer
      { x: structureX - 25, y: groundY - 85, width: 15, height: 40, type: 'glass', health: 1 },
      { x: structureX + 25, y: groundY - 85, width: 15, height: 40, type: 'glass', health: 1 },

      // Top platform
      { x: structureX, y: groundY - 115, width: 80, height: 15, type: 'wood', health: 2 },

      // Targets
      { x: structureX, y: groundY - 35, width: 30, height: 30, type: 'target', health: 1 },
      { x: structureX, y: groundY - 140, width: 25, height: 25, type: 'target', health: 1 },
    ];

    this.targetsRemaining = 0;

    structure.forEach(blockDef => {
      const block: Block = { ...blockDef, destroyed: false };
      this.createBlockSprite(block);
      this.blocks.push(block);

      if (block.type === 'target') {
        this.targetsRemaining++;
      }
    });
  }

  private createBlockSprite(block: Block): void {
    const sprite = this.add.graphics();

    let color: number;
    let borderColor: number;

    switch (block.type) {
      case 'wood':
        color = 0xa0522d;
        borderColor = 0x8b4513;
        break;
      case 'glass':
        color = 0x88ccff;
        borderColor = 0x66aadd;
        break;
      case 'stone':
        color = 0x888888;
        borderColor = 0x666666;
        break;
      case 'target':
        color = 0xff4444;
        borderColor = 0xcc2222;
        break;
      default:
        color = 0x888888;
        borderColor = 0x666666;
    }

    sprite.fillStyle(color, block.type === 'glass' ? 0.7 : 1);
    sprite.fillRoundedRect(
      block.x - block.width / 2,
      block.y - block.height / 2,
      block.width,
      block.height,
      block.type === 'target' ? block.width / 2 : 3
    );
    sprite.lineStyle(2, borderColor, 1);
    sprite.strokeRoundedRect(
      block.x - block.width / 2,
      block.y - block.height / 2,
      block.width,
      block.height,
      block.type === 'target' ? block.width / 2 : 3
    );

    // Target face
    if (block.type === 'target') {
      // Eyes
      this.add.circle(block.x - 6, block.y - 4, 4, 0xffffff);
      this.add.circle(block.x + 6, block.y - 4, 4, 0xffffff);
      this.add.circle(block.x - 6, block.y - 4, 2, 0x000000);
      this.add.circle(block.x + 6, block.y - 4, 2, 0x000000);

      // Worried mouth
      const mouth = this.add.graphics();
      mouth.lineStyle(2, 0x000000, 1);
      mouth.beginPath();
      mouth.arc(block.x, block.y + 8, 6, 0.2, Math.PI - 0.2, false);
      mouth.stroke();
    }

    // Wood grain
    if (block.type === 'wood') {
      const grain = this.add.graphics();
      grain.lineStyle(1, 0x8b4513, 0.3);
      for (let i = 0; i < 3; i++) {
        const y = block.y - block.height / 2 + (i + 1) * (block.height / 4);
        grain.lineBetween(
          block.x - block.width / 2 + 3,
          y,
          block.x + block.width / 2 - 3,
          y
        );
      }
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.gameOver || !this.projectileReady || this.shotsRemaining <= 0) return;

    const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, SLINGSHOT_X, SLINGSHOT_Y);
    if (dist < 80) {
      this.isDragging = true;
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging) return;

    // Limit drag distance
    const dx = SLINGSHOT_X - pointer.x;
    const dy = SLINGSHOT_Y - pointer.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 100;

    let aimX = pointer.x;
    let aimY = pointer.y;

    if (dist > maxDist) {
      aimX = SLINGSHOT_X - (dx / dist) * maxDist;
      aimY = SLINGSHOT_Y - (dy / dist) * maxDist;
    }

    // Draw aim line and rubber band
    this.aimLine?.clear();
    this.aimLine?.lineStyle(4, 0x8b4513, 1);
    this.aimLine?.lineBetween(SLINGSHOT_X - 20, SLINGSHOT_Y - 70, aimX, aimY);
    this.aimLine?.lineBetween(SLINGSHOT_X + 20, SLINGSHOT_Y - 70, aimX, aimY);

    // Draw projectile preview
    this.aimLine?.fillStyle(0xffaa00, 1);
    this.aimLine?.fillCircle(aimX, aimY, 15);
    this.aimLine?.fillStyle(0xffcc44, 1);
    this.aimLine?.fillCircle(aimX - 3, aimY - 3, 5);

    // Draw trajectory preview
    this.aimLine?.lineStyle(2, 0xffffff, 0.5);
    const power = dist * 0.15;
    const angle = Math.atan2(dy, dx);
    let px = SLINGSHOT_X;
    let py = SLINGSHOT_Y - 30;
    let pvx = Math.cos(angle) * power;
    let pvy = Math.sin(angle) * power;

    for (let t = 0; t < 30; t++) {
      const nextX = px + pvx * 3;
      const nextY = py + pvy * 3;
      pvy += GRAVITY * 3;

      if (t % 2 === 0) {
        this.aimLine?.fillStyle(0xffffff, 0.5);
        this.aimLine?.fillCircle(nextX, nextY, 3);
      }

      px = nextX;
      py = nextY;

      if (py > this.scale.height - 60) break;
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.aimLine?.clear();

    // Calculate launch velocity
    const dx = SLINGSHOT_X - pointer.x;
    const dy = SLINGSHOT_Y - pointer.y;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 100);

    if (dist < 20) return; // Too weak, cancel

    const power = dist * 0.15;
    const angle = Math.atan2(dy, dx);

    // Create and launch projectile
    this.launchProjectile(power, angle);
  }

  private launchProjectile(power: number, angle: number): void {
    this.projectileReady = false;
    this.shotsRemaining--;
    this.shotsText.setText(`Shots: ${this.shotsRemaining}`);

    this.projectile = {
      x: SLINGSHOT_X,
      y: SLINGSHOT_Y - 30,
      vx: Math.cos(angle) * power,
      vy: Math.sin(angle) * power,
      active: true,
    };

    // Create projectile sprite
    const container = this.add.container(this.projectile.x, this.projectile.y);

    const ball = this.add.circle(0, 0, 15, 0xffaa00);
    ball.setStrokeStyle(2, 0xcc8800);
    container.add(ball);

    const highlight = this.add.circle(-4, -4, 5, 0xffcc44);
    container.add(highlight);

    // Angry face
    container.add(this.add.circle(-5, -2, 3, 0x000000));
    container.add(this.add.circle(5, -2, 3, 0x000000));
    const mouth = this.add.graphics();
    mouth.lineStyle(2, 0x000000, 1);
    mouth.lineBetween(-5, 6, 5, 6);
    container.add(mouth);

    this.projectile.sprite = container;
  }

  private updateProjectile(): void {
    if (!this.projectile) return;

    // Apply gravity
    this.projectile.vy += GRAVITY;

    // Update position
    this.projectile.x += this.projectile.vx;
    this.projectile.y += this.projectile.vy;

    // Update sprite
    if (this.projectile.sprite) {
      this.projectile.sprite.setPosition(this.projectile.x, this.projectile.y);
      this.projectile.sprite.setRotation(this.projectile.sprite.rotation + 0.1);
    }

    // Check bounds
    if (
      this.projectile.y > this.scale.height - 45 ||
      this.projectile.x > this.scale.width + 50 ||
      this.projectile.x < -50
    ) {
      this.endShot();
    }
  }

  private checkCollisions(): void {
    if (!this.projectile) return;

    for (const block of this.blocks) {
      if (block.destroyed) continue;

      // Simple AABB + circle collision
      const closestX = Math.max(block.x - block.width / 2, Math.min(this.projectile.x, block.x + block.width / 2));
      const closestY = Math.max(block.y - block.height / 2, Math.min(this.projectile.y, block.y + block.height / 2));
      const distX = this.projectile.x - closestX;
      const distY = this.projectile.y - closestY;
      const dist = Math.sqrt(distX * distX + distY * distY);

      if (dist < 15) {
        // Hit!
        this.hitBlock(block);

        // Bounce projectile
        if (Math.abs(distX) > Math.abs(distY)) {
          this.projectile.vx *= -0.5;
        } else {
          this.projectile.vy *= -0.5;
        }
        this.projectile.vx *= 0.8;
        this.projectile.vy *= 0.8;
      }
    }
  }

  private hitBlock(block: Block): void {
    block.health--;

    // Visual feedback
    this.cameras.main.shake(50, 0.01);

    if (block.health <= 0) {
      block.destroyed = true;

      // Score based on type
      let points = 0;
      switch (block.type) {
        case 'target':
          points = 500;
          this.targetsRemaining--;
          break;
        case 'glass':
          points = 50;
          break;
        case 'wood':
          points = 100;
          break;
        case 'stone':
          points = 200;
          break;
      }

      this.score += points;
      this.scoreText.setText(`Score: ${this.score}`);

      // Destruction effect
      this.createDestructionEffect(block);

      // Check win
      if (this.targetsRemaining <= 0) {
        this.handleWin();
      }
    }
  }

  private createDestructionEffect(block: Block): void {
    const color = block.type === 'target' ? 0xff4444 :
      block.type === 'glass' ? 0x88ccff :
        block.type === 'wood' ? 0xa0522d : 0x888888;

    for (let i = 0; i < 8; i++) {
      const particle = this.add.rectangle(
        block.x + (Math.random() - 0.5) * block.width,
        block.y + (Math.random() - 0.5) * block.height,
        8 + Math.random() * 8,
        8 + Math.random() * 8,
        color
      );

      this.tweens.add({
        targets: particle,
        x: particle.x + (Math.random() - 0.5) * 100,
        y: particle.y + Math.random() * 80 + 20,
        angle: Math.random() * 360,
        alpha: 0,
        scale: 0,
        duration: 600,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }

    // Score popup
    const scorePopup = this.add.text(block.x, block.y, `+${block.type === 'target' ? 500 : block.type === 'wood' ? 100 : 50}`, {
      fontSize: '20px',
      fontFamily: 'Arial Black',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: scorePopup,
      y: block.y - 50,
      alpha: 0,
      duration: 800,
      onComplete: () => scorePopup.destroy(),
    });
  }

  private endShot(): void {
    if (!this.projectile) return;

    this.projectile.active = false;
    this.projectile.sprite?.destroy();
    this.projectile = undefined;

    // Check if out of shots
    if (this.shotsRemaining <= 0 && this.targetsRemaining > 0) {
      this.time.delayedCall(500, () => this.handleLose());
    } else if (this.targetsRemaining > 0) {
      this.projectileReady = true;
    }
  }

  private handleWin(): void {
    this.gameOver = true;
    this.projectile?.sprite?.destroy();

    const rewards: Reward[] = [];
    rewards.push({ type: 'coins', amount: this.score });

    const bonusDiamonds = this.shotsRemaining * 2;
    if (bonusDiamonds > 0) {
      rewards.push({ type: 'diamonds', amount: bonusDiamonds });
    }

    rewards.forEach(reward => {
      getCurrencyManager().awardReward(reward, 'slingshot');
    });

    this.time.delayedCall(500, () => {
      this.rewardPresenter.show({
        won: true,
        rewards,
        message: `All targets destroyed! ${this.shotsRemaining} shots remaining.`,
      });
    });
  }

  private handleLose(): void {
    this.gameOver = true;

    const rewards: Reward[] = [];
    if (this.score > 0) {
      rewards.push({ type: 'coins', amount: Math.floor(this.score / 2) });
      rewards.forEach(reward => {
        getCurrencyManager().awardReward(reward, 'slingshot');
      });
    }

    this.rewardPresenter.show({
      won: false,
      rewards,
      message: `${this.targetsRemaining} targets remaining!`,
    });
  }

  private createBackButton(): void {
    const backBtn = this.add.rectangle(60, 35, 100, 40, 0x4a4a5e)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backBtn.setFillStyle(0x5a5a6e))
      .on('pointerout', () => backBtn.setFillStyle(0x4a4a5e))
      .on('pointerdown', () => this.scene.start('MiniGameHubScene'));

    this.add.text(60, 35, '< Back', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
  }
}
