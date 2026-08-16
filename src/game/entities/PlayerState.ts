export type FacingDirection = 'up' | 'down' | 'left' | 'right';

export interface PlayerState {
  facing: FacingDirection;
  isMoving: boolean;
}
