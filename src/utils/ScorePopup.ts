import Phaser from 'phaser';

/**
 * ScorePopup shows floating score numbers when points are earned.
 * Numbers float up and fade out from the match position.
 */
export class ScorePopup {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Show a score popup at the given position
   */
  show(x: number, y: number, score: number, options: ScorePopupOptions = {}): void {
    const {
      color = '#ffffff',
      fontSize = 24,
      duration = 800,
      riseDistance = 50,
      hasBonus = false,
      bonusText = '',
    } = options;

    // Create score text
    const text = this.scene.add.text(x, y, `+${score}`, {
      fontSize: `${fontSize}px`,
      fontStyle: 'bold',
      color,
      stroke: '#000000',
      strokeThickness: 3,
      shadow: {
        offsetX: 1,
        offsetY: 1,
        color: '#000000',
        blur: 2,
        fill: true,
      },
    });
    text.setOrigin(0.5, 0.5);
    text.setDepth(180);

    // Scale pop effect
    text.setScale(0.5);
    this.scene.tweens.add({
      targets: text,
      scaleX: 1,
      scaleY: 1,
      duration: 100,
      ease: 'Back.easeOut',
    });

    // Float up and fade
    this.scene.tweens.add({
      targets: text,
      y: y - riseDistance,
      alpha: 0,
      duration,
      ease: 'Quad.easeOut',
      onComplete: () => {
        text.destroy();
      },
    });

    // Show bonus text if applicable
    if (hasBonus && bonusText) {
      this.showBonusText(x, y + 20, bonusText);
    }
  }

  /**
   * Show a bonus text (e.g., "POWERUP!")
   */
  private showBonusText(x: number, y: number, message: string): void {
    const text = this.scene.add.text(x, y, message, {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 2,
    });
    text.setOrigin(0.5, 0.5);
    text.setDepth(180);
    text.setAlpha(0);

    // Fade in and rise
    this.scene.tweens.add({
      targets: text,
      y: y - 30,
      alpha: 1,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Then fade out
        this.scene.tweens.add({
          targets: text,
          y: y - 60,
          alpha: 0,
          duration: 500,
          delay: 200,
          ease: 'Quad.easeOut',
          onComplete: () => {
            text.destroy();
          },
        });
      },
    });
  }

  /**
   * Show score at a match position with automatic color based on score size
   */
  showAtMatch(x: number, y: number, score: number, isPowerup: boolean = false): void {
    let color = '#ffffff';
    let fontSize = 20;

    // Color and size based on score value
    if (score >= 200) {
      color = '#ff00ff'; // Magenta for big scores
      fontSize = 32;
    } else if (score >= 100) {
      color = '#ffd700'; // Gold
      fontSize = 28;
    } else if (score >= 50) {
      color = '#ff8c00'; // Orange
      fontSize = 24;
    }

    this.show(x, y, score, {
      color,
      fontSize,
      hasBonus: isPowerup,
      bonusText: isPowerup ? 'POWERUP!' : '',
    });
  }

  /**
   * Show cascade multiplier bonus
   */
  showCascadeBonus(x: number, y: number, multiplier: number, score: number): void {
    const color = multiplier >= 3 ? '#ff1493' : multiplier >= 2 ? '#ffd700' : '#ffffff';

    this.show(x, y - 20, score, {
      color,
      fontSize: 24 + Math.min(multiplier * 2, 12),
    });

    // Show multiplier indicator
    if (multiplier > 1) {
      const multText = this.scene.add.text(x, y + 10, `x${multiplier.toFixed(1)}`, {
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffff00',
        stroke: '#000000',
        strokeThickness: 2,
      });
      multText.setOrigin(0.5, 0.5);
      multText.setDepth(180);

      this.scene.tweens.add({
        targets: multText,
        y: y - 20,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 600,
        ease: 'Quad.easeOut',
        onComplete: () => {
          multText.destroy();
        },
      });
    }
  }

  /**
   * Show bonus points for remaining moves at end of level
   */
  showEndBonus(x: number, y: number, movesRemaining: number, pointsPerMove: number): void {
    let delay = 0;
    const delayIncrement = 150;

    for (let i = 0; i < movesRemaining; i++) {
      this.scene.time.delayedCall(delay, () => {
        this.show(x + (Math.random() - 0.5) * 100, y, pointsPerMove, {
          color: '#00ff00',
          fontSize: 20,
          riseDistance: 80,
          duration: 1000,
        });
      });
      delay += delayIncrement;
    }
  }

  /**
   * Show a big score announcement (for total at end)
   */
  showTotalScore(x: number, y: number, score: number): void {
    const text = this.scene.add.text(x, y, score.toLocaleString(), {
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 6,
      shadow: {
        offsetX: 3,
        offsetY: 3,
        color: '#000000',
        blur: 6,
        fill: true,
      },
    });
    text.setOrigin(0.5, 0.5);
    text.setDepth(200);
    text.setScale(0);

    // Pop in animation
    this.scene.tweens.add({
      targets: text,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: text,
          scaleX: 1,
          scaleY: 1,
          duration: 150,
          ease: 'Quad.easeOut',
        });
      },
    });

    // The text stays visible (caller should manage cleanup)
    return;
  }
}

interface ScorePopupOptions {
  color?: string;
  fontSize?: number;
  duration?: number;
  riseDistance?: number;
  hasBonus?: boolean;
  bonusText?: string;
}
