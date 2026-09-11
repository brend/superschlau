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

  @type('string')
  facing = 'down';

  @type('boolean')
  isMoving = false;
}

export class GameState extends Schema {
  @type({ map: PlayerState })
  players = new MapSchema<PlayerState>();
}
