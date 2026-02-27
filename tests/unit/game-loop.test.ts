import { describe, it, expect, vi } from 'vitest';
import { GameLoop } from '../../src/game/core/GameLoop';

describe('GameLoop', () => {
  it('ticks in fixed steps', () => {
    const loop = new GameLoop();
    const tick = vi.fn();

    loop.frame(1, tick);
    loop.frame(34.34, tick);

    expect(tick).toHaveBeenCalledTimes(2);
  });
});
