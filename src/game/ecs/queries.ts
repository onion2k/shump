import { EntityType } from './entityTypes';
import type { Entity } from './components';

export function byType(entities: Entity[], type: EntityType): Entity[] {
  return entities.filter((entity) => entity.type === type);
}
