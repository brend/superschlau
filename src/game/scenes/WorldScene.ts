import Phaser from 'phaser';
import { InputController } from '../input/InputController';
import { Player } from '../entities/Player';
import type { Interactable } from '../interactions/Interactable';
import { createMapEntity } from '../maps/MapEntityFactory';
import type { MapTransition } from '../maps/MapTransition';
import { getStringProperty } from '../maps/TiledProperties';
import { UIScene } from './UIScene';
import { createPlayerAnimations } from '../animations/PlayerAnimations';
import { GameState } from '../gameplay/GameState';
import { gameClient } from '../network/network';

interface WorldSceneData {
  mapKey?: string;
  spawnName?: string;
}

export class WorldScene extends Phaser.Scene {
  private mapKey = 'test-map';
  private spawnName = 'spawn-default';
  private player!: Player;
  private inputController?: InputController;
  private readonly interactables: Interactable[] = [];
  private readonly transitions: MapTransition[] = [];
  private isDialogueOpen = false;
  private readonly gameState = new GameState();
  private readonly remotePlayers = new Map<string, Phaser.GameObjects.Rectangle>();
  private unsubscribePlayerAdded?: () => void;
  private unsubscribePlayerRemoved?: () => void;

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
    this.remotePlayers.clear();
    this.inputController = undefined;
    this.isDialogueOpen = false;
    if (this.scene.isActive('UIScene')) {
      this.uiScene.hideDialogue();
    }

    if (!this.anims.exists('player-walk-down')) {
      createPlayerAnimations(this.anims);
    }

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

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }

    this.unsubscribePlayerAdded = gameClient.onPlayerAdded((sessionId) => {
      if (sessionId === gameClient.sessionId) {
        return;
      }

      this.addRemotePlayer(sessionId);
    });

    this.unsubscribePlayerRemoved = gameClient.onPlayerRemoved((sessionId) => {
      this.removeRemotePlayer(sessionId);
    });

    for (const sessionId of gameClient.getPlayerSessionIds()) {
      if (sessionId !== gameClient.sessionId) {
        this.addRemotePlayer(sessionId);
      }
    }

    this.events.on(Phaser.Scenes.Events.PAUSE, this.handlePause, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.handleResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  update(): void {
    if (!this.inputController) {
      const uiScene = this.scene.get('UIScene') as UIScene;

      if (!this.scene.isActive('UIScene')) {
        return;
      }

      this.inputController = new InputController(this, uiScene);
    }

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
        const result = interactable.interact(this.gameState);

        if (result.setFlag) {
          this.gameState.setFlag(result.setFlag);
        }

        this.openDialogue(result.message);
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
    this.uiScene.showDialogue(message);
  }

  private closeDialogue(): void {
    this.isDialogueOpen = false;
    this.uiScene.hideDialogue();
  }

  private get uiScene(): UIScene {
    return this.scene.get('UIScene') as UIScene;
  }

  private handlePause(): void {
    this.player.update({ x: 0, y: 0 });
  }

  private handleResume(): void {
    this.player.update({ x: 0, y: 0 });
  }

  private handleShutdown(): void {
    this.unsubscribePlayerAdded?.();
    this.unsubscribePlayerRemoved?.();

    this.unsubscribePlayerAdded = undefined;
    this.unsubscribePlayerRemoved = undefined;

    this.events.off(Phaser.Scenes.Events.PAUSE, this.handlePause, this);
    this.events.off(Phaser.Scenes.Events.RESUME, this.handlePause, this);
  }

  private addRemotePlayer(sessionId: string): void {
    if (this.remotePlayers.has(sessionId)) {
      return;
    }

    const player = this.add.rectangle(360 + 30 * this.remotePlayers.size, 240, 24, 24, 0xff00ff);

    this.remotePlayers.set(sessionId, player);
  }

  private removeRemotePlayer(sessionId: string): void {
    const player = this.remotePlayers.get(sessionId);

    if (!player) {
      return;
    }

    player.destroy();

    this.remotePlayers.delete(sessionId);
  }
}
