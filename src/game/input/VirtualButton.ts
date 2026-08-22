import Phaser from 'phaser';

export class VirtualButton {
  private readonly scene: Phaser.Scene;
  private readonly circle: Phaser.GameObjects.Arc;
  private readonly label: Phaser.GameObjects.Text;
  private readonly x: number;
  private readonly y: number;
  private readonly radius: number;
  private activePointerId: number | null = null;
  private justPressed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number, label: string) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.radius = radius;

    this.circle = scene.add
      .circle(x, y, radius, 0xffffff, 0.25)
      .setStrokeStyle(2, 0xffffff, 0.6)
      .setScrollFactor(0);

    this.label = scene.add
      .text(x, y, label, {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    scene.input.on('pointerdown', this.handlePointerDown, this);

    scene.input.on('pointerup', this.handlePointerUp, this);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.activePointerId !== null) return;

    const distance = Phaser.Math.Distance.Between(this.x, this.y, pointer.x, pointer.y);

    if (distance > this.radius * 1.4) return;

    this.activePointerId = pointer.id;
    this.justPressed = true;
    this.circle.setAlpha(0.5);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return;

    this.activePointerId = null;
    this.circle.setAlpha(1);
  }

  consumePress(): boolean {
    if (!this.justPressed) {
      return false;
    }

    this.justPressed = false;
    return true;
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);

    this.scene.input.off('pointerup', this.handlePointerUp, this);

    this.circle.destroy();
    this.label.destroy();
  }
}
