import Phaser from 'phaser';
import type { Interactable } from '../interactions/Interactable';

export class Sign implements Interactable {
  readonly interactionBounds: Phaser.Geom.Rectangle;
  private readonly message: string;

  constructor(scene: Phaser.Scene, x: number, y: number, message: string) {
    scene.add.rectangle(x, y, 20, 28, 0x8b5a2b);

    this.interactionBounds = new Phaser.Geom.Rectangle(x - 18, y - 18, 36, 36);
    this.message = message;
  }

  interact(): string {
    return this.message;
  }
}
