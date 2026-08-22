import Phaser from 'phaser';
import type { Interactable } from './Interactable';

export class TestInteractable implements Interactable {
  readonly interactionBounds: Phaser.Geom.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    scene.add.rectangle(x, y, 24, 24, 0xffff00);

    this.interactionBounds = new Phaser.Geom.Rectangle(x - 16, y - 16, 32, 32);
  }

  interact(): void {
    console.log('Interacted!');
  }
}
