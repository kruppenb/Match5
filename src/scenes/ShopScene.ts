import Phaser from 'phaser';
import { CONFIG } from '../config';
import { ShopItem, ShopCategory } from '../types';
import { getCurrencyManager } from '../meta/CurrencyManager';
import { getInventoryManager } from '../meta/InventoryManager';

export class ShopScene extends Phaser.Scene {
  private itemsContainer!: Phaser.GameObjects.Container;
  private currentCategory: ShopCategory = 'powerup';
  private coinsText!: Phaser.GameObjects.Text;
  private diamondsText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'ShopScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, CONFIG.UI.COLORS.BACKGROUND);

    // Header
    this.createHeader();

    // Currency display
    this.createCurrencyDisplay();

    // Category tabs
    this.createCategoryTabs();

    // Items grid
    this.itemsContainer = this.add.container(0, 0);
    this.displayItems();

    // Back button
    this.createBackButton();
  }

  private createHeader(): void {
    const { width } = this.scale;

    // Header background - positioned to not overlap currency
    this.add.rectangle(width / 2, 45, width, 70, CONFIG.UI.COLORS.PANEL);

    this.add.text(width / 2, 45, 'SHOP', {
      fontSize: '28px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  private createCurrencyDisplay(): void {
    const { width } = this.scale;
    const currencyManager = getCurrencyManager();

    // Currency positioned below header
    const currencyY = 95;
    const coinsX = width / 2 - 70;
    const diamondsX = width / 2 + 70;

    // Coins background and icon
    const coinBg = this.add.rectangle(coinsX, currencyY, 110, 28, 0x3a3a4e, 0.9);
    coinBg.setStrokeStyle(2, 0xffd700);
    this.add.circle(coinsX - 40, currencyY, 10, 0xffd700);
    this.coinsText = this.add.text(coinsX - 25, currencyY, currencyManager.formatCoins(currencyManager.getCoins()), {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0, 0.5);

    // Diamonds background and icon
    const diamondBg = this.add.rectangle(diamondsX, currencyY, 90, 28, 0x3a3a4e, 0.9);
    diamondBg.setStrokeStyle(2, 0x00bfff);
    this.add.polygon(diamondsX - 30, currencyY, [[0, -8], [6, 0], [0, 8], [-6, 0]], 0x00bfff);
    this.diamondsText = this.add.text(diamondsX - 18, currencyY, currencyManager.getDiamonds().toString(), {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0, 0.5);
  }

  private createCategoryTabs(): void {
    const { width } = this.scale;
    const categories: { id: ShopCategory; label: string }[] = [
      { id: 'powerup', label: 'Powerups' },
      { id: 'booster', label: 'Boosters' },
    ];

    const tabWidth = 120;
    const tabY = 140;
    const startX = width / 2 - (categories.length * tabWidth) / 2 + tabWidth / 2;

    categories.forEach((cat, index) => {
      const x = startX + index * tabWidth;
      const isActive = cat.id === this.currentCategory;

      const tab = this.add.rectangle(x, tabY, tabWidth - 10, 36, isActive ? 0x4a90d9 : 0x3a3a4e)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.currentCategory = cat.id;
          this.scene.restart();
        });

      if (isActive) {
        tab.setStrokeStyle(2, 0x6ab0f9);
      }

      this.add.text(x, tabY, cat.label, {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: isActive ? '#ffffff' : '#aaaaaa',
      }).setOrigin(0.5);
    });
  }

  private displayItems(): void {
    this.itemsContainer.removeAll(true);

    const { width } = this.scale;
    const inventoryManager = getInventoryManager();
    const items = inventoryManager.getShopItemsByCategory(this.currentCategory);

    const itemWidth = 140;
    const itemHeight = 160;
    const cols = 3;
    const startX = width / 2 - ((cols - 1) * itemWidth) / 2;
    const startY = 260;

    items.forEach((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * itemWidth;
      const y = startY + row * (itemHeight + 20);

      this.createItemCard(item, x, y);
    });
  }

  private createItemCard(item: ShopItem, x: number, y: number): void {
    const inventoryManager = getInventoryManager();
    const canAfford = inventoryManager.canAfford(item.id);
    const owned = inventoryManager.getCount(item.id);

    // Card background
    const cardBg = this.add.rectangle(x, y, 130, 150, 0x3a3a4e)
      .setStrokeStyle(2, canAfford ? 0x4a90d9 : 0x555555);

    // Icon (placeholder - would use sprite in production)
    const iconBg = this.add.circle(x, y - 35, 30, 0x2a2a3e);
    const iconText = this.add.text(x, y - 35, this.getItemEmoji(item.icon), {
      fontSize: '28px',
    }).setOrigin(0.5);

    // Name
    const nameText = this.add.text(x, y + 15, item.name, {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#ffffff',
      wordWrap: { width: 120 },
      align: 'center',
    }).setOrigin(0.5);

    // Quantity badge
    if (item.quantity > 1) {
      this.add.text(x + 35, y - 55, `x${item.quantity}`, {
        fontSize: '12px',
        fontFamily: 'Arial',
        color: '#ffff00',
        backgroundColor: '#333333',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5);
    }

    // Owned count
    if (owned > 0) {
      this.add.text(x - 50, y - 60, `Own: ${owned}`, {
        fontSize: '10px',
        fontFamily: 'Arial',
        color: '#44ff44',
      }).setOrigin(0, 0.5);
    }

    // Price button
    const priceBtn = this.add.rectangle(x, y + 55, 100, 30, canAfford ? 0x44aa44 : 0x666666)
      .setInteractive({ useHandCursor: canAfford });

    const priceText = this.add.text(x, y + 55, `${item.coinCost}`, {
      fontSize: '14px',
      fontFamily: 'Arial Bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Coin icon on price
    this.add.circle(x - 35, y + 55, 8, 0xffd700);

    if (canAfford) {
      priceBtn.on('pointerover', () => priceBtn.setFillStyle(0x55bb55));
      priceBtn.on('pointerout', () => priceBtn.setFillStyle(0x44aa44));
      priceBtn.on('pointerdown', () => this.purchaseItem(item));
    }

    this.itemsContainer.add([cardBg, iconBg, iconText, nameText, priceBtn, priceText]);
  }

  private getItemEmoji(icon: string): string {
    const emojiMap: Record<string, string> = {
      rocket: '🚀',
      bomb: '💣',
      colorBomb: '🌈',
      moves: '👟',
      shuffle: '🔀',
      hint: '💡',
    };
    return emojiMap[icon] || '📦';
  }

  private purchaseItem(item: ShopItem): void {
    const inventoryManager = getInventoryManager();
    const success = inventoryManager.purchaseItem(item.id);

    if (success) {
      // Update display
      this.updateCurrencyDisplay();
      this.displayItems();

      // Success animation
      this.showPurchaseSuccess(item);
    } else {
      this.showPurchaseFailed();
    }
  }

  private showPurchaseSuccess(item: ShopItem): void {
    const { width, height } = this.scale;

    const successText = this.add.text(width / 2, height / 2, `+${item.quantity} ${item.name}!`, {
      fontSize: '28px',
      fontFamily: 'Arial Black',
      color: '#44ff44',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: successText,
      y: height / 2 - 50,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => successText.destroy(),
    });
  }

  private showPurchaseFailed(): void {
    const { width, height } = this.scale;

    const failText = this.add.text(width / 2, height / 2, 'Not enough coins!', {
      fontSize: '24px',
      fontFamily: 'Arial Black',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: failText,
      alpha: 0,
      duration: 1500,
      onComplete: () => failText.destroy(),
    });
  }

  private updateCurrencyDisplay(): void {
    const currencyManager = getCurrencyManager();
    this.coinsText.setText(currencyManager.formatCoins(currencyManager.getCoins()));
    this.diamondsText.setText(currencyManager.getDiamonds().toString());
  }

  private createBackButton(): void {
    const backBtn = this.add.rectangle(60, this.scale.height - 50, 100, 40, 0x4a4a5e)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backBtn.setFillStyle(0x5a5a6e))
      .on('pointerout', () => backBtn.setFillStyle(0x4a4a5e))
      .on('pointerdown', () => this.scene.start('LevelSelectScene'));

    this.add.text(60, this.scale.height - 50, '← Back', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
  }
}
