import type { Entity } from '../ecs/components';
import { EntityType } from '../ecs/entityTypes';
import { distanceSquared } from '../util/math';

export interface CollisionPair {
  a: Entity;
  b: Entity;
}

const COLLISION_CELL_SIZE = 1.5;

function cellFor(value: number): number {
  return Math.floor(value / COLLISION_CELL_SIZE);
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function collisionSystem(entities: Iterable<Entity>): CollisionPair[] {
  const bullets: Entity[] = [];
  const targets: Entity[] = [];
  const pairs: CollisionPair[] = [];
  let maxTargetRadius = 0;

  for (const entity of entities) {
    if (entity.type === EntityType.Bullet) {
      bullets.push(entity);
      continue;
    }

    if (entity.type === EntityType.Player || entity.type === EntityType.Enemy) {
      targets.push(entity);
      if (entity.radius > maxTargetRadius) {
        maxTargetRadius = entity.radius;
      }
    }
  }

  if (bullets.length === 0 || targets.length === 0) {
    return pairs;
  }

  const targetGrid = new Map<string, Entity[]>();
  for (const target of targets) {
    const key = cellKey(cellFor(target.position.x), cellFor(target.position.y));
    const bucket = targetGrid.get(key);
    if (bucket) {
      bucket.push(target);
      continue;
    }
    targetGrid.set(key, [target]);
  }

  for (const bullet of bullets) {
    if (bullet.projectileKind === 'laser' || !bullet.faction) {
      continue;
    }

    const radiusScan = Math.max(1, Math.ceil((bullet.radius + maxTargetRadius) / COLLISION_CELL_SIZE));
    const bulletCellX = cellFor(bullet.position.x);
    const bulletCellY = cellFor(bullet.position.y);

    for (let y = bulletCellY - radiusScan; y <= bulletCellY + radiusScan; y += 1) {
      for (let x = bulletCellX - radiusScan; x <= bulletCellX + radiusScan; x += 1) {
        const bucket = targetGrid.get(cellKey(x, y));
        if (!bucket) {
          continue;
        }

        for (const target of bucket) {
          if (bullet.faction === target.faction) {
            continue;
          }

          const rr = (bullet.radius + target.radius) ** 2;
          if (distanceSquared(bullet.position.x, bullet.position.y, target.position.x, target.position.y) <= rr) {
            pairs.push({ a: bullet, b: target });
          }
        }
      }
    }
  }

  return pairs;
}
