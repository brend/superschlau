import Phaser from 'phaser';
import { InputController } from '../input/InputController';
import { Player } from '../entities/Player';
import type { Interactable } from '../interactions/Interactable';
import { createMapEntity } from '../maps/MapEntityFactory';
import type { MapTransition } from '../maps/MapTransition';
import { getStringProperty } from '../maps/TiledProperties';
import { UIScene } from './UIScene';

interface WorldSceneData {
  mapKey?: string;
  spawnName?: string;
}

export class WorldScene extends Phaser.Scene {
  private mapKey = 'test-map';
  private spawnName = 'spawn-default';
  private player!: Player;
  private inputController!: InputController;
  private readonly interactables: Interactable[] = [];
  private readonly transitions: MapTransition[] = [];
  private dialogueText!: Phaser.GameObjects.Text;
  private isDialogueOpen = false;

  constructor() {
    super('WorldScene');
  }

  init(data: WorldSceneData): void {
    this.mapKey = data.mapKey ?? 'test-map';
    this.spawnName = data.spawnName ?? 'spawn-default';
  }

  preload(): void {
    this.load.image('test-tiles', '/assets/tiles/test-tiles.png');

    this.load.tilemapTiledJSON('test-map', '/assets/maps/test-map.json');
    this.load.tilemapTiledJSON('house', '/assets/maps/house.json');

    this.load.spritesheet('player', '/assets/characters/player.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
  }

  create(): void {
    this.interactables.length = 0;
    this.transitions.length = 0;

    const map = this.make.tilemap({
      key: this.mapKey,
    });

    const objects = map.getObjectLayer('Objects');

    if (!objects) {
      throw new Error('Objects layer could not be found.');
    }

    const playerSpawn = objects.objects.find((object) => object.name === this.spawnName);

    if (!playerSpawn || playerSpawn.x === undefined || playerSpawn.y === undefined) {
      throw new Error(
        `Player spawn "${this.spawnName}" could not be found in map "${this.mapKey}"`,
      );
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

    const transitionObjects = objects.objects.filter((object) => object.type === 'transition');

    for (const object of transitionObjects) {
      if (
        object.x === undefined ||
        object.y === undefined ||
        object.width === undefined ||
        object.height === undefined
      ) {
        throw new Error(`Transition "${object.name}" has invalid bounds.`);
      }

      this.transitions.push({
        bounds: new Phaser.Geom.Rectangle(object.x, object.y, object.width, object.height),
        targetMap: getStringProperty(object, 'targetMap'),
        targetSpawn: getStringProperty(object, 'targetSpawn'),
      });
    }

    this.inputController = new InputController(this);

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

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

    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }
  }

  update(): void {
    if (this.isDialogueOpen) {
      this.player.update({ x: 0, y: 0 });

      if (this.inputController.consumeInteractPress() || this.uiScene.consumeInteractPress()) {
        this.closeDialogue();
      }

      return;
    }

    const keyboardMovement = this.inputController.getMovement();

    const touchMovement = this.uiScene.getMovement();

    const movement =
      keyboardMovement.x !== 0 || keyboardMovement.y !== 0 ? keyboardMovement : touchMovement;

    this.player.update(movement);

    const point = this.player.getInteractionPoint();

    if (this.inputController.consumeInteractPress() || this.uiScene.consumeInteractPress()) {
      const interactable = this.interactables.find((candidate) =>
        candidate.interactionBounds.contains(point.x, point.y),
      );

      if (interactable) {
        const message = interactable.interact();

        this.openDialogue(message);
      }
    }

    const x = this.player.physicsObject.x;
    const y = this.player.physicsObject.y;

    const transition = this.transitions.find((candidate) => candidate.bounds.contains(x, y));

    if (transition) {
      this.scene.restart({
        mapKey: transition.targetMap,
        spawnName: transition.targetSpawn,
      });
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

  private get uiScene(): UIScene {
    return this.scene.get('UIScene') as UIScene;
  }
}
