import type { Entity } from '../ecs/components';
import { EntityType } from '../ecs/entityTypes';

export function createLaserBeam(
  x: number,
  y: number,
  range: number,
  halfWidth: number,
  lifetimeMs: number
): Omit<Entity, 'id'> {
  return {
    type: EntityType.Bullet,
    position: { x, y },
    velocity: { x: 0, y: 0 },
    radius: halfWidth,
    health: 1,
    maxHealth: 1,
    lifetimeMs,
    damage: 0,
    projectileKind: 'laser',
    projectileSpeed: range
  };
}
