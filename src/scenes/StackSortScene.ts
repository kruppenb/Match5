import Phaser from 'phaser';
import { Reward } from '../types';
import { getCurrencyManager } from '../meta/CurrencyManager';
import { MiniGameRewardPresenter, MiniGameTutorial } from './MiniGameRewardPresenter';

type BallColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple';

interface Tube {
  balls: BallColor[];
  capacity: number;
  x: number;
  y: number;
  container?: Phaser.GameObjects.Container;
}

const BALL_COLORS: Record<BallColor, number> = {
  red: 0xff4444,
  blue: 0x4488ff,
  green: 0x44ff44,
  yellow: 0xffdd44,
  purple: 0xaa44ff,
};

const TUBE_CAPACITY = 4;
const NUM_COLORS = 4;
const NUM_TUBES = 6; // 4 color tubes + 2 empty

export class StackSortScene extends Phaser.Scene {
  private tubes: Tube[] = [];
  private selectedTubeIndex: number = -1;
  private moveCount: number = 0;
  private movesText!: Phaser.GameObjects.Text;
  private rewardPresenter!: MiniGameRewardPresenter;
  private tutorial!: MiniGameTutorial;
  private isAnimating: boolean = false;
  private selectionHighlight?: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'StackSortScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.rewardPresenter = new MiniGameRewardPresenter(this);
    this.tutorial = new MiniGameTutorial(this);

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Title
    this.add.text(width / 2, 50, 'STACK SORT', {
      fontSize: '28px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Moves counter
    this.add.text(width / 2 - 50, 90, 'Moves:', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    this.movesText = this.add.text(width / 2 + 20, 90, '0', {
      fontSize: '20px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Initialize game
    this.initializeTubes();
    this.renderTubes();

    // Back button
    this.createBackButton();

    // Show tutorial if first time
    this.tutorial.showIfFirstTime('stack_sort', 'Stack Sort', [
      'Tap a tube to pick up the top ball',
      'Tap another tube to drop it',
      'Only same colors can stack',
      'Sort all colors to win!',
    ]);
  }

  private initializeTubes(): void {
    this.tubes = [];
    this.selectedTubeIndex = -1;
    this.moveCount = 0;
    this.isAnimating = false;

    // Create balls - 4 of each color
    const colors: BallColor[] = ['red', 'blue', 'green', 'yellow'];
    const allBalls: BallColor[] = [];
    for (const color of colors) {
      for (let i = 0; i < TUBE_CAPACITY; i++) {
        allBalls.push(color);
      }
    }

    // Shuffle balls
    for (let i = allBalls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allBalls[i], allBalls[j]] = [allBalls[j], allBalls[i]];
    }

    // Ensure the puzzle is solvable by not having all same colors in one tube initially
    // Simple check: reshuffle if any tube would be complete
    let needsReshuffle = true;
    while (needsReshuffle) {
      needsReshuffle = false;
      for (let t = 0; t < NUM_COLORS; t++) {
        const tubeStart = t * TUBE_CAPACITY;
        const tubeBalls = allBalls.slice(tubeStart, tubeStart + TUBE_CAPACITY);
        if (tubeBalls.every(b => b === tubeBalls[0])) {
          needsReshuffle = true;
          // Swap with random ball from another tube
          const otherIdx = (t + 1) % NUM_COLORS * TUBE_CAPACITY + Math.floor(Math.random() * TUBE_CAPACITY);
          const thisIdx = tubeStart + Math.floor(Math.random() * TUBE_CAPACITY);
          [allBalls[thisIdx], allBalls[otherIdx]] = [allBalls[otherIdx], allBalls[thisIdx]];
          break;
        }
      }
    }

    // Create tubes with balls distributed
    const { width, height } = this.scale;
    const tubeSpacing = 70;
    const tubesPerRow = 3;
    const startX = width / 2 - (tubesPerRow - 1) * tubeSpacing / 2;
    const startY = height / 2 - 60;

    for (let i = 0; i < NUM_TUBES; i++) {
      const row = Math.floor(i / tubesPerRow);
      const col = i % tubesPerRow;
      const x = startX + col * tubeSpacing;
      const y = startY + row * 180;

      const balls: BallColor[] = [];
      if (i < NUM_COLORS) {
        // Fill first 4 tubes with shuffled balls
        for (let j = 0; j < TUBE_CAPACITY; j++) {
          balls.push(allBalls[i * TUBE_CAPACITY + j]);
        }
      }
      // Last 2 tubes are empty

      this.tubes.push({
        balls,
        capacity: TUBE_CAPACITY,
        x,
        y,
      });
    }
  }

  private renderTubes(): void {
    const tubeWidth = 50;
    const tubeHeight = 140;
    const ballSize = 36;
    const ballSpacing = 32;

    this.tubes.forEach((tube, index) => {
      // Destroy existing container if any
      if (tube.container) {
        tube.container.destroy();
      }

      tube.container = this.add.container(tube.x, tube.y);

      // Tube background (glass effect)
      const tubeBg = this.add.graphics();
      tubeBg.fillStyle(0x2a3a4a, 0.8);
      tubeBg.fillRoundedRect(-tubeWidth / 2, -tubeHeight / 2, tubeWidth, tubeHeight, { tl: 5, tr: 5, bl: 20, br: 20 });
      tubeBg.lineStyle(3, 0x4a6a8a, 1);
      tubeBg.strokeRoundedRect(-tubeWidth / 2, -tubeHeight / 2, tubeWidth, tubeHeight, { tl: 5, tr: 5, bl: 20, br: 20 });
      tube.container.add(tubeBg);

      // Inner shine
      const shine = this.add.graphics();
      shine.fillStyle(0x5a8aaa, 0.2);
      shine.fillRoundedRect(-tubeWidth / 2 + 4, -tubeHeight / 2 + 4, 12, tubeHeight - 30, 3);
      tube.container.add(shine);

      // Draw balls from bottom up
      const ballStartY = tubeHeight / 2 - 25;
      tube.balls.forEach((ballColor, ballIndex) => {
        const ballY = ballStartY - ballIndex * ballSpacing;
        const color = BALL_COLORS[ballColor];

        // Ball shadow
        const shadow = this.add.circle(2, ballY + 2, ballSize / 2 - 2, 0x000000, 0.3);
        tube.container!.add(shadow);

        // Main ball
        const ball = this.add.circle(0, ballY, ballSize / 2 - 2, color);
        tube.container!.add(ball);

        // Highlight
        const highlight = this.add.circle(-5, ballY - 5, ballSize / 4 - 2, 0xffffff, 0.4);
        tube.container!.add(highlight);
      });

      // Interactive hit area
      const hitArea = this.add.rectangle(0, 0, tubeWidth + 10, tubeHeight + 20, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.onTubeClick(index));
      tube.container.add(hitArea);
    });
  }

  private onTubeClick(index: number): void {
    if (this.isAnimating) return;

    if (this.selectedTubeIndex === -1) {
      // Select a tube (must have balls)
      if (this.tubes[index].balls.length > 0) {
        this.selectedTubeIndex = index;
        this.showSelection(index);
      }
    } else if (this.selectedTubeIndex === index) {
      // Deselect
      this.selectedTubeIndex = -1;
      this.hideSelection();
    } else {
      // Try to move ball
      this.tryMoveBall(this.selectedTubeIndex, index);
      this.selectedTubeIndex = -1;
      this.hideSelection();
    }
  }

  private showSelection(index: number): void {
    const tube = this.tubes[index];
    if (this.selectionHighlight) {
      this.selectionHighlight.destroy();
    }

    this.selectionHighlight = this.add.graphics();
    this.selectionHighlight.lineStyle(4, 0xffdd44, 1);
    this.selectionHighlight.strokeRoundedRect(
      tube.x - 30, tube.y - 80,
      60, 160,
      { tl: 8, tr: 8, bl: 25, br: 25 }
    );

    // Animate the top ball slightly up to indicate selection
    if (tube.balls.length > 0 && tube.container) {
      const topBallElements = tube.container.list.filter(
        (_obj, idx) => idx > 0 && idx <= tube.balls.length * 3
      );
      const lastThree = topBallElements.slice(-3);
      lastThree.forEach((obj) => {
        this.tweens.add({
          targets: obj,
          y: (obj as Phaser.GameObjects.Arc).y - 15,
          duration: 150,
          ease: 'Back.easeOut',
        });
      });
    }
  }

  private hideSelection(): void {
    if (this.selectionHighlight) {
      this.selectionHighlight.destroy();
      this.selectionHighlight = undefined;
    }
    // Re-render to reset ball positions
    this.renderTubes();
  }

  private tryMoveBall(fromIndex: number, toIndex: number): void {
    const fromTube = this.tubes[fromIndex];
    const toTube = this.tubes[toIndex];

    if (fromTube.balls.length === 0) return;

    const ballToMove = fromTube.balls[fromTube.balls.length - 1];

    // Check if move is valid
    const canMove = toTube.balls.length < toTube.capacity &&
      (toTube.balls.length === 0 || toTube.balls[toTube.balls.length - 1] === ballToMove);

    if (!canMove) {
      // Invalid move feedback
      this.cameras.main.shake(100, 0.01);
      return;
    }

    // Perform move
    this.isAnimating = true;
    fromTube.balls.pop();
    toTube.balls.push(ballToMove);
    this.moveCount++;
    this.movesText.setText(this.moveCount.toString());

    // Animate the move
    this.animateBallMove(fromIndex, toIndex, ballToMove, () => {
      this.isAnimating = false;
      this.renderTubes();

      // Check win condition
      if (this.checkWin()) {
        this.handleWin();
      }
    });
  }

  private animateBallMove(fromIndex: number, toIndex: number, color: BallColor, onComplete: () => void): void {
    const fromTube = this.tubes[fromIndex];
    const toTube = this.tubes[toIndex];
    const ballSize = 36;

    // Create temporary ball for animation
    const ball = this.add.circle(fromTube.x, fromTube.y - 100, ballSize / 2 - 2, BALL_COLORS[color]);
    const highlight = this.add.circle(fromTube.x - 5, fromTube.y - 105, ballSize / 4 - 2, 0xffffff, 0.4);

    const destY = toTube.y + 70 - 25 - (toTube.balls.length - 1) * 32;

    // Arc animation
    this.tweens.add({
      targets: [ball, highlight],
      x: toTube.x,
      y: destY,
      duration: 300,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        ball.destroy();
        highlight.destroy();
        onComplete();
      },
    });
  }

  private checkWin(): boolean {
    return this.tubes.every(tube => {
      if (tube.balls.length === 0) return true;
      if (tube.balls.length !== tube.capacity) return false;
      return tube.balls.every(ball => ball === tube.balls[0]);
    });
  }

  private handleWin(): void {
    // Calculate rewards based on efficiency
    const rewards: Reward[] = [];
    const baseCoins = 200;
    const bonusCoins = Math.max(0, 100 - this.moveCount * 2);

    rewards.push({ type: 'coins', amount: baseCoins + bonusCoins });

    if (this.moveCount <= 20) {
      rewards.push({ type: 'diamonds', amount: 5 });
    }

    // Award rewards
    rewards.forEach(reward => {
      getCurrencyManager().awardReward(reward, 'stack_sort');
    });

    // Show result
    this.rewardPresenter.show({
      won: true,
      rewards,
      message: `Sorted in ${this.moveCount} moves!`,
    });
  }

  private createBackButton(): void {
    const backBtn = this.add.rectangle(60, 50, 100, 40, 0x4a4a5e)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backBtn.setFillStyle(0x5a5a6e))
      .on('pointerout', () => backBtn.setFillStyle(0x4a4a5e))
      .on('pointerdown', () => this.scene.start('MiniGameHubScene'));

    this.add.text(60, 50, '< Back', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
  }
}
