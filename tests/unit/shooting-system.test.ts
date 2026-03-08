import { describe, it, expect } from 'vitest';
import { EntityManager } from '../../src/game/ecs/EntityManager';
import { EntityType, Faction } from '../../src/game/ecs/entityTypes';
import { shootingSystem } from '../../src/game/systems/shootingSystem';

describe('shootingSystem enemy fire', () => {
  it('fires enemy bullets when cooldown reaches zero', () => {
    const entityManager = new EntityManager();
    entityManager.create({
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: 0.7,
      health: 2,
      maxHealth: 2,
      fireCooldownMs: 0
    });

    shootingSystem(entityManager, 0.016);

    const bullets = entityManager.all().filter((entity) => entity.type === EntityType.Bullet);
    expect(bullets.length).toBe(1);
  });

  it('does not auto-fire player bullets', () => {
    const entityManager = new EntityManager();
    entityManager.create({
      type: EntityType.Player,
      faction: Faction.Player,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: 0.6,
      health: 10,
      maxHealth: 10,
      fireCooldownMs: 0
    });

    shootingSystem(entityManager, 0.016);

    const bullets = entityManager.all().filter((entity) => entity.type === EntityType.Bullet);
    expect(bullets.length).toBe(0);
  });

  it('aims sniper bullets at the player', () => {
    const entityManager = new EntityManager();
    entityManager.create({
      type: EntityType.Player,
      faction: Faction.Player,
      position: { x: 3, y: -3 },
      velocity: { x: 0, y: 0 },
      radius: 0.6,
      health: 10,
      maxHealth: 10
    });
    entityManager.create({
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: -2, y: 1 },
      velocity: { x: 0, y: 0 },
      radius: 0.8,
      health: 5,
      maxHealth: 5,
      fireCooldownMs: 0,
      enemyArchetype: 'sniper'
    });

    shootingSystem(entityManager, 0.016);

    const bullets = entityManager.all().filter((entity) => entity.type === EntityType.Bullet);
    expect(bullets.length).toBe(1);
    expect((bullets[0].velocity.x ?? 0) > 0).toBe(true);
    expect((bullets[0].velocity.y ?? 0) < 0).toBe(true);
  });
});
