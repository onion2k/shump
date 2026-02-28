import { WORLD_BOUNDS } from './constants';
import type { WorldBounds } from './constants';

export const BASE_PLAYFIELD_BOUNDS: WorldBounds = { ...WORLD_BOUNDS };

export function centeredBoundsFromSize(width: number, height: number): WorldBounds {
  return {
    left: -width / 2,
    right: width / 2,
    bottom: -height / 2,
    top: height / 2
  };
}

export function scaleXAcrossBounds(x: number, from: WorldBounds, to: WorldBounds): number {
  const fromWidth = from.right - from.left;
  if (fromWidth === 0) {
    return x;
  }

  const t = (x - from.left) / fromWidth;
  return to.left + t * (to.right - to.left);
}
