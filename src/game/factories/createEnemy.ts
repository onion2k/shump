import type { Entity } from '../ecs/components';
import { EntityType, Faction } from '../ecs/entityTypes';
import type { MovementPatternId } from '../movement/patterns';
import { gameSettings } from '../config/gameSettings';
import type { EnemyArchetypeId } from '../content/enemyArchetypes';
import { resolveEnemyArchetype } from '../content/enemyArchetypes';

export function createEnemy(
  x: number,
  y: number,
  movementPattern: MovementPatternId = 'straight',
  patternAmplitude = 2,
  patternFrequency = 1.8,
  movementParams?: Record<string, number>,
  enemyArchetypeId: EnemyArchetypeId = 'scout'
): Omit<Entity, 'id'> {
  const archetype = resolveEnemyArchetype(enemyArchetypeId);
  return {
    type: EntityType.Enemy,
    faction: Faction.Enemy,
    position: { x, y },
    velocity: { x: 0, y: gameSettings.enemy.speedY * archetype.speedYMultiplier },
    radius: archetype.radius,
    health: archetype.health,
    maxHealth: archetype.health,
    fireCooldownMs: gameSettings.enemy.fireCooldownStartMs * archetype.fireIntervalMultiplier,
    enemyFireIntervalMs: gameSettings.enemy.fireIntervalMs * archetype.fireIntervalMultiplier,
    scoreValue: archetype.scoreValue,
    movementPattern,
    patternAmplitude,
    patternFrequency,
    movementParams,
    enemyArchetype: archetype.id,
    spawnX: x,
    spawnY: y,
    ageMs: 0
  };
}
