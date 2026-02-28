import type { Entity } from '../ecs/components';
import { EntityType, Faction } from '../ecs/entityTypes';

export function createBullet(
  x: number,
  y: number,
  vy: number,
  faction: Faction,
  lifetimeMs = 2000,
  damage = 1,
  radius = 0.22
): Omit<Entity, 'id'> {
  return {
    type: EntityType.Bullet,
    faction,
    position: { x, y },
    velocity: { x: 0, y: vy },
    radius,
    health: 1,
    maxHealth: 1,
    lifetimeMs,
    damage
  };
}
