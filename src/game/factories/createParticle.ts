import type { Entity } from '../ecs/components';
import { EntityType } from '../ecs/entityTypes';

export function createParticle(
  x: number,
  y: number,
  vx: number,
  vy: number,
  particleType: string,
  lifetimeMs: number,
  radius = 0.14
): Omit<Entity, 'id'> {
  return {
    type: EntityType.Particle,
    position: { x, y },
    velocity: { x: vx, y: vy },
    radius,
    health: 1,
    maxHealth: 1,
    lifetimeMs,
    particleType
  };
}
