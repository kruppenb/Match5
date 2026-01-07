import Phaser from 'phaser';
import { Grid } from '../game/Grid';
import { GameState } from '../game/GameState';
import { activatePowerup as activatePowerupHelper, combinePowerups, getPropellerTargets, setPropellerTarget, getPowerupAffectedPositions, getCombinationAffectedPositions, getColorBombPropellerTargets, setMultiPropellerTargets } from '../game/powerupUtils';
import { Position, Tile, Obstacle } from '../types';
import { CONFIG } from '../config';
import { ScreenShake } from '../utils/ScreenShake';
import { AudioManager } from '../utils/AudioManager';
import { HapticFeedback } from '../utils/HapticFeedback';
import { PowerupAnimations } from './PowerupAnimations';

export interface PowerupActivatorCallbacks {
  cellToScreen: (row: number, col: number) => { x: number; y: number };
  getTileSprite: (tileId: string) => Phaser.GameObjects.Container | undefined;
  deleteTileSprite: (tileId: string) => void;
  removeObstacleSprite: (row: number, col: number) => void;
  updateObstacleSprite: (row: number, col: number) => void;
  updateObstacleObjectives: (clearedByType: Record<string, number>) => void;
  applyGravity: () => Promise<void>;
}

export class PowerupActivator {
  private scene: Phaser.Scene;
  private grid: Grid;
  private gameState: GameState;
  private powerupAnimations: PowerupAnimations;
  private screenShake: ScreenShake;
  private audioManager: AudioManager;
  private hapticFeedback: HapticFeedback;
  private tileSprites: Map<string, Phaser.GameObjects.Container>;
  private callbacks: PowerupActivatorCallbacks;

  constructor(
    scene: Phaser.Scene,
    grid: Grid,
    gameState: GameState,
    powerupAnimations: PowerupAnimations,
    screenShake: ScreenShake,
    audioManager: AudioManager,
    hapticFeedback: HapticFeedback,
    tileSprites: Map<string, Phaser.GameObjects.Container>,
    callbacks: PowerupActivatorCallbacks
  ) {
    this.scene = scene;
    this.grid = grid;
    this.gameState = gameState;
    this.powerupAnimations = powerupAnimations;
    this.screenShake = screenShake;
    this.audioManager = audioManager;
    this.hapticFeedback = hapticFeedback;
    this.tileSprites = tileSprites;
    this.callbacks = callbacks;
  }

  activatePowerup(powerup: Tile, targetColor?: string, alreadyActivated: Set<string> = new Set()): Tile[] {
    return activatePowerupHelper(this.grid, powerup, targetColor, alreadyActivated);
  }

  async activateAndClearPowerups(powerups: Tile[], swapTargetColors?: Map<string, string | undefined>): Promise<void> {
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

    // For propellers, ensure target position is included for obstacle clearing
    // (the cache may have been cleared during activatePowerup above)
    for (const powerup of powerups) {
      if (powerup.powerupType === 'propeller') {
        const target = propellerTargetsMap.get(powerup.id);
        if (target) {
          affectedPositions.add(`${target.row},${target.col}`);
        }
      }
    }

    // Clear obstacles at all affected positions (not just under tiles)
    const obstaclesClearedByType: Record<string, number> = {};
    affectedPositions.forEach(key => {
      const [row, col] = key.split(',').map(Number);
      const clearedObstacle = this.grid.clearObstacle(row, col);
      if (clearedObstacle) {
        obstaclesClearedByType[clearedObstacle.type] = (obstaclesClearedByType[clearedObstacle.type] || 0) + 1;
        this.callbacks.removeObstacleSprite(row, col);
      }
    });

    // Update objective tracker for obstacles cleared
    this.callbacks.updateObstacleObjectives(obstaclesClearedByType);

    // Add score for cleared tiles
    this.gameState.addMatchScore(tilesToClear.size, true);

    // Animate and clear all affected tiles
    const promises: Promise<void>[] = [];
    tilesToClear.forEach(tile => {
      const sprite = this.tileSprites.get(tile.id);
      if (sprite) {
        promises.push(
          new Promise(resolve => {
            this.scene.tweens.add({
              targets: sprite,
              alpha: 0,
              scale: 0,
              duration: CONFIG.TIMING.CLEAR_DURATION,
              ease: 'Back.easeIn',
              onComplete: () => {
                sprite.destroy();
                this.callbacks.deleteTileSprite(tile.id);
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
    await this.callbacks.applyGravity();
  }

  async activatePowerupCombination(powerup1: Tile, powerup2: Tile): Promise<void> {
    const tilesToClear = new Set<Tile>();
    const alreadyActivated = new Set<string>();

    // Add the powerups themselves
    tilesToClear.add(powerup1);
    tilesToClear.add(powerup2);

    // For propeller combinations, pre-calculate and cache targets BEFORE animation
    // This ensures both animation and game logic use the same targets
    const type1 = powerup1.powerupType!;
    const type2 = powerup2.powerupType!;
    const types = [type1, type2].sort();
    const comboKey = types.join('+');
    const propellerTargetsMap = new Map<string, Position | null>();
    let colorBombPropellerTargets: Position[] = [];

    if (comboKey === 'propeller+rocket_h' || comboKey === 'propeller+rocket_v' ||
        comboKey === 'bomb+propeller' || comboKey === 'propeller+propeller') {
      const propTargets = getPropellerTargets(this.grid, powerup1);
      propellerTargetsMap.set(powerup1.id, propTargets.main);
      setPropellerTarget(powerup1.id, propTargets.main);

      if (comboKey === 'propeller+propeller' && propTargets.bonus) {
        propellerTargetsMap.set(powerup2.id, propTargets.bonus);
        setPropellerTarget(powerup2.id, propTargets.bonus);
      }
    } else if (comboKey === 'color_bomb+propeller') {
      // Get 3 targets for the triple propeller effect
      colorBombPropellerTargets = getColorBombPropellerTargets(this.grid, new Set([powerup1.id, powerup2.id]));
      const comboId = `${powerup1.id}_${powerup2.id}`;
      setMultiPropellerTargets(comboId, colorBombPropellerTargets);
    }

    // Play combination animation FIRST
    await this.playCombinationAnimation(powerup1, powerup2);

    // Get all affected tiles from the combination
    const affected = combinePowerups(this.grid, powerup1, powerup2, alreadyActivated);
    affected.forEach(t => tilesToClear.add(t));

    // Get all positions affected by the combination (including cells without tiles like ice blocks)
    const affectedPositions = getCombinationAffectedPositions(this.grid, powerup1, powerup2);
    const affectedPositionSet = new Set<string>(affectedPositions.map(p => `${p.row},${p.col}`));

    // For propeller combinations, ensure target positions are included for obstacle clearing
    // (the cache may have been cleared during combinePowerups above)
    propellerTargetsMap.forEach((target) => {
      if (target) {
        affectedPositionSet.add(`${target.row},${target.col}`);
      }
    });

    // For color_bomb+propeller, add all 3 targets
    for (const target of colorBombPropellerTargets) {
      affectedPositionSet.add(`${target.row},${target.col}`);
    }

    // Clear obstacles at all affected positions (not just under tiles)
    const obstaclesClearedByType: Record<string, number> = {};
    affectedPositionSet.forEach(key => {
      const [row, col] = key.split(',').map(Number);
      const clearedObstacle = this.grid.clearObstacle(row, col);
      if (clearedObstacle) {
        obstaclesClearedByType[clearedObstacle.type] = (obstaclesClearedByType[clearedObstacle.type] || 0) + 1;
        this.callbacks.removeObstacleSprite(row, col);
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
        this.callbacks.removeObstacleSprite(d.row, d.col);
        obstaclesClearedByType[d.obstacle.type] = (obstaclesClearedByType[d.obstacle.type] || 0) + 1;
      } else {
        this.callbacks.updateObstacleSprite(d.row, d.col);
      }
    });

    // Update objective tracker for obstacles cleared
    this.callbacks.updateObstacleObjectives(obstaclesClearedByType);

    // Add score for cleared tiles (powerup combo bonus)
    this.gameState.addMatchScore(tilesToClear.size, true);

    // Animate and clear all affected tiles
    const promises: Promise<void>[] = [];
    tilesToClear.forEach(tile => {
      const sprite = this.tileSprites.get(tile.id);
      if (sprite) {
        promises.push(
          new Promise(resolve => {
            this.scene.tweens.add({
              targets: sprite,
              alpha: 0,
              scale: 0,
              duration: CONFIG.TIMING.CLEAR_DURATION,
              ease: 'Back.easeIn',
              onComplete: () => {
                sprite.destroy();
                this.callbacks.deleteTileSprite(tile.id);
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
    await this.callbacks.applyGravity();
  }

  /**
   * Play the appropriate animation for a single powerup activation
   */
  async playPowerupAnimation(powerup: Tile, color: number): Promise<void> {
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

      // Color bomb + propeller = 3 propellers flying to 3 targets
      case 'color_bomb+propeller':
        // Get 3 targets for the triple propeller effect
        const tripleTargets = getColorBombPropellerTargets(this.grid, new Set([powerup1.id, powerup2.id]));
        // Cache targets for game logic
        const comboId = `${powerup1.id}_${powerup2.id}`;
        setMultiPropellerTargets(comboId, tripleTargets);
        // Play the triple propeller animation
        if (tripleTargets.length > 0) {
          await this.powerupAnimations.animateTriplePropeller(centerRow, centerCol, tripleTargets, color);
        }
        break;

      // Other propeller combinations - use propeller flight animation
      case 'propeller+rocket_h':
      case 'propeller+rocket_v':
      case 'bomb+propeller':
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
}
