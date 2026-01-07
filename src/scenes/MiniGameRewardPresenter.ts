import Phaser from 'phaser';
import { Reward } from '../types';

export interface MiniGameResult {
  won: boolean;
  rewards: Reward[];
  message?: string;
}

/**
 * Shared result screen presenter for mini-games.
 * Provides consistent UI for showing win/lose results and rewards.
 */
export class MiniGameRewardPresenter {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private onClose?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Show the result screen with rewards
   */
  show(result: MiniGameResult, onClose?: () => void): void {
    this.onClose = onClose;
    const { width, height } = this.scene.scale;

    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(1000);

    // Dim background
    const dimBg = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    dimBg.setInteractive(); // Block clicks behind
    this.container.add(dimBg);

    // Result panel
    const panelWidth = 320;
    const panelHeight = result.won ? 380 : 280;
    const panelY = height / 2;

    // Panel shadow
    const shadowGraphics = this.scene.add.graphics();
    shadowGraphics.fillStyle(0x000000, 0.5);
    shadowGraphics.fillRoundedRect(width / 2 - panelWidth / 2 + 5, panelY - panelHeight / 2 + 5, panelWidth, panelHeight, 20);
    this.container.add(shadowGraphics);

    // Panel background
    const panelGraphics = this.scene.add.graphics();
    panelGraphics.fillStyle(0x1e2a3a, 1);
    panelGraphics.fillRoundedRect(width / 2 - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 20);
    panelGraphics.lineStyle(3, result.won ? 0x44ff44 : 0xff4444, 1);
    panelGraphics.strokeRoundedRect(width / 2 - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 20);
    this.container.add(panelGraphics);

    // Top highlight
    const highlightGraphics = this.scene.add.graphics();
    highlightGraphics.fillStyle(result.won ? 0x44ff44 : 0xff4444, 0.15);
    highlightGraphics.fillRoundedRect(width / 2 - panelWidth / 2 + 4, panelY - panelHeight / 2 + 4, panelWidth - 8, 60, { tl: 16, tr: 16, bl: 0, br: 0 });
    this.container.add(highlightGraphics);

    // Title
    const titleText = result.won ? 'YOU WON!' : 'GAME OVER';
    const titleColor = result.won ? '#44ff44' : '#ff4444';
    const title = this.scene.add.text(width / 2, panelY - panelHeight / 2 + 45, titleText, {
      fontSize: '32px',
      fontFamily: 'Arial Black',
      color: titleColor,
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.container.add(title);

    // Custom message
    if (result.message) {
      const message = this.scene.add.text(width / 2, panelY - panelHeight / 2 + 85, result.message, {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#aabbcc',
        align: 'center',
        wordWrap: { width: panelWidth - 40 },
      }).setOrigin(0.5);
      this.container.add(message);
    }

    // Rewards section (if won)
    if (result.won && result.rewards.length > 0) {
      const rewardsY = panelY - panelHeight / 2 + 130;

      const rewardsLabel = this.scene.add.text(width / 2, rewardsY, 'REWARDS', {
        fontSize: '14px',
        fontFamily: 'Arial Bold',
        color: '#888888',
      }).setOrigin(0.5);
      this.container.add(rewardsLabel);

      // Award rewards and display them
      this.displayRewards(result.rewards, width / 2, rewardsY + 30);
    }

    // Buttons
    const btnY = panelY + panelHeight / 2 - 55;
    this.createButton(width / 2 - 75, btnY, 'Play Again', 0x4a90d9, () => {
      this.hide();
      if (this.onClose) this.onClose();
      // Restart the current scene
      this.scene.scene.restart();
    });

    this.createButton(width / 2 + 75, btnY, 'Back', 0x3a4a5e, () => {
      this.hide();
      if (this.onClose) this.onClose();
      this.scene.scene.start('MiniGameHubScene');
    });

    // Animate in
    this.container.setAlpha(0);
    this.container.setScale(0.8);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Celebration particles for wins
    if (result.won) {
      this.createCelebration();
    }
  }

  private displayRewards(rewards: Reward[], x: number, startY: number): void {
    let y = startY;
    const spacing = 45;

    rewards.forEach((reward) => {
      const rewardContainer = this.scene.add.container(x, y);

      // Reward background pill
      const pillGraphics = this.scene.add.graphics();
      pillGraphics.fillStyle(0x2a3a4a, 1);
      pillGraphics.fillRoundedRect(-80, -18, 160, 36, 18);
      pillGraphics.lineStyle(1.5, 0x4a6a8a, 0.6);
      pillGraphics.strokeRoundedRect(-80, -18, 160, 36, 18);
      rewardContainer.add(pillGraphics);

      // Icon and text based on reward type
      if (reward.type === 'coins') {
        this.drawCoinIcon(rewardContainer, -50, 0);
        const text = this.scene.add.text(10, 0, `+${reward.amount} Coins`, {
          fontSize: '16px',
          fontFamily: 'Arial Bold',
          color: '#ffd700',
        }).setOrigin(0.5);
        rewardContainer.add(text);
      } else if (reward.type === 'diamonds') {
        this.drawDiamondIcon(rewardContainer, -50, 0);
        const text = this.scene.add.text(10, 0, `+${reward.amount} Diamonds`, {
          fontSize: '16px',
          fontFamily: 'Arial Bold',
          color: '#00bfff',
        }).setOrigin(0.5);
        rewardContainer.add(text);
      } else if (reward.type === 'booster') {
        const boosterNames: Record<string, string> = {
          hammer: 'Hammer',
          row_arrow: 'Bow',
          col_arrow: 'Laser',
          shuffle: 'Shuffle',
        };
        const name = boosterNames[reward.id || ''] || 'Booster';
        const text = this.scene.add.text(0, 0, `+${reward.amount}x ${name}`, {
          fontSize: '16px',
          fontFamily: 'Arial Bold',
          color: '#aa88ff',
        }).setOrigin(0.5);
        rewardContainer.add(text);
      }

      this.container.add(rewardContainer);
      y += spacing;
    });
  }

  private drawCoinIcon(container: Phaser.GameObjects.Container, x: number, y: number): void {
    // Use generated asset if available
    if (this.scene.textures.exists('ui_coin')) {
      const coinImg = this.scene.add.image(x, y, 'ui_coin').setDisplaySize(24, 24);
      container.add(coinImg);
    } else {
      const g = this.scene.add.graphics();
      g.fillStyle(0xffd700, 0.3);
      g.fillCircle(x, y, 14);
      g.fillStyle(0xffd700, 1);
      g.fillCircle(x, y, 11);
      g.fillStyle(0xffec8b, 1);
      g.fillCircle(x, y - 2, 6);
      container.add(g);

      const dollarSign = this.scene.add.text(x, y, '$', {
        fontSize: '10px',
        fontFamily: 'Arial Black',
        color: '#b8860b',
      }).setOrigin(0.5);
      container.add(dollarSign);
    }
  }

  private drawDiamondIcon(container: Phaser.GameObjects.Container, x: number, y: number): void {
    // Use generated asset if available
    if (this.scene.textures.exists('ui_diamond')) {
      const diamondImg = this.scene.add.image(x, y, 'ui_diamond').setDisplaySize(24, 24);
      container.add(diamondImg);
    } else {
      const g = this.scene.add.graphics();
      g.fillStyle(0x00bfff, 0.25);
      g.fillCircle(x, y, 13);
      g.fillStyle(0x00bfff, 1);
      g.fillTriangle(x, y - 9, x + 7, y, x, y + 9);
      g.fillTriangle(x, y - 9, x - 7, y, x, y + 9);
      g.fillStyle(0x87ceeb, 1);
      g.fillTriangle(x, y - 4, x + 3, y, x, y + 4);
      g.fillTriangle(x, y - 4, x - 3, y, x, y + 4);
      container.add(g);
    }
  }

  private createButton(x: number, y: number, label: string, color: number, onClick: () => void): void {
    const btnWidth = 120;
    const btnHeight = 42;

    const btnGraphics = this.scene.add.graphics();

    // Shadow
    btnGraphics.fillStyle(0x000000, 0.4);
    btnGraphics.fillRoundedRect(x - btnWidth / 2 + 2, y - btnHeight / 2 + 2, btnWidth, btnHeight, 21);

    // Main button
    btnGraphics.fillStyle(color, 1);
    btnGraphics.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 21);

    // Top highlight
    const lighterColor = Phaser.Display.Color.IntegerToColor(color).lighten(30).color;
    btnGraphics.fillStyle(lighterColor, 0.4);
    btnGraphics.fillRoundedRect(x - btnWidth / 2 + 3, y - btnHeight / 2 + 3, btnWidth - 6, btnHeight / 2 - 3, { tl: 18, tr: 18, bl: 0, br: 0 });

    // Border
    btnGraphics.lineStyle(1.5, lighterColor, 0.7);
    btnGraphics.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 21);

    this.container.add(btnGraphics);

    const hitArea = this.scene.add.rectangle(x, y, btnWidth, btnHeight, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick);
    this.container.add(hitArea);

    const text = this.scene.add.text(x, y, label, {
      fontSize: '14px',
      fontFamily: 'Arial Bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.container.add(text);
  }

  private createCelebration(): void {
    const { width, height } = this.scene.scale;

    for (let i = 0; i < 30; i++) {
      const x = width / 2 + (Math.random() - 0.5) * 300;
      const y = height / 2;
      const colors = [0xffd700, 0xff6347, 0x44ff44, 0x4169e1, 0xff1493, 0x00bfff];
      const color = colors[Math.floor(Math.random() * colors.length)];

      const particle = this.scene.add.circle(x, y, 6 + Math.random() * 4, color);
      particle.setDepth(1001);

      this.scene.tweens.add({
        targets: particle,
        x: x + (Math.random() - 0.5) * 400,
        y: y + Math.random() * 400 - 300,
        alpha: 0,
        scale: 0,
        duration: 1500 + Math.random() * 500,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  hide(): void {
    if (this.container) {
      this.scene.tweens.add({
        targets: this.container,
        alpha: 0,
        scale: 0.8,
        duration: 200,
        onComplete: () => {
          this.container.destroy();
        },
      });
    }
  }
}

/**
 * Shows a first-time tutorial overlay for a mini-game.
 */
export class MiniGameTutorial {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Show tutorial if it's the first time playing this game.
   * Returns a promise that resolves when the user dismisses the tutorial.
   */
  showIfFirstTime(gameId: string, title: string, instructions: string[]): Promise<void> {
    const storageKey = `minigame_tutorial_${gameId}`;
    const hasSeenTutorial = localStorage.getItem(storageKey) === 'true';

    if (hasSeenTutorial) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.show(title, instructions, () => {
        localStorage.setItem(storageKey, 'true');
        resolve();
      });
    });
  }

  private show(title: string, instructions: string[], onClose: () => void): void {
    const { width, height } = this.scene.scale;

    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(1000);

    // Dim background
    const dimBg = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    dimBg.setInteractive();
    this.container.add(dimBg);

    // Panel
    const panelWidth = 320;
    const panelHeight = 280 + instructions.length * 30;
    const panelY = height / 2;

    const panelGraphics = this.scene.add.graphics();
    panelGraphics.fillStyle(0x1e2a3a, 1);
    panelGraphics.fillRoundedRect(width / 2 - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 20);
    panelGraphics.lineStyle(3, 0x4a90d9, 1);
    panelGraphics.strokeRoundedRect(width / 2 - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 20);
    this.container.add(panelGraphics);

    // "HOW TO PLAY" header
    const headerBg = this.scene.add.graphics();
    headerBg.fillStyle(0x4a90d9, 0.3);
    headerBg.fillRoundedRect(width / 2 - panelWidth / 2 + 4, panelY - panelHeight / 2 + 4, panelWidth - 8, 50, { tl: 16, tr: 16, bl: 0, br: 0 });
    this.container.add(headerBg);

    const header = this.scene.add.text(width / 2, panelY - panelHeight / 2 + 30, 'HOW TO PLAY', {
      fontSize: '18px',
      fontFamily: 'Arial Black',
      color: '#4a90d9',
    }).setOrigin(0.5);
    this.container.add(header);

    // Game title
    const titleText = this.scene.add.text(width / 2, panelY - panelHeight / 2 + 75, title, {
      fontSize: '24px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.container.add(titleText);

    // Instructions
    let y = panelY - panelHeight / 2 + 120;
    instructions.forEach((instruction, index) => {
      const bulletContainer = this.scene.add.container(width / 2 - panelWidth / 2 + 30, y);

      // Bullet number
      const bulletBg = this.scene.add.circle(0, 0, 12, 0x4a90d9);
      bulletContainer.add(bulletBg);

      const bulletNum = this.scene.add.text(0, 0, (index + 1).toString(), {
        fontSize: '12px',
        fontFamily: 'Arial Bold',
        color: '#ffffff',
      }).setOrigin(0.5);
      bulletContainer.add(bulletNum);

      const instructionText = this.scene.add.text(25, 0, instruction, {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#cccccc',
        wordWrap: { width: panelWidth - 80 },
      }).setOrigin(0, 0.5);
      bulletContainer.add(instructionText);

      this.container.add(bulletContainer);
      y += 35;
    });

    // "Got it!" button
    const btnY = panelY + panelHeight / 2 - 45;
    const btnWidth = 140;
    const btnHeight = 45;

    const btnGraphics = this.scene.add.graphics();
    btnGraphics.fillStyle(0x000000, 0.4);
    btnGraphics.fillRoundedRect(width / 2 - btnWidth / 2 + 2, btnY - btnHeight / 2 + 2, btnWidth, btnHeight, 22);
    btnGraphics.fillStyle(0x44aa44, 1);
    btnGraphics.fillRoundedRect(width / 2 - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 22);
    btnGraphics.fillStyle(0x66cc66, 0.4);
    btnGraphics.fillRoundedRect(width / 2 - btnWidth / 2 + 3, btnY - btnHeight / 2 + 3, btnWidth - 6, btnHeight / 2 - 3, { tl: 19, tr: 19, bl: 0, br: 0 });
    btnGraphics.lineStyle(1.5, 0x66cc66, 0.7);
    btnGraphics.strokeRoundedRect(width / 2 - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 22);
    this.container.add(btnGraphics);

    const btnHit = this.scene.add.rectangle(width / 2, btnY, btnWidth, btnHeight, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.hide();
        onClose();
      });
    this.container.add(btnHit);

    const btnText = this.scene.add.text(width / 2, btnY, 'Got it!', {
      fontSize: '18px',
      fontFamily: 'Arial Bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.container.add(btnText);

    // Animate in
    this.container.setAlpha(0);
    this.container.setScale(0.8);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  private hide(): void {
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scale: 0.8,
      duration: 200,
      onComplete: () => {
        this.container.destroy();
      },
    });
  }
}
