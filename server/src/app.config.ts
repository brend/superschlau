import { defineServer, defineRoom } from 'colyseus';
import { GameRoom } from './rooms/GameRoom.js';

export const server = defineServer({
  rooms: {
    game: defineRoom(GameRoom),
  },
});

export default server;
