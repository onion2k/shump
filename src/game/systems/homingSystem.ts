import type { EntityManager } from '../ecs/EntityManager';
import { EntityType, Faction } from '../ecs/entityTypes';

export function homingSystem(entityManager: EntityManager, deltaSeconds: number) {
  const entities = entityManager.all();

  for (const entity of entities) {
    if (entity.type !== EntityType.Bullet || entity.projectileKind !== 'missile' || entity.faction !== Faction.Player) {
      continue;
    }

    const target = resolveTarget(entityManager, entity.position.x, entity.position.y, entity.homingTargetId);
    if (!target) {
      continue;
    }

    const speed = entity.projectileSpeed ?? (Math.hypot(entity.velocity.x, entity.velocity.y) || 1);
    const currentDir = normalize(entity.velocity.x, entity.velocity.y);
    const desiredDir = normalize(target.position.x - entity.position.x, target.position.y - entity.position.y);
    const blend = Math.min(1, (entity.homingTurnRate ?? 7) * deltaSeconds);
    const steered = normalize(
      currentDir.x * (1 - blend) + desiredDir.x * blend,
      currentDir.y * (1 - blend) + desiredDir.y * blend
    );

    entity.velocity.x = steered.x * speed;
    entity.velocity.y = steered.y * speed;
  }
}

function resolveTarget(entityManager: EntityManager, fromX: number, fromY: number, targetId: number | undefined) {
  const target = typeof targetId === 'number' ? entityManager.get(targetId) : undefined;
  if (target && target.type === EntityType.Enemy && target.health > 0) {
    return target;
  }

  let nearest: ReturnType<EntityManager['all']>[number] | undefined;
  let nearestDist = Number.POSITIVE_INFINITY;

  for (const entity of entityManager.all()) {
    if (entity.type !== EntityType.Enemy || entity.health <= 0) {
      continue;
    }

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
