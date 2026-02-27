import type { Entity } from '../ecs/components';
import { EntityType, Faction } from '../ecs/entityTypes';

export function createEnemy(
  x: number,
  y: number,
  movementPattern: 'straight' | 'sine' | 'zigzag' = 'straight',
  patternAmplitude = 2,
  patternFrequency = 1.8
): Omit<Entity, 'id'> {
  return {
    type: EntityType.Enemy,
    faction: Faction.Enemy,
    position: { x, y },
    velocity: { x: 0, y: -3.5 },
    radius: 0.7,
    health: 2,
    maxHealth: 2,
    fireCooldownMs: 800,
    scoreValue: 100,
    movementPattern,
    patternAmplitude,
    patternFrequency,
    spawnX: x,
    ageMs: 0
  };
}
