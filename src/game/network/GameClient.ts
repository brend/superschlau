import { Callbacks, Client, type Room } from '@colyseus/sdk';
import type { MovementInput } from '../input/MovementInput';

export interface NetworkPlayerState {
  sessionId: string;
  x: number;
  y: number;
}

export class GameClient {
  private readonly client: Client;
  private room?: Room;
  private playerAddedHandlers: Array<(sessionId: string) => void> = [];
  private playerRemovedHandlers: Array<(sessionId: string) => void> = [];
  private playerChangedHandlers: Array<(player: NetworkPlayerState) => void> = [];

  constructor(endpoint: string) {
    this.client = new Client(endpoint);
  }

  async connect(): Promise<void> {
    this.room = await this.client.joinOrCreate('game');

    console.log(`Joined room ${this.room.roomId} as ${this.room.sessionId}`);

    const callbacks = Callbacks.get(this.room);

    callbacks.onAdd('players', (player, sessionId) => {
      const sessionIdString = sessionId as string;
      const playerObject = player as { x: number; y: number };

      for (const handler of this.playerAddedHandlers) {
        handler(sessionIdString);
      }

      this.notifyPlayerChanged(sessionIdString, playerObject);

      callbacks.onChange(playerObject, () => {
        this.notifyPlayerChanged(sessionIdString, playerObject);
      });
    });

    callbacks.onRemove('players', (_player, sessionId) => {
      for (const handler of this.playerRemovedHandlers) {
        handler(sessionId as string);
      }
    });

    this.room.onLeave((code) => {
      console.log(`Left room. Code ${code}.`);
    });
  }

  onPlayerAdded(handler: (sessionId: string) => void): () => void {
    this.playerAddedHandlers.push(handler);

    return () => {
      const index = this.playerAddedHandlers.indexOf(handler);

      if (index >= 0) {
        this.playerAddedHandlers.splice(index, 1);
      }
    };
  }

  onPlayerRemoved(handler: (sessionId: string) => void): () => void {
    this.playerRemovedHandlers.push(handler);

    return () => {
      const index = this.playerRemovedHandlers.indexOf(handler);

      if (index >= 0) {
        this.playerRemovedHandlers.splice(index, 1);
      }
    };
  }

  onPlayerChanged(handler: (player: NetworkPlayerState) => void): () => void {
    this.playerChangedHandlers.push(handler);

    return () => {
      const index = this.playerChangedHandlers.indexOf(handler);

      if (index >= 0) {
        this.playerChangedHandlers.splice(index, 1);
      }
    };
  }

  get sessionId(): string | undefined {
    return this.room?.sessionId;
  }

  getPlayerSessionIds(): string[] {
    if (!this.room) {
      return [];
    }

    return Array.from(this.room.state.players.keys());
  }

  sendMovement(input: MovementInput): void {
    this.room?.send('move', input);
  }

  private notifyPlayerChanged(sessionId: string, player: { x: number; y: number }): void {
    const state: NetworkPlayerState = {
      sessionId,
      x: player.x,
      y: player.y,
    };

    for (const handler of this.playerChangedHandlers) {
      handler(state);
    }
  }
}
