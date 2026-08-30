import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TransitionDefinition {
  sourceMap: string;
  bounds: Bounds;
  targetMap: string;
  targetX: number;
  targetY: number;
}

export interface MapBounds {
  width: number;
  height: number;
}

export interface CollisionMap {
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  collides: boolean[];
}

interface TiledProperty {
  name: string;
  value?: unknown;
}

interface TiledObject {
  name: string;
  type: string;
  x?: unknown;
  y?: unknown;
  width?: unknown;
  height?: unknown;
  properties?: TiledProperty[] | null;
}

interface TiledLayer {
  name: string;
  width?: unknown;
  height?: unknown;
  data?: unknown;
  objects?: TiledObject[];
}

interface TiledMap {
  width?: unknown;
  height?: unknown;
  tilewidth?: unknown;
  tileheight?: unknown;
  tilesets: TiledTileset[];
  layers?: TiledLayer[];
}

interface TiledTilesetTile {
  id?: unknown;
  properties?: TiledProperty[] | null;
}

interface TiledTileset {
  firstgid?: unknown;
  tiles?: TiledTilesetTile[];
}

const MAP_DIRECTORY = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../..',
  'public/assets/maps',
);

export function loadTransitions(): Map<string, TransitionDefinition> {
  const mapObjects = loadMapObjects();
  const transitions = new Map<string, TransitionDefinition>();

  for (const [sourceMap, objects] of mapObjects) {
    for (const object of objects.filter((candidate) => candidate.type === 'transition')) {
      const transitionId = getStringProperty(sourceMap, object, 'transitionId');
      const targetMap = getStringProperty(sourceMap, object, 'targetMap');
      const targetSpawn = getStringProperty(sourceMap, object, 'targetSpawn');
      const targetObjects = mapObjects.get(targetMap);

      if (!targetObjects) {
        throw new Error(`Transition "${transitionId}" targets unknown map "${targetMap}".`);
      }

      if (transitions.has(transitionId)) {
        throw new Error(`Duplicate transitionId "${transitionId}".`);
      }

      const spawn = getPointObject(targetMap, targetObjects, targetSpawn);

      transitions.set(transitionId, {
        sourceMap,
        bounds: getBounds(sourceMap, object),
        targetMap,
        targetX: spawn.x,
        targetY: spawn.y,
      });
    }
  }

  return transitions;
}

function loadMapObjects(): Map<string, TiledObject[]> {
  const mapObjects = new Map<string, TiledObject[]>();
  const files = readdirSync(MAP_DIRECTORY)
    .filter((file) => file.endsWith('.json'))
    .sort();

  for (const file of files) {
    const mapKey = file.slice(0, -'.json'.length);
    const map = JSON.parse(readFileSync(join(MAP_DIRECTORY, file), 'utf-8')) as TiledMap;
    const objects = map.layers?.find((layer) => layer.name === 'Objects')?.objects;

    if (!objects) {
      throw new Error(`Map "${mapKey}" is missing an Objects layer.`);
    }

    mapObjects.set(mapKey, objects);
  }

  return mapObjects;
}

function getStringProperty(mapKey: string, object: TiledObject, name: string): string {
  const value = object.properties?.find((property) => property.name === name)?.value;

  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Object "${object.name}" in map "${mapKey}" is missing "${name}".`);
  }

  return value;
}

function getPointObject(
  mapKey: string,
  objects: TiledObject[],
  name: string,
): { x: number; y: number } {
  const object = objects.find((candidate) => candidate.name === name);

  if (!object || typeof object.x !== 'number' || typeof object.y !== 'number') {
    throw new Error(`Spawn "${name}" in map "${mapKey}" has invalid coordinates.`);
  }

  return { x: object.x, y: object.y };
}

function getBounds(mapKey: string, object: TiledObject): Bounds {
  if (
    typeof object.x !== 'number' ||
    typeof object.y !== 'number' ||
    typeof object.width !== 'number' ||
    typeof object.height !== 'number'
  ) {
    throw new Error(`Transition "${object.name}" in map "${mapKey}" has invalid bounds.`);
  }

  return { x: object.x, y: object.y, width: object.width, height: object.height };
}

export function loadMapBounds(): Map<string, MapBounds> {
  const bounds = new Map<string, MapBounds>();
  const files = readdirSync(MAP_DIRECTORY)
    .filter((file) => file.endsWith('.json'))
    .sort();

  for (const file of files) {
    const mapKey = file.slice(0, -'.json'.length);
    const map = JSON.parse(readFileSync(join(MAP_DIRECTORY, file), 'utf-8')) as TiledMap;

    if (
      typeof map.width !== 'number' ||
      typeof map.height !== 'number' ||
      typeof map.tilewidth !== 'number' ||
      typeof map.tileheight !== 'number'
    ) {
      throw new Error(`Map "${mapKey}" has invalid dimensions.`);
    }

    bounds.set(mapKey, {
      width: map.width * map.tilewidth,
      height: map.height * map.tileheight,
    });
  }

  return bounds;
}

export function loadCollisionMaps(): Map<string, CollisionMap> {
  const collisionMaps = new Map<string, CollisionMap>();
  const files = readdirSync(MAP_DIRECTORY)
    .filter((file) => file.endsWith('.json'))
    .sort();

  for (const file of files) {
    const mapKey = file.slice(0, -'.json'.length);
    const map = JSON.parse(readFileSync(join(MAP_DIRECTORY, file), 'utf-8')) as TiledMap;

    if (
      typeof map.width !== 'number' ||
      typeof map.height !== 'number' ||
      typeof map.tilewidth !== 'number' ||
      typeof map.tileheight !== 'number'
    ) {
      throw new Error(`Map "${mapKey}" has invalid dimensions.`);
    }

    const ground = map.layers?.find((layer) => layer.name === 'Ground');

    if (
      !ground ||
      typeof ground.width !== 'number' ||
      typeof ground.height !== 'number' ||
      !Array.isArray(ground.data)
    ) {
      throw new Error(`Map "${mapKey}" is missing a valid Ground tile layer.`);
    }

    if (ground.data.length !== ground.width * ground.height) {
      throw new Error(`Map "${mapKey}" Ground layer has invalid tile data length.`);
    }

    const collidingGids = getCollidingGids(mapKey, map);

    collisionMaps.set(mapKey, {
      width: ground.width,
      height: ground.height,
      tileWidth: map.tilewidth,
      tileHeight: map.tileheight,
      collides: ground.data.map((gid) => typeof gid === 'number' && collidingGids.has(gid)),
    });
  }

  return collisionMaps;
}

function getCollidingGids(mapKey: string, map: TiledMap): Set<number> {
  const gids = new Set<number>();

  for (const tileset of map.tilesets ?? []) {
    if (typeof tileset.firstgid !== 'number') {
      throw new Error(`Map "${mapKey}" has a tileset with an invalid firstgid.`);
    }

    for (const tile of tileset.tiles ?? []) {
      if (typeof tile.id !== 'number') {
        continue;
      }

      const collides = tile.properties?.some(
        (property) => property.name === 'collides' && property.value === true,
      );

      if (collides) {
        gids.add(tileset.firstgid + tile.id);
      }
    }
  }

  return gids;
}

export function rectangleOverlapsCollision(
  collisionMap: CollisionMap,
  rectangle: Rectangle,
): boolean {
  const leftTile = clamp(
    Math.floor(rectangle.x / collisionMap.tileWidth),
    0,
    collisionMap.width - 1,
  );
  const rightTile = clamp(
    Math.floor((rectangle.x + rectangle.width - 0.001) / collisionMap.tileWidth),
    0,
    collisionMap.width - 1,
  );

  const topTile = clamp(
    Math.floor(rectangle.y / collisionMap.tileHeight),
    0,
    collisionMap.height - 1,
  );
  const bottomTile = clamp(
    Math.floor((rectangle.y + rectangle.height - 0.001) / collisionMap.tileHeight),
    0,
    collisionMap.height - 1,
  );

  for (let tileY = topTile; tileY <= bottomTile; tileY += 1) {
    for (let tileX = leftTile; tileX <= rightTile; tileX += 1) {
      const index = tileY * collisionMap.width + tileX;

      if (collisionMap.collides[index]) {
        return true;
      }
    }
  }

  return false;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
