import Phaser from 'phaser';
import type { MovementInput } from '../input/MovementInput';

const MOVE_SPEED = 120;

export class Player {
  private readonly body: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.body = scene.add.rectangle(x, y, 24, 24, 0xffffff);
  }

  update(input: MovementInput, delta: number): void {
    const length = Math.hypot(input.x, input.y);

    if (length === 0) {
      return;
    }

    const x = input.x / length;
    const y = input.y / length;

    const distance = MOVE_SPEED * (delta / 1000);

    this.body.x += x * distance;
    this.body.y += y * distance;
  }
}
