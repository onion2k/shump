import { describe, expect, it } from 'vitest';
import { EntityType, Faction } from '../../src/game/ecs/entityTypes';
import { damageSystem } from '../../src/game/systems/damageSystem';

describe('damageSystem', () => {
  it('consumes shield before health and starts shield recharge delay', () => {
    const bullet = {
      id: 1,
      type: EntityType.Bullet,
      faction: Faction.Enemy,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: 0.1,
      health: 1,
      maxHealth: 1,
      damage: 3
    };

    const player = {
      id: 2,
      type: EntityType.Player,
      faction: Faction.Player,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: 0.6,
      health: 10,
      maxHealth: 10,
      shieldCurrent: 2,
      shieldMax: 10,
      shieldRechargeDelayMs: 1200,
      shieldRechargeTimeMs: 3600,
      shieldRechargeDelayRemainingMs: 0
    };

    damageSystem([{ a: bullet, b: player }]);

    expect(bullet.health).toBe(0);
    expect(player.shieldCurrent).toBe(0);
    expect(player.health).toBe(9);
    expect(player.shieldRechargeDelayRemainingMs).toBe(1200);
  });
});
