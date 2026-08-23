import Phaser from 'phaser';
import type { MovementInput } from './MovementInput';
import type { InputSource } from './InputSource';

export class KeyboardInput implements InputSource {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly interactKey: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    if (!scene.input.keyboard) {
      throw new Error('Keyboard input is unavailable.');
    }

    this.cursors = scene.input.keyboard.createCursorKeys();

    this.interactKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  getMovement(): MovementInput {
    return {
      x: Number(this.cursors.right.isDown) - Number(this.cursors.left.isDown),
      y: Number(this.cursors.down.isDown) - Number(this.cursors.up.isDown),
    };
  }

  consumeInteractPress(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.interactKey);
  }
}
