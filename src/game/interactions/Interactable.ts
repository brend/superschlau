import Phaser from 'phaser';
import type { GameState } from '../gameplay/GameState';
import type { InteractionResult } from './InteractionResult';

export interface Interactable {
  readonly interactionBounds: Phaser.Geom.Rectangle;

  interact(gameState: GameState): InteractionResult;
}
