// Core game types

export interface Position {
  row: number;
  col: number;
}

// Powerup types
export type PowerupType = 'rocket_h' | 'rocket_v' | 'bomb' | 'color_bomb' | 'propeller';

export interface Tile {
  id: string;
  type: string; // 'red', 'blue', etc.
  row: number;
  col: number;
  isPowerup: boolean;
  powerupType?: PowerupType;
  sprite?: Phaser.GameObjects.Sprite;
}

// Obstacle types
export type ObstacleType = 'grass' | 'ice' | 'chain' | 'box' | 'stone';

export interface Obstacle {
  type: ObstacleType;
  layers: number; // For ice (1-2), box (1-3)
}

// Obstacle behavior helpers
export interface ObstacleBehavior {
  canTileMove: boolean;     // Can the tile be swapped? (false for chain)
  canBeMatched: boolean;    // Can participate in matches? (true for chain, ice)
  blocksTile: boolean;      // Does it block tile placement? (true for box, stone)
  clearedByAdjacent: boolean; // Cleared by adjacent matches? (true for box)
  isIndestructible: boolean;  // Cannot be destroyed? (true for stone)
}

export interface Cell {
  row: number;
  col: number;
  tile: Tile | null;
  blocked: boolean;
  obstacle: Obstacle | null;
}

export interface Match {
  tiles: Tile[];
  type: 'horizontal' | 'vertical' | 'L' | 'T' | 'square';
  powerupType?: PowerupType;
  powerupPosition?: Position;
}

export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

// Objective types
export type ObjectiveType = 'clear_grass' | 'clear_ice' | 'clear_boxes' | 'clear_chains' | 'collect' | 'score';

export interface Objective {
  type: ObjectiveType;
  target: number;
  current: number;
  tileType?: string; // For 'collect' objectives
}

// Level configuration
export interface LevelConfig {
  id: number;
  grid: {
    rows: number;
    cols: number;
  };
  moves: number;
  tileVariety: number; // Number of tile types (3-6)
  objectives: Omit<Objective, 'current'>[]; // current is added at runtime
  layout: string[][]; // 2D array with cell codes
}

// Game progress
export interface GameProgress {
  completedLevels: number[];
  highestLevel: number;
  levelStars: Record<number, number>; // levelId -> stars (1-3)
}

// Game status
export type GameStatus = 'playing' | 'won' | 'lost' | 'paused';
