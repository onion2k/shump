import type { Entity } from '../ecs/components';
import { EntityType } from '../ecs/entityTypes';
import { movementControllerRegistry } from '../movement/controllers';

export function movementSystem(entities: Iterable<Entity>, deltaSeconds: number) {
  for (const entity of entities) {
    entity.ageMs = (entity.ageMs ?? 0) + deltaSeconds * 1000;

    if (entity.type === EntityType.Enemy) {
      const ageSeconds = entity.ageMs / 1000;
      entity.spawnX ??= entity.position.x;
      entity.spawnY ??= entity.position.y;
      const baseX = entity.spawnX;
      const baseY = entity.spawnY;
      const amp = entity.patternAmplitude ?? 0;
      const frequency = entity.patternFrequency ?? 1;
      const driftX = baseX + entity.velocity.x * ageSeconds;
      const driftY = baseY + entity.velocity.y * ageSeconds;
      const controller = movementControllerRegistry.resolve(entity.movementPattern);
      const controlled = controller({
        ageSeconds,
        baseX,
        baseY,
        driftX,
        driftY,
        amplitude: amp,
        frequency,
        params: entity.movementParams
      });

      if (controlled) {
        entity.position.x = controlled.x;
        entity.position.y = controlled.y;
      } else {
        entity.position.x = driftX;
        entity.position.y = driftY;
      }

      continue;
    }

    entity.position.x += entity.velocity.x * deltaSeconds;
    entity.position.y += entity.velocity.y * deltaSeconds;
  }
}
