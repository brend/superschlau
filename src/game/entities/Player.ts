import Phaser from 'phaser';
import type { MovementInput } from '../input/MovementInput';
import type { PlayerState } from './PlayerState';

const MOVE_SPEED = 120;

export class Player {
  private readonly gameObject: Phaser.GameObjects.Rectangle;
  private readonly state: PlayerState = {
    facing: 'down',
    isMoving: false,
  };
  private readonly facingMarker: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.gameObject = scene.add.rectangle(x, y, 24, 24, 0xffffff);
    this.facingMarker = scene.add.rectangle(x, y, 6, 6, 0xff0000);
  }

  update(input: MovementInput, delta: number): void {
    const length = Math.hypot(input.x, input.y);

    this.state.isMoving = length > 0;

    if (!this.state.isMoving) {
      return;
    }

    this.updateFacing(input);

    const x = input.x / length;
    const y = input.y / length;

    const distance = MOVE_SPEED * (delta / 1000);

    this.gameObject.x += x * distance;
    this.gameObject.y += y * distance;

    this.updateFacingMarker();
  }

  private updateFacing(input: MovementInput): void {
    if (Math.abs(input.x) > Math.abs(input.y)) {
      this.state.facing = input.x < 0 ? 'left' : 'right';
    } else {
      this.state.facing = input.y < 0 ? 'up' : 'down';
    }
  }

  private updateFacingMarker(): void {
    const offset = 8;

    this.facingMarker.setPosition(this.gameObject.x, this.gameObject.y);

    switch (this.state.facing) {
      case 'up':
        this.facingMarker.y -= offset;
        break;

      case 'down':
        this.facingMarker.y += offset;
        break;

      case 'left':
        this.facingMarker.x -= offset;
        break;

      case 'right':
        this.facingMarker.x += offset;
        break;
    }
  }
}
