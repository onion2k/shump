import type { Entity } from '../ecs/components';
import { EntityType } from '../ecs/entityTypes';
import { distanceSquared } from '../util/math';

export interface CollisionPair {
  a: Entity;
  b: Entity;
}

export function collisionSystem(entities: Entity[]): CollisionPair[] {
  const bullets = entities.filter((entity) => entity.type === EntityType.Bullet);
  const targets = entities.filter((entity) => entity.type !== EntityType.Bullet);
  const pairs: CollisionPair[] = [];

  for (const bullet of bullets) {
    for (const target of targets) {
      if (!bullet.faction || bullet.faction === target.faction) {
        continue;
      }

      const rr = (bullet.radius + target.radius) ** 2;
      if (distanceSquared(bullet.position.x, bullet.position.y, target.position.x, target.position.y) <= rr) {
        pairs.push({ a: bullet, b: target });
      }
    }
  }

  return pairs;
}
