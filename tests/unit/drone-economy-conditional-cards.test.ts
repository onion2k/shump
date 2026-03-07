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

function buildRunProgress(activeCards: string[], seed: number, inRunMoney = 0) {
  return {
    seed,
    levelId: 'level-1',
    roundIndex: 2,
    inRunMoney,
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

describe('drone/economy/conditional card mechanics (milestone 5)', () => {
  it('fires support shots and intercepts hostile bullets from drone cards', () => {
    const game = new Game();
    game.startFromRunProgress(buildRunProgress(['attack-drone', 'orbital-gun-platform', 'interceptor-drone'], 8101));

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
      position: { x: player.position.x + 0.4, y: player.position.y + 2.4 },
      velocity: { x: 0, y: 0 },
      radius: 0.7,
      health: 6,
      maxHealth: 6
    });
    game.entities.create({
      type: EntityType.Bullet,
      faction: Faction.Enemy,
      position: { x: player.position.x + 0.3, y: player.position.y + 0.4 },
      velocity: { x: 0, y: 0 },
      radius: 0.16,
      health: 1,
      maxHealth: 1,
      damage: 1,
      lifetimeMs: 900,
      projectileKind: 'standard'
    });

    game.update(0.016, IDLE_POINTER);
    const playerBullets = game.entities
      .all()
      .filter((entity) => entity.type === EntityType.Bullet && entity.faction === Faction.Player && entity.projectileKind === 'standard');
    const hostileBullets = game.entities
      .all()
      .filter((entity) => entity.type === EntityType.Bullet && entity.faction === Faction.Enemy && entity.health > 0);
    expect(playerBullets.length).toBeGreaterThanOrEqual(2);
    expect(hostileBullets.length).toBe(0);
  });

  it('applies efficient-engineering discounts to card purchases', () => {
    const game = new Game();
    game.startFromRunProgress(buildRunProgress(['efficient-engineering'], 8102, 40));

    const purchased = game.buyCard('pulse-overclock');
    expect(purchased).toBe(true);
    expect(game.snapshot().inRunMoney).toBe(1);
  });

  it('duplicates collected card pickups when duplicate systems procs', () => {
    const cardId = 'test-duplicate-systems-guaranteed';
    cardCatalogById[cardId] = {
      id: cardId,
      name: 'Duplicate Test',
      description: 'Guaranteed duplicate chance.',
      rarity: 'rare',
      tags: ['economy'],
      cost: 0,
      maxStacks: 1,
      unlockRound: 1,
      shopWeight: 0,
      dropWeight: 0,
      effects: [{ kind: 'economyModifier', effectId: 'duplicate-systems', amount: 100 }]
    };

    try {
      const game = new Game();
      game.startFromRunProgress(buildRunProgress([cardId], 8103));

      const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
      expect(player).toBeTruthy();
      if (!player) {
        return;
      }
      game.entities.create({
        type: EntityType.Pickup,
        position: { x: player.position.x, y: player.position.y },
        velocity: { x: 0, y: 0 },
        radius: 0.5,
        health: 1,
        maxHealth: 1,
        pickupKind: 'card',
        pickupValue: 1,
        pickupCardId: 'reinforced-hull'
      });

      game.update(0.016, IDLE_POINTER);
      const copies = game.snapshot().foundCards.filter((id) => id === 'reinforced-hull').length;
      expect(copies).toBe(2);
    } finally {
      delete cardCatalogById[cardId];
    }
  });

  it('applies glass-reactor tradeoff and boosts outgoing damage', () => {
    const baseline = new Game();
    baseline.startNewRun(8104);
    const baselinePlayer = baseline.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(baselinePlayer).toBeTruthy();
    if (!baselinePlayer) {
      return;
    }
    baselinePlayer.weaponMode = 'Continuous Laser';
    baselinePlayer.unlockedWeaponModes = ['Auto Pulse', 'Continuous Laser'];
    baselinePlayer.weaponLevels = {
      ...(baselinePlayer.weaponLevels ?? {}),
      'Continuous Laser': 5
    };
    baselinePlayer.weaponLevel = 5;
    baselinePlayer.weaponEnergy = 100;
    baselinePlayer.weaponEnergyRegenPerSecond = 0;
    const baselineEnemy = baseline.entities.create({
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: baselinePlayer.position.x, y: baselinePlayer.position.y + 2.2 },
      velocity: { x: 0, y: 0 },
      radius: 0.7,
      health: 10,
      maxHealth: 10
    });
    baseline.update(0.2, IDLE_POINTER);

    const glass = new Game();
    glass.startFromRunProgress(buildRunProgress(['glass-reactor'], 8105));
    const glassPlayer = glass.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(glassPlayer).toBeTruthy();
    if (!glassPlayer) {
      return;
    }
    glassPlayer.weaponMode = 'Continuous Laser';
    glassPlayer.unlockedWeaponModes = ['Auto Pulse', 'Continuous Laser'];
    glassPlayer.weaponLevels = {
      ...(glassPlayer.weaponLevels ?? {}),
      'Continuous Laser': 5
    };
    glassPlayer.weaponLevel = 5;
    glassPlayer.weaponEnergy = 100;
    glassPlayer.weaponEnergyRegenPerSecond = 0;
    const glassEnemy = glass.entities.create({
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: glassPlayer.position.x, y: glassPlayer.position.y + 2.2 },
      velocity: { x: 0, y: 0 },
      radius: 0.7,
      health: 10,
      maxHealth: 10
    });
    glass.update(0.2, IDLE_POINTER);

    expect(glassPlayer.maxHealth).toBeLessThan(baselinePlayer.maxHealth);
    expect(glassEnemy.health).toBeLessThan(baselineEnemy.health);
  });

  it('supports volatile-ammunition misfire risk behavior', () => {
    const cardId = 'test-volatile-guaranteed-misfire';
    cardCatalogById[cardId] = {
      id: cardId,
      name: 'Volatile Misfire Test',
      description: 'Always misfires for deterministic coverage.',
      rarity: 'rare',
      tags: ['weapon'],
      cost: 0,
      maxStacks: 1,
      unlockRound: 1,
      shopWeight: 0,
      dropWeight: 0,
      effects: [
        { kind: 'conditionalModifier', effectId: 'volatile-ammunition-damage', amount: 50 },
        { kind: 'conditionalModifier', effectId: 'volatile-ammunition-misfire', amount: 100 }
      ]
    };

    try {
      const game = new Game();
      game.startFromRunProgress(buildRunProgress([cardId], 8106));
      const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
      expect(player).toBeTruthy();
      if (!player) {
        return;
      }
      player.weaponEnergy = 100;
      player.weaponEnergyRegenPerSecond = 0;

      game.update(0.2, {
        hasPosition: true,
        x: player.position.x,
        y: player.position.y + 6,
        leftButtonDown: false,
        rightButtonDown: false
      });

      const playerBullets = game.entities
        .all()
        .filter((entity) => entity.type === EntityType.Bullet && entity.faction === Faction.Player && entity.projectileKind === 'standard');
      expect(playerBullets.length).toBe(0);
    } finally {
      delete cardCatalogById[cardId];
    }
  });
});
