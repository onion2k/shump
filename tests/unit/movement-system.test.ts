import { describe, it, expect } from 'vitest';
import { movementSystem } from '../../src/game/systems/movementSystem';
import { EntityType, Faction } from '../../src/game/ecs/entityTypes';

describe('movementSystem', () => {
  it('integrates velocity', () => {
    const entities = [
      {
        id: 1,
        type: EntityType.Enemy,
        faction: Faction.Enemy,
        position: { x: 0, y: 0 },
        velocity: { x: 2, y: 1 },
        radius: 0.5,
        health: 1,
        maxHealth: 1
      }
    ];

    movementSystem(entities, 0.5);

    expect(entities[0].position.x).toBeCloseTo(1);
    expect(entities[0].position.y).toBeCloseTo(0.5);
  });
});
