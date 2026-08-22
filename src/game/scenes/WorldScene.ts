import Phaser from 'phaser';
import { InputController } from '../input/InputController';
import { Player } from '../entities/Player';
import type { Interactable } from '../interactions/Interactable';
import { Npc } from '../entities/Npc';

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private inputController!: InputController;
  private interactable!: Interactable;
  private interactionMarker!: Phaser.GameObjects.Arc;
  private npc!: Npc;
  private dialogueText!: Phaser.GameObjects.Text;

  constructor() {
    super('WorldScene');
  }

  preload(): void {
    this.load.image('test-tiles', '/assets/tiles/test-tiles.png');

    this.load.tilemapTiledJSON('test-map', '/assets/maps/test-map.json');
  }

  create(): void {
    const map = this.make.tilemap({
      key: 'test-map',
    });

    const tileset = map.addTilesetImage('test-tiles', 'test-tiles');

    if (!tileset) {
      throw new Error('Tileset could not be created.');
    }

    const ground = map.createLayer('Ground', tileset, 0, 0);

    if (!ground) {
      throw new Error('Ground layer could not be created.');
    }

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    ground.setCollisionByProperty({
      collides: true,
    });

    this.player = new Player(this, 320, 240);
    this.physics.add.collider(this.player.physicsObject, ground);

    this.cameras.main.startFollow(this.player.physicsObject);

    this.inputController = new InputController(this);

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    this.input.addPointer(2);

    this.npc = new Npc(this, 450, 300);

    this.interactionMarker = this.add.circle(0, 0, 3, 0x0000ff);

    this.dialogueText = this.add
  .text(
    320,
    420,
    '',
    {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: {
        x: 12,
        y: 8,
      },
    },
  )
  .setOrigin(0.5)
  .setScrollFactor(0)
  .setDepth(100)
  .setVisible(false);
  }

  update(): void {
    const movement = this.inputController.getMovement();

    this.player.update(movement);

    if (this.inputController.consumeInteractPress()) {
      const point = this.player.getInteractionPoint();

      if (this.npc.interactionBounds.contains(
        point.x,
        point.y,
      )) {
        this.npc.interact();
      }

      this.interactionMarker.setPosition(point.x, point.y);
    }
  }
}
