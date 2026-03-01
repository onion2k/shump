import { describe, expect, it } from 'vitest';
import { Game } from '../../src/game/core/Game';
import { createEnemy } from '../../src/game/factories/createEnemy';
import { EntityType } from '../../src/game/ecs/entityTypes';

const NO_POINTER = {
  hasPosition: false,
  x: 0,
  y: 0,
  leftButtonDown: false,
  rightButtonDown: false
};

describe('enemy explosion particles', () => {
  it('spawns fire, smoke and enemy-color shards when an enemy is killed', () => {
    const game = new Game();
    game.start();
    const enemy = game.entities.create(createEnemy(0, 0));
    enemy.health = 0;

    game.update(0.016, NO_POINTER);
    expect(game.entities.get(enemy.id)).toBeUndefined();

    game.update(0.05, NO_POINTER);
    const earlyParticles = game
      .entities
      .all()
      .filter((entity) => entity.type === EntityType.Particle);

    expect(earlyParticles.some((entity) => entity.particleType === 'fire')).toBe(true);
    expect(earlyParticles.some((entity) => entity.particleType === 'enemy-shard')).toBe(true);

    game.update(0.2, NO_POINTER);
    const laterParticles = game
      .entities
      .all()
      .filter((entity) => entity.type === EntityType.Particle);

    expect(laterParticles.some((entity) => entity.particleType === 'smoke')).toBe(true);
  });
});
