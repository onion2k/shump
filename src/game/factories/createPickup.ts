import type { Entity } from '../ecs/components';
import { EntityType } from '../ecs/entityTypes';
import type { PlayerWeaponMode } from '../weapons/playerWeapons';

export function createPickup(
  x: number,
  y: number,
  kind: NonNullable<Entity['pickupKind']>,
  value: number,
  lifetimeMs = 8000,
  pickupWeaponMode?: PlayerWeaponMode
): Omit<Entity, 'id'> {
  return {
    type: EntityType.Pickup,
    position: { x, y },
    velocity: { x: 0, y: -1.5 },
    radius: 0.45,
    health: 1,
    maxHealth: 1,
    lifetimeMs,
    pickupKind: kind,
    pickupWeaponMode,
    pickupValue: value
  };
}
