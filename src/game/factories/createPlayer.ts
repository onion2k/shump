import type { Entity } from '../ecs/components';
import { EntityType, Faction } from '../ecs/entityTypes';
import { gameSettings } from '../config/gameSettings';
import { createDefaultUnlockedWeapons, createDefaultWeaponLevels } from '../weapons/playerWeapons';

export function createPlayer(): Omit<Entity, 'id'> {
  const shieldMax = Math.max(0, gameSettings.player.shield.max);
  const shieldStart = Math.max(0, Math.min(shieldMax, gameSettings.player.shield.start));

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
    weaponFireIntervalMs: gameSettings.player.weapon.fireIntervalMs,
    weaponLevels: createDefaultWeaponLevels(),
    unlockedWeaponModes: createDefaultUnlockedWeapons(),
    weaponOscillator: 0,
    moveMaxSpeed: Math.max(1, gameSettings.player.maxSpeed),
    moveFollowGain: Math.max(0, gameSettings.player.followGain),
    pickupAttractRange: Math.max(0, gameSettings.player.pickupAttraction.range),
    pickupAttractPower: Math.max(0, gameSettings.player.pickupAttraction.power),
    shieldCurrent: shieldStart,
    shieldMax,
    shieldRechargeDelayMs: Math.max(0, gameSettings.player.shield.rechargeDelayMs),
    shieldRechargeTimeMs: Math.max(1, gameSettings.player.shield.rechargeTimeMs),
    shieldRechargeDelayRemainingMs: 0,
    podCount: 0,
    podWeaponMode: 'Auto Pulse'
  };
}
