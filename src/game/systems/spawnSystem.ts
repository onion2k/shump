import type { EntityManager } from '../ecs/EntityManager';
import { EntityType } from '../ecs/entityTypes';
import { createEnemy } from '../factories/createEnemy';
import {
  buildSpawnQueue,
  buildWaveSpawns,
  progressionLevel,
  type WaveSpawnDef,
  progressionWaveTemplates,
  spawnIntervalMsForLevel,
  type ScheduledSpawn,
  type WaveDef
} from './waveScript';
import { WORLD_BOUNDS } from '../core/constants';
import type { WorldBounds } from '../core/constants';
import { BASE_PLAYFIELD_BOUNDS, scaleXAcrossBounds } from '../core/playfieldBounds';

const MAX_SPAWNS_PER_TICK = 3;
const BASE_ACTIVE_ENEMY_CAP = 1000;

export class SpawnSystem {
  private elapsedMs = 0;
  private cursor = 0;
  private readonly queue: ScheduledSpawn[];
  private readonly scriptedMode: boolean;
  private waveCursor = 0;
  private nextWaveAtMs = 500;

  constructor(waves?: WaveDef[]) {
    this.scriptedMode = Array.isArray(waves);
    this.queue = waves ? buildSpawnQueue(waves) : [];
  }

  tick(entityManager: EntityManager, deltaSeconds: number, bounds: WorldBounds = WORLD_BOUNDS, distanceTraveled = 0) {
    this.elapsedMs += deltaSeconds * 1000;

    if (!this.scriptedMode) {
      this.scheduleProgressionWaves(distanceTraveled);
    }

    let spawnedThisTick = 0;
    let activeEnemies = this.countActiveEnemies(entityManager);
    const level = progressionLevel(distanceTraveled, this.elapsedMs);
    const activeEnemyCap = BASE_ACTIVE_ENEMY_CAP + Math.min(7, level * 2);

    while (this.cursor < this.queue.length && this.queue[this.cursor].atMs <= this.elapsedMs) {
      if (spawnedThisTick >= MAX_SPAWNS_PER_TICK || activeEnemies >= activeEnemyCap) {
        break;
      }

      const spawn = this.queue[this.cursor];
      const scaledX = scaleXAcrossBounds(spawn.x, BASE_PLAYFIELD_BOUNDS, bounds);
      const spawnY = bounds.top + 1.2;
      entityManager.create(
        createEnemy(
          scaledX,
          spawnY,
          spawn.movementPattern,
          spawn.patternAmplitude,
          spawn.patternFrequency,
          spawn.movementParams,
          spawn.enemyArchetype
        )
      );
      this.cursor += 1;
      spawnedThisTick += 1;
      activeEnemies += 1;
    }
  }

  reset() {
    this.elapsedMs = 0;
    this.cursor = 0;
    this.waveCursor = 0;
    this.nextWaveAtMs = 500;
  }

  private scheduleProgressionWaves(distanceTraveled: number) {
    const level = progressionLevel(distanceTraveled, this.elapsedMs);
    const intervalMs = spawnIntervalMsForLevel(level);
    const lookAheadMs = 1000;

    while (this.nextWaveAtMs <= this.elapsedMs + lookAheadMs) {
      const template = progressionWaveTemplates[this.waveCursor % progressionWaveTemplates.length];
      this.waveCursor += 1;

      const eligibleSpawns = template.spawns.filter((spawn) => (spawn.unlockLevel ?? 0) <= level);
      if (eligibleSpawns.length > 0) {
        const selectedSpawn = eligibleSpawns[(this.waveCursor - 1) % eligibleSpawns.length];
        const selectedSpawns = [this.withSpreadSpawnX(selectedSpawn, this.waveCursor)];
        const waveSpawns = buildWaveSpawns(selectedSpawns, this.nextWaveAtMs);
        this.queue.push(...waveSpawns);
        this.queue.sort((a, b) => a.atMs - b.atMs);
      }

      this.nextWaveAtMs += intervalMs;
    }
  }

  private countActiveEnemies(entityManager: EntityManager): number {
    return entityManager
      .all()
      .filter((entity) => entity.type === EntityType.Enemy && entity.health > 0).length;
  }

  private withSpreadSpawnX(spawn: WaveSpawnDef, seed: number): WaveSpawnDef {
    const innerPadding = 0.8;
    const minX = BASE_PLAYFIELD_BOUNDS.left + innerPadding;
    const maxX = BASE_PLAYFIELD_BOUNDS.right - innerPadding;
    const span = maxX - minX;
    const normalized = (seed * 0.61803398875) % 1;
    const spreadX = minX + span * normalized;
    return {
      ...spawn,
      x: spreadX
    };
  }
}
