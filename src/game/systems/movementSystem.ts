import type { Entity } from '../ecs/components';
import { EntityType } from '../ecs/entityTypes';
import { movementControllerRegistry } from '../movement/controllers';

export function movementSystem(entities: Entity[], deltaSeconds: number) {
  for (const entity of entities) {
    entity.ageMs = (entity.ageMs ?? 0) + deltaSeconds * 1000;

    if (entity.type === EntityType.Enemy) {
      const ageSeconds = entity.ageMs / 1000;
      const baseX = entity.spawnX ?? entity.position.x;
      const baseY = entity.spawnY ?? entity.position.y;
      const amp = entity.patternAmplitude ?? 0;
      const frequency = entity.patternFrequency ?? 1;
      const controller = movementControllerRegistry.resolve(entity.movementPattern);
      const controlledX = controller({
        ageSeconds,
        baseX,
        baseY,
        amplitude: amp,
        frequency,
        params: entity.movementParams
      });

      if (typeof controlledX === 'number') {
        entity.position.x = controlledX;
      }
    }

    entity.position.x += entity.velocity.x * deltaSeconds;
    entity.position.y += entity.velocity.y * deltaSeconds;
  }
}
