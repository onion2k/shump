import type { Entity } from '../ecs/components';
import type { PointerState } from '../input/types';
import { clamp } from '../util/math';
import { gameSettings } from '../config/gameSettings';

export function applyPlayerInput(player: Entity | undefined, pointer: PointerState, deltaSeconds: number): void {
  if (!player) {
    return;
  }

  if (!pointer.hasPosition) {
    player.velocity.x = 0;
    player.velocity.y = 0;
    return;
  }

  const dx = pointer.x - player.position.x;
  const dy = pointer.y - player.position.y;
  const mag = Math.hypot(dx, dy) || 1;
  const maxSpeed = Math.max(1, player.moveMaxSpeed ?? gameSettings.player.maxSpeed);
  const followGain = Math.max(0, player.moveFollowGain ?? gameSettings.player.followGain);
  const speedFromDistance = mag * followGain;
  const maxSpeedWithoutOvershoot = deltaSeconds > 0 ? mag / deltaSeconds : maxSpeed;
  const speed = Math.min(maxSpeed, speedFromDistance, maxSpeedWithoutOvershoot);

  player.velocity.x = clamp((dx / mag) * speed, -maxSpeed, maxSpeed);
  player.velocity.y = clamp((dy / mag) * speed, -maxSpeed, maxSpeed);
}
