import Phaser from 'phaser';
import { Reward } from '../types';
import { getCurrencyManager } from '../meta/CurrencyManager';
import { MiniGameRewardPresenter, MiniGameTutorial } from './MiniGameRewardPresenter';

interface Vehicle {
  id: number;
  row: number;
  col: number;
  length: number;
  isHorizontal: boolean;
  isTarget?: boolean;
  color: number;
  sprite?: Phaser.GameObjects.Container;
}

interface Level {
  vehicles: Omit<Vehicle, 'id' | 'sprite'>[];
  exitRow: number;
}

const GRID_SIZE = 6;
const CELL_SIZE = 60;

const LEVELS: Level[] = [
  {
    exitRow: 2,
    vehicles: [
      { row: 2, col: 0, length: 2, isHorizontal: true, isTarget: true, color: 0xff4444 },
      { row: 0, col: 2, length: 3, isHorizontal: false, color: 0x4488ff },
      { row: 3, col: 1, length: 2, isHorizontal: true, color: 0x44ff44 },
      { row: 4, col: 3, length: 2, isHorizontal: false, color: 0xffaa44 },
    ],
  },
  {
    exitRow: 2,
    vehicles: [
      { row: 2, col: 1, length: 2, isHorizontal: true, isTarget: true, color: 0xff4444 },
      { row: 0, col: 0, length: 2, isHorizontal: true, color: 0x4488ff },
      { row: 0, col: 3, length: 3, isHorizontal: false, color: 0x44ff44 },
      { row: 1, col: 4, length: 2, isHorizontal: false, color: 0xffaa44 },
      { row: 3, col: 2, length: 2, isHorizontal: true, color: 0xaa44ff },
      { row: 4, col: 0, length: 2, isHorizontal: false, color: 0x44ffff },
    ],
  },
  {
    exitRow: 2,
    vehicles: [
      { row: 2, col: 0, length: 2, isHorizontal: true, isTarget: true, color: 0xff4444 },
      { row: 0, col: 2, length: 2, isHorizontal: false, color: 0x4488ff },
      { row: 0, col: 4, length: 3, isHorizontal: false, color: 0x44ff44 },
      { row: 2, col: 3, length: 2, isHorizontal: false, color: 0xffaa44 },
      { row: 3, col: 0, length: 2, isHorizontal: true, color: 0xaa44ff },
      { row: 4, col: 2, length: 3, isHorizontal: true, color: 0x44ffff },
      { row: 5, col: 0, length: 2, isHorizontal: true, color: 0xff44aa },
    ],
  },
];

export class ParkingJamScene extends Phaser.Scene {
  private vehicles: Vehicle[] = [];
  private currentLevel: number = 0;
  private moveCount: number = 0;
  private movesText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private gridStartX: number = 0;
  private gridStartY: number = 0;
  private rewardPresenter!: MiniGameRewardPresenter;
  private tutorial!: MiniGameTutorial;
  private gameOver: boolean = false;
  private dragStartPos?: { x: number; y: number };
  private draggingVehicle?: Vehicle;
  private exitMarker?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'ParkingJamScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.rewardPresenter = new MiniGameRewardPresenter(this);
    this.tutorial = new MiniGameTutorial(this);

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x2a3a4a);

    // Title
    this.add.text(width / 2, 40, 'PARKING JAM', {
      fontSize: '26px',
      fontFamily: 'Arial Black',
      color: '#ffaa44',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Level and moves display
    const infoBg = this.add.graphics();
    infoBg.fillStyle(0x1a2a3a, 0.9);
    infoBg.fillRoundedRect(width / 2 - 100, 65, 200, 40, 20);

    this.levelText = this.add.text(width / 2 - 50, 85, `Level 1`, {
      fontSize: '14px',
      fontFamily: 'Arial Bold',
      color: '#ffaa44',
    }).setOrigin(0.5);

    this.movesText = this.add.text(width / 2 + 50, 85, `Moves: 0`, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#aabbcc',
    }).setOrigin(0.5);

    // Calculate grid position
    const gridWidth = GRID_SIZE * CELL_SIZE;
    const gridHeight = GRID_SIZE * CELL_SIZE;
    this.gridStartX = width / 2 - gridWidth / 2;
    this.gridStartY = height / 2 - gridHeight / 2 + 20;

    // Load level
    this.loadLevel(this.currentLevel);

    // Input handling
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);

    // Back button
    this.createBackButton();

    // Tutorial
    this.tutorial.showIfFirstTime('parking_jam', 'Parking Jam', [
      'Drag vehicles to move them',
      'Get the red car to the exit',
      'Vehicles can only move along their axis',
      'Clear the path in fewest moves!',
    ]);
  }

  private loadLevel(levelIndex: number): void {
    const level = LEVELS[levelIndex % LEVELS.length];

    // Clear existing
    this.vehicles.forEach(v => v.sprite?.destroy());
    this.vehicles = [];
    this.moveCount = 0;
    this.gameOver = false;
    this.movesText.setText('Moves: 0');
    this.levelText.setText(`Level ${levelIndex + 1}`);
    this.exitMarker?.destroy();

    // Draw grid
    this.drawGrid(level.exitRow);

    // Create vehicles
    level.vehicles.forEach((vDef, index) => {
      const vehicle: Vehicle = {
        ...vDef,
        id: index,
      };
      this.createVehicleSprite(vehicle);
      this.vehicles.push(vehicle);
    });
  }

  private drawGrid(exitRow: number): void {
    const gridGraphics = this.add.graphics();

    // Grid background
    gridGraphics.fillStyle(0x3a4a5a, 1);
    gridGraphics.fillRoundedRect(
      this.gridStartX - 10,
      this.gridStartY - 10,
      GRID_SIZE * CELL_SIZE + 20,
      GRID_SIZE * CELL_SIZE + 20,
      10
    );

    // Grid cells
    gridGraphics.fillStyle(0x4a5a6a, 1);
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        gridGraphics.fillRoundedRect(
          this.gridStartX + col * CELL_SIZE + 2,
          this.gridStartY + row * CELL_SIZE + 2,
          CELL_SIZE - 4,
          CELL_SIZE - 4,
          4
        );
      }
    }

    // Exit marker on right side
    this.exitMarker = this.add.container(
      this.gridStartX + GRID_SIZE * CELL_SIZE + 25,
      this.gridStartY + exitRow * CELL_SIZE + CELL_SIZE / 2
    );

    const exitBg = this.add.graphics();
    exitBg.fillStyle(0x44ff44, 0.3);
    exitBg.fillRoundedRect(-15, -30, 30, 60, 5);
    exitBg.lineStyle(3, 0x44ff44, 1);
    exitBg.strokeRoundedRect(-15, -30, 30, 60, 5);
    this.exitMarker.add(exitBg);

    const exitArrow = this.add.text(0, 0, 'EXIT', {
      fontSize: '10px',
      fontFamily: 'Arial Black',
      color: '#44ff44',
    }).setOrigin(0.5).setAngle(90);
    this.exitMarker.add(exitArrow);

    // Pulsing animation
    this.tweens.add({
      targets: this.exitMarker,
      alpha: 0.6,
      yoyo: true,
      repeat: -1,
      duration: 800,
    });
  }

  private createVehicleSprite(vehicle: Vehicle): void {
    const x = this.gridStartX + vehicle.col * CELL_SIZE + CELL_SIZE / 2;
    const y = this.gridStartY + vehicle.row * CELL_SIZE + CELL_SIZE / 2;

    const container = this.add.container(x, y);

    const vWidth = vehicle.isHorizontal ? vehicle.length * CELL_SIZE - 8 : CELL_SIZE - 8;
    const vHeight = vehicle.isHorizontal ? CELL_SIZE - 8 : vehicle.length * CELL_SIZE - 8;

    // Offset container to center of vehicle
    const offsetX = vehicle.isHorizontal ? (vehicle.length - 1) * CELL_SIZE / 2 : 0;
    const offsetY = vehicle.isHorizontal ? 0 : (vehicle.length - 1) * CELL_SIZE / 2;
    container.setPosition(x + offsetX, y + offsetY);

    // Vehicle body shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillRoundedRect(-vWidth / 2 + 3, -vHeight / 2 + 3, vWidth, vHeight, 8);
    container.add(shadow);

    // Vehicle body
    const body = this.add.graphics();
    body.fillStyle(vehicle.color, 1);
    body.fillRoundedRect(-vWidth / 2, -vHeight / 2, vWidth, vHeight, 8);

    // Highlight
    const lighterColor = Phaser.Display.Color.IntegerToColor(vehicle.color).lighten(30).color;
    body.fillStyle(lighterColor, 0.4);
    if (vehicle.isHorizontal) {
      body.fillRoundedRect(-vWidth / 2 + 4, -vHeight / 2 + 4, vWidth - 8, vHeight / 2 - 6, { tl: 5, tr: 5, bl: 0, br: 0 });
    } else {
      body.fillRoundedRect(-vWidth / 2 + 4, -vHeight / 2 + 4, vWidth / 2 - 6, vHeight - 8, { tl: 5, tr: 0, bl: 5, br: 0 });
    }

    // Border
    const darkerColor = Phaser.Display.Color.IntegerToColor(vehicle.color).darken(30).color;
    body.lineStyle(2, darkerColor, 1);
    body.strokeRoundedRect(-vWidth / 2, -vHeight / 2, vWidth, vHeight, 8);
    container.add(body);

    // Windows for cars
    if (vehicle.length === 2) {
      const windowGraphics = this.add.graphics();
      windowGraphics.fillStyle(0x88ccff, 0.6);
      if (vehicle.isHorizontal) {
        windowGraphics.fillRoundedRect(-vWidth / 2 + 10, -vHeight / 2 + 8, 20, vHeight - 16, 4);
        windowGraphics.fillRoundedRect(vWidth / 2 - 30, -vHeight / 2 + 8, 20, vHeight - 16, 4);
      } else {
        windowGraphics.fillRoundedRect(-vWidth / 2 + 8, -vHeight / 2 + 10, vWidth - 16, 20, 4);
        windowGraphics.fillRoundedRect(-vWidth / 2 + 8, vHeight / 2 - 30, vWidth - 16, 20, 4);
      }
      container.add(windowGraphics);
    }

    // Target vehicle indicator
    if (vehicle.isTarget) {
      const targetLabel = this.add.text(0, 0, 'GO!', {
        fontSize: '14px',
        fontFamily: 'Arial Black',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5);
      container.add(targetLabel);
    }

    vehicle.sprite = container;
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.gameOver) return;

    // Find which vehicle was clicked
    const gridX = pointer.x - this.gridStartX;
    const gridY = pointer.y - this.gridStartY;
    const col = Math.floor(gridX / CELL_SIZE);
    const row = Math.floor(gridY / CELL_SIZE);

    for (const vehicle of this.vehicles) {
      if (this.isVehicleAt(vehicle, row, col)) {
        this.draggingVehicle = vehicle;
        this.dragStartPos = { x: pointer.x, y: pointer.y };
        break;
      }
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.draggingVehicle || !this.dragStartPos) return;

    const dx = pointer.x - this.dragStartPos.x;
    const dy = pointer.y - this.dragStartPos.y;

    // Determine movement based on vehicle orientation
    if (this.draggingVehicle.isHorizontal) {
      const cellsMoved = Math.round(dx / CELL_SIZE);
      if (cellsMoved !== 0 && this.canMove(this.draggingVehicle, 0, cellsMoved)) {
        this.moveVehicle(this.draggingVehicle, 0, cellsMoved);
        this.dragStartPos = { x: pointer.x, y: pointer.y };
      }
    } else {
      const cellsMoved = Math.round(dy / CELL_SIZE);
      if (cellsMoved !== 0 && this.canMove(this.draggingVehicle, cellsMoved, 0)) {
        this.moveVehicle(this.draggingVehicle, cellsMoved, 0);
        this.dragStartPos = { x: pointer.x, y: pointer.y };
      }
    }
  }

  private onPointerUp(): void {
    if (this.draggingVehicle) {
      this.draggingVehicle = undefined;
      this.dragStartPos = undefined;

      // Check win condition
      this.checkWin();
    }
  }

  private isVehicleAt(vehicle: Vehicle, row: number, col: number): boolean {
    if (vehicle.isHorizontal) {
      return vehicle.row === row && col >= vehicle.col && col < vehicle.col + vehicle.length;
    } else {
      return vehicle.col === col && row >= vehicle.row && row < vehicle.row + vehicle.length;
    }
  }

  private canMove(vehicle: Vehicle, dRow: number, dCol: number): boolean {
    const newRow = vehicle.row + dRow;
    const newCol = vehicle.col + dCol;

    // Check bounds
    if (vehicle.isHorizontal) {
      if (newCol < 0 || newCol + vehicle.length > GRID_SIZE) return false;
    } else {
      if (newRow < 0 || newRow + vehicle.length > GRID_SIZE) return false;
    }

    // Check collision with other vehicles
    for (const other of this.vehicles) {
      if (other.id === vehicle.id) continue;

      // Check if any cell of moved vehicle overlaps with other vehicle
      for (let i = 0; i < vehicle.length; i++) {
        const checkRow = vehicle.isHorizontal ? newRow : newRow + i;
        const checkCol = vehicle.isHorizontal ? newCol + i : newCol;

        if (this.isVehicleAt(other, checkRow, checkCol)) {
          return false;
        }
      }
    }

    return true;
  }

  private moveVehicle(vehicle: Vehicle, dRow: number, dCol: number): void {
    vehicle.row += dRow;
    vehicle.col += dCol;
    this.moveCount++;
    this.movesText.setText(`Moves: ${this.moveCount}`);

    // Update sprite position
    if (vehicle.sprite) {
      const x = this.gridStartX + vehicle.col * CELL_SIZE + CELL_SIZE / 2;
      const y = this.gridStartY + vehicle.row * CELL_SIZE + CELL_SIZE / 2;
      const offsetX = vehicle.isHorizontal ? (vehicle.length - 1) * CELL_SIZE / 2 : 0;
      const offsetY = vehicle.isHorizontal ? 0 : (vehicle.length - 1) * CELL_SIZE / 2;

      this.tweens.add({
        targets: vehicle.sprite,
        x: x + offsetX,
        y: y + offsetY,
        duration: 100,
        ease: 'Power2',
      });
    }
  }

  private checkWin(): void {
    const targetVehicle = this.vehicles.find(v => v.isTarget);
    if (!targetVehicle) return;

    const level = LEVELS[this.currentLevel % LEVELS.length];

    // Check if target vehicle reached the right edge
    if (targetVehicle.col + targetVehicle.length >= GRID_SIZE && targetVehicle.row === level.exitRow) {
      this.handleLevelComplete();
    }
  }

  private handleLevelComplete(): void {
    this.gameOver = true;

    // Animate target vehicle exiting
    const targetVehicle = this.vehicles.find(v => v.isTarget);
    if (targetVehicle?.sprite) {
      this.tweens.add({
        targets: targetVehicle.sprite,
        x: targetVehicle.sprite.x + CELL_SIZE * 2,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          if (this.currentLevel < LEVELS.length - 1) {
            // Next level
            this.time.delayedCall(500, () => {
              this.currentLevel++;
              this.loadLevel(this.currentLevel);
            });
          } else {
            // All levels complete
            this.handleWin();
          }
        },
      });
    }
  }

  private handleWin(): void {
    const rewards: Reward[] = [];
    const baseCoins = 200;
    const efficiency = Math.max(0, 50 - this.moveCount);
    rewards.push({ type: 'coins', amount: baseCoins + efficiency * 3 });

    if (this.moveCount <= 20) {
      rewards.push({ type: 'diamonds', amount: 8 });
    } else if (this.moveCount <= 35) {
      rewards.push({ type: 'diamonds', amount: 4 });
    }

    rewards.forEach(reward => {
      getCurrencyManager().awardReward(reward, 'parking_jam');
    });

    this.rewardPresenter.show({
      won: true,
      rewards,
      message: `Cleared all levels in ${this.moveCount} moves!`,
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
