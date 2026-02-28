import { describe, it, expect } from 'vitest';
import {
  createDefaultMovementControllerRegistry,
  MovementControllerRegistry
} from '../../src/game/movement/controllers';

describe('MovementControllerRegistry', () => {
  it('provides default controllers with current behavior', () => {
    const registry = createDefaultMovementControllerRegistry();

    const straight = registry.resolve('straight');
    const sine = registry.resolve('sine');
    const zigzag = registry.resolve('zigzag');
    const bezier = registry.resolve('bezier');
    const lissajous = registry.resolve('lissajous');

    expect(
      straight({
        ageSeconds: 1,
        baseX: 4,
        baseY: 0,
        amplitude: 2,
        frequency: 3
      })
    ).toBeUndefined();

    expect(
      sine({
        ageSeconds: 0.5,
        baseX: 0,
        baseY: 0,
        amplitude: 2,
        frequency: 2
      })
    ).toBeCloseTo(Math.sin(1) * 2, 3);

    expect(
      zigzag({
        ageSeconds: 0.25,
        baseX: 1,
        baseY: 0,
        amplitude: 1.5,
        frequency: 3
      })
    ).toBe(2.5);

    expect(
      bezier({
        ageSeconds: 0.5,
        baseX: 2,
        baseY: 0,
        amplitude: 1.5,
        frequency: 1,
        params: {
          bezierStartX: 2,
          bezierControl1X: -2,
          bezierControl2X: 3,
          bezierEndX: -1
        }
      })
    ).toBeCloseTo(0.5, 2);

    const lissajousX = lissajous({
      ageSeconds: 0.4,
      baseX: -1,
      baseY: 0,
      amplitude: 2,
      frequency: 1.5,
      params: { lissajousA: 3, lissajousB: 2, lissajousPhase: 0.5 }
    });
    expect(lissajousX).toBeGreaterThan(-3.5);
    expect(lissajousX).toBeLessThan(1.5);
  });

  it('falls back to straight behavior when pattern is undefined', () => {
    const registry = new MovementControllerRegistry();
    registry.register('straight', () => undefined);

    const resolved = registry.resolve(undefined);
    expect(
      resolved({
        ageSeconds: 1,
        baseX: 0,
        baseY: 0,
        amplitude: 2,
        frequency: 2
      })
    ).toBeUndefined();
  });
});
