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
});
