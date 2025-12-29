import { GameStatus, Objective } from '../types';
import { CONFIG } from '../config';
import { Level } from './Level';
import { ObjectiveTracker } from './ObjectiveTracker';

type GameEventType = 'move_used' | 'low_moves' | 'score_changed' | 'game_won' | 'game_lost' | 'status_changed';

interface GameEvent {
  movesRemaining?: number;
  score?: number;
  bonus?: number;
  status?: GameStatus;
}

type GameEventListener = (event: GameEvent) => void;

export class GameState {
  private movesRemaining: number;
  private score: number;
  private status: GameStatus;
  private level: Level;
  private objectiveTracker: ObjectiveTracker;
  private listeners: Map<GameEventType, GameEventListener[]>;
  private cascadeMultiplier: number;

  constructor(level: Level) {
    this.level = level;
    this.movesRemaining = level.moves;
    this.score = 0;
    this.status = 'playing';
    this.cascadeMultiplier = 1;
    this.listeners = new Map();

    // Create objective tracker from level objectives
    this.objectiveTracker = new ObjectiveTracker(level.objectives);

    // Listen for all objectives complete
    this.objectiveTracker.on('all_complete', () => {
      this.checkWinCondition();
    });
  }

  on(event: GameEventType, listener: GameEventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: GameEventType, listener: GameEventListener): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index !== -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: GameEventType, data: GameEvent): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data));
    }
  }

  useMove(): void {
    if (this.status !== 'playing') return;

    this.movesRemaining--;
    this.emit('move_used', { movesRemaining: this.movesRemaining });

    if (this.movesRemaining <= CONFIG.LEVEL.LOW_MOVES_THRESHOLD) {
      this.emit('low_moves', { movesRemaining: this.movesRemaining });
    }

    // Reset cascade multiplier for new move
    this.cascadeMultiplier = 1;
  }

  incrementCascade(): void {
    this.cascadeMultiplier *= CONFIG.SCORE.CASCADE_MULTIPLIER;
  }

  addMatchScore(matchedTiles: number, isPowerupCreated: boolean = false): void {
    if (this.status !== 'playing') return;

    let points = matchedTiles * CONFIG.SCORE.MATCH_BASE;
    points = Math.floor(points * this.cascadeMultiplier);

    if (isPowerupCreated) {
      points += CONFIG.SCORE.POWERUP_BONUS;
    }

    this.score += points;
    this.emit('score_changed', { score: this.score });

    // Update score objective if exists
    this.objectiveTracker.onScoreAdded(points);
  }

  addScore(points: number): void {
    if (this.status !== 'playing') return;

    this.score += points;
    this.emit('score_changed', { score: this.score });
  }

  private checkWinCondition(): void {
    if (this.status !== 'playing') return;

    if (this.objectiveTracker.isAllComplete()) {
      this.setWin();
    }
  }

  checkLoseCondition(): void {
    if (this.status !== 'playing') return;

    if (this.movesRemaining <= 0 && !this.objectiveTracker.isAllComplete()) {
      this.setLose();
    }
  }

  setWin(): void {
    if (this.status !== 'playing') return;

    this.status = 'won';

    // Add bonus for remaining moves
    const bonus = this.movesRemaining * CONFIG.LEVEL.BONUS_POINTS_PER_MOVE;
    this.score += bonus;

    this.emit('game_won', { score: this.score, bonus, movesRemaining: this.movesRemaining });
    this.emit('status_changed', { status: this.status });
  }

  setLose(): void {
    if (this.status !== 'playing') return;

    this.status = 'lost';
    this.emit('game_lost', { score: this.score });
    this.emit('status_changed', { status: this.status });
  }

  pause(): void {
    if (this.status === 'playing') {
      this.status = 'paused';
      this.emit('status_changed', { status: this.status });
    }
  }

  resume(): void {
    if (this.status === 'paused') {
      this.status = 'playing';
      this.emit('status_changed', { status: this.status });
    }
  }

  // Getters
  getStatus(): GameStatus {
    return this.status;
  }

  getMovesRemaining(): number {
    return this.movesRemaining;
  }

  getScore(): number {
    return this.score;
  }

  getLevel(): Level {
    return this.level;
  }

  getObjectiveTracker(): ObjectiveTracker {
    return this.objectiveTracker;
  }

  getObjectives(): Objective[] {
    return this.objectiveTracker.getObjectives();
  }

  isPlaying(): boolean {
    return this.status === 'playing';
  }

  isLowMoves(): boolean {
    return this.movesRemaining <= CONFIG.LEVEL.LOW_MOVES_THRESHOLD;
  }

  // Calculate stars based on remaining moves
  calculateStars(): number {
    if (this.status !== 'won') return 0;

    const moveRatio = this.movesRemaining / this.level.moves;
    if (moveRatio >= 0.5) return 3; // 50%+ moves remaining
    if (moveRatio >= 0.25) return 2; // 25%+ moves remaining
    return 1; // Just completed
  }
}
