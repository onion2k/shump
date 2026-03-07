import type { EntityManager } from '../ecs/EntityManager';
import type { Entity } from '../ecs/components';
import { EntityType, Faction } from '../ecs/entityTypes';
import { createBullet } from '../factories/createBullet';
import { createField } from '../factories/createField';
import { createParticle } from '../factories/createParticle';
import { applyDamage } from './damageSystem';

function distanceSquared(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function nearestEnemy(entityManager: EntityManager, x: number, y: number): Entity | undefined {
  let nearest: Entity | undefined;
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

function spawnExplosionField(entityManager: EntityManager, source: Entity, kind: NonNullable<Entity['fieldKind']>): void {
  const field = entityManager.create(
    createField(source.position.x, source.position.y, kind, Faction.Player, {
      radius: source.splashRadius ?? 1,
      fieldRadius: source.splashRadius ?? 1,
      damage: Math.max(1, (source.damage ?? 1) * (kind === 'shrapnel-cloud' ? 0.45 : 0.8)),
      lifetimeMs: kind === 'gravity-well' ? 700 : 650,
      fieldStrength: kind === 'gravity-well' ? 14 : undefined,
      slowPercent: kind === 'gravity-well' ? 20 : undefined,
      ownerId: source.ownerId
    })
  );
  field.fieldVisualId = kind;
  const particleType = kind === 'gravity-well' ? 'gravity-swirl' : 'shrapnel-puff';
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2;
    entityManager.create(createParticle(source.position.x, source.position.y, Math.cos(angle) * 2.4, Math.sin(angle) * 2.4, particleType, 260, 0.05));
  }
}

function applyRadialDamage(entityManager: EntityManager, field: Entity, deltaSeconds: number): number {
  const radius = field.fieldRadius ?? field.radius;
  if (radius <= 0 || (field.damage ?? 0) <= 0) {
    return 0;
  }
  const radiusSq = radius * radius;
  let scoreDelta = 0;
  for (const entity of entityManager.values()) {
    if (entity.type !== EntityType.Enemy || entity.health <= 0) {
      continue;
    }
    if (distanceSquared(field.position.x, field.position.y, entity.position.x, entity.position.y) > radiusSq) {
      continue;
    }
    const before = entity.health;
    applyDamage(entity, Math.max(0.1, (field.damage ?? 0) * deltaSeconds));
    if (field.fieldKind === 'napalm-field') {
      entity.statusEffects = [
        ...(entity.statusEffects ?? []).filter((effect) => effect.effectId !== 'napalm-burn'),
        { effectId: 'napalm-burn', remainingMs: 900, stacks: Math.max(1, Math.round(field.damage ?? 1)) }
      ];
    }
    if (before > 0 && entity.health <= 0) {
      scoreDelta += entity.scoreValue ?? 0;
    }
  }
  return scoreDelta;
}

function applyGravityPull(entityManager: EntityManager, field: Entity, deltaSeconds: number): void {
  const radius = field.fieldRadius ?? 2;
  const strength = field.fieldStrength ?? 12;
  const radiusSq = radius * radius;
  for (const entity of entityManager.values()) {
    if (entity.health <= 0) {
      continue;
    }
    if (entity.type !== EntityType.Enemy && !(entity.type === EntityType.Bullet && entity.faction === Faction.Enemy)) {
      continue;
    }
    const dx = field.position.x - entity.position.x;
    const dy = field.position.y - entity.position.y;
    const distSq = dx * dx + dy * dy;
    if (distSq <= 0 || distSq > radiusSq) {
      continue;
    }
    const dist = Math.sqrt(distSq);
    const pull = Math.max(0.15, 1 - dist / radius) * strength * deltaSeconds;
    entity.velocity.x += (dx / dist) * pull;
    entity.velocity.y += (dy / dist) * pull;
    if (entity.type === EntityType.Enemy) {
      entity.statusEffects = [
        ...(entity.statusEffects ?? []).filter((effect) => effect.effectId !== 'gravity-pulled'),
        { effectId: 'gravity-pulled', remainingMs: 140, stacks: 1 }
      ];
    }
  }
}

function applyTimeSlow(entityManager: EntityManager, field: Entity): void {
  const radius = field.fieldRadius ?? 2;
  const slowPercent = field.slowPercent ?? 30;
  const radiusSq = radius * radius;
  const slowScale = Math.max(0.2, 1 - slowPercent / 100);
  for (const entity of entityManager.values()) {
    if (entity.health <= 0) {
      continue;
    }
    if (entity.type !== EntityType.Enemy && !(entity.type === EntityType.Bullet && entity.faction === Faction.Enemy)) {
      continue;
    }
    if (distanceSquared(field.position.x, field.position.y, entity.position.x, entity.position.y) > radiusSq) {
      continue;
    }
    entity.velocity.x *= slowScale;
    entity.velocity.y *= slowScale;
    if (entity.type === EntityType.Enemy) {
      entity.statusEffects = [
        ...(entity.statusEffects ?? []).filter((effect) => effect.effectId !== 'time-slowed'),
        { effectId: 'time-slowed', remainingMs: 160, stacks: 1 }
      ];
    }
  }
}

function tickDrones(entityManager: EntityManager, player: Entity, deltaSeconds: number): void {
  for (const drone of entityManager.values()) {
    if (drone.type !== EntityType.Drone || drone.ownerId !== player.id || drone.health <= 0) {
      continue;
    }

    drone.fireCooldownMs = (drone.fireCooldownMs ?? 0) - deltaSeconds * 1000;

    if (drone.droneKind === 'orbital-attack') {
      const angle = (drone.orbitAngle ?? 0) + (drone.orbitAngularSpeed ?? 1.4) * deltaSeconds;
      drone.orbitAngle = angle;
      const orbitRadius = drone.orbitRadius ?? 1.2;
      drone.position.x = player.position.x + Math.cos(angle) * orbitRadius;
      drone.position.y = player.position.y + 0.3 + Math.sin(angle) * orbitRadius * 0.65;
    } else {
      const anchorX = player.position.x - 0.9;
      const anchorY = player.position.y + 0.45;
      drone.position.x += (anchorX - drone.position.x) * Math.min(1, deltaSeconds * 9);
      drone.position.y += (anchorY - drone.position.y) * Math.min(1, deltaSeconds * 9);
    }

    if ((drone.fireCooldownMs ?? 0) > 0) {
      if (drone.droneKind === 'salvage') {
        for (const pickup of entityManager.values()) {
          if (pickup.type !== EntityType.Pickup) {
            continue;
          }
          const dx = drone.position.x - pickup.position.x;
          const dy = drone.position.y - pickup.position.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= 0 || dist > 6.2) {
            continue;
          }
          pickup.velocity.x += (dx / dist) * 26 * deltaSeconds;
          pickup.velocity.y += (dy / dist) * 26 * deltaSeconds;
        }
      }
      continue;
    }

    if (drone.droneKind === 'salvage') {
      drone.fireCooldownMs = 340;
      continue;
    }

    if (drone.droneKind === 'interceptor') {
      let intercepted = false;
      for (const bullet of entityManager.values()) {
        if (bullet.type !== EntityType.Bullet || bullet.faction !== Faction.Enemy || bullet.health <= 0) {
          continue;
        }
        if (distanceSquared(drone.position.x, drone.position.y, bullet.position.x, bullet.position.y) <= 16) {
          bullet.health = 0;
          intercepted = true;
          break;
        }
      }
      if (intercepted) {
        drone.fireCooldownMs = 180;
        continue;
      }
    }

    const target = nearestEnemy(entityManager, drone.position.x, drone.position.y);
    if (target) {
      const dx = target.position.x - drone.position.x;
      const dy = target.position.y - drone.position.y;
      const mag = Math.hypot(dx, dy) || 1;
      const speed = 22;
      const projectile = entityManager.create(
        createBullet(
          drone.position.x,
          drone.position.y,
          (dy / mag) * speed,
          Faction.Player,
          1300,
          Math.max(1, drone.damage ?? 1),
          0.13,
          (dx / mag) * speed
        )
      );
      projectile.projectileVisualId =
        drone.droneKind === 'attack'
          ? 'attack-drone-shot'
          : drone.droneKind === 'interceptor'
            ? 'interceptor-drone-shot'
            : drone.droneKind === 'orbital-attack'
              ? 'orbital-drone-shot'
              : 'salvage-drone-shot';
    }

    drone.fireCooldownMs = drone.droneKind === 'orbital-attack' ? 280 : 220;
  }
}

export function weaponEffectSystem(
  entityManager: EntityManager,
  playerId: number,
  deltaSeconds: number,
  elapsedMs: number
): number {
  const player = entityManager.get(playerId);
  if (!player) {
    return 0;
  }

  let scoreDelta = 0;

  for (const entity of entityManager.values()) {
    if (entity.type !== EntityType.Bullet || entity.health <= 0) {
      continue;
    }

    if (entity.sourceWeaponTag === 'flak-cannon-shell' && (entity.lifetimeMs ?? 0) < 220) {
      spawnExplosionField(entityManager, entity, 'shrapnel-cloud');
      entity.health = 0;
      continue;
    }

    if (entity.sourceWeaponTag === 'gravity-bomb' && (entity.lifetimeMs ?? 0) < 260) {
      spawnExplosionField(entityManager, entity, 'gravity-well');
      entity.health = 0;
      continue;
    }

    if (entity.sourceWeaponTag === 'proximity-mine') {
      entity.armDelayMs = (entity.armDelayMs ?? 0) - deltaSeconds * 1000;
      const armed = (entity.armDelayMs ?? 0) <= 0;
      if (!armed) {
        continue;
      }
      const triggerRadius = entity.triggerRadius ?? 1.2;
      const triggerRadiusSq = triggerRadius * triggerRadius;
      for (const enemy of entityManager.values()) {
        if (enemy.type !== EntityType.Enemy || enemy.health <= 0) {
          continue;
        }
        if (distanceSquared(entity.position.x, entity.position.y, enemy.position.x, enemy.position.y) <= triggerRadiusSq) {
          const field = entityManager.create(
            createField(entity.position.x, entity.position.y, 'shrapnel-cloud', Faction.Player, {
              radius: entity.splashRadius ?? 1.5,
              fieldRadius: entity.splashRadius ?? 1.5,
              damage: Math.max(1, (entity.damage ?? 1) * 1.1),
              lifetimeMs: 450,
              ownerId: player.id
            })
          );
          field.fieldVisualId = 'shrapnel-cloud';
          for (let i = 0; i < 8; i += 1) {
            const theta = (i / 8) * Math.PI * 2;
            entityManager.create(createParticle(entity.position.x, entity.position.y, Math.cos(theta) * 3, Math.sin(theta) * 3, 'mine-burst', 220, 0.045));
          }
          entity.health = 0;
          break;
        }
      }
    }
  }

  for (const field of entityManager.values()) {
    if (field.type !== EntityType.Field || field.health <= 0) {
      continue;
    }

    if (field.sourceWeaponTag === 'reflector-pulse') {
      const radius = field.fieldRadius ?? 2.3;
      const radiusSq = radius * radius;
      for (const bullet of entityManager.values()) {
        if (bullet.type !== EntityType.Bullet || bullet.faction !== Faction.Enemy || bullet.health <= 0) {
          continue;
        }
        if (distanceSquared(field.position.x, field.position.y, bullet.position.x, bullet.position.y) > radiusSq) {
          continue;
        }
        bullet.faction = Faction.Player;
        bullet.velocity.x *= -0.9;
        bullet.velocity.y *= -0.9;
      }
      field.health = 0;
      continue;
    }

    if (field.fieldKind === 'gravity-well') {
      applyGravityPull(entityManager, field, deltaSeconds);
      scoreDelta += applyRadialDamage(entityManager, field, deltaSeconds);
      if ((field.lifetimeMs ?? 0) <= 80) {
        const radius = Math.max(1, field.fieldRadius ?? 2);
        for (const enemy of entityManager.values()) {
          if (enemy.type !== EntityType.Enemy || enemy.health <= 0) {
            continue;
          }
          if (distanceSquared(field.position.x, field.position.y, enemy.position.x, enemy.position.y) > radius * radius) {
            continue;
          }
          const before = enemy.health;
          applyDamage(enemy, (field.damage ?? 1) * 2.2);
          if (before > 0 && enemy.health <= 0) {
            scoreDelta += enemy.scoreValue ?? 0;
          }
        }
      }
      continue;
    }

    if (field.fieldKind === 'time-distortion') {
      applyTimeSlow(entityManager, field);
      continue;
    }

    if (field.fieldKind === 'polygon-shredder') {
      const elapsedRatio = Math.min(1, (field.ageMs ?? 0) / Math.max(1, field.lifetimeMs ?? 1));
      field.fieldRadius = (field.fieldRadius ?? 1) * (0.4 + elapsedRatio);
      scoreDelta += applyRadialDamage(entityManager, field, deltaSeconds * 4);
      continue;
    }

    if (field.fieldKind === 'napalm-field' || field.fieldKind === 'shrapnel-cloud' || field.fieldKind === 'shield-barrier') {
      scoreDelta += applyRadialDamage(entityManager, field, deltaSeconds);
    }
  }

  tickDrones(entityManager, player, deltaSeconds);

  const napalmFields = Array.from(entityManager.values()).filter(
    (entity) => entity.type === EntityType.Field && entity.fieldKind === 'napalm-field' && entity.ownerId === player.id && entity.health > 0
  );
  if (napalmFields.length > 3) {
    napalmFields
      .sort((a, b) => (a.ageMs ?? 0) - (b.ageMs ?? 0))
      .slice(0, napalmFields.length - 3)
      .forEach((entity) => {
        entity.health = 0;
      });
  }

  void elapsedMs;
  return scoreDelta;
}
