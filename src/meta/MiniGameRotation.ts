import { MiniGameConfig, MiniGameId } from '../types';
import { CONFIG } from '../config';
import { MetaStorage } from '../storage/MetaStorage';
import { getCurrencyManager } from './CurrencyManager';

export class MiniGameRotation {
  private static instance: MiniGameRotation;

  private constructor() {}

  static getInstance(): MiniGameRotation {
    if (!this.instance) {
      this.instance = new MiniGameRotation();
    }
    return this.instance;
  }

  // Get all mini-games
  getAllGames(): MiniGameConfig[] {
    return CONFIG.META.MINI_GAMES as MiniGameConfig[];
  }

  // Get current available games (2 based on rotation)
  getCurrentGames(): MiniGameConfig[] {
    const allGames = this.getAllGames();
    const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const rotationIndex = Math.floor(daysSinceEpoch / CONFIG.META.MINI_GAME_ROTATION_DAYS);

    const game1Index = rotationIndex % allGames.length;
    const game2Index = (rotationIndex + 1) % allGames.length;

    return [allGames[game1Index], allGames[game2Index]];
  }

  // Get time until next rotation (in milliseconds)
  getTimeUntilRotation(): number {
    const daysSinceEpoch = Date.now() / (1000 * 60 * 60 * 24);
    const rotationDays = CONFIG.META.MINI_GAME_ROTATION_DAYS;
    const currentRotationStart = Math.floor(daysSinceEpoch / rotationDays) * rotationDays;
    const nextRotation = currentRotationStart + rotationDays;
    return (nextRotation - daysSinceEpoch) * 24 * 60 * 60 * 1000;
  }

  // Format time until rotation
  formatTimeUntilRotation(): string {
    const ms = this.getTimeUntilRotation();
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  }

  // Check if player can afford to play a game
  canAfford(gameId: MiniGameId): boolean {
    const game = this.getAllGames().find(g => g.id === gameId);
    if (!game) return false;
    return getCurrencyManager().getDiamonds() >= game.diamondCost;
  }

  // Spend diamonds to play a game
  playGame(gameId: MiniGameId): boolean {
    const game = this.getAllGames().find(g => g.id === gameId);
    if (!game) return false;

    if (!getCurrencyManager().spendDiamonds(game.diamondCost)) {
      return false;
    }

    MetaStorage.recordMiniGamePlay(gameId);
    return true;
  }

  // Get game stats
  getGameStats(gameId: MiniGameId): { lastPlayed: string | null; totalPlays: number } {
    return MetaStorage.getMiniGameStats(gameId);
  }

  // Check if a game is currently available
  isGameAvailable(gameId: MiniGameId): boolean {
    return this.getCurrentGames().some(g => g.id === gameId);
  }
}

// Singleton accessor
export function getMiniGameRotation(): MiniGameRotation {
  return MiniGameRotation.getInstance();
}
