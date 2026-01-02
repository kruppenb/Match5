import { Grid } from '../Grid';
import { BoosterManager } from '../BoosterManager';
import { Tile } from '../../types';

describe('BoosterManager', () => {
  test('starts with correct inventory', () => {
    const manager = new BoosterManager();
    const inventory = manager.getInventory();

    expect(inventory.hammer).toBe(1);
    expect(inventory.row_arrow).toBe(1);
    expect(inventory.col_arrow).toBe(1);
    expect(inventory.shuffle).toBe(1);
  });

  test('useBooster decrements inventory', () => {
    const manager = new BoosterManager();

    expect(manager.hasBooster('hammer')).toBe(true);
    expect(manager.useBooster('hammer')).toBe(true);
    expect(manager.hasBooster('hammer')).toBe(false);
    expect(manager.useBooster('hammer')).toBe(false);
  });

  test('reset restores inventory', () => {
    const manager = new BoosterManager();

    manager.useBooster('hammer');
    manager.useBooster('shuffle');
    manager.reset();

    expect(manager.hasBooster('hammer')).toBe(true);
    expect(manager.hasBooster('shuffle')).toBe(true);
  });

  test('getAffectedTiles for hammer returns single tile', () => {
    const grid = new Grid(5, 5);
    grid.fillGrid();
    const manager = new BoosterManager();

    const affected = manager.getAffectedTiles('hammer', grid, { row: 2, col: 2 });
    expect(affected.length).toBe(1);
    expect(affected[0].row).toBe(2);
    expect(affected[0].col).toBe(2);
  });

  test('getAffectedTiles for row_arrow returns entire row', () => {
    const grid = new Grid(5, 5);
    grid.fillGrid();
    const manager = new BoosterManager();

    const affected = manager.getAffectedTiles('row_arrow', grid, { row: 2, col: 2 });
    expect(affected.length).toBe(5);
    affected.forEach(tile => {
      expect(tile.row).toBe(2);
    });
  });

  test('getAffectedTiles for col_arrow returns entire column', () => {
    const grid = new Grid(5, 5);
    grid.fillGrid();
    const manager = new BoosterManager();

    const affected = manager.getAffectedTiles('col_arrow', grid, { row: 2, col: 3 });
    expect(affected.length).toBe(5);
    affected.forEach(tile => {
      expect(tile.col).toBe(3);
    });
  });
});

describe('Shuffle - No Tile Overlap', () => {
  test('shuffling positions maintains one tile per cell', () => {
    const grid = new Grid(8, 8);
    grid.fillGrid();

    // Collect all tiles
    const tileData: { tile: Tile; row: number; col: number }[] = [];
    grid.forEachCell((cell) => {
      if (cell.tile && !cell.blocked) {
        tileData.push({ tile: cell.tile, row: cell.row, col: cell.col });
      }
    });

    const originalCount = tileData.length;
    expect(originalCount).toBe(64);

    // Simulate shuffle (same logic as executeShuffleBooster)
    const shuffledPositions = [...tileData];
    for (let i = shuffledPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tempRow = shuffledPositions[i].row;
      const tempCol = shuffledPositions[i].col;
      shuffledPositions[i].row = shuffledPositions[j].row;
      shuffledPositions[i].col = shuffledPositions[j].col;
      shuffledPositions[j].row = tempRow;
      shuffledPositions[j].col = tempCol;
    }

    // Clear all positions first
    tileData.forEach(({ tile }) => {
      grid.setTile(tile.row, tile.col, null);
    });

    // Set new positions
    shuffledPositions.forEach(({ tile, row, col }) => {
      tile.row = row;
      tile.col = col;
      grid.setTile(row, col, tile);
    });

    // Verify: count tiles in grid
    let tileCount = 0;
    const seenPositions = new Set<string>();
    const seenTileIds = new Set<string>();

    grid.forEachCell((cell) => {
      if (cell.tile) {
        tileCount++;

        // Check no duplicate positions
        const posKey = `${cell.row},${cell.col}`;
        expect(seenPositions.has(posKey)).toBe(false);
        seenPositions.add(posKey);

        // Check no duplicate tile IDs
        expect(seenTileIds.has(cell.tile.id)).toBe(false);
        seenTileIds.add(cell.tile.id);

        // Check tile position matches cell position
        expect(cell.tile.row).toBe(cell.row);
        expect(cell.tile.col).toBe(cell.col);
      }
    });

    // Should have same number of tiles as before
    expect(tileCount).toBe(originalCount);
  });

  test('shuffle with blocked cells maintains integrity', () => {
    const grid = new Grid(6, 6);
    grid.fillGrid();

    // Block some cells (simulate obstacles that block tiles)
    const blockedPositions = [
      { row: 1, col: 1 },
      { row: 2, col: 3 },
      { row: 4, col: 4 },
    ];

    blockedPositions.forEach(pos => {
      grid.setTile(pos.row, pos.col, null);
      const cell = grid.getCell(pos.row, pos.col);
      if (cell) {
        cell.blocked = true;
      }
    });

    // Collect movable tiles
    const tileData: { tile: Tile; row: number; col: number }[] = [];
    grid.forEachCell((cell) => {
      if (cell.tile && !cell.blocked) {
        tileData.push({ tile: cell.tile, row: cell.row, col: cell.col });
      }
    });

    const originalCount = tileData.length;
    expect(originalCount).toBe(36 - 3); // 6x6 minus 3 blocked

    // Shuffle positions
    const shuffledPositions = [...tileData];
    for (let i = shuffledPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tempRow = shuffledPositions[i].row;
      const tempCol = shuffledPositions[i].col;
      shuffledPositions[i].row = shuffledPositions[j].row;
      shuffledPositions[i].col = shuffledPositions[j].col;
      shuffledPositions[j].row = tempRow;
      shuffledPositions[j].col = tempCol;
    }

    // Clear and reassign
    tileData.forEach(({ tile }) => {
      grid.setTile(tile.row, tile.col, null);
    });

    shuffledPositions.forEach(({ tile, row, col }) => {
      tile.row = row;
      tile.col = col;
      grid.setTile(row, col, tile);
    });

    // Verify
    let tileCount = 0;
    grid.forEachCell((cell) => {
      if (cell.tile) {
        tileCount++;
        expect(cell.tile.row).toBe(cell.row);
        expect(cell.tile.col).toBe(cell.col);
      }
    });

    expect(tileCount).toBe(originalCount);

    // Blocked cells should still be empty
    blockedPositions.forEach(pos => {
      expect(grid.getTile(pos.row, pos.col)).toBeNull();
    });
  });

  test('multiple shuffles maintain grid integrity', () => {
    const grid = new Grid(8, 8);
    grid.fillGrid();

    // Perform 10 shuffles
    for (let shuffle = 0; shuffle < 10; shuffle++) {
      const tileData: { tile: Tile; row: number; col: number }[] = [];
      grid.forEachCell((cell) => {
        if (cell.tile && !cell.blocked) {
          tileData.push({ tile: cell.tile, row: cell.row, col: cell.col });
        }
      });

      const shuffledPositions = [...tileData];
      for (let i = shuffledPositions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tempRow = shuffledPositions[i].row;
        const tempCol = shuffledPositions[i].col;
        shuffledPositions[i].row = shuffledPositions[j].row;
        shuffledPositions[i].col = shuffledPositions[j].col;
        shuffledPositions[j].row = tempRow;
        shuffledPositions[j].col = tempCol;
      }

      tileData.forEach(({ tile }) => {
        grid.setTile(tile.row, tile.col, null);
      });

      shuffledPositions.forEach(({ tile, row, col }) => {
        tile.row = row;
        tile.col = col;
        grid.setTile(row, col, tile);
      });
    }

    // Final verification
    let tileCount = 0;
    const seenIds = new Set<string>();

    grid.forEachCell((cell) => {
      if (cell.tile) {
        tileCount++;
        expect(seenIds.has(cell.tile.id)).toBe(false);
        seenIds.add(cell.tile.id);
        expect(cell.tile.row).toBe(cell.row);
        expect(cell.tile.col).toBe(cell.col);
      }
    });

    expect(tileCount).toBe(64);
  });
});
