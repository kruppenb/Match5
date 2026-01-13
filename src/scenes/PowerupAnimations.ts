import Phaser from 'phaser';
import { Position, PowerupType } from '../types';
import { CONFIG } from '../config';
import { ParticleManager } from '../utils/ParticleManager';

/**
 * Handles all powerup-related animations including:
 * - Rocket launches (horizontal/vertical)
 * - Bomb explosions
 * - Color bomb beams
 * - Propeller flight
 * - Powerup combination effects
 */
export class PowerupAnimations {
  private scene: Phaser.Scene;
  private gridOffsetX: number;
  private gridOffsetY: number;
  private tileSize: number;
  private particleManager: ParticleManager | null = null;

  constructor(scene: Phaser.Scene, gridOffsetX: number, gridOffsetY: number, tileSize: number) {
    this.scene = scene;
    this.gridOffsetX = gridOffsetX;
    this.gridOffsetY = gridOffsetY;
    this.tileSize = tileSize;
  }

  /**
   * Set the particle manager for sprite-based effects
   */
  setParticleManager(pm: ParticleManager): void {
    this.particleManager = pm;
  }

  /**
   * Update grid parameters (useful if tile size changes)
   */
  updateGridParams(gridOffsetX: number, gridOffsetY: number, tileSize: number): void {
    this.gridOffsetX = gridOffsetX;
    this.gridOffsetY = gridOffsetY;
    this.tileSize = tileSize;
  }

  /**
   * Convert grid position to screen coordinates
   */
  private cellToScreen(row: number, col: number): { x: number; y: number } {
    return {
      x: this.gridOffsetX + col * this.tileSize + this.tileSize / 2,
      y: this.gridOffsetY + row * this.tileSize + this.tileSize / 2,
    };
  }

  /**
   * Animate a horizontal rocket launch
   */
  async animateRocketHorizontal(row: number, col: number, color: number): Promise<void> {
    const pos = this.cellToScreen(row, col);
    const screenWidth = CONFIG.SCREEN.WIDTH;

    // Initial burst and speed lines
    if (this.particleManager) {
      this.particleManager.emitSparks(pos.x, pos.y, 6, 'white');
      this.particleManager.emitSpeedLines(pos.x, pos.y, 'horizontal', 8);
    }

    // Create rocket projectiles going both directions
    const leftRocket = this.createRocketProjectile(pos.x, pos.y, color, 'left');
    const rightRocket = this.createRocketProjectile(pos.x, pos.y, color, 'right');

    // Create trail particles
    this.createRocketTrail(pos.x, pos.y, 'horizontal');

    // Animate rockets flying across (slowed down)
    const duration = 450;
    const promises: Promise<void>[] = [];

    promises.push(new Promise(resolve => {
      this.scene.tweens.add({
        targets: leftRocket,
        x: -50,
        duration,
        ease: 'Quad.easeIn',
        onUpdate: () => {
          this.emitTrailParticle(leftRocket.x, leftRocket.y, color);
          if (this.particleManager && Math.random() > 0.7) {
            this.particleManager.emitSmokePuff(leftRocket.x + 15, leftRocket.y, 1);
            this.particleManager.emitRocketFlame(leftRocket.x + 10, leftRocket.y, 'right');
          }
        },
        onComplete: () => {
          leftRocket.destroy();
          resolve();
        },
      });
    }));

    promises.push(new Promise(resolve => {
      this.scene.tweens.add({
        targets: rightRocket,
        x: screenWidth + 50,
        duration,
        ease: 'Quad.easeIn',
        onUpdate: () => {
          this.emitTrailParticle(rightRocket.x, rightRocket.y, color);
          if (this.particleManager && Math.random() > 0.7) {
            this.particleManager.emitSmokePuff(rightRocket.x - 15, rightRocket.y, 1);
            this.particleManager.emitRocketFlame(rightRocket.x - 10, rightRocket.y, 'left');
          }
        },
        onComplete: () => {
          rightRocket.destroy();
          resolve();
        },
      });
    }));

    // Flash effect along the row
    this.flashRow(row, color);

    await Promise.all(promises);
  }

  /**
   * Animate a vertical rocket launch
   */
  async animateRocketVertical(row: number, col: number, color: number): Promise<void> {
    const pos = this.cellToScreen(row, col);
    const screenHeight = CONFIG.SCREEN.HEIGHT;

    // Initial burst and speed lines
    if (this.particleManager) {
      this.particleManager.emitSparks(pos.x, pos.y, 6, 'white');
      this.particleManager.emitSpeedLines(pos.x, pos.y, 'vertical', 8);
    }

    // Create rocket projectiles going both directions
    const upRocket = this.createRocketProjectile(pos.x, pos.y, color, 'up');
    const downRocket = this.createRocketProjectile(pos.x, pos.y, color, 'down');

    // Create trail particles
    this.createRocketTrail(pos.x, pos.y, 'vertical');

    // Animate rockets flying (slowed down)
    const duration = 450;
    const promises: Promise<void>[] = [];

    promises.push(new Promise(resolve => {
      this.scene.tweens.add({
        targets: upRocket,
        y: -50,
        duration,
        ease: 'Quad.easeIn',
        onUpdate: () => {
          this.emitTrailParticle(upRocket.x, upRocket.y, color);
          if (this.particleManager && Math.random() > 0.7) {
            this.particleManager.emitSmokePuff(upRocket.x, upRocket.y + 15, 1);
            this.particleManager.emitRocketFlame(upRocket.x, upRocket.y + 10, 'down');
          }
        },
        onComplete: () => {
          upRocket.destroy();
          resolve();
        },
      });
    }));

    promises.push(new Promise(resolve => {
      this.scene.tweens.add({
        targets: downRocket,
        y: screenHeight + 50,
        duration,
        ease: 'Quad.easeIn',
        onUpdate: () => {
          this.emitTrailParticle(downRocket.x, downRocket.y, color);
          if (this.particleManager && Math.random() > 0.7) {
            this.particleManager.emitSmokePuff(downRocket.x, downRocket.y - 15, 1);
            this.particleManager.emitRocketFlame(downRocket.x, downRocket.y - 10, 'up');
          }
        },
        onComplete: () => {
          downRocket.destroy();
          resolve();
        },
      });
    }));

    // Flash effect along the column
    this.flashColumn(col, color);

    await Promise.all(promises);
  }

  /**
   * Animate a bomb explosion
   */
  async animateBomb(row: number, col: number, radius: number = 2): Promise<void> {
    const pos = this.cellToScreen(row, col);
    const explosionSize = this.tileSize * (radius * 2 + 1);

    // Screen shake
    this.screenShake(8, 300);

    // Flash effect
    this.flashScreen(0xffff00, 150);

    // Sprite-based explosion burst
    if (this.particleManager) {
      this.particleManager.emitExplosionBurst(pos.x, pos.y, 0.8 + radius * 0.3);
      this.particleManager.emitShockwave(pos.x, pos.y, 1.5 + radius * 0.5);
      this.particleManager.emitSparks(pos.x, pos.y, 12 + radius * 4, 'yellow');
      this.particleManager.emitDebris(pos.x, pos.y, 'orange', 8 + radius * 2);
    }

    // Create expanding shockwave ring (backup/additional effect)
    const ring = this.scene.add.graphics();
    ring.setDepth(100);
    ring.lineStyle(4, 0xffffff, 1);
    ring.strokeCircle(pos.x, pos.y, 10);

    // Animate shockwave expansion (slowed down)
    const ringData = { radius: 10, alpha: 1 };
    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: ringData,
        radius: explosionSize / 2,
        alpha: 0,
        duration: 450,
        ease: 'Quad.easeOut',
        onUpdate: () => {
          ring.clear();
          ring.lineStyle(4, 0xffffff, ringData.alpha);
          ring.strokeCircle(pos.x, pos.y, ringData.radius);
        },
        onComplete: () => {
          ring.destroy();
          resolve();
        },
      });
    });

    // Emit explosion particles
    this.emitExplosionParticles(pos.x, pos.y, radius);
  }

  /**
   * Animate a color bomb activation with beams to targets
   */
  async animateColorBomb(row: number, col: number, targetPositions: Position[]): Promise<void> {
    const pos = this.cellToScreen(row, col);

    // Sprite-based rainbow burst
    if (this.particleManager) {
      this.particleManager.emitRainbowBurst(pos.x, pos.y, 1.2);
      this.particleManager.emitMagicStars(pos.x, pos.y, 12);
    }

    // Rainbow pulse at origin (slowed down)
    await this.rainbowPulse(pos.x, pos.y, 350);

    // Draw beams to each target with stagger
    const beamPromises: Promise<void>[] = [];
    targetPositions.forEach((target, index) => {
      const delay = index * 50; // More time between beams
      beamPromises.push(this.delayedBeam(pos, target, delay));
    });

    await Promise.all(beamPromises);
  }

  /**
   * Animate a propeller flying straight to target with single block impact
   */
  async animatePropeller(fromRow: number, fromCol: number, targetRow: number, targetCol: number, color: number): Promise<void> {
    const startPos = this.cellToScreen(fromRow, fromCol);
    const endPos = this.cellToScreen(targetRow, targetCol);

    // Create propeller sprite
    const propeller = this.createPropellerSprite(startPos.x, startPos.y, color);

    // Spin the propeller while flying
    const spinTween = this.scene.tweens.add({
      targets: propeller,
      angle: 360 * 3, // 3 full rotations
      duration: 800,
      repeat: -1,
      ease: 'Linear',
    });

    // Fly straight to target (no arc/bounce)
    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: propeller,
        x: endPos.x,
        y: endPos.y,
        duration: 600,
        ease: 'Quad.easeOut',
        onUpdate: () => {
          // Emit trail
          if (Math.random() > 0.5) {
            this.emitTrailParticle(propeller.x, propeller.y, color);
          }
        },
        onComplete: () => {
          spinTween.stop();
          propeller.destroy();
          resolve();
        },
      });
    });

    // Single block impact at target
    this.emitImpactParticles(endPos.x, endPos.y, color);
  }

  /**
   * Animate propeller with multiple targets (main + bonus)
   * Visually only flies to main target, but clears both
   */
  async animatePropellerMultiTarget(
    fromRow: number, 
    fromCol: number, 
    mainTarget: Position | null, 
    _bonusTarget: Position | null, 
    color: number
  ): Promise<void> {
    const startPos = this.cellToScreen(fromRow, fromCol);

    if (!mainTarget) {
      // No targets - just fade out with particles
      this.emitImpactParticles(startPos.x, startPos.y, color);
      return;
    }

    // Create propeller sprite
    const propeller = this.createPropellerSprite(startPos.x, startPos.y, color);

    // Spin the propeller while flying
    const spinTween = this.scene.tweens.add({
      targets: propeller,
      angle: 360 * 3,
      duration: 800,
      repeat: -1,
      ease: 'Linear',
    });

    // Fly to main target only
    const mainPos = this.cellToScreen(mainTarget.row, mainTarget.col);
    await this.flyPropellerTo(propeller, startPos, mainPos, color);
    
    // Impact at main target
    this.emitImpactParticles(mainPos.x, mainPos.y, color);

    spinTween.stop();
    propeller.destroy();
  }

  /**
   * Helper to fly propeller between two points (straight line)
   */
  private async flyPropellerTo(
    propeller: Phaser.GameObjects.Container, 
    _startPos: { x: number; y: number }, 
    endPos: { x: number; y: number },
    color: number
  ): Promise<void> {
    // Fly straight to target
    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: propeller,
        x: endPos.x,
        y: endPos.y,
        duration: 500,
        ease: 'Quad.easeOut',
        onUpdate: () => {
          if (Math.random() > 0.6) {
            this.emitTrailParticle(propeller.x, propeller.y, color);
          }
        },
        onComplete: () => resolve(),
      });
    });
  }

  /**
   * Animate cross blast (rocket + rocket combination)
   */
  async animateCrossBlast(row: number, col: number, color: number): Promise<void> {
    // Play both horizontal and vertical rockets simultaneously
    await Promise.all([
      this.animateRocketHorizontal(row, col, color),
      this.animateRocketVertical(row, col, color),
    ]);
  }

  /**
   * Animate mega bomb (bomb + bomb combination) - 7x7 explosion
   */
  async animateMegaBomb(row: number, col: number): Promise<void> {
    // Stronger screen shake
    this.screenShake(15, 300);
    this.flashScreen(0xff8800, 150);

    await this.animateBomb(row, col, 3);
  }

  /**
   * Animate triple line blast (rocket + bomb combination)
   */
  async animateTripleLineBlast(row: number, col: number, color: number): Promise<void> {
    // Flash effect
    this.flashScreen(0xffff00, 100);
    this.screenShake(10, 200);

    // Animate 3 horizontal lines
    const hPromises: Promise<void>[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      hPromises.push(this.animateRocketHorizontal(row + dr, col, color));
    }

    // Animate 3 vertical lines
    const vPromises: Promise<void>[] = [];
    for (let dc = -1; dc <= 1; dc++) {
      vPromises.push(this.animateRocketVertical(row, col + dc, color));
    }

    await Promise.all([...hPromises, ...vPromises]);
  }

  /**
   * Animate color bomb + rocket (all tiles of color become rockets)
   */
  async animateColorRockets(
    originRow: number,
    originCol: number,
    tilePositions: Position[],
    isHorizontal: boolean,
    color: number
  ): Promise<void> {
    const originPos = this.cellToScreen(originRow, originCol);

    // Rainbow pulse at origin
    await this.rainbowPulse(originPos.x, originPos.y, 150);

    // Each tile gets a mini rocket animation
    const promises = tilePositions.map(async (pos, index) => {
      await this.wait(index * 50); // Stagger
      if (isHorizontal) {
        await this.animateRocketHorizontal(pos.row, pos.col, color);
      } else {
        await this.animateRocketVertical(pos.row, pos.col, color);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Animate color bomb + bomb (all tiles of color explode)
   */
  async animateColorBombs(
    originRow: number,
    originCol: number,
    tilePositions: Position[]
  ): Promise<void> {
    const originPos = this.cellToScreen(originRow, originCol);

    // Rainbow pulse at origin
    await this.rainbowPulse(originPos.x, originPos.y, 150);

    // Each tile gets a small explosion
    const promises = tilePositions.map(async (pos, index) => {
      await this.wait(index * 30); // Stagger
      await this.animateBomb(pos.row, pos.col, 1);
    });

    await Promise.all(promises);
  }

  /**
   * Animate color bomb + color bomb (clear entire board)
   */
  async animateDoubleClearBoard(row: number, col: number): Promise<void> {
    const centerPos = this.cellToScreen(row, col);

    // Epic sprite-based effects
    if (this.particleManager) {
      this.particleManager.emitRainbowBurst(centerPos.x, centerPos.y, 2);
      this.particleManager.emitMagicStars(centerPos.x, centerPos.y, 20);
      // Multiple shockwaves
      for (let i = 0; i < 3; i++) {
        this.scene.time.delayedCall(i * 100, () => {
          this.particleManager?.emitShockwave(centerPos.x, centerPos.y, 2.5 + i * 0.5);
        });
      }
    }

    // Epic rainbow pulse
    await this.rainbowPulse(centerPos.x, centerPos.y, 300);

    // Large screen shake
    this.screenShake(20, 400);

    // Multiple rainbow waves expanding outward
    const wavePromises: Promise<void>[] = [];
    const colors = [0xff0000, 0xff7700, 0xffff00, 0x00ff00, 0x0000ff, 0x8800ff];

    for (let i = 0; i < colors.length; i++) {
      wavePromises.push(this.createExpandingWave(centerPos.x, centerPos.y, colors[i], i * 50));
    }

    await Promise.all(wavePromises);

    // Final flash
    this.flashScreen(0xffffff, 200);
  }

  /**
   * Animate triple propeller (color bomb + propeller) - 3 propellers fly to 3 targets
   */
  async animateTriplePropeller(
    originRow: number,
    originCol: number,
    targets: Position[],
    color: number
  ): Promise<void> {
    if (targets.length === 0) return;

    const startPos = this.cellToScreen(originRow, originCol);

    // Flash effect at origin
    this.flashScreen(color, 80);
    this.screenShake(8, 200);

    // Launch propellers in sequence with slight delay between each
    const promises: Promise<void>[] = [];

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const endPos = this.cellToScreen(target.row, target.col);

      // Stagger launch times slightly
      const launchDelay = i * 100;

      promises.push(
        new Promise<void>(resolve => {
          this.scene.time.delayedCall(launchDelay, () => {
            this.animateSinglePropellerFlight(startPos, endPos, color).then(resolve);
          });
        })
      );
    }

    await Promise.all(promises);
  }

  /**
   * Helper to animate a single propeller flying from start to end with impact
   */
  private async animateSinglePropellerFlight(
    startPos: { x: number; y: number },
    endPos: { x: number; y: number },
    color: number
  ): Promise<void> {
    // Create propeller sprite
    const propeller = this.createPropellerSprite(startPos.x, startPos.y, color);

    // Spin the propeller while flying
    const spinTween = this.scene.tweens.add({
      targets: propeller,
      angle: 360 * 3,
      duration: 800,
      repeat: -1,
      ease: 'Linear',
    });

    // Fly to target
    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: propeller,
        x: endPos.x,
        y: endPos.y,
        duration: 500,
        ease: 'Quad.easeOut',
        onUpdate: () => {
          if (Math.random() > 0.5) {
            this.emitTrailParticle(propeller.x, propeller.y, color);
          }
        },
        onComplete: () => {
          spinTween.stop();
          propeller.destroy();
          // Impact particles at target
          this.emitImpactParticles(endPos.x, endPos.y, color);
          resolve();
        },
      });
    });
  }

  /**
   * Animate powerup creation (when match creates a powerup)
   */
  async animatePowerupCreation(row: number, col: number, _powerupType: PowerupType, color: number): Promise<void> {
    const pos = this.cellToScreen(row, col);

    // Particle spiral into position
    this.spiralParticlesIn(pos.x, pos.y, color);

    // Glow pulse
    const glow = this.scene.add.graphics();
    glow.setDepth(50);
    glow.fillStyle(color, 0.6);
    glow.fillCircle(pos.x, pos.y, this.tileSize * 0.6);

    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: glow,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 300,
        ease: 'Quad.easeOut',
        onComplete: () => {
          glow.destroy();
          resolve();
        },
      });
    });
  }

  // ==================== Helper Methods ====================

  private createRocketProjectile(x: number, y: number, color: number, direction: 'up' | 'down' | 'left' | 'right'): Phaser.GameObjects.Graphics {
    const rocket = this.scene.add.graphics();
    rocket.setPosition(x, y);
    rocket.setDepth(100);

    const size = this.tileSize * 0.3;
    rocket.fillStyle(color, 1);

    // Draw rocket shape based on direction
    rocket.beginPath();
    switch (direction) {
      case 'right':
        rocket.moveTo(size, 0);
        rocket.lineTo(-size, -size * 0.5);
        rocket.lineTo(-size * 0.5, 0);
        rocket.lineTo(-size, size * 0.5);
        break;
      case 'left':
        rocket.moveTo(-size, 0);
        rocket.lineTo(size, -size * 0.5);
        rocket.lineTo(size * 0.5, 0);
        rocket.lineTo(size, size * 0.5);
        break;
      case 'up':
        rocket.moveTo(0, -size);
        rocket.lineTo(-size * 0.5, size);
        rocket.lineTo(0, size * 0.5);
        rocket.lineTo(size * 0.5, size);
        break;
      case 'down':
        rocket.moveTo(0, size);
        rocket.lineTo(-size * 0.5, -size);
        rocket.lineTo(0, -size * 0.5);
        rocket.lineTo(size * 0.5, -size);
        break;
    }
    rocket.closePath();
    rocket.fillPath();

    // Add glow
    rocket.lineStyle(3, 0xffffff, 0.8);
    rocket.strokePath();

    return rocket;
  }

  private createRocketTrail(x: number, y: number, direction: 'horizontal' | 'vertical'): void {
    // Initial burst of particles
    for (let i = 0; i < 10; i++) {
      const particle = this.scene.add.graphics();
      particle.setDepth(90);
      particle.fillStyle(0xffff00, 1);
      particle.fillCircle(0, 0, 4 + Math.random() * 4);
      particle.setPosition(x, y);

      const angle = direction === 'horizontal' 
        ? (Math.random() - 0.5) * Math.PI 
        : (Math.random() - 0.5) * Math.PI + Math.PI / 2;
      const speed = 50 + Math.random() * 100;

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: 300 + Math.random() * 200,
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy(),
      });
    }
  }

  private emitTrailParticle(x: number, y: number, color: number): void {
    if (Math.random() > 0.3) return; // Only emit sometimes

    const particle = this.scene.add.graphics();
    particle.setDepth(90);
    particle.fillStyle(color, 0.8);
    particle.fillCircle(0, 0, 3 + Math.random() * 3);
    particle.setPosition(x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 10);

    this.scene.tweens.add({
      targets: particle,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => particle.destroy(),
    });
  }

  private flashRow(row: number, color: number): void {
    const startPos = this.cellToScreen(row, 0);

    const flash = this.scene.add.graphics();
    flash.setDepth(80);
    flash.fillStyle(color, 0.4);
    flash.fillRect(
      this.gridOffsetX,
      startPos.y - this.tileSize / 2,
      CONFIG.SCREEN.WIDTH - this.gridOffsetX * 2,
      this.tileSize
    );

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  private flashColumn(col: number, color: number): void {
    const pos = this.cellToScreen(0, col);

    const flash = this.scene.add.graphics();
    flash.setDepth(80);
    flash.fillStyle(color, 0.4);
    flash.fillRect(
      pos.x - this.tileSize / 2,
      this.gridOffsetY,
      this.tileSize,
      CONFIG.SCREEN.HEIGHT - this.gridOffsetY
    );

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  private screenShake(intensity: number, duration: number): void {
    this.scene.cameras.main.shake(duration, intensity / 500);
  }

  private flashScreen(color: number, duration: number): void {
    const flash = this.scene.add.graphics();
    flash.setDepth(200);
    flash.fillStyle(color, 0.5);
    flash.fillRect(0, 0, CONFIG.SCREEN.WIDTH, CONFIG.SCREEN.HEIGHT);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  private emitExplosionParticles(x: number, y: number, radius: number): void {
    const particleCount = 15 + radius * 5;
    const colors = [0xff4400, 0xff8800, 0xffff00, 0xffffff];

    for (let i = 0; i < particleCount; i++) {
      const particle = this.scene.add.graphics();
      particle.setDepth(95);
      const color = colors[Math.floor(Math.random() * colors.length)];
      particle.fillStyle(color, 1);
      particle.fillCircle(0, 0, 4 + Math.random() * 6);
      particle.setPosition(x, y);

      const angle = Math.random() * Math.PI * 2;
      const distance = (radius + 1) * this.tileSize * (0.3 + Math.random() * 0.7);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 400 + Math.random() * 200,
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy(),
      });
    }
  }

  private async rainbowPulse(x: number, y: number, duration: number): Promise<void> {
    const colors = [0xff0000, 0xff7700, 0xffff00, 0x00ff00, 0x0000ff, 0x8800ff];
    const graphics = this.scene.add.graphics();
    graphics.setDepth(100);
    graphics.setPosition(x, y);

    let colorIndex = 0;
    const pulseData = { scale: 0.5, alpha: 1 };

    // Animate scale and cycle colors
    await new Promise<void>(resolve => {
      const colorTimer = this.scene.time.addEvent({
        delay: 50,
        repeat: duration / 50,
        callback: () => {
          colorIndex = (colorIndex + 1) % colors.length;
        },
      });

      this.scene.tweens.add({
        targets: pulseData,
        scale: 1.5,
        alpha: 0,
        duration,
        ease: 'Quad.easeOut',
        onUpdate: () => {
          graphics.clear();
          graphics.fillStyle(colors[colorIndex], pulseData.alpha);
          graphics.fillCircle(0, 0, this.tileSize * pulseData.scale);
        },
        onComplete: () => {
          colorTimer.destroy();
          graphics.destroy();
          resolve();
        },
      });
    });
  }

  private async delayedBeam(origin: { x: number; y: number }, target: Position, delay: number): Promise<void> {
    await this.wait(delay);

    const targetScreen = this.cellToScreen(target.row, target.col);
    const beam = this.scene.add.graphics();
    beam.setDepth(90);

    // Draw beam line
    const colors = [0xff0000, 0xff7700, 0xffff00, 0x00ff00, 0x0000ff, 0x8800ff];
    const color = colors[Math.floor(Math.random() * colors.length)];

    beam.lineStyle(4, color, 1);
    beam.lineBetween(origin.x, origin.y, targetScreen.x, targetScreen.y);

    // Add glow effect
    beam.lineStyle(8, color, 0.3);
    beam.lineBetween(origin.x, origin.y, targetScreen.x, targetScreen.y);

    // Fade out (slowed down)
    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: beam,
        alpha: 0,
        duration: 350,
        ease: 'Quad.easeOut',
        onComplete: () => {
          beam.destroy();
          resolve();
        },
      });
    });

    // Sparkle at target
    this.emitSparkles(targetScreen.x, targetScreen.y, color);
  }

  private emitSparkles(x: number, y: number, color: number): void {
    for (let i = 0; i < 8; i++) {
      const particle = this.scene.add.graphics();
      particle.setDepth(95);
      particle.fillStyle(color, 1);
      
      // Diamond/sparkle shape (since fillStar doesn't exist in Phaser Graphics)
      const size = 3 + Math.random() * 3;
      particle.beginPath();
      particle.moveTo(0, -size);
      particle.lineTo(size * 0.5, 0);
      particle.lineTo(0, size);
      particle.lineTo(-size * 0.5, 0);
      particle.closePath();
      particle.fillPath();
      particle.setPosition(x, y);

      const angle = Math.random() * Math.PI * 2;
      const distance = 20 + Math.random() * 30;

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        angle: Math.random() * 360,
        duration: 300 + Math.random() * 200,
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy(),
      });
    }
  }

  private createPropellerSprite(x: number, y: number, color: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setDepth(100);

    const graphics = this.scene.add.graphics();
    const s = this.tileSize * 0.3;

    // Body
    graphics.fillStyle(color, 1);
    graphics.fillCircle(0, 0, s * 0.5);

    // Blades
    graphics.fillStyle(0xffffff, 0.9);
    for (let i = 0; i < 3; i++) {
      const angle = (i * 2 * Math.PI) / 3 - Math.PI / 2;
      const bladeLength = s * 0.9;
      const tipX = Math.cos(angle) * bladeLength;
      const tipY = Math.sin(angle) * bladeLength;
      
      graphics.beginPath();
      graphics.moveTo(0, 0);
      graphics.lineTo(tipX, tipY);
      graphics.lineStyle(s * 0.25, 0xffffff, 0.9);
      graphics.strokePath();
    }

    container.add(graphics);
    return container;
  }

  private emitImpactParticles(x: number, y: number, color: number): void {
    for (let i = 0; i < 12; i++) {
      const particle = this.scene.add.graphics();
      particle.setDepth(95);
      particle.fillStyle(color, 1);
      particle.fillCircle(0, 0, 4 + Math.random() * 4);
      particle.setPosition(x, y);

      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 40;

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 300,
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy(),
      });
    }

    // Plus pattern impact
    const plus = this.scene.add.graphics();
    plus.setDepth(94);
    plus.lineStyle(4, 0xffffff, 0.8);
    plus.lineBetween(x - 20, y, x + 20, y);
    plus.lineBetween(x, y - 20, x, y + 20);

    this.scene.tweens.add({
      targets: plus,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => plus.destroy(),
    });
  }

  private spiralParticlesIn(x: number, y: number, color: number): void {
    const particleCount = 12;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const startDist = this.tileSize * 1.5;
      const startX = x + Math.cos(angle) * startDist;
      const startY = y + Math.sin(angle) * startDist;

      const particle = this.scene.add.graphics();
      particle.setDepth(95);
      particle.fillStyle(color, 1);
      particle.fillCircle(0, 0, 4);
      particle.setPosition(startX, startY);

      this.scene.tweens.add({
        targets: particle,
        x,
        y,
        alpha: 0,
        duration: 300,
        delay: i * 20,
        ease: 'Quad.easeIn',
        onComplete: () => particle.destroy(),
      });
    }
  }

  private async createExpandingWave(x: number, y: number, color: number, delay: number): Promise<void> {
    await this.wait(delay);

    const wave = this.scene.add.graphics();
    wave.setDepth(90);

    const waveData = { radius: 20, alpha: 0.8 };
    const maxRadius = Math.max(CONFIG.SCREEN.WIDTH, CONFIG.SCREEN.HEIGHT);

    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: waveData,
        radius: maxRadius,
        alpha: 0,
        duration: 600,
        ease: 'Quad.easeOut',
        onUpdate: () => {
          wave.clear();
          wave.lineStyle(8, color, waveData.alpha);
          wave.strokeCircle(x, y, waveData.radius);
        },
        onComplete: () => {
          wave.destroy();
          resolve();
        },
      });
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => this.scene.time.delayedCall(ms, resolve));
  }
}
