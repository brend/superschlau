import { Room, Client } from 'colyseus';
import { GameState, PlayerState } from './GameState.js';

interface MovementInput {
  sequence: number;
  x: number;
  y: number;
}

interface TransitionRequest {
  transitionId: string;
}

interface TransitionDefinition {
  sourceMap: string;
  targetMap: string;
  targetX: number;
  targetY: number;
}

const TRANSITIONS = new Map<string, TransitionDefinition>([
  [
    'outdoor-to-house',
    {
      sourceMap: 'test-map',
      targetMap: 'house',
      targetX: 143,
      targetY: 281,
    },
  ],
  [
    'house-to-outdoor',
    {
      sourceMap: 'house',
      targetMap: 'test-map',
      targetX: 214,
      targetY: 250,
    },
  ],
]);

const TICK_RATE = 60;
const FIXED_TIME_STEP = 1000 / TICK_RATE;
const MOVE_SPEED = 120;

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
    const deltaSeconds = FIXED_TIME_STEP / 1000;

    for (const [sessionId, queue] of this.movementInputs) {
      const player = this.state.players.get(sessionId);

      if (!player) {
        continue;
      }

      const input = queue.shift();

      if (!input) {
        continue;
      }

      player.x += input.x * MOVE_SPEED * deltaSeconds;
      player.y += input.y * MOVE_SPEED * deltaSeconds;

      player.lastProcessedInput = input.sequence;
    }
  }

  private handleTransitionRequest(client: Client, request: TransitionRequest): void {
    console.log(`[SERVER] Transition request from ${client.sessionId}: "${request?.transitionId}"`);

    if (!request || typeof request.transitionId !== 'string') {
      return;
    }

    const transition = TRANSITIONS.get(request.transitionId);

    if (!transition) {
      console.log(`[SERVER] Rejected unknown transition "${request.transitionId}"`);

      return;
    }

    const player = this.state.players.get(client.sessionId);

    if (!player) {
      console.log(`[SERVER] Rejected transition: player ${client.sessionId} not found`);

      return;
    }

    if (player.mapKey !== transition.sourceMap) {
      console.log(
        `[SERVER] Rejected transition "${request.transitionId}": player is on "${player.mapKey}", expected "${transition.sourceMap}"`,
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
}
