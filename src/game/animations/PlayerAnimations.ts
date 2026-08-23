import Phaser from 'phaser';

export function createPlayerAnimations(animations: Phaser.Animations.AnimationManager): void {
  animations.create({
    key: 'player-walk-down',
    frames: animations.generateFrameNumbers('player', {
      frames: [0, 1, 2, 1],
    }),
    frameRate: 8,
    repeat: -1,
  });

  animations.create({
    key: 'player-walk-left',
    frames: animations.generateFrameNumbers('player', {
      frames: [3, 4, 5, 4],
    }),
    frameRate: 8,
    repeat: -1,
  });

  animations.create({
    key: 'player-walk-right',
    frames: animations.generateFrameNumbers('player', {
      frames: [6, 7, 8, 7],
    }),
    frameRate: 8,
    repeat: -1,
  });

  animations.create({
    key: 'player-walk-up',
    frames: animations.generateFrameNumbers('player', {
      frames: [9, 10, 11, 10],
    }),
    frameRate: 8,
    repeat: -1,
  });
}
