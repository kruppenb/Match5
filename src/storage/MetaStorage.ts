import { MetaSaveData, DailyReplayData } from '../types';
import { CONFIG } from '../config';

const STORAGE_KEY = 'match5_meta';

const DEFAULT_META: MetaSaveData = {
  version: 1,
  coins: CONFIG.META.STARTING_COINS,
  diamonds: CONFIG.META.STARTING_DIAMONDS,
  inventory: {},
  currentEvent: null,
  miniGames: {
    lastPlayedDate: {},
    totalPlays: {},
  },
  totalLevelsPlayed: 0,
  lastDailyLogin: null,
  dailyReplay: {
    lastResetDate: '',
    replaysCompleted: 0,
  },
};

export class MetaStorage {
  private static data: MetaSaveData | null = null;

  static save(data: MetaSaveData): void {
    this.data = data;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save meta data:', e);
    }
  }

  static load(): MetaSaveData {
    if (this.data) return this.data;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as MetaSaveData;
        this.data = {
          ...DEFAULT_META,
          ...parsed,
          miniGames: {
            ...DEFAULT_META.miniGames,
            ...parsed.miniGames,
          },
          dailyReplay: {
            ...DEFAULT_META.dailyReplay,
            ...(parsed.dailyReplay || {}),
          },
        };
        return this.data;
      }
    } catch (e) {
      console.warn('Failed to load meta data:', e);
    }

    this.data = { ...DEFAULT_META };
    return this.data;
  }

  static reset(): void {
    this.data = { ...DEFAULT_META };
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to reset meta data:', e);
    }
  }

  static getCoins(): number {
    return this.load().coins;
  }

  static getDiamonds(): number {
    return this.load().diamonds;
  }

  static addCoins(amount: number): number {
    const data = this.load();
    data.coins += amount;
    this.save(data);
    return data.coins;
  }

  static spendCoins(amount: number): boolean {
    const data = this.load();
    if (data.coins < amount) return false;
    data.coins -= amount;
    this.save(data);
    return true;
  }

  static addDiamonds(amount: number): number {
    const data = this.load();
    data.diamonds += amount;
    this.save(data);
    return data.diamonds;
  }

  static spendDiamonds(amount: number): boolean {
    const data = this.load();
    if (data.diamonds < amount) return false;
    data.diamonds -= amount;
    this.save(data);
    return true;
  }

  static getInventory(): Record<string, number> {
    return this.load().inventory;
  }

  static addInventoryItem(itemId: string, quantity: number = 1): void {
    const data = this.load();
    data.inventory[itemId] = (data.inventory[itemId] || 0) + quantity;
    this.save(data);
  }

  static useInventoryItem(itemId: string): boolean {
    const data = this.load();
    if (!data.inventory[itemId] || data.inventory[itemId] <= 0) return false;
    data.inventory[itemId]--;
    this.save(data);
    return true;
  }

  static getInventoryCount(itemId: string): number {
    return this.load().inventory[itemId] || 0;
  }

  static incrementLevelsPlayed(): void {
    const data = this.load();
    data.totalLevelsPlayed++;
    this.save(data);
  }

  static getTotalLevelsPlayed(): number {
    return this.load().totalLevelsPlayed;
  }

  static checkDailyLogin(): { coins: number; diamonds: number } | null {
    const data = this.load();
    const today = new Date().toISOString().split('T')[0];

    if (data.lastDailyLogin === today) {
      return null; // Already claimed today
    }

    data.lastDailyLogin = today;
    data.coins += CONFIG.META.COINS.DAILY_LOGIN;
    data.diamonds += CONFIG.META.DIAMONDS.DAILY_LOGIN;
    this.save(data);

    return {
      coins: CONFIG.META.COINS.DAILY_LOGIN,
      diamonds: CONFIG.META.DIAMONDS.DAILY_LOGIN,
    };
  }

  // Event management
  static getCurrentEvent(): MetaSaveData['currentEvent'] {
    return this.load().currentEvent;
  }

  static setCurrentEvent(event: MetaSaveData['currentEvent']): void {
    const data = this.load();
    data.currentEvent = event;
    this.save(data);
  }

  static addEventPoints(points: number): void {
    const data = this.load();
    if (data.currentEvent) {
      data.currentEvent.points += points;
      this.save(data);
    }
  }

  static claimEventCheckpoint(index: number): void {
    const data = this.load();
    if (data.currentEvent && !data.currentEvent.claimedCheckpoints.includes(index)) {
      data.currentEvent.claimedCheckpoints.push(index);
      this.save(data);
    }
  }

  // Mini-game tracking
  static recordMiniGamePlay(gameId: string): void {
    const data = this.load();
    const today = new Date().toISOString().split('T')[0];
    data.miniGames.lastPlayedDate[gameId] = today;
    data.miniGames.totalPlays[gameId] = (data.miniGames.totalPlays[gameId] || 0) + 1;
    this.save(data);
  }

  static getMiniGameStats(gameId: string): { lastPlayed: string | null; totalPlays: number } {
    const data = this.load();
    return {
      lastPlayed: data.miniGames.lastPlayedDate[gameId] || null,
      totalPlays: data.miniGames.totalPlays[gameId] || 0,
    };
  }

  // Daily replay bonus tracking
  static getDailyReplayData(): DailyReplayData {
    const data = this.load();
    const today = new Date().toISOString().split('T')[0];

    // Reset if it's a new day
    if (data.dailyReplay.lastResetDate !== today) {
      data.dailyReplay = {
        lastResetDate: today,
        replaysCompleted: 0,
      };
      this.save(data);
    }

    return data.dailyReplay;
  }

  static incrementDailyReplay(): boolean {
    const data = this.load();
    const today = new Date().toISOString().split('T')[0];

    // Reset if it's a new day
    if (data.dailyReplay.lastResetDate !== today) {
      data.dailyReplay = {
        lastResetDate: today,
        replaysCompleted: 0,
      };
    }

    // Check if bonus still available
    if (data.dailyReplay.replaysCompleted >= 3) {
      return false; // No bonus available
    }

    data.dailyReplay.replaysCompleted++;
    this.save(data);
    return true; // Bonus was earned
  }

  static canEarnReplayBonus(): boolean {
    const replayData = this.getDailyReplayData();
    return replayData.replaysCompleted < 3;
  }

  static getRemainingReplayBonuses(): number {
    const replayData = this.getDailyReplayData();
    return Math.max(0, 3 - replayData.replaysCompleted);
  }
}
