import { Grid } from '../Grid';
import { MatchDetector } from '../MatchDetector';

describe('MatchDetector', () => {
  test('detects simple horizontal match', () => {
    const grid = new Grid(5, 5);
    // fill with controlled tiles
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        grid.setTile(r, c, { id: `t_${r}_${c}`, type: 'red', row: r, col: c, isPowerup: false });
      }
    }

    // make a blue horizontal match at row 2, cols 1-3
    grid.setTile(2, 1, { id: 'b1', type: 'blue', row: 2, col: 1, isPowerup: false });
    grid.setTile(2, 2, { id: 'b2', type: 'blue', row: 2, col: 2, isPowerup: false });
    grid.setTile(2, 3, { id: 'b3', type: 'blue', row: 2, col: 3, isPowerup: false });

    const detector = new MatchDetector();
    const matches = detector.findAllMatches(grid);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    const found = matches.some(m => m.tiles.some(t => t.id === 'b1'));
    expect(found).toBe(true);
  });

  test('detects simple vertical match', () => {
    const grid = new Grid(5, 5);
    // fill with one color
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        grid.setTile(r, c, { id: `t_${r}_${c}`, type: 'red', row: r, col: c, isPowerup: false });
      }
    }

    // make a green vertical match at col 2, rows 1-3
    grid.setTile(1, 2, { id: 'g1', type: 'green', row: 1, col: 2, isPowerup: false });
    grid.setTile(2, 2, { id: 'g2', type: 'green', row: 2, col: 2, isPowerup: false });
    grid.setTile(3, 2, { id: 'g3', type: 'green', row: 3, col: 2, isPowerup: false });

    const detector = new MatchDetector();
    const matches = detector.findAllMatches(grid);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    const found = matches.some(m => m.tiles.some(t => t.id === 'g1') && m.type === 'vertical');
    expect(found).toBe(true);
  });

  test('4-in-a-row horizontal creates rocket_h', () => {
    const grid = new Grid(5, 5);
    // fill grid with unique colors (no matches)
    const colors = ['red', 'blue', 'green', 'yellow', 'purple'];
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const type = colors[(r * 5 + c) % colors.length];
        grid.setTile(r, c, { id: `t_${r}_${c}`, type, row: r, col: c, isPowerup: false });
      }
    }

    // Create 4-in-a-row horizontal match
    grid.setTile(2, 0, { id: 'h1', type: 'orange', row: 2, col: 0, isPowerup: false });
    grid.setTile(2, 1, { id: 'h2', type: 'orange', row: 2, col: 1, isPowerup: false });
    grid.setTile(2, 2, { id: 'h3', type: 'orange', row: 2, col: 2, isPowerup: false });
    grid.setTile(2, 3, { id: 'h4', type: 'orange', row: 2, col: 3, isPowerup: false });

    const detector = new MatchDetector();
    const matches = detector.findAllMatches(grid);
    const rocketMatch = matches.find(m => m.powerupType === 'rocket_h');
    expect(rocketMatch).toBeDefined();
    expect(rocketMatch?.tiles.length).toBe(4);
  });

  test('4-in-a-row vertical creates rocket_v', () => {
    const grid = new Grid(5, 5);
    const colors = ['red', 'blue', 'green', 'yellow', 'purple'];
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const type = colors[(r * 5 + c) % colors.length];
        grid.setTile(r, c, { id: `t_${r}_${c}`, type, row: r, col: c, isPowerup: false });
      }
    }

    // Create 4-in-a-row vertical match
    grid.setTile(0, 2, { id: 'v1', type: 'orange', row: 0, col: 2, isPowerup: false });
    grid.setTile(1, 2, { id: 'v2', type: 'orange', row: 1, col: 2, isPowerup: false });
    grid.setTile(2, 2, { id: 'v3', type: 'orange', row: 2, col: 2, isPowerup: false });
    grid.setTile(3, 2, { id: 'v4', type: 'orange', row: 3, col: 2, isPowerup: false });

    const detector = new MatchDetector();
    const matches = detector.findAllMatches(grid);
    const rocketMatch = matches.find(m => m.powerupType === 'rocket_v');
    expect(rocketMatch).toBeDefined();
    expect(rocketMatch?.tiles.length).toBe(4);
  });

  test('5-in-a-row creates color_bomb', () => {
    const grid = new Grid(6, 6);
    const colors = ['red', 'blue', 'green', 'yellow', 'purple'];
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const type = colors[(r * 6 + c) % colors.length];
        grid.setTile(r, c, { id: `t_${r}_${c}`, type, row: r, col: c, isPowerup: false });
      }
    }

    // Create 5-in-a-row
    for (let c = 0; c < 5; c++) {
      grid.setTile(2, c, { id: `cb${c}`, type: 'pink', row: 2, col: c, isPowerup: false });
    }

    const detector = new MatchDetector();
    const matches = detector.findAllMatches(grid);
    const cbMatch = matches.find(m => m.powerupType === 'color_bomb');
    expect(cbMatch).toBeDefined();
    expect(cbMatch?.tiles.length).toBe(5);
  });

  test('L-shape creates bomb', () => {
    const grid = new Grid(5, 5);
    const colors = ['red', 'blue', 'green', 'yellow', 'purple'];
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const type = colors[(r * 5 + c) % colors.length];
        grid.setTile(r, c, { id: `t_${r}_${c}`, type, row: r, col: c, isPowerup: false });
      }
    }

    // Create L-shape: vertical part at col 2, rows 0-2, horizontal at row 2, cols 2-4
    grid.setTile(0, 2, { id: 'L1', type: 'cyan', row: 0, col: 2, isPowerup: false });
    grid.setTile(1, 2, { id: 'L2', type: 'cyan', row: 1, col: 2, isPowerup: false });
    grid.setTile(2, 2, { id: 'L3', type: 'cyan', row: 2, col: 2, isPowerup: false }); // corner
    grid.setTile(2, 3, { id: 'L4', type: 'cyan', row: 2, col: 3, isPowerup: false });
    grid.setTile(2, 4, { id: 'L5', type: 'cyan', row: 2, col: 4, isPowerup: false });

    const detector = new MatchDetector();
    const matches = detector.findAllMatches(grid);
    const bombMatch = matches.find(m => m.powerupType === 'bomb');
    expect(bombMatch).toBeDefined();
    expect(bombMatch?.tiles.length).toBe(5);
  });

  test('no matches returns empty array', () => {
    const grid = new Grid(3, 3);
    // Checkerboard pattern - no matches possible
    const colors = ['red', 'blue'];
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const type = colors[(r + c) % 2];
        grid.setTile(r, c, { id: `t_${r}_${c}`, type, row: r, col: c, isPowerup: false });
      }
    }

    const detector = new MatchDetector();
    const matches = detector.findAllMatches(grid);
    expect(matches.length).toBe(0);
  });

  test('2x2 square creates propeller', () => {
    const grid = new Grid(5, 5);
    // Fill with unique colors (no matches)
    const colors = ['red', 'blue', 'green', 'yellow', 'purple'];
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const type = colors[(r * 5 + c) % colors.length];
        grid.setTile(r, c, { id: `t_${r}_${c}`, type, row: r, col: c, isPowerup: false });
      }
    }

    // Create 2x2 square at rows 1-2, cols 1-2
    grid.setTile(1, 1, { id: 's1', type: 'orange', row: 1, col: 1, isPowerup: false });
    grid.setTile(1, 2, { id: 's2', type: 'orange', row: 1, col: 2, isPowerup: false });
    grid.setTile(2, 1, { id: 's3', type: 'orange', row: 2, col: 1, isPowerup: false });
    grid.setTile(2, 2, { id: 's4', type: 'orange', row: 2, col: 2, isPowerup: false });

    const detector = new MatchDetector();
    const matches = detector.findAllMatches(grid);
    const propellerMatch = matches.find(m => m.powerupType === 'propeller');
    expect(propellerMatch).toBeDefined();
    expect(propellerMatch?.tiles.length).toBe(4);
    expect(propellerMatch?.type).toBe('square');
  });

  test('2x2 square at corner creates propeller', () => {
    const grid = new Grid(4, 4);
    // Fill with unique colors
    const colors = ['red', 'blue', 'green', 'yellow'];
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const type = colors[(r * 4 + c) % colors.length];
        grid.setTile(r, c, { id: `t_${r}_${c}`, type, row: r, col: c, isPowerup: false });
      }
    }

    // Create 2x2 square at top-left corner
    grid.setTile(0, 0, { id: 's1', type: 'pink', row: 0, col: 0, isPowerup: false });
    grid.setTile(0, 1, { id: 's2', type: 'pink', row: 0, col: 1, isPowerup: false });
    grid.setTile(1, 0, { id: 's3', type: 'pink', row: 1, col: 0, isPowerup: false });
    grid.setTile(1, 1, { id: 's4', type: 'pink', row: 1, col: 1, isPowerup: false });

    const detector = new MatchDetector();
    const matches = detector.findAllMatches(grid);
    const propellerMatch = matches.find(m => m.powerupType === 'propeller');
    expect(propellerMatch).toBeDefined();
    expect(propellerMatch?.powerupPosition).toEqual({ row: 0, col: 0 });
  });

  test('2x2 square does not interfere with line matches', () => {
    const grid = new Grid(5, 5);
    // Fill with unique colors
    const colors = ['red', 'blue', 'green', 'yellow', 'purple'];
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const type = colors[(r * 5 + c) % colors.length];
        grid.setTile(r, c, { id: `t_${r}_${c}`, type, row: r, col: c, isPowerup: false });
      }
    }

    // Create a 2x2 square (propeller)
    grid.setTile(1, 1, { id: 's1', type: 'orange', row: 1, col: 1, isPowerup: false });
    grid.setTile(1, 2, { id: 's2', type: 'orange', row: 1, col: 2, isPowerup: false });
    grid.setTile(2, 1, { id: 's3', type: 'orange', row: 2, col: 1, isPowerup: false });
    grid.setTile(2, 2, { id: 's4', type: 'orange', row: 2, col: 2, isPowerup: false });

    // Create a separate 3-in-a-row horizontal match
    grid.setTile(4, 0, { id: 'h1', type: 'cyan', row: 4, col: 0, isPowerup: false });
    grid.setTile(4, 1, { id: 'h2', type: 'cyan', row: 4, col: 1, isPowerup: false });
    grid.setTile(4, 2, { id: 'h3', type: 'cyan', row: 4, col: 2, isPowerup: false });

    const detector = new MatchDetector();
    const matches = detector.findAllMatches(grid);

    // Should have both propeller and horizontal match
    const propellerMatch = matches.find(m => m.powerupType === 'propeller');
    const lineMatch = matches.find(m => m.type === 'horizontal' && m.tiles.some(t => t.id === 'h1'));
    expect(propellerMatch).toBeDefined();
    expect(lineMatch).toBeDefined();
  });

  test('line matches take priority over square matches (propellers)', () => {
    const grid = new Grid(5, 5);
    // Fill with unique colors
    const colors = ['red', 'blue', 'green', 'yellow', 'purple'];
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const type = colors[(r * 5 + c) % colors.length];
        grid.setTile(r, c, { id: `t_${r}_${c}`, type, row: r, col: c, isPowerup: false });
      }
    }

    // Create a 2x2 square that could look like part of a line
    grid.setTile(2, 1, { id: 's1', type: 'orange', row: 2, col: 1, isPowerup: false });
    grid.setTile(2, 2, { id: 's2', type: 'orange', row: 2, col: 2, isPowerup: false });
    grid.setTile(3, 1, { id: 's3', type: 'orange', row: 3, col: 1, isPowerup: false });
    grid.setTile(3, 2, { id: 's4', type: 'orange', row: 3, col: 2, isPowerup: false });

    // Add one more orange tile adjacent - this SHOULD form a line match
    // because line matches now take priority over square matches
    grid.setTile(2, 3, { id: 'extra', type: 'orange', row: 2, col: 3, isPowerup: false });

    const detector = new MatchDetector();
    const matches = detector.findAllMatches(grid);

    // Should have a 3-in-a-row horizontal match (line matches take priority)
    const orangeLineMatch = matches.find(m =>
      m.type === 'horizontal' &&
      m.tiles.every(t => t.type === 'orange')
    );
    expect(orangeLineMatch).toBeDefined();
    expect(orangeLineMatch!.tiles.length).toBe(3);

    // The propeller should NOT be created because its tiles are part of the line match
    // (only 2 of the 4 square tiles remain after the line takes priority)
    const propellerMatch = matches.find(m => m.powerupType === 'propeller');
    expect(propellerMatch).toBeUndefined();
  });

  test('color bomb takes priority over bomb (5 in row + perpendicular)', () => {
    const grid = new Grid(7, 7);
    // Fill with unique colors
    const colors = ['red', 'blue', 'green', 'yellow', 'purple'];
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const type = colors[(r * 7 + c) % colors.length];
        grid.setTile(r, c, { id: `t_${r}_${c}`, type, row: r, col: c, isPowerup: false });
      }
    }

    // Create a 5 horizontal + 3 vertical (L/T shape with 7 tiles total)
    // The horizontal 5 should trigger color_bomb, not bomb
    grid.setTile(3, 1, { id: 'h1', type: 'orange', row: 3, col: 1, isPowerup: false });
    grid.setTile(3, 2, { id: 'h2', type: 'orange', row: 3, col: 2, isPowerup: false });
    grid.setTile(3, 3, { id: 'h3', type: 'orange', row: 3, col: 3, isPowerup: false }); // intersection
    grid.setTile(3, 4, { id: 'h4', type: 'orange', row: 3, col: 4, isPowerup: false });
    grid.setTile(3, 5, { id: 'h5', type: 'orange', row: 3, col: 5, isPowerup: false });
    // Vertical arm
    grid.setTile(2, 3, { id: 'v1', type: 'orange', row: 2, col: 3, isPowerup: false });
    grid.setTile(4, 3, { id: 'v2', type: 'orange', row: 4, col: 3, isPowerup: false });

    const detector = new MatchDetector();
    const matches = detector.findAllMatches(grid);

    // Should have a color_bomb (5 in a row takes priority over L/T bomb)
    const colorBombMatch = matches.find(m => m.powerupType === 'color_bomb');
    expect(colorBombMatch).toBeDefined();
    expect(colorBombMatch!.tiles.length).toBe(7); // All tiles merged

    // Should NOT have a bomb
    const bombMatch = matches.find(m => m.powerupType === 'bomb');
    expect(bombMatch).toBeUndefined();
  });

  test('bomb takes priority over rocket (L shape with 3+3)', () => {
    const grid = new Grid(6, 6);
    // Fill with unique colors
    const colors = ['red', 'blue', 'green', 'yellow', 'purple'];
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const type = colors[(r * 6 + c) % colors.length];
        grid.setTile(r, c, { id: `t_${r}_${c}`, type, row: r, col: c, isPowerup: false });
      }
    }

    // Create L shape: 3 horizontal + 3 vertical = 5 tiles (sharing 1)
    grid.setTile(2, 1, { id: 'h1', type: 'orange', row: 2, col: 1, isPowerup: false });
    grid.setTile(2, 2, { id: 'h2', type: 'orange', row: 2, col: 2, isPowerup: false });
    grid.setTile(2, 3, { id: 'h3', type: 'orange', row: 2, col: 3, isPowerup: false }); // intersection
    grid.setTile(3, 3, { id: 'v1', type: 'orange', row: 3, col: 3, isPowerup: false });
    grid.setTile(4, 3, { id: 'v2', type: 'orange', row: 4, col: 3, isPowerup: false });

    const detector = new MatchDetector();
    const matches = detector.findAllMatches(grid);

    // Should have a bomb (L shape with 5 tiles)
    const bombMatch = matches.find(m => m.powerupType === 'bomb');
    expect(bombMatch).toBeDefined();
    expect(bombMatch!.tiles.length).toBe(5);

    // Should NOT have a rocket
    const rocketMatch = matches.find(m => m.powerupType === 'rocket_h' || m.powerupType === 'rocket_v');
    expect(rocketMatch).toBeUndefined();
  });
});
