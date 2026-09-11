import './style.css';
import { createGame } from './game/Game';
import { gameClient } from './game/network/network';

const playerIdStorageKey = 'superschlau-player-id';

let playerId = localStorage.getItem(playerIdStorageKey);

if (!playerId) {
  playerId = createPlayerId();
  localStorage.setItem(playerIdStorageKey, playerId);
}

const displayName = `Guest-${playerId.slice(0, 6).toUpperCase()}`;

createGame();

gameClient
  .connect({
    playerId,
    displayName,
  })
  .catch((error) => {
    console.error('Failed to connect to game server:', error);
  });

function createPlayerId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);

  crypto.getRandomValues(bytes);

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}
