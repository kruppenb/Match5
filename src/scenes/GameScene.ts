import Phaser from 'phaser';
import { Grid } from '../game/Grid';
import { MatchDetector } from '../game/MatchDetector';
import { GameTester } from '../game/GameTester';
import { Level } from '../game/Level';
import { GameState } from '../game/GameState';
import { BoosterManager } from '../game/BoosterManager';
import { GravitySystem } from '../game/GravitySystem';
import { SpecialObstacleProcessor } from '../game/SpecialObstacleProcessor';
import { canCombinePowerups } from '../game/powerupUtils';
import { ProgressStorage } from '../storage/ProgressStorage';
import { MetaStorage } from '../storage/MetaStorage';
import { getCurrencyManager } from '../meta/CurrencyManager';
import { getProgressionEventManager } from '../meta/ProgressionEventManager';
import { LevelResult } from '../types';
import { CONFIG } from '../config';
import { Tile, Position, Cell, BoosterType } from '../types';
import { MoveCounter, ObjectiveDisplay, EndScreen, BoosterBar } from './UIComponents';
import { PowerupAnimations } from './PowerupAnimations';
import { ScreenShake } from '../utils/ScreenShake';
import { ParticleManager } from '../utils/ParticleManager';
import { ComboDisplay } from '../utils/ComboDisplay';
import { ScorePopup } from '../utils/ScorePopup';
import { getAudioManager, AudioManager } from '../utils/AudioManager';
import { getHapticFeedback, HapticFeedback } from '../utils/HapticFeedback';
import { BackgroundEffects } from '../utils/BackgroundEffects';
import { TileRenderer } from '../rendering/TileRenderer';
import { ObstacleRenderer } from '../rendering/ObstacleRenderer';
import { CelebrationManager } from './CelebrationManager';
import { HeroPowerSystem } from '../game/HeroPowerSystem';
import { InputHandler } from './InputHandler';
import { BoosterExecutor } from './BoosterExecutor';
import { MatchProcessor } from './MatchProcessor';
import { PowerupActivator } from './PowerupActivator';

export interface GameSceneData {
  levelId?: number;
  heroChargePercent?: number;
  isReplay?: boolean;
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
  private tileSize = CONFIG.GRID.TILE_SIZE;
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

  // Background effects
  private backgroundEffects!: BackgroundEffects;

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

  // Extracted systems
  private inputHandler!: InputHandler;
  private boosterExecutor!: BoosterExecutor;
  private matchProcessor!: MatchProcessor;
  private powerupActivator!: PowerupActivator;

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

    // Load effect sprites for powerup animations
    const effectSprites = [
      'explosion_burst',
      'shockwave_ring',
      'spark_yellow',
      'spark_white',
      'smoke_puff',
      'debris_orange',
      'debris_blue',
      'ice_crack',
      'ice_shard',
      'chain_link',
      'wood_splinter',
      'rainbow_burst',
      'magic_star',
      'rocket_flame',
      'speed_line',
    ];
    effectSprites.forEach(effect => {
      this.load.image(`effect_${effect}`, `assets/sprites/effects/${effect}.png`);
    });
  }

  // Screen dimensions - updated on resize
  private screenWidth: number = CONFIG.SCREEN.WIDTH;
  private screenHeight: number = CONFIG.SCREEN.HEIGHT;

  create(data?: GameSceneData): void {
    const levelId = data?.levelId ?? 1;
    this.initialHeroCharge = data?.heroChargePercent ?? 0;
    this.isReplay = data?.isReplay ?? false;
    console.log(`Game Scene Created - Level ${levelId}, Hero Charge: ${this.initialHeroCharge}%, Replay: ${this.isReplay}`);

    // Get actual screen dimensions
    this.screenWidth = this.scale.width;
    this.screenHeight = this.scale.height;

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

    // Calculate dynamic tile size to fit grid on screen using actual dimensions
    const availableWidth = this.screenWidth - CONFIG.UI.PADDING * 2;
    const availableHeight = this.screenHeight - CONFIG.UI.HEADER_HEIGHT - CONFIG.UI.OBJECTIVE_BAR_HEIGHT - CONFIG.UI.PADDING * 2;

    const maxTileWidth = availableWidth / this.level.cols;
    const maxTileHeight = availableHeight / this.level.rows;
    this.tileSize = Math.floor(Math.min(maxTileWidth, maxTileHeight));

    // Calculate grid offset for centering
    const totalGridWidth = this.level.cols * this.tileSize;
    const totalGridHeight = this.level.rows * this.tileSize;
    this.gridOffsetX = (this.screenWidth - totalGridWidth) / 2;
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
    this.powerupAnimations.setParticleManager(this.particleManager);
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

    // Initialize extracted systems
    this.initExtractedSystems();

    // Setup input
    this.inputHandler.setup();

    // Setup keyboard shortcuts for testing
    this.setupTestingKeys();
  }

  private initExtractedSystems(): void {
    // Initialize powerup activator
    this.powerupActivator = new PowerupActivator(
      this,
      this.grid,
      this.gameState,
      this.powerupAnimations,
      this.screenShake,
      this.audioManager,
      this.hapticFeedback,
      this.tileSprites,
      {
        cellToScreen: (row, col) => this.cellToScreen(row, col),
        getTileSprite: (tileId) => this.tileSprites.get(tileId),
        deleteTileSprite: (tileId) => this.tileSprites.delete(tileId),
        removeObstacleSprite: (row, col) => this.removeObstacleSprite(row, col),
        updateObstacleSprite: (row, col) => this.updateObstacleSprite(row, col),
        updateObstacleObjectives: (clearedByType) => this.updateObstacleObjectives(clearedByType),
        applyGravity: () => this.applyGravity(),
      }
    );

    // Initialize match processor
    this.matchProcessor = new MatchProcessor(
      this,
      this.grid,
      this.gameState,
      this.matchDetector,
      this.specialObstacleProcessor,
      this.powerupAnimations,
      this.screenShake,
      this.particleManager,
      this.comboDisplay,
      this.scorePopup,
      this.audioManager,
      this.hapticFeedback,
      this.tileSprites,
      {
        cellToScreen: (row, col) => this.cellToScreen(row, col),
        getTileSprite: (tileId) => this.tileSprites.get(tileId),
        deleteTileSprite: (tileId) => this.tileSprites.delete(tileId),
        createTileSprite: (tile) => this.createTileSprite(tile),
        removeObstacleSprite: (row, col) => this.removeObstacleSprite(row, col),
        updateObstacleSprite: (row, col) => this.updateObstacleSprite(row, col),
        applyGravity: () => this.applyGravity(),
        activatePowerup: (powerup, targetColor?, alreadyActivated?) =>
          this.powerupActivator.activatePowerup(powerup, targetColor, alreadyActivated),
        playPowerupAnimation: (powerup, color) => this.powerupActivator.playPowerupAnimation(powerup, color),
        addHeroCharge: (matchSize, cascadeLevel?, powerupActivated?, sources?) =>
          this.addHeroCharge(matchSize, cascadeLevel, powerupActivated, sources),
      }
    );

    // Initialize booster executor
    this.boosterExecutor = new BoosterExecutor(
      this,
      this.grid,
      this.gameState,
      this.boosterManager,
      this.boosterBar,
      this.screenShake,
      this.particleManager,
      this.audioManager,
      this.hapticFeedback,
      this.tileSprites,
      {
        cellToScreen: (row, col) => this.cellToScreen(row, col),
        clearSingleTile: (tile) => this.clearSingleTile(tile),
        applyGravity: () => this.applyGravity(),
        processMatches: () => this.processMatches(),
        updateObstacleObjectives: (clearedByType) => this.updateObstacleObjectives(clearedByType),
        removeObstacleSprite: (row, col) => this.removeObstacleSprite(row, col),
        updateObstacleSprite: (row, col) => this.updateObstacleSprite(row, col),
        getTileSprite: (tileId) => this.tileSprites.get(tileId),
        deleteTileSprite: (tileId) => this.tileSprites.delete(tileId),
        createTileSprite: (tile) => this.createTileSprite(tile),
      }
    );

    // Initialize input handler
    this.inputHandler = new InputHandler(
      this,
      this.grid,
      this.boosterManager,
      this.audioManager,
      this.tileSize,
      {
        onSwipe: (from, to) => this.onSwipe(from, to),
        onTileTap: (tile) => this.onTileTap(tile),
        onBoosterTap: (type, target) => this.executeBooster(type, target),
        onBoosterCancel: () => {
          this.boosterBar.cancelActiveBooster();
          this.boosterManager.cancelBooster();
        },
        isInputBlocked: () => this.isInputBlocked(),
        isPlaying: () => this.gameState.isPlaying(),
        cellToScreen: (row, col) => this.cellToScreen(row, col),
        screenToCell: (x, y) => this.screenToCell(x, y),
        getTileSprite: (tileId) => this.tileSprites.get(tileId),
      }
    );
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
    if (levelId <= 10) return 'bg_garden';
    if (levelId <= 20) return 'bg_castle';
    if (levelId <= 30) return 'bg_kitchen';
    if (levelId <= 40) return 'bg_library';
    return 'bg_sky_tower';
  }

  private renderBackground(): void {
    const width = this.screenWidth;
    const height = this.screenHeight;

    const bgKey = this.getBackgroundForLevel(this.level.id);

    if (this.textures.exists(bgKey)) {
      const bg = this.add.image(width / 2, height / 2, bgKey);
      bg.setDepth(-10);

      const scaleX = width / bg.width;
      const scaleY = height / bg.height;
      const scale = Math.max(scaleX, scaleY);
      bg.setScale(scale);
    } else {
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

    // Create ambient background effects (particles + light overlay)
    this.backgroundEffects = new BackgroundEffects(this, this.level.id);
    this.backgroundEffects.create();
  }

  private renderUI(): void {
    this.add.text(CONFIG.UI.PADDING, CONFIG.UI.HEADER_HEIGHT / 2, `Level ${this.level.id}`, {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0, 0.5);

    this.moveCounter = new MoveCounter(
      this,
      this.screenWidth / 2,
      CONFIG.UI.HEADER_HEIGHT / 2
    );
    this.updateMoveDisplay();

    const labelOffsetX = -CONFIG.UI.MOVE_COUNTER_SIZE / 2 - 8;
    const labelOffsetY = -6;
    this.moveCounter.attachLabel('MOVES', labelOffsetX, labelOffsetY, 'left');

    const menuBtn = this.add.text(this.screenWidth - CONFIG.UI.PADDING, CONFIG.UI.HEADER_HEIGHT / 2, 'MENU', {
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

    this.objectiveDisplay = new ObjectiveDisplay(
      this,
      this.screenWidth / 2,
      CONFIG.UI.HEADER_HEIGHT + CONFIG.UI.OBJECTIVE_BAR_HEIGHT / 2,
      this.gameState.getObjectives()
    );

    this.boosterBar = new BoosterBar(
      this,
      this.screenWidth / 2,
      this.screenHeight - 65,
      this.boosterManager.getInventory(),
      (type) => this.onBoosterSelect(type),
      () => this.onBoosterCancel()
    );

    this.endScreen = new EndScreen(this);
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
        // Obstacle callbacks for hero powers
        removeObstacleSprite: (row, col) => this.removeObstacleSprite(row, col),
        updateObstacleSprite: (row, col) => this.updateObstacleSprite(row, col),
        updateObstacleObjectives: (clearedByType) => this.updateObstacleObjectives(clearedByType),
      },
      this.initialHeroCharge
    );
  }

  private addHeroCharge(matchSize: number, cascadeLevel: number = 0, powerupActivated: boolean = false, sources?: { x: number; y: number; color: number }[]): void {
    if (this.heroPowerSystem) {
      this.heroPowerSystem.addCharge(matchSize, cascadeLevel, powerupActivated, sources);
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

        this.grid.clearTileAt(tile.row, tile.col);
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

  // Store earned currency for passing to TitleScene
  private earnedCoins: number = 0;
  private earnedDiamonds: number = 0;

  private async showWinScreen(): Promise<void> {
    // Wait for any pending animations to complete
    while (this.isProcessing) {
      await this.wait(50);
    }

    const stars = this.gameState.calculateStars();
    const score = this.gameState.getScore();
    const remainingMoves = this.gameState.getMovesRemaining();
    const bonus = remainingMoves * CONFIG.LEVEL.BONUS_POINTS_PER_MOVE;

    this.boosterBar.setEnabled(false);
    this.boosterBar.cancelActiveBooster();
    this.boosterManager.cancelBooster();

    const isFirstTime = !ProgressStorage.isLevelCompleted(this.level.id);
    ProgressStorage.completeLevel(this.level.id, stars);

    const levelResult: LevelResult = {
      levelId: this.level.id,
      stars,
      score,
      powerupsUsed: 0,
      maxCombo: 0,
      isFirstTime,
    };

    const currencyManager = getCurrencyManager();
    const rewards = currencyManager.awardLevelRewards(levelResult);

    const eventManager = getProgressionEventManager();
    eventManager.onLevelComplete(levelResult);

    let replayBonus = 0;
    if (this.isReplay && MetaStorage.incrementDailyReplay()) {
      replayBonus = 50;
      currencyManager.addDiamonds(replayBonus, 'replay_bonus');
      console.log(`Awarded ${replayBonus} diamonds for replay bonus!`);
    }

    // Store earned currency for TitleScene animation
    this.earnedCoins = rewards.coins;
    this.earnedDiamonds = rewards.diamonds + replayBonus;

    this.audioManager.playWin();
    this.hapticFeedback.success();

    this.celebrationManager.playCelebration(remainingMoves, score, stars, bonus);

    if (rewards.coins > 0 || replayBonus > 0) {
      this.time.delayedCall(1000, () => {
        this.showCurrencyReward(rewards.coins, rewards.diamonds + replayBonus);
      });
    }
  }

  private showCurrencyReward(coins: number, diamonds: number): void {
    const { width, height } = this.scale;
    const y = height / 2 - 100;

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
      onMenu: () => this.goToMenuWithReward(),
    });
  }

  private showLoseScreen(): void {
    this.boosterBar.setEnabled(false);
    this.boosterBar.cancelActiveBooster();
    this.boosterManager.cancelBooster();

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

  private goToMenu(): void {
    this.scene.start('TitleScene');
  }

  private goToMenuWithReward(): void {
    this.scene.start('TitleScene', {
      earnedCoins: this.earnedCoins,
      earnedDiamonds: this.earnedDiamonds,
    });
  }

  private removeInitialMatches(): void {
    let attempts = 0;
    while (attempts < 100) {
      const matches = this.matchDetector.findAllMatches(this.grid);
      if (matches.length === 0) break;

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
    this.tileSprites.forEach(sprite => sprite.destroy());
    this.tileSprites.clear();
    this.obstacleSprites.forEach(sprite => sprite.destroy());
    this.obstacleSprites.clear();

    this.grid.forEachCell(cell => {
      if (cell.blocked) return;

      const pos = this.cellToScreen(cell.row, cell.col);

      const bg = this.add.graphics();
      bg.fillStyle(0x2a2a3e, 1);
      bg.fillRoundedRect(
        pos.x - this.tileSize / 2 + CONFIG.GRID.GAP / 2,
        pos.y - this.tileSize / 2 + CONFIG.GRID.GAP / 2,
        this.tileSize - CONFIG.GRID.GAP,
        this.tileSize - CONFIG.GRID.GAP,
        8
      );

      if (cell.obstacle) {
        this.createObstacleSprite(cell);
      }
    });

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

    if (layerText) {
      (graphics as any).layerText = layerText;
    }
    // Store obstacle type for particle effects on removal
    (graphics as any).obstacleType = cell.obstacle.type;

    this.obstacleSprites.set(key, graphics);
  }

  private removeObstacleSprite(row: number, col: number): void {
    const key = `obstacle_${row}_${col}`;
    const sprite = this.obstacleSprites.get(key);
    if (sprite) {
      this.obstacleSprites.delete(key);

      const layerText = (sprite as any).layerText;
      if (layerText) layerText.destroy();

      // Emit obstacle-specific particle effects
      const pos = this.cellToScreen(row, col);
      const obstacleType = (sprite as any).obstacleType;
      if (this.particleManager && obstacleType) {
        switch (obstacleType) {
          case 'ice':
            this.particleManager.emitIceCrack(pos.x, pos.y, this.tileSize);
            this.particleManager.emitIceShards(pos.x, pos.y, 8);
            break;
          case 'chain':
            this.particleManager.emitChainBreak(pos.x, pos.y, 4);
            this.particleManager.emitSparks(pos.x, pos.y, 4, 'white');
            break;
          case 'box':
            this.particleManager.emitWoodSplinters(pos.x, pos.y, 8);
            break;
          case 'grass':
            this.particleManager.emitMatchParticles(pos.x, pos.y, 0x44aa44, 6);
            break;
          default:
            this.particleManager.emitMatchParticles(pos.x, pos.y, 0x888888, 4);
        }
      }

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
    this.removeObstacleSprite(row, col);
    if (cell?.obstacle) {
      this.createObstacleSprite(cell);
    }
  }

  private createTileSprite(tile: Tile, startRow?: number): void {
    const startPos = startRow !== undefined ? this.cellToScreen(startRow, tile.col) : this.cellToScreen(tile.row, tile.col);

    const container = this.add.container(startPos.x, startPos.y);

    const color = CONFIG.COLORS[tile.type as keyof typeof CONFIG.COLORS] || 0x888888;
    const size = this.tileSize - CONFIG.GRID.GAP * 4;
    const halfSize = size / 2;

    const useGemSprite = !tile.isPowerup && this.loadedGemSprites.has(tile.type) && this.textures.exists(`gem_${tile.type}`);
    const usePowerupSprite = tile.isPowerup && tile.powerupType && this.loadedPowerupSprites.has(tile.powerupType) && this.textures.exists(`powerup_${tile.powerupType}`);

    if (useGemSprite) {
      const sprite = this.add.sprite(0, 0, `gem_${tile.type}`);
      const spriteSize = Math.max(sprite.width, sprite.height);
      const scale = size / spriteSize;
      sprite.setScale(scale);
      container.add(sprite);
    } else if (usePowerupSprite) {
      const sprite = this.add.sprite(0, 0, `powerup_${tile.powerupType}`);
      const spriteSize = Math.max(sprite.width, sprite.height);
      const scale = size / spriteSize;
      sprite.setScale(scale);
      container.add(sprite);
    } else {
      const graphics = this.add.graphics();

      if (tile.isPowerup && tile.powerupType) {
        TileRenderer.drawPowerupShape(graphics, tile.powerupType, color, halfSize);
      } else {
        TileRenderer.drawTileShape(graphics, tile.type, color, halfSize);
      }

      container.add(graphics);
    }

    container.setSize(this.tileSize, this.tileSize);
    container.setInteractive();

    container.setData('tile', tile);
    this.tileSprites.set(tile.id, container);
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

  private async onSwipe(from: Position, to: Position): Promise<void> {
    if (!this.gameState.isPlaying()) return;

    if (!this.grid.canSwap(from, to)) {
      console.log('Swap blocked - tile cannot move (chained?)');
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

    this.grid.swapTiles(from, to);
    await this.animateSwap(from, to);

    let validMove = false;

    if (tile1?.isPowerup && tile2?.isPowerup && canCombinePowerups(tile1, tile2)) {
      console.log(`Combining powerups: ${tile1.powerupType} + ${tile2.powerupType}`);
      validMove = true;
      await this.powerupActivator.activatePowerupCombination(tile1, tile2);
      await this.processMatches();
    } else if (tile1?.isPowerup || tile2?.isPowerup) {
      const powerupsToActivate: Tile[] = [];
      const swapTargetColors: Map<string, string | undefined> = new Map();

      if (tile1?.isPowerup && tile1.powerupType === 'color_bomb') {
        powerupsToActivate.push(tile1);
        swapTargetColors.set(tile1.id, tile2?.type);
      }
      if (tile2?.isPowerup && tile2.powerupType === 'color_bomb') {
        powerupsToActivate.push(tile2);
        swapTargetColors.set(tile2.id, tile1?.type);
      }
      if (tile1?.isPowerup && tile1.powerupType !== 'color_bomb' && !powerupsToActivate.includes(tile1)) powerupsToActivate.push(tile1);
      if (tile2?.isPowerup && tile2.powerupType !== 'color_bomb' && !powerupsToActivate.includes(tile2)) powerupsToActivate.push(tile2);

      if (powerupsToActivate.length > 0) {
        console.log('Activating powerups from swap:', powerupsToActivate.length);
        validMove = true;
        await this.powerupActivator.activateAndClearPowerups(powerupsToActivate, swapTargetColors);
        await this.processMatches();
      }
    } else {
      const matches = this.matchDetector.findAllMatches(this.grid);

      if (matches.length > 0) {
        console.log('Matches found:', matches.length);
        validMove = true;
        await this.processMatches();
      } else {
        console.log('No match, swapping back');
        this.grid.swapTiles(from, to);
        await this.animateSwap(from, to);
      }
    }

    if (validMove) {
      this.gameState.useMove();

      if (!this.gameState.getObjectiveTracker().isAllComplete()) {
        this.gameState.checkLoseCondition();
      }
    }

    this.isProcessing = false;
  }

  private async onTileTap(tile: Tile): Promise<void> {
    if (this.isProcessing || !this.gameState.isPlaying()) return;

    const activeBooster = this.boosterManager.getActiveBooster();
    if (activeBooster && this.boosterManager.requiresTarget(activeBooster)) {
      await this.executeBooster(activeBooster, { row: tile.row, col: tile.col });
      return;
    }

    if (tile.isPowerup) {
      this.isProcessing = true;
      console.log('Tapped powerup:', tile.powerupType);
      await this.powerupActivator.activateAndClearPowerups([tile]);
      await this.processMatches();

      this.gameState.useMove();

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

    this.isProcessing = true;
    await this.boosterExecutor.execute(type, target);
    this.isProcessing = false;
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

  private async animateSwap(pos1: Position, pos2: Position): Promise<void> {
    const tile1 = this.grid.getTile(pos1.row, pos1.col);
    const tile2 = this.grid.getTile(pos2.row, pos2.col);

    if (!tile1 || !tile2) return;

    const sprite1 = this.tileSprites.get(tile1.id);
    const sprite2 = this.tileSprites.get(tile2.id);

    if (!sprite1 || !sprite2) return;

    this.audioManager.playSwap();

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
    await this.matchProcessor.processMatches();
  }

  private async applyGravity(): Promise<void> {
    await this.gravitySystem.applyGravity();
  }

  private updateObstacleObjectives(clearedByType: Record<string, number>): void {
    this.specialObstacleProcessor.updateObstacleObjectives(clearedByType);
  }

  private setupTestingKeys(): void {
    this.input.keyboard?.on('keydown-T', () => {
      if (!this.autoTestRunning) {
        this.runAutoTest();
      }
    });

    this.input.keyboard?.on('keydown-V', () => {
      const result = this.gameTester.validateGrid();
      if (result.valid) {
        console.log('Grid validation passed!');
      } else {
        console.error('Grid validation failed:');
        result.errors.forEach((err: string) => console.error('  -', err));
      }
    });

    this.input.keyboard?.on('keydown-P', () => {
      this.gameTester.printGridState();
      const counts = this.gameTester.countTilesByType();
      console.log('Tile counts:', counts);
      const validMoves = this.gameTester.findValidMoves().length;
      console.log(`Valid moves available: ${validMoves}`);
    });

    this.input.keyboard?.on('keydown-M', async () => {
      if (this.isProcessing) return;
      const move = this.gameTester.getRandomValidMove();
      if (move) {
        console.log(`Making move: (${move.from.row},${move.from.col}) -> (${move.to.row},${move.to.col})`);
        await this.onSwipe(move.from, move.to);
      } else {
        console.log('No valid moves available!');
      }
    });
  }

  private async runAutoTest(): Promise<void> {
    if (this.isProcessing || this.autoTestRunning) return;

    this.autoTestRunning = true;
    console.log('Starting automated test...');

    try {
      for (let i = 0; i < 10; i++) {
        console.log(`\n--- Test Move ${i + 1}/10 ---`);

        const beforeValidation = this.gameTester.validateGrid();
        if (!beforeValidation.valid) {
          console.error('Grid invalid before move:', beforeValidation.errors);
          break;
        }

        const move = this.gameTester.getRandomValidMove();
        if (!move) {
          console.log('No valid moves available, ending test');
          break;
        }

        console.log(`Making move: (${move.from.row},${move.from.col}) -> (${move.to.row},${move.to.col})`);
        await this.onSwipe(move.from, move.to);

        const afterValidation = this.gameTester.validateGrid();
        if (!afterValidation.valid) {
          console.error('Grid invalid after move:', afterValidation.errors);
          this.gameTester.printGridState();
          break;
        }

        console.log('Move completed successfully');

        await this.wait(500);
      }

      console.log('\nAutomated test completed!');
      console.log('Final grid state:');
      this.gameTester.printGridState();

    } catch (error) {
      console.error('Test failed with error:', error);
    } finally {
      this.autoTestRunning = false;
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
