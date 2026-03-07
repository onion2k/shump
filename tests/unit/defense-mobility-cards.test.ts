import { describe, expect, it } from 'vitest';
import { Game } from '../../src/game/core/Game';
import { EntityType, Faction } from '../../src/game/ecs/entityTypes';
import { cardCatalogById } from '../../src/game/content/cards';

const IDLE_POINTER = {
  hasPosition: false,
  x: 0,
  y: 0,
  leftButtonDown: false,
  rightButtonDown: false
};

function createEnemyBullet(game: Game, x: number, y: number, damage = 2) {
  return game.entities.create({
    type: EntityType.Bullet,
    faction: Faction.Enemy,
    position: { x, y },
    velocity: { x: 0, y: 0 },
    radius: 0.22,
    health: 1,
    maxHealth: 1,
    damage,
    lifetimeMs: 1000,
    projectileKind: 'standard'
  });
}

describe('defense and mobility card mechanics (milestone 4)', () => {
  it('repairs player health when entering between-round state', () => {
    const cardId = 'test-auto-repair-between-rounds';
    cardCatalogById[cardId] = {
      id: cardId,
      name: 'Auto Repair Test',
      description: 'Repairs hull between rounds.',
      rarity: 'uncommon',
      tags: ['defense'],
      cost: 0,
      maxStacks: 1,
      unlockRound: 1,
      shopWeight: 0,
      dropWeight: 0,
      effects: [{ kind: 'defenseModifier', effectId: 'auto-repair-systems', amount: 2 }]
    };

    try {
      const game = new Game();
      game.startFromRunProgress({
        seed: 7101,
        levelId: 'level-1',
        roundIndex: 1,
        inRunMoney: 0,
        foundCards: [],
        activeCards: [cardId],
        consumedCards: [],
        playerState: {
          health: 5,
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

      expect(game.enterBetweenRounds()).toBe(true);
      expect(player.health).toBeGreaterThan(5);
    } finally {
      delete cardCatalogById[cardId];
    }
  });

  it('grants brief invulnerability after taking damage with emergency shield', () => {
    const cardId = 'test-emergency-shield-window';
    cardCatalogById[cardId] = {
      id: cardId,
      name: 'Emergency Shield Test',
      description: 'Temporary invulnerability after hit.',
      rarity: 'rare',
      tags: ['defense'],
      cost: 0,
      maxStacks: 1,
      unlockRound: 1,
      shopWeight: 0,
      dropWeight: 0,
      effects: [{ kind: 'defenseModifier', effectId: 'emergency-shield', amount: 1 }]
    };

    try {
      const game = new Game();
      game.startFromRunProgress({
        seed: 7102,
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
          shieldCurrent: 0,
          shieldMax: 0,
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

      createEnemyBullet(game, player.position.x, player.position.y, 2);
      game.update(0.016, IDLE_POINTER);
      const afterFirstHit = player.health;
      expect(afterFirstHit).toBeLessThan(10);

      createEnemyBullet(game, player.position.x, player.position.y, 2);
      game.update(0.016, IDLE_POINTER);
      expect(player.health).toBe(afterFirstHit);
    } finally {
      delete cardCatalogById[cardId];
    }
  });

  it('reduces incoming damage with kinetic dampeners', () => {
    const cardId = 'test-kinetic-dampeners';
    cardCatalogById[cardId] = {
      id: cardId,
      name: 'Dampener Test',
      description: 'Damage reduction.',
      rarity: 'uncommon',
      tags: ['defense'],
      cost: 0,
      maxStacks: 1,
      unlockRound: 1,
      shopWeight: 0,
      dropWeight: 0,
      effects: [{ kind: 'defenseModifier', effectId: 'kinetic-dampeners', amount: 40 }]
    };

    try {
      const baseline = new Game();
      baseline.startNewRun(7103);
      const baselinePlayer = baseline.entities.all().find((entity) => entity.type === EntityType.Player);
      expect(baselinePlayer).toBeTruthy();
      if (!baselinePlayer) {
        return;
      }
      baselinePlayer.shieldCurrent = 0;
      baselinePlayer.shieldMax = 0;
      createEnemyBullet(baseline, baselinePlayer.position.x, baselinePlayer.position.y, 4);
      baseline.update(0.016, IDLE_POINTER);

      const reduced = new Game();
      reduced.startFromRunProgress({
        seed: 7104,
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
          shieldCurrent: 0,
          shieldMax: 0,
          shieldRechargeDelayMs: 1400,
          shieldRechargeTimeMs: 3600,
          shieldRechargeDelayRemainingMs: 0
        },
        elapsedMs: 0,
        distanceTraveled: 0,
        score: 0
      });
      const reducedPlayer = reduced.entities.all().find((entity) => entity.type === EntityType.Player);
      expect(reducedPlayer).toBeTruthy();
      if (!reducedPlayer) {
        return;
      }
      createEnemyBullet(reduced, reducedPlayer.position.x, reducedPlayer.position.y, 4);
      reduced.update(0.016, IDLE_POINTER);

      expect(reducedPlayer.health).toBeGreaterThan(baselinePlayer.health);
    } finally {
      delete cardCatalogById[cardId];
    }
  });

  it('periodically restores shield with energy barrier', () => {
    const cardId = 'test-energy-barrier';
    cardCatalogById[cardId] = {
      id: cardId,
      name: 'Energy Barrier Test',
      description: 'Periodic shield restoration.',
      rarity: 'rare',
      tags: ['defense'],
      cost: 0,
      maxStacks: 1,
      unlockRound: 1,
      shopWeight: 0,
      dropWeight: 0,
      effects: [{ kind: 'defenseModifier', effectId: 'energy-barrier', amount: 1 }]
    };

    try {
      const game = new Game();
      game.startNewRun(7105);
      const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
      expect(player).toBeTruthy();
      if (!player) {
        return;
      }

      player.shieldCurrent = 0;
      player.shieldRechargeDelayMs = 999999;
      player.shieldRechargeDelayRemainingMs = 999999;
      game.activateFoundCard(cardId); // no-op if not found; keep runtime clean
      const run = game.exportRunProgress();
      if (!run) {
        return;
      }
      run.activeCards = [cardId];
      game.startFromRunProgress(run);

      const restartedPlayer = game.entities.all().find((entity) => entity.type === EntityType.Player);
      expect(restartedPlayer).toBeTruthy();
      if (!restartedPlayer) {
        return;
      }
      restartedPlayer.shieldCurrent = 0;
      restartedPlayer.shieldRechargeDelayMs = 999999;
      restartedPlayer.shieldRechargeDelayRemainingMs = 999999;

      game.update(0.1, IDLE_POINTER);
      expect(restartedPlayer.shieldCurrent ?? 0).toBeGreaterThan(0);
    } finally {
      delete cardCatalogById[cardId];
    }
  });

  it('adds dash burst and slipstream ramping movement speed', () => {
    const dashCardId = 'test-micro-dash';
    const slipstreamCardId = 'test-slipstream';
    cardCatalogById[dashCardId] = {
      id: dashCardId,
      name: 'Dash Test',
      description: 'Short directional burst.',
      rarity: 'uncommon',
      tags: ['mobility'],
      cost: 0,
      maxStacks: 1,
      unlockRound: 1,
      shopWeight: 0,
      dropWeight: 0,
      effects: [{ kind: 'mobilityModifier', effectId: 'micro-dash-system', amount: 1 }]
    };
    cardCatalogById[slipstreamCardId] = {
      id: slipstreamCardId,
      name: 'Slipstream Test',
      description: 'Ramping speed while moving.',
      rarity: 'rare',
      tags: ['mobility'],
      cost: 0,
      maxStacks: 1,
      unlockRound: 1,
      shopWeight: 0,
      dropWeight: 0,
      effects: [{ kind: 'mobilityModifier', effectId: 'slipstream-drive', amount: 1 }]
    };

    try {
      const baseline = new Game();
      baseline.startNewRun(7106);
      const baselinePlayer = baseline.entities.all().find((entity) => entity.type === EntityType.Player);
      expect(baselinePlayer).toBeTruthy();
      if (!baselinePlayer) {
        return;
      }
      baseline.update(0.016, {
        hasPosition: true,
        x: baselinePlayer.position.x + 6,
        y: baselinePlayer.position.y,
        leftButtonDown: false,
        rightButtonDown: true
      });
      const baselineX = baselinePlayer.position.x;

      const dashGame = new Game();
      dashGame.startFromRunProgress({
        seed: 7107,
        levelId: 'level-1',
        roundIndex: 1,
        inRunMoney: 0,
        foundCards: [],
        activeCards: [dashCardId, slipstreamCardId],
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
      const dashPlayer = dashGame.entities.all().find((entity) => entity.type === EntityType.Player);
      expect(dashPlayer).toBeTruthy();
      if (!dashPlayer) {
        return;
      }

      dashGame.update(0.016, {
        hasPosition: true,
        x: dashPlayer.position.x + 6,
        y: dashPlayer.position.y,
        leftButtonDown: false,
        rightButtonDown: true
      });
      expect(dashPlayer.position.x - baselineX).toBeGreaterThan(1);

      dashGame.update(0.1, {
        hasPosition: true,
        x: dashPlayer.position.x + 100,
        y: dashPlayer.position.y,
        leftButtonDown: false,
        rightButtonDown: false
      });
      const earlySpeed = Math.hypot(dashPlayer.velocity.x, dashPlayer.velocity.y);
      for (let i = 0; i < 8; i += 1) {
        dashGame.update(0.1, {
          hasPosition: true,
          x: dashPlayer.position.x + 100,
          y: dashPlayer.position.y,
          leftButtonDown: false,
          rightButtonDown: false
        });
      }
      const lateSpeed = Math.hypot(dashPlayer.velocity.x, dashPlayer.velocity.y);
      expect(lateSpeed).toBeGreaterThan(earlySpeed);
    } finally {
      delete cardCatalogById[dashCardId];
      delete cardCatalogById[slipstreamCardId];
    }
  });
});
