import type { Entity } from '../ecs/components';
import { EntityType, Faction } from '../ecs/entityTypes';
import { PLAYER_MACHINE_GUN_INTERVAL_MS } from '../core/constants';

export function createPlayer(): Omit<Entity, 'id'> {
  return {
    type: EntityType.Player,
    faction: Faction.Player,
    position: { x: 0, y: -10 },
    velocity: { x: 0, y: 0 },
    radius: 0.6,
    health: 10,
    maxHealth: 10,
    fireCooldownMs: 0,
    weaponMode: 'Auto Pulse',
    weaponLevel: 1,
    weaponEnergy: 100,
    weaponEnergyMax: 100,
    weaponEnergyRegenPerSecond: 40,
    weaponEnergyCost: 4,
    weaponFireIntervalMs: PLAYER_MACHINE_GUN_INTERVAL_MS
  };
}
