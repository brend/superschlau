import Phaser from 'phaser';
import { KeyboardInput } from './KeyboardInput';
import type { MovementInput } from './MovementInput';

export class InputController {
  private readonly keyboard: KeyboardInput;

  constructor(scene: Phaser.Scene) {
    this.keyboard = new KeyboardInput(scene);
  }

  getMovement(): MovementInput {
    return this.keyboard.getMovement();
  }

  consumeInteractPress(): boolean {
    return this.keyboard.consumeInteractPress();
  }
}
