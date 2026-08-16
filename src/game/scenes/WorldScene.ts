import Phaser from 'phaser';
import { InputController } from '../input/InputController';
import { Player } from '../entities/Player';

export class WorldScene extends Phaser.Scene {
	private player!: Player;
	private inputController!: InputController;

	constructor() {
		super('WorldScene');
	}

	preload(): void {
		this.load.image('test-tiles', '/assets/tiles/test-tiles.png');

		this.load.tilemapTiledJSON(
			'test-map',
			'/assets/maps/test-map.json'
		);
	}

	create(): void {
		const map = this.make.tilemap({
			key: 'test-map',
		});

		const tileset = map.addTilesetImage(
			'test-tiles',
			'test-tiles'
		);

		if (!tileset) {
			throw new Error('Tileset could not be created.');
		}

		const ground = map.createLayer(
			'Ground',
			tileset,
			0,
			0
		);

		if (!ground) {
			throw new Error('Ground layer could not be created.');
		}

		ground.setCollisionByProperty({
			collides: true,
		});

		this.player = new Player(this, 320, 240);
		this.inputController = new InputController(this);
	}

	update(_time: number, delta: number): void {
		const movement = this.inputController.getMovement();

		this.player.update(movement, delta);
	}
}
