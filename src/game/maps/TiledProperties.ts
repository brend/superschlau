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

export function getOptionalStringProperty(
  object: Phaser.Types.Tilemaps.TiledObject,
  name: string,
): string | undefined {
  const property = object.properties?.find(
    (candidate: { name: string }) => candidate.name === name,
  );

  if (property === undefined) {
    return undefined;
  }

  if (typeof property.value !== 'string') {
    throw new Error(`Property "${name}" on object "${object.name}" must be a string.`);
  }

  return property.value;
}
