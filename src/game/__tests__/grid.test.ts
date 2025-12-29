import { Grid } from '../Grid';

describe('Grid', () => {
  test('fills without nulls', () => {
    const grid = new Grid(6, 6);
    grid.fillGrid();

    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const cell = grid.getCell(r, c);
        expect(cell).toBeDefined();
        expect(cell?.tile).toBeTruthy();
      }
    }
  });

  test('getCell returns null for out of bounds', () => {
    const grid = new Grid(5, 5);
    expect(grid.getCell(-1, 0)).toBeNull();
    expect(grid.getCell(0, -1)).toBeNull();
    expect(grid.getCell(5, 0)).toBeNull();
    expect(grid.getCell(0, 5)).toBeNull();
    expect(grid.getCell(10, 10)).toBeNull();
  });

  test('swapTiles swaps two tiles correctly', () => {
    const grid = new Grid(3, 3);
    const tileA = { id: 'a', type: 'red', row: 0, col: 0, isPowerup: false };
    const tileB = { id: 'b', type: 'blue', row: 1, col: 1, isPowerup: false };
    grid.setTile(0, 0, tileA);
    grid.setTile(1, 1, tileB);

    grid.swapTiles({ row: 0, col: 0 }, { row: 1, col: 1 });

    expect(grid.getTile(0, 0)?.id).toBe('b');
    expect(grid.getTile(1, 1)?.id).toBe('a');
    // Tiles should update their positions
    expect(grid.getTile(0, 0)?.row).toBe(0);
    expect(grid.getTile(0, 0)?.col).toBe(0);
    expect(grid.getTile(1, 1)?.row).toBe(1);
    expect(grid.getTile(1, 1)?.col).toBe(1);
  });

  test('createRandomTile returns valid tile with unique id', () => {
    const grid = new Grid(3, 3);
    const tile1 = grid.createRandomTile(0, 0);
    const tile2 = grid.createRandomTile(0, 1);

    expect(tile1.id).toBeTruthy();
    expect(tile2.id).toBeTruthy();
    expect(tile1.id).not.toBe(tile2.id);
    expect(tile1.row).toBe(0);
    expect(tile1.col).toBe(0);
    expect(tile1.isPowerup).toBe(false);
  });

  test('isAdjacent returns true for adjacent cells', () => {
    const grid = new Grid(5, 5);
    expect(grid.isAdjacent({ row: 2, col: 2 }, { row: 2, col: 3 })).toBe(true); // right
    expect(grid.isAdjacent({ row: 2, col: 2 }, { row: 2, col: 1 })).toBe(true); // left
    expect(grid.isAdjacent({ row: 2, col: 2 }, { row: 1, col: 2 })).toBe(true); // up
    expect(grid.isAdjacent({ row: 2, col: 2 }, { row: 3, col: 2 })).toBe(true); // down
  });

  test('isAdjacent returns false for non-adjacent cells', () => {
    const grid = new Grid(5, 5);
    expect(grid.isAdjacent({ row: 0, col: 0 }, { row: 0, col: 2 })).toBe(false);
    expect(grid.isAdjacent({ row: 0, col: 0 }, { row: 2, col: 0 })).toBe(false);
    expect(grid.isAdjacent({ row: 0, col: 0 }, { row: 1, col: 1 })).toBe(false); // diagonal
  });

  test('getAllTiles returns all tiles', () => {
    const grid = new Grid(3, 3);
    grid.fillGrid();
    const tiles = grid.getAllTiles();
    expect(tiles.length).toBe(9);
  });
});
