import { describe, it, expect } from 'vitest';
import { Game } from '../../src/game/core/Game';
import { GameState } from '../../src/game/core/GameState';

describe('game flow', () => {
  it('transitions boot -> playing and updates score/health snapshot shape', () => {
    const game = new Game();
    expect(game.snapshot().state).toBe(GameState.Boot);

    game.start();
    game.update(0.016, { active: true, x: 0, y: -8 });

    const snapshot = game.snapshot();
    expect(snapshot.state).toBe(GameState.Playing);
    expect(typeof snapshot.score).toBe('number');
    expect(typeof snapshot.playerHealth).toBe('number');
  });
});
