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

  preload(): void {
    this.load.image('bg_title', 'assets/backgrounds/title_screen.jpg.jpeg');
  }

  create(): void {
    // Background
    this.renderBackground();

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

  private renderBackground(): void {
    const { width, height } = this.scale;

    if (this.textures.exists('bg_title')) {
      const bg = this.add.image(width / 2, height / 2, 'bg_title');
      bg.setDepth(-10);
      const scaleX = width / bg.width;
      const scaleY = height / bg.height;
      const scale = Math.max(scaleX, scaleY);
      bg.setScale(scale);
      this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5).setDepth(-9);
    } else {
      this.add.rectangle(width / 2, height / 2, width, height, CONFIG.UI.COLORS.BACKGROUND);
    }
  }

  private createHeader(): void {
    const { width } = this.scale;

    // Header panel with gradient effect
    const headerGraphics = this.add.graphics();
    headerGraphics.fillStyle(0x1a1a2e, 0.9);
    headerGraphics.fillRect(0, 0, width, 50);
    headerGraphics.fillStyle(0x3a3a5e, 0.3);
    headerGraphics.fillRect(0, 0, width, 25);
    headerGraphics.lineStyle(1, 0x4a6a8a, 0.5);
    headerGraphics.lineBetween(0, 50, width, 50);

    // Decorative lines around title
    headerGraphics.lineStyle(1, 0xffd700, 0.4);
    headerGraphics.lineBetween(width / 2 - 70, 28, width / 2 - 40, 28);
    headerGraphics.lineBetween(width / 2 + 40, 28, width / 2 + 70, 28);

    this.add.text(width / 2, 28, 'SHOP', {
      fontSize: '26px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
  }

  private createCurrencyDisplay(): void {
    const { width } = this.scale;
    const currencyManager = getCurrencyManager();

    // Currency positioned below header
    const currencyY = 75;
    const pillWidth = 95;
    const pillHeight = 36;
    const gap = 12;
    const iconOffset = 18;

    // Coins pill
    const coinsPillX = width / 2 - gap / 2 - pillWidth / 2;
    this.createCurrencyPill(coinsPillX, currencyY, pillWidth, pillHeight, 'coin');

    // Coin icon with glow
    const coinIconX = coinsPillX - pillWidth / 2 + iconOffset;
    this.add.circle(coinIconX, currencyY, 14, 0xffd700, 0.3);
    this.add.circle(coinIconX, currencyY, 11, 0xffd700);
    this.add.circle(coinIconX, currencyY, 7, 0xffec8b);
    this.add.text(coinIconX, currencyY, '$', {
      fontSize: '10px',
      fontFamily: 'Arial Black',
      color: '#b8860b',
    }).setOrigin(0.5);

    // Coins text
    this.coinsText = this.add.text(coinsPillX + 8, currencyY, currencyManager.formatCoins(currencyManager.getCoins()), {
      fontSize: '16px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1,
    }).setOrigin(0.5);

    // Diamonds pill
    const diamondsPillX = width / 2 + gap / 2 + pillWidth / 2;
    this.createCurrencyPill(diamondsPillX, currencyY, pillWidth, pillHeight, 'diamond');

    // Diamond icon with glow
    const diamondIconX = diamondsPillX - pillWidth / 2 + iconOffset;
    this.add.circle(diamondIconX, currencyY, 13, 0x00bfff, 0.25);
    const dg = this.add.graphics();
    dg.fillStyle(0x00bfff, 1);
    dg.fillTriangle(diamondIconX, currencyY - 9, diamondIconX + 7, currencyY, diamondIconX, currencyY + 9);
    dg.fillTriangle(diamondIconX, currencyY - 9, diamondIconX - 7, currencyY, diamondIconX, currencyY + 9);
    dg.fillStyle(0x87ceeb, 1);
    dg.fillTriangle(diamondIconX, currencyY - 4, diamondIconX + 3, currencyY, diamondIconX, currencyY + 4);
    dg.fillTriangle(diamondIconX, currencyY - 4, diamondIconX - 3, currencyY, diamondIconX, currencyY + 4);

    // Diamonds text
    this.diamondsText = this.add.text(diamondsPillX + 8, currencyY, currencyManager.getDiamonds().toString(), {
      fontSize: '16px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1,
    }).setOrigin(0.5);
  }

  private createCurrencyPill(x: number, y: number, width: number, height: number, type: 'coin' | 'diamond'): void {
    const graphics = this.add.graphics();

    // Shadow
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillRoundedRect(x - width / 2 + 2, y - height / 2 + 2, width, height, height / 2);

    // Main pill
    graphics.fillStyle(0x1a1a2e, 0.95);
    graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height, height / 2);

    // Top highlight
    graphics.fillStyle(0x3a3a5e, 0.5);
    graphics.fillRoundedRect(x - width / 2 + 2, y - height / 2 + 2, width - 4, height / 2 - 2, { tl: height / 2 - 2, tr: height / 2 - 2, bl: 0, br: 0 });

    // Border with color tint
    const borderColor = type === 'coin' ? 0xffd700 : 0x00bfff;
    graphics.lineStyle(2, borderColor, 0.6);
    graphics.strokeRoundedRect(x - width / 2, y - height / 2, width, height, height / 2);
  }

  private createCategoryTabs(): void {
    const { width } = this.scale;
    const categories: { id: ShopCategory; label: string }[] = [
      { id: 'powerup', label: 'Powerups' },
      { id: 'booster', label: 'Boosters' },
    ];

    const tabWidth = 130;
    const tabHeight = 40;
    const tabY = 120;
    const gap = 12;
    const startX = width / 2 - ((categories.length * tabWidth) + (categories.length - 1) * gap) / 2 + tabWidth / 2;

    categories.forEach((cat, index) => {
      const x = startX + index * (tabWidth + gap);
      const isActive = cat.id === this.currentCategory;

      const tabGraphics = this.add.graphics();

      // Shadow
      tabGraphics.fillStyle(0x000000, 0.3);
      tabGraphics.fillRoundedRect(x - tabWidth / 2 + 2, tabY - tabHeight / 2 + 2, tabWidth, tabHeight, 20);

      // Tab background
      const bgColor = isActive ? 0x4a90d9 : 0x1e2a3a;
      tabGraphics.fillStyle(bgColor, 0.95);
      tabGraphics.fillRoundedRect(x - tabWidth / 2, tabY - tabHeight / 2, tabWidth, tabHeight, 20);

      // Top highlight
      tabGraphics.fillStyle(isActive ? 0x6ab0f9 : 0x3a5a7e, 0.4);
      tabGraphics.fillRoundedRect(x - tabWidth / 2 + 3, tabY - tabHeight / 2 + 3, tabWidth - 6, tabHeight / 2 - 3, { tl: 17, tr: 17, bl: 0, br: 0 });

      // Border
      const borderColor = isActive ? 0x6ab0f9 : 0x4a6a8a;
      tabGraphics.lineStyle(1.5, borderColor, isActive ? 0.9 : 0.5);
      tabGraphics.strokeRoundedRect(x - tabWidth / 2, tabY - tabHeight / 2, tabWidth, tabHeight, 20);

      this.add.rectangle(x, tabY, tabWidth, tabHeight, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          if (!isActive) {
            tabGraphics.clear();
            tabGraphics.fillStyle(0x000000, 0.3);
            tabGraphics.fillRoundedRect(x - tabWidth / 2 + 2, tabY - tabHeight / 2 + 2, tabWidth, tabHeight, 20);
            tabGraphics.fillStyle(0x2a3a4a, 0.95);
            tabGraphics.fillRoundedRect(x - tabWidth / 2, tabY - tabHeight / 2, tabWidth, tabHeight, 20);
            tabGraphics.fillStyle(0x4a6a8e, 0.4);
            tabGraphics.fillRoundedRect(x - tabWidth / 2 + 3, tabY - tabHeight / 2 + 3, tabWidth - 6, tabHeight / 2 - 3, { tl: 17, tr: 17, bl: 0, br: 0 });
            tabGraphics.lineStyle(1.5, 0x5a8aaa, 0.7);
            tabGraphics.strokeRoundedRect(x - tabWidth / 2, tabY - tabHeight / 2, tabWidth, tabHeight, 20);
          }
        })
        .on('pointerout', () => {
          if (!isActive) {
            tabGraphics.clear();
            tabGraphics.fillStyle(0x000000, 0.3);
            tabGraphics.fillRoundedRect(x - tabWidth / 2 + 2, tabY - tabHeight / 2 + 2, tabWidth, tabHeight, 20);
            tabGraphics.fillStyle(0x1e2a3a, 0.95);
            tabGraphics.fillRoundedRect(x - tabWidth / 2, tabY - tabHeight / 2, tabWidth, tabHeight, 20);
            tabGraphics.fillStyle(0x3a5a7e, 0.4);
            tabGraphics.fillRoundedRect(x - tabWidth / 2 + 3, tabY - tabHeight / 2 + 3, tabWidth - 6, tabHeight / 2 - 3, { tl: 17, tr: 17, bl: 0, br: 0 });
            tabGraphics.lineStyle(1.5, 0x4a6a8a, 0.5);
            tabGraphics.strokeRoundedRect(x - tabWidth / 2, tabY - tabHeight / 2, tabWidth, tabHeight, 20);
          }
        })
        .on('pointerdown', () => {
          this.currentCategory = cat.id;
          this.scene.restart();
        });

      this.add.text(x, tabY, cat.label, {
        fontSize: '14px',
        fontFamily: 'Arial Bold',
        color: isActive ? '#ffffff' : '#8ab4d9',
      }).setOrigin(0.5);
    });
  }

  private displayItems(): void {
    this.itemsContainer.removeAll(true);

    const { width } = this.scale;
    const inventoryManager = getInventoryManager();
    const items = inventoryManager.getShopItemsByCategory(this.currentCategory);

    const itemWidth = 105;
    const itemHeight = 145;
    const cols = 3;
    const gapX = 10;
    const totalWidth = cols * itemWidth + (cols - 1) * gapX;
    const startX = (width - totalWidth) / 2 + itemWidth / 2;
    const startY = 235;

    items.forEach((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (itemWidth + gapX);
      const y = startY + row * (itemHeight + 14);

      this.createItemCard(item, x, y, itemWidth, itemHeight);
    });
  }

  private createItemCard(item: ShopItem, x: number, y: number, cardWidth: number, cardHeight: number): void {
    const inventoryManager = getInventoryManager();
    const canAfford = inventoryManager.canAfford(item.id);
    const owned = inventoryManager.getCount(item.id);

    // Card shadow
    const cardGraphics = this.add.graphics();
    cardGraphics.fillStyle(0x000000, 0.4);
    cardGraphics.fillRoundedRect(x - cardWidth / 2 + 3, y - cardHeight / 2 + 3, cardWidth, cardHeight, 12);

    // Card background
    cardGraphics.fillStyle(0x1e2a3a, 0.95);
    cardGraphics.fillRoundedRect(x - cardWidth / 2, y - cardHeight / 2, cardWidth, cardHeight, 12);

    // Top highlight
    cardGraphics.fillStyle(0x3a5a7e, 0.25);
    cardGraphics.fillRoundedRect(x - cardWidth / 2 + 3, y - cardHeight / 2 + 3, cardWidth - 6, cardHeight / 2 - 8, { tl: 9, tr: 9, bl: 0, br: 0 });

    // Border
    const borderColor = canAfford ? 0x4a90d9 : 0x3a4a5a;
    cardGraphics.lineStyle(1.5, borderColor, 0.7);
    cardGraphics.strokeRoundedRect(x - cardWidth / 2, y - cardHeight / 2, cardWidth, cardHeight, 12);

    // Icon container with glow
    const iconY = y - 30;
    const iconGraphics = this.add.graphics();
    iconGraphics.fillStyle(canAfford ? 0x4a90d9 : 0x3a4a5a, 0.2);
    iconGraphics.fillCircle(x, iconY, 30);
    iconGraphics.fillStyle(0x1a2a3a, 0.9);
    iconGraphics.fillCircle(x, iconY, 25);
    iconGraphics.lineStyle(1.5, canAfford ? 0x6ab0f9 : 0x4a5a6a, 0.5);
    iconGraphics.strokeCircle(x, iconY, 25);

    const iconText = this.add.text(x, iconY, this.getItemEmoji(item.icon), {
      fontSize: '24px',
    }).setOrigin(0.5);

    // Name
    const nameText = this.add.text(x, y + 12, item.name, {
      fontSize: '11px',
      fontFamily: 'Arial Bold',
      color: '#ffffff',
      wordWrap: { width: cardWidth - 10 },
      align: 'center',
    }).setOrigin(0.5);

    // Quantity badge
    if (item.quantity > 1) {
      const qBadge = this.add.graphics();
      qBadge.fillStyle(0x4a90d9, 1);
      qBadge.fillRoundedRect(x + cardWidth / 2 - 28, y - cardHeight / 2 + 6, 22, 16, 8);
      this.add.text(x + cardWidth / 2 - 17, y - cardHeight / 2 + 14, `x${item.quantity}`, {
        fontSize: '10px',
        fontFamily: 'Arial Bold',
        color: '#ffffff',
      }).setOrigin(0.5);
      this.itemsContainer.add(qBadge);
    }

    // Owned count
    if (owned > 0) {
      const oBadge = this.add.graphics();
      oBadge.fillStyle(0x44aa44, 0.9);
      oBadge.fillRoundedRect(x - cardWidth / 2 + 4, y - cardHeight / 2 + 6, 30, 16, 8);
      this.add.text(x - cardWidth / 2 + 19, y - cardHeight / 2 + 14, `${owned}`, {
        fontSize: '10px',
        fontFamily: 'Arial Bold',
        color: '#ffffff',
      }).setOrigin(0.5);
      this.itemsContainer.add(oBadge);
    }

    // Price button
    const btnWidth = cardWidth - 16;
    const btnHeight = 30;
    const btnY = y + 48;

    const priceBtnGraphics = this.add.graphics();

    // Button shadow
    priceBtnGraphics.fillStyle(0x000000, 0.3);
    priceBtnGraphics.fillRoundedRect(x - btnWidth / 2 + 2, btnY - btnHeight / 2 + 2, btnWidth, btnHeight, 8);

    // Button background
    const btnColor = canAfford ? 0x2d8a2d : 0x3a4a5a;
    priceBtnGraphics.fillStyle(btnColor, 1);
    priceBtnGraphics.fillRoundedRect(x - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 8);

    // Top highlight
    priceBtnGraphics.fillStyle(canAfford ? 0x55cc55 : 0x4a5a6a, 0.4);
    priceBtnGraphics.fillRoundedRect(x - btnWidth / 2 + 2, btnY - btnHeight / 2 + 2, btnWidth - 4, btnHeight / 2 - 2, { tl: 6, tr: 6, bl: 0, br: 0 });

    // Border
    priceBtnGraphics.lineStyle(1, canAfford ? 0x66dd66 : 0x5a6a7a, 0.6);
    priceBtnGraphics.strokeRoundedRect(x - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 8);

    // Coin icon on price button
    const coinX = x - 18;
    this.add.circle(coinX, btnY, 8, 0xffd700);
    this.add.circle(coinX, btnY, 5, 0xffec8b);

    const priceText = this.add.text(x + 8, btnY, `${item.coinCost}`, {
      fontSize: '13px',
      fontFamily: 'Arial Black',
      color: canAfford ? '#ffffff' : '#666666',
    }).setOrigin(0.5);

    if (canAfford) {
      const priceBtn = this.add.rectangle(x, btnY, btnWidth, btnHeight, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          priceBtnGraphics.clear();
          priceBtnGraphics.fillStyle(0x000000, 0.3);
          priceBtnGraphics.fillRoundedRect(x - btnWidth / 2 + 2, btnY - btnHeight / 2 + 2, btnWidth, btnHeight, 8);
          priceBtnGraphics.fillStyle(0x3a9a3a, 1);
          priceBtnGraphics.fillRoundedRect(x - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 8);
          priceBtnGraphics.fillStyle(0x66dd66, 0.5);
          priceBtnGraphics.fillRoundedRect(x - btnWidth / 2 + 2, btnY - btnHeight / 2 + 2, btnWidth - 4, btnHeight / 2 - 2, { tl: 6, tr: 6, bl: 0, br: 0 });
          priceBtnGraphics.lineStyle(1, 0x88ff88, 0.8);
          priceBtnGraphics.strokeRoundedRect(x - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 8);
        })
        .on('pointerout', () => {
          priceBtnGraphics.clear();
          priceBtnGraphics.fillStyle(0x000000, 0.3);
          priceBtnGraphics.fillRoundedRect(x - btnWidth / 2 + 2, btnY - btnHeight / 2 + 2, btnWidth, btnHeight, 8);
          priceBtnGraphics.fillStyle(0x2d8a2d, 1);
          priceBtnGraphics.fillRoundedRect(x - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 8);
          priceBtnGraphics.fillStyle(0x55cc55, 0.4);
          priceBtnGraphics.fillRoundedRect(x - btnWidth / 2 + 2, btnY - btnHeight / 2 + 2, btnWidth - 4, btnHeight / 2 - 2, { tl: 6, tr: 6, bl: 0, br: 0 });
          priceBtnGraphics.lineStyle(1, 0x66dd66, 0.6);
          priceBtnGraphics.strokeRoundedRect(x - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 8);
        })
        .on('pointerdown', () => this.purchaseItem(item));
      this.itemsContainer.add(priceBtn);
    }

    this.itemsContainer.add([cardGraphics, iconGraphics, iconText, nameText, priceBtnGraphics, priceText]);
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
    const { width, height } = this.scale;
    const btnX = width / 2;
    const btnY = height - 45;
    const btnWidth = 120;
    const btnHeight = 42;

    const btnGraphics = this.add.graphics();

    // Shadow
    btnGraphics.fillStyle(0x000000, 0.4);
    btnGraphics.fillRoundedRect(btnX - btnWidth / 2 + 2, btnY - btnHeight / 2 + 2, btnWidth, btnHeight, 21);

    // Main button
    btnGraphics.fillStyle(0x3a4a5e, 1);
    btnGraphics.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 21);

    // Top highlight
    btnGraphics.fillStyle(0x5a6a7e, 0.4);
    btnGraphics.fillRoundedRect(btnX - btnWidth / 2 + 3, btnY - btnHeight / 2 + 3, btnWidth - 6, btnHeight / 2 - 3, { tl: 18, tr: 18, bl: 0, br: 0 });

    // Border
    btnGraphics.lineStyle(1.5, 0x6a8aaa, 0.7);
    btnGraphics.strokeRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 21);

    this.add.rectangle(btnX, btnY, btnWidth, btnHeight, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        btnGraphics.clear();
        btnGraphics.fillStyle(0x000000, 0.4);
        btnGraphics.fillRoundedRect(btnX - btnWidth / 2 + 2, btnY - btnHeight / 2 + 2, btnWidth, btnHeight, 21);
        btnGraphics.fillStyle(0x4a5a6e, 1);
        btnGraphics.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 21);
        btnGraphics.fillStyle(0x6a7a8e, 0.5);
        btnGraphics.fillRoundedRect(btnX - btnWidth / 2 + 3, btnY - btnHeight / 2 + 3, btnWidth - 6, btnHeight / 2 - 3, { tl: 18, tr: 18, bl: 0, br: 0 });
        btnGraphics.lineStyle(1.5, 0x8aaacc, 0.9);
        btnGraphics.strokeRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 21);
      })
      .on('pointerout', () => {
        btnGraphics.clear();
        btnGraphics.fillStyle(0x000000, 0.4);
        btnGraphics.fillRoundedRect(btnX - btnWidth / 2 + 2, btnY - btnHeight / 2 + 2, btnWidth, btnHeight, 21);
        btnGraphics.fillStyle(0x3a4a5e, 1);
        btnGraphics.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 21);
        btnGraphics.fillStyle(0x5a6a7e, 0.4);
        btnGraphics.fillRoundedRect(btnX - btnWidth / 2 + 3, btnY - btnHeight / 2 + 3, btnWidth - 6, btnHeight / 2 - 3, { tl: 18, tr: 18, bl: 0, br: 0 });
        btnGraphics.lineStyle(1.5, 0x6a8aaa, 0.7);
        btnGraphics.strokeRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 21);
      })
      .on('pointerdown', () => this.scene.start('TitleScene'));

    this.add.text(btnX, btnY, '← Back', {
      fontSize: '16px',
      fontFamily: 'Arial Bold',
      color: '#ffffff',
    }).setOrigin(0.5);
  }
}
