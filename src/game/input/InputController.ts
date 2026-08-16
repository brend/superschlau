import Phaser from "phaser";
import type { MovementInput } from "./MovementInput";

export class InputController {
    private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;

    constructor(scene: Phaser.Scene) {
        if (!scene.input.keyboard) {
            throw new Error('Keyboard input is unavailable.');
        }

        this.cursors = scene.input.keyboard.createCursorKeys();
    }

    getMovement(): MovementInput {
        return {
            x: Number(this.cursors.right.isDown) - Number(this.cursors.left.isDown),
            y: Number(this.cursors.down.isDown) - Number(this.cursors.up.isDown),
        };
    }
}