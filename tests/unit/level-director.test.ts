import { describe, expect, it } from 'vitest';
import { LevelDirector } from '../../src/game/core/LevelDirector';

describe('LevelDirector', () => {
  it('configures current level round and advances deterministically', () => {
    const director = new LevelDirector();
    director.configure('level-1', 2);

    expect(director.currentLevelId()).toBe('level-1');
    expect(director.currentRoundIndex()).toBe(2);
    expect(director.totalRounds()).toBeGreaterThanOrEqual(3);
    expect(director.currentRound().id).toBe('l1-r2');

    const next = director.advanceRound();
    expect(next).toBe(3);
    expect(director.currentRound().id).toBe('l1-r3');

    const wrapped = director.advanceRound();
    expect(wrapped).toBe(1);
    expect(director.currentRound().id).toBe('l1-r1');
  });
});
