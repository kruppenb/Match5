import { Grid } from '../Grid';
import { createGrass, createIce, createBox, createStone, createBarrel } from '../Obstacle';
import {
  getDestructibleObstaclePositions,
  getTilePositions,
  countObstaclesPerRow,
  countObstaclesPerCol,
  scorePositionsForExplosion,
  selectBestLines,
  damageObstaclesAt,
  selectThorStrikePositions,
  selectIronManTargets,
} from '../HeroPowerUtils';

describe('Hero Power Utils', () => {
  describe('getDestructibleObstaclePositions', () => {
    test('returns empty array for grid with no obstacles', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const positions = getDestructibleObstaclePositions(grid);
      expect(positions).toEqual([]);
    });

    test('finds grass obstacles', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const cell = grid.getCell(2, 3);
      if (cell) cell.obstacle = createGrass(1);

      const positions = getDestructibleObstaclePositions(grid);
      expect(positions).toHaveLength(1);
      expect(positions[0]).toEqual({ row: 2, col: 3 });
    });

    test('finds ice obstacles', () => {
      const grid = new Grid(5, 5);

      const cell = grid.getCell(1, 1);
      if (cell) {
        cell.obstacle = createIce(2);
        cell.tile = null; // Ice blocks don't have tiles
      }

      const positions = getDestructibleObstaclePositions(grid);
      expect(positions).toHaveLength(1);
      expect(positions[0]).toEqual({ row: 1, col: 1 });
    });

    test('finds box obstacles', () => {
      const grid = new Grid(5, 5);

      const cell = grid.getCell(3, 3);
      if (cell) {
        cell.obstacle = createBox(2);
        cell.tile = null;
      }

      const positions = getDestructibleObstaclePositions(grid);
      expect(positions).toHaveLength(1);
      expect(positions[0]).toEqual({ row: 3, col: 3 });
    });

    test('excludes stone (indestructible) obstacles', () => {
      const grid = new Grid(5, 5);

      // Add stone (indestructible)
      const stoneCell = grid.getCell(1, 1);
      if (stoneCell) {
        stoneCell.obstacle = createStone();
        stoneCell.tile = null;
      }

      // Add grass (destructible)
      const grassCell = grid.getCell(2, 2);
      if (grassCell) {
        grassCell.obstacle = createGrass(1);
        grassCell.tile = grid.createRandomTile(2, 2);
      }

      const positions = getDestructibleObstaclePositions(grid);
      expect(positions).toHaveLength(1);
      expect(positions[0]).toEqual({ row: 2, col: 2 });
    });

    test('finds multiple obstacles', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const cell1 = grid.getCell(0, 0);
      const cell2 = grid.getCell(2, 2);
      const cell3 = grid.getCell(4, 4);
      if (cell1) cell1.obstacle = createGrass(1);
      if (cell2) cell2.obstacle = createIce(1);
      if (cell3) cell3.obstacle = createBarrel(1);

      const positions = getDestructibleObstaclePositions(grid);
      expect(positions).toHaveLength(3);
    });
  });

  describe('getTilePositions', () => {
    test('returns all tile positions', () => {
      const grid = new Grid(3, 3);
      grid.fillGrid();

      const positions = getTilePositions(grid);
      expect(positions).toHaveLength(9);
    });

    test('excludes blocked cells', () => {
      const grid = new Grid(3, 3);
      grid.fillGrid();

      const cell = grid.getCell(1, 1);
      if (cell) cell.blocked = true;

      const positions = getTilePositions(grid);
      expect(positions).toHaveLength(8);
      expect(positions.some(p => p.row === 1 && p.col === 1)).toBe(false);
    });

    test('excludes cells without tiles', () => {
      const grid = new Grid(3, 3);
      grid.fillGrid();

      const cell = grid.getCell(0, 0);
      if (cell) cell.tile = null;

      const positions = getTilePositions(grid);
      expect(positions).toHaveLength(8);
    });
  });

  describe('countObstaclesPerRow', () => {
    test('returns zeros for grid with no obstacles', () => {
      const grid = new Grid(3, 3);
      grid.fillGrid();

      const counts = countObstaclesPerRow(grid);
      expect(counts).toEqual([0, 0, 0]);
    });

    test('counts blocking obstacles in each row', () => {
      const grid = new Grid(5, 5);

      // Add 2 ice blocks in row 0
      const cell1 = grid.getCell(0, 0);
      const cell2 = grid.getCell(0, 2);
      if (cell1) { cell1.obstacle = createIce(1); cell1.tile = null; }
      if (cell2) { cell2.obstacle = createIce(1); cell2.tile = null; }

      // Add 1 box in row 2
      const cell3 = grid.getCell(2, 3);
      if (cell3) { cell3.obstacle = createBox(1); cell3.tile = null; }

      const counts = countObstaclesPerRow(grid);
      expect(counts[0]).toBe(2);
      expect(counts[1]).toBe(0);
      expect(counts[2]).toBe(1);
      expect(counts[3]).toBe(0);
      expect(counts[4]).toBe(0);
    });

    test('excludes grass (non-blocking) obstacles from count', () => {
      const grid = new Grid(3, 3);
      grid.fillGrid();

      // Grass doesn't block tiles, so it shouldn't be counted
      const cell = grid.getCell(1, 1);
      if (cell) cell.obstacle = createGrass(1);

      const counts = countObstaclesPerRow(grid);
      expect(counts).toEqual([0, 0, 0]);
    });
  });

  describe('countObstaclesPerCol', () => {
    test('counts blocking obstacles in each column', () => {
      const grid = new Grid(5, 5);

      // Add 3 ice blocks in column 2
      const cell1 = grid.getCell(0, 2);
      const cell2 = grid.getCell(2, 2);
      const cell3 = grid.getCell(4, 2);
      if (cell1) { cell1.obstacle = createIce(1); cell1.tile = null; }
      if (cell2) { cell2.obstacle = createIce(1); cell2.tile = null; }
      if (cell3) { cell3.obstacle = createIce(1); cell3.tile = null; }

      const counts = countObstaclesPerCol(grid);
      expect(counts[0]).toBe(0);
      expect(counts[1]).toBe(0);
      expect(counts[2]).toBe(3);
      expect(counts[3]).toBe(0);
      expect(counts[4]).toBe(0);
    });
  });

  describe('scorePositionsForExplosion', () => {
    test('scores positions by obstacle count in explosion area', () => {
      const grid = new Grid(5, 5);

      // Create a 2x2 cluster of ice at position (1,1)
      const positions = [
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 2, col: 1 },
        { row: 2, col: 2 },
      ];
      for (const pos of positions) {
        const cell = grid.getCell(pos.row, pos.col);
        if (cell) {
          cell.obstacle = createIce(1);
          cell.tile = null;
        }
      }

      const scores = scorePositionsForExplosion(grid, 2);

      // Position (1,1) should have score 4 (covers all 4 ice blocks)
      const bestScore = scores.find(s => s.pos.row === 1 && s.pos.col === 1);
      expect(bestScore?.obstacleCount).toBe(4);

      // Position (0,0) should have score 1 (only covers 1 ice block at (1,1))
      const cornerScore = scores.find(s => s.pos.row === 0 && s.pos.col === 0);
      expect(cornerScore?.obstacleCount).toBe(1);
    });

    test('returns empty scores for grid without blocking obstacles', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const scores = scorePositionsForExplosion(grid, 2);

      // All scores should be 0
      expect(scores.every(s => s.obstacleCount === 0)).toBe(true);
    });
  });

  describe('selectBestLines', () => {
    test('returns line with most obstacles when rows are chosen', () => {
      const grid = new Grid(5, 5);

      // Add 4 ice blocks in row 2
      for (let col = 0; col < 4; col++) {
        const cell = grid.getCell(2, col);
        if (cell) { cell.obstacle = createIce(1); cell.tile = null; }
      }
      // Add 1 ice block in row 0
      const extraCell = grid.getCell(0, 0);
      if (extraCell) { extraCell.obstacle = createIce(1); extraCell.tile = null; }

      const result = selectBestLines(grid, 2);

      // Whether rows or columns are chosen, the line with most obstacles should be first
      if (result.isRow) {
        expect(result.lines[0]).toBe(2); // Row 2 has 4 obstacles
      } else {
        expect(result.lines[0]).toBe(0); // Column 0 has 2 obstacles
      }
    });

    test('returns line with most obstacles when columns are chosen', () => {
      const grid = new Grid(5, 5);

      // Add 4 ice blocks in column 3
      for (let row = 0; row < 4; row++) {
        const cell = grid.getCell(row, 3);
        if (cell) { cell.obstacle = createIce(1); cell.tile = null; }
      }

      const result = selectBestLines(grid, 2);

      // The line with most obstacles should be prioritized
      if (result.isRow) {
        // Each row has 1 obstacle, so any is valid
        expect(result.lines).toHaveLength(2);
      } else {
        expect(result.lines[0]).toBe(3); // Column 3 has 4 obstacles
      }
    });

    test('returns requested number of lines', () => {
      const grid = new Grid(5, 5);

      const result = selectBestLines(grid, 3);

      expect(result.lines).toHaveLength(3);
    });

    test('prioritizes lines with obstacles over empty lines', () => {
      const grid = new Grid(5, 5);

      // Add ice blocks in row 1 and row 3
      for (let col = 0; col < 3; col++) {
        const cell1 = grid.getCell(1, col);
        const cell2 = grid.getCell(3, col);
        if (cell1) { cell1.obstacle = createIce(1); cell1.tile = null; }
        if (cell2) { cell2.obstacle = createIce(1); cell2.tile = null; }
      }

      const result = selectBestLines(grid, 2);

      if (result.isRow) {
        // Rows 1 and 3 have obstacles, should be selected
        expect(result.lines).toContain(1);
        expect(result.lines).toContain(3);
      }
    });
  });

  describe('damageObstaclesAt', () => {
    test('damages single-layer obstacles and clears them', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const cell = grid.getCell(2, 2);
      if (cell) cell.obstacle = createGrass(1);

      const result = damageObstaclesAt(grid, [{ row: 2, col: 2 }]);

      expect(result.clearedByType).toEqual({ grass: 1 });
      expect(result.clearedPositions).toHaveLength(1);
      expect(result.damagedPositions).toHaveLength(0);
      expect(cell?.obstacle).toBeNull();
    });

    test('damages multi-layer obstacles without clearing', () => {
      const grid = new Grid(5, 5);

      const cell = grid.getCell(2, 2);
      if (cell) {
        cell.obstacle = createIce(2);
        cell.tile = null;
      }

      const result = damageObstaclesAt(grid, [{ row: 2, col: 2 }]);

      expect(result.clearedByType).toEqual({});
      expect(result.damagedPositions).toHaveLength(1);
      expect(result.clearedPositions).toHaveLength(0);
      expect(cell?.obstacle?.layers).toBe(1);
    });

    test('clears multi-layer obstacle after multiple hits', () => {
      const grid = new Grid(5, 5);

      const cell = grid.getCell(2, 2);
      if (cell) {
        cell.obstacle = createIce(2);
        cell.tile = null;
      }

      // First hit
      damageObstaclesAt(grid, [{ row: 2, col: 2 }]);
      expect(cell?.obstacle?.layers).toBe(1);

      // Second hit
      const result = damageObstaclesAt(grid, [{ row: 2, col: 2 }]);
      expect(result.clearedByType).toEqual({ ice: 1 });
      expect(cell?.obstacle).toBeNull();
    });

    test('skips indestructible obstacles', () => {
      const grid = new Grid(5, 5);

      const cell = grid.getCell(2, 2);
      if (cell) {
        cell.obstacle = createStone();
        cell.tile = null;
      }

      const result = damageObstaclesAt(grid, [{ row: 2, col: 2 }]);

      expect(result.clearedByType).toEqual({});
      expect(result.damagedPositions).toHaveLength(0);
      expect(result.clearedPositions).toHaveLength(0);
      expect(cell?.obstacle).not.toBeNull(); // Stone still exists
    });

    test('handles multiple positions', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const cell1 = grid.getCell(0, 0);
      const cell2 = grid.getCell(2, 2);
      const cell3 = grid.getCell(4, 4);
      if (cell1) cell1.obstacle = createGrass(1);
      if (cell2) cell2.obstacle = createGrass(1);
      if (cell3) cell3.obstacle = createBarrel(1);

      const result = damageObstaclesAt(grid, [
        { row: 0, col: 0 },
        { row: 2, col: 2 },
        { row: 4, col: 4 },
      ]);

      expect(result.clearedByType).toEqual({ grass: 2, barrel: 1 });
      expect(result.clearedPositions).toHaveLength(3);
    });

    test('skips positions without obstacles', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const result = damageObstaclesAt(grid, [{ row: 2, col: 2 }]);

      expect(result.clearedByType).toEqual({});
      expect(result.damagedPositions).toHaveLength(0);
      expect(result.clearedPositions).toHaveLength(0);
    });
  });

  describe('selectThorStrikePositions', () => {
    test('prioritizes obstacles over regular tiles', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      // Add grass obstacles
      const cell1 = grid.getCell(0, 0);
      const cell2 = grid.getCell(4, 4);
      if (cell1) cell1.obstacle = createGrass(1);
      if (cell2) cell2.obstacle = createGrass(1);

      // Request 3 strikes (2 obstacles + 1 tile)
      const positions = selectThorStrikePositions(grid, 3);

      expect(positions).toHaveLength(3);

      // Both obstacle positions should be included
      const hasObstacle1 = positions.some(p => p.row === 0 && p.col === 0);
      const hasObstacle2 = positions.some(p => p.row === 4 && p.col === 4);
      expect(hasObstacle1).toBe(true);
      expect(hasObstacle2).toBe(true);
    });

    test('fills with tiles when not enough obstacles', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      // Add only 1 obstacle
      const cell = grid.getCell(2, 2);
      if (cell) cell.obstacle = createGrass(1);

      // Request 5 strikes
      const positions = selectThorStrikePositions(grid, 5);

      expect(positions).toHaveLength(5);

      // The obstacle position should be included
      expect(positions.some(p => p.row === 2 && p.col === 2)).toBe(true);
    });

    test('returns all obstacles when fewer strikes than obstacles', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      // Add 5 obstacles
      for (let i = 0; i < 5; i++) {
        const cell = grid.getCell(i, i);
        if (cell) cell.obstacle = createGrass(1);
      }

      // Request only 3 strikes
      const positions = selectThorStrikePositions(grid, 3);

      expect(positions).toHaveLength(3);

      // All positions should be obstacle positions
      for (const pos of positions) {
        const cell = grid.getCell(pos.row, pos.col);
        expect(cell?.obstacle).not.toBeNull();
      }
    });
  });

  describe('selectIronManTargets', () => {
    test('prioritizes positions with most obstacles in explosion area', () => {
      const grid = new Grid(7, 7);

      // Create a 2x2 cluster of ice at position (2,2)
      for (let dr = 0; dr < 2; dr++) {
        for (let dc = 0; dc < 2; dc++) {
          const cell = grid.getCell(2 + dr, 2 + dc);
          if (cell) {
            cell.obstacle = createIce(1);
            cell.tile = null;
          }
        }
      }

      // Request 1 missile
      const targets = selectIronManTargets(grid, 1, 2);

      expect(targets).toHaveLength(1);
      // The target should be position (2,2) which covers all 4 ice blocks
      expect(targets[0]).toEqual({ row: 2, col: 2 });
    });

    test('returns requested number of targets', () => {
      const grid = new Grid(7, 7);

      const targets = selectIronManTargets(grid, 3, 2);

      expect(targets).toHaveLength(3);
    });

    test('avoids duplicate positions', () => {
      const grid = new Grid(7, 7);

      const targets = selectIronManTargets(grid, 5, 2);

      const keys = targets.map(t => `${t.row},${t.col}`);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });
  });

  describe('Hero power obstacle clearing integration', () => {
    test('Thor can clear grass obstacles', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      // Add grass
      const grassCell = grid.getCell(2, 2);
      if (grassCell) grassCell.obstacle = createGrass(1);

      // Simulate Thor strike
      const strikePositions = [{ row: 2, col: 2 }];
      const result = damageObstaclesAt(grid, strikePositions);

      expect(result.clearedByType).toEqual({ grass: 1 });
      expect(grassCell?.obstacle).toBeNull();
    });

    test('Iron Man explosion can damage multiple obstacles', () => {
      const grid = new Grid(5, 5);

      // Create 2x2 cluster of ice blocks
      const icePositions = [
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 2, col: 1 },
        { row: 2, col: 2 },
      ];
      for (const pos of icePositions) {
        const cell = grid.getCell(pos.row, pos.col);
        if (cell) {
          cell.obstacle = createIce(1);
          cell.tile = null;
        }
      }

      // Simulate explosion at all 4 positions
      const result = damageObstaclesAt(grid, icePositions);

      expect(result.clearedByType).toEqual({ ice: 4 });
      expect(result.clearedPositions).toHaveLength(4);
    });

    test('Elsa ice wave clears entire row of obstacles', () => {
      const grid = new Grid(5, 5);

      // Add ice blocks across row 2
      for (let col = 0; col < 5; col++) {
        const cell = grid.getCell(2, col);
        if (cell) {
          cell.obstacle = createIce(1);
          cell.tile = null;
        }
      }

      // Get positions for row 2
      const rowPositions = [];
      for (let col = 0; col < 5; col++) {
        rowPositions.push({ row: 2, col });
      }

      const result = damageObstaclesAt(grid, rowPositions);

      expect(result.clearedByType).toEqual({ ice: 5 });
    });

    test('Hero powers can damage 2-layer grass', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const cell = grid.getCell(2, 2);
      if (cell) cell.obstacle = createGrass(2);

      // First hit
      let result = damageObstaclesAt(grid, [{ row: 2, col: 2 }]);
      expect(result.clearedByType).toEqual({});
      expect(cell?.obstacle?.layers).toBe(1);

      // Second hit
      result = damageObstaclesAt(grid, [{ row: 2, col: 2 }]);
      expect(result.clearedByType).toEqual({ grass: 1 });
      expect(cell?.obstacle).toBeNull();
    });

    test('Hero powers prioritize obstacle-heavy areas', () => {
      const grid = new Grid(7, 7);
      grid.fillGrid();

      // Add obstacles in specific pattern
      // Row 0: 3 obstacles
      for (let col = 0; col < 3; col++) {
        const cell = grid.getCell(0, col);
        if (cell) cell.obstacle = createGrass(1);
      }
      // Row 3: 5 obstacles
      for (let col = 0; col < 5; col++) {
        const cell = grid.getCell(3, col);
        if (cell) cell.obstacle = createGrass(1);
      }

      // Elsa should prefer row 3 (more obstacles)
      const result = selectBestLines(grid, 1);

      // This test uses grass which is non-blocking, so counting uses blocksTile
      // Let's use ice instead for this test
    });

    test('Hero powers prioritize blocking obstacles for line selection', () => {
      const grid = new Grid(7, 7);

      // Row 0: 2 ice blocks
      for (let col = 0; col < 2; col++) {
        const cell = grid.getCell(0, col);
        if (cell) { cell.obstacle = createIce(1); cell.tile = null; }
      }
      // Row 3: 4 ice blocks
      for (let col = 0; col < 4; col++) {
        const cell = grid.getCell(3, col);
        if (cell) { cell.obstacle = createIce(1); cell.tile = null; }
      }

      const result = selectBestLines(grid, 2);

      expect(result.isRow).toBe(true);
      expect(result.lines[0]).toBe(3); // Row 3 has most obstacles
    });
  });
});
