import { MetaStorage } from '../storage/MetaStorage';
import { LevelResult, Reward } from '../types';
import { CONFIG } from '../config';

type CurrencyEventType = 'coins_changed' | 'diamonds_changed' | 'reward_earned';
type CurrencyListener = (data: { amount: number; total: number; source?: string }) => void;

export class CurrencyManager {
  private static instance: CurrencyManager;
  private listeners: Map<CurrencyEventType, CurrencyListener[]> = new Map();

  private constructor() {}

  static getInstance(): CurrencyManager {
    if (!this.instance) {
      this.instance = new CurrencyManager();
    }
    return this.instance;
  }

  // Event handling
  on(event: CurrencyEventType, listener: CurrencyListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: CurrencyEventType, listener: CurrencyListener): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index !== -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: CurrencyEventType, data: { amount: number; total: number; source?: string }): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data));
    }
  }

  // Getters
  getCoins(): number {
    return MetaStorage.getCoins();
  }

  getDiamonds(): number {
    return MetaStorage.getDiamonds();
  }

  // Add currencies
  addCoins(amount: number, source: string = 'unknown'): number {
    const total = MetaStorage.addCoins(amount);
    this.emit('coins_changed', { amount, total, source });
    return total;
  }

  addDiamonds(amount: number, source: string = 'unknown'): number {
    const total = MetaStorage.addDiamonds(amount);
    this.emit('diamonds_changed', { amount, total, source });
    return total;
  }

  // Spend currencies
  spendCoins(amount: number): boolean {
    const success = MetaStorage.spendCoins(amount);
    if (success) {
      this.emit('coins_changed', { amount: -amount, total: this.getCoins(), source: 'spend' });
    }
    return success;
  }

  spendDiamonds(amount: number): boolean {
    const success = MetaStorage.spendDiamonds(amount);
    if (success) {
      this.emit('diamonds_changed', { amount: -amount, total: this.getDiamonds(), source: 'spend' });
    }
    return success;
  }

  // Award a generic reward
  awardReward(reward: Reward, source: string = 'unknown'): void {
    switch (reward.type) {
      case 'coins':
        this.addCoins(reward.amount, source);
        break;
      case 'diamonds':
        this.addDiamonds(reward.amount, source);
        break;
      case 'powerup':
      case 'booster':
        if (reward.id) {
          MetaStorage.addInventoryItem(reward.id, reward.amount);
        }
        break;
    }
    this.emit('reward_earned', { amount: reward.amount, total: 0, source });
  }

  // Calculate and award level completion rewards
  awardLevelRewards(result: LevelResult): { coins: number; diamonds: number } {
    const cfg = CONFIG.META.COINS;
    let coins = cfg.LEVEL_COMPLETE_BASE;

    // Star bonus
    coins += result.stars * cfg.PER_STAR;

    // Perfect bonus
    if (result.stars === 3) {
      coins += cfg.PERFECT_BONUS;
    }

    // First time bonus
    if (result.isFirstTime) {
      coins += cfg.FIRST_TIME_BONUS;
    }

    // Award coins
    this.addCoins(coins, `level_${result.levelId}`);

    // Check for diamond milestones
    let diamonds = 0;
    const diamondCfg = CONFIG.META.DIAMONDS;

    if (result.levelId % 10 === 0) {
      diamonds += diamondCfg.EVERY_10_LEVELS;
    } else if (result.levelId % 5 === 0) {
      diamonds += diamondCfg.EVERY_5_LEVELS;
    }

    if (diamonds > 0) {
      this.addDiamonds(diamonds, `milestone_level_${result.levelId}`);
    }

    return { coins, diamonds };
  }

  // Check and award daily login bonus
  checkDailyLogin(): { coins: number; diamonds: number } | null {
    return MetaStorage.checkDailyLogin();
  }

  // Format currency for display
  formatCoins(amount: number): string {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + 'K';
    }
    return amount.toString();
  }

  formatDiamonds(amount: number): string {
    return amount.toString();
  }
}

// Singleton accessor
export function getCurrencyManager(): CurrencyManager {
  return CurrencyManager.getInstance();
}
