import Phaser from 'phaser';
import { KeyboardInput } from './KeyboardInput';
import type { MovementInput } from './MovementInput';
import type { InputSource } from './InputSource';

export class InputController {
  private readonly keyboard: KeyboardInput;
  private readonly touch: InputSource;

  constructor(scene: Phaser.Scene, touch: InputSource) {
    this.keyboard = new KeyboardInput(scene);
    this.touch = touch;
  }

  getMovement(): MovementInput {
    const keyboard = this.keyboard.getMovement();

    if (keyboard.x !== 0 || keyboard.y !== 0) {
      return keyboard;
    }

    return this.touch.getMovement();
  }

  consumeInteractPress(): boolean {
    return this.keyboard.consumeInteractPress() || this.touch.consumeInteractPress();
  }
}
