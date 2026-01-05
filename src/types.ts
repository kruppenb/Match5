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
export type ObstacleType = 'grass' | 'ice' | 'chain' | 'box' | 'stone' | 'barrel' | 'ice_bucket';

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

// Booster types (outside-grid powerups)
export type BoosterType = 'hammer' | 'row_arrow' | 'col_arrow' | 'shuffle';

export interface BoosterInventory {
  hammer: number;
  row_arrow: number;
  col_arrow: number;
  shuffle: number;
}

export interface BoosterConfig {
  type: BoosterType;
  name: string;
  description: string;
  icon: string;
  requiresTarget: boolean; // Does user need to tap a cell?
}

// ==================== META GAME TYPES ====================

// Reward types for mini-games, events, and purchases
export type RewardType = 'coins' | 'diamonds' | 'powerup' | 'booster';

export interface Reward {
  type: RewardType;
  amount: number;
  id?: string; // For powerup/booster types (e.g., 'rocket', 'bomb')
}

// Shop items
export type ShopCategory = 'booster';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  coinCost: number;
  category: ShopCategory;
  quantity: number;
}

// Hero pre-charging
export interface ChargeLevel {
  percentage: number;
  coinCost: number;
  label: string;
}

// Mini-games
export type MiniGameId = 'spin_wheel' | 'treasure_hunt' | 'lucky_match';

export interface MiniGameConfig {
  id: MiniGameId;
  name: string;
  description: string;
  diamondCost: number;
  icon: string;
}

// Progression events
export interface EventCheckpoint {
  pointsRequired: number;
  reward: Reward;
  label: string;
}

export interface ProgressionEvent {
  id: string;
  name: string;
  description: string;
  icon: string;
  duration: number; // Days
  checkpoints: EventCheckpoint[];
  completionBonus: Reward[];
}

// Daily replay bonus data
export interface DailyReplayData {
  lastResetDate: string;
  replaysCompleted: number;
}

// Meta save data
export interface MetaSaveData {
  version: number;
  coins: number;
  diamonds: number;
  inventory: Record<string, number>;
  currentEvent: {
    id: string;
    points: number;
    claimedCheckpoints: number[];
    startDate: string;
  } | null;
  miniGames: {
    lastPlayedDate: Record<string, string>;
    totalPlays: Record<string, number>;
  };
  totalLevelsPlayed: number;
  lastDailyLogin: string | null;
  dailyReplay: DailyReplayData;
}

// Level result for currency/event rewards
export interface LevelResult {
  levelId: number;
  stars: number;
  score: number;
  powerupsUsed: number;
  maxCombo: number;
  isFirstTime: boolean;
}

// ==================== HERO POWER TYPES ====================

export type HeroType = 'thor' | 'ironman' | 'elsa';

export interface HeroPowerConfig {
  hero: HeroType;
  name: string;
  powerName: string;
  description: string;
  icon: string;
  color: number;
  spriteKey: string;
}

export interface HeroPowerBarState {
  currentCharge: number;       // 0-100
  isReady: boolean;            // true when >= 100
  isSelectionOpen: boolean;    // true when popup is showing
  selectedHero: HeroType | null;
  isActivating: boolean;       // true during power activation
}
