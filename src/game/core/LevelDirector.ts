import type { WaveDef, WaveSpawnDef } from '../systems/waveScript';
import type { EnemyArchetypeId } from '../content/enemyArchetypes';
import type { MovementPatternId } from '../movement/patterns';
import {
  DEFAULT_ENCOUNTER_DIRECTOR_MODIFIERS,
  ROUNDS_PER_LEVEL,
  X_LANES,
  enemiesForLevelRound,
  roundPacingProfile,
  type EncounterDirectorModifiers,
  unlockedPools
} from '../content/encounterProgression';

export interface RoundDefinition {
  id: string;
  waves: WaveDef[];
  enemyHealthScale: number;
  expectedDurationMs: number;
}

const MIN_ENEMIES_PER_WAVE = 3;
const MAX_ENEMIES_PER_WAVE = 10;
const MIN_SPAWN_GAP_MS = 400;
const MAX_SPAWN_GAP_MS = 800;

export class LevelDirector {
  private levelNumber = 1;
  private levelId = 'level-1';
  private roundIndex = 1;
  private runtimeModifiers: EncounterDirectorModifiers = { ...DEFAULT_ENCOUNTER_DIRECTOR_MODIFIERS };

  configure(levelId: string, requestedRoundIndex = 1) {
    this.levelNumber = parseLevelNumber(levelId);
    this.levelId = toLevelId(this.levelNumber);
    this.roundIndex = clampRoundIndex(requestedRoundIndex);
  }

  setRuntimeModifiers(modifiers: Partial<EncounterDirectorModifiers>) {
    this.runtimeModifiers = {
      enemyCountPercent: sanitizeNumber(modifiers.enemyCountPercent, this.runtimeModifiers.enemyCountPercent),
      enemyArchetypeUnlocks: Math.max(
        0,
        Math.floor(sanitizeNumber(modifiers.enemyArchetypeUnlocks, this.runtimeModifiers.enemyArchetypeUnlocks))
      ),
      patternUnlocks: Math.max(0, Math.floor(sanitizeNumber(modifiers.patternUnlocks, this.runtimeModifiers.patternUnlocks)))
    };
  }

  currentRound(): RoundDefinition {
    return buildRound(this.levelNumber, this.roundIndex, this.runtimeModifiers);
  }

  currentRoundHealthScale(): number {
    return roundPacingProfile(this.levelNumber, this.roundIndex).enemyHealthScale;
  }

  currentLevelId(): string {
    return this.levelId;
  }

  currentRoundIndex(): number {
    return this.roundIndex;
  }

  totalRounds(): number {
    return ROUNDS_PER_LEVEL;
  }

  advanceRound(): number {
    this.roundIndex += 1;
    if (this.roundIndex > ROUNDS_PER_LEVEL) {
      this.levelNumber += 1;
      this.levelId = toLevelId(this.levelNumber);
      this.roundIndex = 1;
    }
    return this.roundIndex;
  }
}

function buildRound(levelNumber: number, roundIndex: number, runtimeModifiers: EncounterDirectorModifiers): RoundDefinition {
  const pacing = roundPacingProfile(levelNumber, roundIndex);
  const baselineEnemyCount = enemiesForLevelRound(levelNumber, roundIndex, runtimeModifiers);
  const enemyCount = Math.max(baselineEnemyCount, pacing.waveCount * 2);
  const spawnsPerWave = distributeWithinBounds(enemyCount, pacing.waveCount, MIN_ENEMIES_PER_WAVE, MAX_ENEMIES_PER_WAVE);
  const unlocked = unlockedPools(levelNumber, runtimeModifiers);
  const formationWaveCount = Math.max(1, Math.round(spawnsPerWave.length * pacing.formationWaveRatio));
  let spawnCursor = 0;

  const waves: WaveDef[] = spawnsPerWave
    .map((count, waveIndex) => {
      if (count <= 0) {
        return undefined;
      }

      const isFormationWave = waveIndex < formationWaveCount;
      const spawns = isFormationWave
        ? buildFormationSpawns(count, waveIndex, spawnCursor, roundIndex, pacing, unlocked)
        : buildMixedSpawns(count, waveIndex, spawnCursor, roundIndex, pacing, unlocked);
      spawnCursor += count;

      return {
        startMs: pacing.waveStartMs + waveIndex * pacing.waveGapMs,
        spawns
      };
    })
    .filter((wave): wave is WaveDef => Boolean(wave));

  waves.push(buildBossWave(waves, pacing.waveGapMs, unlocked.archetypes));

  return {
    id: `l${levelNumber}-r${roundIndex}`,
    waves,
    enemyHealthScale: pacing.enemyHealthScale,
    expectedDurationMs: pacing.expectedRoundDurationMs
  };
}

const BOSS_ARCHETYPE_PRIORITY: EnemyArchetypeId[] = [
  'bastion',
  'juggernaut',
  'sentinel',
  'bruiser',
  'tank',
  'sniper',
  'lancer',
  'raider',
  'striker'
];
const BOSS_WAVE_ESCORT_ARCHETYPE: EnemyArchetypeId = 'scout';

function buildBossWave(existingWaves: WaveDef[], waveGapMs: number, unlockedArchetypes: EnemyArchetypeId[]): WaveDef {
  const lastWaveStartMs = existingWaves[existingWaves.length - 1]?.startMs ?? 1200;
  const bossArchetype = pickBossArchetype(unlockedArchetypes);

  return {
    startMs: lastWaveStartMs + waveGapMs,
    spawns: [
      {
        offsetMs: 0,
        x: 0,
        movementPattern: 'straight',
        enemyArchetype: bossArchetype
      },
      {
        offsetMs: 520,
        x: -2.4,
        movementPattern: 'straight',
        enemyArchetype: BOSS_WAVE_ESCORT_ARCHETYPE
      },
      {
        offsetMs: 1040,
        x: 2.4,
        movementPattern: 'straight',
        enemyArchetype: BOSS_WAVE_ESCORT_ARCHETYPE
      }
    ]
  };
}

function pickBossArchetype(unlockedArchetypes: EnemyArchetypeId[]): EnemyArchetypeId {
  for (const archetype of BOSS_ARCHETYPE_PRIORITY) {
    if (unlockedArchetypes.includes(archetype)) {
      return archetype;
    }
  }

  return 'striker';
}

function buildMixedSpawns(
  count: number,
  waveIndex: number,
  spawnCursor: number,
  roundIndex: number,
  pacing: ReturnType<typeof roundPacingProfile>,
  unlocked: ReturnType<typeof unlockedPools>
): WaveSpawnDef[] {
  const spawns: WaveSpawnDef[] = [];
  let offsetMs = 0;
  for (let i = 0; i < count; i += 1) {
    const lane = X_LANES[(spawnCursor + i + waveIndex) % X_LANES.length];
    const pattern = unlocked.patterns[(spawnCursor + i) % unlocked.patterns.length];
    const spawnFrom = pattern === 'horseshoe' ? 'bottom' : 'top';
    const amplitude = motionAmplitudeForPattern(pattern, lane, roundIndex, waveIndex);
    const frequency = motionFrequencyForPattern(pattern, roundIndex, waveIndex, i);
    const movementParams = buildMovementParams(pattern, roundIndex, waveIndex, i, {
      baseX: lane,
      baseAmplitude: amplitude,
      baseFrequency: frequency
    });
    spawns.push({
      offsetMs,
      x: lane,
      spawnFrom,
      movementPattern: pattern,
      patternAmplitude: amplitude,
      patternFrequency: frequency,
      movementParams,
      enemyArchetype: unlocked.archetypes[(spawnCursor + i + roundIndex) % unlocked.archetypes.length]
    });
    offsetMs += gapMsForSpawn(roundIndex, waveIndex, i, pacing.spawnGapMs);
  }
  return spawns;
}

function buildFormationSpawns(
  count: number,
  waveIndex: number,
  spawnCursor: number,
  roundIndex: number,
  pacing: ReturnType<typeof roundPacingProfile>,
  unlocked: ReturnType<typeof unlockedPools>
): WaveSpawnDef[] {
  const formationPatterns = unlocked.patterns.filter((pattern) => pattern !== 'straight');
  const pattern = formationPatterns[(spawnCursor + waveIndex) % Math.max(1, formationPatterns.length)] ?? 'sine';
  const spawnFrom = pattern === 'horseshoe' ? 'bottom' : 'top';
  const archetype = unlocked.archetypes[(spawnCursor + waveIndex + roundIndex) % unlocked.archetypes.length] ?? 'scout';
  const lineCount = Math.max(2, Math.min(limitedLaneOrder().length, Math.ceil(count / 3)));
  const phaseOffsetSeconds = (waveIndex % 4) * 0.2;
  const laneCycle = limitedLaneOrder();
  const spawns: WaveSpawnDef[] = [];
  let offsetMs = 0;

  for (let i = 0; i < count; i += 1) {
    const lineIndex = i % lineCount;
    const laneX = laneCycle[lineIndex];
    const baseAmplitude = motionAmplitudeForPattern(pattern, laneX, roundIndex, waveIndex);
    const baseFrequency = motionFrequencyForPattern(pattern, roundIndex, waveIndex, i);
    const movementParams = buildMovementParams(pattern, roundIndex, waveIndex, i, {
      baseX: laneX,
      baseAmplitude,
      baseFrequency,
      phaseOffsetSeconds
    });
    spawns.push({
      offsetMs,
      x: laneX,
      spawnFrom,
      movementPattern: pattern,
      patternAmplitude: baseAmplitude,
      patternFrequency: baseFrequency,
      movementParams,
      enemyArchetype: archetype
    });
    offsetMs += gapMsForSpawn(roundIndex, waveIndex, i, pacing.spawnGapMs);
  }

  return spawns;
}

function parseLevelNumber(levelId: string): number {
  const match = /^level-(\d+)$/.exec(levelId.trim());
  if (!match) {
    return 1;
  }

  const parsed = Number.parseInt(match[1], 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function toLevelId(levelNumber: number): string {
  return `level-${Math.max(1, Math.floor(levelNumber))}`;
}

function clampRoundIndex(roundIndex: number): number {
  if (!Number.isFinite(roundIndex) || roundIndex < 1) {
    return 1;
  }

  if (roundIndex > ROUNDS_PER_LEVEL) {
    return ROUNDS_PER_LEVEL;
  }

  return Math.floor(roundIndex);
}

function distribute(total: number, buckets: number): number[] {
  const safeBuckets = Math.max(1, buckets);
  const base = Math.floor(total / safeBuckets);
  const remainder = total % safeBuckets;
  const distributed = new Array<number>(safeBuckets).fill(base);
  for (let i = 0; i < remainder; i += 1) {
    distributed[i] += 1;
  }
  return distributed;
}

function distributeWithinBounds(total: number, preferredBuckets: number, minPerBucket: number, maxPerBucket: number): number[] {
  const safeTotal = Math.max(0, Math.floor(total));
  if (safeTotal === 0) {
    return [];
  }

  const safeMin = Math.max(1, Math.floor(minPerBucket));
  const safeMax = Math.max(safeMin, Math.floor(maxPerBucket));
  const minBuckets = Math.max(1, Math.ceil(safeTotal / safeMax));
  const maxBuckets = Math.max(1, Math.floor(safeTotal / safeMin));
  const clampedBuckets = Math.max(minBuckets, Math.min(Math.max(1, Math.floor(preferredBuckets)), maxBuckets));

  const result = distribute(safeTotal, clampedBuckets);
  for (let i = 0; i < result.length; i += 1) {
    if (result[i] < safeMin) {
      result[i] = safeMin;
    } else if (result[i] > safeMax) {
      result[i] = safeMax;
    }
  }

  // Clamp bucket count already guarantees feasibility; this rebalance keeps exact total.
  let delta = safeTotal - result.reduce((sum, value) => sum + value, 0);
  while (delta !== 0) {
    let changed = false;
    for (let i = 0; i < result.length && delta !== 0; i += 1) {
      if (delta > 0 && result[i] < safeMax) {
        result[i] += 1;
        delta -= 1;
        changed = true;
      } else if (delta < 0 && result[i] > safeMin) {
        result[i] -= 1;
        delta += 1;
        changed = true;
      }
    }
    if (!changed) {
      break;
    }
  }

  return result;
}

function sanitizeNumber(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return value;
}

function limitedLaneOrder(): number[] {
  return [X_LANES[1], X_LANES[2], X_LANES[3]];
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function gapMsForSpawn(roundIndex: number, waveIndex: number, spawnIndex: number, pacingGapMs: number): number {
  const baseGapMs = clampNumber(Math.round(pacingGapMs), MIN_SPAWN_GAP_MS, MAX_SPAWN_GAP_MS);
  const jitterRange = Math.min(120, Math.floor((MAX_SPAWN_GAP_MS - MIN_SPAWN_GAP_MS) / 2));
  const seed = roundIndex * 173 + waveIndex * 89 + spawnIndex * 37;
  const jitter = (((seed % (jitterRange * 2 + 1)) + (jitterRange * 2 + 1)) % (jitterRange * 2 + 1)) - jitterRange;
  return Math.round(clampNumber(baseGapMs + jitter, MIN_SPAWN_GAP_MS, MAX_SPAWN_GAP_MS));
}

function motionAmplitudeForPattern(pattern: MovementPatternId, laneX: number, roundIndex: number, waveIndex: number): number {
  const lateralRoom = Math.max(0.8, 5.2 - Math.abs(laneX));
  const roundBoost = Math.min(1.35, (roundIndex - 1) * 0.24 + (waveIndex % 3) * 0.16);

  switch (pattern) {
    case 'straight':
      return 0;
    case 'sine':
      return clampNumber(2 + lateralRoom * 0.64 + roundBoost, 1.6, 5.2);
    case 'zigzag':
      return clampNumber(1.9 + lateralRoom * 0.58 + roundBoost * 0.9, 1.5, 4.9);
    case 'curve':
      return clampNumber(2.35 + lateralRoom * 0.56 + roundBoost, 1.9, 5.3);
    case 'spiral':
      return clampNumber(2.2 + lateralRoom * 0.62 + roundBoost, 1.8, 5.4);
    case 'lissajous':
      return clampNumber(2.25 + lateralRoom * 0.6 + roundBoost, 1.8, 5.3);
    case 'bezier':
      return clampNumber(2.45 + lateralRoom * 0.68 + roundBoost, 2, 5.4);
    case 'sweep':
      return clampNumber(2.9 + lateralRoom * 0.72 + roundBoost, 2.4, 5.6);
    case 'shallow-zigzag':
      return clampNumber(1.4 + lateralRoom * 0.46 + roundBoost * 0.75, 1.2, 4.2);
    case 'horseshoe':
      return clampNumber(3 + lateralRoom * 0.7 + roundBoost, 2.4, 5.8);
    default:
      return 2.4;
  }
}

function motionFrequencyForPattern(pattern: MovementPatternId, roundIndex: number, waveIndex: number, spawnIndex: number): number {
  const base = 0.82 + (roundIndex - 1) * 0.045 + (waveIndex % 4) * 0.06 + (spawnIndex % 3) * 0.04;
  switch (pattern) {
    case 'sweep':
    case 'horseshoe':
      return clampNumber(base * 0.62, 0.45, 1.2);
    case 'spiral':
      return clampNumber(base * 0.72, 0.55, 1.35);
    case 'lissajous':
    case 'bezier':
      return clampNumber(base * 0.78, 0.6, 1.45);
    case 'shallow-zigzag':
      return clampNumber(base * 0.92, 0.7, 1.7);
    default:
      return clampNumber(base, 0.75, 1.9);
  }
}

function buildMovementParams(
  pattern: MovementPatternId,
  roundIndex: number,
  waveIndex: number,
  spawnIndex: number,
  base: {
    baseX: number;
    baseAmplitude: number;
    baseFrequency: number;
    phaseOffsetSeconds?: number;
  }
): Record<string, number> | undefined {
  const phaseOffsetSeconds = base.phaseOffsetSeconds ?? ((spawnIndex % 5) * 0.12 + (waveIndex % 3) * 0.07);

  switch (pattern) {
    case 'sine':
      return {
        phaseOffsetSeconds,
        yAmplitude: 0.26 + ((roundIndex + spawnIndex) % 4) * 0.1,
        yFrequency: base.baseFrequency * (0.72 + ((waveIndex + spawnIndex) % 3) * 0.12)
      };
    case 'zigzag':
      return {
        phaseOffsetSeconds,
        yAmplitude: 0.34 + ((roundIndex + spawnIndex) % 3) * 0.12,
        yFrequency: base.baseFrequency * 0.9
      };
    case 'curve':
      return {
        phaseOffsetSeconds,
        curveDirection: ((waveIndex + spawnIndex) % 2 === 0 ? 1 : -1),
        yAmplitude: 0.2 + (spawnIndex % 3) * 0.08
      };
    case 'spiral':
      return {
        phaseOffsetSeconds,
        spiralTurns: 1.4 + ((waveIndex + spawnIndex) % 4) * 0.3,
        spiralDecay: 0.3 + (roundIndex % 4) * 0.06
      };
    case 'lissajous':
      return {
        phaseOffsetSeconds,
        lissajousA: 2 + ((spawnIndex + roundIndex) % 3),
        lissajousB: 2 + ((waveIndex + spawnIndex) % 2),
        lissajousPhase: (spawnIndex % 5) * 0.28,
        yAmplitude: 0.45 + ((roundIndex + waveIndex) % 3) * 0.1
      };
    case 'bezier':
      return {
        phaseOffsetSeconds,
        bezierStartX: base.baseX,
        bezierControl1X: base.baseX - base.baseAmplitude * (0.8 + (spawnIndex % 3) * 0.2),
        bezierControl2X: base.baseX + base.baseAmplitude * (0.9 + (waveIndex % 3) * 0.2),
        bezierEndX: -base.baseX * (0.25 + ((roundIndex + spawnIndex) % 3) * 0.15),
        yAmplitude: 0.3 + (spawnIndex % 3) * 0.08
      };
    case 'sweep':
      return {
        phaseOffsetSeconds,
        sweepStartX: base.baseX,
        sweepEndX: -base.baseX,
        sweepDepth: 14 + ((roundIndex + spawnIndex) % 4) * 2.2,
        periodSeconds: 4.2 + (waveIndex % 4) * 0.45
      };
    case 'shallow-zigzag':
      return {
        phaseOffsetSeconds,
        xScale: 0.45 + ((spawnIndex + waveIndex) % 3) * 0.08,
        yAmplitude: 0.12 + (roundIndex % 3) * 0.04,
        yFrequency: base.baseFrequency * 0.66
      };
    case 'horseshoe':
      return {
        phaseOffsetSeconds,
        radiusX: base.baseX,
        riseHeight: 20 + ((roundIndex + spawnIndex) % 4) * 2.4,
        periodSeconds: 4.8 + (waveIndex % 3) * 0.35
      };
    default:
      return undefined;
  }
}
