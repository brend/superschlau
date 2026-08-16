import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
	constructor() {
		super('BootScene');
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
	}
}
