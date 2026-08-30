export interface MapTransition {
  id: string;
  bounds: Phaser.Geom.Rectangle;
  targetMap: string;
  targetSpawn: string;
}
