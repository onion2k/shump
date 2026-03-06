import type { CollisionPair } from './collisionSystem';
import type { Entity } from '../ecs/components';

export function applyDamage(target: Entity, incomingDamage: number): number {
  let damageRemaining = Math.max(0, incomingDamage);
  const shieldMax = Math.max(0, target.shieldMax ?? 0);

  if (shieldMax > 0) {
    const currentShield = Math.max(0, Math.min(shieldMax, target.shieldCurrent ?? 0));
    const absorbed = Math.min(currentShield, damageRemaining);
    if (absorbed > 0) {
      target.shieldCurrent = currentShield - absorbed;
      damageRemaining -= absorbed;
    } else {
      target.shieldCurrent = currentShield;
    }

    target.shieldRechargeDelayRemainingMs = Math.max(0, target.shieldRechargeDelayMs ?? 0);
  }

  if (damageRemaining > 0) {
    target.health -= damageRemaining;
  }

  return damageRemaining;
}

export function damageSystem(collisions: CollisionPair[]): number {
  let scoreDelta = 0;

  for (const pair of collisions) {
    const bulletDamage = pair.a.damage ?? 1;
    pair.a.health -= 1;
    applyDamage(pair.b, bulletDamage);

    if (pair.b.health <= 0 && pair.b.scoreValue) {
      scoreDelta += pair.b.scoreValue;
    }
  }

  return scoreDelta;
}
