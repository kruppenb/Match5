import Phaser from 'phaser';
import { Grid } from '../game/Grid';
import { MatchDetector } from '../game/MatchDetector';
import { GameTester } from '../game/GameTester';
import { Level } from '../game/Level';
import { GameState } from '../game/GameState';
import { BoosterManager } from '../game/BoosterManager';
import { GravitySystem } from '../game/GravitySystem';
import { SpecialObstacleProcessor } from '../game/SpecialObstacleProcessor';
import { activatePowerup as activatePowerupHelper, canCombinePowerups, combinePowerups, getPropellerTargets, setPropellerTarget, getPowerupAffectedPositions, getCombinationAffectedPositions } from '../game/powerupUtils';
import { ProgressStorage } from '../storage/ProgressStorage';
import { MetaStorage } from '../storage/MetaStorage';
import { getCurrencyManager } from '../meta/CurrencyManager';
import { getProgressionEventManager } from '../meta/ProgressionEventManager';
import { LevelResult } from '../types';
import { CONFIG } from '../config';
import { Tile, Position, SwipeDirection, Cell, BoosterType, Obstacle } from '../types';
import { MoveCounter, ObjectiveDisplay, EndScreen, BoosterBar } from './UIComponents';
import { PowerupAnimations } from './PowerupAnimations';
import { ScreenShake } from '../utils/ScreenShake';
import { ParticleManager } from '../utils/ParticleManager';
import { ComboDisplay } from '../utils/ComboDisplay';
import { ScorePopup } from '../utils/ScorePopup';
import { getAudioManager, AudioManager } from '../utils/AudioManager';
import { getHapticFeedback, HapticFeedback } from '../utils/HapticFeedback';
import { TileRenderer } from '../rendering/TileRenderer';
import { ObstacleRenderer } from '../rendering/ObstacleRenderer';
import { CelebrationManager } from './CelebrationManager';
import { HeroPowerSystem } from '../game/HeroPowerSystem';

export interface GameSceneData {
  levelId?: number;
  heroChargePercent?: number;
  isReplay?: boolean;
  selectedBoosters?: string[];
}

export class GameScene extends Phaser.Scene {
  private grid!: Grid;
  private matchDetector!: MatchDetector;
  private gameTester!: GameTester;
  private level!: Level;
  private gameState!: GameState;
  private tileSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private obstacleSprites: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private gridOffsetX = 0;
  private gridOffsetY = 0;
  private tileSize = CONFIG.GRID.TILE_SIZE; // Dynamic tile size
  private isProcessing = false;
  private autoTestRunning = false;

  // Track which sprites are loaded
  private loadedGemSprites: Set<string> = new Set();
  private loadedPowerupSprites: Set<string> = new Set();

  // UI Components
  private moveCounter!: MoveCounter;
  private objectiveDisplay!: ObjectiveDisplay;
  private endScreen!: EndScreen;
  private boosterBar!: BoosterBar;

  // Booster system
  private boosterManager!: BoosterManager;

  // Animation system
  private powerupAnimations!: PowerupAnimations;

  // Polish/juice systems
  private screenShake!: ScreenShake;
  private particleManager!: ParticleManager;
  private comboDisplay!: ComboDisplay;
  private scorePopup!: ScorePopup;
  private audioManager!: AudioManager;
  private hapticFeedback!: HapticFeedback;

  // Celebration system
  private celebrationManager!: CelebrationManager;

  // Rendering
  private obstacleRenderer!: ObstacleRenderer;

  // Physics
  private gravitySystem!: GravitySystem;

  // Special obstacles
  private specialObstacleProcessor!: SpecialObstacleProcessor;

  // Hero power system
  private heroPowerSystem!: HeroPowerSystem;
  private initialHeroCharge: number = 0;

  // Replay mode
  private isReplay: boolean = false;
  private _selectedBoosters: string[] = []; // Prefixed with _ as currently unused but reserved for future

  constructor() {
    super('GameScene');
  }

  preload(): void {
    // Load gem sprites
    const gemSprites = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
    gemSprites.forEach(gem => {
      const path = `assets/sprites/gems/${gem}.png`;
      this.load.image(`gem_${gem}`, path);
      this.loadedGemSprites.add(gem);
    });

    // Load powerup sprites
    const powerupSprites = ['rocket_h', 'rocket_v', 'bomb', 'color_bomb', 'propeller'];
    powerupSprites.forEach(powerup => {
      const path = `assets/sprites/powerups/${powerup}.png`;
      this.load.image(`powerup_${powerup}`, path);
      this.loadedPowerupSprites.add(powerup);
    });

    // Load background images
    const backgrounds = ['garden', 'castle', 'kitchen', 'library', 'sky_tower'];
    backgrounds.forEach(bg => {
      this.load.image(`bg_${bg}`, `assets/backgrounds/${bg}.jpeg`);
    });

    // Load booster sprites
    this.load.image('booster_hammer', 'assets/sprites/boosters/hammer.png');
    this.load.image('booster_row_arrow', 'assets/sprites/boosters/arrow_h.png');
    this.load.image('booster_col_arrow', 'assets/sprites/boosters/beam_v.png');
    this.load.image('booster_shuffle', 'assets/sprites/boosters/lucky67.png');

    // Load hero sprites
    this.load.image('hero_thor', 'assets/sprites/characters/thor.png');
    this.load.image('hero_ironman', 'assets/sprites/characters/ironman.jpeg');
    this.load.image('hero_elsa', 'assets/sprites/characters/elsa.jpeg');
  }

  create(data?: GameSceneData): void {
    const levelId = data?.levelId ?? 1;
    this.initialHeroCharge = data?.heroChargePercent ?? 0;
    this.isReplay = data?.isReplay ?? false;
    this._selectedBoosters = data?.selectedBoosters ?? [];
    console.log(`Game Scene Created - Level ${levelId}, Hero Charge: ${this.initialHeroCharge}%, Replay: ${this.isReplay}, Boosters: ${this._selectedBoosters.join(', ')}`);

    // Load level
    this.level = Level.load(levelId);

    // Initialize grid with level layout
    this.grid = new Grid(this.level.rows, this.level.cols);
    this.grid.initializeFromLayout(this.level.layout, this.level.tileVariety);

    // Initialize game systems
    this.matchDetector = new MatchDetector();
    this.gameTester = new GameTester(this.grid, this.matchDetector);
    this.gameState = new GameState(this.level);
    this.boosterManager = new BoosterManager();

    // Calculate dynamic tile size to fit grid on screen
    const availableWidth = CONFIG.SCREEN.WIDTH - CONFIG.UI.PADDING * 2;
    const availableHeight = CONFIG.SCREEN.HEIGHT - CONFIG.UI.HEADER_HEIGHT - CONFIG.UI.OBJECTIVE_BAR_HEIGHT - CONFIG.UI.PADDING * 2;

    const maxTileWidth = availableWidth / this.level.cols;
    const maxTileHeight = availableHeight / this.level.rows;
    // Use the smaller of width/height constraints - no arbitrary cap
    this.tileSize = Math.floor(Math.min(maxTileWidth, maxTileHeight));

    // Calculate grid offset for centering
    const totalGridWidth = this.level.cols * this.tileSize;
    const totalGridHeight = this.level.rows * this.tileSize;
    this.gridOffsetX = (CONFIG.SCREEN.WIDTH - totalGridWidth) / 2;
    this.gridOffsetY = CONFIG.UI.HEADER_HEIGHT + CONFIG.UI.OBJECTIVE_BAR_HEIGHT + (availableHeight - totalGridHeight) / 2 + CONFIG.UI.PADDING;

    // Ensure no initial matches
    this.removeInitialMatches();

    // Initialize animation system
    this.powerupAnimations = new PowerupAnimations(this, this.gridOffsetX, this.gridOffsetY, this.tileSize);

    // Initialize obstacle renderer
    this.obstacleRenderer = new ObstacleRenderer(this, this.tileSize);

    // Initialize gravity system
    this.gravitySystem = new GravitySystem(this, this.grid, {
      cellToScreen: (row, col) => this.cellToScreen(row, col),
      createTileSprite: (tile, startRow) => this.createTileSprite(tile, startRow),
      getTileSprite: (tileId) => this.tileSprites.get(tileId),
    });

    // Initialize special obstacle processor
    this.specialObstacleProcessor = new SpecialObstacleProcessor(
      this,
      this.grid,
      this.gameState,
      this.tileSize,
      {
        cellToScreen: (row, col) => this.cellToScreen(row, col),
        removeObstacleSprite: (row, col) => this.removeObstacleSprite(row, col),
        updateObstacleSprite: (row, col) => this.updateObstacleSprite(row, col),
        createObstacleSprite: (cell) => this.createObstacleSprite(cell),
        getTileSprite: (tileId) => this.tileSprites.get(tileId),
        deleteTileSprite: (tileId) => this.tileSprites.delete(tileId),
        killTweensOf: (target) => this.tweens.killTweensOf(target),
      }
    );

    // Initialize polish/juice systems
    this.screenShake = new ScreenShake(this);
    this.particleManager = new ParticleManager(this);
    this.comboDisplay = new ComboDisplay(this);
    this.scorePopup = new ScorePopup(this);
    this.audioManager = getAudioManager();
    this.hapticFeedback = getHapticFeedback();

    // Initialize celebration manager
    this.celebrationManager = new CelebrationManager(
      this,
      this.grid,
      this.particleManager,
      this.screenShake,
      this.audioManager,
      this.hapticFeedback,
      {
        onComplete: (score, stars, bonus) => this.showWinEndScreen(score, stars, bonus),
        cellToScreen: (row, col) => this.cellToScreen(row, col),
        getTileSprite: (tileId) => this.tileSprites.get(tileId),
        deleteTileSprite: (tileId) => this.tileSprites.delete(tileId),
      }
    );

    // Setup game state listeners
    this.setupGameStateListeners();

    // Render background
    this.renderBackground();

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

  private getBackgroundForLevel(levelId: number): string {
    // Garden: 1-10, Castle: 11-20, Kitchen: 21-30, Library: 31-40, Sky Tower: 41+
    if (levelId <= 10) return 'bg_garden';
    if (levelId <= 20) return 'bg_castle';
    if (levelId <= 30) return 'bg_kitchen';
    if (levelId <= 40) return 'bg_library';
    return 'bg_sky_tower';
  }

  private renderBackground(): void {
    const width = CONFIG.SCREEN.WIDTH;
    const height = CONFIG.SCREEN.HEIGHT;

    // Select background based on level
    const bgKey = this.getBackgroundForLevel(this.level.id);

    // Try to use background image if loaded
    if (this.textures.exists(bgKey)) {
      const bg = this.add.image(width / 2, height / 2, bgKey);
      bg.setDepth(-10);

      // Scale to cover the screen (maintaining aspect ratio, cropping if needed)
      const scaleX = width / bg.width;
      const scaleY = height / bg.height;
      const scale = Math.max(scaleX, scaleY); // Cover (not contain)
      bg.setScale(scale);
    } else {
      // Fallback to gradient if image not loaded
      const bg = this.add.graphics();
      bg.setDepth(-10);

      const steps = 64;
      const stepHeight = Math.ceil(height / steps) + 1;

      const topColor = { r: 20, g: 40, b: 60 };
      const midColor = { r: 30, g: 60, b: 50 };
      const bottomColor = { r: 40, g: 80, b: 60 };

      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        let r, g, b;

        if (t < 0.5) {
          const localT = t * 2;
          r = Math.round(topColor.r + (midColor.r - topColor.r) * localT);
          g = Math.round(topColor.g + (midColor.g - topColor.g) * localT);
          b = Math.round(topColor.b + (midColor.b - topColor.b) * localT);
        } else {
          const localT = (t - 0.5) * 2;
          r = Math.round(midColor.r + (bottomColor.r - midColor.r) * localT);
          g = Math.round(midColor.g + (bottomColor.g - midColor.g) * localT);
          b = Math.round(midColor.b + (bottomColor.b - midColor.b) * localT);
        }

        const color = (r << 16) | (g << 8) | b;
        bg.fillStyle(color, 1);
        const y = Math.floor((i / steps) * height) - 1;
        bg.fillRect(-1, y, width + 2, stepHeight);
      }
    }
  }

  private renderUI(): void {
    // No header background - UI elements sit directly on gradient

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
    menuBtn.on('pointerdown', () => {
      this.audioManager.playClick();
      this.goToMenu();
    });
    menuBtn.on('pointerover', () => menuBtn.setAlpha(0.8));
    menuBtn.on('pointerout', () => menuBtn.setAlpha(1));

    // Objective display (no background - sits directly on gradient)
    this.objectiveDisplay = new ObjectiveDisplay(
      this,
      CONFIG.SCREEN.WIDTH / 2,
      CONFIG.UI.HEADER_HEIGHT + CONFIG.UI.OBJECTIVE_BAR_HEIGHT / 2,
      this.gameState.getObjectives()
    );

    // Booster bar (at bottom of screen)
    this.boosterBar = new BoosterBar(
      this,
      CONFIG.SCREEN.WIDTH / 2,
      CONFIG.SCREEN.HEIGHT - 40,
      this.boosterManager.getInventory(),
      (type) => this.onBoosterSelect(type),
      () => this.onBoosterCancel()
    );

    // End screen (hidden initially)
    this.endScreen = new EndScreen(this);

    // Hero power system (top of screen)
    this.initHeroPowerSystem();
  }

  private initHeroPowerSystem(): void {
    this.heroPowerSystem = new HeroPowerSystem(
      this,
      this.grid,
      {
        cellToScreen: (row, col) => this.cellToScreen(row, col),
        getTileSprite: (tileId) => this.tileSprites.get(tileId),
        clearTiles: (tiles) => this.clearHeroPowerTiles(tiles),
        applyGravity: () => this.applyGravity(),
        processMatches: () => this.processMatches(),
        playSound: (type) => {
          if (type === 'match') this.audioManager.playMatch();
          else if (type === 'powerup') this.audioManager.playPowerupCreate();
          else if (type === 'combo') this.audioManager.playCascade(2);
        },
        shake: (intensity) => {
          if (intensity === 'light') this.screenShake.light();
          else if (intensity === 'medium') this.screenShake.medium();
          else this.screenShake.heavy();
        },
        haptic: (type) => this.hapticFeedback.forPowerup(type as any),
        emitParticles: (x, y, color, count) => this.particleManager.emitMatchParticles(x, y, color, count),
      },
      this.initialHeroCharge
    );
  }

  private addHeroCharge(matchSize: number, cascadeLevel: number = 0, powerupActivated: boolean = false): void {
    if (this.heroPowerSystem) {
      this.heroPowerSystem.addCharge(matchSize, cascadeLevel, powerupActivated);
    }
  }

  private isInputBlocked(): boolean {
    return this.isProcessing ||
           (this.heroPowerSystem && (this.heroPowerSystem.isActivating() || this.heroPowerSystem.isSelectionOpen()));
  }

  private async clearHeroPowerTiles(tiles: Tile[]): Promise<void> {
    const clearPromises = tiles.map(tile => {
      return new Promise<void>(resolve => {
        const sprite = this.tileSprites.get(tile.id);
        if (sprite) {
          // Sparkle effect
          const pos = this.cellToScreen(tile.row, tile.col);
          this.particleManager.emitMatchParticles(pos.x, pos.y, CONFIG.COLORS[tile.type as keyof typeof CONFIG.COLORS] || 0xffffff, 8);

          this.tweens.add({
            targets: sprite,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: 200,
            ease: 'Back.easeIn',
            onComplete: () => {
              sprite.destroy();
              this.tileSprites.delete(tile.id);
              resolve();
            },
          });
        } else {
          resolve();
        }

        // Clear from grid
        this.grid.clearTileAt(tile.row, tile.col);

        // Update score
        this.gameState.addScore(CONFIG.SCORE.MATCH_BASE);
      });
    });

    await Promise.all(clearPromises);
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
    const remainingMoves = this.gameState.getMovesRemaining();
    const bonus = remainingMoves * CONFIG.LEVEL.BONUS_POINTS_PER_MOVE;

    // Disable boosters
    this.boosterBar.setEnabled(false);
    this.boosterBar.cancelActiveBooster();
    this.boosterManager.cancelBooster();

    // Check if this is a first-time completion
    const isFirstTime = !ProgressStorage.isLevelCompleted(this.level.id);

    // Save progress (stars already calculated, don't let celebration affect it)
    ProgressStorage.completeLevel(this.level.id, stars);

    // Award currency rewards
    const levelResult: LevelResult = {
      levelId: this.level.id,
      stars,
      score,
      powerupsUsed: 0, // TODO: Track this in gameState
      maxCombo: 0, // TODO: Track max cascade in GameState
      isFirstTime,
    };

    const currencyManager = getCurrencyManager();
    const rewards = currencyManager.awardLevelRewards(levelResult);

    // Award event points
    const eventManager = getProgressionEventManager();
    eventManager.onLevelComplete(levelResult);

    // Award replay bonus if in replay mode
    let replayBonus = 0;
    if (this.isReplay && MetaStorage.incrementDailyReplay()) {
      replayBonus = 50; // REPLAY_BONUS_DIAMONDS
      currencyManager.addDiamonds(replayBonus, 'replay_bonus');
      console.log(`Awarded ${replayBonus} diamonds for replay bonus!`);
    }

    // Play win effects
    this.audioManager.playWin();
    this.hapticFeedback.success();

    // Start the victory celebration sequence
    this.celebrationManager.playCelebration(remainingMoves, score, stars, bonus);

    // Show coin reward popup
    if (rewards.coins > 0 || replayBonus > 0) {
      this.time.delayedCall(1000, () => {
        this.showCurrencyReward(rewards.coins, rewards.diamonds + replayBonus);
      });
    }
  }

  private showCurrencyReward(coins: number, diamonds: number): void {
    const { width, height } = this.scale;
    const y = height / 2 - 100;

    // Coin reward
    const coinText = this.add.text(width / 2, y, `+${coins} coins!`, {
      fontSize: '28px',
      fontFamily: 'Arial Black',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(1000);

    this.tweens.add({
      targets: coinText,
      y: y - 40,
      alpha: { from: 1, to: 0 },
      duration: 2000,
      delay: 1500,
      onComplete: () => coinText.destroy(),
    });

    // Diamond reward (if any)
    if (diamonds > 0) {
      const diamondText = this.add.text(width / 2, y + 40, `+${diamonds} diamonds!`, {
        fontSize: '24px',
        fontFamily: 'Arial Black',
        color: '#00bfff',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(1000);

      this.tweens.add({
        targets: diamondText,
        y: y,
        alpha: { from: 1, to: 0 },
        duration: 2000,
        delay: 1500,
        onComplete: () => diamondText.destroy(),
      });
    }
  }

  private showWinEndScreen(score: number, stars: number, bonus: number): void {
    this.endScreen.showWin(score, stars, bonus, {
      onRetry: () => this.restartLevel(),
      onNext: () => this.nextLevel(),
      onMenu: () => this.goToMenu(),
    });
  }

  private showLoseScreen(): void {
    // Disable boosters
    this.boosterBar.setEnabled(false);
    this.boosterBar.cancelActiveBooster();
    this.boosterManager.cancelBooster();

    // Play lose sound
    this.audioManager.playLose();
    this.hapticFeedback.error();

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
    this.scene.start('TitleScene');
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
    this.obstacleSprites.forEach(sprite => sprite.destroy());
    this.obstacleSprites.clear();

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

      // Draw obstacles if present
      if (cell.obstacle) {
        this.createObstacleSprite(cell);
      }
    });

    // Draw tiles
    this.grid.forEachCell(cell => {
      if (cell.tile) {
        this.createTileSprite(cell.tile);
      }
    });
  }

  private createObstacleSprite(cell: Cell): void {
    if (!cell.obstacle) return;

    const pos = this.cellToScreen(cell.row, cell.col);
    const key = `obstacle_${cell.row}_${cell.col}`;

    const { graphics, layerText } = this.obstacleRenderer.createObstacleGraphics(cell.obstacle, pos);

    // Store layer text reference for cleanup
    if (layerText) {
      (graphics as any).layerText = layerText;
    }

    this.obstacleSprites.set(key, graphics);
  }

  private removeObstacleSprite(row: number, col: number): void {
    const key = `obstacle_${row}_${col}`;
    const sprite = this.obstacleSprites.get(key);
    if (sprite) {
      // Remove from map IMMEDIATELY to prevent race conditions
      this.obstacleSprites.delete(key);

      // Destroy any associated text
      const layerText = (sprite as any).layerText;
      if (layerText) layerText.destroy();

      // Animate obstacle clearing
      this.tweens.add({
        targets: sprite,
        alpha: 0,
        duration: CONFIG.TIMING.CLEAR_DURATION,
        onComplete: () => {
          sprite.destroy();
        },
      });
    }
  }

  private updateObstacleSprite(row: number, col: number): void {
    const cell = this.grid.getCell(row, col);
    // Remove old sprite
    this.removeObstacleSprite(row, col);
    // Create new sprite if obstacle still exists
    if (cell?.obstacle) {
      this.createObstacleSprite(cell);
    }
  }

  private createTileSprite(tile: Tile, startRow?: number): void {
    const startPos = startRow !== undefined ? this.cellToScreen(startRow, tile.col) : this.cellToScreen(tile.row, tile.col);

    // Create a container to hold graphics or sprite
    const container = this.add.container(startPos.x, startPos.y);

    const color = CONFIG.COLORS[tile.type as keyof typeof CONFIG.COLORS] || 0x888888;
    const size = this.tileSize - CONFIG.GRID.GAP * 4;
    const halfSize = size / 2;

    // Check if we should use sprites
    const useGemSprite = !tile.isPowerup && this.loadedGemSprites.has(tile.type) && this.textures.exists(`gem_${tile.type}`);
    const usePowerupSprite = tile.isPowerup && tile.powerupType && this.loadedPowerupSprites.has(tile.powerupType) && this.textures.exists(`powerup_${tile.powerupType}`);

    if (useGemSprite) {
      // Use pre-rendered gem sprite
      const sprite = this.add.sprite(0, 0, `gem_${tile.type}`);
      const spriteSize = Math.max(sprite.width, sprite.height);
      const scale = size / spriteSize;
      sprite.setScale(scale);
      container.add(sprite);
    } else if (usePowerupSprite) {
      // Use pre-rendered powerup sprite
      const sprite = this.add.sprite(0, 0, `powerup_${tile.powerupType}`);
      const spriteSize = Math.max(sprite.width, sprite.height);
      const scale = size / spriteSize;
      sprite.setScale(scale);
      container.add(sprite);
    } else {
      // Fallback to graphics-based rendering
      const graphics = this.add.graphics();

      if (tile.isPowerup && tile.powerupType) {
        TileRenderer.drawPowerupShape(graphics, tile.powerupType, color, halfSize);
      } else {
        TileRenderer.drawTileShape(graphics, tile.type, color, halfSize);
      }

      container.add(graphics);
    }

    // Set interactive on the container
    container.setSize(this.tileSize, this.tileSize);
    container.setInteractive();

    container.setData('tile', tile);
    this.tileSprites.set(tile.id, container);
  }

  // Tile drawing methods moved to TileRenderer.ts

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
      // Initialize audio on first interaction (required for browser autoplay policy)
      this.audioManager.init();

      if (this.isInputBlocked()) return;

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
      if (!startPos || !draggedSprite || !originalPos || this.isInputBlocked()) return;

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
      
      if (!startPos || !startCell || this.isInputBlocked()) {
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
        // Just a tap - check if booster is active or if it's a powerup
        const tile = this.grid.getTile(startCell.row, startCell.col);
        const cell = this.grid.getCell(startCell.row, startCell.col);

        // If a booster is active and requires a target, handle the cell tap
        const activeBooster = this.boosterManager.getActiveBooster();
        if (activeBooster && this.boosterManager.requiresTarget(activeBooster)) {
          // Row/column arrows work on any cell in the row/column
          // Hammer can target tiles OR obstacles (ice, boxes, etc.)
          const hasTarget = tile || cell?.obstacle;
          if (activeBooster === 'hammer' && !hasTarget) {
            // No tile or obstacle to hammer, cancel the booster
            this.boosterBar.cancelActiveBooster();
          } else if (hasTarget || activeBooster === 'row_arrow' || activeBooster === 'col_arrow') {
            this.executeBooster(activeBooster, startCell);
          }
          startPos = null;
          startCell = null;
          draggedSprite = null;
          originalPos = null;
          return;
        }

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

    // Check if swap is allowed (chains block movement)
    if (!this.grid.canSwap(from, to)) {
      console.log('Swap blocked - tile cannot move (chained?)');
      // Visual and audio feedback for blocked swap
      this.audioManager.playInvalid();
      this.hapticFeedback.error();
      const tile1 = this.grid.getTile(from.row, from.col);
      const tile2 = this.grid.getTile(to.row, to.col);
      const sprite1 = tile1 ? this.tileSprites.get(tile1.id) : null;
      const sprite2 = tile2 ? this.tileSprites.get(tile2.id) : null;
      if (sprite1) this.tweens.add({ targets: sprite1, x: sprite1.x + 5, duration: 50, yoyo: true, repeat: 2 });
      if (sprite2) this.tweens.add({ targets: sprite2, x: sprite2.x + 5, duration: 50, yoyo: true, repeat: 2 });
      return;
    }

    this.isProcessing = true;

    const tile1 = this.grid.getTile(from.row, from.col);
    const tile2 = this.grid.getTile(to.row, to.col);

    // Swap tiles in grid
    this.grid.swapTiles(from, to);
    await this.animateSwap(from, to);

    let validMove = false;

    // Check if we're combining two powerups
    if (tile1?.isPowerup && tile2?.isPowerup && canCombinePowerups(tile1, tile2)) {
      console.log(`Combining powerups: ${tile1.powerupType} + ${tile2.powerupType}`);
      validMove = true;
      await this.activatePowerupCombination(tile1, tile2);
      await this.processMatches(); // Handle any cascades
    } else if (tile1?.isPowerup || tile2?.isPowerup) {
      // Single powerup activation
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

      if (powerupsToActivate.length > 0) {
        console.log('Activating powerups from swap:', powerupsToActivate.length);
        validMove = true;
        await this.activateAndClearPowerups(powerupsToActivate, swapTargetColors);
        await this.processMatches(); // Handle any cascades
      }
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

    // Check if a booster is active and needs a target
    const activeBooster = this.boosterManager.getActiveBooster();
    if (activeBooster && this.boosterManager.requiresTarget(activeBooster)) {
      await this.executeBooster(activeBooster, { row: tile.row, col: tile.col });
      return;
    }

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

  private onBoosterSelect(type: BoosterType): void {
    if (this.isProcessing || !this.gameState.isPlaying()) {
      this.boosterBar.cancelActiveBooster();
      return;
    }

    this.boosterManager.setActiveBooster(type);
    console.log('Booster selected:', type);

    // If booster doesn't require a target, execute immediately
    if (!this.boosterManager.requiresTarget(type)) {
      this.executeBooster(type);
    }
  }

  private onBoosterCancel(): void {
    this.boosterManager.cancelBooster();
    console.log('Booster cancelled');
  }

  private async executeBooster(type: BoosterType, target?: Position): Promise<void> {
    if (this.isProcessing || !this.gameState.isPlaying()) return;

    // Check if booster is available
    if (!this.boosterManager.hasBooster(type)) {
      this.boosterBar.cancelActiveBooster();
      this.boosterManager.cancelBooster();
      return;
    }

    this.isProcessing = true;

    // Use the booster
    this.boosterManager.useBooster(type);
    this.boosterBar.updateInventory(this.boosterManager.getInventory());
    this.boosterBar.cancelActiveBooster();
    this.boosterManager.cancelBooster();

    // Play sound and haptic
    this.audioManager.playPowerupCreate();
    this.hapticFeedback.heavy();

    switch (type) {
      case 'hammer':
        if (target) await this.executeHammerBooster(target);
        break;
      case 'row_arrow':
        if (target) await this.executeRowArrowBooster(target);
        break;
      case 'col_arrow':
        if (target) await this.executeColArrowBooster(target);
        break;
      case 'shuffle':
        await this.executeShuffleBooster();
        break;
    }

    // Process any resulting matches
    await this.processMatches();

    this.isProcessing = false;
  }

  private async executeHammerBooster(target: Position): Promise<void> {
    const cell = this.grid.getCell(target.row, target.col);
    if (!cell) return;

    const tile = cell.tile;
    const obstacle = cell.obstacle;

    // Must have either a tile or an obstacle to target
    if (!tile && !obstacle) return;

    // Play animation
    const pos = this.cellToScreen(target.row, target.col);
    this.screenShake.shake(3, 100);

    // Emit particles based on what we're smashing
    if (tile) {
      this.particleManager.emitMatchParticles(pos.x, pos.y, CONFIG.COLORS[tile.type as keyof typeof CONFIG.COLORS] || 0xffffff, 12);
    } else {
      // Obstacle-only cell (ice, box, etc.) - use white/blue particles
      this.particleManager.emitMatchParticles(pos.x, pos.y, 0x88ccff, 12);
    }

    // Damage obstacle (1 layer)
    if (obstacle) {
      const clearedObstacle = this.grid.clearObstacle(target.row, target.col);
      if (clearedObstacle) {
        // Fully destroyed
        this.removeObstacleSprite(target.row, target.col);
        this.updateObstacleObjectives({ [clearedObstacle.type]: 1 });
      } else if (cell.obstacle) {
        // Just damaged, update sprite to show reduced layers
        this.updateObstacleSprite(target.row, target.col);
      }
    }

    // Clear the tile if present
    if (tile) {
      await this.clearSingleTile(tile);
    }

    // Apply gravity
    await this.applyGravity();
  }

  private async executeRowArrowBooster(target: Position): Promise<void> {
    const tilesToClear: Tile[] = [];
    const positions: Position[] = [];

    for (let col = 0; col < this.grid.cols; col++) {
      positions.push({ row: target.row, col });
      const tile = this.grid.getTile(target.row, col);
      if (tile) tilesToClear.push(tile);
    }

    // Play row clear animation
    this.screenShake.shake(5, 150);

    // Emit particles along the row
    for (const pos of positions) {
      const screenPos = this.cellToScreen(pos.row, pos.col);
      const cell = this.grid.getCell(pos.row, pos.col);
      const tile = cell?.tile;
      if (tile) {
        this.particleManager.emitMatchParticles(screenPos.x, screenPos.y, CONFIG.COLORS[tile.type as keyof typeof CONFIG.COLORS] || 0xffffff, 6);
      } else if (cell?.obstacle) {
        // Obstacle-only cell - emit ice-blue particles
        this.particleManager.emitMatchParticles(screenPos.x, screenPos.y, 0x88ccff, 6);
      }
    }

    // Clear obstacles and tiles
    await this.clearBoosterTargets(positions, tilesToClear);

    // Apply gravity
    await this.applyGravity();
  }

  private async executeColArrowBooster(target: Position): Promise<void> {
    const tilesToClear: Tile[] = [];
    const positions: Position[] = [];

    for (let row = 0; row < this.grid.rows; row++) {
      positions.push({ row, col: target.col });
      const tile = this.grid.getTile(row, target.col);
      if (tile) tilesToClear.push(tile);
    }

    // Play column clear animation
    this.screenShake.shake(5, 150);

    // Emit particles along the column
    for (const pos of positions) {
      const screenPos = this.cellToScreen(pos.row, pos.col);
      const cell = this.grid.getCell(pos.row, pos.col);
      const tile = cell?.tile;
      if (tile) {
        this.particleManager.emitMatchParticles(screenPos.x, screenPos.y, CONFIG.COLORS[tile.type as keyof typeof CONFIG.COLORS] || 0xffffff, 6);
      } else if (cell?.obstacle) {
        // Obstacle-only cell - emit ice-blue particles
        this.particleManager.emitMatchParticles(screenPos.x, screenPos.y, 0x88ccff, 6);
      }
    }

    // Clear obstacles and tiles
    await this.clearBoosterTargets(positions, tilesToClear);

    // Apply gravity
    await this.applyGravity();
  }

  private async executeShuffleBooster(): Promise<void> {
    // Collect all tiles and their positions
    const tileData: { tile: Tile; row: number; col: number }[] = [];
    this.grid.forEachCell((cell) => {
      if (cell.tile && !cell.blocked) {
        tileData.push({ tile: cell.tile, row: cell.row, col: cell.col });
      }
    });

    if (tileData.length < 2) return;

    // Create 67 overlay animation
    const overlay = this.create67Overlay();

    // Store original positions for animation
    const originalPositions = new Map<string, { x: number; y: number }>();
    tileData.forEach(({ tile }) => {
      const sprite = this.tileSprites.get(tile.id);
      if (sprite) {
        originalPositions.set(tile.id, { x: sprite.x, y: sprite.y });
      }
    });

    // Phase 1: Animate tiles flying to center chaos
    const centerX = CONFIG.SCREEN.WIDTH / 2;
    const centerY = CONFIG.SCREEN.HEIGHT / 2;
    const flyToCenter: Promise<void>[] = [];

    tileData.forEach(({ tile }, index) => {
      const sprite = this.tileSprites.get(tile.id);
      if (sprite) {
        const angle = (index / tileData.length) * Math.PI * 2;
        const radius = 50 + Math.random() * 30;
        const targetX = centerX + Math.cos(angle) * radius;
        const targetY = centerY + Math.sin(angle) * radius;

        flyToCenter.push(
          new Promise(resolve => {
            this.tweens.add({
              targets: sprite,
              x: targetX,
              y: targetY,
              scale: 0.6,
              angle: Math.random() * 360,
              duration: 300,
              ease: 'Cubic.easeIn',
              onComplete: () => resolve(),
            });
          })
        );
      }
    });

    await Promise.all(flyToCenter);

    // Phase 2: Spin around center while shuffling
    const spinDuration = 500;
    const spinPromises: Promise<void>[] = [];

    tileData.forEach(({ tile }) => {
      const sprite = this.tileSprites.get(tile.id);
      if (sprite) {
        spinPromises.push(
          new Promise(resolve => {
            this.tweens.add({
              targets: sprite,
              angle: sprite.angle + 720,
              duration: spinDuration,
              ease: 'Linear',
              onComplete: () => resolve(),
            });
          })
        );
      }
    });

    // Wait for spin
    await Promise.all(spinPromises);

    // Shuffle tile positions (not types - we swap actual grid positions)
    const shuffledPositions = [...tileData];
    for (let i = shuffledPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      // Swap the row/col assignments
      const tempRow = shuffledPositions[i].row;
      const tempCol = shuffledPositions[i].col;
      shuffledPositions[i].row = shuffledPositions[j].row;
      shuffledPositions[i].col = shuffledPositions[j].col;
      shuffledPositions[j].row = tempRow;
      shuffledPositions[j].col = tempCol;
    }

    // Update grid with new positions
    // First clear all tile positions
    tileData.forEach(({ tile }) => {
      this.grid.setTile(tile.row, tile.col, null);
    });

    // Then set new positions
    shuffledPositions.forEach(({ tile, row, col }) => {
      tile.row = row;
      tile.col = col;
      this.grid.setTile(row, col, tile);
    });

    // Remove initial matches (this changes tile types, not positions)
    this.removeInitialMatches();

    // Phase 3: Animate tiles flying back to their new positions
    const flyBack: Promise<void>[] = [];

    this.grid.forEachCell((cell) => {
      if (cell.tile) {
        const sprite = this.tileSprites.get(cell.tile.id);
        if (sprite) {
          const targetPos = this.cellToScreen(cell.row, cell.col);

          flyBack.push(
            new Promise(resolve => {
              this.tweens.add({
                targets: sprite,
                x: targetPos.x,
                y: targetPos.y,
                scale: 1,
                angle: 0,
                duration: 300,
                ease: 'Cubic.easeOut',
                onComplete: () => resolve(),
              });
            })
          );
        }
      }
    });

    await Promise.all(flyBack);

    // Small delay to ensure all animations are fully complete
    await this.wait(50);

    // Kill ALL tweens on ALL tracked sprites and destroy them
    // This ensures no animation artifacts remain
    const spritesToDestroy = Array.from(this.tileSprites.entries());
    for (const [tileId, sprite] of spritesToDestroy) {
      this.tweens.killTweensOf(sprite);
      sprite.destroy(true);
      this.tileSprites.delete(tileId);
    }

    // Now recreate all sprites fresh at their correct positions
    this.grid.forEachCell((cell) => {
      if (cell.tile) {
        this.createTileSprite(cell.tile);
      }
    });

    // Remove 67 overlay with fade
    this.remove67Overlay(overlay);
  }

  private create67Overlay(): Phaser.GameObjects.Container {
    const container = this.add.container(CONFIG.SCREEN.WIDTH / 2, CONFIG.SCREEN.HEIGHT / 2);
    container.setDepth(500);

    // Semi-transparent background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.3);
    bg.fillRect(-CONFIG.SCREEN.WIDTH / 2, -CONFIG.SCREEN.HEIGHT / 2, CONFIG.SCREEN.WIDTH, CONFIG.SCREEN.HEIGHT);
    container.add(bg);

    // Create the 6
    const six = this.add.text(-60, 0, '6', {
      fontSize: '120px',
      fontStyle: 'bold',
      color: '#ff6b6b',
      stroke: '#ffffff',
      strokeThickness: 4,
    }).setOrigin(0.5);
    container.add(six);

    // Create the 7
    const seven = this.add.text(60, 0, '7', {
      fontSize: '120px',
      fontStyle: 'bold',
      color: '#4ecdc4',
      stroke: '#ffffff',
      strokeThickness: 4,
    }).setOrigin(0.5);
    container.add(seven);

    // Store tweens on the container so we can kill them later
    const tweens: Phaser.Tweens.Tween[] = [];

    // Animate 6 bouncing
    tweens.push(this.tweens.add({
      targets: six,
      y: -20,
      duration: 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    }));

    // Animate 7 bouncing (offset timing)
    tweens.push(this.tweens.add({
      targets: seven,
      y: -20,
      duration: 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 100,
    }));

    // Store tweens on container for cleanup
    container.setData('tweens', tweens);

    // Scale in animation
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    return container;
  }

  private remove67Overlay(container: Phaser.GameObjects.Container): void {
    // Kill all stored tweens first
    const tweens = container.getData('tweens') as Phaser.Tweens.Tween[] | undefined;
    if (tweens) {
      tweens.forEach(tween => {
        if (tween && tween.isPlaying()) {
          tween.stop();
        }
      });
    }

    // Kill any tweens on children
    container.each((child: Phaser.GameObjects.GameObject) => {
      this.tweens.killTweensOf(child);
    });

    this.tweens.add({
      targets: container,
      scale: 0,
      alpha: 0,
      duration: 200,
      ease: 'Back.easeIn',
      onComplete: () => {
        // Destroy with all children
        container.destroy(true);
      },
    });
  }

  private async clearSingleTile(tile: Tile): Promise<void> {
    const sprite = this.tileSprites.get(tile.id);
    if (sprite) {
      await new Promise<void>(resolve => {
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
      });
    }
    this.grid.setTile(tile.row, tile.col, null);
  }

  private async clearBoosterTargets(positions: Position[], tilesToClear: Tile[]): Promise<void> {
    // Track obstacles cleared
    const obstaclesClearedByType: Record<string, number> = {};

    // Damage obstacles at all positions (1 layer each)
    for (const pos of positions) {
      const cell = this.grid.getCell(pos.row, pos.col);
      if (!cell?.obstacle) continue;

      const clearedObstacle = this.grid.clearObstacle(pos.row, pos.col);
      if (clearedObstacle) {
        // Fully destroyed
        obstaclesClearedByType[clearedObstacle.type] = (obstaclesClearedByType[clearedObstacle.type] || 0) + 1;
        this.removeObstacleSprite(pos.row, pos.col);
      } else if (cell.obstacle) {
        // Just damaged, update sprite to show reduced layers
        this.updateObstacleSprite(pos.row, pos.col);
      }
    }

    // Update objectives
    this.updateObstacleObjectives(obstaclesClearedByType);

    // Add score
    this.gameState.addMatchScore(tilesToClear.length, false);
    this.scorePopup.showAtMatch(
      CONFIG.SCREEN.WIDTH / 2,
      CONFIG.SCREEN.HEIGHT / 2,
      tilesToClear.length * CONFIG.SCORE.MATCH_BASE,
      false
    );

    // Clear tiles with animation
    const promises: Promise<void>[] = [];
    for (const tile of tilesToClear) {
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
      this.grid.setTile(tile.row, tile.col, null);
    }

    await Promise.all(promises);
  }

  private async activateAndClearPowerups(powerups: Tile[], swapTargetColors?: Map<string, string | undefined>): Promise<void> {
    const tilesToClear = new Set<Tile>();

    // Add the powerups themselves
    powerups.forEach(p => tilesToClear.add(p));

    // Track already-activated powerups for chain reactions
    const alreadyActivated = new Set<string>();

    // For propellers, calculate and cache the target BEFORE animation
    // This ensures animation and game logic use the same target
    const propellerTargetsMap = new Map<string, Position | null>();
    for (const powerup of powerups) {
      if (powerup.powerupType === 'propeller') {
        const targets = getPropellerTargets(this.grid, powerup);
        propellerTargetsMap.set(powerup.id, targets.main);
        // Cache it for the game logic to use
        setPropellerTarget(powerup.id, targets.main);
      }
    }

    // Play animations for each powerup FIRST
    const animationPromises: Promise<void>[] = [];
    for (const powerup of powerups) {
      const color = CONFIG.COLORS[powerup.type as keyof typeof CONFIG.COLORS] || 0xffffff;
      // For propellers, pass the pre-calculated target
      if (powerup.powerupType === 'propeller') {
        const target = propellerTargetsMap.get(powerup.id);
        animationPromises.push(this.playPropellerAnimationWithTarget(powerup, target ?? null, color));
      } else {
        animationPromises.push(this.playPowerupAnimation(powerup, color));
      }
    }
    await Promise.all(animationPromises);

    // Activate each powerup and collect affected tiles
    for (const powerup of powerups) {
      const targetColor = swapTargetColors?.get(powerup.id);
      const affected = this.activatePowerup(powerup, targetColor, alreadyActivated);
      affected.forEach(t => tilesToClear.add(t));
    }

    // Get all positions affected by powerups (including cells without tiles like ice blocks)
    const affectedPositions = new Set<string>();
    for (const powerup of powerups) {
      const targetColor = swapTargetColors?.get(powerup.id);
      const positions = getPowerupAffectedPositions(this.grid, powerup, targetColor);
      positions.forEach(p => affectedPositions.add(`${p.row},${p.col}`));
    }

    // Clear obstacles at all affected positions (not just under tiles)
    const obstaclesClearedByType: Record<string, number> = {};
    affectedPositions.forEach(key => {
      const [row, col] = key.split(',').map(Number);
      const clearedObstacle = this.grid.clearObstacle(row, col);
      if (clearedObstacle) {
        obstaclesClearedByType[clearedObstacle.type] = (obstaclesClearedByType[clearedObstacle.type] || 0) + 1;
        this.removeObstacleSprite(row, col);
      }
    });

    // Update objective tracker for obstacles cleared
    this.updateObstacleObjectives(obstaclesClearedByType);

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

  private async activatePowerupCombination(powerup1: Tile, powerup2: Tile): Promise<void> {
    const tilesToClear = new Set<Tile>();
    const alreadyActivated = new Set<string>();

    // Add the powerups themselves
    tilesToClear.add(powerup1);
    tilesToClear.add(powerup2);

    // Play combination animation FIRST
    await this.playCombinationAnimation(powerup1, powerup2);

    // Get all affected tiles from the combination
    const affected = combinePowerups(this.grid, powerup1, powerup2, alreadyActivated);
    affected.forEach(t => tilesToClear.add(t));

    // Get all positions affected by the combination (including cells without tiles like ice blocks)
    const affectedPositions = getCombinationAffectedPositions(this.grid, powerup1, powerup2);
    const affectedPositionSet = new Set<string>(affectedPositions.map(p => `${p.row},${p.col}`));

    // Clear obstacles at all affected positions (not just under tiles)
    const obstaclesClearedByType: Record<string, number> = {};
    affectedPositionSet.forEach(key => {
      const [row, col] = key.split(',').map(Number);
      const clearedObstacle = this.grid.clearObstacle(row, col);
      if (clearedObstacle) {
        obstaclesClearedByType[clearedObstacle.type] = (obstaclesClearedByType[clearedObstacle.type] || 0) + 1;
        this.removeObstacleSprite(row, col);
      }
    });

    // Damage adjacent obstacles (boxes, ice, barrels, ice_buckets)
    // Track the FINAL state of each damaged obstacle position
    const damagedObstaclesFinalState = new Map<string, { row: number; col: number; obstacle: Obstacle; cleared: boolean }>();
    tilesToClear.forEach(tile => {
      const damaged = this.grid.damageAdjacentObstacles(tile.row, tile.col);
      damaged.forEach(d => {
        const key = `${d.row},${d.col}`;
        const existing = damagedObstaclesFinalState.get(key);
        
        if (!existing) {
          damagedObstaclesFinalState.set(key, d);
        } else if (d.cleared && !existing.cleared) {
          damagedObstaclesFinalState.set(key, d);
        }
      });
    });

    // Now process the final state of each damaged obstacle
    damagedObstaclesFinalState.forEach((d) => {
      if (d.cleared) {
        this.removeObstacleSprite(d.row, d.col);
        obstaclesClearedByType[d.obstacle.type] = (obstaclesClearedByType[d.obstacle.type] || 0) + 1;
      } else {
        this.updateObstacleSprite(d.row, d.col);
      }
    });

    // Update objective tracker for obstacles cleared
    this.updateObstacleObjectives(obstaclesClearedByType);

    // Add score for cleared tiles (powerup combo bonus)
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

    // Play swap sound
    this.audioManager.playSwap();

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

    // Reset combo display at start of move
    this.comboDisplay.resetCombo();

    while (true) {
      const matches = this.matchDetector.findAllMatches(this.grid);

      if (matches.length === 0) break;

      cascadeCount++;
      console.log(`Cascade ${cascadeCount}: ${matches.length} matches`);

      // Increment cascade multiplier for scoring (after first match)
      if (cascadeCount > 1) {
        this.gameState.incrementCascade();
      }

      // Show combo feedback for cascades
      this.comboDisplay.onCascade();

      // Cascade audio and haptics
      if (cascadeCount > 1) {
        this.audioManager.playCascade(cascadeCount);
        this.hapticFeedback.forCascade(cascadeCount);
        this.screenShake.forCascade(cascadeCount);
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
      // Add hero charge for each match
      this.addHeroCharge(match.tiles.length);

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

    // Activate powerups first with animations and collect additional tiles to clear
    const powerupAnimPromises: Promise<void>[] = [];
    for (const powerup of powerupsToActivate) {
      const color = CONFIG.COLORS[powerup.type as keyof typeof CONFIG.COLORS] || 0xffffff;
      powerupAnimPromises.push(this.playPowerupAnimation(powerup, color));
    }
    // Play all powerup animations simultaneously
    if (powerupAnimPromises.length > 0) {
      await Promise.all(powerupAnimPromises);
    }

    // Now collect affected tiles and positions
    const powerupAffectedPositions = new Set<string>();
    for (const powerup of powerupsToActivate) {
      const additionalTiles = this.activatePowerup(powerup);
      additionalTiles.forEach(t => tilesToClear.add(t));
      // Also get positions affected by powerups (including cells without tiles like ice blocks)
      const positions = getPowerupAffectedPositions(this.grid, powerup);
      positions.forEach(p => powerupAffectedPositions.add(`${p.row},${p.col}`));
    }

    // Track positions where matches occurred for damaging adjacent obstacles
    const matchedPositions = new Set<string>();
    tilesToClear.forEach(tile => {
      matchedPositions.add(`${tile.row},${tile.col}`);
    });

    // Damage adjacent obstacles (boxes, barrels, ice buckets, ice) for each matched position
    // Track the FINAL state of each damaged obstacle position
    const damagedObstaclesFinalState = new Map<string, { row: number; col: number; obstacle: Obstacle; cleared: boolean }>();
    const clearedSpecialObstacles: { row: number; col: number; type: string }[] = [];
    const adjacentObstaclesClearedByType: Record<string, number> = {};
    
    tilesToClear.forEach(tile => {
      const damaged = this.grid.damageAdjacentObstacles(tile.row, tile.col);
      damaged.forEach(d => {
        const key = `${d.row},${d.col}`;
        const existing = damagedObstaclesFinalState.get(key);
        
        if (!existing) {
          // First time seeing this position
          damagedObstaclesFinalState.set(key, d);
        } else if (d.cleared && !existing.cleared) {
          // Position was previously damaged but now fully cleared
          damagedObstaclesFinalState.set(key, d);
        }
        // If already cleared, ignore subsequent damage reports
      });
    });

    // Now process the final state of each damaged obstacle
    damagedObstaclesFinalState.forEach((d) => {
      if (d.cleared) {
        this.removeObstacleSprite(d.row, d.col);
        // Track all cleared obstacles by type for objectives
        adjacentObstaclesClearedByType[d.obstacle.type] = (adjacentObstaclesClearedByType[d.obstacle.type] || 0) + 1;
        // Track special obstacles for their effects
        if (d.obstacle.type === 'barrel' || d.obstacle.type === 'ice_bucket') {
          clearedSpecialObstacles.push({ row: d.row, col: d.col, type: d.obstacle.type });
        }
      } else {
        // Update sprite for reduced layers
        this.updateObstacleSprite(d.row, d.col);
      }
    });

    // Handle special obstacle effects
    this.processSpecialObstacleEffects(clearedSpecialObstacles, tilesToClear);

    // Clear obstacles at powerup-affected positions (includes cells without tiles like ice blocks)
    const obstaclesClearedByType: Record<string, number> = {};
    powerupAffectedPositions.forEach(key => {
      const [row, col] = key.split(',').map(Number);
      const clearedObstacle = this.grid.clearObstacle(row, col);
      if (clearedObstacle) {
        obstaclesClearedByType[clearedObstacle.type] = (obstaclesClearedByType[clearedObstacle.type] || 0) + 1;
        this.removeObstacleSprite(row, col);
      }
    });

    // Also clear obstacles under matched tiles
    tilesToClear.forEach(tile => {
      const clearedObstacle = this.grid.clearObstacle(tile.row, tile.col);
      if (clearedObstacle) {
        obstaclesClearedByType[clearedObstacle.type] = (obstaclesClearedByType[clearedObstacle.type] || 0) + 1;
        this.removeObstacleSprite(tile.row, tile.col);
      }
    });

    // Add obstacles cleared from adjacent damage
    for (const [type, count] of Object.entries(adjacentObstaclesClearedByType)) {
      obstaclesClearedByType[type] = (obstaclesClearedByType[type] || 0) + count;
    }

    // Update objective tracker for obstacles cleared
    this.updateObstacleObjectives(obstaclesClearedByType);

    // Add score for cleared tiles
    const scoreEarned = tilesToClear.size * CONFIG.SCORE.MATCH_BASE + (powerupCreated ? CONFIG.SCORE.POWERUP_BONUS : 0);
    this.gameState.addMatchScore(tilesToClear.size, powerupCreated);

    // Play match sound and haptic
    this.audioManager.playMatch();
    this.hapticFeedback.forMatchSize(tilesToClear.size);

    // Screen shake for large matches
    this.screenShake.forMatchSize(tilesToClear.size);

    // Calculate center of cleared tiles for score popup
    let centerX = 0, centerY = 0;
    let count = 0;
    tilesToClear.forEach(tile => {
      const pos = this.cellToScreen(tile.row, tile.col);
      centerX += pos.x;
      centerY += pos.y;
      count++;
    });
    if (count > 0) {
      centerX /= count;
      centerY /= count;
      // Show score popup at center of match
      this.scorePopup.showAtMatch(centerX, centerY, scoreEarned, powerupCreated);
    }

    // Animate clear with particles
    const promises: Promise<void>[] = [];
    tilesToClear.forEach(tile => {
      const sprite = this.tileSprites.get(tile.id);
      if (sprite) {
        // Emit particles at tile position
        const color = CONFIG.COLORS[tile.type as keyof typeof CONFIG.COLORS] || 0xffffff;
        this.particleManager.emitMatchParticles(sprite.x, sprite.y, color, 8);

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
    const powerupCreationPromises: Promise<void>[] = [];
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

          // Play powerup creation sound and particles
          const powerupColor = CONFIG.COLORS[powerupTile.type as keyof typeof CONFIG.COLORS] || 0xffffff;
          this.audioManager.playPowerupCreate();
          this.hapticFeedback.medium();
          const pos = this.cellToScreen(match.powerupPosition.row, match.powerupPosition.col);
          this.particleManager.emitPowerupCreation(pos.x, pos.y, powerupColor);

          // Play powerup creation animation
          powerupCreationPromises.push(
            this.powerupAnimations.animatePowerupCreation(
              match.powerupPosition.row,
              match.powerupPosition.col,
              match.powerupType,
              powerupColor
            )
          );
        }
      }
    }

    // Wait for all powerup creation animations
    if (powerupCreationPromises.length > 0) {
      await Promise.all(powerupCreationPromises);
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

  /**
   * Play the appropriate animation for a single powerup activation
   */
  private async playPowerupAnimation(powerup: Tile, color: number): Promise<void> {
    if (!powerup.powerupType) return;

    // Play powerup sound and haptic feedback
    this.hapticFeedback.forPowerup(powerup.powerupType);
    this.screenShake.forPowerup(powerup.powerupType);

    switch (powerup.powerupType) {
      case 'rocket_h':
        this.audioManager.playRocket();
        await this.powerupAnimations.animateRocketHorizontal(powerup.row, powerup.col, color);
        break;
      case 'rocket_v':
        this.audioManager.playRocket();
        await this.powerupAnimations.animateRocketVertical(powerup.row, powerup.col, color);
        break;
      case 'bomb':
        this.audioManager.playBomb();
        await this.powerupAnimations.animateBomb(powerup.row, powerup.col, 2);
        break;
      case 'color_bomb':
        this.audioManager.playColorBomb();
        // Find all tiles that will be affected
        const targetPositions: Position[] = [];
        this.grid.forEachCell(cell => {
          if (cell.tile && cell.tile.type === powerup.type && cell.tile.id !== powerup.id) {
            targetPositions.push({ row: cell.row, col: cell.col });
          }
        });
        await this.powerupAnimations.animateColorBomb(powerup.row, powerup.col, targetPositions);
        break;
      case 'propeller':
        this.audioManager.playPropeller();
        // When called from here (chain reactions), calculate target and cache it
        const targets = getPropellerTargets(this.grid, powerup);
        setPropellerTarget(powerup.id, targets.main);
        await this.playPropellerAnimationWithTarget(powerup, targets.main, color);
        break;
    }
  }

  /**
   * Play propeller animation with a specific pre-calculated target
   */
  private async playPropellerAnimationWithTarget(powerup: Tile, target: Position | null, color: number): Promise<void> {
    if (target) {
      await this.powerupAnimations.animatePropeller(powerup.row, powerup.col, target.row, target.col, color);
    } else {
      // No target - just show impact particles at the propeller location
      this.powerupAnimations.animatePropellerMultiTarget(powerup.row, powerup.col, null, null, color);
    }
  }

  /**
   * Play the appropriate animation for a powerup combination
   */
  private async playCombinationAnimation(powerup1: Tile, powerup2: Tile): Promise<void> {
    const type1 = powerup1.powerupType!;
    const type2 = powerup2.powerupType!;
    const types = [type1, type2].sort();
    const comboKey = types.join('+');

    const color1 = CONFIG.COLORS[powerup1.type as keyof typeof CONFIG.COLORS] || 0xffffff;
    const color2 = CONFIG.COLORS[powerup2.type as keyof typeof CONFIG.COLORS] || 0xffffff;
    const color = color1;

    const centerRow = powerup1.row;
    const centerCol = powerup1.col;

    // Play combination sound and effects
    this.hapticFeedback.forPowerupCombination();
    this.screenShake.forPowerupCombination(type1, type2);

    switch (comboKey) {
      // Rocket + Rocket = Cross blast
      case 'rocket_h+rocket_h':
      case 'rocket_h+rocket_v':
      case 'rocket_v+rocket_v':
        await this.powerupAnimations.animateCrossBlast(centerRow, centerCol, color);
        break;

      // Bomb + Bomb = 7x7 explosion
      case 'bomb+bomb':
        await this.powerupAnimations.animateMegaBomb(centerRow, centerCol);
        break;

      // Rocket + Bomb = Triple line blast
      case 'bomb+rocket_h':
      case 'bomb+rocket_v':
        await this.powerupAnimations.animateTripleLineBlast(centerRow, centerCol, color);
        break;

      // Color Bomb + Rocket = All tiles of color become rockets
      case 'color_bomb+rocket_h':
      case 'color_bomb+rocket_v':
        const rocketColor = type1 === 'color_bomb' ? powerup2.type : powerup1.type;
        const isHorizontal = type1 === 'rocket_h' || type2 === 'rocket_h';
        const coloredTiles: Position[] = [];
        this.grid.forEachCell(cell => {
          if (cell.tile && cell.tile.type === rocketColor) {
            coloredTiles.push({ row: cell.row, col: cell.col });
          }
        });
        const tileColor = CONFIG.COLORS[rocketColor as keyof typeof CONFIG.COLORS] || 0xffffff;
        await this.powerupAnimations.animateColorRockets(centerRow, centerCol, coloredTiles, isHorizontal, tileColor);
        break;

      // Color Bomb + Bomb = All tiles of color explode
      case 'bomb+color_bomb':
        const bombColor = type1 === 'color_bomb' ? powerup2.type : powerup1.type;
        const bombTiles: Position[] = [];
        this.grid.forEachCell(cell => {
          if (cell.tile && cell.tile.type === bombColor) {
            bombTiles.push({ row: cell.row, col: cell.col });
          }
        });
        await this.powerupAnimations.animateColorBombs(centerRow, centerCol, bombTiles);
        break;

      // Color Bomb + Color Bomb = Clear entire board
      case 'color_bomb+color_bomb':
        await this.powerupAnimations.animateDoubleClearBoard(centerRow, centerCol);
        break;

      // Propeller combinations - use propeller flight animation
      case 'propeller+rocket_h':
      case 'propeller+rocket_v':
      case 'bomb+propeller':
      case 'color_bomb+propeller':
      case 'propeller+propeller':
        // Find target for propeller and fly there with effect
        const propTargets = getPropellerTargets(this.grid, powerup1);
        if (propTargets.main) {
          // Cache the target for the game logic to use
          setPropellerTarget(powerup1.id, propTargets.main);
          // Cache bonus target for propeller+propeller
          if (comboKey === 'propeller+propeller' && propTargets.bonus) {
            setPropellerTarget(powerup2.id, propTargets.bonus);
          }
          // Fly to target
          await this.powerupAnimations.animatePropeller(centerRow, centerCol, propTargets.main.row, propTargets.main.col, color);
          // Then play the secondary effect at target
          if (comboKey.includes('rocket')) {
            await this.powerupAnimations.animateCrossBlast(propTargets.main.row, propTargets.main.col, color);
          } else if (comboKey === 'bomb+propeller') {
            await this.powerupAnimations.animateBomb(propTargets.main.row, propTargets.main.col, 2);
          } else if (comboKey === 'propeller+propeller') {
            // Second propeller goes to bonus target
            if (propTargets.bonus) {
              await this.powerupAnimations.animatePropeller(propTargets.main.row, propTargets.main.col, propTargets.bonus.row, propTargets.bonus.col, color);
            }
          }
        }
        break;

      default:
        // Fallback: play both individual animations
        await Promise.all([
          this.playPowerupAnimation(powerup1, color1),
          this.playPowerupAnimation(powerup2, color2),
        ]);
        break;
    }
  }

  private async applyGravity(): Promise<void> {
    await this.gravitySystem.applyGravity();
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private processSpecialObstacleEffects(
    clearedObstacles: { row: number; col: number; type: string }[],
    tilesToClear: Set<Tile>
  ): void {
    this.specialObstacleProcessor.processSpecialObstacleEffects(clearedObstacles, tilesToClear);
  }

  private updateObstacleObjectives(clearedByType: Record<string, number>): void {
    this.specialObstacleProcessor.updateObstacleObjectives(clearedByType);
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
