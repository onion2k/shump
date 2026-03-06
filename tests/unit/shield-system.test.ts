import { describe, expect, it } from 'vitest';
import { EntityType, Faction } from '../../src/game/ecs/entityTypes';
import { shieldSystem } from '../../src/game/systems/shieldSystem';

describe('shieldSystem', () => {
  it('waits for recharge delay, then restores shield over recharge time', () => {
    const entities = [
      {
        id: 1,
        type: EntityType.Player,
        faction: Faction.Player,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        radius: 0.6,
        health: 10,
        maxHealth: 10,
        shieldCurrent: 2,
        shieldMax: 10,
        shieldRechargeDelayMs: 500,
        shieldRechargeTimeMs: 1000,
        shieldRechargeDelayRemainingMs: 500
      }
    ];

    shieldSystem(entities, 0.25);
    expect(entities[0].shieldCurrent).toBe(2);
    expect(entities[0].shieldRechargeDelayRemainingMs).toBe(250);

    shieldSystem(entities, 0.25);
    expect(entities[0].shieldCurrent).toBe(2);
    expect(entities[0].shieldRechargeDelayRemainingMs).toBe(0);

    shieldSystem(entities, 0.5);
    expect(entities[0].shieldCurrent).toBeCloseTo(7, 4);
  });
});
