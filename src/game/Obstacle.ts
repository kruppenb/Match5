import { Obstacle, ObstacleType, ObstacleBehavior } from '../types';

// Obstacle behavior definitions
const OBSTACLE_BEHAVIORS: Record<ObstacleType, ObstacleBehavior> = {
  grass: {
    canTileMove: true,
    canBeMatched: true,
    blocksTile: false,
    clearedByAdjacent: false,
    isIndestructible: false,
  },
  ice: {
    canTileMove: false,     // Ice blocks cannot be moved
    canBeMatched: false,    // Cannot be matched directly
    blocksTile: true,       // Occupies entire cell (no tile underneath)
    clearedByAdjacent: true, // Cleared by adjacent matches or powerups
    isIndestructible: false,
  },
  chain: {
    canTileMove: false,     // CANNOT be swapped
    canBeMatched: true,     // CAN be matched if adjacent tiles form match
    blocksTile: false,      // Tile exists on top
    clearedByAdjacent: false,
    isIndestructible: false,
  },
  box: {
    canTileMove: false,     // No tile to move
    canBeMatched: false,    // Cannot be matched directly
    blocksTile: true,       // Occupies entire cell
    clearedByAdjacent: true, // Cleared by adjacent matches
    isIndestructible: false,
  },
  stone: {
    canTileMove: false,
    canBeMatched: false,
    blocksTile: true,       // Permanently blocks cell
    clearedByAdjacent: false,
    isIndestructible: true, // Cannot be destroyed
  },
  barrel: {
    canTileMove: false,     // No tile to move
    canBeMatched: false,    // Cannot be matched directly
    blocksTile: true,       // Occupies entire cell
    clearedByAdjacent: true, // Cleared by adjacent matches
    isIndestructible: false,
    // Special: When destroyed, damages adjacent tiles/obstacles (explosion effect)
  },
  ice_bucket: {
    canTileMove: false,     // No tile to move
    canBeMatched: false,    // Cannot be matched directly
    blocksTile: true,       // Occupies entire cell
    clearedByAdjacent: true, // Cleared by adjacent matches
    isIndestructible: false,
    // Special: When destroyed, spawns ice on adjacent cells with tiles
  },
};

export function getObstacleBehavior(type: ObstacleType): ObstacleBehavior {
  return OBSTACLE_BEHAVIORS[type];
}

export function createObstacle(type: ObstacleType, layers: number = 1): Obstacle {
  return {
    type,
    layers,
  };
}

export function createGrass(layers: number = 1): Obstacle {
  // Grass can have 1-2 layers (double grass needs 2 matches to clear)
  return createObstacle('grass', Math.min(Math.max(layers, 1), 2));
}

export function createIce(layers: number = 1): Obstacle {
  // Ice blocks occupy a cell, cleared by adjacent matches
  return createObstacle('ice', Math.min(Math.max(layers, 1), 2));
}

export function createChain(): Obstacle {
  return createObstacle('chain', 1);
}

export function createBox(layers: number = 1): Obstacle {
  // Box can have 1-3 layers
  return createObstacle('box', Math.min(Math.max(layers, 1), 3));
}

export function createStone(): Obstacle {
  return createObstacle('stone', 1);
}

export function createBarrel(layers: number = 1): Obstacle {
  // Barrel can have 1-2 layers, explodes when destroyed
  return createObstacle('barrel', Math.min(Math.max(layers, 1), 2));
}

export function createIceBucket(): Obstacle {
  // Ice bucket spawns ice on adjacent cells when destroyed
  return createObstacle('ice_bucket', 1);
}

export function damageObstacle(obstacle: Obstacle): Obstacle | null {
  const behavior = getObstacleBehavior(obstacle.type);

  // Stone cannot be damaged
  if (behavior.isIndestructible) {
    return obstacle;
  }

  const newLayers = obstacle.layers - 1;
  if (newLayers <= 0) {
    return null; // Obstacle is destroyed
  }
  return {
    ...obstacle,
    layers: newLayers,
  };
}

export function isObstacleCleared(obstacle: Obstacle | null): boolean {
  return obstacle === null || obstacle.layers <= 0;
}

export function canTileMove(obstacle: Obstacle | null): boolean {
  if (!obstacle) return true;
  return getObstacleBehavior(obstacle.type).canTileMove;
}

export function canBeMatched(obstacle: Obstacle | null): boolean {
  if (!obstacle) return true;
  return getObstacleBehavior(obstacle.type).canBeMatched;
}

export function blocksTile(obstacle: Obstacle | null): boolean {
  if (!obstacle) return false;
  return getObstacleBehavior(obstacle.type).blocksTile;
}

export function clearedByAdjacent(obstacle: Obstacle | null): boolean {
  if (!obstacle) return false;
  return getObstacleBehavior(obstacle.type).clearedByAdjacent;
}
