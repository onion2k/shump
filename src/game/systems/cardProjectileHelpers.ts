import type { CollisionPair } from './collisionSystem';
import type { CardRuntimeState } from '../core/cardRuntimeState';
import type { EntityManager } from '../ecs/EntityManager';
import type { Entity } from '../ecs/components';
import { EntityType, Faction } from '../ecs/entityTypes';
import { BULLET_SPEED } from '../core/constants';
import { createBullet } from '../factories/createBullet';
import { applyDamage } from './damageSystem';
import { normalizeDirection } from '../core/gameEntityHelpers';

export const DELAYED_DETONATION_EFFECT_ID = 'delayed-detonation-armed';
export const THERMAL_BURN_EFFECT_ID = 'thermal-rounds-burn';
export const DRILL_BORE_EFFECT_ID = 'drill-rounds-bore';

export function withCooldown(runtimeState: CardRuntimeState, key: string, nextAtMs: number): CardRuntimeState {
  const nextCooldownMap = new Map(runtimeState.perCardProcCooldownUntilMs);
  nextCooldownMap.set(key, nextAtMs);
  return {
    ...runtimeState,
    perCardProcCooldownUntilMs: nextCooldownMap
  };
}

export function distanceSquared(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function spawnSplitProjectiles(entityManager: EntityManager, bullet: CollisionPair['a'], x: number, y: number): void {
  const spec = bullet.splitSpec;
  if (!spec || spec.childCount <= 0) {
    return;
  }

  const baseSpeed = Math.hypot(bullet.velocity.x, bullet.velocity.y) || BULLET_SPEED;
  const baseDirection = normalizeDirection(bullet.velocity.x, bullet.velocity.y);
  const baseAngle = Math.atan2(baseDirection.y, baseDirection.x);
  const spread = 0.9;
  for (let i = 0; i < spec.childCount; i += 1) {
    const t = spec.childCount === 1 ? 0 : i / (spec.childCount - 1);
    const angle = baseAngle + (t * 2 - 1) * spread * 0.5;
    const speed = baseSpeed * spec.speedScale;
    entityManager.create(
      createBullet(
        x,
        y,
        Math.sin(angle) * speed,
        Faction.Player,
        1100,
        Math.max(1, Math.round((bullet.damage ?? 1) * spec.damageScale)),
        0.14,
        Math.cos(angle) * speed,
        {
          splashRadius: bullet.projectileKind === 'missile' ? 1.1 : undefined
        }
      )
    );
  }
}

export function findNearestEnemy(entityManager: EntityManager, x: number, y: number) {
  let nearest: ReturnType<EntityManager['all']>[number] | undefined;
  let nearestDist = Number.POSITIVE_INFINITY;
  for (const entity of entityManager.values()) {
    if (entity.type !== EntityType.Enemy || entity.health <= 0) {
      continue;
    }
    const dist = distanceSquared(x, y, entity.position.x, entity.position.y);
    if (dist < nearestDist) {
      nearest = entity;
      nearestDist = dist;
    }
  }
  return nearest;
}

export function findNearestEnemyWithin(entityManager: EntityManager, x: number, y: number, maxDistance: number) {
  let nearest: ReturnType<EntityManager['all']>[number] | undefined;
  let nearestDist = maxDistance * maxDistance;
  for (const entity of entityManager.values()) {
    if (entity.type !== EntityType.Enemy || entity.health <= 0) {
      continue;
    }
    const dist = distanceSquared(x, y, entity.position.x, entity.position.y);
    if (dist < nearestDist) {
      nearest = entity;
      nearestDist = dist;
    }
  }
  return nearest;
}

export function findNearestEnemyProjectile(entityManager: EntityManager, x: number, y: number, maxDistance: number) {
  let nearest: ReturnType<EntityManager['all']>[number] | undefined;
  let nearestDist = maxDistance * maxDistance;
  for (const entity of entityManager.values()) {
    if (entity.type !== EntityType.Bullet || entity.faction !== Faction.Enemy || entity.health <= 0) {
      continue;
    }
    const dist = distanceSquared(x, y, entity.position.x, entity.position.y);
    if (dist < nearestDist) {
      nearest = entity;
      nearestDist = dist;
    }
  }
  return nearest;
}

export function tickDelayedDetonationMissiles(
  entityManager: EntityManager,
  deltaSeconds: number,
  delayedDetonationBonus: number,
  shockwaveBonus: number
): number {
  if (delayedDetonationBonus <= 0) {
    return 0;
  }

  let scoreDelta = 0;
  const deltaMs = deltaSeconds * 1000;
  for (const entity of entityManager.values()) {
    if (entity.type !== EntityType.Bullet || entity.projectileKind !== 'missile' || entity.health <= 0) {
      continue;
    }

    const status = entity.statusEffects?.find((effect) => effect.effectId === DELAYED_DETONATION_EFFECT_ID);
    if (!status) {
      continue;
    }

    status.remainingMs -= deltaMs;
    if (status.remainingMs > 0) {
      continue;
    }

    entity.statusEffects = (entity.statusEffects ?? []).filter((effect) => effect.effectId !== DELAYED_DETONATION_EFFECT_ID);
    const radius = resolveMissileExplosionRadius(entity, delayedDetonationBonus, shockwaveBonus);
    const splashDamage = Math.max(1, (entity.damage ?? 1) * 1.25);
    scoreDelta += applyAreaDamage(entityManager, entity.position.x, entity.position.y, radius, splashDamage);
    if (shockwaveBonus > 0) {
      applyShockwaveKnockback(entityManager, entity.position.x, entity.position.y, radius, shockwaveBonus);
    }
    if (entity.splitOnImpact && entity.splitSpec) {
      spawnSplitProjectiles(entityManager, entity, entity.position.x, entity.position.y);
      entity.splitOnImpact = false;
    }
    entity.health = 0;
  }

  return scoreDelta;
}

export function armMissileForDelayedDetonation(
  missile: CollisionPair['a'],
  impactX: number,
  impactY: number,
  delayedDetonationBonus: number
): void {
  const fuseMs = 240 + delayedDetonationBonus * 160;
  const currentStatus = missile.statusEffects ?? [];
  missile.statusEffects = [
    ...currentStatus,
    {
      effectId: DELAYED_DETONATION_EFFECT_ID,
      remainingMs: fuseMs
    }
  ];
  missile.position.x = impactX;
  missile.position.y = impactY;
  missile.velocity.x = 0;
  missile.velocity.y = 0;
  missile.faction = undefined;
  missile.homingTargetId = undefined;
  missile.splashRadius = Math.max(missile.splashRadius ?? 0, 2 + delayedDetonationBonus * 0.6);
  missile.lifetimeMs = Math.max(missile.lifetimeMs ?? 0, fuseMs + 120);
  missile.health = Math.max(1, missile.health);
}

export function resolveMissileExplosionRadius(missile: Entity, delayedDetonationBonus: number, shockwaveBonus: number): number {
  if ((missile.splashRadius ?? 0) > 0) {
    return missile.splashRadius ?? 0;
  }
  if (delayedDetonationBonus <= 0 && shockwaveBonus <= 0) {
    return 0;
  }
  return 1.9 + delayedDetonationBonus * 0.6 + shockwaveBonus * 0.22;
}

export function applyAreaDamage(
  entityManager: EntityManager,
  x: number,
  y: number,
  radius: number,
  damage: number,
  excludeEntityId?: number
): number {
  if (radius <= 0 || damage <= 0) {
    return 0;
  }

  let scoreDelta = 0;
  const radiusSquared = radius * radius;
  for (const entity of entityManager.values()) {
    if (entity.type !== EntityType.Enemy || entity.health <= 0 || entity.id === excludeEntityId) {
      continue;
    }
    if (distanceSquared(x, y, entity.position.x, entity.position.y) > radiusSquared) {
      continue;
    }
    applyDamage(entity, damage);
    if (entity.health <= 0) {
      scoreDelta += entity.scoreValue ?? 0;
    }
  }
  return scoreDelta;
}

export function applyShockwaveKnockback(
  entityManager: EntityManager,
  x: number,
  y: number,
  radius: number,
  shockwaveBonus: number
): void {
  if (shockwaveBonus <= 0 || radius <= 0) {
    return;
  }

  const radiusSquared = radius * radius;
  const force = 4 + shockwaveBonus * 1.8;
  for (const entity of entityManager.values()) {
    if (entity.type !== EntityType.Enemy || entity.health <= 0) {
      continue;
    }

    const dx = entity.position.x - x;
    const dy = entity.position.y - y;
    const distSquared = dx * dx + dy * dy;
    if (distSquared === 0 || distSquared > radiusSquared) {
      continue;
    }
    const dist = Math.sqrt(distSquared);
    const falloff = Math.max(0.2, 1 - dist / radius);
    const nx = dx / dist;
    const ny = dy / dist;
    entity.velocity.x += nx * force * falloff;
    entity.velocity.y += ny * force * falloff;
  }
}

export function spawnRadialBloomProjectiles(entityManager: EntityManager, x: number, y: number, radialBloom: number): void {
  const shotCount = 4 + Math.max(0, Math.round(radialBloom * 2));
  const speed = BULLET_SPEED * 0.7;
  const damage = Math.max(1, Math.round(0.6 + radialBloom * 0.45));
  for (let i = 0; i < shotCount; i += 1) {
    const angle = (i / shotCount) * Math.PI * 2;
    entityManager.create(
      createBullet(
        x,
        y,
        Math.sin(angle) * speed,
        Faction.Player,
        1000,
        damage,
        0.14,
        Math.cos(angle) * speed
      )
    );
  }
}

export function hasStatusEffect(entity: Entity, effectId: string): boolean {
  return (entity.statusEffects ?? []).some((effect) => effect.effectId === effectId);
}

export function addOrRefreshStatusEffect(entity: Entity, effectId: string, remainingMs: number, stacks = 1): void {
  const existing = entity.statusEffects?.find((effect) => effect.effectId === effectId);
  if (existing) {
    existing.remainingMs = Math.max(existing.remainingMs, remainingMs);
    existing.stacks = Math.min(12, Math.max(existing.stacks ?? 1, stacks));
    return;
  }

  const next = entity.statusEffects ? [...entity.statusEffects] : [];
  next.push({ effectId, remainingMs, stacks });
  entity.statusEffects = next;
}
