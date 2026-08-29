import { Room, Client } from 'colyseus';
import { GameState, PlayerState } from './GameState.js';

const MOVE_SPEED = 120;

interface MovementInput {
  x: number;
  y: number;
}

export class GameRoom extends Room {
  private readonly movementInputs = new Map<string, MovementInput>();

  maxClients = 8;

  state = new GameState();

  onCreate(): void {
    this.onMessage('move', (client, message: MovementInput) => {
      this.handleMovementInput(client, message);
    });

    this.setSimulationInterval((deltaTime: number) => this.updatePlayers(deltaTime));

    console.log(`Room created: ${this.roomId}`);
  }

  onJoin(client: Client): void {
    const player = new PlayerState();

    player.id = client.sessionId;

    this.state.players.set(client.sessionId, player);

    this.movementInputs.set(client.sessionId, {
      x: 0,
      y: 0,
    });

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
    if (!Number.isFinite(input.x) || !Number.isFinite(input.y)) {
      return;
    }

    const length = Math.hypot(input.x, input.y);

    const scale = length > 1 ? 1 / length : 1;

    this.movementInputs.set(client.sessionId, {
      x: input.x * scale,
      y: input.y * scale,
    });
  }

  private updatePlayers(deltaTime: number): void {
    const deltaSeconds = deltaTime / 1000;

    for (const [sessionId, input] of this.movementInputs) {
      const player = this.state.players.get(sessionId);

      if (!player) {
        continue;
      }

      player.x += input.x * MOVE_SPEED * deltaSeconds;
      player.y += input.y * MOVE_SPEED * deltaSeconds;
    }
  }
}
