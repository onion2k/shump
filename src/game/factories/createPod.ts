import type { Entity } from '../ecs/components';
import { EntityType, Faction } from '../ecs/entityTypes';

export function createPod(index: number, x = 0, y = 0): Omit<Entity, 'id'> {
  return {
    type: EntityType.Pod,
    faction: Faction.Player,
    position: { x, y },
    velocity: { x: 0, y: 0 },
    radius: 0.24,
    health: 1,
    maxHealth: 1,
    fireCooldownMs: 0,
    podIndex: index
  };
}
