import type { CollisionPair } from './collisionSystem';
import type { CardBonuses } from './cardEffectSystem';
import type { EntityManager } from '../ecs/EntityManager';
import type { Entity } from '../ecs/components';
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

const DELAYED_DETONATION_EFFECT_ID = 'delayed-detonation-armed';
const THERMAL_BURN_EFFECT_ID = 'thermal-rounds-burn';
const DRILL_BORE_EFFECT_ID = 'drill-rounds-bore';

export function runCardProjectilePrefireHooks(context: CardProjectilePrefireContext): CardRuntimeState {
  const player = context.entityManager.get(context.playerId);
  if (!player) {
    return context.runtimeState;
  }

  let runtimeState = context.runtimeState;
  const magneticRounds = context.bonuses.projectileModifierBonus['magnetic-rounds'] ?? 0;
  if (magneticRounds > 0) {
    const steerStrength = Math.max(0.02, Math.min(0.45, context.deltaSeconds * (2 + magneticRounds)));
    for (const entity of context.entityManager.all()) {
      if (entity.type !== EntityType.Bullet || entity.faction !== Faction.Player || entity.health <= 0) {
        continue;
      }
      if (entity.projectileKind !== 'standard') {
        continue;
      }
      const target = findNearestEnemyWithin(
        context.entityManager,
        entity.position.x,
        entity.position.y,
        4.8 + magneticRounds * 1.4
      );
      if (!target) {
        continue;
      }
      const speed = Math.hypot(entity.velocity.x, entity.velocity.y);
      if (speed <= 0) {
        continue;
      }
      const currentDir = normalizeDirection(entity.velocity.x, entity.velocity.y);
      const targetDir = normalizeDirection(target.position.x - entity.position.x, target.position.y - entity.position.y);
      const blended = normalizeDirection(
        currentDir.x * (1 - steerStrength) + targetDir.x * steerStrength,
        currentDir.y * (1 - steerStrength) + targetDir.y * steerStrength
      );
      entity.velocity.x = blended.x * speed;
      entity.velocity.y = blended.y * speed;
    }
  }

  const crossfireModule = context.bonuses.patternModifierBonus['crossfire-module'] ?? 0;
  if (crossfireModule > 0) {
    const nextAt = runtimeState.perCardProcCooldownUntilMs.get('pattern:crossfire-module') ?? 0;
    if (context.elapsedMs >= nextAt) {
      const speed = BULLET_SPEED * 0.9;
      const damage = Math.max(1, Math.round(1 + crossfireModule * 0.4));
      context.entityManager.create(createBullet(player.position.x, player.position.y + 0.62, 0, Faction.Player, 1300, damage, 0.18, speed));
      context.entityManager.create(createBullet(player.position.x, player.position.y + 0.62, 0, Faction.Player, 1300, damage, 0.18, -speed));
      runtimeState = withCooldown(
        runtimeState,
        'pattern:crossfire-module',
        context.elapsedMs + Math.max(320, 980 - crossfireModule * 120)
      );
    }
  }

  const rearTurret = context.bonuses.patternModifierBonus['rear-turret'] ?? 0;
  if (rearTurret > 0) {
    const nextAt = runtimeState.perCardProcCooldownUntilMs.get('pattern:rear-turret') ?? 0;
    if (context.elapsedMs >= nextAt) {
      const speed = BULLET_SPEED * 0.82;
      const damage = Math.max(1, Math.round(1 + rearTurret * 0.35));
      context.entityManager.create(createBullet(player.position.x, player.position.y + 0.48, -speed, Faction.Player, 1450, damage, 0.18, 0));
      runtimeState = withCooldown(
        runtimeState,
        'pattern:rear-turret',
        context.elapsedMs + Math.max(360, 1200 - rearTurret * 160)
      );
    }
  }

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

  const attackDrone = context.bonuses.droneModifierBonus['attack-drone'] ?? 0;
  if (attackDrone > 0) {
    const nextAt = runtimeState.perCardProcCooldownUntilMs.get('drone:attack-fire') ?? 0;
    if (context.elapsedMs >= nextAt) {
      const target = findNearestEnemy(context.entityManager, player.position.x, player.position.y);
      const direction = target
        ? normalizeDirection(target.position.x - player.position.x, target.position.y - player.position.y)
        : { x: 0, y: 1 };
      const speed = BULLET_SPEED * 0.84;
      context.entityManager.create(
        createBullet(
          player.position.x - 0.9,
          player.position.y + 0.42,
          direction.y * speed,
          Faction.Player,
          1700,
          Math.max(1, Math.round(1 + attackDrone * 0.4)),
          0.16,
          direction.x * speed
        )
      );
      runtimeState = withCooldown(runtimeState, 'drone:attack-fire', context.elapsedMs + Math.max(220, 680 - attackDrone * 70));
    }
  }

  const orbitalPlatform = context.bonuses.droneModifierBonus['orbital-gun-platform'] ?? 0;
  if (orbitalPlatform > 0) {
    const nextAt = runtimeState.perCardProcCooldownUntilMs.get('drone:orbital-fire') ?? 0;
    if (context.elapsedMs >= nextAt) {
      const angle = runtimeState.perCardProcCooldownUntilMs.get('drone:orbital-angle') ?? 0;
      const radius = 1.35;
      const spawnX = player.position.x + Math.cos(angle) * radius;
      const spawnY = player.position.y + Math.sin(angle) * radius * 0.7;
      const target = findNearestEnemy(context.entityManager, spawnX, spawnY);
      const direction = target
        ? normalizeDirection(target.position.x - spawnX, target.position.y - spawnY)
        : { x: 0, y: 1 };
      const speed = BULLET_SPEED * 0.9;
      context.entityManager.create(
        createBullet(
          spawnX,
          spawnY,
          direction.y * speed,
          Faction.Player,
          1800,
          Math.max(1, Math.round(1 + orbitalPlatform * 0.5)),
          0.17,
          direction.x * speed
        )
      );
      runtimeState = withCooldown(runtimeState, 'drone:orbital-angle', angle + 0.78);
      runtimeState = withCooldown(
        runtimeState,
        'drone:orbital-fire',
        context.elapsedMs + Math.max(240, 760 - orbitalPlatform * 120)
      );
    }
  }

  const interceptorDrone = context.bonuses.droneModifierBonus['interceptor-drone'] ?? 0;
  if (interceptorDrone > 0) {
    const nextAt = runtimeState.perCardProcCooldownUntilMs.get('drone:interceptor-fire') ?? 0;
    if (context.elapsedMs >= nextAt) {
      const projectile = findNearestEnemyProjectile(context.entityManager, player.position.x, player.position.y, 5.6);
      if (projectile) {
        projectile.health = 0;
      }
      runtimeState = withCooldown(
        runtimeState,
        'drone:interceptor-fire',
        context.elapsedMs + Math.max(220, 620 - interceptorDrone * 80)
      );
    }
  }

  return runtimeState;
}

export function runCardProjectilePostHitHooks(context: CardProjectilePostHitContext): CardProjectilePostHitResult {
  let runtimeState = context.runtimeState;
  const perTargetHitMap = new Map(runtimeState.perTargetHitMap);
  let scoreDelta = context.scoreDelta;
  let playerHits = 0;
  const chainReactionChance = Math.max(0, context.bonuses.triggerModifierBonus['chain-reaction'] ?? 0);
  const emergencyShieldBonus = Math.max(0, context.bonuses.defenseModifierBonus['emergency-shield'] ?? 0);
  const reactiveArmourBonus = Math.max(0, context.bonuses.defenseModifierBonus['reactive-armour'] ?? 0);
  const delayedDetonationBonus = Math.max(0, context.bonuses.missileModifierBonus['delayed-detonation'] ?? 0);
  const shockwaveBonus = Math.max(0, context.bonuses.missileModifierBonus['shockwave-payload'] ?? 0);
  const thermalRounds = Math.max(0, context.bonuses.projectileModifierBonus['thermal-rounds'] ?? 0);
  const drillRounds = Math.max(0, context.bonuses.projectileModifierBonus['drill-rounds'] ?? 0);
  const shockImpact = Math.max(0, context.bonuses.projectileModifierBonus['shock-impact'] ?? 0);
  const adaptiveTargeting = Math.max(0, context.bonuses.projectileModifierBonus['adaptive-targeting'] ?? 0);
  const targetLock = Math.max(0, context.bonuses.conditionalModifierBonus['target-lock'] ?? 0);
  const radialBloom = Math.max(0, context.bonuses.patternModifierBonus['radial-bloom'] ?? 0);

  scoreDelta += tickDelayedDetonationMissiles(context.entityManager, context.deltaSeconds, delayedDetonationBonus, shockwaveBonus);

  for (const pair of context.collisions) {
    const bullet = pair.a;
    const target = pair.b;
    if (target.id === context.playerId && bullet.faction === Faction.Enemy) {
      const incomingDamage = bullet.damage ?? 1;
      if (incomingDamage > 0 && emergencyShieldBonus > 0 && !hasStatusEffect(target, 'emergency-shield-active')) {
        addOrRefreshStatusEffect(target, 'emergency-shield-active', 550 + emergencyShieldBonus * 320);
      }
      if (incomingDamage > 0 && reactiveArmourBonus > 0) {
        const retaliateRadius = 1.5 + reactiveArmourBonus * 0.25;
        const retaliateDamage = Math.max(1, reactiveArmourBonus * 0.8);
        scoreDelta += applyAreaDamage(
          context.entityManager,
          target.position.x,
          target.position.y,
          retaliateRadius,
          retaliateDamage
        );
      }
      if (incomingDamage > 0 && runtimeState.chainKillStreak > 0) {
        runtimeState = { ...runtimeState, chainKillStreak: 0 };
      }
      continue;
    }

    if (bullet.faction !== Faction.Player || target.type !== EntityType.Enemy) {
      continue;
    }

    playerHits += 1;
    const bulletDamage = bullet.damage ?? 1;
    const targetHitCount = perTargetHitMap.get(target.id) ?? 0;
    if (adaptiveTargeting > 0 && targetHitCount > 0) {
      const adaptivePercent = Math.min(150, adaptiveTargeting * targetHitCount);
      const extraDamage = Math.max(1, (bulletDamage * adaptivePercent) / 100);
      applyDamage(target, extraDamage);
      if (target.health <= 0) {
        scoreDelta += target.scoreValue ?? 0;
      }
    }
    if (targetLock > 0 && targetHitCount > 0) {
      const targetLockPercent = Math.min(120, targetLock * targetHitCount);
      const extraDamage = Math.max(1, (bulletDamage * targetLockPercent) / 100);
      applyDamage(target, extraDamage);
      if (target.health <= 0) {
        scoreDelta += target.scoreValue ?? 0;
      }
    }
    perTargetHitMap.set(target.id, Math.min(30, targetHitCount + 1));

    if (thermalRounds > 0 && target.health > 0) {
      addOrRefreshStatusEffect(
        target,
        THERMAL_BURN_EFFECT_ID,
        1200 + thermalRounds * 260,
        Math.max(1, Math.round(thermalRounds))
      );
    }
    if (drillRounds > 0 && target.radius >= 0.75) {
      addOrRefreshStatusEffect(
        target,
        DRILL_BORE_EFFECT_ID,
        900 + drillRounds * 260,
        Math.max(1, Math.round(drillRounds))
      );
    }

    if (bullet.projectileKind === 'missile') {
      const shouldArmDelayedDetonation = delayedDetonationBonus > 0 && !hasStatusEffect(bullet, DELAYED_DETONATION_EFFECT_ID);
      if (shouldArmDelayedDetonation) {
        armMissileForDelayedDetonation(bullet, target.position.x, target.position.y, delayedDetonationBonus);
      } else {
        const missileExplosionRadius = resolveMissileExplosionRadius(bullet, delayedDetonationBonus, shockwaveBonus);
        if (missileExplosionRadius > 0) {
          scoreDelta += applyAreaDamage(
            context.entityManager,
            target.position.x,
            target.position.y,
            missileExplosionRadius,
            Math.max(1, bulletDamage * 0.6),
            target.id
          );
        }
        if (shockwaveBonus > 0) {
          applyShockwaveKnockback(context.entityManager, target.position.x, target.position.y, missileExplosionRadius, shockwaveBonus);
        }
        if (bullet.splitOnImpact && bullet.splitSpec) {
          spawnSplitProjectiles(context.entityManager, bullet, target.position.x, target.position.y);
          bullet.splitOnImpact = false;
        }
      }
    } else {
      const splashRadius = bullet.splashRadius ?? 0;
      if (splashRadius > 0) {
        scoreDelta += applyAreaDamage(
          context.entityManager,
          target.position.x,
          target.position.y,
          splashRadius,
          Math.max(1, bulletDamage * 0.45),
          target.id
        );
      }
      if (bullet.splitOnImpact && bullet.splitSpec) {
        spawnSplitProjectiles(context.entityManager, bullet, target.position.x, target.position.y);
        bullet.splitOnImpact = false;
      }
    }
    if (shockImpact > 0) {
      const impactRadius = 1 + shockImpact * 0.24;
      scoreDelta += applyAreaDamage(
        context.entityManager,
        target.position.x,
        target.position.y,
        impactRadius,
        Math.max(1, bulletDamage * 0.2 * shockImpact),
        target.id
      );
    }

    if (radialBloom > 0 && target.health <= 0) {
      spawnRadialBloomProjectiles(context.entityManager, target.position.x, target.position.y, radialBloom);
    }

    if (chainReactionChance > 0 && target.health <= 0) {
      const roll = runtimeState.rng.nextFloat('trigger:chain-reaction', target.id);
      if (roll <= Math.min(1, chainReactionChance / 100)) {
        scoreDelta += applyAreaDamage(
          context.entityManager,
          target.position.x,
          target.position.y,
          2.35,
          Math.max(1, bulletDamage * 0.7),
          target.id
        );
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
    runtimeState: {
      ...runtimeState,
      perTargetHitMap
    },
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
        Math.cos(angle) * speed,
        {
          splashRadius: bullet.projectileKind === 'missile' ? 1.1 : undefined
        }
      )
    );
  }
}

function findNearestEnemy(entityManager: EntityManager, x: number, y: number) {
  let nearest: ReturnType<EntityManager['all']>[number] | undefined;
  let nearestDist = Number.POSITIVE_INFINITY;
  for (const entity of entityManager.all()) {
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

function findNearestEnemyWithin(entityManager: EntityManager, x: number, y: number, maxDistance: number) {
  let nearest: ReturnType<EntityManager['all']>[number] | undefined;
  let nearestDist = maxDistance * maxDistance;
  for (const entity of entityManager.all()) {
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

function findNearestEnemyProjectile(entityManager: EntityManager, x: number, y: number, maxDistance: number) {
  let nearest: ReturnType<EntityManager['all']>[number] | undefined;
  let nearestDist = maxDistance * maxDistance;
  for (const entity of entityManager.all()) {
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

function tickDelayedDetonationMissiles(
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
  for (const entity of entityManager.all()) {
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

function armMissileForDelayedDetonation(
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

function resolveMissileExplosionRadius(missile: Entity, delayedDetonationBonus: number, shockwaveBonus: number): number {
  if ((missile.splashRadius ?? 0) > 0) {
    return missile.splashRadius ?? 0;
  }
  if (delayedDetonationBonus <= 0 && shockwaveBonus <= 0) {
    return 0;
  }
  return 1.9 + delayedDetonationBonus * 0.6 + shockwaveBonus * 0.22;
}

function applyAreaDamage(
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
  for (const entity of entityManager.all()) {
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

function applyShockwaveKnockback(
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
  for (const entity of entityManager.all()) {
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

function spawnRadialBloomProjectiles(entityManager: EntityManager, x: number, y: number, radialBloom: number): void {
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

function hasStatusEffect(entity: Entity, effectId: string): boolean {
  return (entity.statusEffects ?? []).some((effect) => effect.effectId === effectId);
}

function addOrRefreshStatusEffect(entity: Entity, effectId: string, remainingMs: number, stacks = 1): void {
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
