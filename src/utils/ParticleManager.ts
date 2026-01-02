import Phaser from 'phaser';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
  graphics?: Phaser.GameObjects.Graphics;
}

/**
 * ParticleManager handles all particle effects for the game.
 * Emits particles for matches, powerups, combos, and other game events.
 */
export class ParticleManager {
  private scene: Phaser.Scene;
  private particles: Particle[] = [];
  private gravity = 0.3;
  private maxParticles = 200;
  private isUpdating = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Emit particles when tiles are matched/cleared
   */
  emitMatchParticles(x: number, y: number, color: number, count: number = 12): void {
    for (let i = 0; i < count; i++) {
      this.createParticle({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 4, // Bias upward
        life: 30 + Math.random() * 15,
        maxLife: 45,
        color,
        size: 4 + Math.random() * 4,
      });
    }
    this.startUpdate();
  }

  /**
   * Emit particles for powerup creation
   */
  emitPowerupCreation(x: number, y: number, color: number): void {
    // Spiral particles inward
    const particleCount = 16;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const distance = 60 + Math.random() * 20;
      const startX = x + Math.cos(angle) * distance;
      const startY = y + Math.sin(angle) * distance;

      // Calculate velocity toward center
      const vx = (x - startX) / 15;
      const vy = (y - startY) / 15;

      this.createParticle({
        x: startX,
        y: startY,
        vx,
        vy,
        life: 15 + i,
        maxLife: 15 + i,
        color,
        size: 5 + Math.random() * 3,
      });
    }

    // Burst at center after delay
    this.scene.time.delayedCall(200, () => {
      this.emitBurst(x, y, color, 20);
    });

    this.startUpdate();
  }

  /**
   * Emit burst of particles (for powerup activation)
   */
  emitBurst(x: number, y: number, color: number, count: number = 20): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      this.createParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 20 + Math.random() * 20,
        maxLife: 40,
        color,
        size: 3 + Math.random() * 5,
      });
    }
    this.startUpdate();
  }

  /**
   * Emit explosion particles (for bombs)
   */
  emitExplosion(x: number, y: number, radius: number = 2): void {
    const colors = [0xff4400, 0xff8800, 0xffff00, 0xffffff];
    const particleCount = 25 + radius * 10;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.createParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 25 + Math.random() * 20,
        maxLife: 45,
        color,
        size: 4 + Math.random() * 6,
      });
    }
    this.startUpdate();
  }

  /**
   * Emit rocket trail particles
   */
  emitRocketTrail(x: number, y: number, color: number): void {
    for (let i = 0; i < 3; i++) {
      this.createParticle({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 10 + Math.random() * 10,
        maxLife: 20,
        color,
        size: 3 + Math.random() * 3,
      });
    }
    this.startUpdate();
  }

  /**
   * Emit sparkle particles (for color bomb)
   */
  emitSparkles(x: number, y: number, color: number, count: number = 8): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      this.createParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 15 + Math.random() * 15,
        maxLife: 30,
        color,
        size: 2 + Math.random() * 3,
      });
    }
    this.startUpdate();
  }

  /**
   * Emit confetti particles (for win screen)
   */
  emitConfetti(x: number, y: number, count: number = 50): void {
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];

    for (let i = 0; i < count; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
      const speed = 8 + Math.random() * 6;

      this.createParticle({
        x: x + (Math.random() - 0.5) * 100,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 60 + Math.random() * 40,
        maxLife: 100,
        color,
        size: 4 + Math.random() * 4,
      });
    }
    this.startUpdate();
  }

  /**
   * Emit a single firework burst at position
   */
  emitFirework(x: number, y: number): void {
    const colors = [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x00ffff, 0xff00ff, 0xffffff];
    const baseColor = colors[Math.floor(Math.random() * colors.length)];
    const particleCount = 30 + Math.floor(Math.random() * 20);

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 4 + Math.random() * 6;
      // Add slight color variation
      const colorVariation = Math.random() > 0.7 ? 0xffffff : baseColor;

      this.createParticle({
        x,
        y,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 2,
        vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 2,
        life: 40 + Math.random() * 30,
        maxLife: 70,
        color: colorVariation,
        size: 3 + Math.random() * 4,
      });
    }

    // Add sparkle trails
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 8 + Math.random() * 4;
      this.createParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 20 + Math.random() * 15,
        maxLife: 35,
        color: 0xffffff,
        size: 2 + Math.random() * 2,
      });
    }
    this.startUpdate();
  }

  /**
   * Emit a rising firework trail (rocket going up before explosion)
   */
  emitFireworkTrail(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      this.createParticle({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 1,
        vy: 1 + Math.random() * 2,
        life: 8 + Math.random() * 8,
        maxLife: 16,
        color: 0xff8800,
        size: 2 + Math.random() * 2,
      });
    }
    this.startUpdate();
  }

  /**
   * Emit celebration stars (big flashy stars)
   */
  emitCelebrationStars(x: number, y: number, count: number = 8): void {
    const goldColors = [0xffd700, 0xffec8b, 0xffa500, 0xffff00];

    for (let i = 0; i < count; i++) {
      const color = goldColors[Math.floor(Math.random() * goldColors.length)];
      const angle = (i / count) * Math.PI * 2;
      const speed = 3 + Math.random() * 4;

      this.createParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 50 + Math.random() * 30,
        maxLife: 80,
        color,
        size: 6 + Math.random() * 6,
      });
    }
    this.startUpdate();
  }

  /**
   * Emit cascade combo particles
   */
  emitCascadeParticles(x: number, y: number, cascadeLevel: number): void {
    const colors = [0xffd700, 0xff8c00, 0xff4500, 0xff1493, 0x9400d3];
    const color = colors[Math.min(cascadeLevel - 1, colors.length - 1)];
    const count = 8 + cascadeLevel * 4;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 3 + cascadeLevel;
      this.createParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 25 + Math.random() * 15,
        maxLife: 40,
        color,
        size: 3 + Math.random() * 3 + cascadeLevel * 0.5,
      });
    }
    this.startUpdate();
  }

  /**
   * Create a single particle
   */
  private createParticle(config: Omit<Particle, 'graphics'>): void {
    // Remove old particles if we're at the limit
    if (this.particles.length >= this.maxParticles) {
      const oldParticle = this.particles.shift();
      oldParticle?.graphics?.destroy();
    }

    const graphics = this.scene.add.graphics();
    graphics.setDepth(150);
    graphics.fillStyle(config.color, 1);
    graphics.fillCircle(0, 0, config.size);
    graphics.setPosition(config.x, config.y);

    this.particles.push({
      ...config,
      graphics,
    });
  }

  /**
   * Start the update loop if not already running
   */
  private startUpdate(): void {
    if (this.isUpdating) return;
    this.isUpdating = true;
    this.scene.events.on('update', this.update, this);
  }

  /**
   * Stop the update loop
   */
  private stopUpdate(): void {
    if (!this.isUpdating) return;
    this.isUpdating = false;
    this.scene.events.off('update', this.update, this);
  }

  /**
   * Update all particles (called every frame)
   */
  private update = (): void => {
    if (this.particles.length === 0) {
      this.stopUpdate();
      return;
    }

    const toRemove: number[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Update position
      p.x += p.vx;
      p.y += p.vy;
      p.vy += this.gravity;
      p.life--;

      // Update visual
      if (p.graphics) {
        p.graphics.setPosition(p.x, p.y);

        // Fade and shrink
        const lifeRatio = p.life / p.maxLife;
        p.graphics.setAlpha(lifeRatio);
        p.graphics.setScale(lifeRatio);
      }

      // Mark for removal if dead
      if (p.life <= 0) {
        toRemove.push(i);
      }
    }

    // Remove dead particles (reverse order to preserve indices)
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const p = this.particles[idx];
      p.graphics?.destroy();
      this.particles.splice(idx, 1);
    }
  };

  /**
   * Clear all particles
   */
  clear(): void {
    for (const p of this.particles) {
      p.graphics?.destroy();
    }
    this.particles = [];
    this.stopUpdate();
  }

  /**
   * Get current particle count
   */
  getParticleCount(): number {
    return this.particles.length;
  }

  /**
   * Destroy the particle manager
   */
  destroy(): void {
    this.clear();
  }
}
