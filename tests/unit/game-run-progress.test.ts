import { describe, expect, it } from 'vitest';
import { Game } from '../../src/game/core/Game';

const IDLE_POINTER = {
  hasPosition: false,
  x: 0,
  y: 0,
  leftButtonDown: false,
  rightButtonDown: false
};

describe('Game run progress', () => {
  it('starts a new run and exports run progress', () => {
    const game = new Game();

    game.startNewRun(123456);

    const run = game.exportRunProgress();
    expect(run).toBeDefined();
    expect(run?.seed).toBe(123456);
    expect(run?.levelId).toBe('level-1');
    expect(run?.roundIndex).toBe(1);
    expect(run?.playerState.maxHealth).toBeGreaterThan(0);
  });

  it('resumes from run progress and applies runtime state', () => {
    const game = new Game();

    game.startFromRunProgress({
      seed: 99,
      levelId: 'level-2',
      roundIndex: 3,
      inRunMoney: 40,
      foundCards: ['card-1'],
      activeCards: ['card-2'],
      playerState: {
        health: 5,
        maxHealth: 11,
        weaponLevels: {
          'Auto Pulse': 4
        },
        podCount: 1,
        podWeaponMode: 'Auto Pulse'
      },
      elapsedMs: 8450,
      distanceTraveled: 320,
      score: 760
    });

    const snapshot = game.snapshot();
    expect(snapshot.score).toBe(760);
    expect(snapshot.playerHealth).toBe(5);
    expect(snapshot.playerMaxHealth).toBe(11);
    expect(snapshot.distanceTraveled).toBe(320);

    const resumedRun = game.exportRunProgress();
    expect(resumedRun?.roundIndex).toBe(3);
    expect(resumedRun?.inRunMoney).toBe(40);
    expect(resumedRun?.playerState.weaponLevels['Auto Pulse']).toBe(4);
    expect(resumedRun?.playerState.podCount).toBe(1);
    expect(resumedRun?.playerState.podWeaponMode).toBe('Auto Pulse');
  });

  it('captures elapsed time and distance into run progress during updates', () => {
    const game = new Game();

    game.startNewRun(7);
    game.update(0.5, IDLE_POINTER);

    const run = game.exportRunProgress();
    expect(run?.elapsedMs).toBeGreaterThan(0);
    expect(run?.distanceTraveled).toBeGreaterThan(0);
  });

  it('keeps start() backward compatible by creating a run from boot', () => {
    const game = new Game();

    game.start();

    const run = game.exportRunProgress();
    expect(run).toBeDefined();
    expect(run?.levelId).toBe('level-1');
  });
});
