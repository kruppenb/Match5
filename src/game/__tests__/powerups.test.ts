import { Grid } from '../Grid';
import { activatePowerup } from '../powerupUtils';

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
    test('propeller clears adjacent tiles on takeoff (3x3)', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const propeller = { id: 'p1', type: 'red', row: 2, col: 2, isPowerup: true, powerupType: 'propeller' } as any;
      grid.setTile(2, 2, propeller);

      const affected = activatePowerup(grid, propeller);
      // Propeller should clear at least 8 adjacent tiles on takeoff
      expect(affected.length).toBeGreaterThanOrEqual(8);
    });

    test('propeller clears tiles at target location', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const propeller = { id: 'p1', type: 'red', row: 2, col: 2, isPowerup: true, powerupType: 'propeller' } as any;
      grid.setTile(2, 2, propeller);

      const affected = activatePowerup(grid, propeller);
      // Propeller clears 8 adjacent (3x3 - self) + up to 9 at target location
      // Should clear more than just adjacent tiles
      expect(affected.length).toBeGreaterThan(8);
    });

    test('propeller at corner clears available adjacent tiles', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const propeller = { id: 'p1', type: 'red', row: 0, col: 0, isPowerup: true, powerupType: 'propeller' } as any;
      grid.setTile(0, 0, propeller);

      const affected = activatePowerup(grid, propeller);
      // At corner: only 3 adjacent tiles + target area
      expect(affected.length).toBeGreaterThan(3);
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

    test('propeller chain reaction with adjacent powerup', () => {
      const grid = new Grid(5, 5);
      grid.fillGrid();

      const propeller = { id: 'p1', type: 'red', row: 2, col: 2, isPowerup: true, powerupType: 'propeller' } as any;
      const rocket = { id: 'r1', type: 'blue', row: 2, col: 3, isPowerup: true, powerupType: 'rocket_h' } as any;
      grid.setTile(2, 2, propeller);
      grid.setTile(2, 3, rocket);

      const affected = activatePowerup(grid, propeller);
      // Rocket should be triggered by propeller's takeoff
      expect(affected.some(t => t.id === 'r1')).toBe(true);
      // Rocket should clear its row tiles
      const rowTiles = affected.filter(t => t.row === 2);
      expect(rowTiles.length).toBeGreaterThan(2);
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
});
