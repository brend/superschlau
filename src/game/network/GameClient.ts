import { Callbacks, Client, type Room } from '@colyseus/sdk';
import type { MovementInput } from '../input/MovementInput';

export interface NetworkPlayerState {
  sessionId: string;
  mapKey: string;
  x: number;
  y: number;
  lastProcessedInput: number;
}

interface TransitionRejectedMessage {
  transitionId: string;
  reason: string;
}

export class GameClient {
  private readonly client: Client;
  private room?: Room;
  private playerAddedHandlers: Array<(sessionId: string) => void> = [];
  private playerRemovedHandlers: Array<(sessionId: string) => void> = [];
  private playerChangedHandlers: Array<(player: NetworkPlayerState) => void> = [];
  private transitionRejectedHandlers: Array<(transitionId: string, reason: string) => void> = [];
  private nextMovementSequence = 1;
  private lastSentMovementSequence = 0;

  constructor(endpoint: string) {
    this.client = new Client(endpoint);
  }

  async connect(): Promise<void> {
    this.room = await this.client.joinOrCreate('game');

    console.log(`Joined room ${this.room.roomId} as ${this.room.sessionId}`);

    const callbacks = Callbacks.get(this.room);

    callbacks.onAdd('players', (player, sessionId) => {
      const sessionIdString = sessionId as string;
      const playerObject = player as {
        mapKey: string;
        x: number;
        y: number;
        lastProcessedInput: number;
      };

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

    this.room.onMessage('transitionRejected', (message: TransitionRejectedMessage) => {
      if (
        !message ||
        typeof message.transitionId !== 'string' ||
        typeof message.reason !== 'string'
      ) {
        return;
      }

      for (const handler of this.transitionRejectedHandlers) {
        handler(message.transitionId, message.reason);
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

  onTransitionRejected(handler: (transitionId: string, reason: string) => void): () => void {
    this.transitionRejectedHandlers.push(handler);

    return () => {
      const index = this.transitionRejectedHandlers.indexOf(handler);

      if (index >= 0) {
        this.transitionRejectedHandlers.splice(index, 1);
      }
    };
  }

  get sessionId(): string | undefined {
    return this.room?.sessionId;
  }

  getPlayers(): NetworkPlayerState[] {
    if (!this.room) {
      return [];
    }

    const players: NetworkPlayerState[] = [];

    for (const [sessionId, player] of this.room.state.players) {
      players.push({
        sessionId,
        mapKey: player.mapKey,
        x: player.x,
        y: player.y,
        lastProcessedInput: player.lastProcessedInput,
      });
    }

    return players;
  }

  sendMovement(input: MovementInput): number | undefined {
    if (!this.room) {
      return undefined;
    }

    const sequence = this.nextMovementSequence++;

    this.lastSentMovementSequence = sequence;

    this.room.send('move', {
      sequence,
      x: input.x,
      y: input.y,
    });

    return sequence;
  }

  requestTransition(transitionId: string): void {
    this.room?.send('transition', {
      transitionId,
      movementSequence: this.lastSentMovementSequence,
    });
  }

  private notifyPlayerChanged(
    sessionId: string,
    player: {
      mapKey: string;
      x: number;
      y: number;
      lastProcessedInput: number;
    },
  ): void {
    const state: NetworkPlayerState = {
      sessionId,
      mapKey: player.mapKey,
      x: player.x,
      y: player.y,
      lastProcessedInput: player.lastProcessedInput,
    };

    for (const handler of this.playerChangedHandlers) {
      handler(state);
    }
  }
}
