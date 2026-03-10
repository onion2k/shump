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

  it('maintains denser spawn counts in early rounds while scaling by level and round', () => {
    const director = new LevelDirector();

    director.configure('level-1', 1);
    const round1Spawns = director.currentRound().waves.reduce((sum, wave) => sum + wave.spawns.length, 0);

    director.configure('level-1', 2);
    const round2Spawns = director.currentRound().waves.reduce((sum, wave) => sum + wave.spawns.length, 0);

    director.configure('level-1', 3);
    const round3Spawns = director.currentRound().waves.reduce((sum, wave) => sum + wave.spawns.length, 0);

    expect(round1Spawns).toBeGreaterThanOrEqual(30);
    expect(round2Spawns).toBeGreaterThanOrEqual(round1Spawns);
    expect(round3Spawns).toBeGreaterThanOrEqual(round2Spawns);

    director.configure('level-2', 1);
    const level2Round1Spawns = director.currentRound().waves.reduce((sum, wave) => sum + wave.spawns.length, 0);
    director.configure('level-2', 2);
    const level2Round2Spawns = director.currentRound().waves.reduce((sum, wave) => sum + wave.spawns.length, 0);
    director.configure('level-2', 3);
    const level2Round3Spawns = director.currentRound().waves.reduce((sum, wave) => sum + wave.spawns.length, 0);

    expect(level2Round1Spawns).toBeGreaterThanOrEqual(round1Spawns);
    expect(level2Round2Spawns).toBeGreaterThanOrEqual(level2Round1Spawns);
    expect(level2Round3Spawns).toBeGreaterThanOrEqual(level2Round2Spawns);

    director.configure('level-3', 1);
    const level3Round1Spawns = director.currentRound().waves.reduce((sum, wave) => sum + wave.spawns.length, 0);
    director.configure('level-3', 2);
    const level3Round2Spawns = director.currentRound().waves.reduce((sum, wave) => sum + wave.spawns.length, 0);
    director.configure('level-3', 3);
    const level3Round3Spawns = director.currentRound().waves.reduce((sum, wave) => sum + wave.spawns.length, 0);

    expect(level3Round1Spawns).toBeGreaterThanOrEqual(level2Round1Spawns);
    expect(level3Round2Spawns).toBeGreaterThanOrEqual(level3Round1Spawns);
    expect(level3Round3Spawns).toBeGreaterThanOrEqual(level3Round2Spawns);
  });

  it('introduces a new enemy type or movement pattern every three levels', () => {
    const director = new LevelDirector();

    director.configure('level-1', 1);
    const level1Round = director.currentRound();
    const level1Spawns = level1Round.waves.slice(0, -1).flatMap((wave) => wave.spawns);
    expect(new Set(level1Spawns.map((spawn) => spawn.enemyArchetype))).toEqual(new Set(['scout']));
    expect(new Set(level1Spawns.map((spawn) => spawn.movementPattern))).toEqual(new Set(['straight', 'sine', 'zigzag', 'curve']));
    const level1BossWave = level1Round.waves[level1Round.waves.length - 1];
    expect(level1BossWave.spawns).toHaveLength(3);
    expect(level1BossWave.spawns[0].enemyArchetype).toBe('striker');

    director.configure('level-4', 1);
    const level4Spawns = director.currentRound().waves.flatMap((wave) => wave.spawns);
    expect(level4Spawns.some((spawn) => spawn.enemyArchetype === 'striker')).toBe(true);

    director.configure('level-7', 1);
    const level7Spawns = director.currentRound().waves.flatMap((wave) => wave.spawns);
    expect(level7Spawns.some((spawn) => spawn.movementPattern === 'shallow-zigzag')).toBe(true);
  });

  it('adds a single end-of-round boss wave using a harder archetype', () => {
    const director = new LevelDirector();

    director.configure('level-1', 1);
    const earlyRound = director.currentRound();
    const earlyBossWave = earlyRound.waves[earlyRound.waves.length - 1];
    expect(earlyBossWave.spawns).toHaveLength(3);
    expect(earlyBossWave.spawns[0].enemyArchetype).toBe('striker');

    director.configure('level-10', 2);
    const midRound = director.currentRound();
    const midBossWave = midRound.waves[midRound.waves.length - 1];
    expect(midBossWave.spawns).toHaveLength(3);
    expect(midBossWave.spawns[0].enemyArchetype).toBe('tank');

    expect(midBossWave.startMs).toBeGreaterThan(midRound.waves[midRound.waves.length - 2].startMs);
  });

  it('keeps every wave size between three and ten enemies', () => {
    const director = new LevelDirector();
    director.configure('level-6', 3);

    const round = director.currentRound();
    for (const wave of round.waves) {
      expect(wave.spawns.length).toBeGreaterThanOrEqual(3);
      expect(wave.spawns.length).toBeLessThanOrEqual(10);
    }
  });

  it('keeps spawn timing gaps in each wave between 400ms and 800ms', () => {
    const director = new LevelDirector();
    director.configure('level-8', 2);

    const round = director.currentRound();
    for (const wave of round.waves) {
      const orderedOffsets = wave.spawns.map((spawn) => spawn.offsetMs).sort((a, b) => a - b);
      for (let i = 1; i < orderedOffsets.length; i += 1) {
        const gap = orderedOffsets[i] - orderedOffsets[i - 1];
        expect(gap).toBeGreaterThanOrEqual(400);
        expect(gap).toBeLessThanOrEqual(800);
      }
    }
  });

  it('applies runtime encounter modifiers for card-driven run variety', () => {
    const director = new LevelDirector();
    director.configure('level-1', 1);

    const baselineSpawns = director.currentRound().waves.flatMap((wave) => wave.spawns);
    director.setRuntimeModifiers({
      enemyCountPercent: 50,
      enemyArchetypeUnlocks: 1,
      patternUnlocks: 1
    });

    const boostedSpawns = director.currentRound().waves.flatMap((wave) => wave.spawns);

    expect(boostedSpawns.length).toBeGreaterThanOrEqual(baselineSpawns.length);
    expect(boostedSpawns.some((spawn) => spawn.enemyArchetype === 'striker')).toBe(true);
    expect(boostedSpawns.some((spawn) => spawn.movementPattern === 'shallow-zigzag')).toBe(true);
  });

  it('builds longer rounds with pacing targets around one to two minutes', () => {
    const director = new LevelDirector();

    director.configure('level-1', 1);
    const round1 = director.currentRound();
    expect(round1.expectedDurationMs).toBeGreaterThanOrEqual(60000);
    expect(round1.expectedDurationMs).toBeLessThanOrEqual(120000);

    director.configure('level-6', 3);
    const lateRound = director.currentRound();
    expect(lateRound.expectedDurationMs).toBeGreaterThanOrEqual(60000);
    expect(lateRound.expectedDurationMs).toBeLessThanOrEqual(120000);
    expect(lateRound.enemyHealthScale).toBeGreaterThan(round1.enemyHealthScale);
  });

  it('creates formation waves with synchronized movement phase settings', () => {
    const director = new LevelDirector();
    director.configure('level-2', 2);

    const round = director.currentRound();
    const formationWaves = round.waves.filter((wave) => {
      const patterns = new Set(wave.spawns.map((spawn) => spawn.movementPattern));
      const phaseOffsets = new Set(
        wave.spawns.map((spawn) =>
          typeof spawn.movementParams?.phaseOffsetSeconds === 'number' ? spawn.movementParams.phaseOffsetSeconds : undefined
        )
      );
      return patterns.size === 1 && phaseOffsets.size === 1 && phaseOffsets.has(undefined) === false;
    });

    expect(formationWaves.length).toBeGreaterThanOrEqual(Math.floor(round.waves.length / 2));
  });

  it('builds formation lines where enemies trail on shared lanes without simultaneous clumping', () => {
    const director = new LevelDirector();
    director.configure('level-6', 3);

    const round = director.currentRound();
    const formationWave = round.waves.find((wave) => {
      const patterns = new Set(wave.spawns.map((spawn) => spawn.movementPattern));
      const phaseOffsets = new Set(
        wave.spawns.map((spawn) =>
          typeof spawn.movementParams?.phaseOffsetSeconds === 'number' ? spawn.movementParams.phaseOffsetSeconds : undefined
        )
      );
      const laneCounts = new Map<number, number>();
      for (const spawn of wave.spawns) {
        laneCounts.set(spawn.x, (laneCounts.get(spawn.x) ?? 0) + 1);
      }
      const repeatedLanes = [...laneCounts.values()].filter((laneCount) => laneCount > 1).length;
      return patterns.size === 1 && phaseOffsets.size === 1 && phaseOffsets.has(undefined) === false && repeatedLanes >= 1;
    });

    expect(formationWave).toBeTruthy();
    if (!formationWave) {
      return;
    }

    const laneOffsets = new Map<number, number[]>();
    for (const spawn of formationWave.spawns) {
      const offsets = laneOffsets.get(spawn.x) ?? [];
      offsets.push(spawn.offsetMs);
      laneOffsets.set(spawn.x, offsets);
    }

    expect(laneOffsets.size).toBeGreaterThanOrEqual(2);

    const trailingLines = [...laneOffsets.values()].filter((offsets) => {
      const uniqueSortedOffsets = [...new Set(offsets)].sort((a, b) => a - b);
      return uniqueSortedOffsets.length >= 2 && uniqueSortedOffsets[1] > uniqueSortedOffsets[0];
    });
    expect(trailingLines.length).toBeGreaterThanOrEqual(1);

    const simultaneousOffsets = new Set<number>();
    for (const offsets of laneOffsets.values()) {
      for (const offset of offsets) {
        simultaneousOffsets.add(offset);
      }
    }

    const hasSimultaneousSpawn = [...simultaneousOffsets].some((offset) => {
      let countAtOffset = 0;
      for (const offsets of laneOffsets.values()) {
        if (offsets.includes(offset)) {
          countAtOffset += 1;
        }
      }
      return countAtOffset >= 2;
    });
    expect(hasSimultaneousSpawn).toBe(false);
  });
});
