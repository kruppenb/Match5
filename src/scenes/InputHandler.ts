import Phaser from 'phaser';
import { Grid } from '../game/Grid';
import { BoosterManager } from '../game/BoosterManager';
import { Position, SwipeDirection, Tile, BoosterType } from '../types';
import { AudioManager } from '../utils/AudioManager';

export interface InputHandlerCallbacks {
  onSwipe: (from: Position, to: Position) => Promise<void>;
  onTileTap: (tile: Tile) => Promise<void>;
  onBoosterTap: (type: BoosterType, target: Position) => Promise<void>;
  onBoosterCancel: () => void;
  isInputBlocked: () => boolean;
  isPlaying: () => boolean;
  cellToScreen: (row: number, col: number) => { x: number; y: number };
  screenToCell: (x: number, y: number) => Position | null;
  getTileSprite: (tileId: string) => Phaser.GameObjects.Container | undefined;
}

export class InputHandler {
  private scene: Phaser.Scene;
  private grid: Grid;
  private boosterManager: BoosterManager;
  private audioManager: AudioManager;
  private callbacks: InputHandlerCallbacks;
  private tileSize: number;

  constructor(
    scene: Phaser.Scene,
    grid: Grid,
    boosterManager: BoosterManager,
    audioManager: AudioManager,
    tileSize: number,
    callbacks: InputHandlerCallbacks
  ) {
    this.scene = scene;
    this.grid = grid;
    this.boosterManager = boosterManager;
    this.audioManager = audioManager;
    this.tileSize = tileSize;
    this.callbacks = callbacks;
  }

  setup(): void {
    let startPos: { x: number; y: number } | null = null;
    let startCell: Position | null = null;
    let draggedSprite: Phaser.GameObjects.Container | null = null;
    let originalPos: { x: number; y: number } | null = null;
    let dragAxis: 'none' | 'horizontal' | 'vertical' = 'none';
    const maxDragDistance = this.tileSize * 0.4;
    const axisLockThreshold = 10; // Pixels before locking to an axis

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Initialize audio on first interaction (required for browser autoplay policy)
      this.audioManager.init();

      if (this.callbacks.isInputBlocked()) return;

      startPos = { x: pointer.x, y: pointer.y };
      startCell = this.callbacks.screenToCell(pointer.x, pointer.y);
      dragAxis = 'none'; // Reset axis lock

      // Get the tile sprite for visual feedback
      if (startCell) {
        const tile = this.grid.getTile(startCell.row, startCell.col);
        if (tile) {
          draggedSprite = this.callbacks.getTileSprite(tile.id) || null;
          if (draggedSprite) {
            originalPos = { x: draggedSprite.x, y: draggedSprite.y };
            draggedSprite.setDepth(100); // Bring to front
          }
        }
      }
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!startPos || !draggedSprite || !originalPos || this.callbacks.isInputBlocked()) return;

      const dx = pointer.x - startPos.x;
      const dy = pointer.y - startPos.y;

      // Determine axis lock if not already set
      if (dragAxis === 'none') {
        if (Math.abs(dx) > axisLockThreshold || Math.abs(dy) > axisLockThreshold) {
          dragAxis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
        }
      }

      // Apply axis constraint and clamp the drag distance
      let clampedDx = 0;
      let clampedDy = 0;

      if (dragAxis === 'horizontal' || dragAxis === 'none') {
        clampedDx = Math.max(-maxDragDistance, Math.min(maxDragDistance, dx));
      }
      if (dragAxis === 'vertical' || dragAxis === 'none') {
        clampedDy = Math.max(-maxDragDistance, Math.min(maxDragDistance, dy));
      }

      // If axis is locked, zero out the other axis
      if (dragAxis === 'horizontal') {
        clampedDy = 0;
      } else if (dragAxis === 'vertical') {
        clampedDx = 0;
      }

      // Move tile to follow finger (slightly)
      draggedSprite.setPosition(originalPos.x + clampedDx, originalPos.y + clampedDy);
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Reset dragged sprite position immediately
      if (draggedSprite && originalPos) {
        draggedSprite.setPosition(originalPos.x, originalPos.y);
        draggedSprite.setDepth(0);
      }

      if (!startPos || !startCell || this.callbacks.isInputBlocked()) {
        startPos = null;
        startCell = null;
        draggedSprite = null;
        originalPos = null;
        return;
      }

      const dx = pointer.x - startPos.x;
      const dy = pointer.y - startPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 20) {
        // Just a tap - check if booster is active or if it's a powerup
        const tile = this.grid.getTile(startCell.row, startCell.col);
        const cell = this.grid.getCell(startCell.row, startCell.col);

        // If a booster is active and requires a target, handle the cell tap
        const activeBooster = this.boosterManager.getActiveBooster();
        if (activeBooster && this.boosterManager.requiresTarget(activeBooster)) {
          // Row/column arrows work on any cell in the row/column
          // Hammer can target tiles OR obstacles (ice, boxes, etc.)
          const hasTarget = tile || cell?.obstacle;
          if (activeBooster === 'hammer' && !hasTarget) {
            // No tile or obstacle to hammer, cancel the booster
            this.callbacks.onBoosterCancel();
          } else if (hasTarget || activeBooster === 'row_arrow' || activeBooster === 'col_arrow') {
            this.callbacks.onBoosterTap(activeBooster, startCell);
          }
          startPos = null;
          startCell = null;
          draggedSprite = null;
          originalPos = null;
          return;
        }

        if (tile) {
          this.callbacks.onTileTap(tile);
        }
        startPos = null;
        startCell = null;
        draggedSprite = null;
        originalPos = null;
        return;
      }

      // Determine swipe direction
      const direction = this.getSwipeDirection(dx, dy);
      const targetCell = this.getAdjacentCell(startCell, direction);

      if (targetCell) {
        this.callbacks.onSwipe(startCell, targetCell);
      }

      startPos = null;
      startCell = null;
      draggedSprite = null;
      originalPos = null;
      dragAxis = 'none';
    });
  }

  private getSwipeDirection(dx: number, dy: number): SwipeDirection {
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    }
    return dy > 0 ? 'down' : 'up';
  }

  private getAdjacentCell(cell: Position, direction: SwipeDirection): Position | null {
    const offsets: Record<SwipeDirection, { row: number; col: number }> = {
      up: { row: -1, col: 0 },
      down: { row: 1, col: 0 },
      left: { row: 0, col: -1 },
      right: { row: 0, col: 1 },
    };

    const offset = offsets[direction];
    const newPos = { row: cell.row + offset.row, col: cell.col + offset.col };

    if (this.grid.getCell(newPos.row, newPos.col)) {
      return newPos;
    }

    return null;
  }
}
