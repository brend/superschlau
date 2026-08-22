import Phaser from "phaser";
import type { Interactable } from "../interactions/Interactable";

export class Npc implements Interactable {
    private readonly gameObject: Phaser.GameObjects.Rectangle & {
        body: Phaser.Physics.Arcade.Body;
    }

    readonly interactionBounds: Phaser.Geom.Rectangle;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
    ) {
        const gameObject = scene.add.rectangle(
            x,
            y,
            24,
            24,
            0x4da6ff,
        );

        scene.physics.add.existing(gameObject, true);

        this.gameObject = gameObject as Phaser.GameObjects.Rectangle & {
            body: Phaser.Physics.Arcade.Body;
        };

        this.interactionBounds = new Phaser.Geom.Rectangle(
            x - 20,
            y - 20,
            40, 40,
        );
    }

    get physicsObject(): Phaser.GameObjects.Rectangle {
        return this.gameObject;
    }

    interact(): string {
        return 'Hello! Nice weather today.';
    }
}