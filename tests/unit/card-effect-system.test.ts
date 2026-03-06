import { describe, expect, it } from 'vitest';
import { EntityType } from '../../src/game/ecs/entityTypes';
import type { Entity } from '../../src/game/ecs/components';
import { applyCardsToPlayer, captureBaseStateFromPlayer, computeCardBonuses } from '../../src/game/systems/cardEffectSystem';
import { cardCatalogById } from '../../src/game/content/cards';

describe('cardEffectSystem', () => {
  it('computes aggregate bonuses from stacked cards and tag synergies', () => {
    const bonuses = computeCardBonuses(['reinforced-hull', 'reinforced-hull', 'pulse-overclock']);
    expect(bonuses.maxHealthBonus).toBe(8);
    expect(bonuses.weaponLevelBonus['Auto Pulse']).toBe(1);
  });

  it('applies and strips card effects around base player state', () => {
    const player = {
      id: 1,
      type: EntityType.Player,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: 0.6,
      health: 9,
      maxHealth: 10,
      weaponMode: 'Auto Pulse',
      weaponLevel: 1,
      weaponLevels: { 'Auto Pulse': 1, 'Continuous Laser': 1, 'Heavy Cannon': 1, 'Sine SMG': 1 },
      podCount: 0,
      podWeaponMode: 'Auto Pulse' as const,
      moveMaxSpeed: 24,
      moveFollowGain: 6,
      pickupAttractRange: 4.2,
      pickupAttractPower: 16,
      shieldCurrent: 10,
      shieldMax: 10,
      shieldRechargeDelayMs: 1400,
      shieldRechargeTimeMs: 3600,
      shieldRechargeDelayRemainingMs: 0
    };

    const baseState = {
      health: 9,
      maxHealth: 10,
      weaponLevels: { 'Auto Pulse': 1, 'Continuous Laser': 1, 'Heavy Cannon': 1, 'Sine SMG': 1 },
      podCount: 0,
      podWeaponMode: 'Auto Pulse' as const,
      moveMaxSpeed: 24,
      moveFollowGain: 6,
      pickupAttractRange: 4.2,
      pickupAttractPower: 16,
      shieldCurrent: 10,
      shieldMax: 10,
      shieldRechargeDelayMs: 1400,
      shieldRechargeTimeMs: 3600,
      shieldRechargeDelayRemainingMs: 0
    };
    const activeCards = ['reinforced-hull', 'pulse-overclock'];

    applyCardsToPlayer(player, baseState, activeCards);
    expect(player.maxHealth).toBe(13);
    expect(player.health).toBe(9);
    expect(player.weaponLevels?.['Auto Pulse']).toBe(2);

    const capturedBase = captureBaseStateFromPlayer(player, activeCards);
    expect(capturedBase.maxHealth).toBe(10);
    expect(capturedBase.health).toBe(9);
    expect(capturedBase.weaponLevels['Auto Pulse']).toBe(1);
  });

  it('applies economy bonuses and economy-tag synergy', () => {
    const bonuses = computeCardBonuses(['salvage-contract', 'executive-salvage']);
    expect(bonuses.moneyMultiplierPercent).toBe(75);
    expect(bonuses.killMoneyFlatBonus).toBe(0);
  });

  it('applies pod count and missile mode overrides from pod cards', () => {
    const player = {
      id: 2,
      type: EntityType.Player,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: 0.6,
      health: 8,
      maxHealth: 10,
      weaponMode: 'Auto Pulse',
      weaponLevel: 1,
      weaponLevels: { 'Auto Pulse': 1, 'Continuous Laser': 1, 'Heavy Cannon': 1, 'Sine SMG': 1 },
      podCount: 0,
      podWeaponMode: 'Auto Pulse' as const,
      moveMaxSpeed: 24,
      moveFollowGain: 6,
      pickupAttractRange: 4.2,
      pickupAttractPower: 16,
      shieldCurrent: 10,
      shieldMax: 10,
      shieldRechargeDelayMs: 1400,
      shieldRechargeTimeMs: 3600,
      shieldRechargeDelayRemainingMs: 0
    };
    const baseState = {
      health: 8,
      maxHealth: 10,
      weaponLevels: { 'Auto Pulse': 1, 'Continuous Laser': 1, 'Heavy Cannon': 1, 'Sine SMG': 1 },
      podCount: 0,
      podWeaponMode: 'Auto Pulse' as const,
      moveMaxSpeed: 24,
      moveFollowGain: 6,
      pickupAttractRange: 4.2,
      pickupAttractPower: 16,
      shieldCurrent: 10,
      shieldMax: 10,
      shieldRechargeDelayMs: 1400,
      shieldRechargeTimeMs: 3600,
      shieldRechargeDelayRemainingMs: 0
    };

    applyCardsToPlayer(player, baseState, ['satellite-bay', 'missile-command']);
    expect(player.podCount).toBe(2);
    expect(player.podWeaponMode).toBe('Homing Missile');
  });

  it('supports generic player-stat effects for future mechanics', () => {
    const cardId = 'test-player-stat';
    cardCatalogById[cardId] = {
      id: cardId,
      name: 'Test',
      description: 'Test card.',
      rarity: 'common',
      tags: ['utility'],
      cost: 0,
      maxStacks: 1,
      unlockRound: 1,
      shopWeight: 0,
      dropWeight: 0,
      effects: [
        { kind: 'playerStat', stat: 'moveMaxSpeed', amount: 2 },
        { kind: 'playerStat', stat: 'pickupAttractRange', amount: 1.5 },
        { kind: 'playerStat', stat: 'shieldMax', amount: 4 }
      ]
    };

    const player: Entity = {
      id: 3,
      type: EntityType.Player,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: 0.6,
      health: 10,
      maxHealth: 10,
      weaponMode: 'Auto Pulse',
      weaponLevel: 1,
      weaponLevels: { 'Auto Pulse': 1, 'Continuous Laser': 1, 'Heavy Cannon': 1, 'Sine SMG': 1 },
      podCount: 0,
      podWeaponMode: 'Auto Pulse' as const
    };
    const baseState = {
      health: 10,
      maxHealth: 10,
      weaponLevels: { 'Auto Pulse': 1, 'Continuous Laser': 1, 'Heavy Cannon': 1, 'Sine SMG': 1 },
      podCount: 0,
      podWeaponMode: 'Auto Pulse' as const,
      moveMaxSpeed: 24,
      moveFollowGain: 6,
      pickupAttractRange: 4.2,
      pickupAttractPower: 16,
      shieldCurrent: 10,
      shieldMax: 10,
      shieldRechargeDelayMs: 1400,
      shieldRechargeTimeMs: 3600,
      shieldRechargeDelayRemainingMs: 0
    };

    try {
      applyCardsToPlayer(player, baseState, [cardId]);
      expect(player.moveMaxSpeed).toBe(26);
      expect(player.pickupAttractRange).toBe(5.7);
      expect(player.shieldMax).toBe(14);
    } finally {
      delete cardCatalogById[cardId];
    }
  });
});
