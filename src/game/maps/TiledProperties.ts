import Phaser from 'phaser';

export function getStringProperty(object: Phaser.Types.Tilemaps.TiledObject, name: string): string {
  const property = object.properties?.find(
    (candidate: { name: string }) => candidate.name === name,
  );

  if (typeof property?.value !== 'string') {
    throw new Error(`Object "${object.name}" is missing string property "${name}".`);
  }

  return property.value;
}
