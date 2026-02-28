import type { CollisionPair } from './collisionSystem';

export function damageSystem(collisions: CollisionPair[]): number {
  let scoreDelta = 0;

  for (const pair of collisions) {
    const bulletDamage = pair.a.damage ?? 1;
    pair.a.health -= 1;
    pair.b.health -= bulletDamage;

    if (pair.b.health <= 0 && pair.b.scoreValue) {
      scoreDelta += pair.b.scoreValue;
    }
  }

  return scoreDelta;
}
