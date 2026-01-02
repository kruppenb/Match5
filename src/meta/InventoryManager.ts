import { MetaStorage } from '../storage/MetaStorage';
import { ShopItem } from '../types';
import { CONFIG } from '../config';
import { getCurrencyManager } from './CurrencyManager';

type InventoryEventType = 'item_added' | 'item_used' | 'purchase_success' | 'purchase_failed';
type InventoryListener = (data: { itemId: string; quantity: number; remaining: number }) => void;

export class InventoryManager {
  private static instance: InventoryManager;
  private listeners: Map<InventoryEventType, InventoryListener[]> = new Map();

  private constructor() {}

  static getInstance(): InventoryManager {
    if (!this.instance) {
      this.instance = new InventoryManager();
    }
    return this.instance;
  }

  // Event handling
  on(event: InventoryEventType, listener: InventoryListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: InventoryEventType, listener: InventoryListener): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index !== -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: InventoryEventType, data: { itemId: string; quantity: number; remaining: number }): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data));
    }
  }

  // Get all inventory
  getInventory(): Record<string, number> {
    return MetaStorage.getInventory();
  }

  // Get count of specific item
  getCount(itemId: string): number {
    return MetaStorage.getInventoryCount(itemId);
  }

  // Check if has item
  hasItem(itemId: string): boolean {
    return this.getCount(itemId) > 0;
  }

  // Add item to inventory
  addItem(itemId: string, quantity: number = 1): void {
    MetaStorage.addInventoryItem(itemId, quantity);
    const remaining = this.getCount(itemId);
    this.emit('item_added', { itemId, quantity, remaining });
  }

  // Use item from inventory
  useItem(itemId: string): boolean {
    const success = MetaStorage.useInventoryItem(itemId);
    if (success) {
      const remaining = this.getCount(itemId);
      this.emit('item_used', { itemId, quantity: 1, remaining });
    }
    return success;
  }

  // Get shop items
  getShopItems(): ShopItem[] {
    return CONFIG.META.SHOP_ITEMS as ShopItem[];
  }

  // Get shop items by category
  getShopItemsByCategory(category: 'powerup' | 'booster'): ShopItem[] {
    return this.getShopItems().filter(item => item.category === category);
  }

  // Purchase item from shop
  purchaseItem(itemId: string): boolean {
    const item = this.getShopItems().find(i => i.id === itemId);
    if (!item) {
      this.emit('purchase_failed', { itemId, quantity: 0, remaining: 0 });
      return false;
    }

    const currencyManager = getCurrencyManager();
    if (!currencyManager.spendCoins(item.coinCost)) {
      this.emit('purchase_failed', { itemId, quantity: 0, remaining: this.getCount(itemId) });
      return false;
    }

    this.addItem(itemId, item.quantity);
    this.emit('purchase_success', { itemId, quantity: item.quantity, remaining: this.getCount(itemId) });
    return true;
  }

  // Check if can afford item
  canAfford(itemId: string): boolean {
    const item = this.getShopItems().find(i => i.id === itemId);
    if (!item) return false;
    return getCurrencyManager().getCoins() >= item.coinCost;
  }

  // Get total items owned (for display)
  getTotalItems(): number {
    const inventory = this.getInventory();
    return Object.values(inventory).reduce((sum, count) => sum + count, 0);
  }
}

// Singleton accessor
export function getInventoryManager(): InventoryManager {
  return InventoryManager.getInstance();
}
