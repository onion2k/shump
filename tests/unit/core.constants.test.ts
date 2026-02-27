import { describe, it, expect } from 'vitest';
import { WORLD_BOUNDS, FIXED_TIMESTEP_MS } from '../../src/game/core/constants';

describe('constants', () => {
  it('defines world bounds', () => {
    expect(WORLD_BOUNDS.left).toBeLessThan(WORLD_BOUNDS.right);
    expect(WORLD_BOUNDS.bottom).toBeLessThan(WORLD_BOUNDS.top);
  });

  it('uses a 60hz fixed timestep', () => {
    expect(FIXED_TIMESTEP_MS).toBeCloseTo(16.666, 2);
  });
});
