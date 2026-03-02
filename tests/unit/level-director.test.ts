import { describe, expect, it } from 'vitest';
import { LevelDirector } from '../../src/game/core/LevelDirector';

describe('LevelDirector', () => {
  it('configures current level round and advances into the next level after round 3', () => {
    const director = new LevelDirector();
    director.configure('level-1', 2);

    expect(director.currentLevelId()).toBe('level-1');
    expect(director.currentRoundIndex()).toBe(2);
    expect(director.totalRounds()).toBe(3);
    expect(director.currentRound().id).toBe('l1-r2');

    const next = director.advanceRound();
    expect(next).toBe(3);
    expect(director.currentRound().id).toBe('l1-r3');

    const advancedToNextLevel = director.advanceRound();
    expect(advancedToNextLevel).toBe(1);
    expect(director.currentLevelId()).toBe('level-2');
    expect(director.currentRound().id).toBe('l2-r1');
  });

  it('scales enemies by level and round using the configured formula', () => {
    const director = new LevelDirector();

    director.configure('level-1', 1);
    const round1Spawns = director.currentRound().waves.reduce((sum, wave) => sum + wave.spawns.length, 0);

    director.configure('level-1', 2);
    const round2Spawns = director.currentRound().waves.reduce((sum, wave) => sum + wave.spawns.length, 0);

    director.configure('level-1', 3);
    const round3Spawns = director.currentRound().waves.reduce((sum, wave) => sum + wave.spawns.length, 0);

    expect(round1Spawns).toBe(10);
    expect(round2Spawns).toBe(15);
    expect(round3Spawns).toBe(20);

    director.configure('level-2', 1);
    const level2Round1Spawns = director.currentRound().waves.reduce((sum, wave) => sum + wave.spawns.length, 0);
    director.configure('level-2', 2);
    const level2Round2Spawns = director.currentRound().waves.reduce((sum, wave) => sum + wave.spawns.length, 0);
    director.configure('level-2', 3);
    const level2Round3Spawns = director.currentRound().waves.reduce((sum, wave) => sum + wave.spawns.length, 0);

    expect(level2Round1Spawns).toBe(15);
    expect(level2Round2Spawns).toBe(20);
    expect(level2Round3Spawns).toBe(25);

    director.configure('level-3', 1);
    const level3Round1Spawns = director.currentRound().waves.reduce((sum, wave) => sum + wave.spawns.length, 0);
    director.configure('level-3', 2);
    const level3Round2Spawns = director.currentRound().waves.reduce((sum, wave) => sum + wave.spawns.length, 0);
    director.configure('level-3', 3);
    const level3Round3Spawns = director.currentRound().waves.reduce((sum, wave) => sum + wave.spawns.length, 0);

    expect(level3Round1Spawns).toBe(20);
    expect(level3Round2Spawns).toBe(25);
    expect(level3Round3Spawns).toBe(30);
  });

  it('introduces a new enemy type or movement pattern every three levels', () => {
    const director = new LevelDirector();

    director.configure('level-1', 1);
    const level1Spawns = director.currentRound().waves.flatMap((wave) => wave.spawns);
    expect(new Set(level1Spawns.map((spawn) => spawn.enemyArchetype))).toEqual(new Set(['scout']));
    expect(new Set(level1Spawns.map((spawn) => spawn.movementPattern))).toEqual(new Set(['straight', 'sine']));

    director.configure('level-4', 1);
    const level4Spawns = director.currentRound().waves.flatMap((wave) => wave.spawns);
    expect(level4Spawns.some((spawn) => spawn.enemyArchetype === 'striker')).toBe(true);

    director.configure('level-7', 1);
    const level7Spawns = director.currentRound().waves.flatMap((wave) => wave.spawns);
    expect(level7Spawns.some((spawn) => spawn.movementPattern === 'zigzag')).toBe(true);
  });
});
