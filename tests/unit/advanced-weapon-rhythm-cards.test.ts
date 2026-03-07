import { describe, expect, it } from 'vitest';
import { Game } from '../../src/game/core/Game';
import { createCardRuntimeState } from '../../src/game/core/cardRuntimeState';
import { cardCatalogById } from '../../src/game/content/cards';
import { EntityManager } from '../../src/game/ecs/EntityManager';
import { EntityType, Faction } from '../../src/game/ecs/entityTypes';
import { createBullet } from '../../src/game/factories/createBullet';
import { damageSystem } from '../../src/game/systems/damageSystem';
import { computeCardBonuses } from '../../src/game/systems/cardEffectSystem';
import { runCardProjectilePostHitHooks, runCardProjectilePrefireHooks } from '../../src/game/systems/cardProjectileResolver';
import { tickCardTemporaryEffectHooks } from '../../src/game/systems/cardTemporaryEffectResolver';
import { runCardEntityDestroyedTriggerHooks, runCardWeaponFiredTriggerHooks } from '../../src/game/systems/cardTriggerResolver';
import type { CollisionPair } from '../../src/game/systems/collisionSystem';

const IDLE_POINTER = {
  hasPosition: false,
  x: 0,
  y: 0,
  leftButtonDown: false,
  rightButtonDown: false
};

function buildRunProgress(activeCards: string[], seed: number) {
  return {
    seed,
    levelId: 'level-1',
    roundIndex: 3,
    inRunMoney: 0,
    foundCards: [],
    activeCards,
    consumedCards: [],
    playerState: {
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
    },
    elapsedMs: 0,
    distanceTraveled: 0,
    score: 0
  };
}

describe('advanced weapon/rhythm card mechanics (milestone 6)', () => {
  it('tracks continuous fire timing and shot counters for trigger modifiers', () => {
    const runtimeState = createCardRuntimeState(9101);
    const bonuses = computeCardBonuses([]);

    const first = runCardWeaponFiredTriggerHooks({
      event: {
        type: 'WeaponFired',
        atMs: 0,
        shooterId: 1,
        shooterFaction: Faction.Player,
        weaponMode: 'Auto Pulse',
        projectileEntityId: 10
      },
      bonuses,
      runtimeState
    });
    expect(first.shotCounter).toBe(1);
    expect(first.consecutiveShootingMs).toBe(0);

    const second = runCardWeaponFiredTriggerHooks({
      event: {
        type: 'WeaponFired',
        atMs: 120,
        shooterId: 1,
        shooterFaction: Faction.Player,
        weaponMode: 'Auto Pulse',
        projectileEntityId: 11
      },
      bonuses,
      runtimeState: first
    });
    expect(second.shotCounter).toBe(2);
    expect(second.consecutiveShootingMs).toBe(120);

    const third = runCardWeaponFiredTriggerHooks({
      event: {
        type: 'WeaponFired',
        atMs: 520,
        shooterId: 1,
        shooterFaction: Faction.Player,
        weaponMode: 'Auto Pulse',
        projectileEntityId: 12
      },
      bonuses,
      runtimeState: second
    });
    expect(third.consecutiveShootingMs).toBe(0);
  });

  it('applies rapid venting windows and perfect-timing temporary buffs on fast kills', () => {
    const cardId = 'test-step6-trigger-hooks';
    cardCatalogById[cardId] = {
      id: cardId,
      name: 'Step 6 Trigger Test',
      description: 'Rapid venting + perfect timing.',
      rarity: 'rare',
      tags: ['weapon'],
      cost: 0,
      maxStacks: 1,
      unlockRound: 1,
      shopWeight: 0,
      dropWeight: 0,
      effects: [
        { kind: 'triggerModifier', effectId: 'rapid-venting', amount: 1 },
        { kind: 'conditionalModifier', effectId: 'perfect-timing', amount: 1 }
      ]
    };

    try {
      const bonuses = computeCardBonuses([cardId]);
      const runtimeState = createCardRuntimeState(9102);
      const next = runCardEntityDestroyedTriggerHooks({
        event: {
          type: 'EntityDestroyed',
          atMs: 450,
          entityId: 101,
          entityType: EntityType.Enemy,
          entityFaction: Faction.Enemy,
          entityAgeMs: 700,
          reason: 'health'
        },
        bonuses,
        runtimeState
      });

      expect(next.chainKillStreak).toBe(1);
      expect(next.rapidVentingUntilMs).toBeGreaterThan(450);
      expect(next.temporaryRoundEffects.some((effect) => effect.effectId === 'perfect-timing-bonus')).toBe(true);
    } finally {
      delete cardCatalogById[cardId];
    }
  });

  it('fires burst volleys when burst chamber is active', () => {
    const baseline = new Game();
    baseline.startNewRun(9103);
    const baselinePlayer = baseline.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(baselinePlayer).toBeTruthy();
    if (!baselinePlayer) {
      return;
    }
    baselinePlayer.weaponMode = 'Auto Pulse';
    baselinePlayer.weaponEnergy = 100;
    baselinePlayer.weaponEnergyRegenPerSecond = 0;
    baseline.update(0.2, IDLE_POINTER);
    const baselineShots = baseline.entities
      .all()
      .filter((entity) => entity.type === EntityType.Bullet && entity.faction === Faction.Player && entity.projectileKind === 'standard').length;

    const burstGame = new Game();
    burstGame.startFromRunProgress(buildRunProgress(['burst-chamber'], 9104));
    const burstPlayer = burstGame.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(burstPlayer).toBeTruthy();
    if (!burstPlayer) {
      return;
    }
    burstPlayer.weaponMode = 'Auto Pulse';
    burstPlayer.weaponEnergy = 100;
    burstPlayer.weaponEnergyRegenPerSecond = 0;
    burstGame.update(0.2, IDLE_POINTER);
    const burstShots = burstGame.entities
      .all()
      .filter((entity) => entity.type === EntityType.Bullet && entity.faction === Faction.Player && entity.projectileKind === 'standard').length;

    expect(burstShots).toBeGreaterThan(baselineShots);
  });

  it('spawns side and rear pattern fire for crossfire module and rear turret', () => {
    const game = new Game();
    game.startFromRunProgress(buildRunProgress(['crossfire-module', 'rear-turret'], 9105));

    const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(player).toBeTruthy();
    if (!player) {
      return;
    }
    player.weaponEnergy = 0;
    player.weaponEnergyRegenPerSecond = 0;

    game.update(0.016, IDLE_POINTER);

    const sideShots = game.entities
      .all()
      .filter((entity) => entity.type === EntityType.Bullet && entity.faction === Faction.Player && Math.abs(entity.velocity.x) > 0.2);
    const rearShots = game.entities
      .all()
      .filter((entity) => entity.type === EntityType.Bullet && entity.faction === Faction.Player && entity.velocity.y < -0.2);

    expect(sideShots.length).toBeGreaterThan(0);
    expect(rearShots.length).toBeGreaterThan(0);
  });

  it('curves bullets toward enemies with magnetic rounds', () => {
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
    const bullet = entities.create(createBullet(0, 0.5, 10, Faction.Player, 1200, 1, 0.2, 0));
    entities.create({
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: 2.2, y: 2.2 },
      velocity: { x: 0, y: 0 },
      radius: 0.7,
      health: 5,
      maxHealth: 5
    });

    const runtimeState = createCardRuntimeState(9106);
    const bonuses = computeCardBonuses(['magnetic-rounds']);

    runCardProjectilePrefireHooks({
      entityManager: entities,
      playerId: player.id,
      deltaSeconds: 0.016,
      elapsedMs: 16,
      bonuses,
      runtimeState
    });

    expect(bullet.velocity.x).toBeGreaterThan(0);
  });

  it('applies thermal/drill status damage over time and radial bloom on kill', () => {
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
    const largeEnemy = entities.create({
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: 0, y: 2 },
      velocity: { x: 0, y: 0 },
      radius: 1.1,
      health: 8,
      maxHealth: 8
    });
    const doomedEnemy = entities.create({
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: 1.2, y: 2.1 },
      velocity: { x: 0, y: 0 },
      radius: 0.7,
      health: 1,
      maxHealth: 1
    });

    const dotBullet = entities.create(createBullet(0, 1.4, 10, Faction.Player, 1200, 2, 0.2, 0));
    const killBullet = entities.create(createBullet(1.2, 1.5, 10, Faction.Player, 1200, 1, 0.2, 0));
    const collisions: CollisionPair[] = [
      { a: dotBullet, b: largeEnemy },
      { a: killBullet, b: doomedEnemy }
    ];

    const bonuses = computeCardBonuses(['thermal-rounds', 'drill-rounds', 'radial-bloom']);
    const runtimeState = createCardRuntimeState(9107);
    const scoreDelta = damageSystem(collisions);
    const post = runCardProjectilePostHitHooks({
      entityManager: entities,
      playerId: player.id,
      collisions,
      scoreDelta,
      deltaSeconds: 0.016,
      elapsedMs: 16,
      bonuses,
      runtimeState
    });

    const afterHitHealth = largeEnemy.health;
    expect(largeEnemy.statusEffects?.some((effect) => effect.effectId === 'thermal-rounds-burn')).toBe(true);
    expect(largeEnemy.statusEffects?.some((effect) => effect.effectId === 'drill-rounds-bore')).toBe(true);

    tickCardTemporaryEffectHooks({
      runtimeState: post.runtimeState,
      entityManager: entities,
      playerId: player.id,
      bonuses,
      deltaSeconds: 0.5,
      elapsedMs: 516
    });

    expect(largeEnemy.health).toBeLessThan(afterHitHealth);

    const bloomShots = entities
      .all()
      .filter((entity) => entity.type === EntityType.Bullet && entity.faction === Faction.Player && entity.id !== dotBullet.id && entity.id !== killBullet.id);
    expect(bloomShots.length).toBeGreaterThanOrEqual(4);
  });
});
