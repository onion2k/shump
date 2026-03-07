export const PLAYER_WEAPON_ORDER = [
  'Auto Pulse',
  'Continuous Laser',
  'Heavy Cannon',
  'Sine SMG',
  'Flak Cannon',
  'Proximity Mines',
  'Gravity Bomb',
  'Thermal Napalm Pods',
  'Tesla Arc',
  'Chain Laser',
  'Ion Burst',
  'Spread Shot',
  'Helix Blaster',
  'Orbital Drones',
  'Rotary Disc Launcher',
  'Energy Shield Projector',
  'Reflector Pulse',
  'Time Distortion Pulse',
  'Attack Drone',
  'Interceptor Drone',
  'Salvage Drone',
  'Prism Splitter',
  'Polygon Shredder',
  'Vector Beam'
] as const;

export type PlayerWeaponMode = (typeof PLAYER_WEAPON_ORDER)[number];
const STARTER_WEAPON: PlayerWeaponMode = 'Auto Pulse';

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
  },
  'Flak Cannon': {
    id: 'Flak Cannon',
    maxLevel: 6,
    defaultLevel: 1,
    defaultUnlocked: false,
    shortLabel: 'Flak',
    tag: 'flak',
    pickupColor: '#ff9b73'
  },
  'Proximity Mines': {
    id: 'Proximity Mines',
    maxLevel: 6,
    defaultLevel: 1,
    defaultUnlocked: false,
    shortLabel: 'Mines',
    tag: 'mine',
    pickupColor: '#f2dd4d'
  },
  'Gravity Bomb': {
    id: 'Gravity Bomb',
    maxLevel: 6,
    defaultLevel: 1,
    defaultUnlocked: false,
    shortLabel: 'Gravity',
    tag: 'gravity',
    pickupColor: '#92a2ff'
  },
  'Thermal Napalm Pods': {
    id: 'Thermal Napalm Pods',
    maxLevel: 6,
    defaultLevel: 1,
    defaultUnlocked: false,
    shortLabel: 'Napalm',
    tag: 'napalm',
    pickupColor: '#ff794f'
  },
  'Tesla Arc': {
    id: 'Tesla Arc',
    maxLevel: 6,
    defaultLevel: 1,
    defaultUnlocked: false,
    shortLabel: 'Tesla',
    tag: 'tesla',
    pickupColor: '#8ae7ff'
  },
  'Chain Laser': {
    id: 'Chain Laser',
    maxLevel: 6,
    defaultLevel: 1,
    defaultUnlocked: false,
    shortLabel: 'ChainL',
    tag: 'chain-laser',
    pickupColor: '#a5ffd4'
  },
  'Ion Burst': {
    id: 'Ion Burst',
    maxLevel: 6,
    defaultLevel: 1,
    defaultUnlocked: false,
    shortLabel: 'Ion',
    tag: 'ion',
    pickupColor: '#72d1ff'
  },
  'Spread Shot': {
    id: 'Spread Shot',
    maxLevel: 6,
    defaultLevel: 1,
    defaultUnlocked: false,
    shortLabel: 'Spread',
    tag: 'spread',
    pickupColor: '#ffc57d'
  },
  'Helix Blaster': {
    id: 'Helix Blaster',
    maxLevel: 6,
    defaultLevel: 1,
    defaultUnlocked: false,
    shortLabel: 'Helix',
    tag: 'helix',
    pickupColor: '#c0ff88'
  },
  'Orbital Drones': {
    id: 'Orbital Drones',
    maxLevel: 6,
    defaultLevel: 1,
    defaultUnlocked: false,
    shortLabel: 'Orbit',
    tag: 'orbital',
    pickupColor: '#8cc5ff'
  },
  'Rotary Disc Launcher': {
    id: 'Rotary Disc Launcher',
    maxLevel: 6,
    defaultLevel: 1,
    defaultUnlocked: false,
    shortLabel: 'Disc',
    tag: 'disc',
    pickupColor: '#e5b2ff'
  },
  'Energy Shield Projector': {
    id: 'Energy Shield Projector',
    maxLevel: 6,
    defaultLevel: 1,
    defaultUnlocked: false,
    shortLabel: 'Shield',
    tag: 'shield-proj',
    pickupColor: '#69e7ff'
  },
  'Reflector Pulse': {
    id: 'Reflector Pulse',
    maxLevel: 6,
    defaultLevel: 1,
    defaultUnlocked: false,
    shortLabel: 'Reflect',
    tag: 'reflector',
    pickupColor: '#c1f8ff'
  },
  'Time Distortion Pulse': {
    id: 'Time Distortion Pulse',
    maxLevel: 6,
    defaultLevel: 1,
    defaultUnlocked: false,
    shortLabel: 'Time',
    tag: 'time',
    pickupColor: '#9ba9ff'
  },
  'Attack Drone': {
    id: 'Attack Drone',
    maxLevel: 6,
    defaultLevel: 1,
    defaultUnlocked: false,
    shortLabel: 'AtkDrn',
    tag: 'attack-drone',
    pickupColor: '#8fb7ff'
  },
  'Interceptor Drone': {
    id: 'Interceptor Drone',
    maxLevel: 6,
    defaultLevel: 1,
    defaultUnlocked: false,
    shortLabel: 'IntDrn',
    tag: 'interceptor-drone',
    pickupColor: '#9ef7dd'
  },
  'Salvage Drone': {
    id: 'Salvage Drone',
    maxLevel: 6,
    defaultLevel: 1,
    defaultUnlocked: false,
    shortLabel: 'SalvDrn',
    tag: 'salvage-drone',
    pickupColor: '#ffe38e'
  },
  'Prism Splitter': {
    id: 'Prism Splitter',
    maxLevel: 6,
    defaultLevel: 1,
    defaultUnlocked: false,
    shortLabel: 'Prism',
    tag: 'prism',
    pickupColor: '#e6fff9'
  },
  'Polygon Shredder': {
    id: 'Polygon Shredder',
    maxLevel: 6,
    defaultLevel: 1,
    defaultUnlocked: false,
    shortLabel: 'Poly',
    tag: 'polygon',
    pickupColor: '#ff9fd1'
  },
  'Vector Beam': {
    id: 'Vector Beam',
    maxLevel: 6,
    defaultLevel: 1,
    defaultUnlocked: false,
    shortLabel: 'Vector',
    tag: 'vector',
    pickupColor: '#9cf7ff'
  }
};

export const PLAYER_WEAPON_MAX_LEVELS: Record<PlayerWeaponMode, number> = Object.fromEntries(
  PLAYER_WEAPON_ORDER.map((mode) => [mode, PLAYER_WEAPON_DEFINITIONS[mode].maxLevel])
) as Record<PlayerWeaponMode, number>;

const defaultLevels: Record<PlayerWeaponMode, number> = Object.fromEntries(
  PLAYER_WEAPON_ORDER.map((mode) => [mode, mode === STARTER_WEAPON ? 1 : 0])
) as Record<PlayerWeaponMode, number>;

export function isPlayerWeaponMode(value: string): value is PlayerWeaponMode {
  return PLAYER_WEAPON_ORDER.includes(value as PlayerWeaponMode);
}

export function createDefaultWeaponLevels(): Record<PlayerWeaponMode, number> {
  return { ...defaultLevels };
}

export function createDefaultUnlockedWeapons(): PlayerWeaponMode[] {
  return deriveUnlockedWeaponModesFromLevels(defaultLevels);
}

export function getPlayerWeaponMaxLevel(mode: PlayerWeaponMode): number {
  return PLAYER_WEAPON_MAX_LEVELS[mode];
}

export function getPlayerWeaponMinimumLevel(mode: PlayerWeaponMode): number {
  return mode === STARTER_WEAPON ? 1 : 0;
}

export function deriveUnlockedWeaponModesFromLevels(levels: Partial<Record<PlayerWeaponMode, number>>): PlayerWeaponMode[] {
  return PLAYER_WEAPON_ORDER.filter((mode) => (levels[mode] ?? getPlayerWeaponMinimumLevel(mode)) >= 1);
}

export function resolvePlayerWeaponDefinition(mode: PlayerWeaponMode): PlayerWeaponDefinition {
  return PLAYER_WEAPON_DEFINITIONS[mode];
}
