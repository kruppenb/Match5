import { Grid } from './Grid';
import { Tile, Position } from '../types';

// Result type for propeller which includes target position for animation
export interface PropellerResult {
  affected: Tile[];
  targetPosition?: Position;
}

export function activatePowerup(grid: Grid, powerup: Tile, targetColor?: string, alreadyActivated: Set<string> = new Set()): Tile[] {
  if (!powerup || !powerup.powerupType) return [];

  // Prevent infinite loops - don't activate the same powerup twice
  if (alreadyActivated.has(powerup.id)) {
    return [];
  }
  alreadyActivated.add(powerup.id);

  const affected: Tile[] = [];

  switch (powerup.powerupType) {
    case 'rocket_h':
      for (let col = 0; col < grid.cols; col++) {
        const tile = grid.getTile(powerup.row, col);
        if (tile && tile.id !== powerup.id) affected.push(tile);
      }
      break;

    case 'rocket_v':
      for (let row = 0; row < grid.rows; row++) {
        const tile = grid.getTile(row, powerup.col);
        if (tile && tile.id !== powerup.id) affected.push(tile);
      }
      break;

    case 'bomb':
      // 5x5 area (radius 2)
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const tile = grid.getTile(powerup.row + dr, powerup.col + dc);
          if (tile && tile.id !== powerup.id) affected.push(tile);
        }
      }
      break;

    case 'color_bomb':
      let chosenColor = targetColor ?? powerup.type;

      if (!chosenColor) {
        const allColors = new Set<string>();
        grid.forEachCell(cell => {
          if (cell.tile && !cell.tile.isPowerup) allColors.add(cell.tile.type);
        });
        if (allColors.size > 0) {
          const colorsArray = Array.from(allColors);
          chosenColor = colorsArray[Math.floor(Math.random() * colorsArray.length)];
        }
      }

      if (chosenColor) {
        grid.forEachCell(cell => {
          if (cell.tile && cell.tile.type === chosenColor && cell.tile.id !== powerup.id) {
            affected.push(cell.tile);
          }
        });
      }
      break;

    case 'propeller':
      // Propeller: Clear adjacent tiles on takeoff, then fly to target
      const propellerResult = activatePropeller(grid, powerup, alreadyActivated);
      propellerResult.affected.forEach(t => affected.push(t));
      break;
  }

  // Chain reaction: if any affected tiles are powerups, activate them too
  const chained = affected.filter(t => t.isPowerup && t.powerupType && !alreadyActivated.has(t.id));
  for (const c of chained) {
    const more = activatePowerup(grid, c, undefined, alreadyActivated);
    more.forEach(m => { if (!affected.includes(m)) affected.push(m); });
  }

  return affected;
}

// Propeller activation with smart targeting
function activatePropeller(grid: Grid, powerup: Tile, alreadyActivated: Set<string>): PropellerResult {
  const affected: Tile[] = [];

  // 1. Clear adjacent tiles on takeoff (3x3 around propeller)
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue; // Skip the propeller itself
      const tile = grid.getTile(powerup.row + dr, powerup.col + dc);
      if (tile && tile.id !== powerup.id) {
        affected.push(tile);
      }
    }
  }

  // 2. Find a smart target (prioritize obstacles like grass)
  const target = findPropellerTarget(grid, powerup, affected);

  if (target) {
    // 3. Clear target and its neighbors (3x3 around target)
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const tile = grid.getTile(target.row + dr, target.col + dc);
        if (tile && tile.id !== powerup.id && !affected.includes(tile)) {
          affected.push(tile);
        }
      }
    }
  }

  // Chain reaction for any powerups in affected tiles
  const chained = affected.filter(t => t.isPowerup && t.powerupType && !alreadyActivated.has(t.id));
  for (const c of chained) {
    const more = activatePowerup(grid, c, undefined, alreadyActivated);
    more.forEach(m => { if (!affected.includes(m)) affected.push(m); });
  }

  return { affected, targetPosition: target ?? undefined };
}

// Find the best target for propeller (prioritizes obstacles/objectives)
function findPropellerTarget(grid: Grid, powerup: Tile, alreadyAffected: Tile[]): Position | null {
  const affectedIds = new Set(alreadyAffected.map(t => t.id));
  affectedIds.add(powerup.id);

  // Priority 1: Cells with obstacles (grass, ice, etc.)
  const obstacleTargets: Position[] = [];
  grid.forEachCell(cell => {
    if (cell.obstacle && cell.tile && !affectedIds.has(cell.tile.id)) {
      obstacleTargets.push({ row: cell.row, col: cell.col });
    }
  });

  if (obstacleTargets.length > 0) {
    // Pick a random obstacle target
    return obstacleTargets[Math.floor(Math.random() * obstacleTargets.length)];
  }

  // Priority 2: Any tile not already affected
  const remainingTiles: Position[] = [];
  grid.forEachCell(cell => {
    if (cell.tile && !affectedIds.has(cell.tile.id)) {
      remainingTiles.push({ row: cell.row, col: cell.col });
    }
  });

  if (remainingTiles.length > 0) {
    return remainingTiles[Math.floor(Math.random() * remainingTiles.length)];
  }

  return null;
}

// Export helper for getting propeller target (useful for animation)
export function getPropellerTarget(grid: Grid, powerup: Tile): Position | null {
  return findPropellerTarget(grid, powerup, []);
}
