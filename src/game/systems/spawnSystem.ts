import type { EntityManager } from '../ecs/EntityManager';
import { createEnemy } from '../factories/createEnemy';
import { buildSpawnQueue, defaultWaves, type ScheduledSpawn, type WaveDef } from './waveScript';

export class SpawnSystem {
  private elapsedMs = 0;
  private cursor = 0;
  private readonly queue: ScheduledSpawn[];

  constructor(waves: WaveDef[] = defaultWaves) {
    this.queue = buildSpawnQueue(waves);
  }

  tick(entityManager: EntityManager, deltaSeconds: number) {
    this.elapsedMs += deltaSeconds * 1000;

    while (this.cursor < this.queue.length && this.queue[this.cursor].atMs <= this.elapsedMs) {
      const spawn = this.queue[this.cursor];
      entityManager.create(
        createEnemy(
          spawn.x,
          spawn.y,
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
