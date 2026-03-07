import type { Entity } from '../ecs/components';
import { EntityType, Faction } from '../ecs/entityTypes';

export interface MissileMetadata {
  pierceRemaining?: number;
  ricochetRemaining?: number;
  splashRadius?: number;
  splitOnImpact?: boolean;
  splitSpec?: Entity['splitSpec'];
  knockbackScale?: number;
  sourceWeaponTag?: string;
  sourceCardIds?: string[];
}

export interface CreateMissileOptions {
  radius?: number;
  damage?: number;
  lifetimeMs?: number;
  homingTurnRate?: number;
  metadata?: MissileMetadata;
}

export function createMissile(
  x: number,
  y: number,
  vx: number,
  vy: number,
  faction: Faction,
  targetId?: number,
  options: CreateMissileOptions = {}
): Omit<Entity, 'id'> {
  const radius = options.radius ?? 0.28;
  const damage = options.damage ?? 3;
  const lifetimeMs = options.lifetimeMs ?? 2600;
  const homingTurnRate = options.homingTurnRate ?? 7.5;
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
    projectileKind: 'missile',
    projectileSpeed: Math.hypot(vx, vy),
    homingTargetId: targetId,
    homingTurnRate,
    ...options.metadata
  };
}
