import { EntityType, Faction } from '../ecs/entityTypes';
import { BULLET_SPEED } from '../core/constants';
import { createBullet } from '../factories/createBullet';
import { normalizeDirection } from '../core/gameEntityHelpers';
import type { CardProjectilePrefireContext } from './cardProjectileTypes';
import {
  findNearestEnemy,
  findNearestEnemyProjectile,
  findNearestEnemyWithin,
  withCooldown
} from './cardProjectileHelpers';

export function runCardProjectilePrefireHooks(context: CardProjectilePrefireContext) {
  const player = context.entityManager.get(context.playerId);
  if (!player) {
    return context.runtimeState;
  }

  let runtimeState = context.runtimeState;
  const magneticRounds = context.bonuses.projectileModifierBonus['magnetic-rounds'] ?? 0;
  if (magneticRounds > 0) {
    const steerStrength = Math.max(0.02, Math.min(0.45, context.deltaSeconds * (2 + magneticRounds)));
    for (const entity of context.entityManager.values()) {
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
