import Phaser from 'phaser';
import { VirtualJoystick } from '../input/VirtualJoystick';
import { VirtualButton } from '../input/VirtualButton';
import type { MovementInput } from '../input/MovementInput';
import type { InputSource } from '../input/InputSource';

export class UIScene extends Phaser.Scene implements InputSource {
  private joystick!: VirtualJoystick;
  private interactButton!: VirtualButton;
  private dialogueText!: Phaser.GameObjects.Text;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    this.input.addPointer(2);

    this.joystick = new VirtualJoystick(this, 72, 408);

    this.interactButton = new VirtualButton(this, 568, 408, 32, 'A');

    this.dialogueText = this.add
      .text(320, 420, '', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: {
          x: 12,
          y: 8,
        },
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setVisible(false);

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('pagehide', this.handlePageHide);
  }

  getMovement(): MovementInput {
    return this.joystick.getMovement();
  }

  consumeInteractPress(): boolean {
    return this.interactButton.consumePress();
  }

  showDialogue(message: string): void {
    this.dialogueText.setText(message).setVisible(true);
  }

  hideDialogue(): void {
    this.dialogueText.setVisible(false);
  }

  resetInput(): void {
    this.joystick.reset();
    this.interactButton.reset();
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.resetInput();
    }
  };

  private handleBlur = (): void => {
    this.resetInput();
  };

  private handlePageHide = (): void => {
    this.resetInput();
  };

  private handleShutdown(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    window.removeEventListener('blur', this.handleBlur);

    this.joystick.destroy();
    this.interactButton.destroy();
  }
}
