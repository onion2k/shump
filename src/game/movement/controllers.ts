import type { MovementPatternId } from './patterns';

export interface MovementControllerContext {
  ageSeconds: number;
  baseX: number;
  baseY: number;
  amplitude: number;
  frequency: number;
  params?: Record<string, number>;
}

export type MovementController = (context: MovementControllerContext) => number | undefined;

export class MovementControllerRegistry {
  private readonly controllers = new Map<MovementPatternId, MovementController>();

  register(pattern: MovementPatternId, controller: MovementController) {
    this.controllers.set(pattern, controller);
  }

  resolve(pattern: MovementPatternId | undefined): MovementController {
    const key = pattern ?? 'straight';
    return this.controllers.get(key) ?? defaultStraightController;
  }
}

const defaultStraightController: MovementController = () => undefined;
const defaultSineController: MovementController = ({ ageSeconds, baseX, amplitude, frequency }) =>
  baseX + Math.sin(ageSeconds * frequency) * amplitude;
const defaultZigZagController: MovementController = ({ ageSeconds, baseX, amplitude, frequency }) =>
  baseX + Math.sign(Math.sin(ageSeconds * frequency)) * amplitude;
const defaultBezierController: MovementController = ({ ageSeconds, baseX, amplitude, frequency, params }) => {
  const rawT = ageSeconds * frequency;
  const loop = params?.bezierLoop === 1;
  const t = loop ? rawT - Math.floor(rawT) : clamp(rawT, 0, 1);
  const startX = params?.bezierStartX ?? baseX;
  const endX = params?.bezierEndX ?? baseX;
  const cp1 = params?.bezierControl1X ?? baseX - amplitude;
  const cp2 = params?.bezierControl2X ?? baseX + amplitude;
  return cubicBezier(startX, cp1, cp2, endX, t);
};
const defaultLissajousController: MovementController = ({ ageSeconds, baseX, amplitude, frequency, params }) => {
  const a = params?.lissajousA ?? 3;
  const b = params?.lissajousB ?? 2;
  const phase = params?.lissajousPhase ?? 0;
  const t = ageSeconds * frequency;
  const modulation = 0.65 + 0.35 * Math.cos(t * b);
  return baseX + Math.sin(t * a + phase) * amplitude * modulation;
};

export function createDefaultMovementControllerRegistry(): MovementControllerRegistry {
  const registry = new MovementControllerRegistry();
  registry.register('straight', defaultStraightController);
  registry.register('sine', defaultSineController);
  registry.register('zigzag', defaultZigZagController);
  registry.register('bezier', defaultBezierController);
  registry.register('lissajous', defaultLissajousController);
  return registry;
}

export const movementControllerRegistry = createDefaultMovementControllerRegistry();

function cubicBezier(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const u = 1 - t;
  return u ** 3 * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t ** 3 * p3;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
