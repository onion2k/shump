import type { EnemyArchetypeId } from './enemyArchetypes';
import type { MovementPatternId } from '../movement/patterns';

export interface EncounterDirectorModifiers {
  enemyCountPercent: number;
  enemyArchetypeUnlocks: number;
  patternUnlocks: number;
}

export const DEFAULT_ENCOUNTER_DIRECTOR_MODIFIERS: EncounterDirectorModifiers = {
  enemyCountPercent: 0,
  enemyArchetypeUnlocks: 0,
  patternUnlocks: 0
};

export const ROUNDS_PER_LEVEL = 3;
export const BASE_ROUND_ENEMIES = 10;
export const ROUND_ENEMY_STEP = 5;
export const LEVEL_ENEMY_STEP = 5;
export const X_LANES = [-4.8, -2.4, 0, 2.4, 4.8] as const;

export interface RoundPacingProfile {
  waveCount: number;
  waveStartMs: number;
  waveGapMs: number;
  spawnGapMs: number;
  enemyHealthScale: number;
  formationWaveRatio: number;
  expectedRoundDurationMs: number;
}

export const BASE_ARCHETYPES: EnemyArchetypeId[] = ['scout'];
export const BASE_PATTERNS: MovementPatternId[] = ['straight', 'sine'];

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
  { pattern: 'horseshoe' },
  { enemy: 'raider' },
  { pattern: 'lissajous' },
  { enemy: 'sentinel' },
  { pattern: 'bezier' }
];

export function enemiesForLevelRound(
  levelNumber: number,
  roundIndex: number,
  modifiers: EncounterDirectorModifiers = DEFAULT_ENCOUNTER_DIRECTOR_MODIFIERS
): number {
  const levelBase = BASE_ROUND_ENEMIES + (levelNumber - 1) * LEVEL_ENEMY_STEP;
  const baseCount = levelBase + (roundIndex - 1) * ROUND_ENEMY_STEP;
  const countMultiplier = Math.max(0.2, 1 + modifiers.enemyCountPercent / 100);
  return Math.max(1, Math.round(baseCount * countMultiplier));
}

export function roundPacingProfile(levelNumber: number, roundIndex: number): RoundPacingProfile {
  const safeLevel = Math.max(1, Math.floor(levelNumber));
  const safeRound = Math.max(1, Math.min(ROUNDS_PER_LEVEL, Math.floor(roundIndex)));
  const difficultyIndex = (safeLevel - 1) * ROUNDS_PER_LEVEL + (safeRound - 1);

  const waveCount = clampInt(5 + Math.floor(difficultyIndex / 5), 5, 7);
  const waveStartMs = 1200;
  const waveGapMs = clampInt(11600 - difficultyIndex * 140, 8600, 11600);
  const spawnGapMs = clampInt(240 - difficultyIndex * 3, 120, 240);
  const enemyHealthScale = clampNumber(1.35 + difficultyIndex * 0.055, 1.35, 2.7);
  const formationWaveRatio = clampNumber(0.5 + difficultyIndex * 0.012, 0.5, 0.75);
  const expectedRoundDurationMs = waveStartMs + Math.max(0, waveCount - 1) * waveGapMs + spawnGapMs * 4 + 12000;

  return {
    waveCount,
    waveStartMs,
    waveGapMs,
    spawnGapMs,
    enemyHealthScale,
    formationWaveRatio,
    expectedRoundDurationMs
  };
}

export function unlockedPools(
  levelNumber: number,
  modifiers: EncounterDirectorModifiers = DEFAULT_ENCOUNTER_DIRECTOR_MODIFIERS
): { archetypes: EnemyArchetypeId[]; patterns: MovementPatternId[] } {
  const unlocks = Math.max(0, Math.floor((levelNumber - 1) / 3));
  const archetypes = [...BASE_ARCHETYPES];
  const patterns = [...BASE_PATTERNS];

  for (let i = 0; i < unlocks && i < UNLOCK_SEQUENCE.length; i += 1) {
    applyUnlock(UNLOCK_SEQUENCE[i], archetypes, patterns);
  }

  applyBonusUnlocks('enemy', Math.max(0, Math.floor(modifiers.enemyArchetypeUnlocks)), unlocks, archetypes, patterns);
  applyBonusUnlocks('pattern', Math.max(0, Math.floor(modifiers.patternUnlocks)), unlocks, archetypes, patterns);

  return { archetypes, patterns };
}

function applyBonusUnlocks(
  kind: 'enemy' | 'pattern',
  bonusCount: number,
  startIndex: number,
  archetypes: EnemyArchetypeId[],
  patterns: MovementPatternId[]
): void {
  if (bonusCount <= 0) {
    return;
  }

  let granted = 0;
  for (let i = startIndex; i < UNLOCK_SEQUENCE.length && granted < bonusCount; i += 1) {
    const unlock = UNLOCK_SEQUENCE[i];
    if (kind === 'enemy' && unlock.enemy && !archetypes.includes(unlock.enemy)) {
      archetypes.push(unlock.enemy);
      granted += 1;
      continue;
    }

    if (kind === 'pattern' && unlock.pattern && !patterns.includes(unlock.pattern)) {
      patterns.push(unlock.pattern);
      granted += 1;
    }
  }
}

function applyUnlock(
  unlock: { enemy?: EnemyArchetypeId; pattern?: MovementPatternId },
  archetypes: EnemyArchetypeId[],
  patterns: MovementPatternId[]
): void {
  if (unlock.enemy && !archetypes.includes(unlock.enemy)) {
    archetypes.push(unlock.enemy);
  }

  if (unlock.pattern && !patterns.includes(unlock.pattern)) {
    patterns.push(unlock.pattern);
  }
}

function clampInt(value: number, min: number, max: number): number {
  return Math.floor(clampNumber(value, min, max));
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
