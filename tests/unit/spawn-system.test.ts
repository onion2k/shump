import { describe, it, expect } from 'vitest';
import { SpawnSystem } from '../../src/game/systems/spawnSystem';
import { EntityManager } from '../../src/game/ecs/EntityManager';
import type { WaveDef } from '../../src/game/systems/waveScript';
import { EntityType } from '../../src/game/ecs/entityTypes';

describe('SpawnSystem wave scripting', () => {
  it('spawns scripted enemies only after their scheduled times', () => {
    const waves: WaveDef[] = [
      {
        startMs: 100,
        spawns: [
          { offsetMs: 0, x: -3, movementPattern: 'straight' },
          { offsetMs: 100, x: 3, movementPattern: 'sine', patternAmplitude: 2, patternFrequency: 2 }
        ]
      }
    ];

    const entityManager = new EntityManager();
    const spawnSystem = new SpawnSystem(waves);

    spawnSystem.tick(entityManager, 0.09);
    expect(entityManager.count()).toBe(0);

    spawnSystem.tick(entityManager, 0.02);
    expect(entityManager.count()).toBe(1);

    const firstEnemy = entityManager.all()[0];
    expect(firstEnemy.type).toBe(EntityType.Enemy);
    expect(firstEnemy.position.x).toBe(-3);

    spawnSystem.tick(entityManager, 0.11);
    expect(entityManager.count()).toBe(2);
  });

  it('resets elapsed schedule state', () => {
    const waves: WaveDef[] = [
      {
        startMs: 0,
        spawns: [{ offsetMs: 0, x: 0, movementPattern: 'straight' }]
      }
    ];

    const entityManager = new EntityManager();
    const spawnSystem = new SpawnSystem(waves);

    spawnSystem.tick(entityManager, 0.01);
    expect(entityManager.count()).toBe(1);

    spawnSystem.reset();
    const newRunEntities = new EntityManager();
    spawnSystem.tick(newRunEntities, 0.01);
    expect(newRunEntities.count()).toBe(1);
  });
});
