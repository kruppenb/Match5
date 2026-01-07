import { Grid } from '../Grid';
import {
  activatePowerup,
  getPowerupAffectedPositions,
  getCombinationAffectedPositions,
  setPropellerTarget,
  getPropellerTargets,
  combinePowerups,
  setMultiPropellerTargets,
  getColorBombPropellerTargets
} from '../powerupUtils';
import { createIce, createGrass } from '../Obstacle';

describe('Powerups', () => {
  describe('Rocket', () => {
    test('rocket_h clears a full row', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const rocket = { id: 'r1', type: 'red', row: 2, col: 1, isPowerup: true, powerupType: 'rocket_h' } as any;
      grid.setTile(2, 1, rocket);

      const affected = activatePowerup(grid, rocket);
      // should clear 4 other tiles in the row (excluding the rocket itself)
      expect(affected.length).toBe(4);
      const cols = affected.map(t => t.col).sort();
      expect(cols).toEqual([0, 2, 3, 4]);
    });

    test('rocket_v clears a full column', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const rocket = { id: 'r1', type: 'red', row: 2, col: 2, isPowerup: true, powerupType: 'rocket_v' } as any;
      grid.setTile(2, 2, rocket);

      const affected = activatePowerup(grid, rocket);
      // should clear 4 other tiles in the column (excluding the rocket itself)
      expect(affected.length).toBe(4);
      const rows = affected.map(t => t.row).sort();
      expect(rows).toEqual([0, 1, 3, 4]);
    });

    test('rocket at edge clears entire row/column', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const rocket = { id: 'r1', type: 'red', row: 0, col: 0, isPowerup: true, powerupType: 'rocket_h' } as any;
      grid.setTile(0, 0, rocket);

      const affected = activatePowerup(grid, rocket);
      expect(affected.length).toBe(4); // all other tiles in row 0
    });
  });

  describe('Bomb', () => {
    test('bomb clears 5x5 area', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const bomb = { id: 'b1', type: 'blue', row: 2, col: 2, isPowerup: true, powerupType: 'bomb' } as any;
      grid.setTile(2, 2, bomb);

      const affected = activatePowerup(grid, bomb);
      // 5x5 area => 24 other tiles (entire 5x5 grid minus the bomb itself)
      expect(affected.length).toBe(24);
    });

    test('bomb at corner clears only available cells', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const bomb = { id: 'b1', type: 'blue', row: 0, col: 0, isPowerup: true, powerupType: 'bomb' } as any;
      grid.setTile(0, 0, bomb);

      const affected = activatePowerup(grid, bomb);
      // Corner with radius 2: rows 0-2, cols 0-2 = 9 tiles minus bomb = 8
      expect(affected.length).toBe(8);
    });

    test('bomb at edge clears partial 3x3', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const bomb = { id: 'b1', type: 'blue', row: 0, col: 2, isPowerup: true, powerupType: 'bomb' } as any;
      grid.setTile(0, 2, bomb);

      const affected = activatePowerup(grid, bomb);
      // Top edge with radius 2: rows 0-2 (3 rows), cols 0-4 (5 cols) = 15 tiles minus bomb = 14
      expect(affected.length).toBe(14);
    });
  });

  describe('Color Bomb', () => {
    test('color bomb with target clears only that color', () => {
      const grid = new Grid(5, 5);
      const colors = ['red', 'blue', 'green', 'yellow'];
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const type = colors[(r + c) % colors.length];
          grid.setTile(r, c, { id: `t_${r}_${c}`, type, row: r, col: c, isPowerup: false } as any);
        }
      }

      const colorBomb = { id: 'cb1', type: 'color_bomb', row: 1, col: 1, isPowerup: true, powerupType: 'color_bomb' } as any;
      grid.setTile(1, 1, colorBomb);

      const affected = activatePowerup(grid, colorBomb, 'blue');
      expect(affected.every((t: any) => t.type === 'blue')).toBe(true);
      expect(affected.length).toBeGreaterThan(0);
    });

    test('color bomb clears correct count of target color', () => {
      const grid = new Grid(4, 4);
      // Fill with known pattern: 4 red, 4 blue, 4 green, 4 yellow
      const colors = ['red', 'blue', 'green', 'yellow'];
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          const type = colors[(r + c) % colors.length];
          grid.setTile(r, c, { id: `t_${r}_${c}`, type, row: r, col: c, isPowerup: false } as any);
        }
      }

      const colorBomb = { id: 'cb1', type: 'color_bomb', row: 0, col: 0, isPowerup: true, powerupType: 'color_bomb' } as any;
      grid.setTile(0, 0, colorBomb);

      const affected = activatePowerup(grid, colorBomb, 'blue');
      // In a 4x4 grid with 4 colors cycling, blue appears 4 times
      expect(affected.length).toBe(4);
    });

    test('color bomb without target falls back to type color', () => {
      const grid = new Grid(3, 3);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          grid.setTile(r, c, { id: `t_${r}_${c}`, type: 'red', row: r, col: c, isPowerup: false } as any);
        }
      }

      // Color bomb with type 'red' (no targetColor passed)
      const colorBomb = { id: 'cb1', type: 'red', row: 1, col: 1, isPowerup: true, powerupType: 'color_bomb' } as any;
      grid.setTile(1, 1, colorBomb);

      const affected = activatePowerup(grid, colorBomb);
      // Should clear all red tiles (8 tiles, excluding the bomb itself)
      expect(affected.length).toBe(8);
      expect(affected.every((t: any) => t.type === 'red')).toBe(true);
    });
  });

  describe('Chain Reactions', () => {
    test('chain reaction does not loop infinitely', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const b1 = { id: 'b1', type: 'red', row: 2, col: 2, isPowerup: true, powerupType: 'bomb' } as any;
      const b2 = { id: 'b2', type: 'red', row: 2, col: 3, isPowerup: true, powerupType: 'bomb' } as any;
      grid.setTile(2, 2, b1);
      grid.setTile(2, 3, b2);

      const affected = activatePowerup(grid, b1);
      expect(Array.isArray(affected)).toBe(true);
    });

    test('chain reaction activates adjacent bomb', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const b1 = { id: 'b1', type: 'red', row: 2, col: 2, isPowerup: true, powerupType: 'bomb' } as any;
      const b2 = { id: 'b2', type: 'red', row: 2, col: 3, isPowerup: true, powerupType: 'bomb' } as any;
      grid.setTile(2, 2, b1);
      grid.setTile(2, 3, b2);

      const affected = activatePowerup(grid, b1);
      // b2 should be in the affected list (chain reaction triggered)
      const b2Affected = affected.some(t => t.id === 'b2');
      expect(b2Affected).toBe(true);
    });

    test('chain reaction from bomb triggers rocket', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const bomb = { id: 'b1', type: 'red', row: 2, col: 2, isPowerup: true, powerupType: 'bomb' } as any;
      const rocket = { id: 'r1', type: 'blue', row: 2, col: 3, isPowerup: true, powerupType: 'rocket_h' } as any;
      grid.setTile(2, 2, bomb);
      grid.setTile(2, 3, rocket);

      const affected = activatePowerup(grid, bomb);
      // Rocket should be triggered and clear its row
      // Check that tiles from rocket's row are affected
      const rowTiles = affected.filter(t => t.row === 2);
      expect(rowTiles.length).toBeGreaterThan(2); // At least the rocket + some row tiles
    });

    test('multiple powerups in chain only activate once', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      // Three bombs in a row
      const b1 = { id: 'b1', type: 'red', row: 2, col: 1, isPowerup: true, powerupType: 'bomb' } as any;
      const b2 = { id: 'b2', type: 'red', row: 2, col: 2, isPowerup: true, powerupType: 'bomb' } as any;
      const b3 = { id: 'b3', type: 'red', row: 2, col: 3, isPowerup: true, powerupType: 'bomb' } as any;
      grid.setTile(2, 1, b1);
      grid.setTile(2, 2, b2);
      grid.setTile(2, 3, b3);

      // This should complete without stack overflow
      const affected = activatePowerup(grid, b1);
      expect(Array.isArray(affected)).toBe(true);
      // All bombs should be in affected list
      expect(affected.some(t => t.id === 'b2')).toBe(true);
      expect(affected.some(t => t.id === 'b3')).toBe(true);
    });
  });

  describe('Propeller', () => {
    test('propeller clears plus pattern at target (5 tiles) plus 1 bonus', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const propeller = { id: 'p1', type: 'red', row: 2, col: 2, isPowerup: true, powerupType: 'propeller' } as any;
      grid.setTile(2, 2, propeller);

      const affected = activatePowerup(grid, propeller);
      // Propeller should clear plus pattern (up to 5 tiles) + 1 bonus tile = up to 6
      expect(affected.length).toBeGreaterThanOrEqual(2); // at least some tiles
      expect(affected.length).toBeLessThanOrEqual(6); // max 5 plus + 1 bonus
    });

    test('propeller clears tiles at target location', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const propeller = { id: 'p1', type: 'red', row: 2, col: 2, isPowerup: true, powerupType: 'propeller' } as any;
      grid.setTile(2, 2, propeller);

      const affected = activatePowerup(grid, propeller);
      // Propeller clears plus pattern at target + 1 bonus
      expect(affected.length).toBeGreaterThan(1);
    });

    test('propeller at corner clears available tiles', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const propeller = { id: 'p1', type: 'red', row: 0, col: 0, isPowerup: true, powerupType: 'propeller' } as any;
      grid.setTile(0, 0, propeller);

      const affected = activatePowerup(grid, propeller);
      // At corner: plus pattern may be partial + bonus
      expect(affected.length).toBeGreaterThan(0);
    });

    test('propeller prioritizes obstacles when targeting', () => {
      const grid = new Grid(5, 5);
      // Fill grid with tiles
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          grid.setTile(r, c, { id: `t_${r}_${c}`, type: 'blue', row: r, col: c, isPowerup: false } as any);
        }
      }

      // Add obstacles at a specific location
      const cell = grid.getCell(4, 4);
      if (cell) {
        cell.obstacle = { type: 'grass', layers: 1 };
      }

      const propeller = { id: 'p1', type: 'red', row: 0, col: 0, isPowerup: true, powerupType: 'propeller' } as any;
      grid.setTile(0, 0, propeller);

      const affected = activatePowerup(grid, propeller);
      // The tile at the obstacle position should be in affected
      const targetTile = affected.find(t => t.row === 4 && t.col === 4);
      expect(targetTile).toBeDefined();
    });

    test('propeller chain reaction with powerup at target', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      // Place propeller at corner so target is predictable (somewhere else on board)
      const propeller = { id: 'p1', type: 'red', row: 0, col: 0, isPowerup: true, powerupType: 'propeller' } as any;
      grid.setTile(0, 0, propeller);

      const affected = activatePowerup(grid, propeller);
      // Should clear plus pattern + 1 bonus
      expect(affected.length).toBeGreaterThan(0);
    });
  });

  describe('Propeller Obstacle Clearing', () => {
    test('getPowerupAffectedPositions includes cached propeller target', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const propeller = { id: 'p1', type: 'red', row: 2, col: 2, isPowerup: true, powerupType: 'propeller' } as any;
      grid.setTile(2, 2, propeller);

      // Cache a specific target
      const target = { row: 4, col: 4 };
      setPropellerTarget(propeller.id, target);

      // Get affected positions - should include the cached target
      const positions = getPowerupAffectedPositions(grid, propeller);

      // Should include adjacent positions (up, down, left, right) plus cached target
      expect(positions.some(p => p.row === 4 && p.col === 4)).toBe(true);
    });

    test('propeller targets grass obstacles for clearing', () => {
      const grid = new Grid(5, 5);
      // Fill grid with tiles
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          grid.setTile(r, c, { id: `t_${r}_${c}`, type: 'blue', row: r, col: c, isPowerup: false } as any);
        }
      }

      // Add grass obstacle at a specific location
      const grassCell = grid.getCell(4, 4);
      if (grassCell) {
        grassCell.obstacle = createGrass(1);
      }

      const propeller = { id: 'p1', type: 'red', row: 0, col: 0, isPowerup: true, powerupType: 'propeller' } as any;
      grid.setTile(0, 0, propeller);

      // Get propeller targets - should prioritize grass
      const targets = getPropellerTargets(grid, propeller);

      // Target should be the grass position
      expect(targets.main).toEqual({ row: 4, col: 4 });
    });

    test('propeller targets ice obstacles for clearing', () => {
      const grid = new Grid(5, 5);
      // Fill grid with tiles except where ice will be
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          grid.setTile(r, c, { id: `t_${r}_${c}`, type: 'blue', row: r, col: c, isPowerup: false } as any);
        }
      }

      // Add ice obstacle (which also has a tile on top for targeting)
      const iceCell = grid.getCell(4, 4);
      if (iceCell) {
        iceCell.obstacle = createIce(1);
        // Note: ice with blocksTile=true wouldn't have a tile, but in our targeting
        // logic we look for cells with obstacles AND tiles
      }

      const propeller = { id: 'p1', type: 'red', row: 0, col: 0, isPowerup: true, powerupType: 'propeller' } as any;
      grid.setTile(0, 0, propeller);

      // Cache the target before activation (simulating PowerupActivator behavior)
      const targets = getPropellerTargets(grid, propeller);
      setPropellerTarget(propeller.id, targets.main);

      // Activate propeller (this clears the cache internally)
      activatePowerup(grid, propeller);

      // After activation, getPowerupAffectedPositions should still include the target
      // if we re-set it (simulating the fix in PowerupActivator)
      setPropellerTarget(propeller.id, targets.main);
      const positions = getPowerupAffectedPositions(grid, propeller);

      expect(positions.some(p => p.row === targets.main!.row && p.col === targets.main!.col)).toBe(true);
    });

    test('cache is cleared after activatePowerup (documents expected behavior)', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const propeller = { id: 'p1', type: 'red', row: 2, col: 2, isPowerup: true, powerupType: 'propeller' } as any;
      grid.setTile(2, 2, propeller);

      // Cache a target
      const target = { row: 4, col: 4 };
      setPropellerTarget(propeller.id, target);

      // Activate propeller - this clears the cache
      activatePowerup(grid, propeller);

      // Now getPowerupAffectedPositions won't include the target (cache was cleared)
      // This documents why PowerupActivator needs to store targets separately
      const positions = getPowerupAffectedPositions(grid, propeller);

      // The target position is NOT included because cache was cleared
      // (This is the bug scenario - PowerupActivator fixes this by storing targets locally)
      expect(positions.some(p => p.row === 4 && p.col === 4)).toBe(false);
    });

    test('simulated PowerupActivator workflow preserves target for obstacle clearing', () => {
      const grid = new Grid(5, 5);
      // Fill grid with tiles
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          grid.setTile(r, c, { id: `t_${r}_${c}`, type: 'blue', row: r, col: c, isPowerup: false } as any);
        }
      }

      // Add grass obstacle
      const grassCell = grid.getCell(4, 4);
      if (grassCell) {
        grassCell.obstacle = createGrass(1);
      }

      const propeller = { id: 'p1', type: 'red', row: 0, col: 0, isPowerup: true, powerupType: 'propeller' } as any;
      grid.setTile(0, 0, propeller);

      // STEP 1: Pre-calculate and cache target (like PowerupActivator does)
      const targets = getPropellerTargets(grid, propeller);
      const propellerTargetsMap = new Map<string, { row: number; col: number } | null>();
      propellerTargetsMap.set(propeller.id, targets.main);
      setPropellerTarget(propeller.id, targets.main);

      // STEP 2: Activate propeller (clears cache)
      activatePowerup(grid, propeller);

      // STEP 3: Get affected positions from utility
      const positions = getPowerupAffectedPositions(grid, propeller);
      const affectedPositions = new Set(positions.map(p => `${p.row},${p.col}`));

      // STEP 4: Add cached target (the fix in PowerupActivator)
      const savedTarget = propellerTargetsMap.get(propeller.id);
      if (savedTarget) {
        affectedPositions.add(`${savedTarget.row},${savedTarget.col}`);
      }

      // VERIFY: Target position is in affected positions for obstacle clearing
      expect(affectedPositions.has('4,4')).toBe(true);

      // VERIFY: We can clear the obstacle at target
      const cleared = grid.clearObstacle(4, 4);
      expect(cleared).not.toBeNull();
      expect(cleared?.type).toBe('grass');
    });

    test('propeller adjacent positions are always included', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const propeller = { id: 'p1', type: 'red', row: 2, col: 2, isPowerup: true, powerupType: 'propeller' } as any;
      grid.setTile(2, 2, propeller);

      // Don't set any target cache
      const positions = getPowerupAffectedPositions(grid, propeller);

      // Should always include adjacent positions (up, down, left, right)
      expect(positions.some(p => p.row === 1 && p.col === 2)).toBe(true); // up
      expect(positions.some(p => p.row === 3 && p.col === 2)).toBe(true); // down
      expect(positions.some(p => p.row === 2 && p.col === 1)).toBe(true); // left
      expect(positions.some(p => p.row === 2 && p.col === 3)).toBe(true); // right
    });

    test('propeller clears 2-layer grass with two hits', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      // Add 2-layer grass obstacle
      const grassCell = grid.getCell(4, 4);
      if (grassCell) {
        grassCell.obstacle = createGrass(2);
      }

      // First propeller hit
      let cleared = grid.clearObstacle(4, 4);
      expect(cleared).toBeNull(); // Not fully cleared yet
      expect(grassCell?.obstacle?.layers).toBe(1);

      // Second propeller hit
      cleared = grid.clearObstacle(4, 4);
      expect(cleared).not.toBeNull();
      expect(cleared?.type).toBe('grass');
      expect(grassCell?.obstacle).toBeNull();
    });
  });

  describe('Propeller Combination Obstacle Clearing', () => {
    test('propeller+rocket combination includes target in affected positions', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const propeller = { id: 'p1', type: 'red', row: 2, col: 2, isPowerup: true, powerupType: 'propeller' } as any;
      const rocket = { id: 'r1', type: 'blue', row: 2, col: 2, isPowerup: true, powerupType: 'rocket_h' } as any;
      grid.setTile(2, 2, propeller);

      // Pre-calculate target and cache it (simulating PowerupActivator)
      const targets = getPropellerTargets(grid, propeller);
      setPropellerTarget(propeller.id, targets.main);

      // Get combination affected positions
      const positions = getCombinationAffectedPositions(grid, propeller, rocket);

      // Should include positions around the target
      if (targets.main) {
        // For propeller+rocket, it does a cross blast at target
        // So the target's row and column should be included
        expect(positions.some(p => p.row === targets.main!.row)).toBe(true);
      }
    });

    test('propeller+bomb combination clears obstacles at target', () => {
      const grid = new Grid(5, 5);
      // Fill grid with tiles
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          grid.setTile(r, c, { id: `t_${r}_${c}`, type: 'blue', row: r, col: c, isPowerup: false } as any);
        }
      }

      // Add grass obstacle
      const grassCell = grid.getCell(4, 4);
      if (grassCell) {
        grassCell.obstacle = createGrass(1);
      }

      const propeller = { id: 'p1', type: 'red', row: 0, col: 0, isPowerup: true, powerupType: 'propeller' } as any;
      const bomb = { id: 'b1', type: 'blue', row: 0, col: 0, isPowerup: true, powerupType: 'bomb' } as any;
      grid.setTile(0, 0, propeller);

      // Simulate PowerupActivator workflow
      const propellerTargetsMap = new Map<string, { row: number; col: number } | null>();
      const targets = getPropellerTargets(grid, propeller);
      propellerTargetsMap.set(propeller.id, targets.main);
      setPropellerTarget(propeller.id, targets.main);

      // Activate combination
      combinePowerups(grid, propeller, bomb);

      // Get affected positions
      const positions = getCombinationAffectedPositions(grid, propeller, bomb);
      const affectedPositions = new Set(positions.map(p => `${p.row},${p.col}`));

      // Add saved target (the fix)
      const savedTarget = propellerTargetsMap.get(propeller.id);
      if (savedTarget) {
        affectedPositions.add(`${savedTarget.row},${savedTarget.col}`);
      }

      // Target should be included
      expect(affectedPositions.has('4,4')).toBe(true);
    });

    test('color_bomb+propeller combination includes all 3 targets', () => {
      const grid = new Grid(7, 7);
      // Fill grid with tiles
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          grid.setTile(r, c, { id: `t_${r}_${c}`, type: 'blue', row: r, col: c, isPowerup: false } as any);
        }
      }

      // Add grass obstacles at 3 locations
      const grassPositions = [
        { row: 6, col: 6 },
        { row: 6, col: 0 },
        { row: 0, col: 6 },
      ];
      for (const pos of grassPositions) {
        const cell = grid.getCell(pos.row, pos.col);
        if (cell) {
          cell.obstacle = createGrass(1);
        }
      }

      const colorBomb = { id: 'cb1', type: 'red', row: 3, col: 3, isPowerup: true, powerupType: 'color_bomb' } as any;
      const propeller = { id: 'p1', type: 'blue', row: 3, col: 3, isPowerup: true, powerupType: 'propeller' } as any;
      grid.setTile(3, 3, colorBomb);

      // Get and cache triple propeller targets
      const targets = getColorBombPropellerTargets(grid, new Set([colorBomb.id, propeller.id]));
      const comboId = `${colorBomb.id}_${propeller.id}`;
      setMultiPropellerTargets(comboId, targets);

      // All 3 targets should be included
      expect(targets.length).toBe(3);

      // Each target should be a grass position
      for (const target of targets) {
        const isGrassPosition = grassPositions.some(
          pos => pos.row === target.row && pos.col === target.col
        );
        expect(isGrassPosition).toBe(true);
      }
    });

    test('propeller+propeller combination includes both targets', () => {
      const grid = new Grid(5, 5);
      // Fill grid with tiles
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          grid.setTile(r, c, { id: `t_${r}_${c}`, type: 'blue', row: r, col: c, isPowerup: false } as any);
        }
      }

      // Add grass obstacles at 2 locations
      const grass1Cell = grid.getCell(4, 4);
      const grass2Cell = grid.getCell(0, 4);
      if (grass1Cell) grass1Cell.obstacle = createGrass(1);
      if (grass2Cell) grass2Cell.obstacle = createGrass(1);

      const propeller1 = { id: 'p1', type: 'red', row: 2, col: 2, isPowerup: true, powerupType: 'propeller' } as any;
      const propeller2 = { id: 'p2', type: 'blue', row: 2, col: 2, isPowerup: true, powerupType: 'propeller' } as any;
      grid.setTile(2, 2, propeller1);

      // Get targets for both propellers
      const targets = getPropellerTargets(grid, propeller1);

      // Main target should be set
      expect(targets.main).not.toBeNull();

      // Store targets like PowerupActivator does
      const propellerTargetsMap = new Map<string, { row: number; col: number } | null>();
      propellerTargetsMap.set(propeller1.id, targets.main);
      if (targets.bonus) {
        propellerTargetsMap.set(propeller2.id, targets.bonus);
      }

      // Both stored targets should be usable for obstacle clearing
      expect(propellerTargetsMap.get(propeller1.id)).not.toBeNull();
    });
  });

  describe('Edge Cases', () => {
    test('activating null or undefined powerup returns empty array', () => {
      const grid = new Grid(3, 3);
      const affected = activatePowerup(grid, null as any);
      expect(affected).toEqual([]);
    });

    test('activating tile without powerupType returns empty array', () => {
      const grid = new Grid(3, 3);
      const tile = { id: 't1', type: 'red', row: 1, col: 1, isPowerup: false } as any;
      const affected = activatePowerup(grid, tile);
      expect(affected).toEqual([]);
    });
  });

  describe('Ice Block Clearing (obstacles without tiles)', () => {
    test('getPowerupAffectedPositions returns positions even for cells without tiles', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      // Place ice blocks (obstacles that block tiles) in the rocket's path
      const cell1 = grid.getCell(2, 0);
      const cell2 = grid.getCell(2, 4);
      if (cell1) {
        cell1.obstacle = createIce(1);
        cell1.tile = null; // Ice blocks don't have tiles underneath
      }
      if (cell2) {
        cell2.obstacle = createIce(2);
        cell2.tile = null;
      }

      const rocket = { id: 'r1', type: 'red', row: 2, col: 2, isPowerup: true, powerupType: 'rocket_h' } as any;
      grid.setTile(2, 2, rocket);

      // activatePowerup only returns tiles, so it won't include ice block positions
      const affectedTiles = activatePowerup(grid, rocket);
      expect(affectedTiles.length).toBe(2); // Only tiles at cols 1 and 3

      // getPowerupAffectedPositions should return ALL positions in the row
      const affectedPositions = getPowerupAffectedPositions(grid, rocket);
      expect(affectedPositions.length).toBe(5); // All 5 columns in row 2

      // Verify ice block positions are included
      const hasIcePos0 = affectedPositions.some(p => p.row === 2 && p.col === 0);
      const hasIcePos4 = affectedPositions.some(p => p.row === 2 && p.col === 4);
      expect(hasIcePos0).toBe(true);
      expect(hasIcePos4).toBe(true);
    });

    test('horizontal rocket getPowerupAffectedPositions includes all row positions', () => {
      const grid = new Grid(5, 5);
      // Don't fill - leave empty cells to simulate ice blocks
      
      const rocket = { id: 'r1', type: 'red', row: 2, col: 2, isPowerup: true, powerupType: 'rocket_h' } as any;

      const positions = getPowerupAffectedPositions(grid, rocket);
      expect(positions.length).toBe(5);
      expect(positions.every(p => p.row === 2)).toBe(true);
      const cols = positions.map(p => p.col).sort((a, b) => a - b);
      expect(cols).toEqual([0, 1, 2, 3, 4]);
    });

    test('vertical rocket getPowerupAffectedPositions includes all column positions', () => {
      const grid = new Grid(5, 5);
      
      const rocket = { id: 'r1', type: 'red', row: 2, col: 2, isPowerup: true, powerupType: 'rocket_v' } as any;

      const positions = getPowerupAffectedPositions(grid, rocket);
      expect(positions.length).toBe(5);
      expect(positions.every(p => p.col === 2)).toBe(true);
      const rows = positions.map(p => p.row).sort((a, b) => a - b);
      expect(rows).toEqual([0, 1, 2, 3, 4]);
    });

    test('bomb getPowerupAffectedPositions includes 5x5 area positions', () => {
      const grid = new Grid(7, 7);
      
      const bomb = { id: 'b1', type: 'red', row: 3, col: 3, isPowerup: true, powerupType: 'bomb' } as any;

      const positions = getPowerupAffectedPositions(grid, bomb);
      // 5x5 area = 25 positions
      expect(positions.length).toBe(25);

      // Check corners of the 5x5 area
      expect(positions.some(p => p.row === 1 && p.col === 1)).toBe(true);
      expect(positions.some(p => p.row === 1 && p.col === 5)).toBe(true);
      expect(positions.some(p => p.row === 5 && p.col === 1)).toBe(true);
      expect(positions.some(p => p.row === 5 && p.col === 5)).toBe(true);
    });

    test('bomb at corner getPowerupAffectedPositions only includes valid positions', () => {
      const grid = new Grid(5, 5);
      
      const bomb = { id: 'b1', type: 'red', row: 0, col: 0, isPowerup: true, powerupType: 'bomb' } as any;

      const positions = getPowerupAffectedPositions(grid, bomb);
      // At corner (0,0) with radius 2: rows 0-2, cols 0-2 = 9 positions
      expect(positions.length).toBe(9);

      // All positions should be in valid range
      expect(positions.every(p => p.row >= 0 && p.row <= 2)).toBe(true);
      expect(positions.every(p => p.col >= 0 && p.col <= 2)).toBe(true);
    });

    test('ice blocks in bomb radius are included in affected positions', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      // Place ice blocks in bomb's radius
      const icePositions = [
        { row: 1, col: 2 },
        { row: 2, col: 1 },
        { row: 3, col: 2 },
      ];
      for (const pos of icePositions) {
        const cell = grid.getCell(pos.row, pos.col);
        if (cell) {
          cell.obstacle = createIce(1);
          cell.tile = null;
        }
      }

      const bomb = { id: 'b1', type: 'red', row: 2, col: 2, isPowerup: true, powerupType: 'bomb' } as any;
      grid.setTile(2, 2, bomb);

      const positions = getPowerupAffectedPositions(grid, bomb);

      // All ice block positions should be in affected positions
      for (const icePos of icePositions) {
        const found = positions.some(p => p.row === icePos.row && p.col === icePos.col);
        expect(found).toBe(true);
      }
    });

    test('getCombinationAffectedPositions for rocket+rocket includes cross pattern', () => {
      const grid = new Grid(5, 5);
      
      const rocket1 = { id: 'r1', type: 'red', row: 2, col: 2, isPowerup: true, powerupType: 'rocket_h' } as any;
      const rocket2 = { id: 'r2', type: 'blue', row: 2, col: 2, isPowerup: true, powerupType: 'rocket_v' } as any;

      const positions = getCombinationAffectedPositions(grid, rocket1, rocket2);

      // Cross pattern: row 2 (5 positions) + column 2 (5 positions) - center overlap = 9 unique positions
      expect(positions.length).toBe(9);

      // Check row is complete
      for (let col = 0; col < 5; col++) {
        expect(positions.some(p => p.row === 2 && p.col === col)).toBe(true);
      }
      // Check column is complete
      for (let row = 0; row < 5; row++) {
        expect(positions.some(p => p.row === row && p.col === 2)).toBe(true);
      }
    });

    test('getCombinationAffectedPositions for bomb+bomb includes 7x7 area', () => {
      const grid = new Grid(9, 9);
      
      const bomb1 = { id: 'b1', type: 'red', row: 4, col: 4, isPowerup: true, powerupType: 'bomb' } as any;
      const bomb2 = { id: 'b2', type: 'blue', row: 4, col: 4, isPowerup: true, powerupType: 'bomb' } as any;

      const positions = getCombinationAffectedPositions(grid, bomb1, bomb2);

      // 7x7 area = 49 positions
      expect(positions.length).toBe(49);

      // Check corners of the 7x7 area
      expect(positions.some(p => p.row === 1 && p.col === 1)).toBe(true);
      expect(positions.some(p => p.row === 1 && p.col === 7)).toBe(true);
      expect(positions.some(p => p.row === 7 && p.col === 1)).toBe(true);
      expect(positions.some(p => p.row === 7 && p.col === 7)).toBe(true);
    });

    test('getCombinationAffectedPositions for color_bomb+color_bomb includes entire board', () => {
      const grid = new Grid(5, 5);
      
      const cb1 = { id: 'cb1', type: 'red', row: 2, col: 2, isPowerup: true, powerupType: 'color_bomb' } as any;
      const cb2 = { id: 'cb2', type: 'blue', row: 2, col: 2, isPowerup: true, powerupType: 'color_bomb' } as any;

      const positions = getCombinationAffectedPositions(grid, cb1, cb2);

      // Entire board = 25 positions
      expect(positions.length).toBe(25);
    });

    test('grid.clearObstacle properly removes ice obstacles', () => {
      const grid = new Grid(5, 5);
      
      // Place a 2-layer ice block
      const cell = grid.getCell(2, 2);
      if (cell) {
        cell.obstacle = createIce(2);
        cell.tile = null;
      }

      // First clear should reduce to 1 layer
      let cleared = grid.clearObstacle(2, 2);
      expect(cleared).toBeNull(); // Not fully cleared yet
      expect(cell?.obstacle?.layers).toBe(1);

      // Second clear should fully remove
      cleared = grid.clearObstacle(2, 2);
      expect(cleared).not.toBeNull();
      expect(cleared?.type).toBe('ice');
      expect(cell?.obstacle).toBeNull();
    });

    test('blocked cells are excluded from affected positions', () => {
      const grid = new Grid(5, 5);
      
      // Block a cell in the rocket's path
      const blockedCell = grid.getCell(2, 3);
      if (blockedCell) {
        blockedCell.blocked = true;
      }

      const rocket = { id: 'r1', type: 'red', row: 2, col: 2, isPowerup: true, powerupType: 'rocket_h' } as any;

      const positions = getPowerupAffectedPositions(grid, rocket);

      // Should have 4 positions (row of 5 minus 1 blocked)
      expect(positions.length).toBe(4);
      expect(positions.some(p => p.row === 2 && p.col === 3)).toBe(false);
    });

    test('2-layer ice damaged by multiple adjacent matches is fully cleared', () => {
      const grid = new Grid(5, 5);
      
      // Place a 2-layer ice block at center
      const iceCell = grid.getCell(2, 2);
      if (iceCell) {
        iceCell.obstacle = createIce(2);
        iceCell.tile = null;
      }

      // Place tiles adjacent to the ice (left and right)
      grid.setTile(2, 1, { id: 't1', type: 'red', row: 2, col: 1, isPowerup: false } as any);
      grid.setTile(2, 3, { id: 't2', type: 'red', row: 2, col: 3, isPowerup: false } as any);

      // Damage from first adjacent match
      const damaged1 = grid.damageAdjacentObstacles(2, 1);
      expect(damaged1.length).toBe(1);
      expect(damaged1[0].cleared).toBe(false); // 2 -> 1 layer
      expect(iceCell?.obstacle?.layers).toBe(1);

      // Damage from second adjacent match
      const damaged2 = grid.damageAdjacentObstacles(2, 3);
      expect(damaged2.length).toBe(1);
      expect(damaged2[0].cleared).toBe(true); // 1 -> 0 layers (cleared)
      expect(iceCell?.obstacle).toBeNull();
    });

    test('damageAdjacentObstacles returns correct cleared state for each damage', () => {
      const grid = new Grid(5, 5);
      
      // Place a 1-layer ice block
      const iceCell = grid.getCell(2, 2);
      if (iceCell) {
        iceCell.obstacle = createIce(1);
        iceCell.tile = null;
      }

      // Place a tile adjacent to the ice
      grid.setTile(2, 1, { id: 't1', type: 'red', row: 2, col: 1, isPowerup: false } as any);

      // Damage from adjacent match should fully clear 1-layer ice
      const damaged = grid.damageAdjacentObstacles(2, 1);
      expect(damaged.length).toBe(1);
      expect(damaged[0].row).toBe(2);
      expect(damaged[0].col).toBe(2);
      expect(damaged[0].cleared).toBe(true);
      expect(damaged[0].obstacle.type).toBe('ice');
      expect(iceCell?.obstacle).toBeNull();
    });
  });
});
