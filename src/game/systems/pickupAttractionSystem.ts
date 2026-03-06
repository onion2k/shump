import type { EntityManager } from '../ecs/EntityManager';
import { EntityType } from '../ecs/entityTypes';

const EDGE_ATTRACTION_FACTOR = 0.15;

export function pickupAttractionSystem(entityManager: EntityManager, playerId: number): void {
  const player = entityManager.get(playerId);
  if (!player) {
    return;
  }

  const range = Math.max(0, player.pickupAttractRange ?? 0);
  const power = Math.max(0, player.pickupAttractPower ?? 0);
  if (range <= 0 || power <= 0) {
    return;
  }

  const rangeSquared = range * range;

  for (const entity of entityManager.all()) {
    if (entity.type !== EntityType.Pickup) {
      continue;
    }

    const dx = player.position.x - entity.position.x;
    const dy = player.position.y - entity.position.y;
    const distSq = dx * dx + dy * dy;
    if (distSq <= 0 || distSq > rangeSquared) {
      continue;
    }

    const distance = Math.sqrt(distSq);
    const attractionRatio = 1 - distance / range;
    const attractionSpeed = power * Math.max(EDGE_ATTRACTION_FACTOR, attractionRatio);

    entity.velocity.x = (dx / distance) * attractionSpeed;
    entity.velocity.y = (dy / distance) * attractionSpeed;
  }
}
