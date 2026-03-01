import { WORLD_BOUNDS } from '../core/constants';
import type { EnemyArchetypeId } from '../content/enemyArchetypes';
import type { MovementPatternId } from '../movement/patterns';

export interface WaveSpawnDef {
  offsetMs: number;
  x: number;
  spawnFrom?: 'top' | 'bottom';
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
  spawnFrom: 'top' | 'bottom';
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
    spawnFrom: spawn.spawnFrom ?? 'top',
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

export function spawnIntervalMsForLevel(level: number): number {
  void level;
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
    id: 'giant-sine-ribbon',
    spawns: [
      {
        offsetMs: 0,
        x: -4.5,
        movementPattern: 'sine',
        patternAmplitude: 4.8,
        patternFrequency: 1.05,
        enemyArchetype: 'striker',
        unlockLevel: 3
      },
      {
        offsetMs: 220,
        x: -1.5,
        movementPattern: 'sine',
        patternAmplitude: 4.8,
        patternFrequency: 1.05,
        enemyArchetype: 'striker',
        unlockLevel: 3
      },
      {
        offsetMs: 440,
        x: 1.5,
        movementPattern: 'sine',
        patternAmplitude: 4.8,
        patternFrequency: 1.05,
        enemyArchetype: 'striker',
        unlockLevel: 3
      },
      {
        offsetMs: 660,
        x: 4.5,
        movementPattern: 'sine',
        patternAmplitude: 4.8,
        patternFrequency: 1.05,
        enemyArchetype: 'striker',
        unlockLevel: 3
      }
    ]
  },
  {
    id: 'sweeping-crescent',
    spawns: [
      {
        offsetMs: 0,
        x: 5.4,
        movementPattern: 'sweep',
        patternAmplitude: 5.2,
        patternFrequency: 0.18,
        movementParams: { sweepStartX: 5.4, sweepEndX: -5.4, sweepDepth: 24, periodSeconds: 5.8 },
        enemyArchetype: 'tank',
        unlockLevel: 4
      },
      {
        offsetMs: 520,
        x: 5.2,
        movementPattern: 'sweep',
        patternAmplitude: 5,
        patternFrequency: 0.2,
        movementParams: { sweepStartX: 5.2, sweepEndX: -5.2, sweepDepth: 22, periodSeconds: 5.2 },
        enemyArchetype: 'striker',
        unlockLevel: 5
      }
    ]
  },
  {
    id: 'shallow-zig-rain',
    spawns: [
      {
        offsetMs: 0,
        x: -4.8,
        movementPattern: 'shallow-zigzag',
        patternAmplitude: 1.6,
        patternFrequency: 1.35,
        movementParams: { xScale: 0.55, yAmplitude: 0.18, yFrequency: 0.9 },
        enemyArchetype: 'scout',
        unlockLevel: 2
      },
      {
        offsetMs: 180,
        x: -1.8,
        movementPattern: 'shallow-zigzag',
        patternAmplitude: 1.5,
        patternFrequency: 1.4,
        movementParams: { xScale: 0.55, yAmplitude: 0.16, yFrequency: 1 },
        enemyArchetype: 'scout',
        unlockLevel: 2
      },
      {
        offsetMs: 360,
        x: 1.8,
        movementPattern: 'shallow-zigzag',
        patternAmplitude: 1.5,
        patternFrequency: 1.4,
        movementParams: { xScale: 0.55, yAmplitude: 0.16, yFrequency: 1 },
        enemyArchetype: 'striker',
        unlockLevel: 3
      },
      {
        offsetMs: 540,
        x: 4.8,
        movementPattern: 'shallow-zigzag',
        patternAmplitude: 1.6,
        patternFrequency: 1.35,
        movementParams: { xScale: 0.55, yAmplitude: 0.18, yFrequency: 0.9 },
        enemyArchetype: 'striker',
        unlockLevel: 3
      }
    ]
  },
  {
    id: 'horseshoe-climb',
    spawns: [
      {
        offsetMs: 0,
        x: 4.8,
        spawnFrom: 'bottom',
        movementPattern: 'horseshoe',
        patternAmplitude: 4.2,
        patternFrequency: 0.23,
        movementParams: { radiusX: 4.8, riseHeight: 26, periodSeconds: 5.1 },
        enemyArchetype: 'striker',
        unlockLevel: 5
      },
      {
        offsetMs: 420,
        x: -4.8,
        spawnFrom: 'bottom',
        movementPattern: 'horseshoe',
        patternAmplitude: 4.2,
        patternFrequency: 0.23,
        movementParams: { radiusX: -4.8, riseHeight: 26, periodSeconds: 5.1 },
        enemyArchetype: 'bruiser',
        unlockLevel: 6
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
        enemyArchetype: 'bruiser',
        unlockLevel: 5
      }
    ]
  },
  {
    id: 'heavy-crusher',
    spawns: [
      {
        offsetMs: 0,
        x: -2,
        movementPattern: 'straight',
        enemyArchetype: 'bruiser',
        unlockLevel: 5
      },
      {
        offsetMs: 220,
        x: 2,
        movementPattern: 'spiral',
        patternAmplitude: 2.3,
        patternFrequency: 1.1,
        movementParams: { spiralTurns: 1.4, spiralDecay: 0.32 },
        enemyArchetype: 'bruiser',
        unlockLevel: 6
      },
      {
        offsetMs: 520,
        x: 0,
        movementPattern: 'curve',
        patternAmplitude: 1.9,
        patternFrequency: 1.05,
        movementParams: { curveDirection: 1 },
        enemyArchetype: 'juggernaut',
        unlockLevel: 7
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
