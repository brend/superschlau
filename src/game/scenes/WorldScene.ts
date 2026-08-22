import Phaser from 'phaser';
import { InputController } from '../input/InputController';
import { Player } from '../entities/Player';
import { Npc } from '../entities/Npc';
import type { Interactable } from '../interactions/Interactable';
import { Sign } from '../entities/Sign';
import { getStringProperty } from '../maps/TiledProperties';
import { createMapEntity } from '../maps/MapEntityFactory';

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private inputController!: InputController;
  private readonly interactables: Interactable[] = [];
  private dialogueText!: Phaser.GameObjects.Text;
  private isDialogueOpen = false;

  constructor() {
    super('WorldScene');
  }

  preload(): void {
    this.load.image('test-tiles', '/assets/tiles/test-tiles.png');

    this.load.tilemapTiledJSON('test-map', '/assets/maps/test-map.json');

    this.load.spritesheet('player', '/assets/characters/player.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
  }

  create(): void {
    const map = this.make.tilemap({
      key: 'test-map',
    });

    const objects = map.getObjectLayer('Objects');

    if (!objects) {
      throw new Error('Objects layer could not be found.');
    }

    const playerSpawn = objects.objects.find((object) => object.name === 'player-spawn');

    if (!playerSpawn || playerSpawn.x === undefined || playerSpawn.y === undefined) {
      throw new Error('Player spawn could not be found.');
    }

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

    this.player = new Player(this, playerSpawn.x, playerSpawn.y);

    this.physics.add.collider(this.player.physicsObject, ground);

    this.cameras.main.startFollow(this.player.physicsObject);

    const entityObjects = objects.objects.filter(
      (object) => object.type === 'npc' || object.type === 'sign',
    );

    for (const object of entityObjects) {
      const entity = createMapEntity(this, object);

      this.interactables.push(entity.interactable);

      if (entity.physicsObject) {
        this.physics.add.collider(this.player.physicsObject, entity.physicsObject);
      }
    }

    this.inputController = new InputController(this);

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    this.input.addPointer(2);

    this.dialogueText = this.add
      .text(320, 420, '', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: {
          x: 12,
          y: 8,
        },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);
  }

  update(): void {
    if (this.isDialogueOpen) {
      this.player.update({ x: 0, y: 0 });

      if (this.inputController.consumeInteractPress()) {
        this.closeDialogue();
      }

      return;
    }

    const movement = this.inputController.getMovement();

    this.player.update(movement);

    const point = this.player.getInteractionPoint();

    if (this.inputController.consumeInteractPress()) {
      const interactable = this.interactables.find((candidate) =>
        candidate.interactionBounds.contains(point.x, point.y),
      );

      if (interactable) {
        const message = interactable.interact();

        this.openDialogue(message);
      }
    }
  }

  private openDialogue(message: string): void {
    this.isDialogueOpen = true;

    this.dialogueText.setText(message).setVisible(true);
  }

  private closeDialogue(): void {
    this.isDialogueOpen = false;
    this.dialogueText.setVisible(false);
  }
}
