import type { EntityManager } from '../ecs/EntityManager';
import { EntityType } from '../ecs/entityTypes';
import { distanceSquared } from '../util/math';
import {
  getPlayerWeaponMinimumLevel,
  getPlayerWeaponMaxLevel,
  isPlayerWeaponMode,
  type PlayerWeaponMode
} from '../weapons/playerWeapons';

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

  for (const entity of entityManager.values()) {
    if (entity.type !== EntityType.Pickup) {
      continue;
    }

    const rr = (player.radius + entity.radius) ** 2;
    if (distanceSquared(player.position.x, player.position.y, entity.position.x, entity.position.y) > rr) {
      continue;
    }

    const kind = entity.pickupKind ?? 'score';
    const value = entity.pickupValue ?? 0;

    if (kind === 'prism') {
      continue;
    }

    if (kind === 'health') {
      player.health = Math.min(player.maxHealth, player.health + value);
    } else if (kind === 'energy') {
      const maxEnergy = player.weaponEnergyMax ?? 0;
      const currentEnergy = player.weaponEnergy ?? 0;
      player.weaponEnergy = Math.min(maxEnergy, currentEnergy + value);
    } else if (kind === 'weapon') {
      const pickupWeaponMode = entity.pickupWeaponMode;
      const levels = player.weaponLevels ?? {};
      const currentMode = isPlayerWeaponMode(player.weaponMode ?? '') ? (player.weaponMode as PlayerWeaponMode) : undefined;

      let selectedMode: PlayerWeaponMode | undefined;
      if (pickupWeaponMode && isPlayerWeaponMode(pickupWeaponMode)) {
        selectedMode = pickupWeaponMode;
      } else {
        selectedMode = currentMode;
      }

      if (selectedMode) {
        const minLevel = getPlayerWeaponMinimumLevel(selectedMode);
        const currentLevel = levels[selectedMode] ?? minLevel;
        if (currentMode === selectedMode && currentLevel >= 1) {
          levels[selectedMode] = Math.min(getPlayerWeaponMaxLevel(selectedMode), currentLevel + Math.max(1, value));
        } else {
          levels[selectedMode] = Math.max(minLevel, currentLevel);
        }
        player.weaponLevels = levels;
        if (currentMode === selectedMode) {
          player.weaponLevel = levels[selectedMode] ?? minLevel;
          player.fireCooldownMs = 0;
        }
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
