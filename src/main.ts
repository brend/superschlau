import './style.css';
import { createGame } from './game/Game';
import { gameClient } from './game/network/network';

createGame();

gameClient.connect().catch((error) => {
  console.error('Failed to connect to game server:', error);
});
