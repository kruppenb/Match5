import Phaser from 'phaser';
import { Reward } from '../types';
import { getCurrencyManager } from '../meta/CurrencyManager';
import { MiniGameRewardPresenter, MiniGameTutorial } from './MiniGameRewardPresenter';

interface Scenario {
  title: string;
  description: string;
  image: 'fire' | 'flood' | 'smoke' | 'cold' | 'electricity';
  options: { text: string; isCorrect: boolean }[];
}

const SCENARIOS: Scenario[] = [
  {
    title: 'Fire in the Kitchen!',
    description: 'Flames are spreading from the stove!',
    image: 'fire',
    options: [
      { text: 'Use fire extinguisher', isCorrect: true },
      { text: 'Throw water on it', isCorrect: false },
      { text: 'Open the window', isCorrect: false },
    ],
  },
  {
    title: 'Pipe Burst!',
    description: 'Water is flooding the bathroom!',
    image: 'flood',
    options: [
      { text: 'Turn off main valve', isCorrect: true },
      { text: 'Use a bucket', isCorrect: false },
      { text: 'Call for help', isCorrect: false },
    ],
  },
  {
    title: 'Smoke Alarm!',
    description: 'Smoke is filling the room!',
    image: 'smoke',
    options: [
      { text: 'Open windows', isCorrect: true },
      { text: 'Hide under bed', isCorrect: false },
      { text: 'Turn on fan', isCorrect: false },
    ],
  },
  {
    title: 'Freezing Cold!',
    description: 'The heater broke in winter!',
    image: 'cold',
    options: [
      { text: 'Light the fireplace', isCorrect: true },
      { text: 'Open the fridge', isCorrect: false },
      { text: 'Run in circles', isCorrect: false },
    ],
  },
  {
    title: 'Power Surge!',
    description: 'Sparks from the outlet!',
    image: 'electricity',
    options: [
      { text: 'Flip circuit breaker', isCorrect: true },
      { text: 'Pour water on it', isCorrect: false },
      { text: 'Touch the wires', isCorrect: false },
    ],
  },
  {
    title: 'Gas Leak!',
    description: 'You smell gas in the kitchen!',
    image: 'smoke',
    options: [
      { text: 'Open windows & leave', isCorrect: true },
      { text: 'Light a candle', isCorrect: false },
      { text: 'Use the phone', isCorrect: false },
    ],
  },
  {
    title: 'Overflowing Sink!',
    description: 'The drain is clogged!',
    image: 'flood',
    options: [
      { text: 'Use a plunger', isCorrect: true },
      { text: 'Add more water', isCorrect: false },
      { text: 'Ignore it', isCorrect: false },
    ],
  },
  {
    title: 'Grease Fire!',
    description: 'The pan caught fire!',
    image: 'fire',
    options: [
      { text: 'Cover with lid', isCorrect: true },
      { text: 'Pour water on it', isCorrect: false },
      { text: 'Blow on it', isCorrect: false },
    ],
  },
];

export class SaveTheRoomScene extends Phaser.Scene {
  private currentRound: number = 0;
  private maxRounds: number = 5;
  private score: number = 0;
  private streak: number = 0;
  private usedScenarios: number[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private rewardPresenter!: MiniGameRewardPresenter;
  private tutorial!: MiniGameTutorial;
  private gameOver: boolean = false;
  private scenarioContainer?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'SaveTheRoomScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.rewardPresenter = new MiniGameRewardPresenter(this);
    this.tutorial = new MiniGameTutorial(this);

    // Reset state
    this.currentRound = 0;
    this.score = 0;
    this.streak = 0;
    this.usedScenarios = [];
    this.gameOver = false;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Title
    this.add.text(width / 2, 40, 'SAVE THE ROOM', {
      fontSize: '26px',
      fontFamily: 'Arial Black',
      color: '#ff6644',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Score and round display
    const infoBg = this.add.graphics();
    infoBg.fillStyle(0x2a3a4a, 0.9);
    infoBg.fillRoundedRect(width / 2 - 100, 65, 200, 40, 20);

    this.roundText = this.add.text(width / 2 - 50, 85, `Round 1/${this.maxRounds}`, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#aabbcc',
    }).setOrigin(0.5);

    this.scoreText = this.add.text(width / 2 + 50, 85, `Score: 0`, {
      fontSize: '14px',
      fontFamily: 'Arial Bold',
      color: '#44ff44',
    }).setOrigin(0.5);

    // Back button
    this.createBackButton();

    // Tutorial then start
    this.tutorial.showIfFirstTime('save_room', 'Save the Room', [
      'A hazard appears in the room!',
      'Choose the correct action to fix it',
      'Wrong choices end the game',
      'Build a streak for bonus points!',
    ]).then(() => {
      this.showScenario();
    });
  }

  private showScenario(): void {
    if (this.currentRound >= this.maxRounds) {
      this.handleWin();
      return;
    }

    // Pick a random unused scenario
    let scenarioIndex: number;
    do {
      scenarioIndex = Math.floor(Math.random() * SCENARIOS.length);
    } while (this.usedScenarios.includes(scenarioIndex) && this.usedScenarios.length < SCENARIOS.length);

    this.usedScenarios.push(scenarioIndex);
    const scenario = SCENARIOS[scenarioIndex];

    // Update round text
    this.roundText.setText(`Round ${this.currentRound + 1}/${this.maxRounds}`);

    // Clear previous scenario
    this.scenarioContainer?.destroy();

    const { width, height } = this.scale;
    this.scenarioContainer = this.add.container(width / 2, height / 2 - 30);

    // Scenario card background
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x2a3a4a, 1);
    cardBg.fillRoundedRect(-180, -180, 360, 360, 20);
    cardBg.lineStyle(3, this.getHazardColor(scenario.image), 1);
    cardBg.strokeRoundedRect(-180, -180, 360, 360, 20);
    this.scenarioContainer.add(cardBg);

    // Hazard icon
    this.drawHazardIcon(scenario.image, 0, -100);

    // Title
    const title = this.add.text(0, -20, scenario.title, {
      fontSize: '22px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.scenarioContainer.add(title);

    // Description
    const desc = this.add.text(0, 20, scenario.description, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#aabbcc',
    }).setOrigin(0.5);
    this.scenarioContainer.add(desc);

    // Shuffle options
    const shuffledOptions = [...scenario.options].sort(() => Math.random() - 0.5);

    // Option buttons
    const btnStartY = 70;
    const btnSpacing = 55;

    shuffledOptions.forEach((option, index) => {
      const btnY = btnStartY + index * btnSpacing;
      this.createOptionButton(option.text, option.isCorrect, 0, btnY);
    });

    // Animate in
    this.scenarioContainer.setScale(0.8);
    this.scenarioContainer.setAlpha(0);
    this.tweens.add({
      targets: this.scenarioContainer,
      scale: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  private getHazardColor(type: string): number {
    switch (type) {
      case 'fire': return 0xff4444;
      case 'flood': return 0x4488ff;
      case 'smoke': return 0x888888;
      case 'cold': return 0x88ccff;
      case 'electricity': return 0xffff44;
      default: return 0xffffff;
    }
  }

  private drawHazardIcon(type: string, x: number, y: number): void {
    const g = this.add.graphics();
    g.setPosition(x, y);

    if (type === 'fire') {
      // Fire icon
      g.fillStyle(0xff4444, 1);
      g.fillTriangle(0, -35, -25, 20, 25, 20);
      g.fillStyle(0xffaa44, 1);
      g.fillTriangle(0, -20, -15, 15, 15, 15);
      g.fillStyle(0xffdd44, 1);
      g.fillTriangle(0, -5, -8, 12, 8, 12);
    } else if (type === 'flood') {
      // Water drops
      g.fillStyle(0x4488ff, 1);
      g.fillEllipse(-20, 0, 20, 30);
      g.fillEllipse(0, -10, 25, 35);
      g.fillEllipse(20, 5, 20, 28);
      g.fillStyle(0x88bbff, 0.5);
      g.fillEllipse(-18, -5, 8, 12);
      g.fillEllipse(2, -15, 10, 14);
    } else if (type === 'smoke') {
      // Smoke clouds
      g.fillStyle(0x888888, 0.8);
      g.fillCircle(-15, 10, 18);
      g.fillCircle(15, 5, 20);
      g.fillCircle(0, -5, 22);
      g.fillCircle(-10, -15, 15);
      g.fillCircle(12, -12, 16);
    } else if (type === 'cold') {
      // Snowflake
      g.lineStyle(4, 0x88ccff, 1);
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const x1 = Math.cos(angle) * 25;
        const y1 = Math.sin(angle) * 25;
        g.lineBetween(0, 0, x1, y1);
        // Small branches
        const branchAngle = angle + 0.5;
        g.lineBetween(x1 * 0.6, y1 * 0.6, x1 * 0.6 + Math.cos(branchAngle) * 8, y1 * 0.6 + Math.sin(branchAngle) * 8);
      }
    } else if (type === 'electricity') {
      // Lightning bolt
      g.fillStyle(0xffff44, 1);
      g.beginPath();
      g.moveTo(5, -35);
      g.lineTo(-15, 0);
      g.lineTo(0, 0);
      g.lineTo(-10, 30);
      g.lineTo(15, -5);
      g.lineTo(2, -5);
      g.lineTo(5, -35);
      g.closePath();
      g.fill();
    }

    this.scenarioContainer!.add(g);
  }

  private createOptionButton(text: string, isCorrect: boolean, x: number, y: number): void {
    const btnWidth = 280;
    const btnHeight = 45;

    const btnContainer = this.add.container(x, y);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x3a4a5e, 1);
    btnBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 22);
    btnBg.lineStyle(2, 0x5a6a7e, 1);
    btnBg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 22);
    btnContainer.add(btnBg);

    const btnText = this.add.text(0, 0, text, {
      fontSize: '16px',
      fontFamily: 'Arial Bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    btnContainer.add(btnText);

    const hitArea = this.add.rectangle(0, 0, btnWidth, btnHeight, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        btnBg.clear();
        btnBg.fillStyle(0x4a5a6e, 1);
        btnBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 22);
        btnBg.lineStyle(2, 0x7a8a9e, 1);
        btnBg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 22);
      })
      .on('pointerout', () => {
        btnBg.clear();
        btnBg.fillStyle(0x3a4a5e, 1);
        btnBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 22);
        btnBg.lineStyle(2, 0x5a6a7e, 1);
        btnBg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 22);
      })
      .on('pointerdown', () => this.selectOption(isCorrect, btnContainer, btnBg, btnWidth, btnHeight));
    btnContainer.add(hitArea);

    this.scenarioContainer!.add(btnContainer);
  }

  private selectOption(
    isCorrect: boolean,
    _container: Phaser.GameObjects.Container,
    btnBg: Phaser.GameObjects.Graphics,
    btnWidth: number,
    btnHeight: number
  ): void {
    if (this.gameOver) return;

    // Disable all buttons
    this.scenarioContainer?.list.forEach(child => {
      if (child instanceof Phaser.GameObjects.Container) {
        child.list.forEach(item => {
          if (item instanceof Phaser.GameObjects.Rectangle) {
            item.disableInteractive();
          }
        });
      }
    });

    if (isCorrect) {
      // Correct answer
      btnBg.clear();
      btnBg.fillStyle(0x44aa44, 1);
      btnBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 22);
      btnBg.lineStyle(2, 0x66cc66, 1);
      btnBg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 22);

      this.streak++;
      const points = 100 + this.streak * 25;
      this.score += points;
      this.scoreText.setText(`Score: ${this.score}`);

      // Show feedback
      this.showFeedback(true, points);

      // Next round after delay
      this.time.delayedCall(1200, () => {
        this.currentRound++;
        this.showScenario();
      });
    } else {
      // Wrong answer
      btnBg.clear();
      btnBg.fillStyle(0xaa4444, 1);
      btnBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 22);
      btnBg.lineStyle(2, 0xcc6666, 1);
      btnBg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 22);

      this.cameras.main.shake(200, 0.02);
      this.showFeedback(false, 0);

      this.time.delayedCall(1000, () => {
        this.handleLose();
      });
    }
  }

  private showFeedback(correct: boolean, points: number): void {
    const { width } = this.scale;

    const text = correct ? `+${points} points!` : 'Wrong!';
    const color = correct ? '#44ff44' : '#ff4444';

    const feedback = this.add.text(width / 2, 550, text, {
      fontSize: '28px',
      fontFamily: 'Arial Black',
      color,
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: feedback,
      y: 500,
      alpha: 0,
      scale: 1.3,
      duration: 800,
      ease: 'Power2',
      onComplete: () => feedback.destroy(),
    });

    if (correct && this.streak > 1) {
      const streakText = this.add.text(width / 2, 600, `${this.streak}x Streak!`, {
        fontSize: '20px',
        fontFamily: 'Arial Bold',
        color: '#ffd700',
      }).setOrigin(0.5);

      this.tweens.add({
        targets: streakText,
        y: 570,
        alpha: 0,
        duration: 1000,
        delay: 200,
        onComplete: () => streakText.destroy(),
      });
    }
  }

  private handleWin(): void {
    this.gameOver = true;

    const rewards: Reward[] = [];
    rewards.push({ type: 'coins', amount: this.score });

    if (this.streak >= 5) {
      rewards.push({ type: 'diamonds', amount: 10 });
      rewards.push({ type: 'booster', amount: 1, id: 'hammer' });
    } else if (this.streak >= 3) {
      rewards.push({ type: 'diamonds', amount: 5 });
    }

    rewards.forEach(reward => {
      getCurrencyManager().awardReward(reward, 'save_room');
    });

    this.rewardPresenter.show({
      won: true,
      rewards,
      message: `Perfect! ${this.maxRounds}/${this.maxRounds} rooms saved!`,
    });
  }

  private handleLose(): void {
    this.gameOver = true;

    const rewards: Reward[] = [];
    if (this.score > 0) {
      rewards.push({ type: 'coins', amount: Math.floor(this.score / 2) });
      rewards.forEach(reward => {
        getCurrencyManager().awardReward(reward, 'save_room');
      });
    }

    this.rewardPresenter.show({
      won: false,
      rewards,
      message: `Saved ${this.currentRound}/${this.maxRounds} rooms`,
    });
  }

  private createBackButton(): void {
    const backBtn = this.add.rectangle(60, 40, 100, 40, 0x4a4a5e)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backBtn.setFillStyle(0x5a5a6e))
      .on('pointerout', () => backBtn.setFillStyle(0x4a4a5e))
      .on('pointerdown', () => this.scene.start('MiniGameHubScene'));

    this.add.text(60, 40, '< Back', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
  }
}
