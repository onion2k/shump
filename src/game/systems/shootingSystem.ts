import type { EntityManager } from '../ecs/EntityManager';
import { EntityType, Faction } from '../ecs/entityTypes';
import { BULLET_SPEED } from '../core/constants';
import { createBullet } from '../factories/createBullet';
import { gameSettings } from '../config/gameSettings';
import type { EnemyArchetypeId } from '../content/enemyArchetypes';

const AIMED_FIRE_ARCHETYPES = new Set<EnemyArchetypeId>(['sniper', 'sentinel', 'bastion']);

export function shootingSystem(entityManager: EntityManager, deltaSeconds: number) {
  const player = entityManager.all().find((entity) => entity.type === EntityType.Player);
  const enemyBulletSpeed = BULLET_SPEED * gameSettings.combat.enemyBulletSpeedMultiplier;

  for (const entity of entityManager.values()) {
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

    const bulletX = entity.position.x;
    const bulletY = entity.position.y - 0.7;
    let bulletVx = 0;
    let bulletVy = -enemyBulletSpeed;
    const enemyArchetype = entity.enemyArchetype;
    if (player && enemyArchetype && AIMED_FIRE_ARCHETYPES.has(enemyArchetype)) {
      const dx = player.position.x - bulletX;
      const dy = player.position.y - bulletY;
      const distance = Math.hypot(dx, dy);
      if (distance > 0.001) {
        bulletVx = (dx / distance) * enemyBulletSpeed;
        bulletVy = (dy / distance) * enemyBulletSpeed;
      }
    }

    entityManager.create(
      createBullet(bulletX, bulletY, bulletVy, Faction.Enemy, 2000, 1, 0.22, bulletVx)
    );
    entity.fireCooldownMs = entity.enemyFireIntervalMs ?? gameSettings.enemy.fireIntervalMs;
  }
}
