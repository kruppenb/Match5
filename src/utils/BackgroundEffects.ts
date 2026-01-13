import Phaser from 'phaser';
import { CONFIG } from '../config';

interface BackgroundParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
  alpha: number;
  graphics?: Phaser.GameObjects.Graphics;
}

interface ParticleTheme {
  colors: number[];
  sizeMin: number;
  sizeMax: number;
  alphaMin: number;
  alphaMax: number;
}

const LEVEL_THEMES: Record<string, ParticleTheme> = {
  title: {
    colors: [0xffd700, 0xffec8b, 0x6699ff, 0xffffff, 0xff99cc],
    sizeMin: 2,
    sizeMax: 6,
    alphaMin: 0.4,
    alphaMax: 0.9,
  },
  garden: {
    colors: [0x88cc44, 0xaadd66, 0xffd700, 0xffee88],
    sizeMin: 2,
    sizeMax: 5,
    alphaMin: 0.3,
    alphaMax: 0.7,
  },
  castle: {
    colors: [0x6699ff, 0x99ccff, 0xffffff, 0xccddff],
    sizeMin: 2,
    sizeMax: 4,
    alphaMin: 0.4,
    alphaMax: 0.8,
  },
  kitchen: {
    colors: [0xffffff, 0xeeeeee, 0xdddddd, 0xffeecc],
    sizeMin: 1,
    sizeMax: 3,
    alphaMin: 0.2,
    alphaMax: 0.5,
  },
  library: {
    colors: [0xffd700, 0xffcc00, 0xddaa00, 0xffee88],
    sizeMin: 1,
    sizeMax: 4,
    alphaMin: 0.3,
    alphaMax: 0.6,
  },
  sky_tower: {
    colors: [0xffffff, 0xccffff, 0x99eeff, 0xffffff],
    sizeMin: 2,
    sizeMax: 5,
    alphaMin: 0.5,
    alphaMax: 0.9,
  },
};

export class BackgroundEffects {
  private scene: Phaser.Scene;
  private particles: BackgroundParticle[] = [];
  private lightOverlay?: Phaser.GameObjects.Graphics;
  private particleTimer?: Phaser.Time.TimerEvent;
  private isUpdating = false;
  private theme: ParticleTheme;
  private width: number;
  private height: number;

  constructor(scene: Phaser.Scene, levelIdOrTheme: number | string) {
    this.scene = scene;
    this.width = scene.scale.width;
    this.height = scene.scale.height;
    this.theme = this.getTheme(levelIdOrTheme);
  }

  private getTheme(levelIdOrTheme: number | string): ParticleTheme {
    // If a theme name is passed directly, use it
    if (typeof levelIdOrTheme === 'string') {
      return LEVEL_THEMES[levelIdOrTheme] || LEVEL_THEMES.castle;
    }
    // Otherwise, determine theme from level ID
    const levelId = levelIdOrTheme;
    if (levelId <= 10) return LEVEL_THEMES.garden;
    if (levelId <= 20) return LEVEL_THEMES.castle;
    if (levelId <= 30) return LEVEL_THEMES.kitchen;
    if (levelId <= 40) return LEVEL_THEMES.library;
    return LEVEL_THEMES.sky_tower;
  }

  create(): void {
    if (CONFIG.EFFECTS.LIGHT_OVERLAY.ENABLED) {
      this.createLightOverlay();
    }
    if (CONFIG.EFFECTS.BACKGROUND_PARTICLES.ENABLED) {
      this.startParticleEmitter();
    }
  }

  private createLightOverlay(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 3;

    this.lightOverlay = this.scene.add.graphics();
    this.lightOverlay.setDepth(-6);
    this.lightOverlay.setBlendMode(Phaser.BlendModes.ADD);

    // Draw radial gradient simulation with concentric circles
    const maxRadius = 350;
    const steps = 15;
    for (let i = steps; i > 0; i--) {
      const radius = (i / steps) * maxRadius;
      const alpha = 0.03 * (1 - i / steps);
      this.lightOverlay.fillStyle(0xffffee, alpha);
      this.lightOverlay.fillCircle(centerX, centerY, radius);
    }

    // Animate the glow pulsing
    this.scene.tweens.add({
      targets: this.lightOverlay,
      alpha: { from: CONFIG.EFFECTS.LIGHT_OVERLAY.INTENSITY, to: 1 },
      duration: CONFIG.EFFECTS.LIGHT_OVERLAY.PULSE_DURATION,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private startParticleEmitter(): void {
    const cfg = CONFIG.EFFECTS.BACKGROUND_PARTICLES;

    // Spawn initial particles spread across the screen
    const initialCount = Math.floor(cfg.MAX_PARTICLES / 3);
    for (let i = 0; i < initialCount; i++) {
      this.spawnParticle(Math.random() * cfg.LIFESPAN);
    }

    // Timer to spawn new particles
    this.particleTimer = this.scene.time.addEvent({
      delay: cfg.FREQUENCY,
      callback: () => this.spawnParticle(),
      loop: true,
    });

    this.startUpdate();
  }

  private spawnParticle(randomLifeOffset: number = 0): void {
    const cfg = CONFIG.EFFECTS.BACKGROUND_PARTICLES;

    if (this.particles.length >= cfg.MAX_PARTICLES) {
      return;
    }

    const color = this.theme.colors[Math.floor(Math.random() * this.theme.colors.length)];
    const size = this.theme.sizeMin + Math.random() * (this.theme.sizeMax - this.theme.sizeMin);
    const alpha = this.theme.alphaMin + Math.random() * (this.theme.alphaMax - this.theme.alphaMin);

    // Random position across the screen
    const x = Math.random() * this.width;
    const y = Math.random() * this.height;

    // Gentle random velocity with slight upward bias
    const speed = cfg.SPEED_MIN + Math.random() * (cfg.SPEED_MAX - cfg.SPEED_MIN);
    const angle = Math.random() * Math.PI * 2;
    const vx = Math.cos(angle) * speed * 0.01;
    const vy = Math.sin(angle) * speed * 0.01;

    const maxLife = cfg.LIFESPAN / 16; // Convert ms to frames (~60fps)
    const life = maxLife - (randomLifeOffset / 16);

    const graphics = this.scene.add.graphics();
    graphics.setDepth(-5);
    graphics.setBlendMode(Phaser.BlendModes.ADD);
    graphics.fillStyle(color, 1);

    // Draw a soft sparkle shape
    this.drawSparkle(graphics, size);
    graphics.setPosition(x, y);
    graphics.setAlpha(alpha);

    this.particles.push({
      x,
      y,
      vx,
      vy,
      life,
      maxLife,
      color,
      size,
      alpha,
      graphics,
    });
  }

  private drawSparkle(graphics: Phaser.GameObjects.Graphics, size: number): void {
    // Draw a 4-point star/diamond sparkle
    const innerSize = size * 0.3;

    graphics.beginPath();
    graphics.moveTo(0, -size);
    graphics.lineTo(innerSize, -innerSize);
    graphics.lineTo(size, 0);
    graphics.lineTo(innerSize, innerSize);
    graphics.lineTo(0, size);
    graphics.lineTo(-innerSize, innerSize);
    graphics.lineTo(-size, 0);
    graphics.lineTo(-innerSize, -innerSize);
    graphics.closePath();
    graphics.fillPath();
  }

  private startUpdate(): void {
    if (this.isUpdating) return;
    this.isUpdating = true;
    this.scene.events.on('update', this.update, this);
  }

  private stopUpdate(): void {
    if (!this.isUpdating) return;
    this.isUpdating = false;
    this.scene.events.off('update', this.update, this);
  }

  private update = (): void => {
    const cfg = CONFIG.EFFECTS.BACKGROUND_PARTICLES;
    const gravityPerFrame = cfg.GRAVITY_Y * 0.001;

    const toRemove: number[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Update position with gentle floating motion
      p.x += p.vx;
      p.y += p.vy;
      p.vy += gravityPerFrame; // Negative gravity = floats up
      p.life--;

      // Add slight horizontal drift
      p.vx += (Math.random() - 0.5) * 0.02;

      // Wrap around screen edges
      if (p.x < -10) p.x = this.width + 10;
      if (p.x > this.width + 10) p.x = -10;
      if (p.y < -10) p.y = this.height + 10;
      if (p.y > this.height + 10) p.y = -10;

      // Update visual
      if (p.graphics) {
        p.graphics.setPosition(p.x, p.y);

        // Fade in and out based on life
        const lifeRatio = p.life / p.maxLife;
        // Fade in during first 20%, fade out during last 20%
        let fadeAlpha = 1;
        if (lifeRatio > 0.8) {
          fadeAlpha = (1 - lifeRatio) / 0.2;
        } else if (lifeRatio < 0.2) {
          fadeAlpha = lifeRatio / 0.2;
        }
        p.graphics.setAlpha(p.alpha * fadeAlpha);

        // Gentle scale pulsing
        const pulse = 0.9 + Math.sin(p.life * 0.1) * 0.1;
        p.graphics.setScale(pulse);
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

  destroy(): void {
    this.stopUpdate();

    if (this.particleTimer) {
      this.particleTimer.destroy();
      this.particleTimer = undefined;
    }

    for (const p of this.particles) {
      p.graphics?.destroy();
    }
    this.particles = [];

    if (this.lightOverlay) {
      this.lightOverlay.destroy();
      this.lightOverlay = undefined;
    }
  }
}
