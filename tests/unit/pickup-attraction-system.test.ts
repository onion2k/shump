import { describe, expect, it } from 'vitest';
import { EntityManager } from '../../src/game/ecs/EntityManager';
import { EntityType, Faction } from '../../src/game/ecs/entityTypes';
import { pickupAttractionSystem } from '../../src/game/systems/pickupAttractionSystem';

describe('pickupAttractionSystem', () => {
  it('pulls nearby pickups toward the player and leaves distant pickups unchanged', () => {
    const entityManager = new EntityManager();
    const player = entityManager.create({
      type: EntityType.Player,
      faction: Faction.Player,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: 0.6,
      health: 10,
      maxHealth: 10,
      pickupAttractRange: 4,
      pickupAttractPower: 12
    });

    const nearPickup = entityManager.create({
      type: EntityType.Pickup,
      position: { x: 2, y: 0 },
      velocity: { x: 0, y: -1.5 },
      radius: 0.45,
      health: 1,
      maxHealth: 1
    });

    const farPickup = entityManager.create({
      type: EntityType.Pickup,
      position: { x: 9, y: 0 },
      velocity: { x: 0, y: -1.5 },
      radius: 0.45,
      health: 1,
      maxHealth: 1
    });

    pickupAttractionSystem(entityManager, player.id);

    expect(nearPickup.velocity.x).toBeLessThan(0);
    expect(Math.hypot(nearPickup.velocity.x, nearPickup.velocity.y)).toBeGreaterThan(0);
    expect(farPickup.velocity.x).toBe(0);
    expect(farPickup.velocity.y).toBe(-1.5);
  });
});
