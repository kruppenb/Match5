import { Grid } from './Grid';
import { Position } from '../types';
import { getObstacleBehavior } from './Obstacle';

/**
 * Get positions with destructible obstacles (grass, ice, box, barrel, ice_bucket, chain)
 * These should be prioritized by hero powers
 */
export function getDestructibleObstaclePositions(grid: Grid): Position[] {
  const positions: Position[] = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const cell = grid.getCell(row, col);
      if (cell?.obstacle) {
        const behavior = getObstacleBehavior(cell.obstacle.type);
        // Prioritize any destructible obstacle (including grass, ice, chain, box, etc.)
        if (!behavior.isIndestructible) {
          positions.push({ row, col });
        }
      }
    }
  }
  return positions;
}

/**
 * Get positions with tiles (for hero powers that need to clear tiles)
 */
export function getTilePositions(grid: Grid): Position[] {
  const positions: Position[] = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const cell = grid.getCell(row, col);
      if (cell && cell.tile && !cell.blocked) {
        positions.push({ row, col });
      }
    }
  }
  return positions;
}

/**
 * Count obstacles in each row (for Elsa's ice wave targeting)
 */
export function countObstaclesPerRow(grid: Grid): number[] {
  const counts: number[] = [];
  for (let row = 0; row < grid.rows; row++) {
    let count = 0;
    for (let col = 0; col < grid.cols; col++) {
      const cell = grid.getCell(row, col);
      if (cell?.obstacle) {
        const behavior = getObstacleBehavior(cell.obstacle.type);
        if (behavior.blocksTile && !behavior.isIndestructible) {
          count++;
        }
      }
    }
    counts.push(count);
  }
  return counts;
}

/**
 * Count obstacles in each column (for Elsa's ice wave targeting)
 */
export function countObstaclesPerCol(grid: Grid): number[] {
  const counts: number[] = [];
  for (let col = 0; col < grid.cols; col++) {
    let count = 0;
    for (let row = 0; row < grid.rows; row++) {
      const cell = grid.getCell(row, col);
      if (cell?.obstacle) {
        const behavior = getObstacleBehavior(cell.obstacle.type);
        if (behavior.blocksTile && !behavior.isIndestructible) {
          count++;
        }
      }
    }
    counts.push(count);
  }
  return counts;
}

/**
 * Score positions for Iron Man's missile targeting (count obstacles in explosion area)
 */
export function scorePositionsForExplosion(
  grid: Grid,
  explosionSize: number
): { pos: Position; obstacleCount: number }[] {
  const results: { pos: Position; obstacleCount: number }[] = [];

  for (let row = 0; row < grid.rows - (explosionSize - 1); row++) {
    for (let col = 0; col < grid.cols - (explosionSize - 1); col++) {
      let obstacleCount = 0;
      for (let dr = 0; dr < explosionSize; dr++) {
        for (let dc = 0; dc < explosionSize; dc++) {
          const cell = grid.getCell(row + dr, col + dc);
          if (cell?.obstacle) {
            const behavior = getObstacleBehavior(cell.obstacle.type);
            if (behavior.blocksTile && !behavior.isIndestructible) {
              obstacleCount++;
            }
          }
        }
      }
      results.push({ pos: { row, col }, obstacleCount });
    }
  }

  return results;
}

/**
 * Select best lines for Elsa's ice wave (prioritize lines with most obstacles)
 */
export function selectBestLines(
  grid: Grid,
  lineCount: number
): { lines: number[]; isRow: boolean } {
  const rowCounts = countObstaclesPerRow(grid);
  const colCounts = countObstaclesPerCol(grid);

  const totalRowObstacles = rowCounts.reduce((a, b) => a + b, 0);
  const totalColObstacles = colCounts.reduce((a, b) => a + b, 0);

  // Prefer direction with more obstacles
  let useRows: boolean;
  if (totalRowObstacles > totalColObstacles) {
    useRows = true;
  } else if (totalColObstacles > totalRowObstacles) {
    useRows = false;
  } else {
    // When totals are equal, prefer direction with highest single line count
    const maxRowCount = Math.max(...rowCounts);
    const maxColCount = Math.max(...colCounts);
    if (maxRowCount > maxColCount) {
      useRows = true;
    } else if (maxColCount > maxRowCount) {
      useRows = false;
    } else {
      // Still tied - prefer rows as a deterministic tiebreaker
      useRows = true;
    }
  }

  const obstacleCounts = useRows ? rowCounts : colCounts;
  const maxLines = useRows ? grid.rows : grid.cols;

  // Sort lines by obstacle count (descending)
  const linesWithCounts = Array.from({ length: maxLines }, (_, i) => ({
    index: i,
    count: obstacleCounts[i],
  }));
  linesWithCounts.sort((a, b) => b.count - a.count);

  const selectedLines = linesWithCounts
    .slice(0, Math.min(lineCount, maxLines))
    .map(l => l.index);

  return { lines: selectedLines, isRow: useRows };
}

/**
 * Damage obstacles at given positions and return cleared counts by type
 */
export function damageObstaclesAt(
  grid: Grid,
  positions: Position[]
): { clearedByType: Record<string, number>; damagedPositions: Position[]; clearedPositions: Position[] } {
  const clearedByType: Record<string, number> = {};
  const damagedPositions: Position[] = [];
  const clearedPositions: Position[] = [];

  for (const pos of positions) {
    const cell = grid.getCell(pos.row, pos.col);
    if (!cell?.obstacle) continue;

    // Skip indestructible obstacles
    const behavior = getObstacleBehavior(cell.obstacle.type);
    if (behavior.isIndestructible) continue;

    const obstacleType = cell.obstacle.type;
    const clearedObstacle = grid.clearObstacle(pos.row, pos.col);

    if (clearedObstacle) {
      // Fully destroyed
      clearedByType[obstacleType] = (clearedByType[obstacleType] || 0) + 1;
      clearedPositions.push(pos);
    } else if (cell.obstacle) {
      // Just damaged
      damagedPositions.push(pos);
    }
  }

  return { clearedByType, damagedPositions, clearedPositions };
}

/**
 * Select strike positions for Thor (prioritize obstacles, fill with tiles)
 */
export function selectThorStrikePositions(
  grid: Grid,
  strikeCount: number
): Position[] {
  const obstaclePositions = getDestructibleObstaclePositions(grid);
  const tilePositions = getTilePositions(grid);

  // Shuffle both lists
  const shuffledObstacles = [...obstaclePositions].sort(() => Math.random() - 0.5);
  const shuffledTiles = [...tilePositions].sort(() => Math.random() - 0.5);

  // Prioritize obstacles
  const obstacleStrikeCount = Math.min(strikeCount, shuffledObstacles.length);
  const tileStrikeCount = Math.min(strikeCount - obstacleStrikeCount, shuffledTiles.length);

  return [
    ...shuffledObstacles.slice(0, obstacleStrikeCount),
    ...shuffledTiles.slice(0, tileStrikeCount),
  ];
}

/**
 * Select missile target positions for Iron Man (prioritize obstacle clusters)
 */
export function selectIronManTargets(
  grid: Grid,
  missileCount: number,
  explosionSize: number
): Position[] {
  const scoredPositions = scorePositionsForExplosion(grid, explosionSize);

  // Sort by obstacle count (descending)
  scoredPositions.sort((a, b) => b.obstacleCount - a.obstacleCount);

  const targetPositions: Position[] = [];
  const usedPositions: Set<string> = new Set();

  // Pick positions with most obstacles first
  for (const { pos } of scoredPositions) {
    if (targetPositions.length >= missileCount) break;
    const key = `${pos.row},${pos.col}`;
    if (!usedPositions.has(key)) {
      targetPositions.push(pos);
      usedPositions.add(key);
    }
  }

  return targetPositions;
}
