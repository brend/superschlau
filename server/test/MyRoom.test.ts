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

  it('restores a player after leaving and rejoining', async () => {
    const room = await colyseus.createRoom<GameRoom>('game', {
      databasePath: ':memory:',
    });

    const observer = await colyseus.connectTo(room, {
      playerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      displayName: 'Observer',
    });

    const firstClient = await colyseus.connectTo(room, {
      playerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      displayName: 'Original Name',
    });

    const firstPlayer = room.state.players.get(firstClient.sessionId);

    assert.ok(firstPlayer);

    firstPlayer.mapKey = 'house';
    firstPlayer.x = 144;
    firstPlayer.y = 176;
    firstPlayer.facing = 'up';

    await firstClient.leave();

    const returningClient = await colyseus.connectTo(room, {
      playerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      displayName: 'Replacement Name',
    });

    const restoredPlayer = room.state.players.get(returningClient.sessionId);

    assert.ok(restoredPlayer);
    assert.equal(restoredPlayer.displayName, 'Original Name');
    assert.equal(restoredPlayer.mapKey, 'house');
    assert.equal(restoredPlayer.x, 144);
    assert.equal(restoredPlayer.y, 176);
    assert.equal(restoredPlayer.facing, 'up');

    await returningClient.leave();
    await observer.leave();
  });
});
