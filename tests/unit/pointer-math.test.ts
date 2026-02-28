import { describe, it, expect } from 'vitest';
import { screenToWorld } from '../../src/game/input/pointerMath';
import { WORLD_BOUNDS } from '../../src/game/core/constants';

describe('screenToWorld', () => {
  it('maps screen center to world center', () => {
    const pos = screenToWorld(50, 50, 100, 100);
    expect(pos.x).toBeCloseTo(0, 4);
    expect(pos.y).toBeCloseTo(0, 4);
  });

  it('clamps to world bounds', () => {
    const pos = screenToWorld(-100, 1000, 100, 100);
    expect(pos.x).toBe(WORLD_BOUNDS.left);
    expect(pos.y).toBe(WORLD_BOUNDS.bottom);
  });

  it('maps pointer against game-area aspect, not full viewport', () => {
    const gameAreaRightEdgeX = 800 - ((800 - (800 * ((WORLD_BOUNDS.right - WORLD_BOUNDS.left) / (WORLD_BOUNDS.top - WORLD_BOUNDS.bottom)))) / 2);
    const posAtRightEdgeOfGameArea = screenToWorld(gameAreaRightEdgeX, 400, 800, 800);
    const posOutsideGameArea = screenToWorld(790, 400, 800, 800);

    expect(posAtRightEdgeOfGameArea.x).toBeCloseTo(WORLD_BOUNDS.right, 1);
    expect(posOutsideGameArea.x).toBe(WORLD_BOUNDS.right);
  });
});
