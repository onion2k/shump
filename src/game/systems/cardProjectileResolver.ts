import type { CollisionPair } from './collisionSystem';
import type { CardBonuses } from './cardEffectSystem';
import type { EntityManager } from '../ecs/EntityManager';
import type { CardRuntimeState } from '../core/cardRuntimeState';
import { EntityType, Faction } from '../ecs/entityTypes';
import { BULLET_SPEED } from '../core/constants';
import { createBullet } from '../factories/createBullet';
import { applyDamage } from './damageSystem';
import { normalizeDirection } from '../core/gameEntityHelpers';

export interface CardProjectilePrefireContext {
  entityManager: EntityManager;
  playerId: number;
  deltaSeconds: number;
  elapsedMs: number;
  bonuses: CardBonuses;
  runtimeState: CardRuntimeState;
}

export interface CardProjectilePostHitContext {
  entityManager: EntityManager;
  playerId: number;
  collisions: CollisionPair[];
  scoreDelta: number;
  deltaSeconds: number;
  elapsedMs: number;
  bonuses: CardBonuses;
  runtimeState: CardRuntimeState;
}

export interface CardProjectilePostHitResult {
  runtimeState: CardRuntimeState;
  scoreDelta: number;
}

export function runCardProjectilePrefireHooks(context: CardProjectilePrefireContext): CardRuntimeState {
  const player = context.entityManager.get(context.playerId);
  if (!player) {
    return context.runtimeState;
  }

  let runtimeState = context.runtimeState;
  const pulseDischarge = context.bonuses.patternModifierBonus['pulse-discharge'] ?? 0;
  if (pulseDischarge > 0) {
    const nextAt = runtimeState.perCardProcCooldownUntilMs.get('pattern:pulse-discharge') ?? 0;
    if (context.elapsedMs >= nextAt) {
      const shotCount = 8 + Math.max(0, Math.round(pulseDischarge * 2));
      const speed = BULLET_SPEED * 0.78;
      for (let i = 0; i < shotCount; i += 1) {
        const angle = (i / shotCount) * Math.PI * 2;
        context.entityManager.create(
          createBullet(
            player.position.x,
            player.position.y + 0.62,
            Math.sin(angle) * speed,
            Faction.Player,
            1200,
            1,
            0.16,
            Math.cos(angle) * speed
          )
        );
      }
      runtimeState = withCooldown(runtimeState, 'pattern:pulse-discharge', context.elapsedMs + 2500);
    }
  }

  const vectorScatter = context.bonuses.patternModifierBonus['vector-scatter'] ?? 0;
  if (vectorScatter > 0) {
    const nextAt = runtimeState.perCardProcCooldownUntilMs.get('pattern:vector-scatter') ?? 0;
    if (context.elapsedMs >= nextAt) {
      const speed = BULLET_SPEED * 0.95;
      context.entityManager.create(
        createBullet(player.position.x, player.position.y + 0.6, speed * 0.86, Faction.Player, 1500, 1, 0.16, speed * 0.66)
      );
      context.entityManager.create(
        createBullet(player.position.x, player.position.y + 0.6, speed * 0.86, Faction.Player, 1500, 1, 0.16, -speed * 0.66)
      );
      const cooldownMs = Math.max(420, 900 - vectorScatter * 60);
      runtimeState = withCooldown(runtimeState, 'pattern:vector-scatter', context.elapsedMs + cooldownMs);
    }
  }

  return runtimeState;
}

export function runCardProjectilePostHitHooks(context: CardProjectilePostHitContext): CardProjectilePostHitResult {
  let runtimeState = context.runtimeState;
  let scoreDelta = context.scoreDelta;
  let playerHits = 0;
  const chainReactionChance = Math.max(0, context.bonuses.triggerModifierBonus['chain-reaction'] ?? 0);

  for (const pair of context.collisions) {
    const bullet = pair.a;
    const target = pair.b;
    if (bullet.faction !== Faction.Player || target.type !== EntityType.Enemy) {
      continue;
    }

    playerHits += 1;
    const bulletDamage = bullet.damage ?? 1;
    const splashRadius = bullet.splashRadius ?? 0;
    if (splashRadius > 0) {
      const splashDamage = Math.max(1, bulletDamage * 0.45);
      for (const entity of context.entityManager.all()) {
        if (entity.type !== EntityType.Enemy || entity.id === target.id || entity.health <= 0) {
          continue;
        }
        if (distanceSquared(target.position.x, target.position.y, entity.position.x, entity.position.y) > splashRadius * splashRadius) {
          continue;
        }
        applyDamage(entity, splashDamage);
        if (entity.health <= 0) {
          scoreDelta += entity.scoreValue ?? 0;
        }
      }
    }

    if (bullet.splitOnImpact && bullet.splitSpec) {
      spawnSplitProjectiles(context.entityManager, bullet, target.position.x, target.position.y);
      bullet.splitOnImpact = false;
    }

    if (chainReactionChance > 0 && target.health <= 0) {
      const roll = runtimeState.rng.nextFloat('trigger:chain-reaction', target.id);
      if (roll <= Math.min(1, chainReactionChance / 100)) {
        for (const entity of context.entityManager.all()) {
          if (entity.type !== EntityType.Enemy || entity.id === target.id || entity.health <= 0) {
            continue;
          }
          if (distanceSquared(target.position.x, target.position.y, entity.position.x, entity.position.y) > 2.35 ** 2) {
            continue;
          }
          applyDamage(entity, Math.max(1, bulletDamage * 0.7));
          if (entity.health <= 0) {
            scoreDelta += entity.scoreValue ?? 0;
          }
        }
      }
    }
  }

  const kineticEscalation = context.bonuses.weaponAmplifierBonus['kinetic-escalation'] ?? 0;
  if (kineticEscalation > 0) {
    const lastShotAtMs = runtimeState.perCardProcCooldownUntilMs.get('__last-shot-ms') ?? Number.NEGATIVE_INFINITY;
    const firedThisFrame = lastShotAtMs > context.elapsedMs - context.deltaSeconds * 1000 - 1;
    if (playerHits > 0) {
      runtimeState = { ...runtimeState, hitStreak: Math.min(40, runtimeState.hitStreak + playerHits) };
    } else if (firedThisFrame) {
      runtimeState = { ...runtimeState, hitStreak: 0 };
    }
  }

  return {
    runtimeState,
    scoreDelta
  };
}

function withCooldown(runtimeState: CardRuntimeState, key: string, nextAtMs: number): CardRuntimeState {
  const nextCooldownMap = new Map(runtimeState.perCardProcCooldownUntilMs);
  nextCooldownMap.set(key, nextAtMs);
  return {
    ...runtimeState,
    perCardProcCooldownUntilMs: nextCooldownMap
  };
}

function distanceSquared(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function spawnSplitProjectiles(entityManager: EntityManager, bullet: CollisionPair['a'], x: number, y: number): void {
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
        Math.cos(angle) * speed
      )
    );
  }
}
