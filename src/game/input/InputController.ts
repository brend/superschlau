import Phaser from 'phaser';
import { KeyboardInput } from './KeyboardInput';
import type { MovementInput } from './MovementInput';
import { VirtualJoystick } from './VirtualJoystick';
import { VirtualButton } from './VirtualButton';

export class InputController {
  private readonly keyboard: KeyboardInput;
  private readonly joystick: VirtualJoystick;
  private readonly interactButton: VirtualButton;

  constructor(scene: Phaser.Scene) {
    this.keyboard = new KeyboardInput(scene);
    this.joystick = new VirtualJoystick(scene, 72, 408);
    this.interactButton = new VirtualButton(scene, 568, 408, 32, 'A');
  }

  getMovement(): MovementInput {
    const keyboard = this.keyboard.getMovement();

    if (keyboard.x !== 0 || keyboard.y !== 0) {
      return keyboard;
    }

    return this.joystick.getMovement();
  }

  consumeInteractPress(): boolean {
    return this.keyboard.consumeInteractPress() || this.interactButton.consumePress();
  }
}
