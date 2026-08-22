import Phaser from 'phaser';
import { VirtualJoystick } from '../input/VirtualJoystick';
import { VirtualButton } from '../input/VirtualButton';
import type { MovementInput } from '../input/MovementInput';

export class UIScene extends Phaser.Scene {
  private joystick!: VirtualJoystick;
  private interactButton!: VirtualButton;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.input.addPointer(2);

    this.joystick = new VirtualJoystick(this, 72, 408);

    this.interactButton = new VirtualButton(
      this,
      568,
      408,
      32,
      'A',
    );
  }

  getMovement(): MovementInput {
    return this.joystick.getMovement();
  }

  consumeInteractPress(): boolean {
    return this.interactButton.consumePress();
  }
}
