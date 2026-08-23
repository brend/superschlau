import Phaser from 'phaser';
import type { Interactable } from '../interactions/Interactable';
import type { InteractionResult } from '../interactions/InteractionResult';
import type { GameState } from '../gameplay/GameState';

export class Sign implements Interactable {
  readonly interactionBounds: Phaser.Geom.Rectangle;
  private readonly message: string;
  private readonly setFlag?: string;

  constructor(scene: Phaser.Scene, x: number, y: number, message: string, setFlag?: string) {
    scene.add.rectangle(x, y, 20, 28, 0x8b5a2b);

    this.interactionBounds = new Phaser.Geom.Rectangle(x - 18, y - 18, 36, 36);
    this.message = message;
    this.setFlag = setFlag;
  }

  interact(_gameState: GameState): InteractionResult {
    return {
      message: this.message,
      setFlag: this.setFlag,
    };
  }
}
