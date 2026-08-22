import Phaser from 'phaser';
import type { Interactable } from '../interactions/Interactable';

export class Npc implements Interactable {
  private readonly gameObject: Phaser.GameObjects.Rectangle & {
    body: Phaser.Physics.Arcade.StaticBody;
  };

  readonly interactionBounds: Phaser.Geom.Rectangle;

  private readonly message: string;

  constructor(scene: Phaser.Scene, x: number, y: number, message: string) {
    this.message = message;

    const gameObject = scene.add.rectangle(x, y, 24, 24, 0x4da6ff);

    scene.physics.add.existing(gameObject, true);

    this.gameObject = gameObject as Phaser.GameObjects.Rectangle & {
      body: Phaser.Physics.Arcade.StaticBody;
    };

    this.interactionBounds = new Phaser.Geom.Rectangle(x - 20, y - 20, 40, 40);
  }

  get physicsObject(): Phaser.GameObjects.Rectangle {
    return this.gameObject;
  }

  interact(): string {
    return this.message;
  }
}
