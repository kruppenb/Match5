import Phaser from 'phaser';
import { Reward } from '../types';
import { getCurrencyManager } from '../meta/CurrencyManager';

interface TreasureChest {
  id: number;
  reward: Reward;
  isOpened: boolean;
  x: number;
  y: number;
  sprite?: Phaser.GameObjects.Container;
}

export class TreasureHuntScene extends Phaser.Scene {
  private chests: TreasureChest[] = [];
  private picksRemaining: number = 3;
  private picksText!: Phaser.GameObjects.Text;
  private rewardsEarned: Reward[] = [];
  private isComplete: boolean = false;

  constructor() {
    super({ key: 'TreasureHuntScene' });
  }

  preload(): void {
    this.load.image('booster_hammer', 'assets/sprites/boosters/hammer.png');
    this.load.image('booster_row_arrow', 'assets/sprites/boosters/arrow_h.png');
    this.load.image('booster_col_arrow', 'assets/sprites/boosters/beam_v.png');
    this.load.image('booster_shuffle', 'assets/sprites/boosters/lucky67.png');
  }

  create(): void {
    const { width, height } = this.scale;

    // Reset state
    this.picksRemaining = 3;
    this.rewardsEarned = [];
    this.isComplete = false;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Title
    this.add.text(width / 2, 50, 'TREASURE HUNT', {
      fontSize: '32px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Instructions
    this.add.text(width / 2, 90, 'Pick 3 chests to reveal your prizes!', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Picks remaining
    this.picksText = this.add.text(width / 2, 130, `Picks: ${this.picksRemaining}`, {
      fontSize: '24px',
      fontFamily: 'Arial Bold',
      color: '#ffd700',
    }).setOrigin(0.5);

    // Generate and display chests
    this.generateChests();
    this.displayChests();

    // Back button
    this.createBackButton();
  }

  private generateChests(): void {
    const rewards: Reward[] = [
      { type: 'coins', amount: 500 },
      { type: 'coins', amount: 400 },
      { type: 'coins', amount: 300 },
      { type: 'booster', amount: 2, id: 'hammer' },
      { type: 'booster', amount: 2, id: 'row_arrow' },
      { type: 'diamonds', amount: 10 },
      { type: 'coins', amount: 200 },
      { type: 'booster', amount: 2, id: 'shuffle' },
      { type: 'coins', amount: 150 },
    ];

    // Shuffle rewards
    const shuffled = this.shuffle([...rewards]);

    this.chests = shuffled.map((reward, index) => ({
      id: index,
      reward,
      isOpened: false,
      x: 0,
      y: 0,
    }));
  }

  private shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  private displayChests(): void {
    const { width, height } = this.scale;
    const cols = 3;
    const chestWidth = 100;
    const chestHeight = 100;
    const startX = width / 2 - chestWidth;
    const startY = height / 2 - chestHeight - 30;

    this.chests.forEach((chest, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (chestWidth + 20);
      const y = startY + row * (chestHeight + 20);

      chest.x = x;
      chest.y = y;

      this.createChestSprite(chest);
    });
  }

  private createChestSprite(chest: TreasureChest): void {
    const container = this.add.container(chest.x, chest.y);

    // Chest body
    const body = this.add.rectangle(0, 10, 80, 60, 0x8b4513)
      .setStrokeStyle(3, 0x654321);

    // Chest lid
    const lid = this.add.rectangle(0, -20, 85, 30, 0xa0522d)
      .setStrokeStyle(3, 0x8b4513);

    // Lock
    const lock = this.add.circle(0, 10, 10, 0xffd700)
      .setStrokeStyle(2, 0xb8860b);

    // Question mark
    const question = this.add.text(0, 0, '?', {
      fontSize: '32px',
      fontFamily: 'Arial Black',
      color: '#ffd700',
    }).setOrigin(0.5);

    container.add([body, lid, lock, question]);
    container.setSize(90, 90);
    container.setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        if (!chest.isOpened && !this.isComplete) {
          this.tweens.add({
            targets: container,
            scale: 1.1,
            duration: 100,
          });
        }
      })
      .on('pointerout', () => {
        if (!chest.isOpened) {
          this.tweens.add({
            targets: container,
            scale: 1,
            duration: 100,
          });
        }
      })
      .on('pointerdown', () => this.openChest(chest, container, lid, question));

    chest.sprite = container;

    // Entrance animation
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 300,
      delay: chest.id * 50,
      ease: 'Back.easeOut',
    });
  }

  private openChest(
    chest: TreasureChest,
    container: Phaser.GameObjects.Container,
    lid: Phaser.GameObjects.Rectangle,
    question: Phaser.GameObjects.Text
  ): void {
    if (chest.isOpened || this.picksRemaining <= 0 || this.isComplete) return;

    chest.isOpened = true;
    this.picksRemaining--;
    this.picksText.setText(`Picks: ${this.picksRemaining}`);

    // Disable interaction
    container.disableInteractive();

    // Open animation - lift lid
    this.tweens.add({
      targets: lid,
      y: -50,
      angle: -30,
      duration: 300,
      ease: 'Power2',
    });

    // Fade question mark
    this.tweens.add({
      targets: question,
      alpha: 0,
      duration: 200,
    });

    // Show reward
    this.time.delayedCall(300, () => {
      const rewardContainer = this.add.container(0, 0);
      this.createRewardDisplay(rewardContainer, chest.reward);

      const rewardText = this.getRewardText(chest.reward);
      const rewardLabel = this.add.text(0, 10, rewardText, {
        fontSize: '16px',
        fontFamily: 'Arial Black',
        color: '#44ff44',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5);
      rewardContainer.add(rewardLabel);

      container.add(rewardContainer);

      // Pop animation
      this.tweens.add({
        targets: rewardContainer,
        scale: { from: 0, to: 1.2 },
        duration: 300,
        yoyo: true,
        hold: 100,
        ease: 'Back.easeOut',
        onComplete: () => {
          rewardContainer.setScale(1);
        },
      });

      // Award the reward
      const currencyManager = getCurrencyManager();
      currencyManager.awardReward(chest.reward, 'treasure_hunt');
      this.rewardsEarned.push(chest.reward);

      // Check if done
      if (this.picksRemaining === 0) {
        this.time.delayedCall(500, () => this.showResults());
      }
    });
  }

  private getRewardText(reward: Reward): string {
    switch (reward.type) {
      case 'coins':
        return `+${reward.amount}`;
      case 'diamonds':
        return `+${reward.amount}`;
      case 'booster':
        return `x${reward.amount}`;
      default:
        return '???';
    }
  }

  private getBoosterName(id: string): string {
    const nameMap: Record<string, string> = {
      hammer: 'Hammer',
      row_arrow: 'Row Arrow',
      col_arrow: 'Col Arrow',
      shuffle: 'Shuffle',
    };
    return nameMap[id] || 'Booster';
  }

  private createRewardDisplay(container: Phaser.GameObjects.Container, reward: Reward): void {
    if (reward.type === 'coins') {
      // Draw coin icon
      const coinGraphics = this.add.graphics();
      coinGraphics.fillStyle(0xffd700, 1);
      coinGraphics.fillCircle(0, -10, 8);
      coinGraphics.fillStyle(0xffec8b, 1);
      coinGraphics.fillCircle(0, -12, 4);
      container.add(coinGraphics);
    } else if (reward.type === 'diamonds') {
      // Draw diamond icon
      const diamondGraphics = this.add.graphics();
      diamondGraphics.fillStyle(0x00bfff, 1);
      diamondGraphics.fillTriangle(0, -18, 5, -10, 0, -2);
      diamondGraphics.fillTriangle(0, -18, -5, -10, 0, -2);
      diamondGraphics.fillStyle(0x87ceeb, 1);
      diamondGraphics.fillTriangle(0, -15, 2, -10, 0, -5);
      container.add(diamondGraphics);
    } else if (reward.type === 'booster' && reward.id) {
      // Use booster image
      const boosterKey = `booster_${reward.id}`;
      if (this.textures.exists(boosterKey)) {
        const icon = this.add.image(0, -10, boosterKey).setDisplaySize(20, 20);
        container.add(icon);
      }
    }
  }

  private showResults(): void {
    this.isComplete = true;
    const { width, height } = this.scale;

    // Reveal all remaining chests
    this.chests.forEach(chest => {
      if (!chest.isOpened && chest.sprite) {
        // Gray out unopened chests
        chest.sprite.setAlpha(0.5);
      }
    });

    // Summary panel
    const panelY = height - 150;
    this.add.rectangle(width / 2, panelY, width - 40, 120, 0x2a2a3e)
      .setStrokeStyle(3, 0x4a90d9);

    this.add.text(width / 2, panelY - 35, 'Your Prizes!', {
      fontSize: '22px',
      fontFamily: 'Arial Black',
      color: '#ffd700',
    }).setOrigin(0.5);

    // List rewards
    const rewardSummary = this.rewardsEarned.map(r => {
      if (r.type === 'coins') return `+${r.amount} coins`;
      if (r.type === 'diamonds') return `+${r.amount} diamonds`;
      return `${r.amount}x ${this.getBoosterName(r.id || '')}`;
    }).join('  |  ');

    this.add.text(width / 2, panelY + 10, rewardSummary, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Done button
    const doneBtn = this.add.rectangle(width / 2, panelY + 45, 120, 40, 0x44aa44)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => doneBtn.setFillStyle(0x55bb55))
      .on('pointerout', () => doneBtn.setFillStyle(0x44aa44))
      .on('pointerdown', () => this.scene.start('MiniGameHubScene'));

    this.add.text(width / 2, panelY + 45, 'DONE', {
      fontSize: '18px',
      fontFamily: 'Arial Bold',
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  private createBackButton(): void {
    const backBtn = this.add.rectangle(60, 50, 100, 40, 0x4a4a5e)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backBtn.setFillStyle(0x5a5a6e))
      .on('pointerout', () => backBtn.setFillStyle(0x4a4a5e))
      .on('pointerdown', () => this.scene.start('MiniGameHubScene'));

    this.add.text(60, 50, '← Back', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
  }
}
