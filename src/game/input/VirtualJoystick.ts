import Phaser from 'phaser';
import type { MovementInput } from './MovementInput';

const BASE_RADIUS = 44;
const KNOB_RADIUS = 20;
const DEAD_ZONE = 0.15;

export class VirtualJoystick {
  private readonly scene: Phaser.Scene;
  private readonly base: Phaser.GameObjects.Arc;
  private readonly knob: Phaser.GameObjects.Arc;

  private readonly x: number;
  private readonly y: number;

  private activePointerId: number | null = null;

  private movement: MovementInput = {
    x: 0,
    y: 0,
  };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.base = scene.add
      .circle(x, y, BASE_RADIUS, 0xffffff, 0.2)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setScrollFactor(0);

    this.knob = scene.add.circle(x, y, KNOB_RADIUS, 0xffffff, 0.5).setScrollFactor(0);

    scene.input.on('pointerdown', this.handlePointerDown, this);
    scene.input.on('pointermove', this.handlePointerMove, this);
    scene.input.on('pointerup', this.handlePointerUp, this);
  }

  destroy(): void {
    this.reset();

    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.input.off('pointermove', this.handlePointerMove, this);
    this.scene.input.off('pointerup', this.handlePointerUp, this);

    this.base.destroy();
    this.knob.destroy();
  }

  getMovement(): MovementInput {
    return this.movement;
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.activePointerId !== null) {
      return;
    }

    const distance = Phaser.Math.Distance.Between(this.x, this.y, pointer.x, pointer.y);

    if (distance > BASE_RADIUS * 1.5) {
      return;
    }

    this.activePointerId = pointer.id;
    this.updateFromPointer(pointer);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) {
      return;
    }

    this.updateFromPointer(pointer);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.activePointerId !== pointer.id) {
      return;
    }

    this.reset();
  }

  private updateFromPointer(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.x;
    const dy = pointer.y - this.y;

    const distance = Math.hypot(dx, dy);

    if (distance === 0) {
      this.movement = { x: 0, y: 0 };
      this.knob.setPosition(this.x, this.y);
      return;
    }

    const clampedDistance = Math.min(distance, BASE_RADIUS);

    const directionX = dx / distance;
    const directionY = dy / distance;

    this.knob.setPosition(
      this.x + directionX * clampedDistance,
      this.y + directionY * clampedDistance,
    );

    const magnitude = clampedDistance / BASE_RADIUS;

    if (magnitude < DEAD_ZONE) {
      this.movement = { x: 0, y: 0 };
      return;
    }

    this.movement = {
      x: directionX * magnitude,
      y: directionY * magnitude,
    };
  }

  reset(): void {
    this.activePointerId = null;

    this.movement = { x: 0, y: 0 };

    this.knob.setPosition(this.x, this.y);
  }
}
