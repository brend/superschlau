import { MapSchema, Schema, type } from '@colyseus/schema';

export class PlayerState extends Schema {
  @type('string')
  id = '';

  @type('string')
  mapKey = 'test-map';

  @type('number')
  x = 320;

  @type('number')
  y = 240;

  @type('number')
  lastProcessedInput = 0;
}

export class GameState extends Schema {
  @type({ map: PlayerState })
  players = new MapSchema<PlayerState>();
}
