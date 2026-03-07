import type { Entity } from '../ecs/components';
import { EntityType, Faction } from '../ecs/entityTypes';
import type { MovementPatternId } from '../movement/patterns';
import { gameSettings } from '../config/gameSettings';
import type { EnemyArchetypeId } from '../content/enemyArchetypes';
import { resolveEnemyArchetype } from '../content/enemyArchetypes';

export interface EnemyStatScales {
  healthScale?: number;
  speedScale?: number;
  fireIntervalScale?: number;
  scoreScale?: number;
}

export function createEnemy(
  x: number,
  y: number,
  movementPattern: MovementPatternId = 'straight',
  patternAmplitude = 2,
  patternFrequency = 1.8,
  movementParams?: Record<string, number>,
  enemyArchetypeId: EnemyArchetypeId = 'scout',
  statScales: EnemyStatScales = {}
): Omit<Entity, 'id'> {
  const archetype = resolveEnemyArchetype(enemyArchetypeId);
  const healthScale = clampScale(statScales.healthScale ?? 1, 0.2, 8);
  const speedScale = clampScale(statScales.speedScale ?? 1, 0.2, 4);
  const fireIntervalScale = clampScale(statScales.fireIntervalScale ?? 1, 0.2, 4);
  const scoreScale = clampScale(statScales.scoreScale ?? 1, 0.2, 10);
  const scaledHealth = Math.max(1, Math.round(archetype.health * healthScale));

  return {
    type: EntityType.Enemy,
    faction: Faction.Enemy,
    position: { x, y },
    velocity: { x: 0, y: gameSettings.enemy.speedY * archetype.speedYMultiplier * speedScale },
    radius: archetype.radius,
    health: scaledHealth,
    maxHealth: scaledHealth,
    fireCooldownMs: gameSettings.enemy.fireCooldownStartMs * archetype.fireIntervalMultiplier * fireIntervalScale,
    enemyFireIntervalMs: gameSettings.enemy.fireIntervalMs * archetype.fireIntervalMultiplier * fireIntervalScale,
    scoreValue: Math.max(1, Math.round(archetype.scoreValue * scoreScale)),
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

function clampScale(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(min, Math.min(max, value));
}
