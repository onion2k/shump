import { describe, expect, it } from 'vitest';
import { Game } from '../../src/game/core/Game';
import { EntityType, Faction } from '../../src/game/ecs/entityTypes';
import { cardCatalogById } from '../../src/game/content/cards';
import { computeCardBonuses } from '../../src/game/systems/cardEffectSystem';
import { damageSystem } from '../../src/game/systems/damageSystem';
import { createCardRuntimeState } from '../../src/game/core/cardRuntimeState';
import { EntityManager } from '../../src/game/ecs/EntityManager';
import { createBullet } from '../../src/game/factories/createBullet';
import { runCardProjectilePostHitHooks } from '../../src/game/systems/cardProjectileResolver';
import type { CollisionPair } from '../../src/game/systems/collisionSystem';

const IDLE_POINTER = {
  hasPosition: false,
  x: 0,
  y: 0,
  leftButtonDown: false,
  rightButtonDown: false
};

describe('weapon/projectile card mechanics (milestone 2)', () => {
  it('boosts continuous laser damage with overcharged capacitors', () => {
    const baseline = new Game();
    baseline.startNewRun(501);
    const baselinePlayer = baseline.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(baselinePlayer).toBeTruthy();
    if (!baselinePlayer) {
      return;
    }
    baselinePlayer.weaponMode = 'Continuous Laser';
    baselinePlayer.unlockedWeaponModes = ['Auto Pulse', 'Continuous Laser'];
    baselinePlayer.weaponEnergy = 100;
    baselinePlayer.weaponEnergyRegenPerSecond = 0;
    const baselineEnemy = baseline.entities.create({
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: baselinePlayer.position.x, y: baselinePlayer.position.y + 2.4 },
      velocity: { x: 0, y: 0 },
      radius: 0.7,
      health: 14,
      maxHealth: 14
    });

    baseline.update(0.2, IDLE_POINTER);
    const baselineHealth = baselineEnemy.health;

    const cardId = 'test-overcharged-laser';
    cardCatalogById[cardId] = {
      id: cardId,
      name: 'Test Laser Amp',
      description: 'Amplifies laser damage.',
      rarity: 'rare',
      tags: ['weapon', 'laser'],
      cost: 0,
      maxStacks: 1,
      unlockRound: 1,
      shopWeight: 0,
      dropWeight: 0,
      effects: [{ kind: 'weaponAmplifier', effectId: 'overcharged-capacitors-damage', amount: 60, weaponMode: 'Continuous Laser' }]
    };

    try {
      const boosted = new Game();
      boosted.startFromRunProgress({
        seed: 502,
        levelId: 'level-1',
        roundIndex: 1,
        inRunMoney: 0,
        foundCards: [],
        activeCards: [cardId],
        consumedCards: [],
        playerState: {
          health: 10,
          maxHealth: 10,
          weaponLevels: { 'Auto Pulse': 1, 'Continuous Laser': 1, 'Heavy Cannon': 1, 'Sine SMG': 1 },
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
      });
      const boostedPlayer = boosted.entities.all().find((entity) => entity.type === EntityType.Player);
      expect(boostedPlayer).toBeTruthy();
      if (!boostedPlayer) {
        return;
      }
      boostedPlayer.weaponMode = 'Continuous Laser';
      boostedPlayer.unlockedWeaponModes = ['Auto Pulse', 'Continuous Laser'];
      boostedPlayer.weaponEnergy = 100;
      boostedPlayer.weaponEnergyRegenPerSecond = 0;
      const boostedEnemy = boosted.entities.create({
        type: EntityType.Enemy,
        faction: Faction.Enemy,
        position: { x: boostedPlayer.position.x, y: boostedPlayer.position.y + 2.4 },
        velocity: { x: 0, y: 0 },
        radius: 0.7,
        health: 14,
        maxHealth: 14
      });

      boosted.update(0.2, IDLE_POINTER);
      expect(boostedEnemy.health).toBeLessThan(baselineHealth);
    } finally {
      delete cardCatalogById[cardId];
    }
  });

  it('supports pierce and ricochet projectile metadata in damage resolution', () => {
    const bulletWithPierce = {
      id: 1,
      type: EntityType.Bullet,
      faction: Faction.Player,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 5 },
      radius: 0.2,
      health: 1,
      maxHealth: 1,
      damage: 2,
      pierceRemaining: 1
    };
    const enemy = {
      id: 2,
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: 0.7,
      health: 4,
      maxHealth: 4
    };
    damageSystem([{ a: bulletWithPierce, b: enemy } as CollisionPair]);
    expect(bulletWithPierce.health).toBe(1);
    expect(bulletWithPierce.pierceRemaining).toBe(0);

    const bulletWithRicochet = {
      id: 3,
      type: EntityType.Bullet,
      faction: Faction.Player,
      position: { x: 0, y: 0 },
      velocity: { x: 1, y: 5 },
      radius: 0.2,
      health: 1,
      maxHealth: 1,
      damage: 2,
      ricochetRemaining: 1
    };
    const enemy2 = {
      id: 4,
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: 0.7,
      health: 4,
      maxHealth: 4
    };
    damageSystem([{ a: bulletWithRicochet, b: enemy2 } as CollisionPair]);
    expect(bulletWithRicochet.health).toBe(1);
    expect(bulletWithRicochet.ricochetRemaining).toBe(0);
    expect(bulletWithRicochet.velocity.y).toBeLessThan(0);
  });

  it('applies splash and chain-reaction trigger effects from cards', () => {
    const cardId = 'test-splash-chain';
    cardCatalogById[cardId] = {
      id: cardId,
      name: 'Splash Chain',
      description: 'Splash + guaranteed chain.',
      rarity: 'rare',
      tags: ['weapon'],
      cost: 0,
      maxStacks: 1,
      unlockRound: 1,
      shopWeight: 0,
      dropWeight: 0,
      effects: [
        { kind: 'projectileModifier', effectId: 'explosive-payload-radius', amount: 2.2 },
        { kind: 'triggerModifier', effectId: 'chain-reaction', amount: 100, chancePercent: 100 }
      ]
    };

    try {
      const entities = new EntityManager();
      const player = entities.create({
        type: EntityType.Player,
        faction: Faction.Player,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        radius: 0.9,
        health: 10,
        maxHealth: 10
      });

      const killedEnemy = entities.create({
        type: EntityType.Enemy,
        faction: Faction.Enemy,
        position: { x: 0, y: 2.3 },
        velocity: { x: 0, y: 0 },
        radius: 0.7,
        health: 1,
        maxHealth: 1
      });
      const splashEnemy = entities.create({
        type: EntityType.Enemy,
        faction: Faction.Enemy,
        position: { x: 1.3, y: 2.3 },
        velocity: { x: 0, y: 0 },
        radius: 0.7,
        health: 5,
        maxHealth: 5
      });
      const chainEnemy = entities.create({
        type: EntityType.Enemy,
        faction: Faction.Enemy,
        position: { x: 2.3, y: 2.3 },
        velocity: { x: 0, y: 0 },
        radius: 0.7,
        health: 4,
        maxHealth: 4
      });
      const bullet = entities.create(
        createBullet(0, 1.6, 12, Faction.Player, 1200, 1, 0.22, 0, {
          splashRadius: 2.2
        })
      );
      const collisions: CollisionPair[] = [{ a: bullet, b: killedEnemy }];
      const bonuses = computeCardBonuses([cardId]);
      const runtimeState = createCardRuntimeState(503);
      const collisionScoreDelta = damageSystem(collisions);
      runCardProjectilePostHitHooks({
        entityManager: entities,
        playerId: player.id,
        collisions,
        scoreDelta: collisionScoreDelta,
        deltaSeconds: 0.016,
        elapsedMs: 16,
        bonuses,
        runtimeState
      });

      expect(splashEnemy.health).toBeLessThan(5);
      expect(chainEnemy.health).toBeLessThan(4);
    } finally {
      delete cardCatalogById[cardId];
    }
  });

  it('fires pattern-driven extra volleys for pulse discharge and vector scatter', () => {
    const cardId = 'test-pattern-volley';
    cardCatalogById[cardId] = {
      id: cardId,
      name: 'Pattern Volley',
      description: 'Pattern hook test.',
      rarity: 'rare',
      tags: ['weapon'],
      cost: 0,
      maxStacks: 1,
      unlockRound: 1,
      shopWeight: 0,
      dropWeight: 0,
      effects: [
        { kind: 'patternModifier', effectId: 'pulse-discharge', amount: 1 },
        { kind: 'patternModifier', effectId: 'vector-scatter', amount: 1 }
      ]
    };

    try {
      const game = new Game();
      game.startFromRunProgress({
        seed: 504,
        levelId: 'level-1',
        roundIndex: 1,
        inRunMoney: 0,
        foundCards: [],
        activeCards: [cardId],
        consumedCards: [],
        playerState: {
          health: 10,
          maxHealth: 10,
          weaponLevels: { 'Auto Pulse': 1, 'Continuous Laser': 1, 'Heavy Cannon': 1, 'Sine SMG': 1 },
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
      });

      const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
      expect(player).toBeTruthy();
      if (!player) {
        return;
      }
      player.weaponEnergy = 0;
      player.weaponEnergyRegenPerSecond = 0;

      game.update(0.016, IDLE_POINTER);
      const bullets = game.entities
        .all()
        .filter((entity) => entity.type === EntityType.Bullet && entity.faction === Faction.Player && entity.projectileKind === 'standard');
      expect(bullets.length).toBeGreaterThanOrEqual(10);
    } finally {
      delete cardCatalogById[cardId];
    }
  });
});
