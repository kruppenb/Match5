import { GameProgress } from '../types';

const STORAGE_KEY = 'match5_progress';

const DEFAULT_PROGRESS: GameProgress = {
  completedLevels: [],
  highestLevel: 1,
  levelStars: {},
};

export class ProgressStorage {
  static save(progress: GameProgress): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      console.warn('Failed to save progress to localStorage:', e);
    }
  }

  static load(): GameProgress {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as GameProgress;
        // Ensure all required fields exist
        return {
          completedLevels: parsed.completedLevels ?? [],
          highestLevel: parsed.highestLevel ?? 1,
          levelStars: parsed.levelStars ?? {},
        };
      }
    } catch (e) {
      console.warn('Failed to load progress from localStorage:', e);
    }
    return { ...DEFAULT_PROGRESS };
  }

  static isLevelUnlocked(levelId: number): boolean {
    const progress = this.load();
    // Level 1 is always unlocked, and any level <= highestLevel + 1
    return levelId === 1 || levelId <= progress.highestLevel + 1;
  }

  static isLevelCompleted(levelId: number): boolean {
    const progress = this.load();
    return progress.completedLevels.includes(levelId);
  }

  static getLevelStars(levelId: number): number {
    const progress = this.load();
    return progress.levelStars[levelId] ?? 0;
  }

  static completeLevel(levelId: number, stars: number): void {
    const progress = this.load();

    // Mark as completed
    if (!progress.completedLevels.includes(levelId)) {
      progress.completedLevels.push(levelId);
    }

    // Update highest level
    if (levelId >= progress.highestLevel) {
      progress.highestLevel = levelId;
    }

    // Update stars (only if better)
    const existingStars = progress.levelStars[levelId] ?? 0;
    if (stars > existingStars) {
      progress.levelStars[levelId] = stars;
    }

    this.save(progress);
  }

  static reset(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to reset progress:', e);
    }
  }

  static getHighestLevel(): number {
    return this.load().highestLevel;
  }

  static getTotalStars(): number {
    const progress = this.load();
    return Object.values(progress.levelStars).reduce((sum, stars) => sum + stars, 0);
  }
}
