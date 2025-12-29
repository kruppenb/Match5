import { Obstacle, ObstacleType } from '../types';

export function createObstacle(type: ObstacleType, layers: number = 1): Obstacle {
  return {
    type,
    layers,
  };
}

export function createGrass(): Obstacle {
  return createObstacle('grass', 1);
}

export function createIce(layers: number = 1): Obstacle {
  return createObstacle('ice', layers);
}

export function damageObstacle(obstacle: Obstacle): Obstacle | null {
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
