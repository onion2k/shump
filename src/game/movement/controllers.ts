import type { MovementPatternId } from './patterns';

export interface MovementControllerContext {
  ageSeconds: number;
  baseX: number;
  baseY: number;
  driftX: number;
  driftY: number;
  amplitude: number;
  frequency: number;
  params?: Record<string, number>;
}

export interface ControlledPosition {
  x: number;
  y: number;
}

export type MovementController = (context: MovementControllerContext) => ControlledPosition | undefined;

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

const defaultStraightController: MovementController = ({ driftX, driftY }) => ({ x: driftX, y: driftY });
const defaultSineController: MovementController = ({ ageSeconds, driftX, driftY, amplitude, frequency, params }) => {
  const t = ageSeconds * frequency;
  const verticalAmplitude = params?.yAmplitude ?? 0;
  const verticalFrequency = params?.yFrequency ?? frequency * 0.72;
  return {
    x: driftX + Math.sin(t) * amplitude,
    y: driftY + Math.cos(ageSeconds * verticalFrequency) * verticalAmplitude
  };
};
const defaultZigZagController: MovementController = ({ ageSeconds, baseX, driftY, amplitude, frequency, params }) => {
  const t = ageSeconds * frequency;
  const verticalAmplitude = params?.yAmplitude ?? amplitude * 0.35;
  const verticalFrequency = params?.yFrequency ?? frequency * 0.9;
  const smoothZig = Math.sin(t) + 0.22 * Math.sin(t * 3);
  return {
    x: baseX + smoothZig * amplitude * 0.82,
    y: driftY + Math.sin(ageSeconds * verticalFrequency) * verticalAmplitude
  };
};
const defaultBezierController: MovementController = ({ ageSeconds, baseX, driftY, amplitude, frequency, params }) => {
  const rawT = ageSeconds * frequency;
  const loop = params?.bezierLoop !== 0;
  const t = loop ? rawT - Math.floor(rawT) : clamp(rawT, 0, 1);
  const startX = params?.bezierStartX ?? baseX;
  const endX = params?.bezierEndX ?? baseX;
  const cp1 = params?.bezierControl1X ?? baseX - amplitude;
  const cp2 = params?.bezierControl2X ?? baseX + amplitude;
  const verticalAmplitude = params?.yAmplitude ?? amplitude * 0.5;
  const arc = Math.sin(t * Math.PI * 2) * verticalAmplitude;
  return { x: cubicBezier(startX, cp1, cp2, endX, t), y: driftY + arc };
};
const defaultLissajousController: MovementController = ({ ageSeconds, baseX, driftY, amplitude, frequency, params }) => {
  const a = params?.lissajousA ?? 3;
  const b = params?.lissajousB ?? 2;
  const phase = params?.lissajousPhase ?? 0;
  const verticalAmplitude = params?.yAmplitude ?? amplitude * 0.62;
  const t = ageSeconds * frequency;
  const modulation = 0.65 + 0.35 * Math.cos(t * b);
  return {
    x: baseX + Math.sin(t * a + phase) * amplitude * modulation,
    y: driftY + Math.sin(t * b + phase * 0.5) * verticalAmplitude
  };
};
const defaultCurveController: MovementController = ({ ageSeconds, baseX, driftY, amplitude, frequency, params }) => {
  const direction = params?.curveDirection ?? 1;
  const verticalAmplitude = params?.yAmplitude ?? amplitude * 0.28;
  const t = ageSeconds * frequency;
  const eased = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
  return {
    x: baseX + direction * amplitude * eased,
    y: driftY + Math.sin(t * Math.PI * 2) * verticalAmplitude
  };
};
const defaultSpiralController: MovementController = ({ ageSeconds, baseX, driftY, amplitude, frequency, params }) => {
  const spiralTurns = params?.spiralTurns ?? 1.8;
  const decay = params?.spiralDecay ?? 0.45;
  const theta = ageSeconds * frequency * Math.PI * 2 * spiralTurns;
  const minRadiusFactor = params?.spiralMinRadiusFactor ?? 0.35;
  const decayed = Math.exp(-ageSeconds * frequency * decay);
  const radius = amplitude * (minRadiusFactor + (1 - minRadiusFactor) * decayed);
  return {
    x: baseX + Math.cos(theta) * radius,
    y: driftY + Math.sin(theta) * radius * 0.65
  };
};
const defaultSweepController: MovementController = ({ ageSeconds, baseX, baseY, amplitude, frequency, params }) => {
  const period = Math.max(0.001, params?.periodSeconds ?? 1 / Math.max(0.001, frequency));
  const t = (ageSeconds / period) % 1;
  const startX = params?.sweepStartX ?? baseX;
  const endX = params?.sweepEndX ?? -baseX;
  const depth = params?.sweepDepth ?? Math.max(8, amplitude * 3.4);
  return {
    x: lerp(startX, endX, t),
    y: baseY - Math.sin(t * Math.PI) * depth
  };
};
const defaultShallowZigZagController: MovementController = ({ ageSeconds, driftX, driftY, amplitude, frequency, params }) => {
  const t = ageSeconds * frequency;
  const wave = Math.sin(t) + 0.18 * Math.sin(t * 2.2);
  const horizontalScale = params?.xScale ?? 0.6;
  const verticalAmplitude = params?.yAmplitude ?? amplitude * 0.08;
  const verticalFrequency = params?.yFrequency ?? frequency * 0.65;
  return {
    x: driftX + wave * amplitude * horizontalScale,
    y: driftY + Math.sin(ageSeconds * verticalFrequency) * verticalAmplitude
  };
};
const defaultHorseshoeController: MovementController = ({ ageSeconds, baseX, baseY, amplitude, frequency, params }) => {
  const period = Math.max(0.001, params?.periodSeconds ?? 1 / Math.max(0.001, frequency));
  const t = (ageSeconds / period) % 1;
  const centerX = params?.horseshoeCenterX ?? 0;
  const radiusX = params?.radiusX ?? baseX;
  const riseHeight = params?.riseHeight ?? Math.max(10, amplitude * 3.8);
  const theta = t * Math.PI;
  return {
    x: centerX + Math.cos(theta) * radiusX,
    y: baseY + Math.sin(theta) * riseHeight
  };
};

export function createDefaultMovementControllerRegistry(): MovementControllerRegistry {
  const registry = new MovementControllerRegistry();
  registry.register('straight', defaultStraightController);
  registry.register('sine', defaultSineController);
  registry.register('zigzag', defaultZigZagController);
  registry.register('bezier', defaultBezierController);
  registry.register('lissajous', defaultLissajousController);
  registry.register('curve', defaultCurveController);
  registry.register('spiral', defaultSpiralController);
  registry.register('sweep', defaultSweepController);
  registry.register('shallow-zigzag', defaultShallowZigZagController);
  registry.register('horseshoe', defaultHorseshoeController);
  return registry;
}

export const movementControllerRegistry = createDefaultMovementControllerRegistry();

function cubicBezier(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const u = 1 - t;
  return u ** 3 * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t ** 3 * p3;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
