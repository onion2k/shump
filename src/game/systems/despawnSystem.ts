import type { EntityManager } from '../ecs/EntityManager';
import { WORLD_BOUNDS } from '../core/constants';
import { EntityType } from '../ecs/entityTypes';
import type { WorldBounds } from '../core/constants';
import type { Entity } from '../ecs/components';

export type DespawnReason = 'health' | 'bounds' | 'lifetime';

export interface DespawnedEntity {
  entity: Entity;
  reason: DespawnReason;
}

function getDespawnReason(entity: Entity, bounds: WorldBounds): DespawnReason | undefined {
  if (entity.health <= 0) {
    return 'health';
  }

  const outOfBounds =
    entity.position.x < bounds.left - 2 ||
    entity.position.x > bounds.right + 2 ||
    entity.position.y < bounds.bottom - 2 ||
    entity.position.y > bounds.top + 2;

  const isPlayer = entity.type === EntityType.Player;
  if (!isPlayer && outOfBounds) {
    return 'bounds';
  }

  if (!isPlayer && (entity.lifetimeMs ?? 1) <= 0) {
    return 'lifetime';
  }

  return undefined;
}

export function despawnSystem(
  entityManager: EntityManager,
  deltaSeconds: number,
  bounds: WorldBounds = WORLD_BOUNDS
): DespawnedEntity[] {
  const despawned: DespawnedEntity[] = [];

  for (const entity of entityManager.all()) {
    if (typeof entity.lifetimeMs === 'number') {
      entity.lifetimeMs -= deltaSeconds * 1000;
    }

    const reason = getDespawnReason(entity, bounds);
    if (reason) {
      despawned.push({
        entity: {
          ...entity,
          position: { ...entity.position },
          velocity: { ...entity.velocity }
        },
        reason
      });
      entityManager.remove(entity.id);
    }
  }

  return despawned;
}
