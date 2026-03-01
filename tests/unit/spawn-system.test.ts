import { describe, it, expect } from 'vitest';
import { SpawnSystem } from '../../src/game/systems/spawnSystem';
import { EntityManager } from '../../src/game/ecs/EntityManager';
import type { WaveDef } from '../../src/game/systems/waveScript';
import { EntityType } from '../../src/game/ecs/entityTypes';
import { WORLD_BOUNDS } from '../../src/game/core/constants';

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

  it('reports pending spawns and supports dynamic scripted wave replacement', () => {
    const firstPlan: WaveDef[] = [
      {
        startMs: 0,
        spawns: [{ offsetMs: 0, x: -2, movementPattern: 'straight' }]
      }
    ];
    const secondPlan: WaveDef[] = [
      {
        startMs: 300,
        spawns: [{ offsetMs: 0, x: 2, movementPattern: 'straight' }]
      }
    ];

    const entityManager = new EntityManager();
    const spawnSystem = new SpawnSystem(firstPlan);

    expect(spawnSystem.hasPendingSpawns()).toBe(true);
    spawnSystem.tick(entityManager, 0.05);
    expect(spawnSystem.hasPendingSpawns()).toBe(false);

    spawnSystem.setScriptedWaves(secondPlan);
    expect(spawnSystem.hasPendingSpawns()).toBe(true);
    spawnSystem.tick(entityManager, 0.1);
    expect(spawnSystem.hasPendingSpawns()).toBe(true);
    spawnSystem.tick(entityManager, 0.3);
    expect(spawnSystem.hasPendingSpawns()).toBe(false);
  });

  it('can spawn scripted enemies from the bottom edge', () => {
    const waves: WaveDef[] = [
      {
        startMs: 0,
        spawns: [{ offsetMs: 0, x: 4, spawnFrom: 'bottom', movementPattern: 'horseshoe' }]
      }
    ];
    const entityManager = new EntityManager();
    const spawnSystem = new SpawnSystem(waves);

    spawnSystem.tick(entityManager, 0.05, WORLD_BOUNDS);

    const [enemy] = entityManager.all();
    expect(enemy).toBeTruthy();
    expect(enemy.position.y).toBeCloseTo(WORLD_BOUNDS.bottom - 1.2);
  });

  it('spawns progression waves regularly and mixes archetypes at higher progress', () => {
    const entityManager = new EntityManager();
    const spawnSystem = new SpawnSystem();

    for (let i = 0; i < 360; i += 1) {
      spawnSystem.tick(entityManager, 0.05, WORLD_BOUNDS, 820);
    }

    const enemies = entityManager.all().filter((entity) => entity.type === EntityType.Enemy);
    const archetypes = new Set(enemies.map((enemy) => enemy.enemyArchetype));

    expect(enemies.length).toBeGreaterThan(8);
    expect(archetypes.has('scout')).toBe(true);
    expect(archetypes.has('striker')).toBe(true);
    expect(archetypes.size).toBeGreaterThanOrEqual(2);
  });

  it('caps active enemies to avoid overwhelming spikes', () => {
    const entityManager = new EntityManager();
    const spawnSystem = new SpawnSystem();

    for (let i = 0; i < 900; i += 1) {
      spawnSystem.tick(entityManager, 0.05, WORLD_BOUNDS, 0);
    }

    const enemies = entityManager.all().filter((entity) => entity.type === EntityType.Enemy);
    expect(enemies.length).toBeLessThanOrEqual(1000);
  });

  it('scales spawn density down and sheds overdue spawns when performance scale is reduced', () => {
    const waves: WaveDef[] = [
      {
        startMs: 0,
        spawns: [
          { offsetMs: 0, x: -4, movementPattern: 'straight' },
          { offsetMs: 0, x: -2, movementPattern: 'straight' },
          { offsetMs: 0, x: 0, movementPattern: 'straight' },
          { offsetMs: 0, x: 2, movementPattern: 'straight' },
          { offsetMs: 0, x: 4, movementPattern: 'straight' }
        ]
      }
    ];
    const entityManager = new EntityManager();
    const spawnSystem = new SpawnSystem(waves);

    spawnSystem.tick(entityManager, 0.05, WORLD_BOUNDS, 0, { enemyDensityScale: 0.4 });
    spawnSystem.tick(entityManager, 0.05, WORLD_BOUNDS, 0, { enemyDensityScale: 0.4 });

    const enemies = entityManager.all().filter((entity) => entity.type === EntityType.Enemy);
    expect(enemies.length).toBe(1);
  });
});
