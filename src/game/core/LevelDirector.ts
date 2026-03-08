import type { WaveDef, WaveSpawnDef } from '../systems/waveScript';
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
  const enemyCount = enemiesForLevelRound(levelNumber, roundIndex, runtimeModifiers);
  const spawnsPerWave = distribute(enemyCount, pacing.waveCount);
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

  return {
    id: `l${levelNumber}-r${roundIndex}`,
    waves,
    enemyHealthScale: pacing.enemyHealthScale,
    expectedDurationMs: pacing.expectedRoundDurationMs
  };
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
  for (let i = 0; i < count; i += 1) {
    const lane = X_LANES[(spawnCursor + i + waveIndex) % X_LANES.length];
    const pattern = unlocked.patterns[(spawnCursor + i) % unlocked.patterns.length];
    const spawnFrom = pattern === 'horseshoe' ? 'bottom' : 'top';
    spawns.push({
      offsetMs: i * pacing.spawnGapMs,
      x: lane,
      spawnFrom,
      movementPattern: pattern,
      enemyArchetype: unlocked.archetypes[(spawnCursor + i + roundIndex) % unlocked.archetypes.length]
    });
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
  const baseAmplitude = 1.4 + ((roundIndex + waveIndex) % 3) * 0.45;
  const baseFrequency = clampNumber(1 + roundIndex * 0.08 + (waveIndex % 2) * 0.2, 0.75, 2.8);
  const archetype = unlocked.archetypes[(spawnCursor + waveIndex + roundIndex) % unlocked.archetypes.length] ?? 'scout';
  const batchSize = 4;
  const formationBatchGapMs = Math.max(380, pacing.spawnGapMs * 2);
  const phaseOffsetSeconds = (waveIndex % 4) * 0.2;
  const laneCycle = mirroredLaneOrder();
  const spawns: WaveSpawnDef[] = [];

  for (let i = 0; i < count; i += 1) {
    const batchIndex = Math.floor(i / batchSize);
    spawns.push({
      offsetMs: batchIndex * formationBatchGapMs,
      x: laneCycle[i % laneCycle.length],
      spawnFrom,
      movementPattern: pattern,
      patternAmplitude: baseAmplitude,
      patternFrequency: baseFrequency,
      movementParams: {
        phaseOffsetSeconds
      },
      enemyArchetype: archetype
    });
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

function sanitizeNumber(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return value;
}

function mirroredLaneOrder(): number[] {
  return [X_LANES[2], X_LANES[1], X_LANES[3], X_LANES[0], X_LANES[4]];
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
