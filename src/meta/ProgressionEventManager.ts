import { MetaStorage } from '../storage/MetaStorage';
import { ProgressionEvent, EventCheckpoint, LevelResult, Reward } from '../types';
import { CONFIG } from '../config';
import { getCurrencyManager } from './CurrencyManager';

type EventType = 'points_added' | 'checkpoint_available' | 'checkpoint_claimed' | 'event_complete';
type EventListener = (data: { points?: number; checkpointIndex?: number; reward?: Reward }) => void;

// Default event for now - can be expanded with rotation
const POWER_SURGE_EVENT: ProgressionEvent = {
  id: 'power_surge',
  name: 'Power Surge',
  description: 'Play levels to charge up and earn powerups!',
  icon: 'lightning',
  duration: 7,
  checkpoints: [
    { pointsRequired: 100, reward: { type: 'powerup', amount: 2, id: 'rocket_3pack' }, label: 'First Spark' },
    { pointsRequired: 300, reward: { type: 'powerup', amount: 2, id: 'bomb_3pack' }, label: 'Building Power' },
    { pointsRequired: 600, reward: { type: 'coins', amount: 1000 }, label: 'Energy Boost' },
    { pointsRequired: 1000, reward: { type: 'powerup', amount: 2, id: 'colorBomb_1' }, label: 'Surge Master' },
    { pointsRequired: 1500, reward: { type: 'diamonds', amount: 50 }, label: 'Maximum Power!' },
  ],
  completionBonus: [
    { type: 'coins', amount: 2000 },
    { type: 'powerup', amount: 3, id: 'colorBomb_1' },
  ],
};

export class ProgressionEventManager {
  private static instance: ProgressionEventManager;
  private listeners: Map<EventType, EventListener[]> = new Map();
  private currentEvent: ProgressionEvent = POWER_SURGE_EVENT;

  private constructor() {
    this.initializeEventIfNeeded();
  }

  static getInstance(): ProgressionEventManager {
    if (!this.instance) {
      this.instance = new ProgressionEventManager();
    }
    return this.instance;
  }

  private initializeEventIfNeeded(): void {
    const eventData = MetaStorage.getCurrentEvent();
    if (!eventData) {
      // Start a new event
      MetaStorage.setCurrentEvent({
        id: this.currentEvent.id,
        points: 0,
        claimedCheckpoints: [],
        startDate: new Date().toISOString(),
      });
    }
  }

  // Event handling
  on(event: EventType, listener: EventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: EventType, listener: EventListener): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index !== -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: EventType, data: { points?: number; checkpointIndex?: number; reward?: Reward }): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data));
    }
  }

  // Get current event details
  getCurrentEvent(): ProgressionEvent {
    return this.currentEvent;
  }

  // Get current points
  getPoints(): number {
    const eventData = MetaStorage.getCurrentEvent();
    return eventData?.points || 0;
  }

  // Get claimed checkpoints
  getClaimedCheckpoints(): number[] {
    const eventData = MetaStorage.getCurrentEvent();
    return eventData?.claimedCheckpoints || [];
  }

  // Get available (unclaimed but reached) checkpoints
  getAvailableCheckpoints(): number[] {
    const points = this.getPoints();
    const claimed = this.getClaimedCheckpoints();
    const available: number[] = [];

    this.currentEvent.checkpoints.forEach((checkpoint, index) => {
      if (points >= checkpoint.pointsRequired && !claimed.includes(index)) {
        available.push(index);
      }
    });

    return available;
  }

  // Calculate points from level result
  calculatePoints(result: LevelResult): number {
    const cfg = CONFIG.META.EVENT_POINTS;
    let points = cfg.LEVEL_COMPLETE;
    points += result.stars * cfg.PER_STAR;
    if (result.stars === 3) {
      points += cfg.PERFECT_LEVEL;
    }
    points += result.powerupsUsed * cfg.PER_POWERUP;
    if (result.maxCombo >= 5) {
      points += cfg.BIG_COMBO;
    }
    return points;
  }

  // Add points from level completion
  onLevelComplete(result: LevelResult): number {
    const points = this.calculatePoints(result);
    MetaStorage.addEventPoints(points);
    this.emit('points_added', { points });

    // Check for newly available checkpoints
    const available = this.getAvailableCheckpoints();
    available.forEach(index => {
      this.emit('checkpoint_available', { checkpointIndex: index });
    });

    // Check if event is complete
    const lastCheckpoint = this.currentEvent.checkpoints[this.currentEvent.checkpoints.length - 1];
    if (this.getPoints() >= lastCheckpoint.pointsRequired) {
      this.emit('event_complete', {});
    }

    return points;
  }

  // Claim a checkpoint reward
  claimCheckpoint(index: number): Reward | null {
    const points = this.getPoints();
    const claimed = this.getClaimedCheckpoints();
    const checkpoint = this.currentEvent.checkpoints[index];

    if (!checkpoint || points < checkpoint.pointsRequired || claimed.includes(index)) {
      return null;
    }

    MetaStorage.claimEventCheckpoint(index);

    // Award the reward
    const currencyManager = getCurrencyManager();
    currencyManager.awardReward(checkpoint.reward, 'event_checkpoint');

    this.emit('checkpoint_claimed', { checkpointIndex: index, reward: checkpoint.reward });

    return checkpoint.reward;
  }

  // Get progress percentage
  getProgressPercentage(): number {
    const points = this.getPoints();
    const maxPoints = this.currentEvent.checkpoints[this.currentEvent.checkpoints.length - 1].pointsRequired;
    return Math.min(points / maxPoints, 1);
  }

  // Get next checkpoint info
  getNextCheckpoint(): { checkpoint: EventCheckpoint; index: number; pointsNeeded: number } | null {
    const points = this.getPoints();
    const claimed = this.getClaimedCheckpoints();

    for (let i = 0; i < this.currentEvent.checkpoints.length; i++) {
      const checkpoint = this.currentEvent.checkpoints[i];
      if (!claimed.includes(i)) {
        return {
          checkpoint,
          index: i,
          pointsNeeded: Math.max(0, checkpoint.pointsRequired - points),
        };
      }
    }

    return null;
  }

  // Check if event is complete
  isEventComplete(): boolean {
    const claimed = this.getClaimedCheckpoints();
    return claimed.length === this.currentEvent.checkpoints.length;
  }

  // Reset event (for new event cycle)
  resetEvent(): void {
    MetaStorage.setCurrentEvent({
      id: this.currentEvent.id,
      points: 0,
      claimedCheckpoints: [],
      startDate: new Date().toISOString(),
    });
  }
}

// Singleton accessor
export function getProgressionEventManager(): ProgressionEventManager {
  return ProgressionEventManager.getInstance();
}
