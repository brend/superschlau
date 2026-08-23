import type { MovementInput } from './MovementInput';

export interface InputSource {
  getMovement(): MovementInput;
  consumeInteractPress(): boolean;
}
