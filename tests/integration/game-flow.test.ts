import { describe, it, expect } from 'vitest';
import { Game } from '../../src/game/core/Game';
import { GameState } from '../../src/game/core/GameState';

describe('game flow', () => {
  it('transitions boot -> playing and exposes hud snapshot fields', () => {
    const game = new Game();
    expect(game.snapshot().state).toBe(GameState.Boot);

    game.start();
    game.update(0.016, {
      hasPosition: true,
      x: 0,
      y: -8,
      leftButtonDown: false,
      rightButtonDown: false
    });

    const snapshot = game.snapshot();
    expect(snapshot.state).toBe(GameState.Playing);
    expect(typeof snapshot.score).toBe('number');
    expect(typeof snapshot.playerHealth).toBe('number');
    expect(snapshot.playerMaxHealth).toBeGreaterThan(0);
    expect(snapshot.weaponMode).toBeTruthy();
    expect(snapshot.weaponLevel).toBeGreaterThan(0);
    expect(snapshot.weaponEnergyMax).toBeGreaterThan(0);
    expect(snapshot.weaponEnergyCurrent).toBeGreaterThanOrEqual(0);
  });
});
