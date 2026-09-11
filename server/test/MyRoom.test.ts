import assert from 'node:assert/strict';
import { ColyseusTestServer, boot } from '@colyseus/testing';
import appConfig from '../src/app.config.js';
import type { GameRoom } from '../src/rooms/GameRoom.js';

describe('GameRoom', () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;

  before(async () => {
    colyseus = await boot(appConfig);
  });

  after(async () => {
    await colyseus.shutdown();
  });

  beforeEach(async () => {
    await colyseus.cleanup();
  });

  it('creates a player with the supplied guest identity', async () => {
    const playerId = '12345678-1234-4123-8123-123456789abc';
    const displayName = 'Guest-123456';

    const room = await colyseus.createRoom<GameRoom>('game', {
      databasePath: ':memory:',
    });
    const client = await colyseus.connectTo(room, {
      playerId,
      displayName,
    });

    const player = room.state.players.get(client.sessionId);

    assert.ok(player);
    assert.equal(player.id, client.sessionId);
    assert.equal(player.playerId, playerId);
    assert.equal(player.displayName, displayName);
    assert.equal(player.mapKey, 'test-map');
    assert.equal(player.x, 320);
    assert.equal(player.y, 240);
    assert.equal(player.facing, 'down');
    assert.equal(player.isMoving, false);
    assert.equal(player.lastProcessedInput, 0);

    await client.leave();
  });
});
