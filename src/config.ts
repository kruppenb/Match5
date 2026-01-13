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
    HEIGHT: 900,
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
        name: 'Bow',
        description: 'Clear an entire row',
        icon: '➡️',
        sprite: 'booster_row_arrow',
        requiresTarget: true,
      },
      col_arrow: {
        name: 'Laser',
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
      { id: 'hammer', name: 'Hammer', description: 'Destroy a single tile', icon: 'hammer', coinCost: 50, category: 'booster', quantity: 1 },
      { id: 'row_arrow', name: 'Bow', description: 'Clear an entire row', icon: 'row_arrow', coinCost: 75, category: 'booster', quantity: 1 },
      { id: 'col_arrow', name: 'Laser', description: 'Clear an entire column', icon: 'col_arrow', coinCost: 75, category: 'booster', quantity: 1 },
      { id: 'shuffle', name: 'Shuffle', description: 'Reshuffle all tiles', icon: 'shuffle', coinCost: 100, category: 'booster', quantity: 1 },
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
      { id: 'stack_sort', name: 'Stack Sort', description: 'Sort colored balls!', diamondCost: 15, icon: 'tubes', isNew: true },
      { id: 'treasure_dig', name: 'Treasure Dig', description: 'Find hidden treasure!', diamondCost: 12, icon: 'shovel', isNew: true },
      { id: 'bridge_builder', name: 'Bridge Builder', description: 'Build the perfect bridge!', diamondCost: 10, icon: 'bridge', isNew: true, isRecommended: true },
      { id: 'pin_pull', name: 'Pin Pull Rescue', description: 'Pull pins to save them!', diamondCost: 12, icon: 'pin', isNew: true },
      { id: 'pipe_connect', name: 'Pipe Connect', description: 'Connect the pipes!', diamondCost: 15, icon: 'pipe', isNew: true },
      { id: 'save_room', name: 'Save the Room', description: 'Make the right choice!', diamondCost: 10, icon: 'hazard', isNew: true },
      { id: 'parking_jam', name: 'Parking Jam', description: 'Unblock the car!', diamondCost: 12, icon: 'car', isNew: true },
      { id: 'slingshot', name: 'Slingshot Knockout', description: 'Knock them all down!', diamondCost: 15, icon: 'slingshot', isNew: true, isRecommended: true },
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
    STARTING_BOOSTERS: {
      hammer: 3,
      row_arrow: 3,
      col_arrow: 3,
      shuffle: 3,
    } as Record<string, number>,
  },

  EFFECTS: {
    BACKGROUND_PARTICLES: {
      ENABLED: true,
      FREQUENCY: 300,           // New particle every 300ms
      MAX_PARTICLES: 25,
      SPEED_MIN: 10,
      SPEED_MAX: 30,
      LIFESPAN: 4000,
      GRAVITY_Y: -15,           // Gentle float upward (negative = up)
    },
    LIGHT_OVERLAY: {
      ENABLED: true,
      PULSE_DURATION: 3000,
      INTENSITY: 0.5,
    },
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
