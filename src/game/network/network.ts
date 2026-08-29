import { GameClient } from './GameClient';

const endpoint = `http://${window.location.hostname}:2567`;

export const gameClient = new GameClient(endpoint);
