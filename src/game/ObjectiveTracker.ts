import { Objective, ObjectiveType } from '../types';

type ObjectiveEventType = 'progress' | 'objective_complete' | 'all_complete';

interface ObjectiveEvent {
  type: ObjectiveType;
  current: number;
  target: number;
  tileType?: string;
}

type ObjectiveListener = (event: ObjectiveEvent) => void;

export class ObjectiveTracker {
  private objectives: Map<string, Objective>;
  private listeners: Map<ObjectiveEventType, ObjectiveListener[]>;

  constructor(objectives: Objective[]) {
    this.objectives = new Map();
    this.listeners = new Map();

    // Initialize objectives with current progress (usually 0)
    objectives.forEach(obj => {
      const key = this.getKey(obj);
      this.objectives.set(key, { ...obj });
    });
  }

  private getKey(obj: { type: ObjectiveType; tileType?: string }): string {
    return obj.tileType ? `${obj.type}_${obj.tileType}` : obj.type;
  }

  on(event: ObjectiveEventType, listener: ObjectiveListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: ObjectiveEventType, listener: ObjectiveListener): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index !== -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: ObjectiveEventType, data: ObjectiveEvent): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data));
    }
  }

  onGrassCleared(count: number): void {
    this.updateProgress('clear_grass', undefined, count);
  }

  onIceCleared(count: number): void {
    this.updateProgress('clear_ice', undefined, count);
  }

  onChainCleared(count: number): void {
    this.updateProgress('clear_chains', undefined, count);
  }

  onBoxCleared(count: number): void {
    this.updateProgress('clear_boxes', undefined, count);
  }

  onItemCollected(tileType: string, count: number): void {
    this.updateProgress('collect', tileType, count);
  }

  onScoreAdded(points: number): void {
    this.updateProgress('score', undefined, points);
  }

  private updateProgress(type: ObjectiveType, tileType: string | undefined, amount: number): void {
    const key = tileType ? `${type}_${tileType}` : type;
    const obj = this.objectives.get(key);

    if (obj) {
      const prev = obj.current;
      obj.current = Math.min(obj.current + amount, obj.target);

      const eventData: ObjectiveEvent = {
        type: obj.type,
        current: obj.current,
        target: obj.target,
        tileType: obj.tileType,
      };

      this.emit('progress', eventData);

      // Check if this objective just completed
      if (prev < obj.target && obj.current >= obj.target) {
        this.emit('objective_complete', eventData);

        // Check if all objectives are now complete
        if (this.isAllComplete()) {
          this.emit('all_complete', eventData);
        }
      }
    }
  }

  isAllComplete(): boolean {
    for (const obj of this.objectives.values()) {
      if (obj.current < obj.target) {
        return false;
      }
    }
    return true;
  }

  isObjectiveComplete(type: ObjectiveType, tileType?: string): boolean {
    const key = tileType ? `${type}_${tileType}` : type;
    const obj = this.objectives.get(key);
    return obj ? obj.current >= obj.target : false;
  }

  getObjectives(): Objective[] {
    return Array.from(this.objectives.values());
  }

  getObjective(type: ObjectiveType, tileType?: string): Objective | undefined {
    const key = tileType ? `${type}_${tileType}` : type;
    return this.objectives.get(key);
  }

  getProgress(type: ObjectiveType, tileType?: string): { current: number; target: number } | null {
    const key = tileType ? `${type}_${tileType}` : type;
    const obj = this.objectives.get(key);
    if (obj) {
      return { current: obj.current, target: obj.target };
    }
    return null;
  }

  reset(): void {
    for (const obj of this.objectives.values()) {
      obj.current = 0;
    }
  }
}
