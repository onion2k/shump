import type { EntityManager } from '../ecs/EntityManager';
import { EntityType, Faction } from '../ecs/entityTypes';
import { BULLET_SPEED } from '../core/constants';
import { createBullet } from '../factories/createBullet';
import { gameSettings } from '../config/gameSettings';

export function shootingSystem(entityManager: EntityManager, deltaSeconds: number) {
  const entities = entityManager.all();

  for (const entity of entities) {
    if (entity.type !== EntityType.Enemy) {
      continue;
    }

    if (typeof entity.fireCooldownMs !== 'number') {
      continue;
    }

    entity.fireCooldownMs -= deltaSeconds * 1000;
    if (entity.fireCooldownMs > 0) {
      continue;
    }

    entityManager.create(
      createBullet(
        entity.position.x,
        entity.position.y - 0.7,
        -BULLET_SPEED * gameSettings.combat.enemyBulletSpeedMultiplier,
        Faction.Enemy
      )
    );
    entity.fireCooldownMs = gameSettings.enemy.fireIntervalMs;
  }
}
