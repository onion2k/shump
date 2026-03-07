import { describe, expect, it } from 'vitest';
import { applyConsumableCardUpgrade } from '../../src/game/core/playerProgress';
import type { RunProgress } from '../../src/game/core/RunProgress';
import { getPlayerWeaponMaxLevel } from '../../src/game/weapons/playerWeapons';

describe('playerProgress card upgrades', () => {
  it('applies consumable card upgrades and clamps weapon level to max', () => {
    const runProgress: RunProgress = {
      seed: 1,
      levelId: 'level-1',
      roundIndex: 1,
      inRunMoney: 0,
      foundCards: [],
      activeCards: [],
      consumedCards: [],
      playerState: {
        health: 8,
        maxHealth: 10,
        weaponLevels: {
          'Auto Pulse': 1,
          'Heavy Cannon': getPlayerWeaponMaxLevel('Heavy Cannon')
        },
        podCount: 0,
        podWeaponMode: 'Auto Pulse',
        moveMaxSpeed: 24,
        moveFollowGain: 6,
        pickupAttractRange: 4.2,
        pickupAttractPower: 16,
        shieldCurrent: 10,
        shieldMax: 10,
        shieldRechargeDelayMs: 1400,
        shieldRechargeTimeMs: 3600,
        shieldRechargeDelayRemainingMs: 0
      },
      elapsedMs: 0,
      distanceTraveled: 0,
      score: 0
    };

    applyConsumableCardUpgrade(runProgress, {
      id: 'test-consumable',
      name: 'Test Consumable',
      description: 'Applies permanent upgrades.',
      rarity: 'rare',
      tags: ['weapon'],
      cost: 0,
      maxStacks: 1,
      unlockRound: 1,
      shopWeight: 0,
      dropWeight: 0,
      effects: [
        { kind: 'maxHealth', amount: 2 },
        { kind: 'weaponLevel', weaponMode: 'Heavy Cannon', amount: 2 }
      ]
    });

    expect(runProgress.playerState.maxHealth).toBe(12);
    expect(runProgress.playerState.health).toBe(10);
    expect(runProgress.playerState.weaponLevels['Heavy Cannon']).toBe(getPlayerWeaponMaxLevel('Heavy Cannon'));
  });

  it('defaults non-starter weapon level from 0 when applying consumable weapon upgrades', () => {
    const runProgress: RunProgress = {
      seed: 2,
      levelId: 'level-1',
      roundIndex: 1,
      inRunMoney: 0,
      foundCards: [],
      activeCards: [],
      consumedCards: [],
      playerState: {
        health: 10,
        maxHealth: 10,
        weaponLevels: {},
        podCount: 0,
        podWeaponMode: 'Auto Pulse',
        moveMaxSpeed: 24,
        moveFollowGain: 6,
        pickupAttractRange: 4.2,
        pickupAttractPower: 16,
        shieldCurrent: 10,
        shieldMax: 10,
        shieldRechargeDelayMs: 1400,
        shieldRechargeTimeMs: 3600,
        shieldRechargeDelayRemainingMs: 0
      },
      elapsedMs: 0,
      distanceTraveled: 0,
      score: 0
    };

    applyConsumableCardUpgrade(runProgress, {
      id: 'test-weapon-upgrade',
      name: 'Test Weapon Upgrade',
      description: 'Adds a weapon level.',
      rarity: 'common',
      tags: ['weapon'],
      cost: 0,
      maxStacks: 1,
      unlockRound: 1,
      shopWeight: 0,
      dropWeight: 0,
      effects: [{ kind: 'weaponLevel', weaponMode: 'Sine SMG', amount: 1 }]
    });

    expect(runProgress.playerState.weaponLevels['Sine SMG']).toBe(1);
  });

  it('no-ops when run progress is undefined', () => {
    expect(() =>
      applyConsumableCardUpgrade(undefined, {
        id: 'noop',
        name: 'Noop',
        description: 'No-op upgrade.',
        rarity: 'common',
        tags: ['utility'],
        cost: 0,
        maxStacks: 1,
        unlockRound: 1,
        shopWeight: 0,
        dropWeight: 0,
        effects: [{ kind: 'maxHealth', amount: 2 }]
      })
    ).not.toThrow();
  });
});
