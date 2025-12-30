import { Grid } from './Grid';
import { Tile, Position } from '../types';

// Result type for propeller which includes target position for animation
export interface PropellerResult {
  affected: Tile[];
  targetPosition?: Position;
}

// Store for pre-calculated propeller targets (set before activation, used during activation)
const propellerTargetCache: Map<string, Position | null> = new Map();

// Set a pre-calculated target for a propeller (call this before activating)
export function setPropellerTarget(powerupId: string, target: Position | null): void {
  propellerTargetCache.set(powerupId, target);
}

// Get and clear a pre-calculated target
function getAndClearPropellerTarget(powerupId: string): Position | null | undefined {
  if (propellerTargetCache.has(powerupId)) {
    const target = propellerTargetCache.get(powerupId);
    propellerTargetCache.delete(powerupId);
    return target;
  }
  return undefined; // undefined means no cached target, so calculate one
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

  // 1. Clear adjacent tiles around the propeller's starting position (where it spins)
  const adjacentOffsets = [
    { dr: -1, dc: 0 },  // up
    { dr: 1, dc: 0 },   // down
    { dr: 0, dc: -1 },  // left
    { dr: 0, dc: 1 },   // right
  ];
  for (const offset of adjacentOffsets) {
    const tile = grid.getTile(powerup.row + offset.dr, powerup.col + offset.dc);
    if (tile && tile.id !== powerup.id && !affected.includes(tile)) {
      affected.push(tile);
    }
  }

  // 2. Get the target - use cached target if available, otherwise calculate
  const affectedIds = new Set(affected.map(t => t.id));
  affectedIds.add(powerup.id);
  
  const cachedTarget = getAndClearPropellerTarget(powerup.id);
  const target = cachedTarget !== undefined ? cachedTarget : findPropellerTarget(grid, powerup, affected);

  // 3. Clear just the single tile at the target
  if (target) {
    const targetTile = grid.getTile(target.row, target.col);
    if (targetTile && !affectedIds.has(targetTile.id)) {
      affected.push(targetTile);
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
  // Get adjacent tiles that would be cleared first
  const adjacentTiles: Tile[] = [];
  const adjacentOffsets = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];
  for (const offset of adjacentOffsets) {
    const tile = grid.getTile(powerup.row + offset.dr, powerup.col + offset.dc);
    if (tile && tile.id !== powerup.id) {
      adjacentTiles.push(tile);
    }
  }
  return findPropellerTarget(grid, powerup, adjacentTiles);
}

// Export helper to get propeller target for animation (simplified - just returns main target)
export function getPropellerTargets(grid: Grid, powerup: Tile): { main: Position | null; bonus: Position | null } {
  const mainTarget = getPropellerTarget(grid, powerup);
  // No bonus target in the new propeller logic
  return { main: mainTarget, bonus: null };
}

// Check if two powerups can be combined
export function canCombinePowerups(powerup1: Tile, powerup2: Tile): boolean {
  return powerup1.isPowerup && powerup2.isPowerup &&
         powerup1.powerupType !== undefined && powerup2.powerupType !== undefined;
}

// Combine two powerups for enhanced effects
export function combinePowerups(
  grid: Grid,
  powerup1: Tile,
  powerup2: Tile,
  alreadyActivated: Set<string> = new Set()
): Tile[] {
  if (!canCombinePowerups(powerup1, powerup2)) {
    return [];
  }

  alreadyActivated.add(powerup1.id);
  alreadyActivated.add(powerup2.id);

  const affected: Tile[] = [];
  const type1 = powerup1.powerupType!;
  const type2 = powerup2.powerupType!;

  // Sort types for consistent matching
  const types = [type1, type2].sort();
  const comboKey = types.join('+');

  // Use the position of the first powerup as the center
  const centerRow = powerup1.row;
  const centerCol = powerup1.col;

  switch (comboKey) {
    // Rocket + Rocket = Cross blast (clears row AND column)
    case 'rocket_h+rocket_h':
    case 'rocket_h+rocket_v':
    case 'rocket_v+rocket_v':
      // Clear entire row
      for (let col = 0; col < grid.cols; col++) {
        const tile = grid.getTile(centerRow, col);
        if (tile && !alreadyActivated.has(tile.id)) affected.push(tile);
      }
      // Clear entire column
      for (let row = 0; row < grid.rows; row++) {
        const tile = grid.getTile(row, centerCol);
        if (tile && !alreadyActivated.has(tile.id) && !affected.includes(tile)) affected.push(tile);
      }
      break;

    // Bomb + Bomb = 7x7 explosion
    case 'bomb+bomb':
      for (let dr = -3; dr <= 3; dr++) {
        for (let dc = -3; dc <= 3; dc++) {
          const tile = grid.getTile(centerRow + dr, centerCol + dc);
          if (tile && !alreadyActivated.has(tile.id)) affected.push(tile);
        }
      }
      break;

    // Rocket + Bomb = 3-row AND 3-column clear
    case 'bomb+rocket_h':
    case 'bomb+rocket_v':
      // Clear 3 rows
      for (let dr = -1; dr <= 1; dr++) {
        for (let col = 0; col < grid.cols; col++) {
          const tile = grid.getTile(centerRow + dr, col);
          if (tile && !alreadyActivated.has(tile.id)) affected.push(tile);
        }
      }
      // Clear 3 columns
      for (let dc = -1; dc <= 1; dc++) {
        for (let row = 0; row < grid.rows; row++) {
          const tile = grid.getTile(row, centerCol + dc);
          if (tile && !alreadyActivated.has(tile.id) && !affected.includes(tile)) affected.push(tile);
        }
      }
      break;

    // Color Bomb + Rocket = All tiles of a color become rockets and detonate
    case 'color_bomb+rocket_h':
    case 'color_bomb+rocket_v':
      const rocketColor = type1 === 'color_bomb' ? powerup2.type : powerup1.type;
      const rocketDirection = type1.includes('rocket') ? type1 : type2;
      grid.forEachCell(cell => {
        if (cell.tile && cell.tile.type === rocketColor && !alreadyActivated.has(cell.tile.id)) {
          affected.push(cell.tile);
          // Clear the entire row or column for each matching tile
          if (rocketDirection === 'rocket_h' || rocketDirection.includes('rocket_h')) {
            for (let col = 0; col < grid.cols; col++) {
              const t = grid.getTile(cell.row, col);
              if (t && !alreadyActivated.has(t.id) && !affected.includes(t)) affected.push(t);
            }
          } else {
            for (let row = 0; row < grid.rows; row++) {
              const t = grid.getTile(row, cell.col);
              if (t && !alreadyActivated.has(t.id) && !affected.includes(t)) affected.push(t);
            }
          }
        }
      });
      break;

    // Color Bomb + Bomb = All tiles of a color explode with 3x3
    case 'bomb+color_bomb':
      const bombColor = type1 === 'color_bomb' ? powerup2.type : powerup1.type;
      const colorTilePositions: Position[] = [];
      grid.forEachCell(cell => {
        if (cell.tile && cell.tile.type === bombColor && !alreadyActivated.has(cell.tile.id)) {
          affected.push(cell.tile);
          colorTilePositions.push({ row: cell.row, col: cell.col });
        }
      });
      // Explode 3x3 around each colored tile
      for (const pos of colorTilePositions) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const tile = grid.getTile(pos.row + dr, pos.col + dc);
            if (tile && !alreadyActivated.has(tile.id) && !affected.includes(tile)) affected.push(tile);
          }
        }
      }
      break;

    // Color Bomb + Color Bomb = Clear entire board
    case 'color_bomb+color_bomb':
      grid.forEachCell(cell => {
        if (cell.tile && !alreadyActivated.has(cell.tile.id)) {
          affected.push(cell.tile);
        }
      });
      break;

    // Propeller + Rocket = Propeller flies to obstacle, then clears row/column
    case 'propeller+rocket_h':
    case 'propeller+rocket_v':
      // Check for cached target first (set by animation system)
      let propTarget = getAndClearPropellerTarget(powerup1.id) ?? findPropellerTarget(grid, powerup1, []);
      if (propTarget) {
        // Clear 3x3 at target
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const tile = grid.getTile(propTarget.row + dr, propTarget.col + dc);
            if (tile && !alreadyActivated.has(tile.id)) affected.push(tile);
          }
        }
        // Also clear row or column from target
        const isHorizontal = type1 === 'rocket_h' || type2 === 'rocket_h';
        if (isHorizontal) {
          for (let col = 0; col < grid.cols; col++) {
            const tile = grid.getTile(propTarget.row, col);
            if (tile && !alreadyActivated.has(tile.id) && !affected.includes(tile)) affected.push(tile);
          }
        } else {
          for (let row = 0; row < grid.rows; row++) {
            const tile = grid.getTile(row, propTarget.col);
            if (tile && !alreadyActivated.has(tile.id) && !affected.includes(tile)) affected.push(tile);
          }
        }
      }
      break;

    // Propeller + Bomb = Propeller flies to obstacle, then 5x5 explosion
    case 'bomb+propeller':
      // Check for cached target first (set by animation system)
      const propBombTarget = getAndClearPropellerTarget(powerup1.id) ?? findPropellerTarget(grid, powerup1, []);
      if (propBombTarget) {
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const tile = grid.getTile(propBombTarget.row + dr, propBombTarget.col + dc);
            if (tile && !alreadyActivated.has(tile.id)) affected.push(tile);
          }
        }
      }
      break;

    // Propeller + Color Bomb = 3 propellers target obstacles
    case 'color_bomb+propeller':
      // Find 3 obstacle targets and clear 3x3 around each
      const obstacleTargets: Position[] = [];
      grid.forEachCell(cell => {
        if (cell.obstacle && cell.tile) {
          obstacleTargets.push({ row: cell.row, col: cell.col });
        }
      });
      // Pick up to 3 random targets
      const shuffled = obstacleTargets.sort(() => Math.random() - 0.5);
      const targets = shuffled.slice(0, 3);
      // If no obstacles, pick random tiles
      if (targets.length === 0) {
        grid.forEachCell(cell => {
          if (cell.tile && !alreadyActivated.has(cell.tile.id)) {
            targets.push({ row: cell.row, col: cell.col });
          }
        });
        targets.splice(3);
      }
      for (const target of targets) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const tile = grid.getTile(target.row + dr, target.col + dc);
            if (tile && !alreadyActivated.has(tile.id) && !affected.includes(tile)) affected.push(tile);
          }
        }
      }
      break;

    // Propeller + Propeller = 2 propellers targeting different obstacles
    case 'propeller+propeller':
      // Check for cached main target (set by animation system)
      const cachedMainTarget = getAndClearPropellerTarget(powerup1.id);
      const cachedBonusTarget = getAndClearPropellerTarget(powerup2.id);
      
      const propTargets: Position[] = [];
      if (cachedMainTarget) propTargets.push(cachedMainTarget);
      if (cachedBonusTarget) propTargets.push(cachedBonusTarget);
      
      // Only calculate targets if none were cached
      if (propTargets.length === 0) {
        const candidateTargets: Position[] = [];
        grid.forEachCell(cell => {
          if (cell.obstacle && cell.tile) {
            candidateTargets.push({ row: cell.row, col: cell.col });
          }
        });
        const shuffledTargets = candidateTargets.sort(() => Math.random() - 0.5).slice(0, 2);
        // Fallback to any tiles
        if (shuffledTargets.length === 0) {
          grid.forEachCell(cell => {
            if (cell.tile && !alreadyActivated.has(cell.tile.id)) {
              shuffledTargets.push({ row: cell.row, col: cell.col });
            }
          });
          shuffledTargets.splice(2);
        }
        propTargets.push(...shuffledTargets);
      }
      
      for (const target of propTargets) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const tile = grid.getTile(target.row + dr, target.col + dc);
            if (tile && !alreadyActivated.has(tile.id) && !affected.includes(tile)) affected.push(tile);
          }
        }
      }
      break;

    default:
      // Fallback: activate both powerups individually
      const more1 = activatePowerup(grid, powerup1, undefined, alreadyActivated);
      const more2 = activatePowerup(grid, powerup2, undefined, alreadyActivated);
      more1.forEach(t => { if (!affected.includes(t)) affected.push(t); });
      more2.forEach(t => { if (!affected.includes(t)) affected.push(t); });
      break;
  }

  // Chain reactions for any powerups in affected tiles
  const chained = affected.filter(t => t.isPowerup && t.powerupType && !alreadyActivated.has(t.id));
  for (const c of chained) {
    const more = activatePowerup(grid, c, undefined, alreadyActivated);
    more.forEach(m => { if (!affected.includes(m)) affected.push(m); });
  }

  return affected;
}
