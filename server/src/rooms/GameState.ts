import { MapSchema, Schema, type } from '@colyseus/schema';

export class PlayerState extends Schema {
  @type('string')
  id = '';

  @type('number')
  x = 320;

  @type('number')
  y = 240;
}

export class GameState extends Schema {
  @type({ map: PlayerState })
  players = new MapSchema<PlayerState>();
}
