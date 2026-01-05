import Phaser from 'phaser';
import { Reward } from '../types';
import { getCurrencyManager } from '../meta/CurrencyManager';

interface MatchCard {
  id: number;
  pairId: number;
  reward: Reward;
  isFlipped: boolean;
  isMatched: boolean;
  x: number;
  y: number;
  sprite?: Phaser.GameObjects.Container;
  frontFace?: Phaser.GameObjects.Container;
  backFace?: Phaser.GameObjects.Container;
}

export class LuckyMatchScene extends Phaser.Scene {
  private cards: MatchCard[] = [];
  private flippedCard: MatchCard | null = null;
  private matchesFound: number = 0;
  private readonly PAIRS_TO_FIND = 3;
  private canFlip: boolean = true;
  private matchesText!: Phaser.GameObjects.Text;
  private rewardsEarned: Reward[] = [];

  constructor() {
    super({ key: 'LuckyMatchScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // Reset state
    this.matchesFound = 0;
    this.flippedCard = null;
    this.canFlip = true;
    this.rewardsEarned = [];

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Title
    this.add.text(width / 2, 50, 'LUCKY MATCH', {
      fontSize: '32px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Instructions
    this.add.text(width / 2, 90, 'Find 3 matching pairs to win prizes!', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Matches counter
    this.matchesText = this.add.text(width / 2, 130, `Matches: ${this.matchesFound}/${this.PAIRS_TO_FIND}`, {
      fontSize: '24px',
      fontFamily: 'Arial Bold',
      color: '#ffd700',
    }).setOrigin(0.5);

    // Generate and display cards
    this.generateCards();
    this.displayCards();

    // Back button
    this.createBackButton();
  }

  private generateCards(): void {
    const rewards: Reward[] = [
      { type: 'coins', amount: 200 },
      { type: 'coins', amount: 400 },
      { type: 'booster', amount: 2, id: 'hammer' },
      { type: 'booster', amount: 2, id: 'row_arrow' },
      { type: 'diamonds', amount: 8 },
      { type: 'coins', amount: 300 },
    ];

    const cards: MatchCard[] = [];

    rewards.forEach((reward, pairId) => {
      // Create pair
      cards.push(
        { id: pairId * 2, pairId, reward, isFlipped: false, isMatched: false, x: 0, y: 0 },
        { id: pairId * 2 + 1, pairId, reward, isFlipped: false, isMatched: false, x: 0, y: 0 }
      );
    });

    // Shuffle
    this.cards = this.shuffle(cards);
  }

  private shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  private displayCards(): void {
    const { width, height } = this.scale;
    const cols = 4;
    const cardWidth = 80;
    const cardHeight = 100;
    const gap = 15;
    const totalWidth = cols * cardWidth + (cols - 1) * gap;
    const startX = (width - totalWidth) / 2 + cardWidth / 2;
    const startY = height / 2 - 50;

    this.cards.forEach((card, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (cardWidth + gap);
      const y = startY + row * (cardHeight + gap);

      card.x = x;
      card.y = y;

      this.createCardSprite(card);
    });
  }

  private createCardSprite(card: MatchCard): void {
    const container = this.add.container(card.x, card.y);
    const cardWidth = 75;
    const cardHeight = 95;

    // Back face (question mark)
    const backFace = this.add.container(0, 0);
    const backBg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x4a4a6e)
      .setStrokeStyle(3, 0x6a6a8e);
    const backPattern = this.add.text(0, 0, '?', {
      fontSize: '40px',
      fontFamily: 'Arial Black',
      color: '#8888aa',
    }).setOrigin(0.5);
    backFace.add([backBg, backPattern]);

    // Front face (reward)
    const frontFace = this.add.container(0, 0);
    frontFace.setVisible(false);
    const frontBg = this.add.rectangle(0, 0, cardWidth, cardHeight, this.getRewardColor(card.reward))
      .setStrokeStyle(3, 0xffffff);
    const rewardText = this.add.text(0, -15, this.getRewardEmoji(card.reward), {
      fontSize: '32px',
    }).setOrigin(0.5);
    const amountText = this.add.text(0, 25, this.getRewardAmount(card.reward), {
      fontSize: '16px',
      fontFamily: 'Arial Bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    frontFace.add([frontBg, rewardText, amountText]);

    container.add([backFace, frontFace]);
    container.setSize(cardWidth, cardHeight);
    container.setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        if (!card.isFlipped && !card.isMatched && this.canFlip) {
          this.tweens.add({
            targets: container,
            scale: 1.05,
            duration: 100,
          });
        }
      })
      .on('pointerout', () => {
        if (!card.isFlipped && !card.isMatched) {
          this.tweens.add({
            targets: container,
            scale: 1,
            duration: 100,
          });
        }
      })
      .on('pointerdown', () => this.flipCard(card));

    card.sprite = container;
    card.frontFace = frontFace;
    card.backFace = backFace;

    // Entrance animation
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 300,
      delay: card.id * 30,
      ease: 'Back.easeOut',
    });
  }

  private getRewardColor(reward: Reward): number {
    switch (reward.type) {
      case 'coins':
        return 0xdaa520;
      case 'diamonds':
        return 0x4169e1;
      case 'powerup':
        return 0x228b22;
      default:
        return 0x555555;
    }
  }

  private getRewardEmoji(reward: Reward): string {
    switch (reward.type) {
      case 'coins':
        return '🪙';
      case 'diamonds':
        return '💎';
      case 'booster':
        const emojiMap: Record<string, string> = {
          hammer: '🔨',
          row_arrow: '➡️',
          col_arrow: '⬇️',
          shuffle: '🔀',
        };
        return emojiMap[reward.id || ''] || '📦';
      default:
        return '❓';
    }
  }

  private getRewardAmount(reward: Reward): string {
    if (reward.type === 'coins' || reward.type === 'diamonds') {
      return `+${reward.amount}`;
    }
    return `x${reward.amount}`;
  }

  private flipCard(card: MatchCard): void {
    if (!this.canFlip || card.isFlipped || card.isMatched) return;
    if (this.matchesFound >= this.PAIRS_TO_FIND) return;

    // Flip animation
    this.tweens.add({
      targets: card.sprite,
      scaleX: 0,
      duration: 150,
      ease: 'Linear',
      onComplete: () => {
        card.isFlipped = true;
        card.backFace?.setVisible(false);
        card.frontFace?.setVisible(true);

        this.tweens.add({
          targets: card.sprite,
          scaleX: 1,
          duration: 150,
          ease: 'Linear',
          onComplete: () => this.checkMatch(card),
        });
      },
    });
  }

  private checkMatch(card: MatchCard): void {
    if (!this.flippedCard) {
      // First card of the pair
      this.flippedCard = card;
    } else {
      // Second card - check for match
      this.canFlip = false;

      if (this.flippedCard.pairId === card.pairId) {
        // Match found!
        this.handleMatch(this.flippedCard, card);
      } else {
        // No match - flip back
        this.handleNoMatch(this.flippedCard, card);
      }
    }
  }

  private handleMatch(card1: MatchCard, card2: MatchCard): void {
    card1.isMatched = true;
    card2.isMatched = true;
    this.matchesFound++;
    this.matchesText.setText(`Matches: ${this.matchesFound}/${this.PAIRS_TO_FIND}`);

    // Award reward
    const currencyManager = getCurrencyManager();
    currencyManager.awardReward(card1.reward, 'lucky_match');
    this.rewardsEarned.push(card1.reward);

    // Match celebration
    [card1, card2].forEach(card => {
      this.tweens.add({
        targets: card.sprite,
        scale: { from: 1, to: 1.2 },
        duration: 200,
        yoyo: true,
      });

      // Add glow effect
      if (card.sprite) {
        const glow = this.add.circle(0, 0, 50, 0x44ff44, 0.3);
        card.sprite.add(glow);
        card.sprite.sendToBack(glow);
      }
    });

    // Show reward text
    const { width, height } = this.scale;
    const rewardText = this.add.text(width / 2, height / 2 - 150, `+${this.getRewardAmount(card1.reward)}`, {
      fontSize: '32px',
      fontFamily: 'Arial Black',
      color: '#44ff44',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: rewardText,
      y: height / 2 - 200,
      alpha: 0,
      duration: 1000,
      onComplete: () => rewardText.destroy(),
    });

    this.flippedCard = null;
    this.canFlip = true;

    // Check if game complete
    if (this.matchesFound >= this.PAIRS_TO_FIND) {
      this.time.delayedCall(500, () => this.showResults());
    }
  }

  private handleNoMatch(card1: MatchCard, card2: MatchCard): void {
    // Wait a moment then flip back
    this.time.delayedCall(800, () => {
      [card1, card2].forEach(card => {
        this.tweens.add({
          targets: card.sprite,
          scaleX: 0,
          duration: 150,
          ease: 'Linear',
          onComplete: () => {
            card.isFlipped = false;
            card.backFace?.setVisible(true);
            card.frontFace?.setVisible(false);

            this.tweens.add({
              targets: card.sprite,
              scaleX: 1,
              duration: 150,
              ease: 'Linear',
            });
          },
        });
      });

      this.flippedCard = null;
      this.canFlip = true;
    });
  }

  private showResults(): void {
    const { width, height } = this.scale;

    // Summary panel
    const panelY = height - 150;
    this.add.rectangle(width / 2, panelY, width - 40, 120, 0x2a2a3e)
      .setStrokeStyle(3, 0x4a90d9);

    this.add.text(width / 2, panelY - 35, 'Congratulations!', {
      fontSize: '22px',
      fontFamily: 'Arial Black',
      color: '#ffd700',
    }).setOrigin(0.5);

    // List rewards
    const rewardSummary = this.rewardsEarned.map(r => {
      if (r.type === 'coins') return `+${r.amount} coins`;
      if (r.type === 'diamonds') return `+${r.amount} diamonds`;
      return `1x ${this.getRewardEmoji(r)}`;
    }).join('  |  ');

    this.add.text(width / 2, panelY + 10, rewardSummary, {
      fontSize: '14px',
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
