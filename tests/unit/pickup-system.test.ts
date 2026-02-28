import { describe, it, expect } from 'vitest';
import { EntityManager } from '../../src/game/ecs/EntityManager';
import { EntityType, Faction } from '../../src/game/ecs/entityTypes';
import { pickupSystem } from '../../src/game/systems/pickupSystem';

function createPlayer(entityManager: EntityManager) {
  return entityManager.create({
    type: EntityType.Player,
    faction: Faction.Player,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    radius: 0.6,
    health: 6,
    maxHealth: 10,
    weaponEnergy: 30,
    weaponEnergyMax: 100
  });
}

describe('pickupSystem', () => {
  it('applies health and energy pickups and removes collected entities', () => {
    const entityManager = new EntityManager();
    const player = createPlayer(entityManager);

    const healthPickup = entityManager.create({
      type: EntityType.Pickup,
      position: { x: 0.2, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: 0.45,
      health: 1,
      maxHealth: 1,
      pickupKind: 'health',
      pickupValue: 3
    });

    const energyPickup = entityManager.create({
      type: EntityType.Pickup,
      position: { x: -0.2, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: 0.45,
      health: 1,
      maxHealth: 1,
      pickupKind: 'energy',
      pickupValue: 20
    });

    const result = pickupSystem(entityManager, player.id);

    expect(result.scoreDelta).toBe(0);
    expect(player.health).toBe(9);
    expect(player.weaponEnergy).toBe(50);
    expect(entityManager.get(healthPickup.id)).toBeUndefined();
    expect(entityManager.get(energyPickup.id)).toBeUndefined();
  });

  it('adds score for score pickups', () => {
    const entityManager = new EntityManager();
    const player = createPlayer(entityManager);

    entityManager.create({
      type: EntityType.Pickup,
      position: { x: 0, y: 0.2 },
      velocity: { x: 0, y: 0 },
      radius: 0.45,
      health: 1,
      maxHealth: 1,
      pickupKind: 'score',
      pickupValue: 55
    });

    const result = pickupSystem(entityManager, player.id);

    expect(result.scoreDelta).toBe(55);
    expect(result.collections).toHaveLength(1);
  });
});
