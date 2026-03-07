import type { WaveDef, WaveSpawnDef } from '../systems/waveScript';
import {
  DEFAULT_ENCOUNTER_DIRECTOR_MODIFIERS,
  ROUNDS_PER_LEVEL,
  SPAWN_GAP_MS,
  WAVE_COUNT,
  WAVE_GAP_MS,
  WAVE_START_MS,
  X_LANES,
  enemiesForLevelRound,
  type EncounterDirectorModifiers,
  unlockedPools
} from '../content/encounterProgression';

export interface RoundDefinition {
  id: string;
  waves: WaveDef[];
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
  const enemyCount = enemiesForLevelRound(levelNumber, roundIndex, runtimeModifiers);
  const spawnsPerWave = distribute(enemyCount, WAVE_COUNT);
  const unlocked = unlockedPools(levelNumber, runtimeModifiers);
  let spawnCursor = 0;

  const waves: WaveDef[] = spawnsPerWave
    .map((count, waveIndex) => {
      if (count <= 0) {
        return undefined;
      }

      const spawns: WaveSpawnDef[] = [];
      for (let i = 0; i < count; i += 1) {
        const lane = X_LANES[(spawnCursor + i + waveIndex) % X_LANES.length];
        const pattern = unlocked.patterns[(spawnCursor + i) % unlocked.patterns.length];
        const spawnFrom = pattern === 'horseshoe' ? 'bottom' : 'top';
        spawns.push({
          offsetMs: i * SPAWN_GAP_MS,
          x: lane,
          spawnFrom,
          movementPattern: pattern,
          enemyArchetype: unlocked.archetypes[(spawnCursor + i + roundIndex) % unlocked.archetypes.length]
        });
      }
      spawnCursor += count;

      return {
        startMs: WAVE_START_MS + waveIndex * WAVE_GAP_MS,
        spawns
      };
    })
    .filter((wave): wave is WaveDef => Boolean(wave));

  return {
    id: `l${levelNumber}-r${roundIndex}`,
    waves
  };
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
