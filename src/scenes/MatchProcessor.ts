import Phaser from 'phaser';
import { Grid } from '../game/Grid';
import { GameState } from '../game/GameState';
import { MatchDetector } from '../game/MatchDetector';
import { SpecialObstacleProcessor } from '../game/SpecialObstacleProcessor';
import { getPowerupAffectedPositions } from '../game/powerupUtils';
import { Tile, Obstacle } from '../types';
import { CONFIG } from '../config';
import { ScreenShake } from '../utils/ScreenShake';
import { ParticleManager } from '../utils/ParticleManager';
import { ComboDisplay } from '../utils/ComboDisplay';
import { ScorePopup } from '../utils/ScorePopup';
import { AudioManager } from '../utils/AudioManager';
import { HapticFeedback } from '../utils/HapticFeedback';
import { PowerupAnimations } from './PowerupAnimations';

interface ChargeSource {
  x: number;
  y: number;
  color: number;
}

export interface MatchProcessorCallbacks {
  cellToScreen: (row: number, col: number) => { x: number; y: number };
  getTileSprite: (tileId: string) => Phaser.GameObjects.Container | undefined;
  deleteTileSprite: (tileId: string) => void;
  createTileSprite: (tile: Tile) => void;
  removeObstacleSprite: (row: number, col: number) => void;
  updateObstacleSprite: (row: number, col: number) => void;
  applyGravity: () => Promise<void>;
  activatePowerup: (powerup: Tile, targetColor?: string, alreadyActivated?: Set<string>) => Tile[];
  playPowerupAnimation: (powerup: Tile, color: number) => Promise<void>;
  addHeroCharge: (matchSize: number, cascadeLevel?: number, powerupActivated?: boolean, sources?: ChargeSource[]) => void;
}

export class MatchProcessor {
  private scene: Phaser.Scene;
  private grid: Grid;
  private gameState: GameState;
  private matchDetector: MatchDetector;
  private specialObstacleProcessor: SpecialObstacleProcessor;
  private powerupAnimations: PowerupAnimations;
  private screenShake: ScreenShake;
  private particleManager: ParticleManager;
  private comboDisplay: ComboDisplay;
  private scorePopup: ScorePopup;
  private audioManager: AudioManager;
  private hapticFeedback: HapticFeedback;
  private tileSprites: Map<string, Phaser.GameObjects.Container>;
  private callbacks: MatchProcessorCallbacks;

  constructor(
    scene: Phaser.Scene,
    grid: Grid,
    gameState: GameState,
    matchDetector: MatchDetector,
    specialObstacleProcessor: SpecialObstacleProcessor,
    powerupAnimations: PowerupAnimations,
    screenShake: ScreenShake,
    particleManager: ParticleManager,
    comboDisplay: ComboDisplay,
    scorePopup: ScorePopup,
    audioManager: AudioManager,
    hapticFeedback: HapticFeedback,
    tileSprites: Map<string, Phaser.GameObjects.Container>,
    callbacks: MatchProcessorCallbacks
  ) {
    this.scene = scene;
    this.grid = grid;
    this.gameState = gameState;
    this.matchDetector = matchDetector;
    this.specialObstacleProcessor = specialObstacleProcessor;
    this.powerupAnimations = powerupAnimations;
    this.screenShake = screenShake;
    this.particleManager = particleManager;
    this.comboDisplay = comboDisplay;
    this.scorePopup = scorePopup;
    this.audioManager = audioManager;
    this.hapticFeedback = hapticFeedback;
    this.tileSprites = tileSprites;
    this.callbacks = callbacks;
  }

  async processMatches(): Promise<void> {
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
      await this.callbacks.applyGravity();

      // Small delay between cascades
      await this.wait(CONFIG.TIMING.CASCADE_DELAY);
    }

    console.log(`Cascades complete: ${cascadeCount} total`);
  }

  async clearMatches(matches: any[]): Promise<void> {
    const tilesToClear = new Set<Tile>();
    const powerupsToActivate: Tile[] = [];
    let powerupCreated = false;

    matches.forEach(match => {
      // Collect source positions for flying energy sprites
      const sources: ChargeSource[] = [];
      match.tiles.forEach((tile: Tile) => {
        const pos = this.callbacks.cellToScreen(tile.row, tile.col);
        const color = CONFIG.COLORS[tile.type as keyof typeof CONFIG.COLORS] || 0xffffff;
        sources.push({ x: pos.x, y: pos.y, color });
      });

      // Add hero charge for each match with source positions
      this.callbacks.addHeroCharge(match.tiles.length, 0, false, sources);

      match.tiles.forEach((tile: Tile) => {
        tilesToClear.add(tile);
        // Check if any matched tile is a powerup that needs activation
        if (tile.isPowerup && tile.powerupType) {
          powerupsToActivate.push(tile);
        }
      });
      if (match.powerupType) {
        powerupCreated = true;

        // When creating a powerup, also clear any adjacent gems of the same color
        // that are directly touching the matched tiles (even if not part of the match shape)
        const matchColor = match.tiles[0]?.type;
        const matchedPositions = new Set(match.tiles.map((t: Tile) => `${t.row},${t.col}`));

        match.tiles.forEach((tile: Tile) => {
          // Check 4-directional neighbors
          const neighbors = [
            { row: tile.row - 1, col: tile.col },
            { row: tile.row + 1, col: tile.col },
            { row: tile.row, col: tile.col - 1 },
            { row: tile.row, col: tile.col + 1 },
          ];

          neighbors.forEach(pos => {
            const neighborTile = this.grid.getTile(pos.row, pos.col);
            if (
              neighborTile &&
              neighborTile.type === matchColor &&
              !matchedPositions.has(`${pos.row},${pos.col}`) &&
              !neighborTile.isPowerup
            ) {
              tilesToClear.add(neighborTile);
            }
          });
        });
      }
    });

    // Activate powerups first with animations and collect additional tiles to clear
    // Track already activated powerups to avoid re-activating them in chain reactions
    const alreadyActivated = new Set<string>();
    
    const powerupAnimPromises: Promise<void>[] = [];
    for (const powerup of powerupsToActivate) {
      const color = CONFIG.COLORS[powerup.type as keyof typeof CONFIG.COLORS] || 0xffffff;
      powerupAnimPromises.push(this.callbacks.playPowerupAnimation(powerup, color));
      alreadyActivated.add(powerup.id);
    }
    // Play all powerup animations simultaneously
    if (powerupAnimPromises.length > 0) {
      await Promise.all(powerupAnimPromises);
    }

    // Now collect affected tiles and positions, handling chain reactions
    const powerupAffectedPositions = new Set<string>();
    let currentWave = [...powerupsToActivate];
    
    while (currentWave.length > 0) {
      const nextWave: Tile[] = [];
      
      for (const powerup of currentWave) {
        const additionalTiles = this.callbacks.activatePowerup(powerup, undefined, alreadyActivated);
        
        for (const tile of additionalTiles) {
          tilesToClear.add(tile);
          // Check if this tile is a powerup that hasn't been activated yet
          if (tile.isPowerup && tile.powerupType && !alreadyActivated.has(tile.id)) {
            nextWave.push(tile);
          }
        }
        
        // Also get positions affected by powerups (including cells without tiles like ice blocks)
        const positions = getPowerupAffectedPositions(this.grid, powerup);
        positions.forEach(p => powerupAffectedPositions.add(`${p.row},${p.col}`));
      }
      
      // Play animations for chain-reacted powerups
      if (nextWave.length > 0) {
        const chainAnimPromises: Promise<void>[] = [];
        for (const powerup of nextWave) {
          const color = CONFIG.COLORS[powerup.type as keyof typeof CONFIG.COLORS] || 0xffffff;
          chainAnimPromises.push(this.callbacks.playPowerupAnimation(powerup, color));
          alreadyActivated.add(powerup.id);
        }
        await Promise.all(chainAnimPromises);
      }
      
      currentWave = nextWave;
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
        this.callbacks.removeObstacleSprite(d.row, d.col);
        // Track all cleared obstacles by type for objectives
        adjacentObstaclesClearedByType[d.obstacle.type] = (adjacentObstaclesClearedByType[d.obstacle.type] || 0) + 1;
        // Track special obstacles for their effects
        if (d.obstacle.type === 'barrel' || d.obstacle.type === 'ice_bucket') {
          clearedSpecialObstacles.push({ row: d.row, col: d.col, type: d.obstacle.type });
        }
      } else {
        // Update sprite for reduced layers
        this.callbacks.updateObstacleSprite(d.row, d.col);
      }
    });

    // Handle special obstacle effects
    this.specialObstacleProcessor.processSpecialObstacleEffects(clearedSpecialObstacles, tilesToClear);

    // Clear obstacles at powerup-affected positions (includes cells without tiles like ice blocks)
    const obstaclesClearedByType: Record<string, number> = {};
    powerupAffectedPositions.forEach(key => {
      const [row, col] = key.split(',').map(Number);
      const clearedObstacle = this.grid.clearObstacle(row, col);
      if (clearedObstacle) {
        obstaclesClearedByType[clearedObstacle.type] = (obstaclesClearedByType[clearedObstacle.type] || 0) + 1;
        this.callbacks.removeObstacleSprite(row, col);
      }
    });

    // Also clear obstacles under matched tiles
    tilesToClear.forEach(tile => {
      const clearedObstacle = this.grid.clearObstacle(tile.row, tile.col);
      if (clearedObstacle) {
        obstaclesClearedByType[clearedObstacle.type] = (obstaclesClearedByType[clearedObstacle.type] || 0) + 1;
        this.callbacks.removeObstacleSprite(tile.row, tile.col);
      }
    });

    // Add obstacles cleared from adjacent damage
    for (const [type, count] of Object.entries(adjacentObstaclesClearedByType)) {
      obstaclesClearedByType[type] = (obstaclesClearedByType[type] || 0) + count;
    }

    // Update objective tracker for obstacles cleared
    this.specialObstacleProcessor.updateObstacleObjectives(obstaclesClearedByType);

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
      const pos = this.callbacks.cellToScreen(tile.row, tile.col);
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
          const pos = this.callbacks.cellToScreen(match.powerupPosition.row, match.powerupPosition.col);
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

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
