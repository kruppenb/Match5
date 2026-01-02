/**
 * Ice Placement Validator
 *
 * Analyzes level layouts for ice placement issues and suggests improvements.
 *
 * Ice placement rules:
 * 1. BRUTAL (avoid): Ice in top row blocks tile spawning - very frustrating
 * 2. HARD: Ice with no adjacent gems - must use boosters/powerups to clear
 * 3. FAIR: Ice adjacent to gems - can be cleared through normal matching
 *
 * Difficulty guidelines:
 * - Easy levels (1-10): No ice, or ice only adjacent to gems (never in top row)
 * - Medium levels (11-25): Ice can be isolated but NEVER in top row
 * - Hard levels (26-40): Some isolated ice allowed, still avoid top row
 * - Expert levels (41+): Can have ice in top row but sparingly (1-2 per column max)
 */

export interface IcePlacementIssue {
  row: number;
  col: number;
  code: 'I' | 'D';
  severity: 'brutal' | 'hard' | 'fair';
  reason: string;
}

export interface IcePlacementAnalysis {
  valid: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | 'brutal';
  issues: IcePlacementIssue[];
  suggestions: string[];
  stats: {
    totalIce: number;
    topRowIce: number;
    topHalfIce: number;
    blockedColumns: number;
    isolatedIce: number;
    adjacentIce: number;
    doubleIce: number;
  };
}

// Layout codes that block tiles (ice-like obstacles)
const ICE_CODES = new Set(['I', 'D']);
// Layout codes that have tiles (can be matched adjacent to ice)
const TILE_CODES = new Set(['.', 'G', 'H', 'R', 'V', 'B', 'C', 'P']);
// Layout codes that block everything
const BLOCKER_CODES = new Set(['X', 'S']);

/**
 * Check if a cell has a tile (not blocked, not ice/box)
 */
function hasTile(code: string): boolean {
  return TILE_CODES.has(code);
}

/**
 * Check if a cell is ice
 */
function isIce(code: string): boolean {
  return ICE_CODES.has(code);
}

/**
 * Check if ice at (row, col) is adjacent to any tile
 */
function isAdjacentToTile(layout: string[][], row: number, col: number): boolean {
  const rows = layout.length;
  const cols = layout[0]?.length ?? 0;

  const adjacentOffsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (const [dr, dc] of adjacentOffsets) {
    const newRow = row + dr;
    const newCol = col + dc;

    if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
      const adjCode = layout[newRow][newCol];
      if (hasTile(adjCode)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Count how many rows of ice are stacked in a column starting from the top
 * Useful for detecting "ice walls" that completely block spawning
 */
export function countTopIceStack(layout: string[][], col: number): number {
  let count = 0;
  for (let row = 0; row < layout.length; row++) {
    const code = layout[row]?.[col];
    if (isIce(code)) {
      count++;
    } else if (!BLOCKER_CODES.has(code)) {
      // Found a non-ice, non-blocker cell - stop counting
      break;
    }
    // If blocker (X, S), continue counting past it
  }
  return count;
}

/**
 * Check if a column has ice blocking spawning in the top half
 * Returns the row of the highest ice block, or -1 if no blocking ice
 */
function getHighestIceInColumn(layout: string[][], col: number): number {
  const rows = layout.length;
  for (let row = 0; row < rows; row++) {
    const code = layout[row]?.[col];
    if (isIce(code)) {
      return row;
    }
  }
  return -1;
}

/**
 * Count columns that have ice blocking spawning (ice in top half)
 */
function countBlockedColumns(layout: string[][]): { blocked: number; total: number; blockedCols: number[] } {
  const rows = layout.length;
  const cols = layout[0]?.length ?? 0;
  const topHalf = Math.floor(rows / 2);
  const blockedCols: number[] = [];

  for (let col = 0; col < cols; col++) {
    const highestIce = getHighestIceInColumn(layout, col);
    if (highestIce >= 0 && highestIce < topHalf) {
      blockedCols.push(col);
    }
  }

  return { blocked: blockedCols.length, total: cols, blockedCols };
}

/**
 * Analyze ice placement in a level layout
 */
export function analyzeIcePlacement(layout: string[][]): IcePlacementAnalysis {
  const issues: IcePlacementIssue[] = [];
  const rows = layout.length;
  const cols = layout[0]?.length ?? 0;
  const topHalf = Math.floor(rows / 2);

  const stats = {
    totalIce: 0,
    topRowIce: 0,
    topHalfIce: 0,
    blockedColumns: 0,
    isolatedIce: 0,
    adjacentIce: 0,
    doubleIce: 0,
  };

  // Analyze blocked columns first
  const blockedInfo = countBlockedColumns(layout);
  stats.blockedColumns = blockedInfo.blocked;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const code = layout[row][col];

      if (!isIce(code)) continue;

      stats.totalIce++;
      if (code === 'D') stats.doubleIce++;
      if (row === 0) stats.topRowIce++;
      if (row < topHalf) stats.topHalfIce++;

      const isAdjacent = isAdjacentToTile(layout, row, col);

      if (isAdjacent) {
        stats.adjacentIce++;
      } else {
        stats.isolatedIce++;
      }

      // Check for ice in top half blocking spawns (brutal if blocks too many columns)
      if (row < topHalf) {
        // This ice is blocking its column from spawning
        const highestInCol = getHighestIceInColumn(layout, col);
        if (highestInCol === row) {
          // This is the highest ice in the column - it's the blocker
          const severity = row === 0 ? 'brutal' : (blockedInfo.blocked > cols / 2 ? 'brutal' : 'hard');
          issues.push({
            row,
            col,
            code: code as 'I' | 'D',
            severity,
            reason: row === 0
              ? `Ice at top row (${row}, ${col}) completely blocks spawning in column ${col}`
              : `Ice at (${row}, ${col}) blocks spawning in column ${col} - ${blockedInfo.blocked}/${cols} columns blocked`,
          });
        }
      }
      // Check for isolated ice (hard but fair for later levels)
      else if (!isAdjacent) {
        issues.push({
          row,
          col,
          code: code as 'I' | 'D',
          severity: 'hard',
          reason: `Ice at (${row}, ${col}) is not adjacent to any gems - requires boosters/powerups`,
        });
      }
    }
  }

  // Determine overall difficulty based on blocked columns
  let difficulty: 'easy' | 'medium' | 'hard' | 'brutal' = 'easy';

  if (blockedInfo.blocked > cols / 2) {
    // More than half the columns blocked = brutal
    difficulty = 'brutal';
  } else if (stats.topRowIce > 0) {
    // Any row 0 ice is brutal
    difficulty = 'brutal';
  } else if (blockedInfo.blocked > 0) {
    // Some columns blocked in top half = hard
    difficulty = 'hard';
  } else if (stats.isolatedIce > stats.adjacentIce) {
    difficulty = 'hard';
  } else if (stats.isolatedIce > 0) {
    difficulty = 'medium';
  } else if (stats.totalIce > 0) {
    difficulty = 'easy'; // All ice is adjacent to gems and in bottom half
  }

  // Generate suggestions
  const suggestions: string[] = [];

  if (blockedInfo.blocked > 0) {
    suggestions.push(
      `${blockedInfo.blocked}/${cols} columns have ice in top half blocking spawns. ` +
      `Move ice to row ${topHalf}+ in columns: ${blockedInfo.blockedCols.join(', ')}`
    );
  }

  if (stats.topRowIce > 0) {
    suggestions.push(`Move ${stats.topRowIce} ice blocks from row 0 - this completely blocks spawning`);
  }

  if (stats.isolatedIce > 0 && stats.isolatedIce > stats.adjacentIce) {
    suggestions.push(`Consider adding gems adjacent to isolated ice blocks to make the level more fair`);
  }

  if (stats.doubleIce > stats.totalIce / 2) {
    suggestions.push(`High ratio of double ice (${stats.doubleIce}/${stats.totalIce}) - consider mixing with single ice`);
  }

  return {
    valid: difficulty !== 'brutal',
    difficulty,
    issues,
    suggestions,
    stats,
  };
}

/**
 * Validate ice placement for a given difficulty level
 */
export function validateIceForDifficulty(
  layout: string[][],
  levelId: number
): { valid: boolean; errors: string[] } {
  const analysis = analyzeIcePlacement(layout);
  const cols = layout[0]?.length ?? 0;
  const errors: string[] = [];

  // Easy levels (1-10): No ice in top half, no isolated ice
  if (levelId <= 10) {
    if (analysis.stats.topHalfIce > 0) {
      errors.push(`Level ${levelId} is easy - ice should be in bottom half only (row 4+ for 8-row grid)`);
    }
    if (analysis.stats.isolatedIce > 0) {
      errors.push(`Level ${levelId} is easy - all ice should be adjacent to gems`);
    }
  }
  // Medium levels (11-25): No ice blocking more than 1/4 of columns
  else if (levelId <= 25) {
    if (analysis.stats.blockedColumns > Math.ceil(cols / 4)) {
      errors.push(`Level ${levelId} is medium - max ${Math.ceil(cols / 4)} columns can have ice in top half, found ${analysis.stats.blockedColumns}`);
    }
    if (analysis.stats.topRowIce > 0) {
      errors.push(`Level ${levelId} is medium - ice should not be in row 0`);
    }
  }
  // Hard levels (26-40): No ice blocking more than 1/2 of columns
  else if (levelId <= 40) {
    if (analysis.stats.blockedColumns > Math.ceil(cols / 2)) {
      errors.push(`Level ${levelId} is hard - max ${Math.ceil(cols / 2)} columns can have ice in top half, found ${analysis.stats.blockedColumns}`);
    }
    if (analysis.stats.topRowIce > 2) {
      errors.push(`Level ${levelId} is hard - limit row 0 ice to corners only (max 2)`);
    }
  }
  // Expert levels (41+): More lenient but still warn about brutal patterns
  else {
    if (analysis.stats.blockedColumns > cols - 2) {
      errors.push(`Level ${levelId} needs at least 2 unblocked columns for spawning, found ${cols - analysis.stats.blockedColumns}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Suggest safe positions for ice placement based on level difficulty
 */
export function suggestIcePositions(
  layout: string[][],
  levelId: number,
  count: number
): { row: number; col: number }[] {
  const rows = layout.length;
  const cols = layout[0]?.length ?? 0;
  const suggestions: { row: number; col: number; score: number }[] = [];

  // Determine minimum row based on difficulty
  let minRow = 2; // Default: avoid top 2 rows
  if (levelId <= 10) {
    minRow = 3; // Easy: avoid top 3 rows
  } else if (levelId <= 25) {
    minRow = 2; // Medium: avoid top 2 rows
  } else if (levelId <= 40) {
    minRow = 1; // Hard: only avoid row 0
  } else {
    minRow = 0; // Expert: can use row 0 sparingly
  }

  // Prefer positions adjacent to tiles for easier levels
  const preferAdjacent = levelId <= 25;

  for (let row = minRow; row < rows - 1; row++) { // Avoid bottom row too
    for (let col = 0; col < cols; col++) {
      const code = layout[row][col];

      // Only suggest replacing normal tile cells
      if (code !== '.') continue;

      const isAdjacent = isAdjacentToTile(layout, row, col);

      // Calculate score (higher = better placement)
      let score = 0;

      // Prefer middle rows
      const middleRow = rows / 2;
      score += 10 - Math.abs(row - middleRow);

      // Prefer middle columns
      const middleCol = cols / 2;
      score += 5 - Math.abs(col - middleCol);

      // Bonus for adjacent to tiles (for easier levels)
      if (preferAdjacent && isAdjacent) {
        score += 20;
      }

      // Penalty for non-adjacent in easy levels
      if (levelId <= 10 && !isAdjacent) {
        score -= 50;
      }

      suggestions.push({ row, col, score });
    }
  }

  // Sort by score and return top positions
  suggestions.sort((a, b) => b.score - a.score);

  return suggestions.slice(0, count).map(s => ({ row: s.row, col: s.col }));
}

/**
 * Print a formatted analysis report
 */
export function printAnalysisReport(layout: string[][], levelId?: number): void {
  const analysis = analyzeIcePlacement(layout);
  const cols = layout[0]?.length ?? 0;

  console.log('\n=== Ice Placement Analysis ===');
  console.log(`Difficulty: ${analysis.difficulty.toUpperCase()}`);
  console.log(`Valid: ${analysis.valid ? 'YES' : 'NO'}`);

  console.log('\nStats:');
  console.log(`  Total Ice: ${analysis.stats.totalIce}`);
  console.log(`  Double Ice: ${analysis.stats.doubleIce}`);
  console.log(`  Top Row Ice: ${analysis.stats.topRowIce}`);
  console.log(`  Top Half Ice: ${analysis.stats.topHalfIce}`);
  console.log(`  Blocked Columns: ${analysis.stats.blockedColumns}/${cols}`);
  console.log(`  Adjacent to Gems: ${analysis.stats.adjacentIce}`);
  console.log(`  Isolated: ${analysis.stats.isolatedIce}`);

  if (analysis.issues.length > 0) {
    console.log('\nIssues:');
    for (const issue of analysis.issues) {
      const icon = issue.severity === 'brutal' ? '!!!' : issue.severity === 'hard' ? '!!' : '!';
      console.log(`  [${icon}] ${issue.reason}`);
    }
  }

  if (analysis.suggestions.length > 0) {
    console.log('\nSuggestions:');
    for (const suggestion of analysis.suggestions) {
      console.log(`  - ${suggestion}`);
    }
  }

  if (levelId !== undefined) {
    const validation = validateIceForDifficulty(layout, levelId);
    if (!validation.valid) {
      console.log(`\nLevel ${levelId} Validation Errors:`);
      for (const error of validation.errors) {
        console.log(`  - ${error}`);
      }
    }
  }

  console.log('');
}
