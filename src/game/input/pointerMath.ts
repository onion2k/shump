import { WORLD_BOUNDS } from '../core/constants';
import { clamp } from '../util/math';

export function screenToWorld(clientX: number, clientY: number, width: number, height: number) {
  const xNorm = width === 0 ? 0.5 : clientX / width;
  const yNorm = height === 0 ? 0.5 : clientY / height;

  const x = WORLD_BOUNDS.left + xNorm * (WORLD_BOUNDS.right - WORLD_BOUNDS.left);
  const y = WORLD_BOUNDS.top - yNorm * (WORLD_BOUNDS.top - WORLD_BOUNDS.bottom);

  return {
    x: clamp(x, WORLD_BOUNDS.left, WORLD_BOUNDS.right),
    y: clamp(y, WORLD_BOUNDS.bottom, WORLD_BOUNDS.top)
  };
}
