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
   * Check if an effect sprite texture exists
   */
  private hasTexture(key: string): boolean {
    return this.scene.textures.exists(key);
  }

  /**
   * Emit sprite-based explosion burst (for bomb powerup)
   */
  emitExplosionBurst(x: number, y: number, scale: number = 1): void {
    if (!this.hasTexture('effect_explosion_burst')) {
      this.emitExplosion(x, y, 2);
      return;
    }

    const burst = this.scene.add.image(x, y, 'effect_explosion_burst');
    burst.setDepth(100);
    burst.setScale(0.1 * scale);
    burst.setAlpha(1);

    this.scene.tweens.add({
      targets: burst,
      scaleX: 1.5 * scale,
      scaleY: 1.5 * scale,
      alpha: 0,
      duration: 400,
      ease: 'Quad.easeOut',
      onComplete: () => burst.destroy(),
    });
  }

  /**
   * Emit expanding shockwave ring (for bomb powerup)
   */
  emitShockwave(x: number, y: number, maxScale: number = 2): void {
    if (!this.hasTexture('effect_shockwave_ring')) {
      return;
    }

    const ring = this.scene.add.image(x, y, 'effect_shockwave_ring');
    ring.setDepth(99);
    ring.setScale(0.2);
    ring.setAlpha(0.8);

    this.scene.tweens.add({
      targets: ring,
      scaleX: maxScale,
      scaleY: maxScale,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  /**
   * Emit spark particles using sprites
   */
  emitSparks(x: number, y: number, count: number = 8, color: 'yellow' | 'white' = 'yellow'): void {
    const textureKey = `effect_spark_${color}`;
    if (!this.hasTexture(textureKey)) {
      this.emitSparkles(x, y, color === 'yellow' ? 0xffff00 : 0xffffff, count);
      return;
    }

    for (let i = 0; i < count; i++) {
      const spark = this.scene.add.image(x, y, textureKey);
      spark.setDepth(100);
      spark.setScale(0.3 + Math.random() * 0.3);

      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 50;

      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.1,
        angle: Math.random() * 360,
        duration: 300 + Math.random() * 200,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  /**
   * Emit smoke puff particles (for rocket trails)
   */
  emitSmokePuff(x: number, y: number, count: number = 3): void {
    if (!this.hasTexture('effect_smoke_puff')) {
      this.emitRocketTrail(x, y, 0xcccccc);
      return;
    }

    for (let i = 0; i < count; i++) {
      const smoke = this.scene.add.image(
        x + (Math.random() - 0.5) * 20,
        y + (Math.random() - 0.5) * 20,
        'effect_smoke_puff'
      );
      smoke.setDepth(90);
      smoke.setScale(0.2 + Math.random() * 0.2);
      smoke.setAlpha(0.6);

      this.scene.tweens.add({
        targets: smoke,
        y: smoke.y - 20 - Math.random() * 30,
        alpha: 0,
        scaleX: smoke.scaleX * 1.5,
        scaleY: smoke.scaleY * 1.5,
        duration: 400 + Math.random() * 200,
        ease: 'Quad.easeOut',
        onComplete: () => smoke.destroy(),
      });
    }
  }

  /**
   * Emit debris particles (for tile destruction)
   */
  emitDebris(x: number, y: number, color: 'orange' | 'blue', count: number = 6): void {
    const textureKey = `effect_debris_${color}`;
    if (!this.hasTexture(textureKey)) {
      this.emitMatchParticles(x, y, color === 'orange' ? 0xff8800 : 0x0088ff, count);
      return;
    }

    for (let i = 0; i < count; i++) {
      const debris = this.scene.add.image(x, y, textureKey);
      debris.setDepth(95);
      debris.setScale(0.3 + Math.random() * 0.3);
      debris.setAngle(Math.random() * 360);

      const angle = Math.random() * Math.PI * 2;
      const targetX = x + Math.cos(angle) * (40 + Math.random() * 40);
      const targetY = y + Math.sin(angle) * (40 + Math.random() * 40);

      this.scene.tweens.add({
        targets: debris,
        x: targetX,
        y: targetY + 30, // Add gravity effect
        alpha: 0,
        angle: debris.angle + (Math.random() - 0.5) * 360,
        scale: 0.1,
        duration: 400 + Math.random() * 200,
        ease: 'Quad.easeOut',
        onComplete: () => debris.destroy(),
      });
    }
  }

  /**
   * Emit ice crack overlay (for ice obstacle)
   */
  emitIceCrack(x: number, y: number, tileSize: number): void {
    if (!this.hasTexture('effect_ice_crack')) {
      return;
    }

    const crack = this.scene.add.image(x, y, 'effect_ice_crack');
    crack.setDepth(85);
    crack.setScale(tileSize / crack.width);
    crack.setAlpha(0);

    this.scene.tweens.add({
      targets: crack,
      alpha: 0.8,
      duration: 100,
      yoyo: true,
      hold: 200,
      onComplete: () => crack.destroy(),
    });
  }

  /**
   * Emit ice shard particles (for ice obstacle destruction)
   */
  emitIceShards(x: number, y: number, count: number = 8): void {
    if (!this.hasTexture('effect_ice_shard')) {
      this.emitMatchParticles(x, y, 0x88ddff, count);
      return;
    }

    for (let i = 0; i < count; i++) {
      const shard = this.scene.add.image(x, y, 'effect_ice_shard');
      shard.setDepth(95);
      shard.setScale(0.2 + Math.random() * 0.3);
      shard.setAngle(Math.random() * 360);
      shard.setTint(0x88ddff);

      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 50;

      this.scene.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance + 20,
        alpha: 0,
        angle: shard.angle + (Math.random() - 0.5) * 180,
        scale: 0.05,
        duration: 400 + Math.random() * 200,
        ease: 'Quad.easeOut',
        onComplete: () => shard.destroy(),
      });
    }
  }

  /**
   * Emit chain link particles (for chain obstacle destruction)
   */
  emitChainBreak(x: number, y: number, count: number = 4): void {
    if (!this.hasTexture('effect_chain_link')) {
      this.emitMatchParticles(x, y, 0x888888, count);
      return;
    }

    for (let i = 0; i < count; i++) {
      const link = this.scene.add.image(x, y, 'effect_chain_link');
      link.setDepth(95);
      link.setScale(0.3 + Math.random() * 0.2);
      link.setAngle(Math.random() * 360);

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const distance = 40 + Math.random() * 40;

      this.scene.tweens.add({
        targets: link,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance + 50, // Heavy fall
        alpha: 0,
        angle: link.angle + (Math.random() - 0.5) * 360,
        duration: 500 + Math.random() * 200,
        ease: 'Quad.easeIn',
        onComplete: () => link.destroy(),
      });
    }
  }

  /**
   * Emit wood splinter particles (for box obstacle destruction)
   */
  emitWoodSplinters(x: number, y: number, count: number = 6): void {
    if (!this.hasTexture('effect_wood_splinter')) {
      this.emitMatchParticles(x, y, 0x8b4513, count);
      return;
    }

    for (let i = 0; i < count; i++) {
      const splinter = this.scene.add.image(x, y, 'effect_wood_splinter');
      splinter.setDepth(95);
      splinter.setScale(0.25 + Math.random() * 0.25);
      splinter.setAngle(Math.random() * 360);

      const angle = Math.random() * Math.PI * 2;
      const distance = 35 + Math.random() * 45;

      this.scene.tweens.add({
        targets: splinter,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance + 30,
        alpha: 0,
        angle: splinter.angle + (Math.random() - 0.5) * 360,
        scale: 0.1,
        duration: 450 + Math.random() * 200,
        ease: 'Quad.easeOut',
        onComplete: () => splinter.destroy(),
      });
    }
  }

  /**
   * Emit rainbow burst (for color bomb)
   */
  emitRainbowBurst(x: number, y: number, scale: number = 1): void {
    if (!this.hasTexture('effect_rainbow_burst')) {
      // Fallback to colored circles
      const colors = [0xff0000, 0xff7700, 0xffff00, 0x00ff00, 0x0000ff, 0x8800ff];
      colors.forEach((color, i) => {
        this.scene.time.delayedCall(i * 30, () => {
          this.emitBurst(x, y, color, 5);
        });
      });
      return;
    }

    const burst = this.scene.add.image(x, y, 'effect_rainbow_burst');
    burst.setDepth(100);
    burst.setScale(0.1 * scale);
    burst.setAlpha(0.9);

    this.scene.tweens.add({
      targets: burst,
      scaleX: 2 * scale,
      scaleY: 2 * scale,
      alpha: 0,
      angle: 45,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => burst.destroy(),
    });
  }

  /**
   * Emit magic star particles (for color bomb)
   */
  emitMagicStars(x: number, y: number, count: number = 8): void {
    if (!this.hasTexture('effect_magic_star')) {
      const colors = [0xff0000, 0xffff00, 0x00ff00, 0x0000ff, 0xff00ff];
      this.emitSparkles(x, y, colors[Math.floor(Math.random() * colors.length)], count);
      return;
    }

    for (let i = 0; i < count; i++) {
      const star = this.scene.add.image(x, y, 'effect_magic_star');
      star.setDepth(100);
      star.setScale(0.2 + Math.random() * 0.3);

      const angle = (i / count) * Math.PI * 2;
      const distance = 40 + Math.random() * 60;

      this.scene.tweens.add({
        targets: star,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.05,
        angle: 360,
        duration: 400 + Math.random() * 200,
        ease: 'Quad.easeOut',
        onComplete: () => star.destroy(),
      });
    }
  }

  /**
   * Emit rocket flame trail
   */
  emitRocketFlame(x: number, y: number, direction: 'left' | 'right' | 'up' | 'down'): void {
    if (!this.hasTexture('effect_rocket_flame')) {
      this.emitRocketTrail(x, y, 0xff8800);
      return;
    }

    const flame = this.scene.add.image(x, y, 'effect_rocket_flame');
    flame.setDepth(90);
    flame.setScale(0.4);

    // Rotate based on direction
    switch (direction) {
      case 'left': flame.setAngle(180); break;
      case 'right': flame.setAngle(0); break;
      case 'up': flame.setAngle(-90); break;
      case 'down': flame.setAngle(90); break;
    }

    this.scene.tweens.add({
      targets: flame,
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => flame.destroy(),
    });
  }

  /**
   * Emit speed lines (for fast movement effects)
   */
  emitSpeedLines(x: number, y: number, direction: 'horizontal' | 'vertical', count: number = 5): void {
    if (!this.hasTexture('effect_speed_line')) {
      return;
    }

    for (let i = 0; i < count; i++) {
      const line = this.scene.add.image(x, y, 'effect_speed_line');
      line.setDepth(85);
      line.setScale(0.3 + Math.random() * 0.3, 0.2);
      line.setAlpha(0.6);

      if (direction === 'vertical') {
        line.setAngle(90);
        line.setPosition(
          x + (Math.random() - 0.5) * 40,
          y + (Math.random() - 0.5) * 20
        );
      } else {
        line.setPosition(
          x + (Math.random() - 0.5) * 20,
          y + (Math.random() - 0.5) * 40
        );
      }

      this.scene.tweens.add({
        targets: line,
        alpha: 0,
        scaleX: line.scaleX * 2,
        duration: 200,
        ease: 'Linear',
        onComplete: () => line.destroy(),
      });
    }
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
