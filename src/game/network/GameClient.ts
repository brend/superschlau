import { Callbacks, Client, type Room } from '@colyseus/sdk';

export class GameClient {
  private readonly client: Client;
  private room?: Room;
  private playerAddedHandlers: Array<(sessionId: string) => void> = [];
  private playerRemovedHandlers: Array<(sessionId: string) => void> = [];

  constructor(endpoint: string) {
    this.client = new Client(endpoint);
  }

  async connect(): Promise<void> {
    this.room = await this.client.joinOrCreate('game');

    console.log(`Joined room ${this.room.roomId} as ${this.room.sessionId}`);

    const callbacks = Callbacks.get(this.room);

    callbacks.onAdd('players', (_player, sessionId) => {
      for (const handler of this.playerAddedHandlers) {
        handler(sessionId as string);
      }
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

  get sessionId(): string | undefined {
    return this.room?.sessionId;
  }

  getPlayerSessionIds(): string[] {
    if (!this.room) {
      return [];
    }

    return Array.from(this.room.state.players.keys());
  }
}
