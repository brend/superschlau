import Phaser from 'phaser';
import { Npc } from '../entities/Npc';
import { Sign } from '../entities/Sign';
import type { Interactable } from '../interactions/Interactable';
import { getOptionalStringProperty, getStringProperty } from './TiledProperties';

export interface CreatedMapEntity {
  interactable: Interactable;
  physicsObject?: Phaser.GameObjects.GameObject;
}

export function createMapEntity(
  scene: Phaser.Scene,
  object: Phaser.Types.Tilemaps.TiledObject,
): CreatedMapEntity {
  if (object.x === undefined || object.y === undefined) {
    throw new Error(`Object "${object.name}" has no position.`);
  }

  switch (object.type) {
    case 'npc': {
      const npc = new Npc(scene, object.x, object.y, {
        defaultMessage: getStringProperty(object, 'message'),
        setFlag: getOptionalStringProperty(object, 'setFlag'),
        startedFlag: getOptionalStringProperty(object, 'startedFlag'),
        startedMessage: getOptionalStringProperty(object, 'startedMessage'),
        completedFlag: getOptionalStringProperty(object, 'completedFlag'),
        completedMessage: getOptionalStringProperty(object, 'completedMessage'),
      });

      return {
        interactable: npc,
        physicsObject: npc.physicsObject,
      };
    }

    case 'sign': {
      const sign = new Sign(
        scene,
        object.x,
        object.y,
        getStringProperty(object, 'message'),
        getOptionalStringProperty(object, 'setFlag'),
      );

      return {
        interactable: sign,
      };
    }

    default:
      throw new Error(`Unsupported map object type "${object.type}".`);
  }
}
