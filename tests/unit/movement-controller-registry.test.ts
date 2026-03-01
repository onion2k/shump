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
    const curve = registry.resolve('curve');
    const spiral = registry.resolve('spiral');
    const sweep = registry.resolve('sweep');
    const shallowZigZag = registry.resolve('shallow-zigzag');
    const horseshoe = registry.resolve('horseshoe');

    expect(
      straight({
        ageSeconds: 1,
        baseX: 4,
        baseY: 0,
        driftX: 4,
        driftY: -3,
        amplitude: 2,
        frequency: 3
      })
    ).toEqual({ x: 4, y: -3 });

    const sinePoint = sine({
      ageSeconds: 0.5,
      baseX: 0,
      baseY: 0,
      driftX: 0,
      driftY: -1.75,
      amplitude: 2,
      frequency: 2
    });
    expect(sinePoint?.x).toBeCloseTo(Math.sin(1) * 2, 3);
    expect(sinePoint?.y).toBeCloseTo(-1.75, 3);

    const zigzagPoint = zigzag({
      ageSeconds: 0.25,
      baseX: 1,
      baseY: 0,
      driftX: 1,
      driftY: -0.7,
      amplitude: 1.5,
      frequency: 3
    });
    expect((zigzagPoint?.x ?? 0)).toBeGreaterThan(1.6);
    expect((zigzagPoint?.x ?? 0)).toBeLessThan(2.5);
    expect((zigzagPoint?.y ?? 0)).not.toBe(-0.7);

    const bezierPoint = bezier({
      ageSeconds: 0.5,
      baseX: 2,
      baseY: 0,
      driftX: 2,
      driftY: -1.4,
      amplitude: 1.5,
      frequency: 1,
      params: {
        bezierStartX: 2,
        bezierControl1X: -2,
        bezierControl2X: 3,
        bezierEndX: -1
      }
    });
    expect(bezierPoint?.x).toBeCloseTo(0.5, 2);
    expect((bezierPoint?.y ?? 0)).toBeCloseTo(-1.4, 3);

    const lissajousPoint = lissajous({
      ageSeconds: 0.4,
      baseX: -1,
      baseY: 0,
      driftX: -1,
      driftY: -1.2,
      amplitude: 2,
      frequency: 1.5,
      params: { lissajousA: 3, lissajousB: 2, lissajousPhase: 0.5 }
    });
    expect((lissajousPoint?.x ?? 0)).toBeGreaterThan(-3.5);
    expect((lissajousPoint?.x ?? 0)).toBeLessThan(1.5);
    expect((lissajousPoint?.y ?? 0)).not.toBe(-1.2);

    const curvePoint = curve({
      ageSeconds: 0.8,
      baseX: -3,
      baseY: 0,
      driftX: -3,
      driftY: -2.4,
      amplitude: 3,
      frequency: 1,
      params: { curveDirection: 1 }
    });
    expect((curvePoint?.x ?? 0)).toBeGreaterThan(-2.2);
    expect((curvePoint?.y ?? 0)).not.toBe(-2.4);

    const earlySpiral = spiral({
      ageSeconds: 0.1,
      baseX: 0,
      baseY: 0,
      driftX: 0,
      driftY: -0.2,
      amplitude: 3,
      frequency: 1,
      params: { spiralTurns: 2, spiralDecay: 0.5 }
    });
    const lateSpiral = spiral({
      ageSeconds: 1.1,
      baseX: 0,
      baseY: 0,
      driftX: 0,
      driftY: -2.2,
      amplitude: 3,
      frequency: 1,
      params: { spiralTurns: 2, spiralDecay: 0.5 }
    });
    expect(Math.abs(earlySpiral?.x ?? 0)).toBeGreaterThan(Math.abs(lateSpiral?.x ?? 0));
    expect((earlySpiral?.y ?? 0)).not.toBe(-0.2);

    const sweepMid = sweep({
      ageSeconds: 2.5,
      baseX: 5.2,
      baseY: 14.8,
      driftX: 5.2,
      driftY: 9.8,
      amplitude: 5,
      frequency: 0.2,
      params: { sweepStartX: 5.2, sweepEndX: -5.2, sweepDepth: 24, periodSeconds: 5 }
    });
    expect((sweepMid?.x ?? 0)).toBeCloseTo(0, 1);
    expect((sweepMid?.y ?? 0)).toBeLessThan(-7);

    const shallowPoint = shallowZigZag({
      ageSeconds: 0.8,
      baseX: 0,
      baseY: 10,
      driftX: 0,
      driftY: 8.4,
      amplitude: 1.8,
      frequency: 1.4,
      params: { xScale: 0.55 }
    });
    expect(Math.abs(shallowPoint?.x ?? 0)).toBeLessThan(2);
    expect((shallowPoint?.y ?? 0)).toBeLessThan(8.5);

    const horseshoeTop = horseshoe({
      ageSeconds: 2.5,
      baseX: 4.8,
      baseY: -15.2,
      driftX: 4.8,
      driftY: -18.2,
      amplitude: 4.2,
      frequency: 0.23,
      params: { radiusX: 4.8, riseHeight: 26, periodSeconds: 5 }
    });
    expect((horseshoeTop?.x ?? 0)).toBeCloseTo(0, 1);
    expect((horseshoeTop?.y ?? 0)).toBeGreaterThan(9);
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
        driftX: 0,
        driftY: -1,
        amplitude: 2,
        frequency: 2
      })
    ).toBeUndefined();
  });
});
