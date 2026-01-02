import Phaser from 'phaser';
import { CONFIG } from '../config';
import { Objective, BoosterType, BoosterInventory } from '../types';

export class MoveCounter {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private text: Phaser.GameObjects.Text;
  private background: Phaser.GameObjects.Graphics;
  private isWarning = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.container = scene.add.container(x, y);

    // Background circle
    this.background = scene.add.graphics();
    this.drawBackground(false);
    this.container.add(this.background);

    // Move count text
    this.text = scene.add.text(0, 0, '0', {
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.container.add(this.text);
  }

  // Allows creating or repositioning a label next to the counter
  attachLabel(labelText: string, offsetX: number, offsetY: number, align: 'left' | 'right' = 'left') {
    // Remove any existing label stored on the container
    const existing = this.container.getByName('move_label') as Phaser.GameObjects.Text | undefined;
    if (existing) existing.destroy();

    const text = this.scene.add.text(offsetX, offsetY, labelText, {
      fontSize: '12px',
      color: '#aaaaaa',
    });
    // Align origin based on requested alignment
    if (align === 'left') text.setOrigin(1, 0.5);
    else text.setOrigin(0, 0.5);

    text.name = 'move_label';
    this.container.add(text);
  }

  private drawBackground(warning: boolean): void {
    this.background.clear();
    const size = CONFIG.UI.MOVE_COUNTER_SIZE;
    const color = warning ? CONFIG.UI.COLORS.WARNING : 0x4488ff;
    this.background.fillStyle(color, 1);
    this.background.fillCircle(0, 0, size / 2);
    this.background.lineStyle(3, 0xffffff, 0.5);
    this.background.strokeCircle(0, 0, size / 2);
  }

  update(moves: number, warning: boolean): void {
    this.text.setText(moves.toString());

    if (warning !== this.isWarning) {
      this.isWarning = warning;
      this.drawBackground(warning);

      // Pulse animation when warning starts
      if (warning) {
        this.scene.tweens.add({
          targets: this.container,
          scale: 1.2,
          duration: 100,
          yoyo: true,
          repeat: 2,
        });
      }
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}

export class ObjectiveDisplay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private objectives: Map<string, { icon: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text }> = new Map();

  constructor(scene: Phaser.Scene, x: number, y: number, objectives: Objective[]) {
    this.scene = scene;
    this.container = scene.add.container(x, y);

    const spacing = 100;
    const startX = -((objectives.length - 1) * spacing) / 2;

    objectives.forEach((obj, index) => {
      const objX = startX + index * spacing;
      const objContainer = this.createObjectiveItem(obj, objX, 0);
      this.objectives.set(this.getKey(obj), objContainer);
    });
  }

  private getKey(obj: Objective): string {
    return obj.tileType ? `${obj.type}_${obj.tileType}` : obj.type;
  }

  private createObjectiveItem(obj: Objective, x: number, y: number): { icon: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text } {
    // Icon
    const icon = this.scene.add.graphics();
    this.drawObjectiveIcon(icon, obj.type);
    icon.setPosition(x, y);
    this.container.add(icon);

    // Progress text
    const text = this.scene.add.text(x, y + 28, `${obj.current}/${obj.target}`, {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.container.add(text);

    return { icon, text };
  }

  private drawObjectiveIcon(graphics: Phaser.GameObjects.Graphics, type: string): void {
    const size = CONFIG.UI.OBJECTIVE_ICON_SIZE / 2;

    switch (type) {
      case 'clear_grass':
        // Grass icon
        graphics.fillStyle(CONFIG.UI.COLORS.GRASS, 1);
        graphics.fillRoundedRect(-size, -size, size * 2, size * 2, 4);
        // Grass blades
        graphics.lineStyle(2, 0x6a9c33, 1);
        graphics.lineBetween(-size * 0.5, size * 0.3, -size * 0.3, -size * 0.5);
        graphics.lineBetween(0, size * 0.3, 0, -size * 0.7);
        graphics.lineBetween(size * 0.5, size * 0.3, size * 0.3, -size * 0.5);
        break;
      case 'collect':
        // Star icon for collect
        graphics.fillStyle(0xffff00, 1);
        this.drawStar(graphics, size * 0.8);
        break;
      case 'score':
        // Score icon
        graphics.fillStyle(0xff8800, 1);
        graphics.fillCircle(0, 0, size * 0.8);
        graphics.lineStyle(2, 0xffffff, 0.5);
        graphics.strokeCircle(0, 0, size * 0.8);
        break;
      default:
        graphics.fillStyle(0x888888, 1);
        graphics.fillCircle(0, 0, size * 0.8);
    }
  }

  private drawStar(graphics: Phaser.GameObjects.Graphics, size: number): void {
    const points = 5;
    const outerRadius = size;
    const innerRadius = size * 0.4;
    const starPoints: { x: number; y: number }[] = [];

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      starPoints.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }

    graphics.beginPath();
    graphics.moveTo(starPoints[0].x, starPoints[0].y);
    for (let i = 1; i < starPoints.length; i++) {
      graphics.lineTo(starPoints[i].x, starPoints[i].y);
    }
    graphics.closePath();
    graphics.fillPath();
  }

  update(objectives: Objective[]): void {
    objectives.forEach(obj => {
      const key = this.getKey(obj);
      const item = this.objectives.get(key);
      if (item) {
        item.text.setText(`${obj.current}/${obj.target}`);

        // Green text when complete
        if (obj.current >= obj.target) {
          item.text.setColor('#44ff44');
        }
      }
    });
  }

  destroy(): void {
    this.container.destroy();
  }
}

export class EndScreen {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private onRetry?: () => void;
  private onNext?: () => void;
  private onMenu?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(CONFIG.SCREEN.WIDTH / 2, CONFIG.SCREEN.HEIGHT / 2);
    this.container.setVisible(false);
    this.container.setDepth(1000);
  }

  showWin(score: number, stars: number, bonus: number, callbacks: { onRetry: () => void; onNext: () => void; onMenu: () => void }): void {
    this.onRetry = callbacks.onRetry;
    this.onNext = callbacks.onNext;
    this.onMenu = callbacks.onMenu;
    this.createWinContent(score, stars, bonus);
    this.container.setVisible(true);
    this.animateIn();
  }

  showLose(score: number, callbacks: { onRetry: () => void; onMenu: () => void }): void {
    this.onRetry = callbacks.onRetry;
    this.onMenu = callbacks.onMenu;
    this.createLoseContent(score);
    this.container.setVisible(true);
    this.animateIn();
  }

  private createWinContent(score: number, stars: number, bonus: number): void {
    this.container.removeAll(true);

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRect(-CONFIG.SCREEN.WIDTH / 2, -CONFIG.SCREEN.HEIGHT / 2, CONFIG.SCREEN.WIDTH, CONFIG.SCREEN.HEIGHT);
    this.container.add(bg);

    // Panel - adjusted to fit all content
    const panel = this.scene.add.graphics();
    panel.fillStyle(0x2a4a2a, 1);
    panel.fillRoundedRect(-150, -160, 300, 320, 16);
    panel.lineStyle(4, 0x44ff44, 1);
    panel.strokeRoundedRect(-150, -160, 300, 320, 16);
    this.container.add(panel);

    // Title
    const title = this.scene.add.text(0, -130, 'LEVEL COMPLETE!', {
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#44ff44',
    }).setOrigin(0.5);
    this.container.add(title);

    // Stars
    const starSpacing = 45;
    for (let i = 0; i < 3; i++) {
      const star = this.scene.add.graphics();
      const x = (i - 1) * starSpacing;
      if (i < stars) {
        star.fillStyle(0xffff00, 1);
      } else {
        star.fillStyle(0x444444, 1);
      }
      this.drawStarShape(star, 18);
      star.setPosition(x, -70);
      this.container.add(star);
    }

    // Score
    const scoreText = this.scene.add.text(0, -20, `Score: ${score}`, {
      fontSize: '22px',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.container.add(scoreText);

    if (bonus > 0) {
      const bonusText = this.scene.add.text(0, 10, `Bonus: +${bonus}`, {
        fontSize: '16px',
        color: '#88ff88',
      }).setOrigin(0.5);
      this.container.add(bonusText);
    }

    // Buttons - more compact spacing
    this.createButton(0, 55, 'NEXT LEVEL', 0x44aa44, () => this.onNext?.());
    this.createButton(0, 95, 'RETRY', 0x666666, () => this.onRetry?.());
    this.createButton(0, 135, 'MENU', 0x444466, () => this.onMenu?.());
  }

  private createLoseContent(score: number): void {
    this.container.removeAll(true);

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRect(-CONFIG.SCREEN.WIDTH / 2, -CONFIG.SCREEN.HEIGHT / 2, CONFIG.SCREEN.WIDTH, CONFIG.SCREEN.HEIGHT);
    this.container.add(bg);

    // Panel
    const panel = this.scene.add.graphics();
    panel.fillStyle(0x4a2a2a, 1);
    panel.fillRoundedRect(-150, -150, 300, 300, 16);
    panel.lineStyle(4, 0xff4444, 1);
    panel.strokeRoundedRect(-150, -150, 300, 300, 16);
    this.container.add(panel);

    // Title
    const title = this.scene.add.text(0, -110, 'OUT OF MOVES!', {
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ff4444',
    }).setOrigin(0.5);
    this.container.add(title);

    // Score
    const scoreText = this.scene.add.text(0, -30, `Score: ${score}`, {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.container.add(scoreText);

    // Buttons
    this.createButton(0, 40, 'TRY AGAIN', 0xaa4444, () => this.onRetry?.());
    this.createButton(0, 100, 'MENU', 0x444466, () => this.onMenu?.());
  }

  private createButton(x: number, y: number, text: string, color: number, callback: () => void): void {
    const button = this.scene.add.graphics();
    button.fillStyle(color, 1);
    button.fillRoundedRect(-60, -15, 120, 30, 8);
    button.setPosition(x, y);

    const buttonText = this.scene.add.text(x, y, text, {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Make interactive
    const hitArea = this.scene.add.rectangle(x, y, 120, 30, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', callback);
    hitArea.on('pointerover', () => button.setAlpha(0.8));
    hitArea.on('pointerout', () => button.setAlpha(1));

    this.container.add(button);
    this.container.add(buttonText);
    this.container.add(hitArea);
  }

  private drawStarShape(graphics: Phaser.GameObjects.Graphics, size: number): void {
    const points = 5;
    const outerRadius = size;
    const innerRadius = size * 0.4;
    const starPoints: { x: number; y: number }[] = [];

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      starPoints.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }

    graphics.beginPath();
    graphics.moveTo(starPoints[0].x, starPoints[0].y);
    for (let i = 1; i < starPoints.length; i++) {
      graphics.lineTo(starPoints[i].x, starPoints[i].y);
    }
    graphics.closePath();
    graphics.fillPath();
  }

  private animateIn(): void {
    this.container.setScale(0.8);
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      scale: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  hide(): void {
    this.container.setVisible(false);
  }

  destroy(): void {
    this.container.destroy();
  }
}

export class BoosterBar {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private buttons: Map<BoosterType, {
    container: Phaser.GameObjects.Container;
    background: Phaser.GameObjects.Graphics;
    countText: Phaser.GameObjects.Text;
    hitArea: Phaser.GameObjects.Rectangle;
  }> = new Map();
  private activeBooster: BoosterType | null = null;
  private onBoosterSelect: (type: BoosterType) => void;
  private onBoosterCancel: () => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    inventory: BoosterInventory,
    onSelect: (type: BoosterType) => void,
    onCancel: () => void
  ) {
    this.scene = scene;
    this.onBoosterSelect = onSelect;
    this.onBoosterCancel = onCancel;
    this.container = scene.add.container(x, y);
    this.container.setDepth(100);

    const boosterTypes: BoosterType[] = ['hammer', 'row_arrow', 'col_arrow', 'shuffle'];
    const buttonSize = 50;
    const spacing = 10;
    const totalWidth = boosterTypes.length * buttonSize + (boosterTypes.length - 1) * spacing;
    const startX = -totalWidth / 2 + buttonSize / 2;

    boosterTypes.forEach((type, index) => {
      const buttonX = startX + index * (buttonSize + spacing);
      this.createBoosterButton(type, buttonX, 0, buttonSize, inventory[type]);
    });
  }

  private createBoosterButton(type: BoosterType, x: number, y: number, size: number, count: number): void {
    const buttonContainer = this.scene.add.container(x, y);

    // Background
    const background = this.scene.add.graphics();
    this.drawButtonBackground(background, size, false, count > 0);
    buttonContainer.add(background);

    // Icon (emoji)
    const config = CONFIG.BOOSTERS.CONFIGS[type];
    const icon = this.scene.add.text(0, -5, config.icon, {
      fontSize: '24px',
    }).setOrigin(0.5);
    buttonContainer.add(icon);

    // Count badge
    const countText = this.scene.add.text(size / 2 - 8, size / 2 - 12, count.toString(), {
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#4488ff',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);
    buttonContainer.add(countText);

    // Hit area for interaction
    const hitArea = this.scene.add.rectangle(0, 0, size, size, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => this.handleBoosterClick(type));
    buttonContainer.add(hitArea);

    this.container.add(buttonContainer);
    this.buttons.set(type, { container: buttonContainer, background, countText, hitArea });
  }

  private drawButtonBackground(graphics: Phaser.GameObjects.Graphics, size: number, active: boolean, enabled: boolean): void {
    graphics.clear();

    // Shadow
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillRoundedRect(-size / 2 + 2, -size / 2 + 2, size, size, 8);

    // Background
    let bgColor = enabled ? 0x3a3a5e : 0x2a2a3e;
    if (active) bgColor = 0x4488ff;
    graphics.fillStyle(bgColor, 1);
    graphics.fillRoundedRect(-size / 2, -size / 2, size, size, 8);

    // Border
    const borderColor = active ? 0x88ccff : (enabled ? 0x5a5a7e : 0x3a3a4e);
    graphics.lineStyle(2, borderColor, 1);
    graphics.strokeRoundedRect(-size / 2, -size / 2, size, size, 8);
  }

  private handleBoosterClick(type: BoosterType): void {
    const button = this.buttons.get(type);
    if (!button) return;

    const count = parseInt(button.countText.text, 10);
    if (count <= 0) return;

    // If already active, cancel
    if (this.activeBooster === type) {
      this.cancelActiveBooster();
      return;
    }

    // If another booster is active, cancel it first
    if (this.activeBooster !== null) {
      this.setButtonActive(this.activeBooster, false);
    }

    // Activate this booster
    this.activeBooster = type;
    this.setButtonActive(type, true);
    this.onBoosterSelect(type);

    // If booster doesn't require target, it will be used immediately
    // and the game will call updateInventory and cancelActiveBooster
  }

  private setButtonActive(type: BoosterType, active: boolean): void {
    const button = this.buttons.get(type);
    if (!button) return;

    const count = parseInt(button.countText.text, 10);
    this.drawButtonBackground(button.background, 50, active, count > 0);

    if (active) {
      this.scene.tweens.add({
        targets: button.container,
        scale: 1.1,
        duration: 100,
        ease: 'Back.easeOut',
      });
    } else {
      this.scene.tweens.add({
        targets: button.container,
        scale: 1,
        duration: 100,
      });
    }
  }

  cancelActiveBooster(): void {
    if (this.activeBooster !== null) {
      this.setButtonActive(this.activeBooster, false);
      this.activeBooster = null;
      this.onBoosterCancel();
    }
  }

  updateInventory(inventory: BoosterInventory): void {
    const boosterTypes: BoosterType[] = ['hammer', 'row_arrow', 'col_arrow', 'shuffle'];
    boosterTypes.forEach(type => {
      const button = this.buttons.get(type);
      if (button) {
        const count = inventory[type];
        button.countText.setText(count.toString());

        // Update button appearance based on availability
        const isActive = this.activeBooster === type;
        this.drawButtonBackground(button.background, 50, isActive, count > 0);

        // Disable interaction if no boosters left
        if (count <= 0) {
          button.container.setAlpha(0.5);
        } else {
          button.container.setAlpha(1);
        }
      }
    });
  }

  getActiveBooster(): BoosterType | null {
    return this.activeBooster;
  }

  setEnabled(enabled: boolean): void {
    this.buttons.forEach((button) => {
      button.hitArea.setInteractive(enabled ? { useHandCursor: true } : false);
      button.container.setAlpha(enabled ? 1 : 0.5);
    });
  }

  destroy(): void {
    this.container.destroy();
  }
}
