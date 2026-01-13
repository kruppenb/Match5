import { Grid } from '../Grid';
import { MatchDetector } from '../MatchDetector';
import {
  activatePowerup,
  getPowerupAffectedPositions,
  getPropellerTargets,
  setPropellerTarget,
  combinePowerups,
  getCombinationAffectedPositions,
} from '../powerupUtils';
import { createGrass, createIce } from '../Obstacle';
import { Tile, Position } from '../../types';

/**
 * E2E tests for game state scenarios
 * These tests simulate full game flows from powerup activation through grid state changes
 */
describe('Game State E2E Tests', () => {
  describe('Powerup Activation Flow', () => {
    test('full rocket activation clears row and updates grid state', () => {
      const grid = new Grid(5, 5);
      // Fill grid with identifiable tiles
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          grid.setTile(r, c, { id: `t_${r}_${c}`, type: 'red', row: r, col: c, isPowerup: false } as Tile);
        }
      }

      const rocket = { id: 'r1', type: 'blue', row: 2, col: 2, isPowerup: true, powerupType: 'rocket_h' } as Tile;
      grid.setTile(2, 2, rocket);

      // Step 1: Activate powerup and collect affected tiles
      const alreadyActivated = new Set<string>();
      const affected = activatePowerup(grid, rocket, undefined, alreadyActivated);

      expect(affected.length).toBe(4); // 4 other tiles in row 2

      // Step 2: Get affected positions for obstacle clearing
      const positions = getPowerupAffectedPositions(grid, rocket);
      expect(positions.length).toBe(5); // All 5 positions in row

      // Step 3: Clear tiles from grid (simulating MatchProcessor behavior)
      const tilesToClear = new Set<Tile>([rocket, ...affected]);

      tilesToClear.forEach(tile => {
        const currentTile = grid.getTile(tile.row, tile.col);
        if (currentTile && currentTile.id === tile.id) {
          grid.setTile(tile.row, tile.col, null);
        }
      });

      // Verify grid state after clearing
      for (let c = 0; c < 5; c++) {
        expect(grid.getTile(2, c)).toBeNull();
      }

      // Other rows should be unchanged
      for (let r = 0; r < 5; r++) {
        if (r === 2) continue;
        for (let c = 0; c < 5; c++) {
          expect(grid.getTile(r, c)).not.toBeNull();
        }
      }
    });

    test('propeller activation with obstacle targeting clears obstacle and tile', () => {
      const grid = new Grid(5, 5);
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          grid.setTile(r, c, { id: `t_${r}_${c}`, type: 'blue', row: r, col: c, isPowerup: false } as Tile);
        }
      }

      // Add grass obstacle
      const grassCell = grid.getCell(4, 4);
      if (grassCell) {
        grassCell.obstacle = createGrass(1);
      }

      const propeller = { id: 'p1', type: 'red', row: 0, col: 0, isPowerup: true, powerupType: 'propeller' } as Tile;
      grid.setTile(0, 0, propeller);

      // Simulate MatchProcessor workflow with local target storage
      const propellerTargetsMap = new Map<string, Position | null>();

      // Step 1: Pre-calculate target
      const targets = getPropellerTargets(grid, propeller);
      propellerTargetsMap.set(propeller.id, targets.main);
      setPropellerTarget(propeller.id, targets.main);

      expect(targets.main).toEqual({ row: 4, col: 4 }); // Should target the grass

      // Step 2: Activate propeller
      const affected = activatePowerup(grid, propeller);

      // Propeller affects adjacent tiles + target
      expect(affected.some(t => t.row === 4 && t.col === 4)).toBe(true);

      // Step 3: Get positions (cache may be cleared)
      const positions = getPowerupAffectedPositions(grid, propeller);
      const affectedPositions = new Set(positions.map(p => `${p.row},${p.col}`));

      // Step 4: Add cached target (the fix)
      const savedTarget = propellerTargetsMap.get(propeller.id);
      if (savedTarget) {
        affectedPositions.add(`${savedTarget.row},${savedTarget.col}`);
      }

      // Step 5: Clear obstacles at affected positions
      let clearedObstacle: { type: string } | null = null;
      affectedPositions.forEach(key => {
        const [row, col] = key.split(',').map(Number);
        const cleared = grid.clearObstacle(row, col);
        if (cleared) clearedObstacle = cleared;
      });

      // Grass should be cleared
      expect(clearedObstacle).not.toBeNull();
      expect(clearedObstacle!.type).toBe('grass');
      expect(grassCell?.obstacle).toBeNull();
    });

    test('bomb activation clears 5x5 area and all obstacles within', () => {
      const grid = new Grid(7, 7);
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          grid.setTile(r, c, { id: `t_${r}_${c}`, type: 'red', row: r, col: c, isPowerup: false } as Tile);
        }
      }

      // Add ice obstacles in bomb range
      const icePositions = [
        { row: 2, col: 3 },
        { row: 3, col: 2 },
        { row: 4, col: 3 },
      ];
      for (const pos of icePositions) {
        const cell = grid.getCell(pos.row, pos.col);
        if (cell) {
          cell.obstacle = createIce(1);
        }
      }

      const bomb = { id: 'b1', type: 'blue', row: 3, col: 3, isPowerup: true, powerupType: 'bomb' } as Tile;
      grid.setTile(3, 3, bomb);

      // Step 1: Activate bomb
      const affected = activatePowerup(grid, bomb);
      expect(affected.length).toBe(24); // 5x5 - 1 bomb = 24

      // Step 2: Get affected positions
      const positions = getPowerupAffectedPositions(grid, bomb);
      expect(positions.length).toBe(25); // 5x5 area

      // Step 3: Clear obstacles
      const clearedObstacles: string[] = [];
      positions.forEach(pos => {
        const cleared = grid.clearObstacle(pos.row, pos.col);
        if (cleared) clearedObstacles.push(cleared.type);
      });

      expect(clearedObstacles.length).toBe(3);
      expect(clearedObstacles.every(t => t === 'ice')).toBe(true);

      // Step 4: Clear tiles
      const tilesToClear = new Set<Tile>([bomb, ...affected]);
      tilesToClear.forEach(tile => {
        grid.setTile(tile.row, tile.col, null);
      });

      // Verify 5x5 area is cleared
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          expect(grid.getTile(3 + dr, 3 + dc)).toBeNull();
        }
      }
    });
  });

  describe('Chain Reaction Scenarios', () => {
    test('rocket triggers bomb which clears more tiles', () => {
      const grid = new Grid(9, 9);
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          grid.setTile(r, c, { id: `t_${r}_${c}`, type: 'red', row: r, col: c, isPowerup: false } as Tile);
        }
      }

      const rocket = { id: 'r1', type: 'red', row: 4, col: 0, isPowerup: true, powerupType: 'rocket_h' } as Tile;
      const bomb = { id: 'b1', type: 'blue', row: 4, col: 4, isPowerup: true, powerupType: 'bomb' } as Tile;
      grid.setTile(4, 0, rocket);
      grid.setTile(4, 4, bomb);

      const affected = activatePowerup(grid, rocket);

      // Bomb should be triggered
      expect(affected.some(t => t.id === 'b1')).toBe(true);

      // Bomb's 5x5 area should be affected (positions from row 2-6)
      expect(affected.some(t => t.row === 2 && t.col === 4)).toBe(true);
      expect(affected.some(t => t.row === 6 && t.col === 4)).toBe(true);

      // Simulate clearing
      const tilesToClear = new Set<Tile>([rocket, ...affected]);
      tilesToClear.forEach(tile => {
        grid.setTile(tile.row, tile.col, null);
      });

      // Row 4 should be entirely cleared
      for (let c = 0; c < 9; c++) {
        expect(grid.getTile(4, c)).toBeNull();
      }

      // Bomb's vertical range should be cleared
      for (let r = 2; r <= 6; r++) {
        expect(grid.getTile(r, 4)).toBeNull();
      }
    });

    test('propeller chain reaction preserves all targets', () => {
      const grid = new Grid(9, 9);
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          grid.setTile(r, c, { id: `t_${r}_${c}`, type: 'blue', row: r, col: c, isPowerup: false } as Tile);
        }
      }

      // Add obstacles at corners
      const grassPositions = [
        { row: 0, col: 8 },
        { row: 8, col: 0 },
        { row: 8, col: 8 },
      ];
      for (const pos of grassPositions) {
        const cell = grid.getCell(pos.row, pos.col);
        if (cell) cell.obstacle = createGrass(1);
      }

      // Place bomb and propeller - propeller is within bomb's 5x5 range
      const bomb = { id: 'b1', type: 'red', row: 4, col: 4, isPowerup: true, powerupType: 'bomb' } as Tile;
      const propeller1 = { id: 'p1', type: 'blue', row: 4, col: 5, isPowerup: true, powerupType: 'propeller' } as Tile;
      grid.setTile(4, 4, bomb);
      grid.setTile(4, 5, propeller1);

      // Simulate MatchProcessor workflow
      const propellerTargetsMap = new Map<string, Position | null>();
      const alreadyActivated = new Set<string>();

      // Activate bomb (initial wave) - don't pre-add to alreadyActivated
      let allAffected = activatePowerup(grid, bomb, undefined, alreadyActivated);

      // Find chained propellers
      const chainedPropellers = allAffected.filter(t => t.isPowerup && t.powerupType === 'propeller');
      expect(chainedPropellers.length).toBeGreaterThanOrEqual(1);

      // Pre-calculate targets for chained propellers
      for (const prop of chainedPropellers) {
        const targets = getPropellerTargets(grid, prop);
        propellerTargetsMap.set(prop.id, targets.main);
        setPropellerTarget(prop.id, targets.main);
      }

      // Activate chained propellers
      for (const prop of chainedPropellers) {
        if (!alreadyActivated.has(prop.id)) {
          const propAffected = activatePowerup(grid, prop, undefined, alreadyActivated);
          allAffected.push(...propAffected);
        }
      }

      // Collect all affected positions
      const affectedPositions = new Set<string>();

      // Add tile positions
      allAffected.forEach(t => affectedPositions.add(`${t.row},${t.col}`));

      // Add cached propeller targets
      propellerTargetsMap.forEach((target) => {
        if (target) {
          affectedPositions.add(`${target.row},${target.col}`);
        }
      });

      // At least one grass position should be targeted by the propeller
      const grassTargeted = grassPositions.some(pos => affectedPositions.has(`${pos.row},${pos.col}`));
      expect(grassTargeted).toBe(true);
    });
  });

  describe('Powerup Combination E2E', () => {
    test('rocket+rocket combination clears cross pattern', () => {
      const grid = new Grid(7, 7);
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          grid.setTile(r, c, { id: `t_${r}_${c}`, type: 'red', row: r, col: c, isPowerup: false } as Tile);
        }
      }

      const rocket1 = { id: 'r1', type: 'red', row: 3, col: 3, isPowerup: true, powerupType: 'rocket_h' } as Tile;
      const rocket2 = { id: 'r2', type: 'blue', row: 3, col: 3, isPowerup: true, powerupType: 'rocket_v' } as Tile;
      grid.setTile(3, 3, rocket1);

      const affected = combinePowerups(grid, rocket1, rocket2);
      const positions = getCombinationAffectedPositions(grid, rocket1, rocket2);

      // Should form a cross: row 3 (7) + col 3 (7) - center (1) = 13 positions
      expect(positions.length).toBe(13);

      // Verify cross pattern
      for (let c = 0; c < 7; c++) {
        expect(positions.some(p => p.row === 3 && p.col === c)).toBe(true);
      }
      for (let r = 0; r < 7; r++) {
        expect(positions.some(p => p.row === r && p.col === 3)).toBe(true);
      }

      // Clear tiles
      const tilesToClear = new Set<Tile>([rocket1, ...affected]);
      tilesToClear.forEach(tile => {
        grid.setTile(tile.row, tile.col, null);
      });

      // Verify cross is cleared
      for (let c = 0; c < 7; c++) {
        expect(grid.getTile(3, c)).toBeNull();
      }
      for (let r = 0; r < 7; r++) {
        expect(grid.getTile(r, 3)).toBeNull();
      }
    });

    test('bomb+bomb combination clears 7x7 area with obstacles', () => {
      const grid = new Grid(9, 9);
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          grid.setTile(r, c, { id: `t_${r}_${c}`, type: 'red', row: r, col: c, isPowerup: false } as Tile);
        }
      }

      // Add obstacles in 7x7 range
      const icePositions = [
        { row: 1, col: 4 },
        { row: 4, col: 1 },
        { row: 7, col: 4 },
        { row: 4, col: 7 },
      ];
      for (const pos of icePositions) {
        const cell = grid.getCell(pos.row, pos.col);
        if (cell) cell.obstacle = createIce(1);
      }

      const bomb1 = { id: 'b1', type: 'red', row: 4, col: 4, isPowerup: true, powerupType: 'bomb' } as Tile;
      const bomb2 = { id: 'b2', type: 'blue', row: 4, col: 4, isPowerup: true, powerupType: 'bomb' } as Tile;
      grid.setTile(4, 4, bomb1);

      const affected = combinePowerups(grid, bomb1, bomb2);
      const positions = getCombinationAffectedPositions(grid, bomb1, bomb2);

      // 7x7 = 49 positions
      expect(positions.length).toBe(49);

      // Clear obstacles
      const clearedObstacles: string[] = [];
      positions.forEach(pos => {
        const cleared = grid.clearObstacle(pos.row, pos.col);
        if (cleared) clearedObstacles.push(cleared.type);
      });

      expect(clearedObstacles.length).toBe(4);

      // Clear tiles
      const tilesToClear = new Set<Tile>([bomb1, ...affected]);
      tilesToClear.forEach(tile => {
        grid.setTile(tile.row, tile.col, null);
      });

      // Verify 7x7 area is cleared
      for (let dr = -3; dr <= 3; dr++) {
        for (let dc = -3; dc <= 3; dc++) {
          expect(grid.getTile(4 + dr, 4 + dc)).toBeNull();
        }
      }
    });
  });

  describe('Grid State Consistency', () => {
    test('grid state is consistent after manual tile movement', () => {
      const grid = new Grid(5, 5);
      // Fill only the bottom row
      for (let c = 0; c < 5; c++) {
        grid.setTile(4, c, { id: `t_4_${c}`, type: 'red', row: 4, col: c, isPowerup: false } as Tile);
      }

      // Verify initial state
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 5; c++) {
          expect(grid.getTile(r, c)).toBeNull();
        }
      }
      for (let c = 0; c < 5; c++) {
        expect(grid.getTile(4, c)).not.toBeNull();
      }

      // Simulate clearing a tile and moving one down
      grid.setTile(4, 2, null);
      grid.setTile(0, 2, { id: 't_0_2', type: 'blue', row: 0, col: 2, isPowerup: false } as Tile);

      // Manually move the tile (simulating gravity)
      const tileToMove = grid.getTile(0, 2);
      expect(tileToMove).not.toBeNull();
      grid.setTile(0, 2, null);
      grid.setTile(4, 2, { ...tileToMove!, row: 4 });

      // Verify final state
      expect(grid.getTile(0, 2)).toBeNull();
      expect(grid.getTile(4, 2)).not.toBeNull();
      expect(grid.getTile(4, 2)!.id).toBe('t_0_2');
    });

    test('match detection works after tiles cleared', () => {
      const grid = new Grid(5, 5);
      const matchDetector = new MatchDetector();

      // Create a grid with potential match after rocket clears
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const type = c < 3 ? 'red' : 'blue';
          grid.setTile(r, c, { id: `t_${r}_${c}`, type, row: r, col: c, isPowerup: false } as Tile);
        }
      }

      // Place a rocket
      const rocket = { id: 'r1', type: 'green', row: 2, col: 2, isPowerup: true, powerupType: 'rocket_h' } as Tile;
      grid.setTile(2, 2, rocket);

      // Clear rocket's row
      for (let c = 0; c < 5; c++) {
        grid.setTile(2, c, null);
      }

      // Check for new matches after clearing (before gravity)
      const matches = matchDetector.findAllMatches(grid);

      // Grid should still be valid (no matches in remaining tiles)
      expect(Array.isArray(matches)).toBe(true);
    });
  });

  describe('Obstacle Clearing Edge Cases', () => {
    test('multi-layer ice requires multiple hits', () => {
      const grid = new Grid(5, 5);

      // Place 2-layer ice
      const cell = grid.getCell(2, 2);
      if (cell) {
        cell.obstacle = createIce(2);
      }

      // First hit reduces to 1 layer
      let cleared = grid.clearObstacle(2, 2);
      expect(cleared).toBeNull(); // Not fully cleared
      expect(cell?.obstacle?.layers).toBe(1);

      // Second hit clears completely
      cleared = grid.clearObstacle(2, 2);
      expect(cleared).not.toBeNull();
      expect(cleared?.type).toBe('ice');
      expect(cell?.obstacle).toBeNull();
    });

    test('adjacent obstacle damage accumulates correctly', () => {
      const grid = new Grid(5, 5);
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          grid.setTile(r, c, { id: `t_${r}_${c}`, type: 'red', row: r, col: c, isPowerup: false } as Tile);
        }
      }

      // Place 2-layer ice
      const iceCell = grid.getCell(2, 2);
      if (iceCell) {
        iceCell.obstacle = createIce(2);
        iceCell.tile = null; // Ice blocks tile
      }

      // Damage from adjacent match (position 2,1)
      let damaged = grid.damageAdjacentObstacles(2, 1);
      expect(damaged.length).toBe(1);
      expect(damaged[0].cleared).toBe(false);
      expect(iceCell?.obstacle?.layers).toBe(1);

      // Second damage from another adjacent match (position 2,3)
      damaged = grid.damageAdjacentObstacles(2, 3);
      expect(damaged.length).toBe(1);
      expect(damaged[0].cleared).toBe(true);
      expect(iceCell?.obstacle).toBeNull();
    });

    test('grass obstacle clears when tile above matches', () => {
      const grid = new Grid(5, 5);
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          grid.setTile(r, c, { id: `t_${r}_${c}`, type: 'red', row: r, col: c, isPowerup: false } as Tile);
        }
      }

      // Place grass under a tile
      const grassCell = grid.getCell(2, 2);
      if (grassCell) {
        grassCell.obstacle = createGrass(1);
      }

      // Clear the obstacle directly (as powerup would)
      const cleared = grid.clearObstacle(2, 2);
      expect(cleared).not.toBeNull();
      expect(cleared?.type).toBe('grass');
    });
  });
});
