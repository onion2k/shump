import type { Entity } from '../ecs/components';
import { EntityType, Faction } from '../ecs/entityTypes';

export function createPlayer(): Omit<Entity, 'id'> {
  return {
    type: EntityType.Player,
    faction: Faction.Player,
    position: { x: 0, y: -10 },
    velocity: { x: 0, y: 0 },
    radius: 0.6,
    health: 10,
    maxHealth: 10,
    fireCooldownMs: 0
  };
}
