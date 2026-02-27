import { describe, it, expect } from 'vitest';
import { collisionSystem } from '../../src/game/systems/collisionSystem';
import { EntityType, Faction } from '../../src/game/ecs/entityTypes';

describe('collisionSystem', () => {
  it('returns bullet-target collision pairs', () => {
    const collisions = collisionSystem([
      {
        id: 1,
        type: EntityType.Bullet,
        faction: Faction.Player,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        radius: 0.3,
        health: 1,
        maxHealth: 1
      },
      {
        id: 2,
        type: EntityType.Enemy,
        faction: Faction.Enemy,
        position: { x: 0.2, y: 0 },
        velocity: { x: 0, y: 0 },
        radius: 0.4,
        health: 1,
        maxHealth: 1
      }
    ]);

    expect(collisions).toHaveLength(1);
  });
});
