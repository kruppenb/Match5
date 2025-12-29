# Feature: Level Objectives

**Phase:** [Phase 2: Gameplay](../phases/phase-2-gameplay.md)  
**Priority:** High  
**Status:** 🔴 Not Started

---

## Overview

Level objectives give purpose to gameplay. Each level has one or more goals that must be completed within a limited number of moves. This creates challenge and variety across levels.

---

## Objective Types

### 1. Clear Grass
**Description:** Remove all grass tiles from the board  
**Visual:** 🌿 icon with count  
**Tracking:** Decrement when grass is cleared

```typescript
interface ClearObstacleObjective {
  type: 'clear_obstacle';
  obstacleType: 'grass' | 'ice' | 'chain' | 'box';
  target: number;
  current: number;
}
```

---

### 2. Collect Items
**Description:** Match specific tile types to collect them  
**Visual:** Tile icon with count  
**Tracking:** Increment when matching tile type

```typescript
interface CollectObjective {
  type: 'collect';
  tileType: string; // 'red', 'blue', etc.
  target: number;
  current: number;
}
```

---

### 3. Reach Score
**Description:** Achieve minimum score  
**Visual:** ⭐ icon with target  
**Tracking:** Update as score increases

```typescript
interface ScoreObjective {
  type: 'score';
  target: number;
  current: number;
}
```

---

### 4. Clear Obstacles (Specific)
**Description:** Destroy X boxes, break X chains, etc.  
**Visual:** Obstacle icon with count  
**Tracking:** Decrement when specific obstacle cleared

---

## Objective System Implementation

```typescript
type Objective = ClearObstacleObjective | CollectObjective | ScoreObjective;

class ObjectiveManager {
  private objectives: Objective[];
  private callbacks: Map<string, Function[]> = new Map();
  
  constructor(levelConfig: LevelConfig) {
    this.objectives = levelConfig.objectives.map(obj => ({
      ...obj,
      current: 0,
    }));
  }
  
  // Called when grass/obstacles are cleared
  onObstacleCleared(type: string, count: number = 1): void {
    this.objectives.forEach(obj => {
      if (obj.type === 'clear_obstacle' && obj.obstacleType === type) {
        obj.current = Math.min(obj.current + count, obj.target);
        this.emit('progress', obj);
      }
    });
    this.checkCompletion();
  }
  
  // Called when tiles are matched
  onTilesMatched(tiles: Tile[]): void {
    const typeCounts = new Map<string, number>();
    tiles.forEach(tile => {
      if (!tile.isPowerup) {
        const count = typeCounts.get(tile.type) || 0;
        typeCounts.set(tile.type, count + 1);
      }
    });
    
    this.objectives.forEach(obj => {
      if (obj.type === 'collect') {
        const matched = typeCounts.get(obj.tileType) || 0;
        obj.current = Math.min(obj.current + matched, obj.target);
        this.emit('progress', obj);
      }
    });
    this.checkCompletion();
  }
  
  // Called when score changes
  onScoreUpdate(score: number): void {
    this.objectives.forEach(obj => {
      if (obj.type === 'score') {
        obj.current = score;
        this.emit('progress', obj);
      }
    });
    this.checkCompletion();
  }
  
  isComplete(): boolean {
    return this.objectives.every(obj => obj.current >= obj.target);
  }
  
  private checkCompletion(): void {
    if (this.isComplete()) {
      this.emit('complete');
    }
  }
  
  getProgress(): Objective[] {
    return [...this.objectives];
  }
}
```

---

## Move System

```typescript
class MoveManager {
  private movesRemaining: number;
  private totalMoves: number;
  
  constructor(levelMoves: number) {
    this.movesRemaining = levelMoves;
    this.totalMoves = levelMoves;
  }
  
  useMove(): boolean {
    if (this.movesRemaining <= 0) return false;
    
    this.movesRemaining--;
    this.emit('moveUsed', this.movesRemaining);
    
    if (this.movesRemaining <= 3) {
      this.emit('lowMoves', this.movesRemaining);
    }
    
    if (this.movesRemaining === 0) {
      this.emit('noMoves');
    }
    
    return true;
  }
  
  getRemainingMoves(): number {
    return this.movesRemaining;
  }
  
  addMoves(count: number): void {
    this.movesRemaining += count;
    this.emit('movesAdded', this.movesRemaining);
  }
}
```

---

## Win/Lose Conditions

```typescript
class GameStateManager {
  private objectives: ObjectiveManager;
  private moves: MoveManager;
  private state: 'playing' | 'won' | 'lost' = 'playing';
  
  constructor(level: LevelConfig) {
    this.objectives = new ObjectiveManager(level);
    this.moves = new MoveManager(level.moves);
    
    this.objectives.on('complete', () => this.onWin());
    this.moves.on('noMoves', () => this.checkLose());
  }
  
  onMoveComplete(): void {
    // Called after each move and cascade is finished
    if (this.objectives.isComplete()) {
      this.onWin();
    } else if (this.moves.getRemainingMoves() === 0) {
      this.onLose();
    }
  }
  
  private onWin(): void {
    if (this.state !== 'playing') return;
    this.state = 'won';
    
    // Calculate stars
    const stars = this.calculateStars();
    
    // Convert remaining moves to bonus
    const bonusPoints = this.movesToBonus();
    
    this.emit('win', { stars, bonusPoints });
  }
  
  private onLose(): void {
    if (this.state !== 'playing') return;
    this.state = 'lost';
    
    this.emit('lose');
  }
  
  private calculateStars(): 1 | 2 | 3 {
    const movesUsed = this.moves.totalMoves - this.moves.getRemainingMoves();
    const efficiency = this.moves.getRemainingMoves() / this.moves.totalMoves;
    
    if (efficiency >= 0.3) return 3; // 30%+ moves remaining
    if (efficiency >= 0.1) return 2; // 10%+ moves remaining
    return 1; // Just completed
  }
  
  private movesToBonus(): number {
    // Each remaining move becomes a powerup that activates
    return this.moves.getRemainingMoves() * 500;
  }
}
```

---

## UI Display

### Objective Bar Layout

```
┌───────────────────────────────────────┐
│  🌿 8/15    🔴 12/20    🔢 18        │
└───────────────────────────────────────┘
     │          │          │
     │          │          └── Moves remaining
     │          └── Collect red: 12 of 20
     └── Grass: 8 of 15 cleared
```

### Objective Rendering

```typescript
class ObjectiveUI {
  render(ctx: CanvasRenderingContext2D, objectives: Objective[], moves: number): void {
    const barY = 80;
    const itemWidth = 100;
    const startX = (this.screenWidth - (objectives.length + 1) * itemWidth) / 2;
    
    // Render each objective
    objectives.forEach((obj, i) => {
      const x = startX + i * itemWidth;
      this.renderObjective(ctx, obj, x, barY);
    });
    
    // Render moves
    const movesX = startX + objectives.length * itemWidth;
    this.renderMoves(ctx, moves, movesX, barY);
  }
  
  private renderObjective(ctx: CanvasRenderingContext2D, obj: Objective, x: number, y: number): void {
    // Icon
    const icon = this.getObjectiveIcon(obj);
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(icon, x + 20, y);
    
    // Progress
    const progress = `${obj.current}/${obj.target}`;
    const complete = obj.current >= obj.target;
    
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = complete ? '#4CAF50' : '#fff';
    ctx.fillText(progress, x + 60, y);
    
    // Checkmark if complete
    if (complete) {
      ctx.fillStyle = '#4CAF50';
      ctx.fillText('✓', x + 90, y);
    }
  }
  
  private getObjectiveIcon(obj: Objective): string {
    switch (obj.type) {
      case 'clear_obstacle':
        return { grass: '🌿', ice: '❄️', chain: '🔗', box: '📦' }[obj.obstacleType] || '❓';
      case 'collect':
        return { red: '🔴', blue: '🔵', green: '🟢', yellow: '🟡' }[obj.tileType] || '⭐';
      case 'score':
        return '⭐';
      default:
        return '❓';
    }
  }
  
  private renderMoves(ctx: CanvasRenderingContext2D, moves: number, x: number, y: number): void {
    ctx.font = '24px Arial';
    ctx.fillText('🔢', x + 20, y);
    
    // Warning color for low moves
    ctx.fillStyle = moves <= 3 ? '#ff4444' : '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(moves.toString(), x + 55, y);
  }
}
```

---

## Level Configuration

```typescript
interface LevelConfig {
  id: number;
  name?: string;
  
  grid: {
    rows: number;
    cols: number;
  };
  
  moves: number;
  tileVariety: number; // 3-6 different tile colors
  
  objectives: ObjectiveConfig[];
  
  layout: string[][]; // Grid layout
  
  starThresholds: {
    oneStar: number;
    twoStar: number;
    threeStar: number;
  };
}

interface ObjectiveConfig {
  type: 'clear_obstacle' | 'collect' | 'score';
  target: number;
  obstacleType?: string;
  tileType?: string;
}
```

### Example Level

```json
{
  "id": 15,
  "name": "Frozen Garden",
  "grid": { "rows": 8, "cols": 8 },
  "moves": 25,
  "tileVariety": 5,
  "objectives": [
    { "type": "clear_obstacle", "obstacleType": "grass", "target": 20 },
    { "type": "clear_obstacle", "obstacleType": "ice", "target": 8 }
  ],
  "layout": [
    [".", ".", "G", "G", "G", "G", ".", "."],
    [".", "G", "I", "I", "I", "I", "G", "."],
    ["G", "I", ".", ".", ".", ".", "I", "G"],
    ["G", "I", ".", ".", ".", ".", "I", "G"],
    ["G", "I", ".", ".", ".", ".", "I", "G"],
    ["G", "I", ".", ".", ".", ".", "I", "G"],
    [".", "G", "I", "I", "I", "I", "G", "."],
    [".", ".", "G", "G", "G", "G", ".", "."]
  ],
  "starThresholds": {
    "oneStar": 5000,
    "twoStar": 10000,
    "threeStar": 15000
  }
}
```

---

## Objective Animations

### Progress Update
```typescript
onObjectiveProgress(obj: Objective): void {
  const element = this.objectiveElements.get(obj);
  
  // Number flies from cleared location to objective
  this.animateNumberFly(clearedPosition, element.position);
  
  // Counter increments with pop
  this.animateCounterPop(element);
  
  // Play collection sound
  this.playSound('collect');
}
```

### Objective Complete
```typescript
onObjectiveComplete(obj: Objective): void {
  const element = this.objectiveElements.get(obj);
  
  // Checkmark appears
  this.animateCheckmark(element);
  
  // Element glows green
  this.animateGlow(element, '#4CAF50');
  
  // Celebrate sound
  this.playSound('objective_complete');
}
```

---

## Level Progression

### Level Select Screen

```
┌─────────────────────────────────────────┐
│           ★ GARDEN WORLD ★              │
│                                          │
│    [1]⭐⭐⭐    [2]⭐⭐☆    [3]⭐☆☆    │
│       │            │            │        │
│       └────────────┴────────────┘        │
│                    │                     │
│    [4]⭐⭐⭐    [5]●        [6]🔒       │
│                  ↑                       │
│            Current Level                 │
│                                          │
│    ═══════════════════════════════      │
│           Need 10 ⭐ to unlock           │
│                                          │
└─────────────────────────────────────────┘
```

### Progress Storage

```typescript
interface LevelProgress {
  id: number;
  completed: boolean;
  stars: 0 | 1 | 2 | 3;
  bestScore: number;
  attempts: number;
}

class ProgressManager {
  private progress: Map<number, LevelProgress>;
  
  isLevelUnlocked(levelId: number): boolean {
    if (levelId === 1) return true;
    
    const previousLevel = this.progress.get(levelId - 1);
    if (!previousLevel?.completed) return false;
    
    // Check star gates
    const gate = this.getStarGate(levelId);
    if (gate) {
      return this.getTotalStars() >= gate.requiredStars;
    }
    
    return true;
  }
  
  getTotalStars(): number {
    let total = 0;
    this.progress.forEach(p => total += p.stars);
    return total;
  }
}
```

---

## Testing Objectives

```typescript
describe('ObjectiveManager', () => {
  it('should track grass clearing', () => {
    const manager = new ObjectiveManager({
      objectives: [{ type: 'clear_obstacle', obstacleType: 'grass', target: 10 }]
    });
    
    manager.onObstacleCleared('grass', 5);
    expect(manager.getProgress()[0].current).toBe(5);
    
    manager.onObstacleCleared('grass', 5);
    expect(manager.isComplete()).toBe(true);
  });
  
  it('should track tile collection', () => {
    const manager = new ObjectiveManager({
      objectives: [{ type: 'collect', tileType: 'red', target: 15 }]
    });
    
    manager.onTilesMatched([
      { type: 'red' },
      { type: 'red' },
      { type: 'blue' },
    ]);
    
    expect(manager.getProgress()[0].current).toBe(2);
  });
  
  it('should handle multiple objectives', () => {
    const manager = new ObjectiveManager({
      objectives: [
        { type: 'clear_obstacle', obstacleType: 'grass', target: 5 },
        { type: 'collect', tileType: 'red', target: 10 },
      ]
    });
    
    manager.onObstacleCleared('grass', 5);
    expect(manager.isComplete()).toBe(false);
    
    manager.onTilesMatched(Array(10).fill({ type: 'red' }));
    expect(manager.isComplete()).toBe(true);
  });
});
```

---

## Related Features

- [Obstacles](obstacles.md)
- [Grid System](grid-system.md)
