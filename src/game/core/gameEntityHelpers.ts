import type { Entity } from '../ecs/components';
import { EntityType } from '../ecs/entityTypes';

export function findNearestEnemy(entities: Entity[], x: number, y: number): Entity | undefined {
  let nearest: Entity | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const entity of entities) {
    if (entity.type !== EntityType.Enemy || entity.health <= 0) {
      continue;
    }

    const dx = entity.position.x - x;
    const dy = entity.position.y - y;
    const distance = dx * dx + dy * dy;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = entity;
    }
  }

  return nearest;
}

export function normalizeDirection(x: number, y: number) {
  const magnitude = Math.hypot(x, y);
  if (magnitude === 0) {
    return { x: 0, y: 1 };
  }

  return { x: x / magnitude, y: y / magnitude };
}
