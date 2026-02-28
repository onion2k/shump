import { WORLD_BOUNDS } from '../core/constants';
import { clamp } from '../util/math';
import type { WorldBounds } from '../core/constants';

export function screenToWorld(
  clientX: number,
  clientY: number,
  width: number,
  height: number,
  bounds: WorldBounds = WORLD_BOUNDS
) {
  const worldWidth = bounds.right - bounds.left;
  const worldHeight = bounds.top - bounds.bottom;
  const worldAspect = worldWidth / worldHeight;
  const viewAspect = width > 0 && height > 0 ? width / height : worldAspect;

  let activeWidth = width;
  let activeHeight = height;
  let offsetX = 0;
  let offsetY = 0;

  if (viewAspect > worldAspect) {
    activeWidth = height * worldAspect;
    offsetX = (width - activeWidth) / 2;
  } else if (viewAspect < worldAspect) {
    activeHeight = width / worldAspect;
    offsetY = (height - activeHeight) / 2;
  }

  const xNorm = activeWidth === 0 ? 0.5 : (clientX - offsetX) / activeWidth;
  const yNorm = activeHeight === 0 ? 0.5 : (clientY - offsetY) / activeHeight;

  const x = bounds.left + xNorm * (bounds.right - bounds.left);
  const y = bounds.top - yNorm * (bounds.top - bounds.bottom);

  return {
    x: clamp(x, bounds.left, bounds.right),
    y: clamp(y, bounds.bottom, bounds.top)
  };
}
