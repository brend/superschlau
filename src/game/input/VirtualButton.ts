import Phaser from 'phaser';

export class VirtualButton {
  private readonly circle: Phaser.GameObjects.Arc;
  private activePointerId: number | null = null;
  private justPressed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number, label: string) {
    this.circle = scene.add
      .circle(x, y, radius, 0xffffff, 0.25)
      .setStrokeStyle(2, 0xffffff, 0.6)
      .setScrollFactor(0);

    scene.add
      .text(x, y, label, {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.activePointerId !== null) {
        return;
      }

      const distance = Phaser.Math.Distance.Between(x, y, pointer.x, pointer.y);

      if (distance > radius * 1.4) {
        return;
      }

      this.activePointerId = pointer.id;
      this.justPressed = true;

      this.circle.setAlpha(0.5);
    });

    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.activePointerId) {
        return;
      }

      this.activePointerId = null;
      this.circle.setAlpha(1);
    });
  }

  consumePress(): boolean {
    if (!this.justPressed) {
      return false;
    }

    this.justPressed = false;
    return true;
  }
}
