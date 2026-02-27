import type { CollisionPair } from './collisionSystem';

export function damageSystem(collisions: CollisionPair[]): number {
  let scoreDelta = 0;

  for (const pair of collisions) {
    pair.a.health -= 1;
    pair.b.health -= 1;

    if (pair.b.health <= 0 && pair.b.scoreValue) {
      scoreDelta += pair.b.scoreValue;
    }
  }

  return scoreDelta;
}
