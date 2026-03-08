import type { Entity } from './components';
import { EntityType } from './entityTypes';

export interface PoolTypeStats {
  active: number;
  pooled: number;
  totalAllocated: number;
}

export interface EntityPoolStats {
  enemy: PoolTypeStats;
  bullet: PoolTypeStats;
  pickup: PoolTypeStats;
}

type PoolableEntityType = EntityType.Enemy | EntityType.Bullet | EntityType.Pickup;

interface EntityPoolState {
  free: Entity[];
  totalAllocated: number;
}

const POOLED_ENTITY_TYPES: readonly PoolableEntityType[] = [EntityType.Enemy, EntityType.Bullet, EntityType.Pickup];

export class EntityManager {
  private nextId = 1;
  private entities = new Map<number, Entity>();
  private pools: Record<PoolableEntityType, EntityPoolState> = {
    [EntityType.Enemy]: { free: [], totalAllocated: 0 },
    [EntityType.Bullet]: { free: [], totalAllocated: 0 },
    [EntityType.Pickup]: { free: [], totalAllocated: 0 }
  };

  create(entity: Omit<Entity, 'id'>): Entity {
    const pooledType = asPoolableEntityType(entity.type);
    const created = pooledType ? this.createPooledEntity(pooledType, entity) : { ...entity, id: this.nextId++ };
    this.entities.set(created.id, created);
    return created;
  }

  remove(id: number) {
    const entity = this.entities.get(id);
    if (!entity) {
      return;
    }

    this.entities.delete(id);
    const pooledType = asPoolableEntityType(entity.type);
    if (pooledType) {
      this.pools[pooledType].free.push(entity);
    }
  }

  get(id: number): Entity | undefined {
    return this.entities.get(id);
  }

  values(): IterableIterator<Entity> {
    return this.entities.values();
  }

  all(): Entity[] {
    return [...this.entities.values()];
  }

  count(): number {
    return this.entities.size;
  }

  prewarmPools(config: Partial<{ enemy: number; bullet: number; pickup: number }> = {}) {
    this.prewarmPool(EntityType.Enemy, config.enemy ?? 0);
    this.prewarmPool(EntityType.Bullet, config.bullet ?? 0);
    this.prewarmPool(EntityType.Pickup, config.pickup ?? 0);
  }

  poolStats(): EntityPoolStats {
    let enemyActive = 0;
    let bulletActive = 0;
    let pickupActive = 0;
    for (const entity of this.entities.values()) {
      if (entity.type === EntityType.Enemy) {
        enemyActive += 1;
      } else if (entity.type === EntityType.Bullet) {
        bulletActive += 1;
      } else if (entity.type === EntityType.Pickup) {
        pickupActive += 1;
      }
    }

    return {
      enemy: {
        active: enemyActive,
        pooled: this.pools[EntityType.Enemy].free.length,
        totalAllocated: this.pools[EntityType.Enemy].totalAllocated
      },
      bullet: {
        active: bulletActive,
        pooled: this.pools[EntityType.Bullet].free.length,
        totalAllocated: this.pools[EntityType.Bullet].totalAllocated
      },
      pickup: {
        active: pickupActive,
        pooled: this.pools[EntityType.Pickup].free.length,
        totalAllocated: this.pools[EntityType.Pickup].totalAllocated
      }
    };
  }

  clear() {
    this.entities.clear();
    this.nextId = 1;
    for (const type of POOLED_ENTITY_TYPES) {
      this.pools[type].free = [];
      this.pools[type].totalAllocated = 0;
    }
  }

  private createPooledEntity(type: PoolableEntityType, entity: Omit<Entity, 'id'>): Entity {
    const pool = this.pools[type];
    let created = pool.free.pop();
    if (!created) {
      created = allocatePooledEntity(type);
      pool.totalAllocated += 1;
    }
    resetEntity(created, entity, this.nextId++);
    return created;
  }

  private prewarmPool(type: PoolableEntityType, targetCount: number) {
    const clampedTarget = Math.max(0, Math.floor(targetCount));
    const pool = this.pools[type];
    const additional = clampedTarget - pool.free.length;
    for (let i = 0; i < additional; i += 1) {
      pool.free.push(allocatePooledEntity(type));
      pool.totalAllocated += 1;
    }
  }
}

function asPoolableEntityType(type: EntityType): PoolableEntityType | undefined {
  if (type === EntityType.Enemy || type === EntityType.Bullet || type === EntityType.Pickup) {
    return type;
  }
  return undefined;
}

function allocatePooledEntity(type: PoolableEntityType): Entity {
  return {
    id: 0,
    type,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    radius: 0,
    health: 1,
    maxHealth: 1
  };
}

function resetEntity(target: Entity, source: Omit<Entity, 'id'>, id: number): void {
  for (const key of Object.keys(target) as Array<keyof Entity>) {
    delete target[key];
  }

  Object.assign(target, source);
  target.id = id;
  target.position = { x: source.position.x, y: source.position.y };
  target.velocity = { x: source.velocity.x, y: source.velocity.y };
}
