import Phaser from 'phaser';
import type { MovementInput } from '../input/MovementInput';
import type { PlayerState } from './PlayerState';

const MOVE_SPEED = 120;

export class Player {
  private readonly gameObject: Phaser.GameObjects.Sprite & {
    body: Phaser.Physics.Arcade.Body;
  };
  private readonly state: PlayerState = {
    facing: 'down',
    isMoving: false,
  };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const gameObject = scene.add.sprite(x, y, 'player', 0);

    scene.physics.add.existing(gameObject);

    this.gameObject = gameObject as Phaser.GameObjects.Sprite & {
      body: Phaser.Physics.Arcade.Body;
    };

    this.gameObject.body.setSize(20, 16);

    this.gameObject.body.setOffset(6, 14);

    this.gameObject.body.setCollideWorldBounds(true);
  }

  update(input: MovementInput): void {
    const length = Math.hypot(input.x, input.y);

    this.state.isMoving = length > 0;

    if (!this.state.isMoving) {
      this.gameObject.body.setVelocity(0);
      this.setIdleFrame();
      return;
    }

    this.updateFacing(input);
    this.playWalkingAnimation();

    const scale = length > 1 ? 1 / length : 1;

    const x = input.x * scale;
    const y = input.y * scale;

    this.gameObject.body.setVelocity(x * MOVE_SPEED, y * MOVE_SPEED);
  }

  private updateFacing(input: MovementInput): void {
    if (Math.abs(input.x) > Math.abs(input.y)) {
      this.state.facing = input.x < 0 ? 'left' : 'right';
    } else {
      this.state.facing = input.y < 0 ? 'up' : 'down';
    }
  }

  get physicsObject(): Phaser.GameObjects.Sprite {
    return this.gameObject;
  }

  getInteractionPoint(): Phaser.Math.Vector2 {
    const distance = 28;

    const point = new Phaser.Math.Vector2(this.gameObject.x, this.gameObject.y);

    switch (this.state.facing) {
      case 'up':
        point.y -= distance;
        break;
      case 'down':
        point.y += distance;
        break;
      case 'left':
        point.x -= distance;
        break;
      case 'right':
        point.x += distance;
        break;
    }

    return point;
  }

  setPosition(x: number, y: number): void {
    this.gameObject.setPosition(x, y);
  }

  private setIdleFrame(): void {
    this.gameObject.stop();

    switch (this.state.facing) {
      case 'down':
        this.gameObject.setFrame(0);
        break;
      case 'left':
        this.gameObject.setFrame(3);
        break;
      case 'right':
        this.gameObject.setFrame(6);
        break;
      case 'up':
        this.gameObject.setFrame(9);
        break;
    }
  }

  private playWalkingAnimation(): void {
    this.gameObject.play(`player-walk-${this.state.facing}`, true);
  }
}
