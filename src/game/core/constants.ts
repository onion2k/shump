import { gameSettings } from '../config/gameSettings';

export interface WorldBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export const WORLD_BOUNDS: WorldBounds = {
  ...gameSettings.world.bounds
};

export const FIXED_TIMESTEP_MS = 1000 / 60;
export const PLAYER_MAX_SPEED = gameSettings.player.maxSpeed;
export const PLAYER_FOLLOW_GAIN = gameSettings.player.followGain;
export const PLAYER_MACHINE_GUN_INTERVAL_MS = gameSettings.player.weapon.fireIntervalMs;
export const BULLET_SPEED = gameSettings.combat.bulletSpeed;
export const WORLD_SCROLL_SPEED = gameSettings.world.scrollSpeed;
