# Phase 6: Meta Game & Economy

**Status:** Not Started
**Prerequisites:** [Phase 5: Polish & Heroes](phase-5-polish-heroes.md)
**Goal:** Rewarding progression system with dual currencies, shop, hero boosting, mini-games, and events

---

## Overview

This phase creates an engaging meta-layer that rewards players generously. The economy is designed to be player-friendly - coins flow freely, powerups are easy to obtain, and the focus is on FUN over frustration. Players should feel powerful and rewarded, not gated.

**Design Philosophy:** Give players MORE than they expect. When in doubt, be generous.

---

## Deliverables Checklist

### Currency System
- [ ] Coins (primary currency) - earned abundantly
- [ ] Diamonds (secondary currency) - earned through play
- [ ] Currency display in UI (always visible)
- [ ] Currency animation on earn/spend
- [ ] Save currencies to localStorage

### Shop System
- [ ] Shop UI accessible from main menu
- [ ] Powerup purchase (rockets, bombs, color bombs)
- [ ] Booster items (extra moves, shuffle, etc.)
- [ ] Clear pricing with coin costs
- [ ] Purchase confirmation with animation
- [ ] Inventory system for owned items

### Hero Pre-Charging
- [ ] Pre-level hero selection screen
- [ ] Charge meter UI (shows boost level)
- [ ] Coin cost display for charging
- [ ] Multiple charge levels (25%, 50%, 75%, 100%)
- [ ] Visual feedback on charged hero
- [ ] Charged hero starts level with filled meter

### Mini-Games (Diamond Spend)
- [ ] Mini-game hub accessible from main menu
- [ ] 3-day rotation system
- [ ] Diamond cost to play
- [ ] Spin the Wheel mini-game
- [ ] Treasure Hunt mini-game
- [ ] Lucky Match mini-game
- [ ] Rewards distribution system

### Progression Events
- [ ] Event progress bar (fills as you play levels)
- [ ] Checkpoint rewards (powerups at milestones)
- [ ] Event completion bonus
- [ ] Event reset/new event cycle
- [ ] Event UI overlay on level map

---

## Currency System

### Coins (Primary Currency)

Coins are earned GENEROUSLY. Players should always feel like they have enough to spend.

```typescript
interface CoinRewards {
  // Level completion rewards
  levelComplete: {
    base: 100,           // Just for completing
    perStar: 50,         // +50 per star (up to +150)
    perfectBonus: 100,   // All 3 stars bonus
    firstTimeBonus: 200, // First time completing level
  };

  // In-level earning
  match3: 5,
  match4: 15,
  match5: 30,
  powerupUse: 10,
  comboPer: 20,          // Per combo chain level

  // Bonus sources
  dailyLogin: 500,
  watchAd: 100,          // Optional ad reward
  achievementSmall: 200,
  achievementLarge: 1000,
}
```

**Example Level Earnings:**
- Complete level with 2 stars, some combos: ~300-400 coins
- Perfect 3-star with big combos: ~600-800 coins
- First-time 3-star: ~800-1000 coins

### Diamonds (Secondary Currency)

Diamonds are rarer but still earnable through normal play.

```typescript
interface DiamondRewards {
  // Milestone rewards
  every5Levels: 10,        // Complete level 5, 10, 15...
  every10Levels: 25,       // Bonus at 10, 20, 30...
  worldComplete: 50,       // Finish all levels in world

  // Achievement rewards
  perfectWorld: 100,       // 3-star all levels in world
  comboMaster: 20,         // Hit 10x combo
  powerupKing: 15,         // Use 5 powerups in one level

  // Daily/weekly
  dailyLogin: 5,
  weeklyChallenge: 30,
}
```

### Currency Manager

```typescript
class CurrencyManager {
  private coins: number = 0;
  private diamonds: number = 0;

  addCoins(amount: number, source: string): void {
    this.coins += amount;
    this.showCoinAnimation(amount);
    this.logEarning('coins', amount, source);
    this.save();
  }

  spendCoins(amount: number): boolean {
    if (this.coins < amount) return false;
    this.coins -= amount;
    this.showSpendAnimation(amount);
    this.save();
    return true;
  }

  addDiamonds(amount: number, source: string): void {
    this.diamonds += amount;
    this.showDiamondAnimation(amount);
    this.save();
  }

  spendDiamonds(amount: number): boolean {
    if (this.diamonds < amount) return false;
    this.diamonds -= amount;
    this.save();
    return true;
  }

  getCoins(): number { return this.coins; }
  getDiamonds(): number { return this.diamonds; }
}
```

---

## Shop System

### Shop Categories

```typescript
interface ShopItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  coinCost: number;
  category: 'powerup' | 'booster' | 'cosmetic';
  quantity?: number;  // How many you get
}

const SHOP_ITEMS: ShopItem[] = [
  // Powerups (use during level)
  {
    id: 'rocket_3pack',
    name: 'Rocket Pack',
    description: 'Start with 3 rockets on the board',
    icon: 'rocket',
    coinCost: 150,
    category: 'powerup',
    quantity: 3,
  },
  {
    id: 'bomb_3pack',
    name: 'Bomb Pack',
    description: 'Start with 3 bombs on the board',
    icon: 'bomb',
    coinCost: 200,
    category: 'powerup',
    quantity: 3,
  },
  {
    id: 'colorBomb_1',
    name: 'Color Bomb',
    description: 'Start with a color bomb',
    icon: 'colorBomb',
    coinCost: 250,
    category: 'powerup',
    quantity: 1,
  },

  // Boosters (level modifiers)
  {
    id: 'extraMoves_5',
    name: '+5 Moves',
    description: 'Start level with 5 extra moves',
    icon: 'moves',
    coinCost: 300,
    category: 'booster',
  },
  {
    id: 'shuffle',
    name: 'Free Shuffle',
    description: 'One free board shuffle during level',
    icon: 'shuffle',
    coinCost: 100,
    category: 'booster',
  },
  {
    id: 'hint_3pack',
    name: 'Hint Pack',
    description: '3 hints to show best moves',
    icon: 'hint',
    coinCost: 75,
    category: 'booster',
    quantity: 3,
  },
];
```

### Shop UI

```typescript
class ShopScene extends Phaser.Scene {
  private currencyDisplay: CurrencyDisplay;
  private categoryTabs: CategoryTabs;
  private itemGrid: ItemGrid;

  create(): void {
    // Header with currency
    this.currencyDisplay = new CurrencyDisplay(this);

    // Category tabs
    this.categoryTabs = new CategoryTabs(this, [
      { id: 'powerup', label: 'Powerups' },
      { id: 'booster', label: 'Boosters' },
    ]);

    // Item grid
    this.itemGrid = new ItemGrid(this, SHOP_ITEMS);

    // Back button
    this.addBackButton();
  }

  purchaseItem(item: ShopItem): void {
    if (currencyManager.spendCoins(item.coinCost)) {
      inventoryManager.addItem(item.id, item.quantity || 1);
      this.showPurchaseSuccess(item);
    } else {
      this.showNotEnoughCoins();
    }
  }
}
```

### Inventory System

```typescript
class InventoryManager {
  private inventory: Map<string, number> = new Map();

  addItem(itemId: string, quantity: number = 1): void {
    const current = this.inventory.get(itemId) || 0;
    this.inventory.set(itemId, current + quantity);
    this.save();
  }

  useItem(itemId: string): boolean {
    const current = this.inventory.get(itemId) || 0;
    if (current <= 0) return false;
    this.inventory.set(itemId, current - 1);
    this.save();
    return true;
  }

  getCount(itemId: string): number {
    return this.inventory.get(itemId) || 0;
  }

  hasItem(itemId: string): boolean {
    return this.getCount(itemId) > 0;
  }
}
```

---

## Hero Pre-Charging System

Before starting a level, players can spend coins to pre-charge their selected hero's ability.

### Charge Levels

```typescript
interface ChargeLevel {
  percentage: number;  // How full the hero meter starts
  coinCost: number;
  label: string;
}

const CHARGE_LEVELS: ChargeLevel[] = [
  { percentage: 0,   coinCost: 0,   label: 'No Boost' },
  { percentage: 25,  coinCost: 50,  label: 'Small Boost' },
  { percentage: 50,  coinCost: 100, label: 'Medium Boost' },
  { percentage: 75,  coinCost: 175, label: 'Large Boost' },
  { percentage: 100, coinCost: 300, label: 'MAX POWER!' },
];
```

### Pre-Level Screen

```typescript
class PreLevelScene extends Phaser.Scene {
  private selectedHero: Hero;
  private chargeLevel: number = 0;

  create(data: { levelId: number }): void {
    // Level preview
    this.showLevelPreview(data.levelId);

    // Hero selection (if multiple unlocked)
    this.showHeroSelector();

    // Charge meter
    this.showChargeMeter();

    // Charge buttons
    CHARGE_LEVELS.forEach((level, index) => {
      this.createChargeButton(level, index);
    });

    // Start button
    this.createStartButton();

    // Inventory quick-select (boosters)
    this.showBoosterBar();
  }

  private showChargeMeter(): void {
    // Visual meter showing charge percentage
    // Fills up as player selects higher charge levels
    // Animated glow effect at higher levels
  }

  private selectChargeLevel(level: ChargeLevel): void {
    if (currencyManager.getCoins() >= level.coinCost) {
      this.chargeLevel = level.percentage;
      this.updateMeterVisual();
    }
  }

  private startLevel(): void {
    const chargeLevel = CHARGE_LEVELS[this.selectedChargeIndex];

    if (chargeLevel.coinCost > 0) {
      currencyManager.spendCoins(chargeLevel.coinCost);
    }

    this.scene.start('GameScene', {
      levelId: this.levelId,
      hero: this.selectedHero,
      heroChargePercent: this.chargeLevel,
      boosters: this.selectedBoosters,
    });
  }
}
```

### Hero Charge in Game

```typescript
class HeroManager {
  private chargePercent: number;

  initializeWithCharge(startPercent: number): void {
    this.chargePercent = startPercent;
    this.updateMeterVisual();

    if (startPercent >= 100) {
      // Show "READY!" effect
      this.showReadyEffect();
    }
  }
}
```

---

## Mini-Games System

### Rotation System

Mini-games rotate every 3 days. At any time, 2 mini-games are available.

```typescript
interface MiniGameConfig {
  id: string;
  name: string;
  description: string;
  diamondCost: number;
  icon: string;
}

const MINI_GAMES: MiniGameConfig[] = [
  {
    id: 'spin_wheel',
    name: 'Spin the Wheel',
    description: 'Spin for coins, powerups, and rare prizes!',
    diamondCost: 10,
    icon: 'wheel',
  },
  {
    id: 'treasure_hunt',
    name: 'Treasure Hunt',
    description: 'Pick 3 chests to find hidden treasures!',
    diamondCost: 15,
    icon: 'chest',
  },
  {
    id: 'lucky_match',
    name: 'Lucky Match',
    description: 'Match pairs to win their rewards!',
    diamondCost: 20,
    icon: 'cards',
  },
];

class MiniGameRotation {
  private readonly ROTATION_DAYS = 3;

  getCurrentGames(): MiniGameConfig[] {
    const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const rotationIndex = Math.floor(daysSinceEpoch / this.ROTATION_DAYS);

    // Pick 2 games based on rotation
    const game1Index = rotationIndex % MINI_GAMES.length;
    const game2Index = (rotationIndex + 1) % MINI_GAMES.length;

    return [MINI_GAMES[game1Index], MINI_GAMES[game2Index]];
  }

  getTimeUntilRotation(): number {
    const daysSinceEpoch = Date.now() / (1000 * 60 * 60 * 24);
    const currentRotationStart = Math.floor(daysSinceEpoch / this.ROTATION_DAYS) * this.ROTATION_DAYS;
    const nextRotation = currentRotationStart + this.ROTATION_DAYS;
    return (nextRotation - daysSinceEpoch) * 24 * 60 * 60 * 1000;
  }
}
```

### Mini-Game 1: Spin the Wheel

```typescript
interface WheelSlice {
  reward: Reward;
  weight: number;  // Higher = more likely
  color: string;
}

const WHEEL_SLICES: WheelSlice[] = [
  { reward: { type: 'coins', amount: 100 }, weight: 25, color: '#FFD700' },
  { reward: { type: 'coins', amount: 250 }, weight: 20, color: '#FFA500' },
  { reward: { type: 'coins', amount: 500 }, weight: 10, color: '#FF6347' },
  { reward: { type: 'powerup', id: 'rocket', amount: 1 }, weight: 15, color: '#4169E1' },
  { reward: { type: 'powerup', id: 'bomb', amount: 1 }, weight: 12, color: '#8B0000' },
  { reward: { type: 'diamonds', amount: 5 }, weight: 8, color: '#9400D3' },
  { reward: { type: 'diamonds', amount: 15 }, weight: 5, color: '#FF1493' },
  { reward: { type: 'powerup', id: 'colorBomb', amount: 1 }, weight: 5, color: '#00CED1' },
];

class SpinTheWheel extends Phaser.Scene {
  private wheel: Phaser.GameObjects.Container;
  private isSpinning: boolean = false;

  spin(): void {
    if (this.isSpinning) return;
    if (!currencyManager.spendDiamonds(10)) return;

    this.isSpinning = true;

    // Weighted random selection
    const result = this.weightedRandom(WHEEL_SLICES);
    const targetAngle = this.getAngleForSlice(result);

    // Spin animation (3-5 full rotations + land on slice)
    this.tweens.add({
      targets: this.wheel,
      angle: 360 * 4 + targetAngle,
      duration: 4000,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.awardPrize(result.reward);
        this.isSpinning = false;
      },
    });
  }
}
```

### Mini-Game 2: Treasure Hunt

```typescript
interface TreasureChest {
  id: number;
  reward: Reward;
  isOpened: boolean;
}

class TreasureHunt extends Phaser.Scene {
  private chests: TreasureChest[] = [];
  private picksRemaining: number = 3;

  create(): void {
    // Generate 9 chests with hidden rewards
    this.chests = this.generateChests(9);
    this.displayChestGrid();
  }

  private generateChests(count: number): TreasureChest[] {
    const rewards = [
      // Guaranteed good stuff in some chests
      { type: 'coins', amount: 300 },
      { type: 'coins', amount: 500 },
      { type: 'coins', amount: 200 },
      { type: 'powerup', id: 'rocket', amount: 2 },
      { type: 'powerup', id: 'bomb', amount: 1 },
      { type: 'diamonds', amount: 10 },
      { type: 'coins', amount: 150 },
      { type: 'booster', id: 'extraMoves', amount: 1 },
      { type: 'coins', amount: 100 },
    ];

    // Shuffle rewards
    const shuffled = this.shuffle(rewards);

    return shuffled.map((reward, index) => ({
      id: index,
      reward,
      isOpened: false,
    }));
  }

  private pickChest(chest: TreasureChest): void {
    if (chest.isOpened || this.picksRemaining <= 0) return;

    chest.isOpened = true;
    this.picksRemaining--;

    // Open animation
    this.playOpenAnimation(chest, () => {
      this.awardPrize(chest.reward);

      if (this.picksRemaining === 0) {
        this.showAllChests();
        this.showSummary();
      }
    });
  }
}
```

### Mini-Game 3: Lucky Match

```typescript
interface MatchCard {
  id: number;
  pairId: number;
  reward: Reward;
  isFlipped: boolean;
  isMatched: boolean;
}

class LuckyMatch extends Phaser.Scene {
  private cards: MatchCard[] = [];
  private flippedCard: MatchCard | null = null;
  private matchesFound: number = 0;
  private readonly PAIRS_TO_FIND = 3;

  create(): void {
    // 12 cards = 6 pairs, player finds 3 matches
    this.cards = this.generateCards(12);
    this.displayCardGrid();
  }

  private generateCards(count: number): MatchCard[] {
    const rewards: Reward[] = [
      { type: 'coins', amount: 200 },
      { type: 'coins', amount: 400 },
      { type: 'powerup', id: 'rocket', amount: 1 },
      { type: 'powerup', id: 'bomb', amount: 1 },
      { type: 'diamonds', amount: 8 },
      { type: 'booster', id: 'shuffle', amount: 1 },
    ];

    const cards: MatchCard[] = [];
    rewards.forEach((reward, pairId) => {
      // Create pair
      cards.push(
        { id: pairId * 2, pairId, reward, isFlipped: false, isMatched: false },
        { id: pairId * 2 + 1, pairId, reward, isFlipped: false, isMatched: false },
      );
    });

    return this.shuffle(cards);
  }

  private flipCard(card: MatchCard): void {
    if (card.isFlipped || card.isMatched) return;
    if (this.matchesFound >= this.PAIRS_TO_FIND) return;

    card.isFlipped = true;
    this.playFlipAnimation(card);

    if (!this.flippedCard) {
      this.flippedCard = card;
    } else {
      // Check for match
      if (this.flippedCard.pairId === card.pairId) {
        // Match found!
        this.flippedCard.isMatched = true;
        card.isMatched = true;
        this.matchesFound++;

        this.awardPrize(card.reward);
        this.playMatchAnimation(this.flippedCard, card);

        if (this.matchesFound >= this.PAIRS_TO_FIND) {
          this.showSummary();
        }
      } else {
        // No match - flip back after delay
        const card1 = this.flippedCard;
        const card2 = card;
        this.time.delayedCall(1000, () => {
          card1.isFlipped = false;
          card2.isFlipped = false;
          this.playFlipBackAnimation(card1, card2);
        });
      }
      this.flippedCard = null;
    }
  }
}
```

---

## Progression Events

As players complete levels, they earn event points that fill a progress bar. Reaching checkpoints awards powerups.

### Event Structure

```typescript
interface ProgressionEvent {
  id: string;
  name: string;
  description: string;
  icon: string;
  duration: number;  // Days the event runs
  checkpoints: EventCheckpoint[];
  completionBonus: Reward[];
}

interface EventCheckpoint {
  pointsRequired: number;
  reward: Reward;
  label: string;
}

const SAMPLE_EVENT: ProgressionEvent = {
  id: 'power_surge',
  name: 'Power Surge',
  description: 'Play levels to charge up and earn powerups!',
  icon: 'lightning',
  duration: 7,
  checkpoints: [
    {
      pointsRequired: 100,
      reward: { type: 'powerup', id: 'rocket', amount: 2 },
      label: 'First Spark',
    },
    {
      pointsRequired: 300,
      reward: { type: 'powerup', id: 'bomb', amount: 2 },
      label: 'Building Power',
    },
    {
      pointsRequired: 600,
      reward: { type: 'coins', amount: 1000 },
      label: 'Energy Boost',
    },
    {
      pointsRequired: 1000,
      reward: { type: 'powerup', id: 'colorBomb', amount: 2 },
      label: 'Surge Master',
    },
    {
      pointsRequired: 1500,
      reward: { type: 'diamonds', amount: 50 },
      label: 'Maximum Power!',
    },
  ],
  completionBonus: [
    { type: 'coins', amount: 2000 },
    { type: 'powerup', id: 'colorBomb', amount: 3 },
  ],
};
```

### Earning Event Points

```typescript
interface EventPointSources {
  levelComplete: 20,         // Base for any level
  perStar: 10,               // +10 per star earned
  perfectLevel: 15,          // Bonus for 3 stars
  powerupUsed: 5,            // Each powerup activated
  bigCombo: 10,              // 5+ combo chain
}

class ProgressionEventManager {
  private currentEvent: ProgressionEvent | null = null;
  private eventPoints: number = 0;
  private claimedCheckpoints: Set<number> = new Set();

  onLevelComplete(result: LevelResult): void {
    if (!this.currentEvent) return;

    let points = 20;  // Base
    points += result.stars * 10;
    if (result.stars === 3) points += 15;
    points += result.powerupsUsed * 5;
    if (result.maxCombo >= 5) points += 10;

    this.addPoints(points);
  }

  private addPoints(points: number): void {
    this.eventPoints += points;
    this.checkForRewards();
    this.save();
  }

  private checkForRewards(): void {
    if (!this.currentEvent) return;

    for (let i = 0; i < this.currentEvent.checkpoints.length; i++) {
      const checkpoint = this.currentEvent.checkpoints[i];

      if (this.eventPoints >= checkpoint.pointsRequired
          && !this.claimedCheckpoints.has(i)) {
        this.showCheckpointReward(checkpoint, i);
      }
    }

    // Check completion
    const lastCheckpoint = this.currentEvent.checkpoints[this.currentEvent.checkpoints.length - 1];
    if (this.eventPoints >= lastCheckpoint.pointsRequired) {
      this.showEventComplete();
    }
  }

  claimCheckpoint(index: number): void {
    if (!this.currentEvent) return;
    if (this.claimedCheckpoints.has(index)) return;

    const checkpoint = this.currentEvent.checkpoints[index];
    if (this.eventPoints < checkpoint.pointsRequired) return;

    this.claimedCheckpoints.add(index);
    this.awardReward(checkpoint.reward);
    this.save();
  }
}
```

### Event UI

```typescript
class EventProgressBar extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Graphics;
  private fillBar: Phaser.GameObjects.Graphics;
  private checkpointIcons: Phaser.GameObjects.Image[] = [];

  create(event: ProgressionEvent): void {
    // Background bar
    this.background = this.scene.add.graphics();
    this.background.fillStyle(0x333333);
    this.background.fillRoundedRect(0, 0, 300, 20, 10);

    // Fill bar (animated)
    this.fillBar = this.scene.add.graphics();

    // Checkpoint markers along bar
    event.checkpoints.forEach((checkpoint, index) => {
      const x = (checkpoint.pointsRequired / this.maxPoints) * 300;
      const icon = this.scene.add.image(x, 10, 'checkpoint_icon');
      icon.setInteractive();
      icon.on('pointerdown', () => this.onCheckpointClick(index));
      this.checkpointIcons.push(icon);
    });
  }

  updateProgress(points: number, claimedCheckpoints: Set<number>): void {
    // Animate fill bar
    const fillPercent = Math.min(points / this.maxPoints, 1);

    // Update checkpoint visual states
    this.checkpointIcons.forEach((icon, index) => {
      const checkpoint = this.event.checkpoints[index];

      if (claimedCheckpoints.has(index)) {
        icon.setTexture('checkpoint_claimed');
      } else if (points >= checkpoint.pointsRequired) {
        icon.setTexture('checkpoint_available');
        this.pulseIcon(icon);  // Draw attention
      } else {
        icon.setTexture('checkpoint_locked');
      }
    });
  }
}
```

---

## Save Data Structure

```typescript
interface MetaSaveData {
  version: number;

  // Currencies
  coins: number;
  diamonds: number;

  // Inventory
  inventory: Record<string, number>;

  // Event progress
  currentEvent: {
    id: string;
    points: number;
    claimedCheckpoints: number[];
    startDate: string;
  } | null;

  // Mini-game history
  miniGames: {
    lastPlayedDate: Record<string, string>;
    totalPlays: Record<string, number>;
  };

  // Hero charging (not persisted, just for current session)
}
```

---

## UI/UX Considerations

### Currency Display
- Always visible in top-right corner
- Coins: Gold coin icon with count
- Diamonds: Blue gem icon with count
- Animate when earning/spending
- "+100" floating text on earn

### Shop Access
- Button on main menu
- Also accessible from pre-level screen
- Red dot notification when can afford something new

### Event Progress
- Compact bar on level map screen
- Tap to expand and see details
- Celebration animation on checkpoint claim

### Mini-Game Hub
- Separate button on main menu
- Shows current available games
- Timer showing next rotation

---

## Balancing Guidelines

### Coin Economy
- Average player should earn ~400 coins per level
- Shop items should cost 1-3 levels worth of coins
- Players should always feel "rich"
- Never feel stuck unable to afford anything

### Diamond Economy
- Rarer, but still obtainable through play
- 5-10 diamonds from milestones
- Mini-games should feel like a "treat"
- One mini-game play every 2-3 days of play

### Event Pacing
- Casual player can complete event in 5-7 days
- Active player can complete in 2-3 days
- Checkpoints spread evenly
- Early checkpoints easy to hit for motivation

---

## Success Criteria

Phase 6 is complete when:

1. Coins earned generously from all levels
2. Diamonds earned from milestones and achievements
3. Shop functional with powerups and boosters
4. Hero pre-charging works with coin cost
5. All 3 mini-games playable
6. Mini-game rotation works (3-day cycle)
7. Progression events track points
8. Checkpoint rewards claimable
9. All data persists to localStorage
10. Economy feels generous and fun!

---

## Future Expansion Ideas

- More mini-games added to rotation pool
- Seasonal events with unique themes
- Special event currencies
- Limited-time shop items
- Leaderboards for mini-games
- Social features (gift diamonds to friends)
