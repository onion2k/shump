import type { Entity } from '../ecs/components';
import { EntityType, Faction } from '../ecs/entityTypes';
import { gameSettings } from '../config/gameSettings';

export function createPlayer(): Omit<Entity, 'id'> {
  return {
    type: EntityType.Player,
    faction: Faction.Player,
    position: { x: gameSettings.player.spawn.x, y: gameSettings.player.spawn.y },
    velocity: { x: 0, y: 0 },
    radius: gameSettings.player.radius,
    health: gameSettings.player.health,
    maxHealth: gameSettings.player.health,
    fireCooldownMs: 0,
    weaponMode: gameSettings.player.weapon.mode,
    weaponLevel: gameSettings.player.weapon.level,
    weaponEnergy: gameSettings.player.weapon.energyStart,
    weaponEnergyMax: gameSettings.player.weapon.energyMax,
    weaponEnergyRegenPerSecond: gameSettings.player.weapon.energyRegenPerSecond,
    weaponEnergyCost: gameSettings.player.weapon.energyCost,
    weaponFireIntervalMs: gameSettings.player.weapon.fireIntervalMs
  };
}
