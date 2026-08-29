import { Room, Client } from 'colyseus';
import { GameState, PlayerState } from './GameState.js';

export class GameRoom extends Room {
  maxClients = 8;

  state = new GameState();

  onCreate(): void {
    console.log(`Room created: ${this.roomId}`);
  }

  onJoin(client: Client): void {
    const player = new PlayerState();

    player.id = client.sessionId;

    this.state.players.set(client.sessionId, player);

    console.log(`Client joined: ${client.sessionId}`);
  }

  onLeave(client: Client): void {
    this.state.players.delete(client.sessionId);

    console.log(`Client left: ${client.sessionId}`);
  }

  onDispose(): void {
    console.log(`Room disposed: ${this.roomId}`);
  }
}
