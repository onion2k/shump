import { describe, expect, it } from 'vitest';
import { Game } from '../../src/game/core/Game';
import { GameState } from '../../src/game/core/GameState';
import { EntityType } from '../../src/game/ecs/entityTypes';

describe('Game between-round flow', () => {
  it('consumes health upgrade cards and applies permanent hull upgrades', () => {
    const game = new Game();
    game.startFromRunProgress({
      seed: 5,
      levelId: 'level-1',
      roundIndex: 1,
      inRunMoney: 80,
      foundCards: ['reinforced-hull'],
      activeCards: ['pulse-overclock', 'laser-calibrator', 'cannon-breach', 'harmonic-tuner'],
      consumedCards: [],
      playerState: {
        health: 10,
        maxHealth: 10,
        weaponLevels: {
          'Auto Pulse': 1
        },
        podCount: 0,
        podWeaponMode: 'Auto Pulse'
      },
      elapsedMs: 0,
      distanceTraveled: 0,
      score: 0
    });

    expect(game.enterBetweenRounds()).toBe(true);
    expect(game.snapshot().state).toBe(GameState.BetweenRounds);

    game.openShop();
    expect(game.snapshot().state).toBe(GameState.Shop);

    expect(game.buyCard('reinforced-hull')).toBe(true);
    expect(game.snapshot().inRunMoney).toBe(44);
    expect(game.snapshot().foundCards.filter((card) => card === 'reinforced-hull')).toHaveLength(2);

    game.closeShop();
    expect(game.snapshot().state).toBe(GameState.BetweenRounds);

    expect(game.activateFoundCard('reinforced-hull')).toBe(true);
    expect(game.snapshot().activeCards).not.toContain('reinforced-hull');
    expect(game.snapshot().foundCards.filter((card) => card === 'reinforced-hull')).toHaveLength(1);
    expect(game.snapshot().playerMaxHealth).toBe(13);

    game.startNextRound();
    expect(game.snapshot().state).toBe(GameState.Playing);
    expect(game.snapshot().roundIndex).toBe(2);
  });

  it('switches pod mode through activation cards', () => {
    const game = new Game();
    game.startFromRunProgress({
      seed: 9,
      levelId: 'level-1',
      roundIndex: 2,
      inRunMoney: 100,
      foundCards: ['missile-command'],
      activeCards: ['pulse-relay'],
      consumedCards: [],
      playerState: {
        health: 10,
        maxHealth: 10,
        weaponLevels: {
          'Auto Pulse': 1
        },
        podCount: 0,
        podWeaponMode: 'Auto Pulse'
      },
      elapsedMs: 0,
      distanceTraveled: 0,
      score: 0
    });

    expect(game.enterBetweenRounds()).toBe(true);
    expect(game.activateFoundCard('missile-command')).toBe(true);
    const snapshot = game.snapshot();
    expect(snapshot.activeCards).toContain('missile-command');
    const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(player?.podWeaponMode).toBe('Homing Missile');
    expect(player?.podCount).toBeGreaterThanOrEqual(1);
  });

  it('guarantees at least one pod card in shop when player has no pod cards yet', () => {
    const game = new Game();
    game.startFromRunProgress({
      seed: 17,
      levelId: 'level-1',
      roundIndex: 2,
      inRunMoney: 120,
      foundCards: [],
      activeCards: ['reinforced-hull'],
      consumedCards: [],
      playerState: {
        health: 10,
        maxHealth: 10,
        weaponLevels: {
          'Auto Pulse': 1
        },
        podCount: 0,
        podWeaponMode: 'Auto Pulse'
      },
      elapsedMs: 0,
      distanceTraveled: 0,
      score: 0
    });

    expect(game.enterBetweenRounds()).toBe(true);
    game.openShop();
    const offers = game.shopOffers();
    expect(offers.some((card) => card.tags.includes('pod'))).toBe(true);
  });

  it('discards found cards without activating them', () => {
    const game = new Game();
    game.startFromRunProgress({
      seed: 23,
      levelId: 'level-1',
      roundIndex: 2,
      inRunMoney: 50,
      foundCards: ['satellite-bay'],
      activeCards: ['pulse-relay'],
      consumedCards: [],
      playerState: {
        health: 10,
        maxHealth: 10,
        weaponLevels: {
          'Auto Pulse': 1
        },
        podCount: 0,
        podWeaponMode: 'Auto Pulse'
      },
      elapsedMs: 0,
      distanceTraveled: 0,
      score: 0
    });

    expect(game.enterBetweenRounds()).toBe(true);
    expect(game.discardFoundCard('satellite-bay')).toBe(true);
    expect(game.snapshot().foundCards).toEqual([]);
    expect(game.snapshot().activeCards).toEqual(['pulse-relay']);
    expect(game.discardFoundCard('satellite-bay')).toBe(false);
  });
});
