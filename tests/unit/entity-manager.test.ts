import { describe, it, expect } from 'vitest';
import { EntityManager } from '../../src/game/ecs/EntityManager';
import { EntityType, Faction } from '../../src/game/ecs/entityTypes';

describe('EntityManager', () => {
  it('creates and removes entities', () => {
    const manager = new EntityManager();
    const entity = manager.create({
      type: EntityType.Player,
      faction: Faction.Player,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: 1,
      health: 1,
      maxHealth: 1
    });

    expect(manager.count()).toBe(1);
    expect(manager.get(entity.id)).toBeTruthy();

    manager.remove(entity.id);
    expect(manager.count()).toBe(0);
  });
});
