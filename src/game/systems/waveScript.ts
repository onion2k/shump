import { WORLD_BOUNDS } from '../core/constants';

export interface WaveSpawnDef {
  offsetMs: number;
  x: number;
  movementPattern: 'straight' | 'sine' | 'zigzag';
  patternAmplitude?: number;
  patternFrequency?: number;
}

export interface WaveDef {
  startMs: number;
  spawns: WaveSpawnDef[];
}

export interface ScheduledSpawn {
  atMs: number;
  x: number;
  y: number;
  movementPattern: 'straight' | 'sine' | 'zigzag';
  patternAmplitude: number;
  patternFrequency: number;
}

const TOP_SPAWN_Y = WORLD_BOUNDS.top + 1.2;

export function buildSpawnQueue(waves: WaveDef[]): ScheduledSpawn[] {
  const queue: ScheduledSpawn[] = [];

  for (const wave of waves) {
    for (const spawn of wave.spawns) {
      queue.push({
        atMs: wave.startMs + spawn.offsetMs,
        x: spawn.x,
        y: TOP_SPAWN_Y,
        movementPattern: spawn.movementPattern,
        patternAmplitude: spawn.patternAmplitude ?? 2,
        patternFrequency: spawn.patternFrequency ?? 1.8
      });
    }
  }

  queue.sort((a, b) => a.atMs - b.atMs);
  return queue;
}

export const defaultWaves: WaveDef[] = [
  {
    startMs: 500,
    spawns: [
      { offsetMs: 0, x: -4, movementPattern: 'straight' },
      { offsetMs: 300, x: 0, movementPattern: 'straight' },
      { offsetMs: 600, x: 4, movementPattern: 'straight' }
    ]
  },
  {
    startMs: 2500,
    spawns: [
      { offsetMs: 0, x: -5, movementPattern: 'sine', patternAmplitude: 2.4, patternFrequency: 2.2 },
      { offsetMs: 220, x: 5, movementPattern: 'sine', patternAmplitude: 2.4, patternFrequency: 2.2 },
      { offsetMs: 440, x: -2, movementPattern: 'zigzag', patternAmplitude: 1.5, patternFrequency: 2.8 },
      { offsetMs: 660, x: 2, movementPattern: 'zigzag', patternAmplitude: 1.5, patternFrequency: 2.8 }
    ]
  }
];
