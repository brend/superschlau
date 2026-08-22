import Phaser from 'phaser';

export interface Interactable {
  readonly interactionBounds: Phaser.Geom.Rectangle;

  interact(): string;
}
