import type { EntityManager } from '../ecs/EntityManager';
import { EntityType } from '../ecs/entityTypes';
import { distanceSquared } from '../util/math';
import { isPlayerWeaponMode } from '../weapons/playerWeapons';

export interface PickupCollection {
  pickupId: number;
  pickupKind: string;
  pickupValue: number;
  pickupWeaponMode?: string;
  pickupCardId?: string;
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
    } else if (kind === 'weapon') {
      const pickupWeaponMode = entity.pickupWeaponMode;
      if (pickupWeaponMode && isPlayerWeaponMode(pickupWeaponMode)) {
        const unlockedWeaponModes = player.unlockedWeaponModes ?? [];
        if (!unlockedWeaponModes.includes(pickupWeaponMode)) {
          player.unlockedWeaponModes = [...unlockedWeaponModes, pickupWeaponMode];
        }

        const levels = player.weaponLevels ?? {};
        if (player.weaponMode === pickupWeaponMode) {
          const currentLevel = levels[pickupWeaponMode] ?? 1;
          levels[pickupWeaponMode] = currentLevel + Math.max(1, value);
        }
        player.weaponLevels = levels;
        player.weaponMode = pickupWeaponMode;
        player.weaponLevel = levels[pickupWeaponMode] ?? 1;
        player.fireCooldownMs = 0;
      }
    } else if (kind === 'money' || kind === 'card') {
      // Run-level progression systems consume these payloads in Game.update.
    } else {
      scoreDelta += value;
    }

    collections.push({
      pickupId: entity.id,
      pickupKind: kind,
      pickupValue: value,
      pickupWeaponMode: entity.pickupWeaponMode,
      pickupCardId: entity.pickupCardId
    });

    entityManager.remove(entity.id);
  }

  return { scoreDelta, collections };
}
