// Game configuration constants
export const CONFIG = {
  GRID: {
    ROWS: 8,
    COLS: 8,
    TILE_SIZE: 80,
    GAP: 4,
  },

  TILES: {
    COLORS: ['red', 'blue', 'green', 'yellow'], // Default 4 types
    ALL_COLORS: ['red', 'blue', 'green', 'yellow', 'purple', 'orange'], // All available
    DEFAULT_VARIETY: 4,
  },

  MATCH: {
    MIN_MATCH: 3,
    ROCKET_MATCH: 4,
    BOMB_SHAPE_MATCH: 5, // L or T shape
    COLOR_BOMB_MATCH: 5, // 5 in a row
  },

  TIMING: {
    SWAP_DURATION: 200,
    FALL_DURATION: 150,
    CLEAR_DURATION: 300,
    CASCADE_DELAY: 150,
  },

  COLORS: {
    red: 0xff4444,
    blue: 0x4444ff,
    green: 0x44ff44,
    yellow: 0xffff44,
    purple: 0xaa44ff,
    orange: 0xffaa44,
  } as Record<string, number>,

  SCREEN: {
    WIDTH: 500,
    HEIGHT: 844,
  },

  LEVEL: {
    LOW_MOVES_THRESHOLD: 3, // Show warning when <= 3 moves
    BONUS_POINTS_PER_MOVE: 100, // Points for unused moves after win
  },

  UI: {
    HEADER_HEIGHT: 45,
    OBJECTIVE_BAR_HEIGHT: 40,
    OBJECTIVE_ICON_SIZE: 32,
    MOVE_COUNTER_SIZE: 40,
    PADDING: 0,
    COLORS: {
      BACKGROUND: 0x1a1a2e,
      PANEL: 0x2a2a3e,
      TEXT: 0xffffff,
      TEXT_SECONDARY: 0xaaaaaa,
      WARNING: 0xff4444,
      SUCCESS: 0x44ff44,
      GRASS: 0x4a7c23,
      GRASS_DARK: 0x3a6c13,
    },
  },

  SCORE: {
    MATCH_BASE: 10, // Points per tile matched
    CASCADE_MULTIPLIER: 1.5, // Multiplier for cascade matches
    POWERUP_BONUS: 50, // Bonus for creating a powerup
  },

  BOOSTERS: {
    STARTING_COUNT: 1, // How many of each booster players start with per level
    CONFIGS: {
      hammer: {
        name: 'Hammer',
        description: 'Destroy a single tile',
        icon: '🔨',
        sprite: 'booster_hammer',
        requiresTarget: true,
      },
      row_arrow: {
        name: 'Row Arrow',
        description: 'Clear an entire row',
        icon: '➡️',
        sprite: 'booster_row_arrow',
        requiresTarget: true,
      },
      col_arrow: {
        name: 'Column Arrow',
        description: 'Clear an entire column',
        icon: '⬇️',
        sprite: 'booster_col_arrow',
        requiresTarget: true,
      },
      shuffle: {
        name: 'Shuffle',
        description: 'Reshuffle all tiles',
        icon: '🔀',
        sprite: 'booster_shuffle',
        requiresTarget: false,
      },
    } as Record<string, { name: string; description: string; icon: string; sprite: string; requiresTarget: boolean }>,
  },

  META: {
    // Currency rewards - GENEROUS by design!
    COINS: {
      LEVEL_COMPLETE_BASE: 100,
      PER_STAR: 50,
      PERFECT_BONUS: 100,
      FIRST_TIME_BONUS: 200,
      MATCH_3: 5,
      MATCH_4: 15,
      MATCH_5: 30,
      POWERUP_USE: 10,
      PER_COMBO: 20,
      DAILY_LOGIN: 500,
    },
    DIAMONDS: {
      EVERY_5_LEVELS: 10,
      EVERY_10_LEVELS: 25,
      WORLD_COMPLETE: 50,
      PERFECT_WORLD: 100,
      DAILY_LOGIN: 5,
    },

    // Shop items
    SHOP_ITEMS: [
      { id: 'rocket_3pack', name: 'Rocket Pack', description: 'Start with 3 rockets', icon: 'rocket', coinCost: 150, category: 'powerup', quantity: 3 },
      { id: 'bomb_3pack', name: 'Bomb Pack', description: 'Start with 3 bombs', icon: 'bomb', coinCost: 200, category: 'powerup', quantity: 3 },
      { id: 'colorBomb_1', name: 'Color Bomb', description: 'Start with a color bomb', icon: 'colorBomb', coinCost: 250, category: 'powerup', quantity: 1 },
      { id: 'extraMoves_5', name: '+5 Moves', description: '5 extra moves', icon: 'moves', coinCost: 300, category: 'booster', quantity: 1 },
      { id: 'shuffle', name: 'Free Shuffle', description: 'One free shuffle', icon: 'shuffle', coinCost: 100, category: 'booster', quantity: 1 },
      { id: 'hint_3pack', name: 'Hint Pack', description: '3 hints', icon: 'hint', coinCost: 75, category: 'booster', quantity: 3 },
    ],

    // Hero charging levels
    CHARGE_LEVELS: [
      { percentage: 0, coinCost: 0, label: 'No Boost' },
      { percentage: 25, coinCost: 50, label: 'Small Boost' },
      { percentage: 50, coinCost: 100, label: 'Medium Boost' },
      { percentage: 75, coinCost: 175, label: 'Large Boost' },
      { percentage: 100, coinCost: 300, label: 'MAX POWER!' },
    ],

    // Mini-games
    MINI_GAMES: [
      { id: 'spin_wheel', name: 'Spin the Wheel', description: 'Spin for prizes!', diamondCost: 10, icon: 'wheel' },
      { id: 'treasure_hunt', name: 'Treasure Hunt', description: 'Pick 3 chests!', diamondCost: 15, icon: 'chest' },
      { id: 'lucky_match', name: 'Lucky Match', description: 'Match pairs to win!', diamondCost: 20, icon: 'cards' },
    ],
    MINI_GAME_ROTATION_DAYS: 3,

    // Progression events
    EVENT_POINTS: {
      LEVEL_COMPLETE: 20,
      PER_STAR: 10,
      PERFECT_LEVEL: 15,
      PER_POWERUP: 5,
      BIG_COMBO: 10,
    },

    // Starting resources for new players
    STARTING_COINS: 500,
    STARTING_DIAMONDS: 20,
  },

  HERO_POWERS: {
    // Charge rates
    CHARGE_PER_TILE: 2,           // +2% per tile cleared
    CHARGE_PER_CASCADE: 10,       // +10% bonus per cascade level
    CHARGE_PER_POWERUP: 6,        // +6% when powerup activates
    COMBO_MULTIPLIER: 1.5,        // Multiplier for combo chains
    MAX_CHARGE: 100,

    // Hero configurations
    HEROES: {
      thor: {
        hero: 'thor',
        name: 'Thor',
        powerName: 'Lightning Storm',
        description: 'Strikes 5-7 random tiles with lightning',
        icon: '⚡',
        color: 0x6ab0f9,
        spriteKey: 'hero_thor',
      },
      ironman: {
        hero: 'ironman',
        name: 'Iron Man',
        powerName: 'Missile Barrage',
        description: 'Fires 4 missiles with 2x2 explosions',
        icon: '🚀',
        color: 0xff4444,
        spriteKey: 'hero_ironman',
      },
      elsa: {
        hero: 'elsa',
        name: 'Elsa',
        powerName: 'Ice Wave',
        description: 'Freezes and shatters 3 rows or columns',
        icon: '❄️',
        color: 0x87ceeb,
        spriteKey: 'hero_elsa',
      },
    } as Record<string, { hero: string; name: string; powerName: string; description: string; icon: string; color: number; spriteKey: string }>,

    // Power parameters
    THOR_STRIKE_COUNT: { min: 5, max: 7 },
    IRONMAN_MISSILE_COUNT: 4,
    IRONMAN_EXPLOSION_SIZE: 2, // 2x2 area
    ELSA_LINES_COUNT: 3,
  },
};
