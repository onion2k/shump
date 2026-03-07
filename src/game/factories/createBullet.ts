import type { Entity } from '../ecs/components';
import { EntityType, Faction } from '../ecs/entityTypes';

export interface BulletMetadata {
  pierceRemaining?: number;
  ricochetRemaining?: number;
  splashRadius?: number;
  splitOnImpact?: boolean;
  splitSpec?: Entity['splitSpec'];
  sourceWeaponTag?: string;
  sourceCardIds?: string[];
}

export function createBullet(
  x: number,
  y: number,
  vy: number,
  faction: Faction,
  lifetimeMs = 2000,
  damage = 1,
  radius = 0.22,
  vx = 0,
  metadata: BulletMetadata = {}
): Omit<Entity, 'id'> {
  return {
    type: EntityType.Bullet,
    faction,
    position: { x, y },
    velocity: { x: vx, y: vy },
    radius,
    health: 1,
    maxHealth: 1,
    lifetimeMs,
    damage,
    projectileKind: 'standard',
    ...metadata
  };
}
