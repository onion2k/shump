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
  const phasedAge = ageSeconds + (params?.phaseOffsetSeconds ?? 0);
  const t = phasedAge * frequency;
  const verticalAmplitude = params?.yAmplitude ?? 0;
  const verticalFrequency = params?.yFrequency ?? frequency * 0.72;
  return {
    x: driftX + Math.sin(t) * amplitude,
    y: driftY + Math.cos(phasedAge * verticalFrequency) * verticalAmplitude
  };
};
const defaultZigZagController: MovementController = ({ ageSeconds, baseX, driftY, amplitude, frequency, params }) => {
  const phasedAge = ageSeconds + (params?.phaseOffsetSeconds ?? 0);
  const t = phasedAge * frequency;
  const verticalAmplitude = params?.yAmplitude ?? amplitude * 0.35;
  const verticalFrequency = params?.yFrequency ?? frequency * 0.9;
  const smoothZig = Math.sin(t) + 0.22 * Math.sin(t * 3);
  return {
    x: baseX + smoothZig * amplitude * 0.82,
    y: driftY + Math.sin(phasedAge * verticalFrequency) * verticalAmplitude
  };
};
const defaultBezierController: MovementController = ({ ageSeconds, baseX, driftY, amplitude, frequency, params }) => {
  const phasedAge = ageSeconds + (params?.phaseOffsetSeconds ?? 0);
  const rawT = phasedAge * frequency;
  const pingPong = params?.bezierPingPong === 1;
  const loop = params?.bezierLoop !== 0;
  const loopT = rawT - Math.floor(rawT);
  const t = pingPong
    // Smooth ping-pong traversal to avoid a hard velocity snap at the turnaround point.
    ? 0.5 - 0.5 * Math.cos(rawT * Math.PI)
    : loop
      ? loopT
      : clamp(rawT, 0, 1);
  const startX = params?.bezierStartX ?? baseX;
  const endX = params?.bezierEndX ?? baseX;
  const cp1 = params?.bezierControl1X ?? baseX - amplitude;
  const cp2 = params?.bezierControl2X ?? baseX + amplitude;
  const verticalAmplitude = params?.yAmplitude ?? amplitude * 0.5;
  const arc = Math.sin(t * Math.PI * 2) * verticalAmplitude;
  return { x: cubicBezier(startX, cp1, cp2, endX, t), y: driftY + arc };
};
const defaultLissajousController: MovementController = ({ ageSeconds, baseX, driftY, amplitude, frequency, params }) => {
  const phasedAge = ageSeconds + (params?.phaseOffsetSeconds ?? 0);
  const a = params?.lissajousA ?? 3;
  const b = params?.lissajousB ?? 2;
  const phase = params?.lissajousPhase ?? 0;
  const verticalAmplitude = params?.yAmplitude ?? amplitude * 0.62;
  const t = phasedAge * frequency;
  const modulation = 0.65 + 0.35 * Math.cos(t * b);
  return {
    x: baseX + Math.sin(t * a + phase) * amplitude * modulation,
    y: driftY + Math.sin(t * b + phase * 0.5) * verticalAmplitude
  };
};
const defaultCurveController: MovementController = ({ ageSeconds, baseX, driftY, amplitude, frequency, params }) => {
  const phasedAge = ageSeconds + (params?.phaseOffsetSeconds ?? 0);
  const curveDirection = params?.curveDirection ?? 1;
  const sweepDirection = params?.sweepDirection ?? 1;
  const verticalAmplitude = params?.yAmplitude ?? amplitude * 0.2;
  // One-way arc sweep: avoids repetitive side-to-side oscillation that reads as static.
  const progress = 1 - Math.exp(-Math.max(0, phasedAge) * Math.max(0.001, frequency) * 1.4);
  const clampedProgress = clamp(progress, 0, 1);
  const eased = 0.5 - 0.5 * Math.cos(clampedProgress * Math.PI);
  const arcLift = Math.sin(clampedProgress * Math.PI) * verticalAmplitude;
  return {
    x: baseX + curveDirection * sweepDirection * amplitude * eased,
    y: driftY + arcLift
  };
};
const defaultSpiralController: MovementController = ({ ageSeconds, baseX, driftY, amplitude, frequency, params }) => {
  const phasedAge = ageSeconds + (params?.phaseOffsetSeconds ?? 0);
  const spiralTurns = params?.spiralTurns ?? 1.35;
  const decay = params?.spiralDecay ?? 0.2;
  const theta = phasedAge * frequency * Math.PI * 2 * spiralTurns;
  const minRadiusFactor = params?.spiralMinRadiusFactor ?? 0.55;
  const verticalDiveSpeed = params?.spiralDiveSpeed ?? Math.max(1.6, amplitude * 0.75);
  const decayed = Math.exp(-phasedAge * frequency * decay);
  const radius = amplitude * (minRadiusFactor + (1 - minRadiusFactor) * decayed);
  return {
    x: baseX + Math.cos(theta) * radius,
    y: driftY - phasedAge * verticalDiveSpeed + Math.sin(theta) * radius * 0.45
  };
};
const defaultSweepController: MovementController = ({ ageSeconds, baseX, baseY, amplitude, frequency, params }) => {
  const phasedAge = ageSeconds + (params?.phaseOffsetSeconds ?? 0);
  const period = Math.max(0.001, params?.periodSeconds ?? 1 / Math.max(0.001, frequency));
  const t = (phasedAge / period) % 1;
  const startX = params?.sweepStartX ?? baseX;
  const endX = params?.sweepEndX ?? -baseX;
  const depth = params?.sweepDepth ?? Math.max(8, amplitude * 3.4);
  return {
    x: lerp(startX, endX, t),
    y: baseY - Math.sin(t * Math.PI) * depth
  };
};
const defaultShallowZigZagController: MovementController = ({ ageSeconds, driftX, driftY, amplitude, frequency, params }) => {
  const phasedAge = ageSeconds + (params?.phaseOffsetSeconds ?? 0);
  const t = phasedAge * frequency;
  const wave = Math.sin(t) + 0.18 * Math.sin(t * 2.2);
  const horizontalScale = params?.xScale ?? 0.6;
  const verticalAmplitude = params?.yAmplitude ?? amplitude * 0.08;
  const verticalFrequency = params?.yFrequency ?? frequency * 0.65;
  return {
    x: driftX + wave * amplitude * horizontalScale,
    y: driftY + Math.sin(phasedAge * verticalFrequency) * verticalAmplitude
  };
};
const defaultHorseshoeController: MovementController = ({ ageSeconds, baseX, baseY, amplitude, frequency, params }) => {
  const phasedAge = ageSeconds + (params?.phaseOffsetSeconds ?? 0);
  const period = Math.max(0.001, params?.periodSeconds ?? 1 / Math.max(0.001, frequency));
  const t = (phasedAge / period) % 1;
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
