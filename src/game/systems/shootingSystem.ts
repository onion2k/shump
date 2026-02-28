import type { EntityManager } from '../ecs/EntityManager';
import { EntityType, Faction } from '../ecs/entityTypes';
import { BULLET_SPEED } from '../core/constants';
import { createBullet } from '../factories/createBullet';

export function shootingSystem(entityManager: EntityManager, deltaSeconds: number) {
  const entities = entityManager.all();

  for (const entity of entities) {
    if (typeof entity.fireCooldownMs !== 'number') {
      continue;
    }

    entity.fireCooldownMs -= deltaSeconds * 1000;
    if (entity.fireCooldownMs > 0) {
      continue;
    }

    if (entity.type === EntityType.Enemy) {
      entityManager.create(createBullet(entity.position.x, entity.position.y - 0.7, -BULLET_SPEED * 0.65, Faction.Enemy));
      entity.fireCooldownMs = 900;
    }
  }
}
