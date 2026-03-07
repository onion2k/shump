import type { Entity } from '../ecs/components';

function rechargePerSecond(shieldMax: number, rechargeTimeMs: number): number {
  const rechargeSeconds = Math.max(0.001, rechargeTimeMs / 1000);
  return shieldMax / rechargeSeconds;
}

export function shieldSystem(entities: Iterable<Entity>, deltaSeconds: number): void {
  if (deltaSeconds <= 0) {
    return;
  }

  const deltaMs = deltaSeconds * 1000;

  for (const entity of entities) {
    const shieldMax = Math.max(0, entity.shieldMax ?? 0);
    if (shieldMax <= 0) {
      entity.shieldCurrent = 0;
      entity.shieldRechargeDelayRemainingMs = 0;
      continue;
    }

    const currentShield = Math.max(0, Math.min(shieldMax, entity.shieldCurrent ?? 0));
    entity.shieldCurrent = currentShield;

    const previousDelay = Math.max(0, entity.shieldRechargeDelayRemainingMs ?? 0);
    const remainingDelay = Math.max(0, previousDelay - deltaMs);
    entity.shieldRechargeDelayRemainingMs = remainingDelay;
    if (remainingDelay > 0 || currentShield >= shieldMax) {
      continue;
    }

    const rechargeTimeMs = Math.max(1, entity.shieldRechargeTimeMs ?? 1);
    const rechargeSeconds = previousDelay > 0 ? Math.max(0, deltaSeconds - previousDelay / 1000) : deltaSeconds;
    if (rechargeSeconds <= 0) {
      continue;
    }

    const nextShield = currentShield + rechargePerSecond(shieldMax, rechargeTimeMs) * rechargeSeconds;
    entity.shieldCurrent = Math.min(shieldMax, nextShield);
  }
}
