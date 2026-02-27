import type { Entity } from './components';

export class EntityManager {
  private nextId = 1;
  private entities = new Map<number, Entity>();

  create(entity: Omit<Entity, 'id'>): Entity {
    const created: Entity = { ...entity, id: this.nextId++ };
    this.entities.set(created.id, created);
    return created;
  }

  remove(id: number) {
    this.entities.delete(id);
  }

  get(id: number): Entity | undefined {
    return this.entities.get(id);
  }

  all(): Entity[] {
    return [...this.entities.values()];
  }

  count(): number {
    return this.entities.size;
  }

  clear() {
    this.entities.clear();
    this.nextId = 1;
  }
}
