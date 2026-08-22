import Phaser from 'phaser';
import { WorldScene } from './scenes/WorldScene';
import { UIScene } from './scenes/UIScene';

export function createGame(): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,

    parent: 'game',

    width: 640,
    height: 480,

    pixelArt: true,

    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },

    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
      },
    },

    scene: [WorldScene, UIScene],
  });
}
