import type { EntityManager } from '../ecs/EntityManager';
import { WORLD_BOUNDS } from '../core/constants';
import { EntityType } from '../ecs/entityTypes';
import type { WorldBounds } from '../core/constants';

export function despawnSystem(entityManager: EntityManager, deltaSeconds: number, bounds: WorldBounds = WORLD_BOUNDS) {
  for (const entity of entityManager.all()) {
    if (typeof entity.lifetimeMs === 'number') {
      entity.lifetimeMs -= deltaSeconds * 1000;
    }

    const outOfBounds =
      entity.position.x < bounds.left - 2 ||
      entity.position.x > bounds.right + 2 ||
      entity.position.y < bounds.bottom - 2 ||
      entity.position.y > bounds.top + 2;

    const isPlayer = entity.type === EntityType.Player;
    const shouldDespawnForBounds = !isPlayer && outOfBounds;
    const shouldDespawnForLifetime = !isPlayer && (entity.lifetimeMs ?? 1) <= 0;
    const shouldDespawnForHealth = entity.health <= 0;

    if (shouldDespawnForHealth || shouldDespawnForBounds || shouldDespawnForLifetime) {
      entityManager.remove(entity.id);
    }
  }
}
