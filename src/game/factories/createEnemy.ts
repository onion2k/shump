import type { Entity } from '../ecs/components';
import { EntityType, Faction } from '../ecs/entityTypes';
import type { MovementPatternId } from '../movement/patterns';
import { gameSettings } from '../config/gameSettings';

export function createEnemy(
  x: number,
  y: number,
  movementPattern: MovementPatternId = 'straight',
  patternAmplitude = 2,
  patternFrequency = 1.8,
  movementParams?: Record<string, number>
): Omit<Entity, 'id'> {
  return {
    type: EntityType.Enemy,
    faction: Faction.Enemy,
    position: { x, y },
    velocity: { x: 0, y: gameSettings.enemy.speedY },
    radius: gameSettings.enemy.radius,
    health: gameSettings.enemy.health,
    maxHealth: gameSettings.enemy.health,
    fireCooldownMs: gameSettings.enemy.fireCooldownStartMs,
    scoreValue: gameSettings.enemy.scoreValue,
    movementPattern,
    patternAmplitude,
    patternFrequency,
    movementParams,
    spawnX: x,
    spawnY: y,
    ageMs: 0
  };
}
