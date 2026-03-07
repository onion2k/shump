export const PLAYER_WEAPON_ORDER = ['Auto Pulse', 'Continuous Laser', 'Heavy Cannon', 'Sine SMG'] as const;

export type PlayerWeaponMode = (typeof PLAYER_WEAPON_ORDER)[number];

export interface PlayerWeaponDefinition {
  id: PlayerWeaponMode;
  maxLevel: number;
  defaultLevel: number;
  defaultUnlocked: boolean;
  shortLabel: string;
  tag: string;
  pickupColor: string;
}

const PLAYER_WEAPON_DEFINITIONS: Record<PlayerWeaponMode, PlayerWeaponDefinition> = {
  'Auto Pulse': {
    id: 'Auto Pulse',
    maxLevel: 6,
    defaultLevel: 1,
    defaultUnlocked: true,
    shortLabel: 'Pulse',
    tag: 'pulse',
    pickupColor: '#7be5ff'
  },
  'Continuous Laser': {
    id: 'Continuous Laser',
    maxLevel: 6,
    defaultLevel: 1,
    defaultUnlocked: true,
    shortLabel: 'Laser',
    tag: 'laser',
    pickupColor: '#7cffaa'
  },
  'Heavy Cannon': {
    id: 'Heavy Cannon',
    maxLevel: 6,
    defaultLevel: 1,
    defaultUnlocked: true,
    shortLabel: 'Cannon',
    tag: 'cannon',
    pickupColor: '#ffb347'
  },
  'Sine SMG': {
    id: 'Sine SMG',
    maxLevel: 6,
    defaultLevel: 1,
    defaultUnlocked: true,
    shortLabel: 'Sine',
    tag: 'sine',
    pickupColor: '#ffd66a'
  }
};

export const PLAYER_WEAPON_MAX_LEVELS: Record<PlayerWeaponMode, number> = Object.fromEntries(
  PLAYER_WEAPON_ORDER.map((mode) => [mode, PLAYER_WEAPON_DEFINITIONS[mode].maxLevel])
) as Record<PlayerWeaponMode, number>;

const defaultLevels: Record<PlayerWeaponMode, number> = Object.fromEntries(
  PLAYER_WEAPON_ORDER.map((mode) => [mode, PLAYER_WEAPON_DEFINITIONS[mode].defaultLevel])
) as Record<PlayerWeaponMode, number>;

const defaultUnlocked: PlayerWeaponMode[] = PLAYER_WEAPON_ORDER.filter(
  (mode) => PLAYER_WEAPON_DEFINITIONS[mode].defaultUnlocked
);

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

export function resolvePlayerWeaponDefinition(mode: PlayerWeaponMode): PlayerWeaponDefinition {
  return PLAYER_WEAPON_DEFINITIONS[mode];
}
