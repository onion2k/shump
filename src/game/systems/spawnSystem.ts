import type { EntityManager } from '../ecs/EntityManager';
import { createEnemy } from '../factories/createEnemy';
import { buildSpawnQueue, defaultWaves, type ScheduledSpawn, type WaveDef } from './waveScript';
import { WORLD_BOUNDS } from '../core/constants';
import type { WorldBounds } from '../core/constants';

export class SpawnSystem {
  private elapsedMs = 0;
  private cursor = 0;
  private readonly queue: ScheduledSpawn[];

  constructor(waves: WaveDef[] = defaultWaves) {
    this.queue = buildSpawnQueue(waves);
  }

  tick(entityManager: EntityManager, deltaSeconds: number, bounds: WorldBounds = WORLD_BOUNDS) {
    this.elapsedMs += deltaSeconds * 1000;

    while (this.cursor < this.queue.length && this.queue[this.cursor].atMs <= this.elapsedMs) {
      const spawn = this.queue[this.cursor];
      const baseWidth = WORLD_BOUNDS.right - WORLD_BOUNDS.left;
      const dynamicWidth = bounds.right - bounds.left;
      const widthScale = dynamicWidth / baseWidth;
      const scaledX = spawn.x * widthScale;
      const spawnY = bounds.top + 1.2;
      entityManager.create(
        createEnemy(
          scaledX,
          spawnY,
          spawn.movementPattern,
          spawn.patternAmplitude,
          spawn.patternFrequency
        )
      );
      this.cursor += 1;
    }
  }

  reset() {
    this.elapsedMs = 0;
    this.cursor = 0;
  }
}
