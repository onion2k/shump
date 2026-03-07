import type { EntityManager } from '../ecs/EntityManager';
import type { Entity } from '../ecs/components';
import { EntityType, Faction } from '../ecs/entityTypes';

export function homingSystem(entityManager: EntityManager, deltaSeconds: number) {
  const enemies: Entity[] = [];
  const missiles: Entity[] = [];

  for (const entity of entityManager.values()) {
    if (entity.type === EntityType.Enemy && entity.health > 0) {
      enemies.push(entity);
      continue;
    }

    if (entity.type !== EntityType.Bullet || entity.projectileKind !== 'missile' || entity.faction !== Faction.Player) {
      continue;
    }
    missiles.push(entity);
  }

  for (const missile of missiles) {
    const target = resolveTarget(entityManager, enemies, missile.position.x, missile.position.y, missile.homingTargetId);
    if (!target) {
      continue;
    }

    const speed = missile.projectileSpeed ?? (Math.hypot(missile.velocity.x, missile.velocity.y) || 1);
    const currentDir = normalize(missile.velocity.x, missile.velocity.y);
    const desiredDir = normalize(target.position.x - missile.position.x, target.position.y - missile.position.y);
    const blend = Math.min(1, (missile.homingTurnRate ?? 7) * deltaSeconds);
    const steered = normalize(
      currentDir.x * (1 - blend) + desiredDir.x * blend,
      currentDir.y * (1 - blend) + desiredDir.y * blend
    );

    missile.velocity.x = steered.x * speed;
    missile.velocity.y = steered.y * speed;
  }
}

function resolveTarget(
  entityManager: EntityManager,
  enemies: Entity[],
  fromX: number,
  fromY: number,
  targetId: number | undefined
) {
  const target = typeof targetId === 'number' ? entityManager.get(targetId) : undefined;
  if (target && target.type === EntityType.Enemy && target.health > 0) {
    return target;
  }

  let nearest: Entity | undefined;
  let nearestDist = Number.POSITIVE_INFINITY;

  for (const entity of enemies) {
    const dx = entity.position.x - fromX;
    const dy = entity.position.y - fromY;
    const dist = dx * dx + dy * dy;
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = entity;
    }
  }

  return nearest;
}

function normalize(x: number, y: number): { x: number; y: number } {
  const mag = Math.hypot(x, y);
  if (mag === 0) {
    return { x: 0, y: 1 };
  }

  return { x: x / mag, y: y / mag };
}
