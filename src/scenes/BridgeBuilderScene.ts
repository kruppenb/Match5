import Phaser from 'phaser';
import { Reward } from '../types';
import { getCurrencyManager } from '../meta/CurrencyManager';
import { MiniGameRewardPresenter, MiniGameTutorial } from './MiniGameRewardPresenter';

interface Platform {
  x: number;
  width: number;
  sprite?: Phaser.GameObjects.Rectangle;
}

const PLATFORM_HEIGHT = 200;
const PLATFORM_Y_BASE = 550;
const BRIDGE_GROW_SPEED = 3;
const CHARACTER_SPEED = 4;
const PERFECT_THRESHOLD = 8;

export class BridgeBuilderScene extends Phaser.Scene {
  private platforms: Platform[] = [];
  private currentPlatformIndex: number = 0;
  private bridgeLength: number = 0;
  private isGrowing: boolean = false;
  private isAnimating: boolean = false;
  private bridge?: Phaser.GameObjects.Rectangle;
  private character?: Phaser.GameObjects.Container;
  private scoreText!: Phaser.GameObjects.Text;
  private score: number = 0;
  private perfectCount: number = 0;
  private rewardPresenter!: MiniGameRewardPresenter;
  private tutorial!: MiniGameTutorial;
  private gameOver: boolean = false;
  private platformContainer!: Phaser.GameObjects.Container;
  private instructionText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'BridgeBuilderScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.rewardPresenter = new MiniGameRewardPresenter(this);
    this.tutorial = new MiniGameTutorial(this);

    // Sky background gradient
    const skyGradient = this.add.graphics();
    skyGradient.fillGradientStyle(0x1a1a4e, 0x1a1a4e, 0x2a3a6e, 0x2a3a6e);
    skyGradient.fillRect(0, 0, width, height);

    // Distant mountains/city silhouette
    this.drawBackgroundScenery();

    // Platform container (for scrolling)
    this.platformContainer = this.add.container(0, 0);

    // Initialize game state
    this.currentPlatformIndex = 0;
    this.score = 0;
    this.perfectCount = 0;
    this.gameOver = false;
    this.isAnimating = false;
    this.isGrowing = false;
    this.bridgeLength = 0;

    // Create initial platforms
    this.platforms = [];
    this.createPlatform(80, 100); // First platform (player starts here)
    this.createNextPlatform();

    // Create character
    this.createCharacter();

    // UI
    this.createUI();

    // Input
    this.input.on('pointerdown', () => this.onPointerDown());
    this.input.on('pointerup', () => this.onPointerUp());

    // Back button
    this.createBackButton();

    // Instruction text
    this.instructionText = this.add.text(width / 2, height / 2 - 100, 'Hold to build bridge!', {
      fontSize: '20px',
      fontFamily: 'Arial Bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0.8);

    // Fade out instruction after a moment
    this.time.delayedCall(2000, () => {
      if (this.instructionText) {
        this.tweens.add({
          targets: this.instructionText,
          alpha: 0,
          duration: 500,
        });
      }
    });

    // Show tutorial
    this.tutorial.showIfFirstTime('bridge_builder', 'Bridge Builder', [
      'Hold to extend the bridge',
      'Release to drop it',
      'Reach the next platform!',
      'Perfect landings = bonus points!',
    ]);
  }

  update(): void {
    if (this.isGrowing && !this.gameOver && !this.isAnimating) {
      this.bridgeLength += BRIDGE_GROW_SPEED;
      this.updateBridge();
    }
  }

  private drawBackgroundScenery(): void {
    const { width, height } = this.scale;
    const g = this.add.graphics();

    // Distant buildings silhouette
    g.fillStyle(0x0a0a2e, 1);
    for (let i = 0; i < 15; i++) {
      const bx = i * 50 - 25;
      const bw = 30 + Math.random() * 40;
      const bh = 80 + Math.random() * 150;
      g.fillRect(bx, height - PLATFORM_HEIGHT - bh, bw, bh);
    }

    // Stars
    for (let i = 0; i < 30; i++) {
      const sx = Math.random() * width;
      const sy = Math.random() * (height - PLATFORM_HEIGHT - 100);
      const size = 1 + Math.random() * 2;
      g.fillStyle(0xffffff, 0.3 + Math.random() * 0.5);
      g.fillCircle(sx, sy, size);
    }
  }

  private createPlatform(x: number, platformWidth: number): void {
    const platform: Platform = {
      x,
      width: platformWidth,
    };

    // Platform base
    const platformSprite = this.add.rectangle(
      x + platformWidth / 2,
      PLATFORM_Y_BASE + PLATFORM_HEIGHT / 2,
      platformWidth,
      PLATFORM_HEIGHT,
      0x3a4a5e
    );
    platformSprite.setStrokeStyle(3, 0x5a6a7e);

    // Platform top highlight
    const topHighlight = this.add.rectangle(
      x + platformWidth / 2,
      PLATFORM_Y_BASE + 5,
      platformWidth - 4,
      10,
      0x5a6a7e
    );

    // Perfect landing zone indicator (small red area in center)
    if (this.platforms.length > 0) {
      const perfectZone = this.add.rectangle(
        x + platformWidth / 2,
        PLATFORM_Y_BASE - 2,
        PERFECT_THRESHOLD * 2,
        4,
        0xff4444
      );
      this.platformContainer.add(perfectZone);
    }

    this.platformContainer.add(platformSprite);
    this.platformContainer.add(topHighlight);
    platform.sprite = platformSprite;

    this.platforms.push(platform);
  }

  private createNextPlatform(): void {
    const lastPlatform = this.platforms[this.platforms.length - 1];
    const gap = 60 + Math.random() * 120; // Random gap
    const newWidth = 50 + Math.random() * 80; // Random width
    const newX = lastPlatform.x + lastPlatform.width + gap;

    this.createPlatform(newX, newWidth);
  }

  private createCharacter(): void {
    const currentPlatform = this.platforms[this.currentPlatformIndex];
    const charX = currentPlatform.x + currentPlatform.width - 10;
    const charY = PLATFORM_Y_BASE - 25;

    this.character = this.add.container(charX, charY);

    // Body
    const body = this.add.rectangle(0, 0, 16, 30, 0x4488ff);
    body.setStrokeStyle(2, 0x2266dd);
    this.character.add(body);

    // Head
    const head = this.add.circle(0, -22, 10, 0xffcc99);
    head.setStrokeStyle(2, 0xddaa77);
    this.character.add(head);

    // Eyes
    const leftEye = this.add.circle(-3, -24, 2, 0x000000);
    const rightEye = this.add.circle(3, -24, 2, 0x000000);
    this.character.add(leftEye);
    this.character.add(rightEye);

    // Smile
    const smile = this.add.graphics();
    smile.lineStyle(2, 0x000000);
    smile.beginPath();
    smile.arc(0, -20, 4, 0, Math.PI, false);
    smile.stroke();
    this.character.add(smile);

    this.platformContainer.add(this.character);
  }

  private createUI(): void {
    const { width } = this.scale;

    // Score panel
    const scorePanelY = 55;
    const scoreBg = this.add.graphics();
    scoreBg.fillStyle(0x000000, 0.5);
    scoreBg.fillRoundedRect(width / 2 - 60, scorePanelY - 20, 120, 40, 20);

    this.add.text(width / 2 - 30, scorePanelY, 'Score:', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#aaaaaa',
    }).setOrigin(0, 0.5);

    this.scoreText = this.add.text(width / 2 + 35, scorePanelY, '0', {
      fontSize: '20px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  private onPointerDown(): void {
    if (this.gameOver || this.isAnimating) return;

    this.isGrowing = true;
    this.bridgeLength = 0;

    // Create bridge starting from character position
    const currentPlatform = this.platforms[this.currentPlatformIndex];
    const bridgeX = currentPlatform.x + currentPlatform.width;

    this.bridge = this.add.rectangle(
      bridgeX,
      PLATFORM_Y_BASE - 2,
      0,
      8,
      0x8b4513
    ).setOrigin(0, 0.5);
    this.bridge.setStrokeStyle(2, 0x6b3310);
    this.platformContainer.add(this.bridge);

    // Hide instruction
    if (this.instructionText && this.instructionText.alpha > 0) {
      this.instructionText.setAlpha(0);
    }
  }

  private onPointerUp(): void {
    if (this.gameOver || this.isAnimating || !this.isGrowing) return;

    this.isGrowing = false;
    this.dropBridge();
  }

  private updateBridge(): void {
    if (this.bridge) {
      this.bridge.width = this.bridgeLength;
    }
  }

  private dropBridge(): void {
    if (!this.bridge) return;

    this.isAnimating = true;

    // Rotate bridge to fall
    this.tweens.add({
      targets: this.bridge,
      angle: 90,
      duration: 300,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        this.checkLanding();
      },
    });
  }

  private checkLanding(): void {
    const curPlatform = this.platforms[this.currentPlatformIndex];
    const nextPlatform = this.platforms[this.currentPlatformIndex + 1];
    const bridgeEnd = curPlatform.x + curPlatform.width + this.bridgeLength;

    const nextPlatformStart = nextPlatform.x;
    const nextPlatformEnd = nextPlatform.x + nextPlatform.width;
    const nextPlatformCenter = nextPlatform.x + nextPlatform.width / 2;

    if (bridgeEnd >= nextPlatformStart && bridgeEnd <= nextPlatformEnd) {
      // Success! Walk across
      const isPerfect = Math.abs(bridgeEnd - nextPlatformCenter) <= PERFECT_THRESHOLD;
      this.walkAcross(isPerfect);
    } else {
      // Failure - bridge too short or too long
      this.handleFall(bridgeEnd < nextPlatformStart);
    }
  }

  private walkAcross(isPerfect: boolean): void {
    const nextPlatform = this.platforms[this.currentPlatformIndex + 1];
    const targetX = nextPlatform.x + nextPlatform.width - 10;

    // Animate character walking
    const distance = targetX - this.character!.x;
    const duration = distance / CHARACTER_SPEED * 16;

    this.tweens.add({
      targets: this.character,
      x: targetX,
      duration,
      ease: 'Linear',
      onComplete: () => {
        // Award points
        const points = isPerfect ? 20 : 10;
        this.score += points;
        this.scoreText.setText(this.score.toString());

        if (isPerfect) {
          this.perfectCount++;
          this.showPerfectText();
        }

        // Move to next platform
        this.currentPlatformIndex++;

        // Scroll view and create new platform
        this.scrollAndContinue();
      },
    });
  }

  private showPerfectText(): void {
    const { width } = this.scale;
    const perfectText = this.add.text(width / 2, PLATFORM_Y_BASE - 100, 'PERFECT!', {
      fontSize: '32px',
      fontFamily: 'Arial Black',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: perfectText,
      y: PLATFORM_Y_BASE - 150,
      alpha: 0,
      scale: 1.5,
      duration: 800,
      ease: 'Power2',
      onComplete: () => perfectText.destroy(),
    });
  }

  private scrollAndContinue(): void {
    const currentPlatform = this.platforms[this.currentPlatformIndex];
    const scrollAmount = currentPlatform.x - 80;

    // Create next platform before scrolling
    this.createNextPlatform();

    // Scroll everything left
    this.tweens.add({
      targets: this.platformContainer,
      x: -scrollAmount,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        // Clean up old platforms/bridges off-screen
        this.cleanupOffscreen();

        // Reset for next round
        this.isAnimating = false;
        this.bridgeLength = 0;
        if (this.bridge) {
          this.bridge.destroy();
          this.bridge = undefined;
        }
      },
    });
  }

  private cleanupOffscreen(): void {
    // Remove platforms that are way off-screen (keep 2 behind current)
    while (this.currentPlatformIndex > 2) {
      const oldPlatform = this.platforms.shift();
      if (oldPlatform?.sprite) {
        oldPlatform.sprite.destroy();
      }
      this.currentPlatformIndex--;
    }
  }

  private handleFall(_tooShort: boolean): void {
    this.gameOver = true;

    // Walk to edge/end of bridge first
    this.tweens.add({
      targets: this.character,
      x: this.platforms[this.currentPlatformIndex].x + this.platforms[this.currentPlatformIndex].width + this.bridgeLength - 5,
      duration: 300,
      onComplete: () => {
        // Then fall
        this.tweens.add({
          targets: this.character,
          y: this.character!.y + 400,
          angle: 180,
          duration: 600,
          ease: 'Power2.easeIn',
          onComplete: () => {
            this.showResults();
          },
        });

        // Bridge falls too
        if (this.bridge) {
          this.tweens.add({
            targets: this.bridge,
            y: this.bridge.y + 400,
            duration: 800,
            ease: 'Power2.easeIn',
          });
        }
      },
    });
  }

  private showResults(): void {
    const rewards: Reward[] = [];

    if (this.score > 0) {
      // Award coins based on score
      const coins = Math.floor(this.score * 5) + 50;
      rewards.push({ type: 'coins', amount: coins });

      // Bonus diamonds for good performance
      if (this.perfectCount >= 3) {
        rewards.push({ type: 'diamonds', amount: 5 });
      } else if (this.score >= 50) {
        rewards.push({ type: 'diamonds', amount: 2 });
      }

      // Award rewards
      rewards.forEach(reward => {
        getCurrencyManager().awardReward(reward, 'bridge_builder');
      });
    }

    const platformsCrossed = this.currentPlatformIndex;
    const won = platformsCrossed >= 3; // Need to cross at least 3 to "win"

    this.rewardPresenter.show({
      won,
      rewards,
      message: `Crossed ${platformsCrossed} platforms! ${this.perfectCount > 0 ? `(${this.perfectCount} perfect!)` : ''}`,
    });
  }

  private createBackButton(): void {
    const backBtn = this.add.rectangle(60, 55, 100, 40, 0x4a4a5e)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backBtn.setFillStyle(0x5a5a6e))
      .on('pointerout', () => backBtn.setFillStyle(0x4a4a5e))
      .on('pointerdown', () => this.scene.start('MiniGameHubScene'));

    this.add.text(60, 55, '< Back', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
  }
}
