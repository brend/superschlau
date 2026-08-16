import Phaser from 'phaser';
import { KeyboardInput } from './KeyboardInput';
import type { MovementInput } from './MovementInput';
import { VirtualJoystick } from './VirtualJoystick';

export class InputController {
  private readonly keyboard: KeyboardInput;
  private readonly joystick: VirtualJoystick;

  constructor(scene: Phaser.Scene) {
    this.keyboard = new KeyboardInput(scene);
    this.joystick = new VirtualJoystick(scene, 72, 408);
  }

  getMovement(): MovementInput {
    const keyboard = this.keyboard.getMovement();

    if (keyboard.x !== 0 || keyboard.y !== 0) {
      return keyboard;
    }

    return this.joystick.getMovement();
  }
}
