import { describe, expect, it } from 'vitest';
import { Game } from '../../src/game/core/Game';
import { EntityType } from '../../src/game/ecs/entityTypes';
import { createEnemy } from '../../src/game/factories/createEnemy';
import { EntityManager } from '../../src/game/ecs/EntityManager';
import { despawnSystem } from '../../src/game/systems/despawnSystem';

const IDLE_POINTER = {
  hasPosition: false,
  x: 0,
  y: 0,
  leftButtonDown: false,
  rightButtonDown: false
} as const;

describe('game adaptive density scaling', () => {
  it('reduces pickup drops after sustained sub-60fps frame samples', () => {
    const baselineGame = new Game();
    baselineGame.start();
    spawnDestroyedEnemies(baselineGame, 40);
    baselineGame.update(0.016, IDLE_POINTER);
    const baselinePickups = baselineGame.entities.all().filter((entity) => entity.type === EntityType.Pickup).length;
    expect(baselinePickups).toBeGreaterThan(0);

    const adaptiveGame = new Game();
    adaptiveGame.start();
    adaptiveGame.setAdaptiveDensityEnabled(true);
    for (let i = 0; i < 240; i += 1) {
      adaptiveGame.reportFrameDelta(1 / 30);
    }

    spawnDestroyedEnemies(adaptiveGame, 40);
    adaptiveGame.update(0.016, IDLE_POINTER);
    const adaptivePickups = adaptiveGame.entities.all().filter((entity) => entity.type === EntityType.Pickup).length;

    expect(adaptivePickups).toBeLessThan(baselinePickups);
  });

  it('keeps pooled allocation stable under repeated enemy despawn cycles', () => {
    const entities = new EntityManager();
    entities.prewarmPools({ enemy: 16 });

    for (let tick = 0; tick < 60; tick += 1) {
      for (let i = 0; i < 24; i += 1) {
        const enemy = entities.create(createEnemy(0, 0, 'straight'));
        enemy.health = 0;
      }
      despawnSystem(entities, 0.016);
    }

    const stats = entities.poolStats();
    expect(stats.enemy.totalAllocated).toBe(24);
    expect(stats.enemy.pooled).toBe(24);
    expect(stats.enemy.active).toBe(0);
  });

  it('reports pool stats with internally consistent totals', () => {
    const game = new Game();
    game.start();
    spawnDestroyedEnemies(game, 20);
    game.update(0.016, IDLE_POINTER);

    const stats = game.debugStats();
    expect(stats.enemies + stats.enemyPoolFree).toBeLessThanOrEqual(stats.enemyPoolAllocated);
    expect(stats.bullets + stats.bulletPoolFree).toBeLessThanOrEqual(stats.bulletPoolAllocated);
    expect(stats.pickups + stats.pickupPoolFree).toBeLessThanOrEqual(stats.pickupPoolAllocated);
  });
});

function spawnDestroyedEnemies(game: Game, count: number) {
  for (let i = 0; i < count; i += 1) {
    const enemy = game.entities.create(createEnemy(0, 0, 'straight'));
    enemy.health = 0;
    enemy.velocity.y = 0;
  }
}
