import { Room, Client } from 'colyseus';
import { GameState, PlayerState } from './GameState.js';
import {
  loadMapBounds,
  loadCollisionMaps,
  loadTransitions,
  rectangleOverlapsCollision,
  type Rectangle,
  type TransitionDefinition,
  type CollisionMap,
} from './MapData.js';

interface MovementInput {
  sequence: number;
  x: number;
  y: number;
}

interface TransitionRequest {
  transitionId: string;
  movementSequence: number;
}

const TICK_RATE = 60;
const FIXED_TIME_STEP = 1000 / TICK_RATE;
const MOVE_SPEED = 120;

const PLAYER_BODY_OFFSET_X = 6;
const PLAYER_BODY_OFFSET_Y = 14;
const PLAYER_BODY_WIDTH = 20;
const PLAYER_BODY_HEIGHT = 16;
const PLAYER_SPRITE_SIZE = 32;

const TRANSITIONS = loadTransitions();
const MAP_BOUNDS = loadMapBounds();
const COLLISION_MAPS = loadCollisionMaps();

export class GameRoom extends Room {
  private readonly movementInputs = new Map<string, MovementInput[]>();

  maxClients = 8;

  state = new GameState();

  onCreate(): void {
    this.onMessage('move', (client, message: MovementInput) => {
      this.handleMovementInput(client, message);
    });

    this.onMessage('transition', (client, message: TransitionRequest) => {
      this.handleTransitionRequest(client, message);
    });

    let elapsedTime = 0;

    this.setSimulationInterval((deltaTime: number) => {
      elapsedTime += deltaTime;

      while (elapsedTime >= FIXED_TIME_STEP) {
        elapsedTime -= FIXED_TIME_STEP;
        this.fixedTick();
      }
    });

    console.log(`Room created: ${this.roomId}`);

    this.logCollisionMaps();
  }

  private logCollisionMaps(): void {
    for (const [mapKey, collisionMap] of COLLISION_MAPS) {
      console.log(
        `[SERVER] Loaded collision map "${mapKey}": ${collisionMap.width}x${collisionMap.height} tiles, ${countCollidingTiles(collisionMap)} colliding tiles`,
      );
    }
  }

  onJoin(client: Client): void {
    const player = new PlayerState();

    player.id = client.sessionId;

    this.state.players.set(client.sessionId, player);

    this.movementInputs.set(client.sessionId, []);

    console.log(`Client joined: ${client.sessionId}`);
  }

  onLeave(client: Client): void {
    this.state.players.delete(client.sessionId);
    this.movementInputs.delete(client.sessionId);

    console.log(`Client left: ${client.sessionId}`);
  }

  onDispose(): void {
    console.log(`Room disposed: ${this.roomId}`);
  }

  private handleMovementInput(client: Client, input: MovementInput): void {
    if (
      !input ||
      !Number.isInteger(input.sequence) ||
      input.sequence <= 0 ||
      !Number.isFinite(input.x) ||
      !Number.isFinite(input.y)
    ) {
      return;
    }

    const queue = this.movementInputs.get(client.sessionId);

    if (!queue) {
      return;
    }

    const lastInput = queue.at(-1);

    if (lastInput && input.sequence <= lastInput.sequence) {
      return;
    }

    const length = Math.hypot(input.x, input.y);
    const scale = length > 1 ? 1 / length : 1;

    queue.push({
      sequence: input.sequence,
      x: input.x * scale,
      y: input.y * scale,
    });
  }

  private fixedTick(): void {
    for (const [sessionId, queue] of this.movementInputs) {
      const player = this.state.players.get(sessionId);

      if (!player) {
        continue;
      }

      const input = queue.shift();

      if (!input) {
        continue;
      }

      this.applyMovementInput(player, input);
    }
  }

  private handleTransitionRequest(client: Client, request: TransitionRequest): void {
    console.log(`[SERVER] Transition request from ${client.sessionId}: "${request?.transitionId}"`);

    if (
      !request ||
      typeof request.transitionId !== 'string' ||
      !Number.isInteger(request.movementSequence) ||
      request.movementSequence < 0
    ) {
      return;
    }

    const transition = TRANSITIONS.get(request.transitionId);

    if (!transition) {
      this.rejectTransition(client, request.transitionId, 'unknown transition');

      return;
    }

    const player = this.state.players.get(client.sessionId);

    if (!player) {
      console.log(`[SERVER] Rejected transition: player ${client.sessionId} not found`);

      return;
    }

    if (player.mapKey !== transition.sourceMap) {
      this.rejectTransition(
        client,
        request.transitionId,
        `player is on "${player.mapKey}", expected "${transition.sourceMap}"`,
      );

      return;
    }

    this.processMovementInputsThrough(client.sessionId, request.movementSequence);

    if (!this.isPointInsideBounds(player.x, player.y, transition.bounds)) {
      this.rejectTransition(
        client,
        request.transitionId,
        `player position (${player.x}, ${player.y}) is outside transition bounds`,
      );

      return;
    }

    console.log(
      `[SERVER] Accepted transition "${request.transitionId}": ${player.mapKey} -> ${transition.targetMap}, position (${transition.targetX}, ${transition.targetY})`,
    );

    player.mapKey = transition.targetMap;
    player.x = transition.targetX;
    player.y = transition.targetY;

    this.movementInputs.set(client.sessionId, []);
  }

  private isPointInsideBounds(
    x: number,
    y: number,
    bounds: TransitionDefinition['bounds'],
  ): boolean {
    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  }

  private applyMovementInput(player: PlayerState, input: MovementInput): void {
    const deltaSeconds = FIXED_TIME_STEP / 1000;
    const deltaX = input.x * MOVE_SPEED * deltaSeconds;
    const deltaY = input.y * MOVE_SPEED * deltaSeconds;

    this.movePlayer(player, deltaX, 0);
    this.movePlayer(player, 0, deltaY);

    player.lastProcessedInput = input.sequence;
  }

  private movePlayer(player: PlayerState, deltaX: number, deltaY: number): void {
    if (deltaX === 0 && deltaY === 0) {
      return;
    }

    const previousX = player.x;
    const previousY = player.y;

    player.x += deltaX;
    player.y += deltaY;

    this.clampPlayerToMapBounds(player);

    if (this.playerOverlapsCollision(player)) {
      player.x = previousX;
      player.y = previousY;
    }
  }

  private clampPlayerToMapBounds(player: PlayerState): void {
    const bounds = MAP_BOUNDS.get(player.mapKey);

    if (!bounds) {
      return;
    }

    player.x = clamp(player.x, 0, bounds.width);
    player.y = clamp(player.y, 0, bounds.height);
  }

  private playerOverlapsCollision(player: PlayerState): boolean {
    const collisionMap = COLLISION_MAPS.get(player.mapKey);

    if (!collisionMap) {
      return false;
    }

    return rectangleOverlapsCollision(collisionMap, this.getPlayerCollisionRectangle(player));
  }

  private processMovementInputsThrough(sessionId: string, sequence: number): void {
    const player = this.state.players.get(sessionId);
    const queue = this.movementInputs.get(sessionId);

    if (!player || !queue) {
      return;
    }

    while (queue.length > 0 && queue[0].sequence <= sequence) {
      this.applyMovementInput(player, queue.shift()!);
    }
  }

  private rejectTransition(client: Client, transitionId: string, reason: string): void {
    console.log(`[SERVER] Rejected transition "${transitionId}": ${reason}`);

    client.send('transitionRejected', {
      transitionId,
      reason,
    });
  }

  private getPlayerCollisionRectangle(player: PlayerState): Rectangle {
    return {
      x: player.x - PLAYER_SPRITE_SIZE / 2 + PLAYER_BODY_OFFSET_X,
      y: player.y - PLAYER_SPRITE_SIZE / 2 + PLAYER_BODY_OFFSET_Y,
      width: PLAYER_BODY_WIDTH,
      height: PLAYER_BODY_HEIGHT,
    };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function countCollidingTiles(collisionMap: CollisionMap): number {
  return collisionMap.collides.filter(Boolean).length;
}
