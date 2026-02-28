import { describe, it, expect } from 'vitest';
import { EntityManager } from '../../src/game/ecs/EntityManager';
import { EntityType, Faction } from '../../src/game/ecs/entityTypes';
import { homingSystem } from '../../src/game/systems/homingSystem';

function createEntityManagerWithMissile() {
  const entityManager = new EntityManager();
  const enemy = entityManager.create({
    type: EntityType.Enemy,
    faction: Faction.Enemy,
    position: { x: 5, y: 5 },
    velocity: { x: 0, y: 0 },
    radius: 0.7,
    health: 3,
    maxHealth: 3
  });

  const missile = entityManager.create({
    type: EntityType.Bullet,
    faction: Faction.Player,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 15 },
    radius: 0.25,
    health: 1,
    maxHealth: 1,
    projectileKind: 'missile',
    projectileSpeed: 15,
    homingTargetId: enemy.id,
    homingTurnRate: 10
  });

  return { entityManager, missile };
}

describe('homingSystem', () => {
  it('steers player missiles toward target enemies', () => {
    const { entityManager, missile } = createEntityManagerWithMissile();

    homingSystem(entityManager, 0.1);

    expect(missile.velocity.x).toBeGreaterThan(0);
    expect(Math.hypot(missile.velocity.x, missile.velocity.y)).toBeCloseTo(15, 3);
  });

  it('does not steer non-missile bullets', () => {
    const entityManager = new EntityManager();
    const enemy = entityManager.create({
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: 2, y: 3 },
      velocity: { x: 0, y: 0 },
      radius: 0.7,
      health: 3,
      maxHealth: 3
    });

    const bullet = entityManager.create({
      type: EntityType.Bullet,
      faction: Faction.Player,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 10 },
      radius: 0.22,
      health: 1,
      maxHealth: 1,
      projectileKind: 'standard',
      projectileSpeed: 10,
      homingTargetId: enemy.id
    });

    homingSystem(entityManager, 0.2);

    expect(bullet.velocity.x).toBe(0);
    expect(bullet.velocity.y).toBe(10);
  });
});
