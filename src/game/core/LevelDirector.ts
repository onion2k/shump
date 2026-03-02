import type { EnemyArchetypeId } from '../content/enemyArchetypes';
import type { MovementPatternId } from '../movement/patterns';
import type { WaveDef, WaveSpawnDef } from '../systems/waveScript';

export interface RoundDefinition {
  id: string;
  waves: WaveDef[];
}

const ROUNDS_PER_LEVEL = 3;
const BASE_ROUND_ENEMIES = 10;
const ROUND_ENEMY_STEP = 5;
const LEVEL_ENEMY_STEP = 5;
const WAVE_COUNT = 3;
const WAVE_START_MS = 500;
const WAVE_GAP_MS = 1200;
const SPAWN_GAP_MS = 160;
const X_LANES = [-4.8, -2.4, 0, 2.4, 4.8] as const;

const BASE_ARCHETYPES: EnemyArchetypeId[] = ['scout'];
const BASE_PATTERNS: MovementPatternId[] = ['straight', 'sine'];

const UNLOCK_SEQUENCE: Array<{ enemy?: EnemyArchetypeId; pattern?: MovementPatternId }> = [
  { enemy: 'striker' },
  { pattern: 'zigzag' },
  { enemy: 'tank' },
  { pattern: 'curve' },
  { enemy: 'bruiser' },
  { pattern: 'spiral' },
  { enemy: 'juggernaut' },
  { pattern: 'sweep' },
  { pattern: 'shallow-zigzag' },
  { pattern: 'horseshoe' }
];

export class LevelDirector {
  private levelNumber = 1;
  private levelId = 'level-1';
  private roundIndex = 1;

  configure(levelId: string, requestedRoundIndex = 1) {
    this.levelNumber = parseLevelNumber(levelId);
    this.levelId = toLevelId(this.levelNumber);
    this.roundIndex = clampRoundIndex(requestedRoundIndex);
  }

  currentRound(): RoundDefinition {
    return buildRound(this.levelNumber, this.roundIndex);
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

function buildRound(levelNumber: number, roundIndex: number): RoundDefinition {
  const enemyCount = enemiesForLevelRound(levelNumber, roundIndex);
  const spawnsPerWave = distribute(enemyCount, WAVE_COUNT);
  const unlocked = unlockedPools(levelNumber);
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

function enemiesForLevelRound(levelNumber: number, roundIndex: number): number {
  const levelBase = BASE_ROUND_ENEMIES + (levelNumber - 1) * LEVEL_ENEMY_STEP;
  return levelBase + (roundIndex - 1) * ROUND_ENEMY_STEP;
}

function unlockedPools(levelNumber: number): { archetypes: EnemyArchetypeId[]; patterns: MovementPatternId[] } {
  const unlocks = Math.max(0, Math.floor((levelNumber - 1) / 3));
  const archetypes = [...BASE_ARCHETYPES];
  const patterns = [...BASE_PATTERNS];

  for (let i = 0; i < unlocks && i < UNLOCK_SEQUENCE.length; i += 1) {
    const unlock = UNLOCK_SEQUENCE[i];
    if (unlock.enemy && !archetypes.includes(unlock.enemy)) {
      archetypes.push(unlock.enemy);
    }
    if (unlock.pattern && !patterns.includes(unlock.pattern)) {
      patterns.push(unlock.pattern);
    }
  }

  return { archetypes, patterns };
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
