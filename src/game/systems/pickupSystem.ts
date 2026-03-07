import type { EntityManager } from '../ecs/EntityManager';
import { EntityType } from '../ecs/entityTypes';
import { distanceSquared } from '../util/math';
import {
  getPlayerWeaponMaxLevel,
  isPlayerWeaponMode,
  PLAYER_WEAPON_ORDER,
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
      const unlockedWeaponModes = player.unlockedWeaponModes ?? [];
      const lockedModes = PLAYER_WEAPON_ORDER.filter((mode) => !unlockedWeaponModes.includes(mode));
      const levels = player.weaponLevels ?? {};
      const currentMode = isPlayerWeaponMode(player.weaponMode ?? '') ? player.weaponMode : undefined;

      let selectedMode: PlayerWeaponMode | undefined;
      let unlockedThisPickup = false;
      if (pickupWeaponMode && isPlayerWeaponMode(pickupWeaponMode)) {
        selectedMode = pickupWeaponMode;
        if (!unlockedWeaponModes.includes(selectedMode)) {
          player.unlockedWeaponModes = PLAYER_WEAPON_ORDER.filter(
            (mode) => unlockedWeaponModes.includes(mode) || mode === selectedMode
          );
          unlockedThisPickup = true;
        }
      } else if (lockedModes.length > 0) {
        selectedMode = lockedModes[entity.id % lockedModes.length];
        player.unlockedWeaponModes = PLAYER_WEAPON_ORDER.filter(
          (mode) => unlockedWeaponModes.includes(mode) || mode === selectedMode
        );
        unlockedThisPickup = true;
      } else {
        selectedMode = isPlayerWeaponMode(player.weaponMode ?? '')
          ? (player.weaponMode as PlayerWeaponMode)
          : undefined;
      }

      if (selectedMode) {
        const currentLevel = levels[selectedMode] ?? 1;
        if (unlockedThisPickup) {
          levels[selectedMode] = Math.max(1, currentLevel);
        } else if (currentMode === selectedMode) {
          levels[selectedMode] = Math.min(getPlayerWeaponMaxLevel(selectedMode), currentLevel + Math.max(1, value));
        } else {
          levels[selectedMode] = Math.max(1, currentLevel);
        }
        player.weaponLevels = levels;
        if (currentMode === selectedMode) {
          player.weaponLevel = levels[selectedMode] ?? 1;
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
