import Phaser from 'phaser';
import { Reward } from '../types';
import { getCurrencyManager } from '../meta/CurrencyManager';
import { MiniGameRewardPresenter, MiniGameTutorial } from './MiniGameRewardPresenter';

// Pipe connection directions: top, right, bottom, left
type PipeType = 'straight_h' | 'straight_v' | 'corner_tr' | 'corner_br' | 'corner_bl' | 'corner_tl' | 'cross' | 'source' | 'sink' | 'empty';

interface PipeConnections {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

const PIPE_CONNECTIONS: Record<PipeType, PipeConnections> = {
  straight_h: { top: false, right: true, bottom: false, left: true },
  straight_v: { top: true, right: false, bottom: true, left: false },
  corner_tr: { top: true, right: true, bottom: false, left: false },
  corner_br: { top: false, right: true, bottom: true, left: false },
  corner_bl: { top: false, right: false, bottom: true, left: true },
  corner_tl: { top: true, right: false, bottom: false, left: true },
  cross: { top: true, right: true, bottom: true, left: true },
  source: { top: false, right: true, bottom: false, left: false },
  sink: { top: false, right: false, bottom: false, left: true },
  empty: { top: false, right: false, bottom: false, left: false },
};

interface PipeCell {
  row: number;
  col: number;
  type: PipeType;
  rotation: number; // 0, 90, 180, 270
  isFixed: boolean;
  filled: boolean;
  sprite?: Phaser.GameObjects.Container;
}

const GRID_SIZE = 5;
const TIME_LIMIT = 60;

export class PipeConnectScene extends Phaser.Scene {
  private grid: PipeCell[][] = [];
  private sourceCell!: { row: number; col: number };
  private sinkCell!: { row: number; col: number };
  private timeRemaining: number = TIME_LIMIT;
  private timerText!: Phaser.GameObjects.Text;
  private timerEvent?: Phaser.Time.TimerEvent;
  private rewardPresenter!: MiniGameRewardPresenter;
  private tutorial!: MiniGameTutorial;
  private gameOver: boolean = false;
  private checkButton?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'PipeConnectScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.rewardPresenter = new MiniGameRewardPresenter(this);
    this.tutorial = new MiniGameTutorial(this);

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a2a3a);

    // Title
    this.add.text(width / 2, 45, 'PIPE CONNECT', {
      fontSize: '28px',
      fontFamily: 'Arial Black',
      color: '#4488ff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Timer
    const timerBg = this.add.graphics();
    timerBg.fillStyle(0x2a3a4a, 0.9);
    timerBg.fillRoundedRect(width / 2 - 50, 70, 100, 35, 17);
    timerBg.lineStyle(2, 0x4488ff, 0.6);
    timerBg.strokeRoundedRect(width / 2 - 50, 70, 100, 35, 17);

    this.timerText = this.add.text(width / 2, 87, `${this.timeRemaining}s`, {
      fontSize: '18px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Instructions
    this.add.text(width / 2, 125, 'Tap pipes to rotate. Connect source to sink!', {
      fontSize: '11px',
      fontFamily: 'Arial',
      color: '#888888',
    }).setOrigin(0.5);

    // Initialize grid
    this.initializeGrid();
    this.renderGrid();

    // Create check button
    this.createCheckButton();

    // Start timer
    this.startTimer();

    // Back button
    this.createBackButton();

    // Tutorial
    this.tutorial.showIfFirstTime('pipe_connect', 'Pipe Connect', [
      'Tap pipes to rotate them',
      'Connect the blue source to the green sink',
      'Complete before time runs out!',
    ]);
  }

  private initializeGrid(): void {
    this.grid = [];
    this.timeRemaining = TIME_LIMIT;
    this.gameOver = false;

    // Create empty grid
    for (let row = 0; row < GRID_SIZE; row++) {
      this.grid[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        this.grid[row][col] = {
          row,
          col,
          type: 'empty',
          rotation: 0,
          isFixed: false,
          filled: false,
        };
      }
    }

    // Place source on left edge
    this.sourceCell = { row: Math.floor(GRID_SIZE / 2), col: 0 };
    this.grid[this.sourceCell.row][this.sourceCell.col] = {
      ...this.grid[this.sourceCell.row][this.sourceCell.col],
      type: 'source',
      isFixed: true,
    };

    // Place sink on right edge
    this.sinkCell = { row: Math.floor(GRID_SIZE / 2), col: GRID_SIZE - 1 };
    this.grid[this.sinkCell.row][this.sinkCell.col] = {
      ...this.grid[this.sinkCell.row][this.sinkCell.col],
      type: 'sink',
      isFixed: true,
    };

    // Generate random pipe layout
    this.generatePipes();
  }

  private generatePipes(): void {
    const pipeTypes: PipeType[] = ['straight_h', 'straight_v', 'corner_tr', 'corner_br', 'corner_bl', 'corner_tl'];

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (this.grid[row][col].type !== 'empty') continue;

        // Random pipe type
        const type = pipeTypes[Math.floor(Math.random() * pipeTypes.length)];
        // Random rotation
        const rotation = [0, 90, 180, 270][Math.floor(Math.random() * 4)];

        this.grid[row][col] = {
          ...this.grid[row][col],
          type,
          rotation,
        };
      }
    }
  }

  private renderGrid(): void {
    const { width, height } = this.scale;
    const cellSize = 70;
    const gridWidth = GRID_SIZE * cellSize;
    const gridHeight = GRID_SIZE * cellSize;
    const startX = width / 2 - gridWidth / 2 + cellSize / 2;
    const startY = height / 2 - gridHeight / 2 + cellSize / 2 + 20;

    // Grid background
    const gridBg = this.add.graphics();
    gridBg.fillStyle(0x2a3a4a, 1);
    gridBg.fillRoundedRect(startX - cellSize / 2 - 8, startY - cellSize / 2 - 8, gridWidth + 16, gridHeight + 16, 12);
    gridBg.lineStyle(3, 0x4a6a8a, 1);
    gridBg.strokeRoundedRect(startX - cellSize / 2 - 8, startY - cellSize / 2 - 8, gridWidth + 16, gridHeight + 16, 12);

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = this.grid[row][col];
        const x = startX + col * cellSize;
        const y = startY + row * cellSize;

        this.createCellSprite(cell, x, y, cellSize);
      }
    }
  }

  private createCellSprite(cell: PipeCell, x: number, y: number, size: number): void {
    if (cell.sprite) {
      cell.sprite.destroy();
    }

    cell.sprite = this.add.container(x, y);

    // Cell background
    const bg = this.add.rectangle(0, 0, size - 4, size - 4, 0x1a2a3a);
    bg.setStrokeStyle(1, 0x3a4a5a);
    cell.sprite.add(bg);

    // Draw pipe based on type
    const pipeGraphics = this.add.graphics();
    const pipeWidth = 16;
    const halfSize = (size - 4) / 2;
    const fillColor = cell.filled ? 0x44aaff : 0x666666;

    if (cell.type === 'source') {
      // Source - blue square with arrow
      pipeGraphics.fillStyle(0x4488ff, 1);
      pipeGraphics.fillRoundedRect(-20, -20, 40, 40, 8);
      pipeGraphics.fillStyle(fillColor, 1);
      pipeGraphics.fillRect(10, -pipeWidth / 2, halfSize - 10, pipeWidth);
      // Arrow
      pipeGraphics.fillStyle(0xffffff, 1);
      pipeGraphics.fillTriangle(5, 0, -8, -8, -8, 8);
    } else if (cell.type === 'sink') {
      // Sink - green square
      pipeGraphics.fillStyle(0x44ff44, 1);
      pipeGraphics.fillRoundedRect(-20, -20, 40, 40, 8);
      pipeGraphics.fillStyle(fillColor, 1);
      pipeGraphics.fillRect(-halfSize, -pipeWidth / 2, halfSize - 10, pipeWidth);
      // Checkmark
      pipeGraphics.lineStyle(4, 0xffffff, 1);
      pipeGraphics.beginPath();
      pipeGraphics.moveTo(-8, 0);
      pipeGraphics.lineTo(-2, 8);
      pipeGraphics.lineTo(10, -8);
      pipeGraphics.stroke();
    } else if (cell.type !== 'empty') {
      const connections = this.getRotatedConnections(cell);

      pipeGraphics.fillStyle(fillColor, 1);

      // Draw pipe segments based on connections
      if (connections.top) {
        pipeGraphics.fillRect(-pipeWidth / 2, -halfSize, pipeWidth, halfSize);
      }
      if (connections.bottom) {
        pipeGraphics.fillRect(-pipeWidth / 2, 0, pipeWidth, halfSize);
      }
      if (connections.left) {
        pipeGraphics.fillRect(-halfSize, -pipeWidth / 2, halfSize, pipeWidth);
      }
      if (connections.right) {
        pipeGraphics.fillRect(0, -pipeWidth / 2, halfSize, pipeWidth);
      }

      // Center joint
      pipeGraphics.fillCircle(0, 0, pipeWidth / 2 + 2);

      // Highlight for corners
      pipeGraphics.fillStyle(cell.filled ? 0x66ccff : 0x888888, 1);
      pipeGraphics.fillCircle(0, 0, pipeWidth / 2 - 2);
    }

    cell.sprite.add(pipeGraphics);

    // Make interactive (except fixed cells)
    if (!cell.isFixed && cell.type !== 'empty') {
      const hitArea = this.add.rectangle(0, 0, size - 4, size - 4, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.rotatePipe(cell));
      cell.sprite.add(hitArea);
    }
  }

  private getRotatedConnections(cell: PipeCell): PipeConnections {
    const base = PIPE_CONNECTIONS[cell.type];
    const directions: (keyof PipeConnections)[] = ['top', 'right', 'bottom', 'left'];
    const rotations = cell.rotation / 90;

    const result: PipeConnections = { top: false, right: false, bottom: false, left: false };

    directions.forEach((dir, i) => {
      const newIndex = (i - rotations + 4) % 4;
      result[dir] = base[directions[newIndex]];
    });

    return result;
  }

  private rotatePipe(cell: PipeCell): void {
    if (this.gameOver || cell.isFixed) return;

    cell.rotation = (cell.rotation + 90) % 360;

    // Animate rotation
    if (cell.sprite) {
      this.tweens.add({
        targets: cell.sprite,
        angle: cell.rotation,
        duration: 150,
        ease: 'Back.easeOut',
        onComplete: () => {
          // Re-render cell at new rotation
          const { width, height } = this.scale;
          const cellSize = 70;
          const gridWidth = GRID_SIZE * cellSize;
          const gridHeight = GRID_SIZE * cellSize;
          const startX = width / 2 - gridWidth / 2 + cellSize / 2;
          const startY = height / 2 - gridHeight / 2 + cellSize / 2 + 20;
          const x = startX + cell.col * cellSize;
          const y = startY + cell.row * cellSize;

          this.createCellSprite(cell, x, y, cellSize);
        },
      });
    }
  }

  private checkConnection(): boolean {
    // BFS from source to sink
    const visited = new Set<string>();
    const queue: { row: number; col: number }[] = [this.sourceCell];
    visited.add(`${this.sourceCell.row},${this.sourceCell.col}`);

    // Reset filled state
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        this.grid[row][col].filled = false;
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      const cell = this.grid[current.row][current.col];
      cell.filled = true;

      // Check if reached sink
      if (current.row === this.sinkCell.row && current.col === this.sinkCell.col) {
        return true;
      }

      const connections = this.getRotatedConnections(cell);

      // Check each direction
      const neighbors = [
        { dir: 'top' as const, dr: -1, dc: 0, opposite: 'bottom' as const },
        { dir: 'right' as const, dr: 0, dc: 1, opposite: 'left' as const },
        { dir: 'bottom' as const, dr: 1, dc: 0, opposite: 'top' as const },
        { dir: 'left' as const, dr: 0, dc: -1, opposite: 'right' as const },
      ];

      for (const { dir, dr, dc, opposite } of neighbors) {
        if (!connections[dir]) continue;

        const newRow = current.row + dr;
        const newCol = current.col + dc;
        const key = `${newRow},${newCol}`;

        if (newRow < 0 || newRow >= GRID_SIZE || newCol < 0 || newCol >= GRID_SIZE) continue;
        if (visited.has(key)) continue;

        const neighbor = this.grid[newRow][newCol];
        const neighborConnections = this.getRotatedConnections(neighbor);

        // Check if neighbor connects back
        if (neighborConnections[opposite]) {
          visited.add(key);
          queue.push({ row: newRow, col: newCol });
        }
      }
    }

    return false;
  }

  private createCheckButton(): void {
    const { width, height } = this.scale;
    const btnX = width / 2;
    const btnY = height - 80;
    const btnWidth = 140;
    const btnHeight = 45;

    this.checkButton = this.add.container(btnX, btnY);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x000000, 0.4);
    btnBg.fillRoundedRect(-btnWidth / 2 + 2, -btnHeight / 2 + 2, btnWidth, btnHeight, 22);
    btnBg.fillStyle(0x44aa44, 1);
    btnBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 22);
    btnBg.fillStyle(0x66cc66, 0.4);
    btnBg.fillRoundedRect(-btnWidth / 2 + 3, -btnHeight / 2 + 3, btnWidth - 6, btnHeight / 2 - 3, { tl: 19, tr: 19, bl: 0, br: 0 });
    btnBg.lineStyle(2, 0x66cc66, 0.7);
    btnBg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 22);
    this.checkButton.add(btnBg);

    const btnText = this.add.text(0, 0, 'CHECK', {
      fontSize: '18px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.checkButton.add(btnText);

    const hitArea = this.add.rectangle(0, 0, btnWidth, btnHeight, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.onCheckPressed());
    this.checkButton.add(hitArea);
  }

  private onCheckPressed(): void {
    if (this.gameOver) return;

    const connected = this.checkConnection();

    // Update visuals to show filled pipes
    const { width, height } = this.scale;
    const cellSize = 70;
    const gridWidth = GRID_SIZE * cellSize;
    const startX = width / 2 - gridWidth / 2 + cellSize / 2;
    const startY = height / 2 - gridWidth / 2 + cellSize / 2 + 20;

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = this.grid[row][col];
        const x = startX + col * cellSize;
        const y = startY + row * cellSize;
        this.createCellSprite(cell, x, y, cellSize);
      }
    }

    if (connected) {
      this.handleWin();
    } else {
      // Shake camera to indicate failure
      this.cameras.main.shake(200, 0.01);
    }
  }

  private startTimer(): void {
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeRemaining--;
        this.timerText.setText(`${this.timeRemaining}s`);

        if (this.timeRemaining <= 10) {
          this.timerText.setColor('#ff4444');
        }

        if (this.timeRemaining <= 0) {
          this.handleLose();
        }
      },
      loop: true,
    });
  }

  private handleWin(): void {
    this.gameOver = true;
    this.timerEvent?.destroy();

    const rewards: Reward[] = [];
    const bonusCoins = Math.floor(this.timeRemaining * 5);
    rewards.push({ type: 'coins', amount: 150 + bonusCoins });

    if (this.timeRemaining >= 30) {
      rewards.push({ type: 'diamonds', amount: 5 });
    } else if (this.timeRemaining >= 15) {
      rewards.push({ type: 'diamonds', amount: 2 });
    }

    rewards.forEach(reward => {
      getCurrencyManager().awardReward(reward, 'pipe_connect');
    });

    this.time.delayedCall(500, () => {
      this.rewardPresenter.show({
        won: true,
        rewards,
        message: `Connected with ${this.timeRemaining}s left!`,
      });
    });
  }

  private handleLose(): void {
    this.gameOver = true;
    this.timerEvent?.destroy();

    this.rewardPresenter.show({
      won: false,
      rewards: [],
      message: 'Time ran out!',
    });
  }

  private createBackButton(): void {
    const backBtn = this.add.rectangle(60, 45, 100, 40, 0x4a4a5e)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backBtn.setFillStyle(0x5a5a6e))
      .on('pointerout', () => backBtn.setFillStyle(0x4a4a5e))
      .on('pointerdown', () => {
        this.timerEvent?.destroy();
        this.scene.start('MiniGameHubScene');
      });

    this.add.text(60, 45, '< Back', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
  }
}
