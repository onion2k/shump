import type { EntityManager } from '../ecs/EntityManager';
import { EntityType } from '../ecs/entityTypes';
import { distanceSquared } from '../util/math';

export interface PickupCollection {
  pickupId: number;
  pickupKind: string;
  pickupValue: number;
}

export interface PickupResult {
  scoreDelta: number;
  collections: PickupCollection[];
}

export function pickupSystem(entityManager: EntityManager, playerId: number): PickupResult {
  const player = entityManager.get(playerId);
  if (!player) {
    return { scoreDelta: 0, collections: [] };
  }

  let scoreDelta = 0;
  const collections: PickupCollection[] = [];

  for (const entity of entityManager.all()) {
    if (entity.type !== EntityType.Pickup) {
      continue;
    }

    const rr = (player.radius + entity.radius) ** 2;
    if (distanceSquared(player.position.x, player.position.y, entity.position.x, entity.position.y) > rr) {
      continue;
    }

    const kind = entity.pickupKind ?? 'score';
    const value = entity.pickupValue ?? 0;

    if (kind === 'health') {
      player.health = Math.min(player.maxHealth, player.health + value);
    } else if (kind === 'energy') {
      const maxEnergy = player.weaponEnergyMax ?? 0;
      const currentEnergy = player.weaponEnergy ?? 0;
      player.weaponEnergy = Math.min(maxEnergy, currentEnergy + value);
    } else {
      scoreDelta += value;
    }

    collections.push({
      pickupId: entity.id,
      pickupKind: kind,
      pickupValue: value
    });

    entityManager.remove(entity.id);
  }

  return { scoreDelta, collections };
}
