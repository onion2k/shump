import { describe, expect, it } from 'vitest';
import { Game } from '../../src/game/core/Game';
import { GameState } from '../../src/game/core/GameState';
import { EntityType } from '../../src/game/ecs/entityTypes';

const IDLE_POINTER = {
  hasPosition: false,
  x: 0,
  y: 0,
  leftButtonDown: false,
  rightButtonDown: false
};

describe('Game round completion', () => {
  it('transitions to between-rounds when spawn plan is exhausted and enemies are cleared', () => {
    const game = new Game();
    game.startNewRun(101);

    let reachedBetweenRounds = false;
    for (let i = 0; i < 320; i += 1) {
      game.update(0.1, IDLE_POINTER);
      for (const entity of game.entities.all()) {
        if (entity.type === EntityType.Enemy) {
          entity.health = 0;
        }
      }

      if (game.snapshot().state === GameState.BetweenRounds) {
        reachedBetweenRounds = true;
        break;
      }
    }

    expect(reachedBetweenRounds).toBe(true);
    const snapshot = game.snapshot();
    expect(snapshot.state).toBe(GameState.BetweenRounds);
    expect(snapshot.roundIndex).toBe(1);
  });
});
