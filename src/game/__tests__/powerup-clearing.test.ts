import { Grid } from '../Grid';
import {
  activatePowerup,
  getPowerupAffectedPositions,
  combinePowerups,
  getCombinationAffectedPositions,
} from '../powerupUtils';
import { createIce, createGrass } from '../Obstacle';
import { Tile } from '../../types';

describe('Powerup Clearing Integration Tests', () => {
  describe('Rocket clearing', () => {
    test('rocket_h clears entire row and tiles are properly tracked', () => {
      const grid = new Grid(8, 8);
      grid.fillGrid();

      // Place rocket in middle
      const rocket: Tile = {
        id: 'rocket_1',
        type: 'red',
        row: 4,
        col: 4,
        isPowerup: true,
        powerupType: 'rocket_h',
      };
      grid.setTile(4, 4, rocket);

      // Get affected tiles
      const affected = activatePowerup(grid, rocket);

      // Should affect 7 tiles (all columns except rocket position)
      expect(affected.length).toBe(7);

      // Verify all affected tiles are in row 4
      expect(affected.every(t => t.row === 4)).toBe(true);

      // Verify rocket position is not in affected
      expect(affected.every(t => t.id !== rocket.id)).toBe(true);

      // Get affected positions (for obstacle clearing)
      const positions = getPowerupAffectedPositions(grid, rocket);

      // Should include all 8 columns in the row
      expect(positions.length).toBe(8);
      expect(positions.every(p => p.row === 4)).toBe(true);

      // Simulate clearing: remove all affected tiles from grid
      affected.forEach(tile => {
        grid.setTile(tile.row, tile.col, null);
      });
      grid.setTile(rocket.row, rocket.col, null); // Also remove rocket

      // Verify row is cleared
      for (let col = 0; col < 8; col++) {
        expect(grid.getTile(4, col)).toBeNull();
      }
    });

    test('rocket_v clears entire column', () => {
      const grid = new Grid(8, 8);
      grid.fillGrid();

      const rocket: Tile = {
        id: 'rocket_1',
        type: 'blue',
        row: 3,
        col: 3,
        isPowerup: true,
        powerupType: 'rocket_v',
      };
      grid.setTile(3, 3, rocket);

      const affected = activatePowerup(grid, rocket);

      // Should affect 7 tiles
      expect(affected.length).toBe(7);
      expect(affected.every(t => t.col === 3)).toBe(true);

      // Clear tiles
      affected.forEach(tile => grid.setTile(tile.row, tile.col, null));
      grid.setTile(rocket.row, rocket.col, null);

      // Verify column is cleared
      for (let row = 0; row < 8; row++) {
        expect(grid.getTile(row, 3)).toBeNull();
      }
    });
  });

  describe('Bomb clearing', () => {
    test('bomb clears 5x5 area', () => {
      const grid = new Grid(8, 8);
      grid.fillGrid();

      const bomb: Tile = {
        id: 'bomb_1',
        type: 'green',
        row: 4,
        col: 4,
        isPowerup: true,
        powerupType: 'bomb',
      };
      grid.setTile(4, 4, bomb);

      const affected = activatePowerup(grid, bomb);

      // 5x5 area from (2,2) to (6,6) = 25 tiles - 1 bomb = 24 tiles
      expect(affected.length).toBe(24);

      // Clear tiles
      affected.forEach(tile => grid.setTile(tile.row, tile.col, null));
      grid.setTile(bomb.row, bomb.col, null);

      // Verify 5x5 area is cleared
      for (let r = 2; r <= 6; r++) {
        for (let c = 2; c <= 6; c++) {
          expect(grid.getTile(r, c)).toBeNull();
        }
      }

      // Verify tiles outside 5x5 area still exist
      expect(grid.getTile(0, 0)).not.toBeNull();
      expect(grid.getTile(7, 7)).not.toBeNull();
    });
  });

  describe('Chain reactions', () => {
    test('rocket triggers adjacent bomb', () => {
      const grid = new Grid(8, 8);
      grid.fillGrid();

      // Place rocket at (4, 2)
      const rocket: Tile = {
        id: 'rocket_1',
        type: 'red',
        row: 4,
        col: 2,
        isPowerup: true,
        powerupType: 'rocket_h',
      };
      grid.setTile(4, 2, rocket);

      // Place bomb at (4, 5) - in rocket's path
      const bomb: Tile = {
        id: 'bomb_1',
        type: 'blue',
        row: 4,
        col: 5,
        isPowerup: true,
        powerupType: 'bomb',
      };
      grid.setTile(4, 5, bomb);

      const affected = activatePowerup(grid, rocket);

      // Bomb should be in affected list
      expect(affected.some(t => t.id === 'bomb_1')).toBe(true);

      // Tiles from bomb's 5x5 area should also be affected
      // Bomb affects (2-6, 3-7) area
      const bombAreaTiles = affected.filter(t =>
        t.row >= 2 && t.row <= 6 && t.col >= 3 && t.col <= 7
      );
      expect(bombAreaTiles.length).toBeGreaterThan(10);
    });

    test('bomb triggers multiple rockets', () => {
      const grid = new Grid(8, 8);
      grid.fillGrid();

      // Place bomb at center
      const bomb: Tile = {
        id: 'bomb_1',
        type: 'green',
        row: 4,
        col: 4,
        isPowerup: true,
        powerupType: 'bomb',
      };
      grid.setTile(4, 4, bomb);

      // Place horizontal rocket at (3, 4) - in bomb's radius
      const rocketH: Tile = {
        id: 'rocket_h_1',
        type: 'red',
        row: 3,
        col: 4,
        isPowerup: true,
        powerupType: 'rocket_h',
      };
      grid.setTile(3, 4, rocketH);

      // Place vertical rocket at (4, 3) - in bomb's radius
      const rocketV: Tile = {
        id: 'rocket_v_1',
        type: 'blue',
        row: 4,
        col: 3,
        isPowerup: true,
        powerupType: 'rocket_v',
      };
      grid.setTile(4, 3, rocketV);

      const affected = activatePowerup(grid, bomb);

      // Both rockets should be in affected
      expect(affected.some(t => t.id === 'rocket_h_1')).toBe(true);
      expect(affected.some(t => t.id === 'rocket_v_1')).toBe(true);

      // Tiles from rocket rows/columns should be affected
      // Row 3 should have tiles affected (from rocket_h)
      const row3Tiles = affected.filter(t => t.row === 3 && !t.isPowerup);
      expect(row3Tiles.length).toBeGreaterThan(0);

      // Column 3 should have tiles affected (from rocket_v)
      const col3Tiles = affected.filter(t => t.col === 3 && !t.isPowerup);
      expect(col3Tiles.length).toBeGreaterThan(0);
    });
  });

  describe('Powerup combinations', () => {
    test('rocket + rocket = cross blast', () => {
      const grid = new Grid(8, 8);
      grid.fillGrid();

      const rocketH: Tile = {
        id: 'rocket_h',
        type: 'red',
        row: 4,
        col: 4,
        isPowerup: true,
        powerupType: 'rocket_h',
      };

      const rocketV: Tile = {
        id: 'rocket_v',
        type: 'blue',
        row: 4,
        col: 5,
        isPowerup: true,
        powerupType: 'rocket_v',
      };

      grid.setTile(4, 4, rocketH);
      grid.setTile(4, 5, rocketV);

      const affected = combinePowerups(grid, rocketH, rocketV);

      // Should clear entire row 4 AND entire column 4
      const row4Tiles = affected.filter(t => t.row === 4);
      const col4Tiles = affected.filter(t => t.col === 4);

      // Row 4 should have many tiles (minus the two rockets positions)
      expect(row4Tiles.length).toBeGreaterThan(4);
      // Column 4 should have many tiles
      expect(col4Tiles.length).toBeGreaterThan(4);
    });

    test('bomb + bomb = 7x7 mega explosion', () => {
      const grid = new Grid(8, 8);
      grid.fillGrid();

      const bomb1: Tile = {
        id: 'bomb_1',
        type: 'red',
        row: 4,
        col: 4,
        isPowerup: true,
        powerupType: 'bomb',
      };

      const bomb2: Tile = {
        id: 'bomb_2',
        type: 'blue',
        row: 4,
        col: 5,
        isPowerup: true,
        powerupType: 'bomb',
      };

      grid.setTile(4, 4, bomb1);
      grid.setTile(4, 5, bomb2);

      const affected = combinePowerups(grid, bomb1, bomb2);
      const positions = getCombinationAffectedPositions(grid, bomb1, bomb2);

      // 7x7 area centered at bomb1 position
      // Should affect most of the 8x8 grid
      expect(affected.length).toBeGreaterThan(40);
      expect(positions.length).toBeGreaterThan(40);
    });
  });

  describe('Grid state after clearing', () => {
    test('tiles are properly removed after full clearing sequence', () => {
      const grid = new Grid(8, 8);
      grid.fillGrid();

      // Initial tile count
      const initialTileCount = grid.getAllTiles().length;
      expect(initialTileCount).toBe(64);

      // Place and activate a bomb
      const bomb: Tile = {
        id: 'bomb_1',
        type: 'red',
        row: 4,
        col: 4,
        isPowerup: true,
        powerupType: 'bomb',
      };
      grid.setTile(4, 4, bomb);

      const affected = activatePowerup(grid, bomb);

      // Simulate clearing sequence
      affected.forEach(tile => {
        const currentTile = grid.getTile(tile.row, tile.col);
        if (currentTile && currentTile.id === tile.id) {
          grid.setTile(tile.row, tile.col, null);
        }
      });
      grid.setTile(bomb.row, bomb.col, null);

      // Count remaining tiles
      const remainingTileCount = grid.getAllTiles().length;

      // Should have cleared 25 tiles (5x5 area including bomb)
      expect(initialTileCount - remainingTileCount).toBe(25);
    });
  });

  describe('Multi-layer obstacle damage', () => {
    test('powerup damages 2-layer ice obstacle - first hit reduces layer', () => {
      const grid = new Grid(8, 8);
      grid.fillGrid();

      // Add 2-layer ice at position
      const cell = grid.getCell(4, 4);
      if (cell) {
        cell.obstacle = createIce(2);
      }

      // Verify initial state
      expect(cell?.obstacle?.layers).toBe(2);

      // Place rocket that will hit the ice position
      const rocket: Tile = {
        id: 'rocket_1',
        type: 'red',
        row: 4,
        col: 0,
        isPowerup: true,
        powerupType: 'rocket_h',
      };
      grid.setTile(4, 0, rocket);

      // Get affected positions - should include the ice cell
      const positions = getPowerupAffectedPositions(grid, rocket);
      expect(positions.some(p => p.row === 4 && p.col === 4)).toBe(true);

      // Simulate clearing (like PowerupActivator does)
      // First, try to clear obstacle
      const clearedObstacle = grid.clearObstacle(4, 4);

      // Should NOT be fully cleared (still has 1 layer)
      expect(clearedObstacle).toBeNull();

      // Obstacle should still exist with reduced layers
      expect(cell?.obstacle).not.toBeNull();
      expect(cell?.obstacle?.layers).toBe(1);
    });

    test('powerup damages 2-layer grass obstacle - first hit reduces layer', () => {
      const grid = new Grid(8, 8);
      grid.fillGrid();

      // Add 2-layer grass at position
      const cell = grid.getCell(4, 5);
      if (cell) {
        cell.obstacle = createGrass(2);
      }

      // Verify initial state
      expect(cell?.obstacle?.layers).toBe(2);

      // Clear obstacle once - should reduce to 1 layer
      const firstClear = grid.clearObstacle(4, 5);
      expect(firstClear).toBeNull(); // Not fully cleared
      expect(cell?.obstacle?.layers).toBe(1);

      // Clear again - should fully clear
      const secondClear = grid.clearObstacle(4, 5);
      expect(secondClear).not.toBeNull(); // Now fully cleared
      expect(secondClear?.type).toBe('grass');
      expect(cell?.obstacle).toBeNull();
    });

    test('bomb hitting multiple multi-layer obstacles damages all of them', () => {
      const grid = new Grid(8, 8);
      grid.fillGrid();

      // Add 2-layer ice at multiple positions in bomb's 5x5 area
      const icePositions = [
        { row: 3, col: 3 },
        { row: 3, col: 5 },
        { row: 5, col: 3 },
        { row: 5, col: 5 },
      ];

      for (const pos of icePositions) {
        const cell = grid.getCell(pos.row, pos.col);
        if (cell) {
          cell.obstacle = createIce(2);
        }
      }

      // Place bomb at center
      const bomb: Tile = {
        id: 'bomb_1',
        type: 'red',
        row: 4,
        col: 4,
        isPowerup: true,
        powerupType: 'bomb',
      };
      grid.setTile(4, 4, bomb);

      // Get affected positions
      const positions = getPowerupAffectedPositions(grid, bomb);

      // All ice positions should be in affected positions
      for (const pos of icePositions) {
        expect(positions.some(p => p.row === pos.row && p.col === pos.col)).toBe(true);
      }

      // Simulate clearing each position
      for (const pos of positions) {
        grid.clearObstacle(pos.row, pos.col);
      }

      // All ice obstacles should be damaged (1 layer remaining)
      for (const pos of icePositions) {
        const cell = grid.getCell(pos.row, pos.col);
        expect(cell?.obstacle?.layers).toBe(1);
      }
    });
  });

  describe('Powerups clearing tiles on grass cells (Level 8 scenario)', () => {
    test('rocket_h clears BOTH grass obstacles AND tiles on top', () => {
      const grid = new Grid(8, 8);
      grid.fillGrid();

      // Add grass obstacles to row 4 (like level 8 has)
      // Grass cells have BOTH an obstacle AND a tile on top
      for (let col = 0; col < 8; col++) {
        const cell = grid.getCell(4, col);
        if (cell) {
          cell.obstacle = createGrass(1);
          // Tile already exists from fillGrid
        }
      }

      // Verify initial state: all cells in row 4 have both grass and tiles
      for (let col = 0; col < 8; col++) {
        const cell = grid.getCell(4, col);
        expect(cell?.obstacle?.type).toBe('grass');
        expect(cell?.tile).not.toBeNull();
      }

      // Place rocket at (3, 4) - row above the grass row
      const rocket: Tile = {
        id: 'rocket_1',
        type: 'red',
        row: 4,
        col: 0,
        isPowerup: true,
        powerupType: 'rocket_h',
      };
      grid.setTile(4, 0, rocket);

      // Get affected tiles
      const affectedTiles = activatePowerup(grid, rocket);

      // Get affected positions (for obstacle clearing)
      const affectedPositions = getPowerupAffectedPositions(grid, rocket);

      // CRITICAL: Should have 7 tiles (all cells in row 4 except rocket position)
      expect(affectedTiles.length).toBe(7);

      // All affected tiles should be in row 4
      expect(affectedTiles.every(t => t.row === 4)).toBe(true);

      // Should have 8 positions (entire row for obstacle clearing)
      expect(affectedPositions.length).toBe(8);

      // Simulate the clearing sequence (like PowerupActivator does):
      // 1. Clear obstacles at affected positions
      for (const pos of affectedPositions) {
        grid.clearObstacle(pos.row, pos.col);
      }

      // 2. Clear tiles
      for (const tile of affectedTiles) {
        grid.setTile(tile.row, tile.col, null);
      }
      grid.setTile(rocket.row, rocket.col, null);

      // Verify: ALL grass obstacles in row 4 should be cleared
      for (let col = 0; col < 8; col++) {
        const cell = grid.getCell(4, col);
        expect(cell?.obstacle).toBeNull();
      }

      // Verify: ALL tiles in row 4 should be cleared
      for (let col = 0; col < 8; col++) {
        expect(grid.getTile(4, col)).toBeNull();
      }
    });

    test('bomb clears grass AND tiles in 5x5 area', () => {
      const grid = new Grid(8, 8);
      grid.fillGrid();

      // Add grass obstacles to a 5x5 area centered at (4,4)
      for (let r = 2; r <= 6; r++) {
        for (let c = 2; c <= 6; c++) {
          const cell = grid.getCell(r, c);
          if (cell) {
            cell.obstacle = createGrass(1);
          }
        }
      }

      // Place bomb at center
      const bomb: Tile = {
        id: 'bomb_1',
        type: 'red',
        row: 4,
        col: 4,
        isPowerup: true,
        powerupType: 'bomb',
      };
      grid.setTile(4, 4, bomb);

      // Get affected tiles and positions
      const affectedTiles = activatePowerup(grid, bomb);
      const affectedPositions = getPowerupAffectedPositions(grid, bomb);

      // Should affect 24 tiles (5x5 = 25 - 1 bomb)
      expect(affectedTiles.length).toBe(24);

      // Should affect 25 positions
      expect(affectedPositions.length).toBe(25);

      // Simulate clearing
      for (const pos of affectedPositions) {
        grid.clearObstacle(pos.row, pos.col);
      }
      for (const tile of affectedTiles) {
        grid.setTile(tile.row, tile.col, null);
      }
      grid.setTile(bomb.row, bomb.col, null);

      // Verify: all grass and tiles in 5x5 area should be cleared
      for (let r = 2; r <= 6; r++) {
        for (let c = 2; c <= 6; c++) {
          const cell = grid.getCell(r, c);
          expect(cell?.obstacle).toBeNull();
          expect(grid.getTile(r, c)).toBeNull();
        }
      }
    });

    test('tiles on grass cells are returned by activatePowerup', () => {
      const grid = new Grid(8, 8);

      // Manually create tiles with grass underneath (like level 8)
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const cell = grid.getCell(row, col);
          if (cell) {
            cell.tile = {
              id: `tile_${row}_${col}`,
              type: ['red', 'blue', 'green'][Math.floor(Math.random() * 3)],
              row,
              col,
              isPowerup: false,
            };
            // Add grass to all cells except where rocket will be placed
            if (!(row === 4 && col === 0)) {
              cell.obstacle = createGrass(1);
            }
          }
        }
      }

      // Place rocket
      const rocket: Tile = {
        id: 'rocket_1',
        type: 'red',
        row: 4,
        col: 0,
        isPowerup: true,
        powerupType: 'rocket_h',
      };
      grid.setTile(4, 0, rocket);

      // Get affected tiles
      const affectedTiles = activatePowerup(grid, rocket);

      // Should return 7 tiles (all cells in row 4 except rocket position)
      // These tiles are on TOP of grass obstacles
      expect(affectedTiles.length).toBe(7);

      // Verify each affected tile exists and is at the correct position
      for (const tile of affectedTiles) {
        expect(tile.row).toBe(4);
        expect(tile.col).not.toBe(0); // Not the rocket position
        expect(tile.isPowerup).toBe(false);
      }
    });

    test('initializeFromLayout creates grass cells with tiles', () => {
      const grid = new Grid(8, 8);

      // Layout similar to level 8 - row with grass
      const layout = [
        ['.', '.', '.', '.', '.', '.', '.', '.'],
        ['.', '.', '.', '.', '.', '.', '.', '.'],
        ['.', '.', '.', '.', '.', '.', '.', '.'],
        ['.', '.', '.', '.', '.', '.', '.', '.'],
        ['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G'], // Row 4: all grass
        ['.', '.', '.', '.', '.', '.', '.', '.'],
        ['.', '.', '.', '.', '.', '.', '.', '.'],
        ['.', '.', '.', '.', '.', '.', '.', '.'],
      ];

      grid.initializeFromLayout(layout, 5);

      // Verify: row 4 should have both grass obstacles AND tiles
      for (let col = 0; col < 8; col++) {
        const cell = grid.getCell(4, col);
        expect(cell?.obstacle?.type).toBe('grass');
        expect(cell?.tile).not.toBeNull();
        expect(cell?.tile?.isPowerup).toBe(false);
      }

      // Now test that a powerup would clear both
      const rocket: Tile = {
        id: 'rocket_test',
        type: 'red',
        row: 4,
        col: 0,
        isPowerup: true,
        powerupType: 'rocket_h',
      };
      grid.setTile(4, 0, rocket);

      const affectedTiles = activatePowerup(grid, rocket);
      const affectedPositions = getPowerupAffectedPositions(grid, rocket);

      // Should have 7 tiles (all grass cells have tiles, minus rocket position)
      expect(affectedTiles.length).toBe(7);
      // Should have 8 positions for obstacle clearing
      expect(affectedPositions.length).toBe(8);
    });

    test('PowerupActivator-like flow clears both grass and tiles', () => {
      const grid = new Grid(8, 8);

      // Layout like level 8
      const layout = [
        ['.', 'G', 'G', 'G', 'G', 'G', 'G', '.'],
        ['G', '.', '.', '.', '.', '.', '.', 'G'],
        ['G', '.', 'G', 'G', 'G', 'G', '.', 'G'],
        ['G', '.', 'G', '.', '.', 'G', '.', 'G'],
        ['G', '.', 'G', '.', '.', 'G', '.', 'G'],
        ['G', '.', 'G', 'G', 'G', 'G', '.', 'G'],
        ['G', '.', '.', '.', '.', '.', '.', 'G'],
        ['.', 'G', 'G', 'G', 'G', 'G', 'G', '.'],
      ];

      grid.initializeFromLayout(layout, 5);

      // Place a horizontal rocket at row 3, col 1 (a cell without grass)
      const rocket: Tile = {
        id: 'rocket_test',
        type: 'red',
        row: 3,
        col: 1,
        isPowerup: true,
        powerupType: 'rocket_h',
      };
      grid.setTile(3, 1, rocket);

      // Simulate PowerupActivator flow (FIXED: don't pre-add to alreadyActivated)
      const tilesToClear = new Set<Tile>();
      const alreadyActivated = new Set<string>();

      // Add the powerup itself
      tilesToClear.add(rocket);
      // NOTE: Don't add to alreadyActivated here - activatePowerup will do it

      // Get affected tiles (like activatePowerup does)
      const affected = activatePowerup(grid, rocket, undefined, alreadyActivated);
      affected.forEach(t => tilesToClear.add(t));

      // Get affected positions for obstacles
      const affectedPositions = new Set<string>();
      tilesToClear.forEach(tile => {
        affectedPositions.add(`${tile.row},${tile.col}`);
      });
      const positions = getPowerupAffectedPositions(grid, rocket);
      positions.forEach(p => affectedPositions.add(`${p.row},${p.col}`));

      // Verify we got tiles from grass cells
      // Row 3: cols 0, 2, 5, 7 have grass with tiles
      const grassCellTiles = affected.filter(t => {
        const cell = grid.getCell(t.row, t.col);
        return cell?.obstacle?.type === 'grass';
      });
      expect(grassCellTiles.length).toBeGreaterThan(0);

      // Clear obstacles at affected positions
      let obstaclesCleared = 0;
      affectedPositions.forEach(key => {
        const [row, col] = key.split(',').map(Number);
        const clearedObstacle = grid.clearObstacle(row, col);
        if (clearedObstacle) obstaclesCleared++;
      });

      // Clear tiles from grid
      let tilesCleared = 0;
      tilesToClear.forEach(tile => {
        const currentTile = grid.getTile(tile.row, tile.col);
        if (currentTile && currentTile.id === tile.id) {
          grid.setTile(tile.row, tile.col, null);
          tilesCleared++;
        }
      });

      // Verify results
      // Should have cleared some grass obstacles
      expect(obstaclesCleared).toBeGreaterThan(0);

      // Should have cleared tiles (including tiles on grass)
      expect(tilesCleared).toBeGreaterThan(0);

      // Verify row 3 is cleared
      for (let col = 0; col < 8; col++) {
        expect(grid.getTile(3, col)).toBeNull();
        // Grass obstacles in row 3 should be cleared
        const cell = grid.getCell(3, col);
        if ([2, 5].includes(col)) {
          // These cells had grass
          expect(cell?.obstacle).toBeNull();
        }
      }
    });
  });
});
