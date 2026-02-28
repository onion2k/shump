import type { Entity } from '../ecs/components';
import { EntityType, Faction } from '../ecs/entityTypes';

export function createMissile(
  x: number,
  y: number,
  vx: number,
  vy: number,
  faction: Faction,
  targetId?: number
): Omit<Entity, 'id'> {
  return {
    type: EntityType.Bullet,
    faction,
    position: { x, y },
    velocity: { x: vx, y: vy },
    radius: 0.28,
    health: 1,
    maxHealth: 1,
    lifetimeMs: 2600,
    damage: 3,
    projectileKind: 'missile',
    projectileSpeed: Math.hypot(vx, vy),
    homingTargetId: targetId,
    homingTurnRate: 7.5
  };
}
