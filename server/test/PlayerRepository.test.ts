import assert from 'node:assert/strict';
import { PlayerRepository } from '../src/persistence/PlayerRepository.js';

describe('PlayerRepository', () => {
  it('saves and updates a player', () => {
    const repository = new PlayerRepository(':memory:');

    try {
      repository.save({
        playerId: '12345678-1234-4123-8123-123456789abc',
        displayName: 'Guest-123456',
        mapKey: 'test-map',
        x: 320,
        y: 240,
        facing: 'down',
      });

      repository.save({
        playerId: '12345678-1234-4123-8123-123456789abc',
        displayName: 'Guest-123456',
        mapKey: 'house',
        x: 160,
        y: 200,
        facing: 'up',
      });

      assert.deepEqual(repository.findById('12345678-1234-4123-8123-123456789abc'), {
        playerId: '12345678-1234-4123-8123-123456789abc',
        displayName: 'Guest-123456',
        mapKey: 'house',
        x: 160,
        y: 200,
        facing: 'up',
      });
    } finally {
      repository.close();
    }
  });
});
