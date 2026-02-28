export interface WorldBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export const WORLD_BOUNDS: WorldBounds = {
  left: -8,
  right: 8,
  top: 14,
  bottom: -14
};

export const FIXED_TIMESTEP_MS = 1000 / 60;
export const PLAYER_MAX_SPEED = 24;
export const PLAYER_FOLLOW_GAIN = 6;
export const PLAYER_FIRE_INTERVAL_MS = 140;
export const PLAYER_MACHINE_GUN_INTERVAL_MS = 90;
export const PLAYER_CHARGE_RATE = 60;
export const PLAYER_CHARGE_MIN_TO_FIRE = 8;
export const ENEMY_SPAWN_INTERVAL_MS = 900;
export const BULLET_SPEED = 26;
export const WORLD_SCROLL_SPEED = 6;
