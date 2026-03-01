import { WORLD_BOUNDS } from '../core/constants';
import type { EnemyArchetypeId } from '../content/enemyArchetypes';
import type { MovementPatternId } from '../movement/patterns';

export interface WaveSpawnDef {
  offsetMs: number;
  x: number;
  movementPattern: MovementPatternId;
  patternAmplitude?: number;
  patternFrequency?: number;
  movementParams?: Record<string, number>;
  enemyArchetype?: EnemyArchetypeId;
  unlockLevel?: number;
}

export interface WaveDef {
  startMs: number;
  spawns: WaveSpawnDef[];
}

export interface ScheduledSpawn {
  atMs: number;
  x: number;
  y: number;
  movementPattern: MovementPatternId;
  patternAmplitude: number;
  patternFrequency: number;
  movementParams?: Record<string, number>;
  enemyArchetype: EnemyArchetypeId;
}

export interface WaveTemplate {
  id: string;
  spawns: WaveSpawnDef[];
}

const TOP_SPAWN_Y = WORLD_BOUNDS.top + 1.2;

export function buildSpawnQueue(waves: WaveDef[]): ScheduledSpawn[] {
  const queue: ScheduledSpawn[] = [];

  for (const wave of waves) {
    queue.push(...buildWaveSpawns(wave.spawns, wave.startMs));
  }

  queue.sort((a, b) => a.atMs - b.atMs);
  return queue;
}

export function buildWaveSpawns(spawns: WaveSpawnDef[], startMs: number): ScheduledSpawn[] {
  return spawns.map((spawn) => ({
    atMs: startMs + spawn.offsetMs,
    x: spawn.x,
    y: TOP_SPAWN_Y,
    movementPattern: spawn.movementPattern,
    patternAmplitude: spawn.patternAmplitude ?? 2,
    patternFrequency: spawn.patternFrequency ?? 1.8,
    movementParams: spawn.movementParams,
    enemyArchetype: spawn.enemyArchetype ?? 'scout'
  }));
}

export function progressionLevel(distanceTraveled: number, elapsedMs: number): number {
  const distanceLevel = Math.floor(Math.max(0, distanceTraveled) / 120);
  const timeLevel = Math.floor(Math.max(0, elapsedMs) / 50000);
  return Math.min(8, distanceLevel + timeLevel);
}

export function spawnIntervalMsForLevel(_level: number): number {
  return 40;
}

export const progressionWaveTemplates: WaveTemplate[] = [
  {
    id: 'opening-line',
    spawns: [
      { offsetMs: 0, x: -4, movementPattern: 'straight', enemyArchetype: 'scout' },
      { offsetMs: 260, x: 0, movementPattern: 'straight', enemyArchetype: 'scout' },
      { offsetMs: 520, x: 4, movementPattern: 'straight', enemyArchetype: 'scout' }
    ]
  },
  {
    id: 'curve-sweep',
    spawns: [
      {
        offsetMs: 0,
        x: -5,
        movementPattern: 'curve',
        patternAmplitude: 3.5,
        patternFrequency: 0.9,
        movementParams: { curveDirection: 1 },
        enemyArchetype: 'scout'
      },
      {
        offsetMs: 220,
        x: 5,
        movementPattern: 'curve',
        patternAmplitude: 3.5,
        patternFrequency: 0.9,
        movementParams: { curveDirection: -1 },
        enemyArchetype: 'scout'
      },
      {
        offsetMs: 500,
        x: 0,
        movementPattern: 'curve',
        patternAmplitude: 2.2,
        patternFrequency: 1,
        movementParams: { curveDirection: 1 },
        enemyArchetype: 'striker',
        unlockLevel: 1
      }
    ]
  },
  {
    id: 'sine-zig-pincer',
    spawns: [
      { offsetMs: 0, x: -5, movementPattern: 'sine', patternAmplitude: 2.2, patternFrequency: 2, enemyArchetype: 'scout' },
      {
        offsetMs: 160,
        x: 5,
        movementPattern: 'sine',
        patternAmplitude: 2.2,
        patternFrequency: 2,
        enemyArchetype: 'scout'
      },
      {
        offsetMs: 380,
        x: -2,
        movementPattern: 'zigzag',
        patternAmplitude: 1.4,
        patternFrequency: 2.7,
        enemyArchetype: 'striker',
        unlockLevel: 1
      },
      {
        offsetMs: 560,
        x: 2,
        movementPattern: 'zigzag',
        patternAmplitude: 1.4,
        patternFrequency: 2.7,
        enemyArchetype: 'striker',
        unlockLevel: 1
      }
    ]
  },
  {
    id: 'spiral-drill',
    spawns: [
      {
        offsetMs: 0,
        x: 0,
        movementPattern: 'spiral',
        patternAmplitude: 3,
        patternFrequency: 1.05,
        movementParams: { spiralTurns: 1.7, spiralDecay: 0.36 },
        enemyArchetype: 'striker',
        unlockLevel: 2
      },
      {
        offsetMs: 280,
        x: -3,
        movementPattern: 'spiral',
        patternAmplitude: 2.1,
        patternFrequency: 1.15,
        movementParams: { spiralTurns: 2.2, spiralDecay: 0.5 },
        enemyArchetype: 'scout',
        unlockLevel: 2
      },
      {
        offsetMs: 560,
        x: 3,
        movementPattern: 'spiral',
        patternAmplitude: 2.1,
        patternFrequency: 1.15,
        movementParams: { spiralTurns: 2.2, spiralDecay: 0.5 },
        enemyArchetype: 'scout',
        unlockLevel: 2
      }
    ]
  },
  {
    id: 'bezier-arc',
    spawns: [
      {
        offsetMs: 0,
        x: -4,
        movementPattern: 'bezier',
        patternAmplitude: 2,
        patternFrequency: 1,
        movementParams: {
          bezierStartX: -4,
          bezierControl1X: -1.5,
          bezierControl2X: 0.8,
          bezierEndX: 2.8
        },
        enemyArchetype: 'striker',
        unlockLevel: 2
      },
      {
        offsetMs: 250,
        x: 4,
        movementPattern: 'bezier',
        patternAmplitude: 2,
        patternFrequency: 1,
        movementParams: {
          bezierStartX: 4,
          bezierControl1X: 1.5,
          bezierControl2X: -0.8,
          bezierEndX: -2.8
        },
        enemyArchetype: 'striker',
        unlockLevel: 2
      },
      {
        offsetMs: 520,
        x: 0,
        movementPattern: 'straight',
        enemyArchetype: 'tank',
        unlockLevel: 3
      }
    ]
  },
  {
    id: 'late-mix',
    spawns: [
      {
        offsetMs: 0,
        x: -4.5,
        movementPattern: 'lissajous',
        patternAmplitude: 2.4,
        patternFrequency: 1.6,
        movementParams: { lissajousA: 3, lissajousB: 2, lissajousPhase: 0.3 },
        enemyArchetype: 'striker',
        unlockLevel: 4
      },
      {
        offsetMs: 220,
        x: 4.5,
        movementPattern: 'spiral',
        patternAmplitude: 2.5,
        patternFrequency: 1.2,
        movementParams: { spiralTurns: 2.1, spiralDecay: 0.42 },
        enemyArchetype: 'striker',
        unlockLevel: 4
      },
      {
        offsetMs: 440,
        x: 0,
        movementPattern: 'curve',
        patternAmplitude: 2.2,
        patternFrequency: 1.15,
        movementParams: { curveDirection: -1 },
        enemyArchetype: 'tank',
        unlockLevel: 5
      }
    ]
  }
];

export const defaultWaves: WaveDef[] = [
  {
    startMs: 500,
    spawns: progressionWaveTemplates[0].spawns
  },
  {
    startMs: 2400,
    spawns: progressionWaveTemplates[1].spawns
  }
];
