import { LevelConfig, Objective } from '../types';
import { CONFIG } from '../config';
import { LEVELS } from '../data/levels';

export class Level {
  readonly id: number;
  readonly rows: number;
  readonly cols: number;
  readonly moves: number;
  readonly tileVariety: number;
  readonly objectives: Objective[];
  readonly layout: string[][];

  constructor(config: LevelConfig) {
    this.id = config.id;
    this.rows = config.grid.rows;
    this.cols = config.grid.cols;
    this.moves = config.moves;
    this.tileVariety = config.tileVariety;
    this.layout = config.layout;

    // Initialize objectives with current = 0
    this.objectives = config.objectives.map(obj => ({
      ...obj,
      current: 0,
    }));
  }

  static load(levelId: number): Level {
    const config = LEVELS[levelId];
    if (!config) {
      throw new Error(`Level ${levelId} not found`);
    }
    return new Level(config);
  }

  static exists(levelId: number): boolean {
    return levelId in LEVELS;
  }

  static getTotalLevels(): number {
    return Object.keys(LEVELS).length;
  }

  getAvailableColors(): string[] {
    return CONFIG.TILES.ALL_COLORS.slice(0, this.tileVariety);
  }

  getGrassCount(): number {
    let count = 0;
    for (const row of this.layout) {
      for (const cell of row) {
        if (cell === 'G') count++;
      }
    }
    return count;
  }
}
