import Phaser from 'phaser';
import { Grid } from '../game/Grid';
import { MatchDetector } from '../game/MatchDetector';
import { GameTester } from '../game/GameTester';
import { Level } from '../game/Level';
import { GameState } from '../game/GameState';
import { activatePowerup as activatePowerupHelper } from '../game/powerupUtils';
import { ProgressStorage } from '../storage/ProgressStorage';
import { CONFIG } from '../config';
import { Tile, Position, SwipeDirection, Cell } from '../types';
import { MoveCounter, ObjectiveDisplay, EndScreen } from './UIComponents';

export interface GameSceneData {
  levelId?: number;
}

export class GameScene extends Phaser.Scene {
  private grid!: Grid;
  private matchDetector!: MatchDetector;
  private gameTester!: GameTester;
  private level!: Level;
  private gameState!: GameState;
  private tileSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private grassSprites: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private gridOffsetX = 0;
  private gridOffsetY = 0;
  private tileSize = CONFIG.GRID.TILE_SIZE; // Dynamic tile size
  private isProcessing = false;
  private autoTestRunning = false;

  // UI Components
  private moveCounter!: MoveCounter;
  private objectiveDisplay!: ObjectiveDisplay;
  private endScreen!: EndScreen;

  constructor() {
    super('GameScene');
  }

  create(data?: GameSceneData): void {
    const levelId = data?.levelId ?? 1;
    console.log(`Game Scene Created - Level ${levelId}`);

    // Load level
    this.level = Level.load(levelId);

    // Initialize grid with level layout
    this.grid = new Grid(this.level.rows, this.level.cols);
    this.grid.initializeFromLayout(this.level.layout, this.level.tileVariety);

    // Initialize game systems
    this.matchDetector = new MatchDetector();
    this.gameTester = new GameTester(this.grid, this.matchDetector);
    this.gameState = new GameState(this.level);

    // Calculate dynamic tile size to fit grid on screen
    const availableWidth = CONFIG.SCREEN.WIDTH - CONFIG.UI.PADDING * 2;
    const availableHeight = CONFIG.SCREEN.HEIGHT - CONFIG.UI.HEADER_HEIGHT - CONFIG.UI.OBJECTIVE_BAR_HEIGHT - CONFIG.UI.PADDING * 2;

    const maxTileWidth = availableWidth / this.level.cols;
    const maxTileHeight = availableHeight / this.level.rows;
    this.tileSize = Math.min(maxTileWidth, maxTileHeight, CONFIG.GRID.TILE_SIZE);

    // Calculate grid offset for centering
    const totalGridWidth = this.level.cols * this.tileSize;
    const totalGridHeight = this.level.rows * this.tileSize;
    this.gridOffsetX = (CONFIG.SCREEN.WIDTH - totalGridWidth) / 2;
    this.gridOffsetY = CONFIG.UI.HEADER_HEIGHT + CONFIG.UI.OBJECTIVE_BAR_HEIGHT + (availableHeight - totalGridHeight) / 2 + CONFIG.UI.PADDING;

    // Ensure no initial matches
    this.removeInitialMatches();

    // Setup game state listeners
    this.setupGameStateListeners();

    // Render UI
    this.renderUI();

    // Render the grid
    this.renderGrid();

    // Setup input
    this.setupInput();

    // Setup keyboard shortcuts for testing
    this.setupTestingKeys();
  }

  private setupGameStateListeners(): void {
    this.gameState.on('move_used', () => {
      this.updateMoveDisplay();
    });

    this.gameState.on('low_moves', () => {
      this.updateMoveDisplay();
    });

    this.gameState.on('game_won', (event) => {
      console.log('Game Won!', event);
      this.showWinScreen();
    });

    this.gameState.on('game_lost', (event) => {
      console.log('Game Lost!', event);
      this.showLoseScreen();
    });

    this.gameState.getObjectiveTracker().on('progress', () => {
      this.updateObjectiveDisplay();
    });
  }

  private renderUI(): void {
    // Header background
    const headerBg = this.add.graphics();
    headerBg.fillStyle(CONFIG.UI.COLORS.PANEL, 1);
    headerBg.fillRect(0, 0, CONFIG.SCREEN.WIDTH, CONFIG.UI.HEADER_HEIGHT);

    // Level text (left side)
    this.add.text(CONFIG.UI.PADDING, CONFIG.UI.HEADER_HEIGHT / 2, `Level ${this.level.id}`, {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0, 0.5);

    // Move counter (centered in header)
    this.moveCounter = new MoveCounter(
      this,
      CONFIG.SCREEN.WIDTH / 2,
      CONFIG.UI.HEADER_HEIGHT / 2
    );
    this.updateMoveDisplay();

    // Attach a "MOVES" label to the left of the counter circle so it's visible
    // Position using the configured move counter size with a small gap
    const labelOffsetX = -CONFIG.UI.MOVE_COUNTER_SIZE / 2 - 8; // left of circle
    const labelOffsetY = -6; // slight upward offset to match prior placement
    this.moveCounter.attachLabel('MOVES', labelOffsetX, labelOffsetY, 'left');

    // Menu button (right side) - takes user back to level select
    const menuBtn = this.add.text(CONFIG.SCREEN.WIDTH - CONFIG.UI.PADDING, CONFIG.UI.HEADER_HEIGHT / 2, 'MENU', {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#444466',
      padding: { x: 10, y: 5 },
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => this.goToMenu());
    menuBtn.on('pointerover', () => menuBtn.setAlpha(0.8));
    menuBtn.on('pointerout', () => menuBtn.setAlpha(1));

    // Objective bar background
    const objBg = this.add.graphics();
    objBg.fillStyle(CONFIG.UI.COLORS.BACKGROUND, 1);
    objBg.fillRect(0, CONFIG.UI.HEADER_HEIGHT, CONFIG.SCREEN.WIDTH, CONFIG.UI.OBJECTIVE_BAR_HEIGHT);

    // Objective display
    this.objectiveDisplay = new ObjectiveDisplay(
      this,
      CONFIG.SCREEN.WIDTH / 2,
      CONFIG.UI.HEADER_HEIGHT + CONFIG.UI.OBJECTIVE_BAR_HEIGHT / 2,
      this.gameState.getObjectives()
    );

    // End screen (hidden initially)
    this.endScreen = new EndScreen(this);
  }

  private updateMoveDisplay(): void {
    this.moveCounter.update(
      this.gameState.getMovesRemaining(),
      this.gameState.isLowMoves()
    );
  }

  private updateObjectiveDisplay(): void {
    this.objectiveDisplay.update(this.gameState.getObjectives());
  }

  private showWinScreen(): void {
    const stars = this.gameState.calculateStars();
    const score = this.gameState.getScore();
    const bonus = this.gameState.getMovesRemaining() * CONFIG.LEVEL.BONUS_POINTS_PER_MOVE;

    // Save progress
    ProgressStorage.completeLevel(this.level.id, stars);

    this.endScreen.showWin(score, stars, bonus, {
      onRetry: () => this.restartLevel(),
      onNext: () => this.nextLevel(),
      onMenu: () => this.goToMenu(),
    });
  }

  private showLoseScreen(): void {
    this.endScreen.showLose(this.gameState.getScore(), {
      onRetry: () => this.restartLevel(),
      onMenu: () => this.goToMenu(),
    });
  }

  private restartLevel(): void {
    this.scene.restart({ levelId: this.level.id });
  }

  private nextLevel(): void {
    const nextId = this.level.id + 1;
    if (Level.exists(nextId)) {
      this.scene.restart({ levelId: nextId });
    } else {
      this.goToMenu();
    }
  }

  private goToMenu(): void {
    this.scene.start('LevelSelectScene');
  }

  private removeInitialMatches(): void {
    let attempts = 0;
    while (attempts < 100) {
      const matches = this.matchDetector.findAllMatches(this.grid);
      if (matches.length === 0) break;
      
      // Replace matched tiles with new random ones
      matches.forEach(match => {
        match.tiles.forEach(tile => {
          const newTile = this.grid.createRandomTile(tile.row, tile.col);
          this.grid.setTile(tile.row, tile.col, newTile);
        });
      });
      
      attempts++;
    }
  }

  private renderGrid(): void {
    // Clear existing sprites
    this.tileSprites.forEach(sprite => sprite.destroy());
    this.tileSprites.clear();
    this.grassSprites.forEach(sprite => sprite.destroy());
    this.grassSprites.clear();

    // Draw grid background and obstacles
    this.grid.forEachCell(cell => {
      if (cell.blocked) return;

      const pos = this.cellToScreen(cell.row, cell.col);

      // Cell background
      const bg = this.add.graphics();
      bg.fillStyle(0x2a2a3e, 1);
      bg.fillRoundedRect(
        pos.x - this.tileSize / 2 + CONFIG.GRID.GAP / 2,
        pos.y - this.tileSize / 2 + CONFIG.GRID.GAP / 2,
        this.tileSize - CONFIG.GRID.GAP,
        this.tileSize - CONFIG.GRID.GAP,
        8
      );

      // Draw grass obstacle if present
      if (cell.obstacle?.type === 'grass') {
        this.createGrassSprite(cell);
      }
    });

    // Draw tiles
    this.grid.forEachCell(cell => {
      if (cell.tile) {
        this.createTileSprite(cell.tile);
      }
    });
  }

  private createGrassSprite(cell: Cell): void {
    const pos = this.cellToScreen(cell.row, cell.col);
    const key = `grass_${cell.row}_${cell.col}`;

    const grass = this.add.graphics();
    grass.setDepth(0); // Below tiles

    const size = this.tileSize - CONFIG.GRID.GAP;
    const halfSize = size / 2;

    // Grass background
    grass.fillStyle(CONFIG.UI.COLORS.GRASS, 1);
    grass.fillRoundedRect(
      pos.x - halfSize + CONFIG.GRID.GAP / 2,
      pos.y - halfSize + CONFIG.GRID.GAP / 2,
      size - CONFIG.GRID.GAP,
      size - CONFIG.GRID.GAP,
      8
    );

    // Grass pattern lines
    grass.lineStyle(2, CONFIG.UI.COLORS.GRASS_DARK, 0.6);
    for (let i = 0; i < 4; i++) {
      const offsetX = (i - 1.5) * 12;
      grass.lineBetween(
        pos.x + offsetX,
        pos.y + halfSize * 0.4,
        pos.x + offsetX + 4,
        pos.y - halfSize * 0.3
      );
    }

    this.grassSprites.set(key, grass);
  }

  private removeGrassSprite(row: number, col: number): void {
    const key = `grass_${row}_${col}`;
    const sprite = this.grassSprites.get(key);
    if (sprite) {
      // Animate grass clearing
      this.tweens.add({
        targets: sprite,
        alpha: 0,
        duration: CONFIG.TIMING.CLEAR_DURATION,
        onComplete: () => {
          sprite.destroy();
          this.grassSprites.delete(key);
        },
      });
    }
  }

  private createTileSprite(tile: Tile, startRow?: number): void {
    const startPos = startRow !== undefined ? this.cellToScreen(startRow, tile.col) : this.cellToScreen(tile.row, tile.col);
    
    // Create a container to hold graphics
    const container = this.add.container(startPos.x, startPos.y);
    
    const graphics = this.add.graphics();
    const color = CONFIG.COLORS[tile.type as keyof typeof CONFIG.COLORS] || 0x888888;
    const size = this.tileSize - CONFIG.GRID.GAP * 4;
    const halfSize = size / 2;

    // Draw shape based on tile type or powerup
    if (tile.isPowerup && tile.powerupType) {
      this.drawPowerupShape(graphics, tile.powerupType, color, halfSize);
    } else {
      this.drawTileShape(graphics, tile.type, color, halfSize);
    }

    container.add(graphics);

    // Set interactive on the container
    container.setSize(this.tileSize, this.tileSize);
    container.setInteractive();

    container.setData('tile', tile);
    this.tileSprites.set(tile.id, container);
  }

  private drawTileShape(graphics: Phaser.GameObjects.Graphics, type: string, color: number, halfSize: number): void {
    graphics.fillStyle(color, 1);
    graphics.lineStyle(3, 0xffffff, 0.5);

    switch (type) {
      case 'red': // Heart
        this.drawHeart(graphics, halfSize);
        break;
      case 'blue': // Diamond
        this.drawDiamond(graphics, halfSize);
        break;
      case 'green': // Club/Clover
        this.drawClub(graphics, halfSize);
        break;
      case 'yellow': // Star
        this.drawStar(graphics, halfSize, 5);
        break;
      case 'purple': // Pentagon
        this.drawPolygon(graphics, halfSize, 5);
        break;
      case 'orange': // Triangle
        this.drawPolygon(graphics, halfSize, 3);
        break;
      default:
        // Circle fallback
        graphics.fillCircle(0, 0, halfSize * 0.8);
        graphics.strokeCircle(0, 0, halfSize * 0.8);
    }
  }

  private drawPowerupShape(graphics: Phaser.GameObjects.Graphics, powerupType: string, color: number, halfSize: number): void {
    graphics.fillStyle(color, 1);
    graphics.lineStyle(4, 0xffffff, 1);

    switch (powerupType) {
      case 'rocket_h': // Horizontal arrow
        this.drawRocket(graphics, halfSize, 'horizontal');
        break;
      case 'rocket_v': // Vertical arrow
        this.drawRocket(graphics, halfSize, 'vertical');
        break;
      case 'bomb': // Bomb/explosion shape
        this.drawBomb(graphics, halfSize);
        break;
      case 'color_bomb': // Rainbow star
        this.drawColorBomb(graphics, halfSize);
        break;
      case 'propeller': // Propeller/helicopter
        this.drawPropeller(graphics, color, halfSize);
        break;
      default:
        graphics.fillCircle(0, 0, halfSize * 0.8);
    }
  }

  private drawHeart(graphics: Phaser.GameObjects.Graphics, halfSize: number): void {
    const s = halfSize * 0.85;
    
    // Draw heart using two circles and a triangle
    // Top left circle
    graphics.fillCircle(-s * 0.35, -s * 0.2, s * 0.45);
    // Top right circle
    graphics.fillCircle(s * 0.35, -s * 0.2, s * 0.45);
    // Bottom triangle
    graphics.fillTriangle(-s * 0.75, -s * 0.1, s * 0.75, -s * 0.1, 0, s * 0.85);
    
    // Outline - simplified
    graphics.strokeCircle(-s * 0.35, -s * 0.2, s * 0.45);
    graphics.strokeCircle(s * 0.35, -s * 0.2, s * 0.45);
  }

  private drawDiamond(graphics: Phaser.GameObjects.Graphics, halfSize: number): void {
    const s = halfSize * 0.85;
    graphics.beginPath();
    graphics.moveTo(0, -s);
    graphics.lineTo(s * 0.7, 0);
    graphics.lineTo(0, s);
    graphics.lineTo(-s * 0.7, 0);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
  }

  private drawClub(graphics: Phaser.GameObjects.Graphics, halfSize: number): void {
    const s = halfSize * 0.35;
    // Three circles for the club
    graphics.fillCircle(0, -s * 1.2, s);
    graphics.fillCircle(-s * 1.1, s * 0.3, s);
    graphics.fillCircle(s * 1.1, s * 0.3, s);
    // Stem
    graphics.fillTriangle(-s * 0.4, s * 0.5, s * 0.4, s * 0.5, 0, s * 2.2);
    // Outlines
    graphics.strokeCircle(0, -s * 1.2, s);
    graphics.strokeCircle(-s * 1.1, s * 0.3, s);
    graphics.strokeCircle(s * 1.1, s * 0.3, s);
  }

  private drawStar(graphics: Phaser.GameObjects.Graphics, halfSize: number, points: number): void {
    const outerRadius = halfSize * 0.9;
    const innerRadius = halfSize * 0.4;
    const starPoints: { x: number; y: number }[] = [];

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      starPoints.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }

    graphics.beginPath();
    graphics.moveTo(starPoints[0].x, starPoints[0].y);
    for (let i = 1; i < starPoints.length; i++) {
      graphics.lineTo(starPoints[i].x, starPoints[i].y);
    }
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
  }

  private drawPolygon(graphics: Phaser.GameObjects.Graphics, halfSize: number, sides: number): void {
    const radius = halfSize * 0.85;
    const points: { x: number; y: number }[] = [];

    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }

    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
  }

  private drawRocket(graphics: Phaser.GameObjects.Graphics, halfSize: number, direction: 'horizontal' | 'vertical'): void {
    const s = halfSize * 0.8;
    
    graphics.beginPath();
    if (direction === 'horizontal') {
      // Arrow pointing right
      graphics.moveTo(s, 0);
      graphics.lineTo(s * 0.2, -s * 0.6);
      graphics.lineTo(s * 0.2, -s * 0.3);
      graphics.lineTo(-s, -s * 0.3);
      graphics.lineTo(-s, s * 0.3);
      graphics.lineTo(s * 0.2, s * 0.3);
      graphics.lineTo(s * 0.2, s * 0.6);
    } else {
      // Arrow pointing up
      graphics.moveTo(0, -s);
      graphics.lineTo(s * 0.6, -s * 0.2);
      graphics.lineTo(s * 0.3, -s * 0.2);
      graphics.lineTo(s * 0.3, s);
      graphics.lineTo(-s * 0.3, s);
      graphics.lineTo(-s * 0.3, -s * 0.2);
      graphics.lineTo(-s * 0.6, -s * 0.2);
    }
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
  }

  private drawBomb(graphics: Phaser.GameObjects.Graphics, halfSize: number): void {
    const s = halfSize * 0.7;
    
    // Main bomb circle
    graphics.fillCircle(0, s * 0.15, s);
    graphics.strokeCircle(0, s * 0.15, s);
    
    // Fuse
    graphics.lineStyle(4, 0x8B4513, 1);
    graphics.beginPath();
    graphics.moveTo(0, -s * 0.7);
    graphics.lineTo(s * 0.2, -s * 1.1);
    graphics.lineTo(s * 0.4, -s * 0.9);
    graphics.strokePath();
    
    // Spark
    graphics.fillStyle(0xffff00, 1);
    graphics.fillCircle(s * 0.4, -s * 0.9, s * 0.2);
    graphics.fillStyle(0xff6600, 1);
    graphics.fillCircle(s * 0.4, -s * 0.9, s * 0.12);
  }

  private drawColorBomb(graphics: Phaser.GameObjects.Graphics, halfSize: number): void {
    // Draw a rainbow-colored multi-pointed star
    const colors = [0xff0000, 0xff7700, 0xffff00, 0x00ff00, 0x0000ff, 0x8800ff];
    const outerRadius = halfSize * 0.9;
    const innerRadius = halfSize * 0.45;
    const points = 6;

    for (let c = 0; c < colors.length; c++) {
      graphics.fillStyle(colors[c], 1);
      const angle1 = (c * 2 * Math.PI) / points - Math.PI / 2;
      const angle2 = ((c + 1) * 2 * Math.PI) / points - Math.PI / 2;
      const midAngle = ((c + 0.5) * 2 * Math.PI) / points - Math.PI / 2;
      
      graphics.beginPath();
      graphics.moveTo(0, 0);
      graphics.lineTo(Math.cos(angle1) * outerRadius, Math.sin(angle1) * outerRadius);
      graphics.lineTo(Math.cos(midAngle) * innerRadius, Math.sin(midAngle) * innerRadius);
      graphics.lineTo(Math.cos(angle2) * outerRadius, Math.sin(angle2) * outerRadius);
      graphics.closePath();
      graphics.fillPath();
    }

    // White center
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(0, 0, halfSize * 0.25);
    
    // Outline
    graphics.lineStyle(2, 0xffffff, 0.8);
    for (let i = 0; i < points; i++) {
      const angle = (i * 2 * Math.PI) / points - Math.PI / 2;
      graphics.lineBetween(0, 0, Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
    }
  }

  private drawPropeller(graphics: Phaser.GameObjects.Graphics, color: number, halfSize: number): void {
    const s = halfSize * 0.8;

    // Draw the body (colored circle)
    graphics.fillStyle(color, 1);
    graphics.fillCircle(0, 0, s * 0.5);
    graphics.lineStyle(2, 0xffffff, 0.8);
    graphics.strokeCircle(0, 0, s * 0.5);

    // Draw 3 propeller blades
    graphics.fillStyle(0xffffff, 0.9);
    for (let i = 0; i < 3; i++) {
      const angle = (i * 2 * Math.PI) / 3 - Math.PI / 2;
      const bladeLength = s * 0.9;
      const bladeWidth = s * 0.25;

      graphics.save();
      graphics.beginPath();

      // Blade shape - elongated ellipse
      const tipX = Math.cos(angle) * bladeLength;
      const tipY = Math.sin(angle) * bladeLength;
      const perpAngle = angle + Math.PI / 2;
      const widthX = Math.cos(perpAngle) * bladeWidth;
      const widthY = Math.sin(perpAngle) * bladeWidth;

      graphics.moveTo(widthX * 0.3, widthY * 0.3);
      graphics.lineTo(tipX + widthX * 0.15, tipY + widthY * 0.15);
      graphics.lineTo(tipX, tipY);
      graphics.lineTo(tipX - widthX * 0.15, tipY - widthY * 0.15);
      graphics.lineTo(-widthX * 0.3, -widthY * 0.3);
      graphics.closePath();
      graphics.fillPath();

      graphics.restore();
    }

    // Center hub
    graphics.fillStyle(0x333333, 1);
    graphics.fillCircle(0, 0, s * 0.15);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(0, 0, s * 0.08);
  }

  private cellToScreen(row: number, col: number): { x: number; y: number } {
    return {
      x: this.gridOffsetX + col * this.tileSize + this.tileSize / 2,
      y: this.gridOffsetY + row * this.tileSize + this.tileSize / 2,
    };
  }

  private screenToCell(x: number, y: number): Position | null {
    const col = Math.floor((x - this.gridOffsetX) / this.tileSize);
    const row = Math.floor((y - this.gridOffsetY) / this.tileSize);

    if (row < 0 || row >= this.grid.rows || col < 0 || col >= this.grid.cols) {
      return null;
    }

    return { row, col };
  }

  private setupInput(): void {
    let startPos: { x: number; y: number } | null = null;
    let startCell: Position | null = null;
    let draggedSprite: Phaser.GameObjects.Container | null = null;
    let originalPos: { x: number; y: number } | null = null;
    let dragAxis: 'none' | 'horizontal' | 'vertical' = 'none';
    const maxDragDistance = this.tileSize * 0.4;
    const axisLockThreshold = 10; // Pixels before locking to an axis

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isProcessing) return;

      startPos = { x: pointer.x, y: pointer.y };
      startCell = this.screenToCell(pointer.x, pointer.y);
      dragAxis = 'none'; // Reset axis lock

      // Get the tile sprite for visual feedback
      if (startCell) {
        const tile = this.grid.getTile(startCell.row, startCell.col);
        if (tile) {
          draggedSprite = this.tileSprites.get(tile.id) || null;
          if (draggedSprite) {
            originalPos = { x: draggedSprite.x, y: draggedSprite.y };
            draggedSprite.setDepth(100); // Bring to front
          }
        }
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!startPos || !draggedSprite || !originalPos || this.isProcessing) return;

      const dx = pointer.x - startPos.x;
      const dy = pointer.y - startPos.y;

      // Determine axis lock if not already set
      if (dragAxis === 'none') {
        if (Math.abs(dx) > axisLockThreshold || Math.abs(dy) > axisLockThreshold) {
          dragAxis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
        }
      }

      // Apply axis constraint and clamp the drag distance
      let clampedDx = 0;
      let clampedDy = 0;

      if (dragAxis === 'horizontal' || dragAxis === 'none') {
        clampedDx = Math.max(-maxDragDistance, Math.min(maxDragDistance, dx));
      }
      if (dragAxis === 'vertical' || dragAxis === 'none') {
        clampedDy = Math.max(-maxDragDistance, Math.min(maxDragDistance, dy));
      }

      // If axis is locked, zero out the other axis
      if (dragAxis === 'horizontal') {
        clampedDy = 0;
      } else if (dragAxis === 'vertical') {
        clampedDx = 0;
      }

      // Move tile to follow finger (slightly)
      draggedSprite.setPosition(originalPos.x + clampedDx, originalPos.y + clampedDy);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Reset dragged sprite position immediately
      if (draggedSprite && originalPos) {
        draggedSprite.setPosition(originalPos.x, originalPos.y);
        draggedSprite.setDepth(0);
      }
      
      if (!startPos || !startCell || this.isProcessing) {
        startPos = null;
        startCell = null;
        draggedSprite = null;
        originalPos = null;
        return;
      }

      const dx = pointer.x - startPos.x;
      const dy = pointer.y - startPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 20) {
        // Just a tap - check if it's a powerup
        const tile = this.grid.getTile(startCell.row, startCell.col);
        if (tile) {
          this.onTileTap(tile);
        }
        startPos = null;
        startCell = null;
        draggedSprite = null;
        originalPos = null;
        return;
      }

      // Determine swipe direction
      const direction = this.getSwipeDirection(dx, dy);
      const targetCell = this.getAdjacentCell(startCell, direction);

      if (targetCell) {
        this.onSwipe(startCell, targetCell);
      }

      startPos = null;
      startCell = null;
      draggedSprite = null;
      originalPos = null;
      dragAxis = 'none';
    });
  }

  private getSwipeDirection(dx: number, dy: number): SwipeDirection {
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    }
    return dy > 0 ? 'down' : 'up';
  }

  private getAdjacentCell(cell: Position, direction: SwipeDirection): Position | null {
    const offsets: Record<SwipeDirection, { row: number; col: number }> = {
      up: { row: -1, col: 0 },
      down: { row: 1, col: 0 },
      left: { row: 0, col: -1 },
      right: { row: 0, col: 1 },
    };

    const offset = offsets[direction];
    const newPos = { row: cell.row + offset.row, col: cell.col + offset.col };

    if (this.grid.getCell(newPos.row, newPos.col)) {
      return newPos;
    }

    return null;
  }

  private async onSwipe(from: Position, to: Position): Promise<void> {
    if (!this.gameState.isPlaying()) return;

    this.isProcessing = true;

    const tile1 = this.grid.getTile(from.row, from.col);
    const tile2 = this.grid.getTile(to.row, to.col);

    // Swap tiles in grid
    this.grid.swapTiles(from, to);
    await this.animateSwap(from, to);

    // Check if either swapped tile is a powerup - activate it!
    const powerupsToActivate: Tile[] = [];
    const swapTargetColors: Map<string, string | undefined> = new Map();

    // If swapping a color bomb with a regular tile, the color bomb should target the swapped tile's color
    if (tile1?.isPowerup && tile1.powerupType === 'color_bomb') {
      powerupsToActivate.push(tile1);
      swapTargetColors.set(tile1.id, tile2?.type);
    }
    if (tile2?.isPowerup && tile2.powerupType === 'color_bomb') {
      powerupsToActivate.push(tile2);
      swapTargetColors.set(tile2.id, tile1?.type);
    }
    // Other powerups
    if (tile1?.isPowerup && tile1.powerupType !== 'color_bomb' && !powerupsToActivate.includes(tile1)) powerupsToActivate.push(tile1);
    if (tile2?.isPowerup && tile2.powerupType !== 'color_bomb' && !powerupsToActivate.includes(tile2)) powerupsToActivate.push(tile2);

    let validMove = false;

    if (powerupsToActivate.length > 0) {
      console.log('Activating powerups from swap:', powerupsToActivate.length);
      validMove = true;
      await this.activateAndClearPowerups(powerupsToActivate, swapTargetColors);
      await this.processMatches(); // Handle any cascades
    } else {
      // Check for matches
      const matches = this.matchDetector.findAllMatches(this.grid);

      if (matches.length > 0) {
        console.log('Matches found:', matches.length);
        validMove = true;
        await this.processMatches();
      } else {
        // No match, swap back
        console.log('No match, swapping back');
        this.grid.swapTiles(from, to);
        await this.animateSwap(from, to);
      }
    }

    // Only use a move if it was a valid move (not a swap-back)
    if (validMove) {
      this.gameState.useMove();

      // Check for lose condition after move
      if (!this.gameState.getObjectiveTracker().isAllComplete()) {
        this.gameState.checkLoseCondition();
      }
    }

    this.isProcessing = false;
  }

  private async onTileTap(tile: Tile): Promise<void> {
    if (this.isProcessing || !this.gameState.isPlaying()) return;

    if (tile.isPowerup) {
      this.isProcessing = true;
      console.log('Tapped powerup:', tile.powerupType);
      await this.activateAndClearPowerups([tile]);
      await this.processMatches();

      // Use a move for tapping a powerup
      this.gameState.useMove();

      // Check for lose condition after move
      if (!this.gameState.getObjectiveTracker().isAllComplete()) {
        this.gameState.checkLoseCondition();
      }

      this.isProcessing = false;
    }
  }

  private async activateAndClearPowerups(powerups: Tile[], swapTargetColors?: Map<string, string | undefined>): Promise<void> {
    const tilesToClear = new Set<Tile>();

    // Add the powerups themselves
    powerups.forEach(p => tilesToClear.add(p));

    // Track already-activated powerups for chain reactions
    const alreadyActivated = new Set<string>();

    // Activate each powerup and collect affected tiles
    for (const powerup of powerups) {
      const targetColor = swapTargetColors?.get(powerup.id);
      const affected = this.activatePowerup(powerup, targetColor, alreadyActivated);
      affected.forEach(t => tilesToClear.add(t));
    }

    // Clear grass obstacles under cleared tiles
    let grassCleared = 0;
    tilesToClear.forEach(tile => {
      const clearedObstacle = this.grid.clearObstacle(tile.row, tile.col);
      if (clearedObstacle?.type === 'grass') {
        grassCleared++;
        this.removeGrassSprite(tile.row, tile.col);
      }
    });

    // Update objective tracker for grass cleared
    if (grassCleared > 0) {
      this.gameState.getObjectiveTracker().onGrassCleared(grassCleared);
    }

    // Add score for cleared tiles
    this.gameState.addMatchScore(tilesToClear.size, true);

    // Animate and clear all affected tiles
    const promises: Promise<void>[] = [];
    tilesToClear.forEach(tile => {
      const sprite = this.tileSprites.get(tile.id);
      if (sprite) {
        promises.push(
          new Promise(resolve => {
            this.tweens.add({
              targets: sprite,
              alpha: 0,
              scale: 0,
              duration: CONFIG.TIMING.CLEAR_DURATION,
              ease: 'Back.easeIn',
              onComplete: () => {
                sprite.destroy();
                this.tileSprites.delete(tile.id);
                resolve();
              },
            });
          })
        );
      }
    });

    await Promise.all(promises);

    // Remove tiles from grid
    tilesToClear.forEach(tile => {
      const currentTile = this.grid.getTile(tile.row, tile.col);
      if (currentTile && currentTile.id === tile.id) {
        this.grid.setTile(tile.row, tile.col, null);
      }
    });

    // Apply gravity
    await this.applyGravity();
  }

  private async animateSwap(pos1: Position, pos2: Position): Promise<void> {
    // Get tiles at these positions AFTER the grid swap has happened
    const tile1 = this.grid.getTile(pos1.row, pos1.col);
    const tile2 = this.grid.getTile(pos2.row, pos2.col);

    if (!tile1 || !tile2) return;

    const sprite1 = this.tileSprites.get(tile1.id);
    const sprite2 = this.tileSprites.get(tile2.id);

    if (!sprite1 || !sprite2) return;

    // Animate both sprites to their tile's current positions
    const targetPos1 = this.cellToScreen(tile1.row, tile1.col);
    const targetPos2 = this.cellToScreen(tile2.row, tile2.col);

    return new Promise(resolve => {
      this.tweens.add({
        targets: sprite1,
        x: targetPos1.x,
        y: targetPos1.y,
        duration: CONFIG.TIMING.SWAP_DURATION,
        ease: 'Back.easeOut',
      });

      this.tweens.add({
        targets: sprite2,
        x: targetPos2.x,
        y: targetPos2.y,
        duration: CONFIG.TIMING.SWAP_DURATION,
        ease: 'Back.easeOut',
        onComplete: () => resolve(),
      });
    });
  }

  private async processMatches(): Promise<void> {
    let cascadeCount = 0;

    while (true) {
      const matches = this.matchDetector.findAllMatches(this.grid);

      if (matches.length === 0) break;

      cascadeCount++;
      console.log(`Cascade ${cascadeCount}: ${matches.length} matches`);

      // Increment cascade multiplier for scoring (after first match)
      if (cascadeCount > 1) {
        this.gameState.incrementCascade();
      }

      // Clear matches
      await this.clearMatches(matches);

      // Apply gravity
      await this.applyGravity();

      // Small delay between cascades
      await this.wait(CONFIG.TIMING.CASCADE_DELAY);
    }

    console.log(`Cascades complete: ${cascadeCount} total`);
  }

  private async clearMatches(matches: any[]): Promise<void> {
    const tilesToClear = new Set<Tile>();
    const powerupsToActivate: Tile[] = [];
    let powerupCreated = false;

    matches.forEach(match => {
      match.tiles.forEach((tile: Tile) => {
        tilesToClear.add(tile);
        // Check if any matched tile is a powerup that needs activation
        if (tile.isPowerup && tile.powerupType) {
          powerupsToActivate.push(tile);
        }
      });
      if (match.powerupType) {
        powerupCreated = true;
      }
    });

    // Activate powerups first and collect additional tiles to clear
    for (const powerup of powerupsToActivate) {
      const additionalTiles = this.activatePowerup(powerup);
      additionalTiles.forEach(t => tilesToClear.add(t));
    }

    // Clear grass obstacles under matched tiles and track for objectives
    let grassCleared = 0;
    tilesToClear.forEach(tile => {
      const clearedObstacle = this.grid.clearObstacle(tile.row, tile.col);
      if (clearedObstacle?.type === 'grass') {
        grassCleared++;
        this.removeGrassSprite(tile.row, tile.col);
      }
    });

    // Update objective tracker for grass cleared
    if (grassCleared > 0) {
      this.gameState.getObjectiveTracker().onGrassCleared(grassCleared);
    }

    // Add score for cleared tiles
    this.gameState.addMatchScore(tilesToClear.size, powerupCreated);

    // Animate clear
    const promises: Promise<void>[] = [];
    tilesToClear.forEach(tile => {
      const sprite = this.tileSprites.get(tile.id);
      if (sprite) {
        promises.push(
          new Promise(resolve => {
            this.tweens.add({
              targets: sprite,
              alpha: 0,
              scale: 0,
              duration: CONFIG.TIMING.CLEAR_DURATION,
              ease: 'Back.easeIn',
              onComplete: () => {
                sprite.destroy();
                this.tileSprites.delete(tile.id);
                resolve();
              },
            });
          })
        );
      }
    });

    await Promise.all(promises);

    // Remove tiles from grid and mark powerup positions
    for (const match of matches) {
      if (match.powerupType && match.powerupPosition) {
        // Only create powerup if the position wasn't already a powerup that was activated
        const existingTile = this.grid.getTile(match.powerupPosition.row, match.powerupPosition.col);
        if (!existingTile || !existingTile.isPowerup) {
          // Create powerup in grid
          const powerupTile: Tile = {
            id: `powerup_${Date.now()}_${Math.random()}`,
            type: match.tiles[0].type,
            row: match.powerupPosition.row,
            col: match.powerupPosition.col,
            isPowerup: true,
            powerupType: match.powerupType,
          };
          
          this.grid.setTile(match.powerupPosition.row, match.powerupPosition.col, powerupTile);
          console.log(`Created ${match.powerupType} at (${match.powerupPosition.row}, ${match.powerupPosition.col})`);
        }
      }
    }
    
    // Clear all matched and powerup-affected tiles from grid
    tilesToClear.forEach(tile => {
      const currentTile = this.grid.getTile(tile.row, tile.col);
      // Only clear if it's still the same tile (not replaced by a powerup)
      if (currentTile && currentTile.id === tile.id) {
        this.grid.setTile(tile.row, tile.col, null);
      }
    });
  }

  private activatePowerup(powerup: Tile, targetColor?: string, alreadyActivated: Set<string> = new Set()): Tile[] {
    return activatePowerupHelper(this.grid, powerup, targetColor, alreadyActivated);
  }

  private async applyGravity(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (let col = 0; col < this.grid.cols; col++) {
      let emptyRow = this.grid.rows - 1;

      // Move existing tiles down (including powerups that were just created)
      for (let row = this.grid.rows - 1; row >= 0; row--) {
        const tile = this.grid.getTile(row, col);
        if (tile) {
          if (row !== emptyRow) {
            const fromRow = row;
            this.grid.setTile(emptyRow, col, tile);
            this.grid.setTile(row, col, null);
            
            // If tile has no sprite (e.g., newly created powerup), create it
            if (!this.tileSprites.has(tile.id)) {
              this.createTileSprite(tile, fromRow);
            }
            
            promises.push(this.animateFallFromTo(tile, fromRow, emptyRow));
          } else {
            // Tile staying in place - ensure it has a sprite
            if (!this.tileSprites.has(tile.id)) {
              this.createTileSprite(tile);
            }
          }
          emptyRow--;
        }
      }

      // Spawn new tiles (they start above the grid and fall down)
      const spawnCount = emptyRow + 1;
      for (let i = 0; i < spawnCount; i++) {
        const targetRow = emptyRow - i;
        const startRow = -1 - i; // Start above the grid
        const newTile = this.grid.createRandomTile(targetRow, col);
        this.grid.setTile(targetRow, col, newTile);
        this.createTileSprite(newTile, startRow);
        promises.push(this.animateFallFromTo(newTile, startRow, targetRow));
      }
    }

    await Promise.all(promises);
  }

  private async animateFallFromTo(tile: Tile, fromRow: number, toRow: number): Promise<void> {
    const sprite = this.tileSprites.get(tile.id);
    if (!sprite) return;

    const targetPos = this.cellToScreen(toRow, tile.col);
    const distance = Math.abs(toRow - fromRow);
    const duration = CONFIG.TIMING.FALL_DURATION + (distance * 30);

    return new Promise(resolve => {
      this.tweens.add({
        targets: sprite,
        x: targetPos.x,
        y: targetPos.y,
        duration: duration,
        ease: 'Cubic.easeIn',
        onComplete: () => resolve(),
      });
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private setupTestingKeys(): void {
    // T - Run automated test
    this.input.keyboard?.on('keydown-T', () => {
      if (!this.autoTestRunning) {
        this.runAutoTest();
      }
    });

    // V - Validate grid
    this.input.keyboard?.on('keydown-V', () => {
      const result = this.gameTester.validateGrid();
      if (result.valid) {
        console.log('✅ Grid validation passed!');
      } else {
        console.error('❌ Grid validation failed:');
        result.errors.forEach((err: string) => console.error('  -', err));
      }
    });

    // P - Print grid state
    this.input.keyboard?.on('keydown-P', () => {
      this.gameTester.printGridState();
      const counts = this.gameTester.countTilesByType();
      console.log('Tile counts:', counts);
      const validMoves = this.gameTester.findValidMoves().length;
      console.log(`Valid moves available: ${validMoves}`);
    });

    // M - Make random valid move
    this.input.keyboard?.on('keydown-M', async () => {
      if (this.isProcessing) return;
      const move = this.gameTester.getRandomValidMove();
      if (move) {
        console.log(`Making move: (${move.from.row},${move.from.col}) → (${move.to.row},${move.to.col})`);
        await this.onSwipe(move.from, move.to);
      } else {
        console.log('No valid moves available!');
      }
    });
  }

  private async runAutoTest(): Promise<void> {
    if (this.isProcessing || this.autoTestRunning) return;

    this.autoTestRunning = true;
    console.log('🤖 Starting automated test...');

    try {
      for (let i = 0; i < 10; i++) {
        console.log(`\n--- Test Move ${i + 1}/10 ---`);

        // Validate grid before move
        const beforeValidation = this.gameTester.validateGrid();
        if (!beforeValidation.valid) {
          console.error('❌ Grid invalid before move:', beforeValidation.errors);
          break;
        }

        // Find and make a random valid move
        const move = this.gameTester.getRandomValidMove();
        if (!move) {
          console.log('⚠️ No valid moves available, ending test');
          break;
        }

        console.log(`Making move: (${move.from.row},${move.from.col}) → (${move.to.row},${move.to.col})`);
        await this.onSwipe(move.from, move.to);

        // Validate grid after move
        const afterValidation = this.gameTester.validateGrid();
        if (!afterValidation.valid) {
          console.error('❌ Grid invalid after move:', afterValidation.errors);
          this.gameTester.printGridState();
          break;
        }

        console.log('✅ Move completed successfully');
        
        // Small delay between moves
        await this.wait(500);
      }

      console.log('\n✅ Automated test completed!');
      console.log('Final grid state:');
      this.gameTester.printGridState();
      
    } catch (error) {
      console.error('❌ Test failed with error:', error);
    } finally {
      this.autoTestRunning = false;
    }
  }
}
