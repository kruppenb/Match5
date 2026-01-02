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
};
