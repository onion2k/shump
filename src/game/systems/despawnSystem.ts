import type { EntityManager } from '../ecs/EntityManager';
import { WORLD_BOUNDS } from '../core/constants';

export function despawnSystem(entityManager: EntityManager, deltaSeconds: number) {
  for (const entity of entityManager.all()) {
    if (typeof entity.lifetimeMs === 'number') {
      entity.lifetimeMs -= deltaSeconds * 1000;
    }

    const outOfBounds =
      entity.position.x < WORLD_BOUNDS.left - 2 ||
      entity.position.x > WORLD_BOUNDS.right + 2 ||
      entity.position.y < WORLD_BOUNDS.bottom - 2 ||
      entity.position.y > WORLD_BOUNDS.top + 2;

    if (entity.health <= 0 || outOfBounds || (entity.lifetimeMs ?? 1) <= 0) {
      entityManager.remove(entity.id);
    }
  }
}
