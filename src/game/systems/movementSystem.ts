import type { Entity } from '../ecs/components';
import { WORLD_BOUNDS } from '../core/constants';
import { clamp } from '../util/math';
import { EntityType } from '../ecs/entityTypes';

export function movementSystem(entities: Entity[], deltaSeconds: number) {
  for (const entity of entities) {
    entity.ageMs = (entity.ageMs ?? 0) + deltaSeconds * 1000;

    if (entity.type === EntityType.Enemy) {
      const ageSeconds = entity.ageMs / 1000;
      const baseX = entity.spawnX ?? entity.position.x;
      const amp = entity.patternAmplitude ?? 0;
      const frequency = entity.patternFrequency ?? 1;

      if (entity.movementPattern === 'sine') {
        entity.position.x = baseX + Math.sin(ageSeconds * frequency) * amp;
      } else if (entity.movementPattern === 'zigzag') {
        entity.position.x = baseX + Math.sign(Math.sin(ageSeconds * frequency)) * amp;
      }
    }

    entity.position.x += entity.velocity.x * deltaSeconds;
    entity.position.y += entity.velocity.y * deltaSeconds;

    if (entity.type === EntityType.Player) {
      entity.position.x = clamp(entity.position.x, WORLD_BOUNDS.left + 0.5, WORLD_BOUNDS.right - 0.5);
      entity.position.y = clamp(entity.position.y, WORLD_BOUNDS.bottom + 0.5, WORLD_BOUNDS.top - 0.5);
    }
  }
}
