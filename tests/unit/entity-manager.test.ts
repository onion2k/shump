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

  it('reuses pooled entity instances for pooled types with new ids', () => {
    const manager = new EntityManager();
    const original = manager.create(buildEnemy());
    const originalRef = original;
    const originalId = original.id;

    manager.remove(originalId);
    const reused = manager.create(buildEnemy({ position: { x: 5, y: 6 } }));

    expect(reused).toBe(originalRef);
    expect(reused.id).not.toBe(originalId);
    expect(reused.position.x).toBe(5);
    expect(reused.position.y).toBe(6);
  });

  it('clears stale optional fields when reusing pooled entities', () => {
    const manager = new EntityManager();
    const bullet = manager.create({
      type: EntityType.Bullet,
      faction: Faction.Player,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 9 },
      radius: 0.2,
      health: 1,
      maxHealth: 1,
      lifetimeMs: 1000,
      damage: 2,
      pierceRemaining: 3,
      sourceWeaponTag: 'old-tag'
    });
    const bulletRef = bullet;
    manager.remove(bullet.id);

    const freshBullet = manager.create({
      type: EntityType.Bullet,
      faction: Faction.Player,
      position: { x: 1, y: 1 },
      velocity: { x: 0, y: 10 },
      radius: 0.16,
      health: 1,
      maxHealth: 1,
      lifetimeMs: 1200,
      damage: 1
    });

    expect(freshBullet).toBe(bulletRef);
    expect(freshBullet.pierceRemaining).toBeUndefined();
    expect(freshBullet.sourceWeaponTag).toBeUndefined();
  });

  it('does not pool non-pooled entity types', () => {
    const manager = new EntityManager();
    const player = manager.create({
      type: EntityType.Player,
      faction: Faction.Player,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: 1,
      health: 10,
      maxHealth: 10
    });
    manager.remove(player.id);
    const replacement = manager.create({
      type: EntityType.Player,
      faction: Faction.Player,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: 1,
      health: 10,
      maxHealth: 10
    });

    expect(replacement).not.toBe(player);
    const stats = manager.poolStats();
    expect(stats.enemy.totalAllocated).toBe(0);
    expect(stats.bullet.totalAllocated).toBe(0);
    expect(stats.pickup.totalAllocated).toBe(0);
  });

  it('prewarms pools and reports pool stats', () => {
    const manager = new EntityManager();
    manager.prewarmPools({ enemy: 4, bullet: 6, pickup: 3 });
    const stats = manager.poolStats();

    expect(stats.enemy.pooled).toBe(4);
    expect(stats.bullet.pooled).toBe(6);
    expect(stats.pickup.pooled).toBe(3);
    expect(stats.enemy.totalAllocated).toBe(4);
    expect(stats.bullet.totalAllocated).toBe(6);
    expect(stats.pickup.totalAllocated).toBe(3);
  });

  it('clear resets active entities, pools, and allocation counters', () => {
    const manager = new EntityManager();
    manager.prewarmPools({ enemy: 2, bullet: 2, pickup: 2 });
    const enemy = manager.create(buildEnemy());
    manager.remove(enemy.id);

    manager.clear();

    expect(manager.count()).toBe(0);
    expect(manager.poolStats()).toEqual({
      enemy: { active: 0, pooled: 0, totalAllocated: 0 },
      bullet: { active: 0, pooled: 0, totalAllocated: 0 },
      pickup: { active: 0, pooled: 0, totalAllocated: 0 }
    });
  });
});

function buildEnemy(overrides: Partial<Parameters<EntityManager['create']>[0]> = {}): Parameters<EntityManager['create']>[0] {
  return {
    type: EntityType.Enemy,
    faction: Faction.Enemy,
    position: { x: 0, y: -1 },
    velocity: { x: 0, y: 1 },
    radius: 0.6,
    health: 4,
    maxHealth: 4,
    ...overrides
  };
}
