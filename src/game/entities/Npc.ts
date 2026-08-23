import Phaser from 'phaser';
import type { Interactable } from '../interactions/Interactable';
import type { GameState } from '../gameplay/GameState';
import type { InteractionResult } from '../interactions/InteractionResult';
import type { NpcDialogue } from './NpcDialogue';

export class Npc implements Interactable {
  private readonly gameObject: Phaser.GameObjects.Rectangle & {
    body: Phaser.Physics.Arcade.StaticBody;
  };

  readonly interactionBounds: Phaser.Geom.Rectangle;

  private readonly dialogue: NpcDialogue;

  constructor(scene: Phaser.Scene, x: number, y: number, dialogue: NpcDialogue) {
    this.dialogue = dialogue;

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

  interact(gameState: GameState): InteractionResult {
    if (this.dialogue.completedFlag && gameState.hasFlag(this.dialogue.completedFlag)) {
      return {
        message: this.dialogue.completedMessage ?? this.dialogue.defaultMessage,
      };
    }

    if (this.dialogue.startedFlag && gameState.hasFlag(this.dialogue.startedFlag)) {
      return {
        message: this.dialogue.startedMessage ?? this.dialogue.defaultMessage,
      };
    }

    return {
      message: this.dialogue.defaultMessage,
      setFlag: this.dialogue.setFlag,
    };
  }
}
