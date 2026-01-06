import Phaser from 'phaser';
import { Reward } from '../types';
import { getCurrencyManager } from '../meta/CurrencyManager';
import { MiniGameRewardPresenter, MiniGameTutorial } from './MiniGameRewardPresenter';

interface GridCell {
  row: number;
  col: number;
  isDug: boolean;
  hasTreasure: boolean;
  distance: number; // Distance to nearest treasure
  container?: Phaser.GameObjects.Container;
}

const GRID_SIZE = 5;
const MAX_DIGS = 8;

export class TreasureDigScene extends Phaser.Scene {
  private grid: GridCell[][] = [];
  private digsRemaining: number = MAX_DIGS;
  private treasuresFound: number = 0;
  private digsText!: Phaser.GameObjects.Text;
  private rewardPresenter!: MiniGameRewardPresenter;
  private tutorial!: MiniGameTutorial;
  private gameOver: boolean = false;

  constructor() {
    super({ key: 'TreasureDigScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.rewardPresenter = new MiniGameRewardPresenter(this);
    this.tutorial = new MiniGameTutorial(this);

    // Background - sand/dirt color
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Title
    this.add.text(width / 2, 45, 'TREASURE DIG', {
      fontSize: '28px',
      fontFamily: 'Arial Black',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Digs remaining display
    const digsPanelY = 90;
    const digsBg = this.add.graphics();
    digsBg.fillStyle(0x2a3a4a, 0.9);
    digsBg.fillRoundedRect(width / 2 - 80, digsPanelY - 18, 160, 36, 18);
    digsBg.lineStyle(2, 0xffd700, 0.6);
    digsBg.strokeRoundedRect(width / 2 - 80, digsPanelY - 18, 160, 36, 18);

    // Shovel icon
    const shovelGraphics = this.add.graphics();
    const shovelX = width / 2 - 55;
    shovelGraphics.fillStyle(0x8b4513, 1);
    shovelGraphics.fillRect(shovelX - 2, digsPanelY - 10, 4, 20);
    shovelGraphics.fillStyle(0x808080, 1);
    shovelGraphics.fillRoundedRect(shovelX - 8, digsPanelY - 12, 16, 8, 2);
    shovelGraphics.fillStyle(0xa0a0a0, 1);
    shovelGraphics.fillRect(shovelX - 6, digsPanelY - 10, 12, 3);

    this.add.text(width / 2 - 25, digsPanelY, 'Digs:', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#aabbcc',
    }).setOrigin(0, 0.5);

    this.digsText = this.add.text(width / 2 + 35, digsPanelY, `${this.digsRemaining}`, {
      fontSize: '20px',
      fontFamily: 'Arial Black',
      color: '#ffd700',
    }).setOrigin(0.5);

    // Instructions hint
    this.add.text(width / 2, 130, 'Find the treasure! Numbers show distance.', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#888888',
    }).setOrigin(0.5);

    // Initialize grid
    this.initializeGrid();
    this.renderGrid();

    // Back button
    this.createBackButton();

    // Show tutorial
    this.tutorial.showIfFirstTime('treasure_dig', 'Treasure Dig', [
      'Tap a square to dig',
      'Numbers show distance to treasure',
      'Lower numbers = closer!',
      'Find the treasure before digs run out!',
    ]);
  }

  private initializeGrid(): void {
    this.grid = [];
    this.digsRemaining = MAX_DIGS;
    this.treasuresFound = 0;
    this.gameOver = false;

    // Create empty grid
    for (let row = 0; row < GRID_SIZE; row++) {
      this.grid[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        this.grid[row][col] = {
          row,
          col,
          isDug: false,
          hasTreasure: false,
          distance: 0,
        };
      }
    }

    // Place treasure randomly
    const treasureRow = Math.floor(Math.random() * GRID_SIZE);
    const treasureCol = Math.floor(Math.random() * GRID_SIZE);
    this.grid[treasureRow][treasureCol].hasTreasure = true;

    // Calculate distances for all cells
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        // Manhattan distance to treasure
        this.grid[row][col].distance = Math.abs(row - treasureRow) + Math.abs(col - treasureCol);
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
    gridBg.fillStyle(0x3d2914, 1);
    gridBg.fillRoundedRect(startX - cellSize / 2 - 8, startY - cellSize / 2 - 8, gridWidth + 16, gridHeight + 16, 12);
    gridBg.lineStyle(3, 0x8b4513, 1);
    gridBg.strokeRoundedRect(startX - cellSize / 2 - 8, startY - cellSize / 2 - 8, gridWidth + 16, gridHeight + 16, 12);

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = this.grid[row][col];
        const x = startX + col * cellSize;
        const y = startY + row * cellSize;

        this.createCell(cell, x, y, cellSize);
      }
    }
  }

  private createCell(cell: GridCell, x: number, y: number, size: number): void {
    if (cell.container) {
      cell.container.destroy();
    }

    cell.container = this.add.container(x, y);

    if (cell.isDug) {
      // Dug cell - show hole and result
      const holeBg = this.add.graphics();
      holeBg.fillStyle(0x2a1a0a, 1);
      holeBg.fillRoundedRect(-size / 2 + 4, -size / 2 + 4, size - 8, size - 8, 8);
      cell.container.add(holeBg);

      if (cell.hasTreasure) {
        // Show treasure chest
        this.drawTreasureChest(cell.container, 0, 0);
      } else {
        // Show distance number
        const distanceColor = this.getDistanceColor(cell.distance);
        const distanceText = this.add.text(0, 0, cell.distance.toString(), {
          fontSize: '28px',
          fontFamily: 'Arial Black',
          color: distanceColor,
          stroke: '#000000',
          strokeThickness: 2,
        }).setOrigin(0.5);
        cell.container.add(distanceText);

        // Arrow indicator pointing toward treasure
        if (cell.distance > 0) {
          const arrow = this.createDirectionArrow(cell);
          if (arrow) cell.container.add(arrow);
        }
      }
    } else {
      // Undug cell - show dirt mound
      const moundGraphics = this.add.graphics();

      // Shadow
      moundGraphics.fillStyle(0x000000, 0.3);
      moundGraphics.fillRoundedRect(-size / 2 + 6, -size / 2 + 6, size - 8, size - 8, 8);

      // Main dirt
      moundGraphics.fillStyle(0x5a4020, 1);
      moundGraphics.fillRoundedRect(-size / 2 + 4, -size / 2 + 4, size - 8, size - 8, 8);

      // Top highlight
      moundGraphics.fillStyle(0x7a5a30, 0.6);
      moundGraphics.fillRoundedRect(-size / 2 + 6, -size / 2 + 6, size - 12, (size - 8) / 2, { tl: 6, tr: 6, bl: 0, br: 0 });

      // Border
      moundGraphics.lineStyle(2, 0x3a2a10, 1);
      moundGraphics.strokeRoundedRect(-size / 2 + 4, -size / 2 + 4, size - 8, size - 8, 8);

      cell.container.add(moundGraphics);

      // Grass tufts on top
      const grassGraphics = this.add.graphics();
      grassGraphics.fillStyle(0x44aa44, 1);
      grassGraphics.fillTriangle(-15, -20, -12, -30, -9, -20);
      grassGraphics.fillTriangle(-5, -22, 0, -34, 5, -22);
      grassGraphics.fillTriangle(9, -20, 12, -28, 15, -20);
      cell.container.add(grassGraphics);

      // Interactive if game not over
      if (!this.gameOver) {
        const hitArea = this.add.rectangle(0, 0, size - 4, size - 4, 0x000000, 0)
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => {
            moundGraphics.clear();
            moundGraphics.fillStyle(0x000000, 0.3);
            moundGraphics.fillRoundedRect(-size / 2 + 6, -size / 2 + 6, size - 8, size - 8, 8);
            moundGraphics.fillStyle(0x6a5030, 1);
            moundGraphics.fillRoundedRect(-size / 2 + 4, -size / 2 + 4, size - 8, size - 8, 8);
            moundGraphics.fillStyle(0x8a6a40, 0.6);
            moundGraphics.fillRoundedRect(-size / 2 + 6, -size / 2 + 6, size - 12, (size - 8) / 2, { tl: 6, tr: 6, bl: 0, br: 0 });
            moundGraphics.lineStyle(2, 0xffd700, 0.8);
            moundGraphics.strokeRoundedRect(-size / 2 + 4, -size / 2 + 4, size - 8, size - 8, 8);
          })
          .on('pointerout', () => {
            moundGraphics.clear();
            moundGraphics.fillStyle(0x000000, 0.3);
            moundGraphics.fillRoundedRect(-size / 2 + 6, -size / 2 + 6, size - 8, size - 8, 8);
            moundGraphics.fillStyle(0x5a4020, 1);
            moundGraphics.fillRoundedRect(-size / 2 + 4, -size / 2 + 4, size - 8, size - 8, 8);
            moundGraphics.fillStyle(0x7a5a30, 0.6);
            moundGraphics.fillRoundedRect(-size / 2 + 6, -size / 2 + 6, size - 12, (size - 8) / 2, { tl: 6, tr: 6, bl: 0, br: 0 });
            moundGraphics.lineStyle(2, 0x3a2a10, 1);
            moundGraphics.strokeRoundedRect(-size / 2 + 4, -size / 2 + 4, size - 8, size - 8, 8);
          })
          .on('pointerdown', () => this.digCell(cell));
        cell.container.add(hitArea);
      }
    }
  }

  private getDistanceColor(distance: number): string {
    if (distance <= 1) return '#ff4444'; // Very close - red/hot
    if (distance <= 2) return '#ffaa44'; // Close - orange
    if (distance <= 3) return '#ffdd44'; // Medium - yellow
    if (distance <= 4) return '#88ccff'; // Far - light blue
    return '#4488ff'; // Very far - blue/cold
  }

  private createDirectionArrow(cell: GridCell): Phaser.GameObjects.Graphics | null {
    // Find treasure position
    let treasureRow = 0, treasureCol = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.grid[r][c].hasTreasure) {
          treasureRow = r;
          treasureCol = c;
        }
      }
    }

    const dRow = treasureRow - cell.row;
    const dCol = treasureCol - cell.col;

    const arrow = this.add.graphics();
    arrow.fillStyle(0xffffff, 0.3);

    const arrowSize = 8;
    let angle = Math.atan2(dRow, dCol);

    arrow.setRotation(angle);
    arrow.fillTriangle(20, 0, 12, -arrowSize, 12, arrowSize);

    return arrow;
  }

  private drawTreasureChest(container: Phaser.GameObjects.Container, x: number, y: number): void {
    const g = this.add.graphics();

    // Glow
    g.fillStyle(0xffd700, 0.3);
    g.fillCircle(x, y, 30);

    // Chest base
    g.fillStyle(0x8b4513, 1);
    g.fillRoundedRect(x - 20, y - 5, 40, 25, 4);

    // Chest lid
    g.fillStyle(0xa0522d, 1);
    g.fillRoundedRect(x - 22, y - 20, 44, 18, { tl: 8, tr: 8, bl: 0, br: 0 });

    // Gold trim
    g.lineStyle(2, 0xffd700, 1);
    g.strokeRoundedRect(x - 20, y - 5, 40, 25, 4);
    g.strokeRoundedRect(x - 22, y - 20, 44, 18, { tl: 8, tr: 8, bl: 0, br: 0 });

    // Lock
    g.fillStyle(0xffd700, 1);
    g.fillCircle(x, y + 2, 6);
    g.fillRect(x - 3, y + 2, 6, 8);

    container.add(g);

    // Sparkle effect
    for (let i = 0; i < 5; i++) {
      const sparkle = this.add.star(
        x + (Math.random() - 0.5) * 40,
        y + (Math.random() - 0.5) * 40,
        4, 2, 4, 0xffd700
      );
      container.add(sparkle);

      this.tweens.add({
        targets: sparkle,
        alpha: { from: 1, to: 0 },
        scale: { from: 1, to: 0 },
        duration: 800,
        delay: i * 150,
        repeat: -1,
        yoyo: true,
      });
    }
  }

  private digCell(cell: GridCell): void {
    if (cell.isDug || this.gameOver) return;

    cell.isDug = true;
    this.digsRemaining--;
    this.digsText.setText(`${this.digsRemaining}`);

    // Re-render this cell
    const { width, height } = this.scale;
    const cellSize = 70;
    const gridWidth = GRID_SIZE * cellSize;
    const gridHeight = GRID_SIZE * cellSize;
    const startX = width / 2 - gridWidth / 2 + cellSize / 2;
    const startY = height / 2 - gridHeight / 2 + cellSize / 2 + 20;
    const x = startX + cell.col * cellSize;
    const y = startY + cell.row * cellSize;

    // Dig animation
    this.cameras.main.shake(50, 0.005);

    this.createCell(cell, x, y, cellSize);

    // Check results
    if (cell.hasTreasure) {
      this.treasuresFound++;
      this.handleWin();
    } else if (this.digsRemaining <= 0) {
      this.handleLoss();
    }
  }

  private handleWin(): void {
    this.gameOver = true;

    // Calculate rewards based on digs remaining
    const rewards: Reward[] = [];
    const baseCoins = 150;
    const bonusCoins = this.digsRemaining * 25;

    rewards.push({ type: 'coins', amount: baseCoins + bonusCoins });

    if (this.digsRemaining >= 4) {
      rewards.push({ type: 'diamonds', amount: 8 });
    } else if (this.digsRemaining >= 2) {
      rewards.push({ type: 'diamonds', amount: 3 });
    }

    // Award rewards
    rewards.forEach(reward => {
      getCurrencyManager().awardReward(reward, 'treasure_dig');
    });

    // Show result
    this.time.delayedCall(800, () => {
      this.rewardPresenter.show({
        won: true,
        rewards,
        message: `Found treasure with ${this.digsRemaining} digs left!`,
      });
    });
  }

  private handleLoss(): void {
    this.gameOver = true;

    // Reveal treasure location
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = this.grid[row][col];
        if (cell.hasTreasure && !cell.isDug) {
          cell.isDug = true;
          const { width, height } = this.scale;
          const cellSize = 70;
          const gridWidth = GRID_SIZE * cellSize;
          const gridHeight = GRID_SIZE * cellSize;
          const startX = width / 2 - gridWidth / 2 + cellSize / 2;
          const startY = height / 2 - gridHeight / 2 + cellSize / 2 + 20;
          const x = startX + col * cellSize;
          const y = startY + row * cellSize;
          this.createCell(cell, x, y, cellSize);
        }
      }
    }

    this.time.delayedCall(1000, () => {
      this.rewardPresenter.show({
        won: false,
        rewards: [],
        message: 'Out of digs! The treasure was there...',
      });
    });
  }

  private createBackButton(): void {
    const backBtn = this.add.rectangle(60, 45, 100, 40, 0x4a4a5e)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backBtn.setFillStyle(0x5a5a6e))
      .on('pointerout', () => backBtn.setFillStyle(0x4a4a5e))
      .on('pointerdown', () => this.scene.start('MiniGameHubScene'));

    this.add.text(60, 45, '< Back', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
  }
}
