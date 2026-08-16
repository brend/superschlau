import Phaser from 'phaser';
import type { MovementInput } from '../input/MovementInput';
import type { PlayerState } from './PlayerState';

const MOVE_SPEED = 120;

export class Player {
  private readonly gameObject: Phaser.GameObjects.Rectangle & {
    body: Phaser.Physics.Arcade.Body;
  };
  private readonly state: PlayerState = {
    facing: 'down',
    isMoving: false,
  };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const gameObject = scene.add.rectangle(x, y, 24, 24, 0xffffff);

    scene.physics.add.existing(gameObject);

    this.gameObject = gameObject as Phaser.GameObjects.Rectangle & {
      body: Phaser.Physics.Arcade.Body;
    };

    this.gameObject.body.setCollideWorldBounds(true);
  }

  update(input: MovementInput): void {
    const length = Math.hypot(input.x, input.y);

    this.state.isMoving = length > 0;

    if (!this.state.isMoving) {
      this.gameObject.body.setVelocity(0);
      return;
    }

    this.updateFacing(input);

    const x = input.x / length;
    const y = input.y / length;

    this.gameObject.body.setVelocity(x * MOVE_SPEED, y * MOVE_SPEED);
  }

  private updateFacing(input: MovementInput): void {
    if (Math.abs(input.x) > Math.abs(input.y)) {
      this.state.facing = input.x < 0 ? 'left' : 'right';
    } else {
      this.state.facing = input.y < 0 ? 'up' : 'down';
    }
  }

  get physicsObject(): Phaser.GameObjects.Rectangle {
    return this.gameObject;
  }
}
