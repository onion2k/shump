import { describe, expect, it } from 'vitest';
import { cardCatalogById } from '../../src/game/content/cards';
import { applyCardsToPlayer, computeCardBonuses } from '../../src/game/systems/cardEffectSystem';
import { EntityType } from '../../src/game/ecs/entityTypes';

describe('card effect schema scaffolding', () => {
  it('accepts new effect kinds and safely ignores unimplemented variants', () => {
    const cardId = 'test-schema-scaffold';
    cardCatalogById[cardId] = {
      id: cardId,
      name: 'Schema Scaffold',
      description: 'Covers new typed effect kinds.',
      rarity: 'rare',
      tags: ['utility'],
      cost: 0,
      maxStacks: 1,
      unlockRound: 1,
      shopWeight: 0,
      dropWeight: 0,
      effects: [
        { kind: 'maxHealth', amount: 2 },
        { kind: 'weaponAmplifier', effectId: 'overcharged-capacitors', amount: 1.2, weaponMode: 'all' },
        { kind: 'projectileModifier', effectId: 'piercing-array', amount: 1, weaponMode: 'Auto Pulse' },
        { kind: 'missileModifier', effectId: 'swarm-missiles', amount: 2 },
        { kind: 'patternModifier', effectId: 'helix-pattern', amount: 1 },
        { kind: 'defenseModifier', effectId: 'emergency-shield', amount: 1 },
        { kind: 'mobilityModifier', effectId: 'micro-dash', amount: 1 },
        { kind: 'droneModifier', effectId: 'attack-drone', amount: 1 },
        { kind: 'economyModifier', effectId: 'salvage-protocols', amount: 1 },
        { kind: 'conditionalModifier', effectId: 'last-stand', amount: 1 },
        { kind: 'triggerModifier', effectId: 'chain-reaction', amount: 1, chancePercent: 15 },
        { kind: 'temporaryRoundModifier', effectId: 'experimental-loadout', amount: 1, durationMs: 12000 }
      ]
    };

    try {
      const bonuses = computeCardBonuses([cardId]);
      expect(bonuses.maxHealthBonus).toBe(2);
      expect(bonuses.weaponLevelBonus['Auto Pulse'] ?? 0).toBe(0);
      expect(bonuses.moneyMultiplierPercent).toBe(0);
    } finally {
      delete cardCatalogById[cardId];
    }
  });

  it('applies known effects while unknown scaffold kinds remain no-op', () => {
    const cardId = 'test-schema-apply';
    cardCatalogById[cardId] = {
      id: cardId,
      name: 'Schema Apply',
      description: 'Applies known and scaffold effects.',
      rarity: 'common',
      tags: ['defense'],
      cost: 0,
      maxStacks: 1,
      unlockRound: 1,
      shopWeight: 0,
      dropWeight: 0,
      effects: [
        { kind: 'maxHealth', amount: 3 },
        { kind: 'temporaryRoundModifier', effectId: 'temp', amount: 1, durationMs: 2000 }
      ]
    };

    const player = {
      id: 1,
      type: EntityType.Player,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: 0.6,
      health: 8,
      maxHealth: 10,
      weaponMode: 'Auto Pulse',
      weaponLevel: 1,
      weaponLevels: { 'Auto Pulse': 1, 'Heavy Cannon': 1, 'Sine SMG': 1 },
      podCount: 0,
      podWeaponMode: 'Auto Pulse' as const
    };

    const baseState = {
      health: 8,
      maxHealth: 10,
      weaponLevels: { 'Auto Pulse': 1, 'Heavy Cannon': 1, 'Sine SMG': 1 },
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
      expect(player.maxHealth).toBe(13);
      expect(player.health).toBe(8);
    } finally {
      delete cardCatalogById[cardId];
    }
  });
});
