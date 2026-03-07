import { describe, expect, it } from 'vitest';
import { Game } from '../../src/game/core/Game';
import { EntityManager } from '../../src/game/ecs/EntityManager';
import { EntityType, Faction } from '../../src/game/ecs/entityTypes';
import { cardCatalogById } from '../../src/game/content/cards';
import { computeCardBonuses } from '../../src/game/systems/cardEffectSystem';
import { createCardRuntimeState } from '../../src/game/core/cardRuntimeState';
import { createMissile } from '../../src/game/factories/createMissile';
import { damageSystem } from '../../src/game/systems/damageSystem';
import { runCardProjectilePostHitHooks } from '../../src/game/systems/cardProjectileResolver';
import type { CollisionPair } from '../../src/game/systems/collisionSystem';

const IDLE_POINTER = {
  hasPosition: false,
  x: 0,
  y: 0,
  leftButtonDown: false,
  rightButtonDown: false
};

describe('missile modifier card mechanics (milestone 3)', () => {
  it('launches missile swarms with stronger guidance from pod cards', () => {
    const cardId = 'test-missile-swarm-guidance';
    cardCatalogById[cardId] = {
      id: cardId,
      name: 'Swarm Guidance Test',
      description: 'Pods launch swarms with stronger turn rates.',
      rarity: 'rare',
      tags: ['pod', 'missile'],
      cost: 0,
      maxStacks: 1,
      unlockRound: 1,
      shopWeight: 0,
      dropWeight: 0,
      effects: [
        { kind: 'missileModifier', effectId: 'swarm-missiles', amount: 1 },
        { kind: 'missileModifier', effectId: 'guidance-upgrade', amount: 45 }
      ]
    };

    try {
      const game = new Game();
      game.startFromRunProgress({
        seed: 6101,
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
          podCount: 1,
          podWeaponMode: 'Homing Missile',
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
      game.entities.create({
        type: EntityType.Enemy,
        faction: Faction.Enemy,
        position: { x: player.position.x + 0.2, y: player.position.y + 2.6 },
        velocity: { x: 0, y: 0 },
        radius: 0.7,
        health: 8,
        maxHealth: 8
      });

      game.update(0.05, IDLE_POINTER);
      const missiles = game.entities
        .all()
        .filter((entity) => entity.type === EntityType.Bullet && entity.projectileKind === 'missile' && entity.faction === Faction.Player);
      expect(missiles.length).toBeGreaterThanOrEqual(3);
      expect(Math.min(...missiles.map((missile) => missile.homingTurnRate ?? 0))).toBeGreaterThan(7.5);
    } finally {
      delete cardCatalogById[cardId];
    }
  });

  it('arms delayed detonation missiles and explodes after fuse time', () => {
    const cardId = 'test-delayed-detonation';
    cardCatalogById[cardId] = {
      id: cardId,
      name: 'Delayed Detonation Test',
      description: 'Missiles embed then detonate.',
      rarity: 'rare',
      tags: ['pod', 'missile'],
      cost: 0,
      maxStacks: 1,
      unlockRound: 1,
      shopWeight: 0,
      dropWeight: 0,
      effects: [{ kind: 'missileModifier', effectId: 'delayed-detonation', amount: 1 }]
    };

    try {
      const bonuses = computeCardBonuses([cardId]);
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
      const impactEnemy = entities.create({
        type: EntityType.Enemy,
        faction: Faction.Enemy,
        position: { x: 0, y: 2 },
        velocity: { x: 0, y: 0 },
        radius: 0.7,
        health: 3,
        maxHealth: 3
      });
      const nearbyEnemy = entities.create({
        type: EntityType.Enemy,
        faction: Faction.Enemy,
        position: { x: 1.4, y: 2.1 },
        velocity: { x: 0, y: 0 },
        radius: 0.7,
        health: 6,
        maxHealth: 6
      });
      const missile = entities.create(
        createMissile(0, 1.4, 0, 16, Faction.Player, impactEnemy.id, {
          metadata: { splashRadius: 2.6 }
        })
      );
      const collisions: CollisionPair[] = [{ a: missile, b: impactEnemy }];
      const collisionScore = damageSystem(collisions);
      const runtimeState = createCardRuntimeState(6102);

      runCardProjectilePostHitHooks({
        entityManager: entities,
        playerId: player.id,
        collisions,
        scoreDelta: collisionScore,
        deltaSeconds: 0.016,
        elapsedMs: 16,
        bonuses,
        runtimeState
      });

      expect(missile.health).toBeGreaterThan(0);
      expect(missile.faction).toBeUndefined();
      expect(nearbyEnemy.health).toBe(6);

      runCardProjectilePostHitHooks({
        entityManager: entities,
        playerId: player.id,
        collisions: [],
        scoreDelta: 0,
        deltaSeconds: 0.6,
        elapsedMs: 616,
        bonuses,
        runtimeState
      });

      expect(missile.health).toBeLessThanOrEqual(0);
      expect(nearbyEnemy.health).toBeLessThan(6);
    } finally {
      delete cardCatalogById[cardId];
    }
  });

  it('adds cluster split metadata to pod missiles', () => {
    const cardId = 'test-cluster-metadata';
    cardCatalogById[cardId] = {
      id: cardId,
      name: 'Cluster Metadata Test',
      description: 'Pod missiles split on impact.',
      rarity: 'rare',
      tags: ['pod', 'missile'],
      cost: 0,
      maxStacks: 1,
      unlockRound: 1,
      shopWeight: 0,
      dropWeight: 0,
      effects: [{ kind: 'missileModifier', effectId: 'cluster-warheads', amount: 1 }]
    };

    try {
      const game = new Game();
      game.startFromRunProgress({
        seed: 6103,
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
          podCount: 1,
          podWeaponMode: 'Homing Missile',
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
      game.entities.create({
        type: EntityType.Enemy,
        faction: Faction.Enemy,
        position: { x: player.position.x, y: player.position.y + 2.2 },
        velocity: { x: 0, y: 0 },
        radius: 0.7,
        health: 8,
        maxHealth: 8
      });

      game.update(0.05, IDLE_POINTER);
      const missile = game.entities
        .all()
        .find((entity) => entity.type === EntityType.Bullet && entity.projectileKind === 'missile' && entity.faction === Faction.Player);
      expect(missile).toBeTruthy();
      expect(missile?.splitOnImpact).toBe(true);
      expect(missile?.splitSpec?.childCount).toBeGreaterThanOrEqual(4);
    } finally {
      delete cardCatalogById[cardId];
    }
  });

  it('applies shockwave knockback around missile explosions', () => {
    const cardId = 'test-shockwave-payload';
    cardCatalogById[cardId] = {
      id: cardId,
      name: 'Shockwave Test',
      description: 'Missiles apply radial knockback.',
      rarity: 'rare',
      tags: ['pod', 'missile'],
      cost: 0,
      maxStacks: 1,
      unlockRound: 1,
      shopWeight: 0,
      dropWeight: 0,
      effects: [{ kind: 'missileModifier', effectId: 'shockwave-payload', amount: 1 }]
    };

    try {
      const bonuses = computeCardBonuses([cardId]);
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
      const impactEnemy = entities.create({
        type: EntityType.Enemy,
        faction: Faction.Enemy,
        position: { x: 0, y: 2 },
        velocity: { x: 0, y: 0 },
        radius: 0.7,
        health: 5,
        maxHealth: 5
      });
      const nearbyEnemy = entities.create({
        type: EntityType.Enemy,
        faction: Faction.Enemy,
        position: { x: 1.3, y: 2 },
        velocity: { x: 0, y: 0 },
        radius: 0.7,
        health: 6,
        maxHealth: 6
      });
      const missile = entities.create(createMissile(0, 1.5, 0, 16, Faction.Player, impactEnemy.id));
      const collisions: CollisionPair[] = [{ a: missile, b: impactEnemy }];
      const collisionScore = damageSystem(collisions);
      const runtimeState = createCardRuntimeState(6104);

      runCardProjectilePostHitHooks({
        entityManager: entities,
        playerId: player.id,
        collisions,
        scoreDelta: collisionScore,
        deltaSeconds: 0.016,
        elapsedMs: 16,
        bonuses,
        runtimeState
      });

      expect(Math.hypot(nearbyEnemy.velocity.x, nearbyEnemy.velocity.y)).toBeGreaterThan(0.01);
    } finally {
      delete cardCatalogById[cardId];
    }
  });
});
