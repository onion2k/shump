export const PLAYER_WEAPON_ORDER = ['Auto Pulse', 'Continuous Laser', 'Heavy Cannon', 'Sine SMG'] as const;

export type PlayerWeaponMode = (typeof PLAYER_WEAPON_ORDER)[number];
export const PLAYER_WEAPON_MAX_LEVELS: Record<PlayerWeaponMode, number> = {
  'Auto Pulse': 6,
  'Continuous Laser': 6,
  'Heavy Cannon': 6,
  'Sine SMG': 6
};

const defaultLevels: Record<PlayerWeaponMode, number> = {
  'Auto Pulse': 1,
  'Continuous Laser': 1,
  'Heavy Cannon': 1,
  'Sine SMG': 1
};

const defaultUnlocked: PlayerWeaponMode[] = [...PLAYER_WEAPON_ORDER];

export function isPlayerWeaponMode(value: string): value is PlayerWeaponMode {
  return PLAYER_WEAPON_ORDER.includes(value as PlayerWeaponMode);
}

export function createDefaultWeaponLevels(): Record<PlayerWeaponMode, number> {
  return { ...defaultLevels };
}

export function createDefaultUnlockedWeapons(): PlayerWeaponMode[] {
  return [...defaultUnlocked];
}

export function getPlayerWeaponMaxLevel(mode: PlayerWeaponMode): number {
  return PLAYER_WEAPON_MAX_LEVELS[mode];
}
