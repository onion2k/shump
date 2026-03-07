import type { EntityManager } from '../ecs/EntityManager';
import { EntityType, Faction } from '../ecs/entityTypes';
import { createBullet } from '../factories/createBullet';
import { applyDamage } from './damageSystem';

function distanceSquared(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function projectileInteractionSystem(entityManager: EntityManager, deltaSeconds: number): void {
  void deltaSeconds;

  const prismPickups = Array.from(entityManager.values()).filter(
    (entity) => entity.type === EntityType.Pickup && entity.pickupKind === 'prism' && entity.health > 0
  );
  const fields = Array.from(entityManager.values()).filter((entity) => entity.type === EntityType.Field && entity.health > 0);

  for (const enemy of entityManager.values()) {
    if (enemy.type !== EntityType.Enemy || enemy.health <= 0) {
      continue;
    }
    for (const field of fields) {
      if (field.fieldKind !== 'shield-barrier') {
        continue;
      }
      const radius = (field.fieldRadius ?? field.radius) + enemy.radius;
      if (distanceSquared(enemy.position.x, enemy.position.y, field.position.x, field.position.y) <= radius * radius) {
        applyDamage(enemy, Math.max(0.05, (field.damage ?? 0.5) * 0.05));
      }
    }
  }

  for (const bullet of entityManager.values()) {
    if (bullet.type !== EntityType.Bullet || bullet.health <= 0) {
      continue;
    }

    if (bullet.faction === Faction.Enemy) {
      for (const field of fields) {
        if (field.fieldKind !== 'shield-barrier') {
          continue;
        }
        const radius = (field.fieldRadius ?? field.radius) + bullet.radius;
        if (distanceSquared(bullet.position.x, bullet.position.y, field.position.x, field.position.y) <= radius * radius) {
          bullet.health = 0;
          break;
        }
      }
      continue;
    }

    for (const prism of prismPickups) {
      if (prism.health <= 0) {
        continue;
      }
      const radius = prism.radius + bullet.radius + 0.5;
      if (distanceSquared(bullet.position.x, bullet.position.y, prism.position.x, prism.position.y) > radius * radius) {
        continue;
      }
      const speed = Math.hypot(bullet.velocity.x, bullet.velocity.y) || 20;
      const baseAngle = Math.atan2(bullet.velocity.y, bullet.velocity.x);
      const angles = [-0.34, 0.34];
      for (const angleOffset of angles) {
        const angle = baseAngle + angleOffset;
        entityManager.create(
          createBullet(
            prism.position.x,
            prism.position.y,
            Math.sin(angle) * speed,
            Faction.Player,
            900,
            Math.max(1, Math.round((bullet.damage ?? 1) * 0.6)),
            0.12,
            Math.cos(angle) * speed
          )
        );
      }
      prism.health = 0;
      bullet.health = 0;
      break;
    }
  }
}
