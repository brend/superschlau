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
import type { NetworkPlayerState } from '../network/GameClient';

interface WorldSceneData {
  mapKey?: string;
  spawnName?: string;
  authoritativeX?: number;
  authoritativeY?: number;
}

interface RemotePlayerView {
  gameObject: Phaser.GameObjects.Rectangle;
  targetX: number;
  targetY: number;
}

interface PendingMovementInput {
  sequence: number;
  x: number;
  y: number;
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
  private readonly remotePlayers = new Map<string, RemotePlayerView>();
  private unsubscribePlayerAdded?: () => void;
  private unsubscribePlayerRemoved?: () => void;
  private unsubscribePlayerChanged?: () => void;
  private elapsedTime = 0;
  private readonly fixedTimeStep = 1000 / 60;
  private pendingMovementInputs: PendingMovementInput[] = [];
  private authoritativeX?: number;
  private authoritativeY?: number;
  private transitionInProgress = false;

  constructor() {
    super('WorldScene');
  }

  init(data: WorldSceneData): void {
    this.mapKey = data.mapKey ?? 'test-map';
    this.spawnName = data.spawnName ?? 'spawn-default';

    this.authoritativeX = data.authoritativeX;
    this.authoritativeY = data.authoritativeY;
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
    console.log(
      `[CLIENT] Creating WorldScene: map="${this.mapKey}", authoritativePosition=(${this.authoritativeX}, ${this.authoritativeY})`,
    );

    this.interactables.length = 0;
    this.transitions.length = 0;
    this.pendingMovementInputs.length = 0;
    this.remotePlayers.clear();
    this.inputController = undefined;
    this.isDialogueOpen = false;
    this.elapsedTime = 0;
    this.transitionInProgress = false;
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

    const hasAuthoritativePosition =
      this.authoritativeX !== undefined && this.authoritativeY !== undefined;

    const playerSpawn = hasAuthoritativePosition
      ? undefined
      : objects.objects.find((object) => object.name === this.spawnName);

    if (
      !hasAuthoritativePosition &&
      (!playerSpawn || playerSpawn.x === undefined || playerSpawn.y === undefined)
    ) {
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

    const playerX = hasAuthoritativePosition ? this.authoritativeX! : playerSpawn!.x!;
    const playerY = hasAuthoritativePosition ? this.authoritativeY! : playerSpawn!.y!;

    this.player = new Player(this, playerX, playerY);

    console.log(`[CLIENT] Player created on "${this.mapKey}" at (${playerX}, ${playerY})`);

    this.authoritativeX = undefined;
    this.authoritativeY = undefined;

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
        id: getStringProperty(object, 'transitionId'),
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

    this.unsubscribePlayerChanged = gameClient.onPlayerChanged((state) => {
      if (state.sessionId === gameClient.sessionId) {
        if (state.mapKey !== this.mapKey) {
          console.log(
            `[CLIENT] Authoritative map change: "${this.mapKey}" -> "${state.mapKey}" at (${state.x}, ${state.y})`,
          );

          this.pendingMovementInputs.length = 0;

          this.scene.restart({
            mapKey: state.mapKey,
            spawnName: undefined,
            authoritativeX: state.x,
            authoritativeY: state.y,
          });

          return;
        }

        this.reconcileLocalPlayer(state);
        return;
      }

      if (state.mapKey !== this.mapKey) {
        console.log(`[CLIENT] Player created on "${this.mapKey}" at (${playerX}, ${playerY})`);

        this.removeRemotePlayer(state.sessionId);
        return;
      }

      console.log(`[CLIENT] Remote ${state.sessionId} is on local map "${this.mapKey}"`);

      this.addRemotePlayer(state.sessionId);

      const remotePlayer = this.remotePlayers.get(state.sessionId);

      if (remotePlayer) {
        remotePlayer.targetX = state.x;
        remotePlayer.targetY = state.y;
      }
    });

    for (const state of gameClient.getPlayers()) {
      if (state.sessionId === gameClient.sessionId || state.mapKey !== this.mapKey) {
        continue;
      }

      this.addRemotePlayer(state.sessionId);

      const remotePlayer = this.remotePlayers.get(state.sessionId);

      if (remotePlayer) {
        remotePlayer.gameObject.setPosition(state.x, state.y);
        remotePlayer.targetX = state.x;
        remotePlayer.targetY = state.y;
      }
    }

    this.events.on(Phaser.Scenes.Events.PAUSE, this.handlePause, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.handleResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  update(_time: number, delta: number): void {
    if (!this.inputController) {
      const uiScene = this.scene.get('UIScene') as UIScene;

      if (!this.scene.isActive('UIScene')) {
        return;
      }

      this.inputController = new InputController(this, uiScene);
    }

    // remote visual interpolation
    for (const remotePlayer of this.remotePlayers.values()) {
      remotePlayer.gameObject.x = Phaser.Math.Linear(
        remotePlayer.gameObject.x,
        remotePlayer.targetX,
        0.2,
      );

      remotePlayer.gameObject.y = Phaser.Math.Linear(
        remotePlayer.gameObject.y,
        remotePlayer.targetY,
        0.2,
      );
    }

    this.elapsedTime += delta;

    while (this.elapsedTime >= this.fixedTimeStep) {
      this.elapsedTime -= this.fixedTimeStep;
      this.fixedTick();
    }

    if (this.isDialogueOpen) {
      if (this.inputController.consumeInteractPress()) {
        this.closeDialogue();
      }

      return;
    }

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

    if (!this.transitionInProgress) {
      const transition = this.transitions.find((candidate) => candidate.bounds.contains(x, y));

      if (transition) {
        console.log(`[CLIENT] Requesting transition "${transition.id}" from map "${this.mapKey}"`);
        this.transitionInProgress = true;
        gameClient.requestTransition(transition.id);
      }
    }
  }

  private fixedTick(): void {
    if (!this.inputController) {
      return;
    }

    const movement = this.isDialogueOpen ? { x: 0, y: 0 } : this.inputController.getMovement();

    const sequence = gameClient.sendMovement(movement);

    if (sequence !== undefined) {
      this.pendingMovementInputs.push({
        sequence,
        x: movement.x,
        y: movement.y,
      });
    }

    this.player.applyMovementStep(movement, this.fixedTimeStep / 1000);
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
    const movement = { x: 0, y: 0 };

    gameClient.sendMovement(movement);
    this.player.update(movement);
  }

  private handleResume(): void {
    this.player.update({ x: 0, y: 0 });
  }

  private handleShutdown(): void {
    this.unsubscribePlayerAdded?.();
    this.unsubscribePlayerRemoved?.();
    this.unsubscribePlayerChanged?.();

    this.unsubscribePlayerAdded = undefined;
    this.unsubscribePlayerRemoved = undefined;
    this.unsubscribePlayerChanged = undefined;

    this.events.off(Phaser.Scenes.Events.PAUSE, this.handlePause, this);
    this.events.off(Phaser.Scenes.Events.RESUME, this.handleResume, this);
  }

  private addRemotePlayer(sessionId: string): void {
    if (this.remotePlayers.has(sessionId)) {
      return;
    }

    const gameObject = this.add.rectangle(
      360 + 30 * this.remotePlayers.size,
      240,
      24,
      24,
      0xff00ff,
    );

    this.remotePlayers.set(sessionId, {
      gameObject,
      targetX: gameObject.x,
      targetY: gameObject.y,
    });
  }

  private removeRemotePlayer(sessionId: string): void {
    const player = this.remotePlayers.get(sessionId);

    if (!player) {
      return;
    }

    player.gameObject.destroy();

    this.remotePlayers.delete(sessionId);
  }

  private reconcileLocalPlayer(state: NetworkPlayerState): void {
    this.pendingMovementInputs = this.pendingMovementInputs.filter(
      (input) => input.sequence > state.lastProcessedInput,
    );

    this.player.setPosition(state.x, state.y);

    for (const input of this.pendingMovementInputs) {
      this.player.applyMovementStep(input, this.fixedTimeStep / 1000);
    }
  }
}
