import { EntityType, Faction } from './entityTypes';
import type { MovementPatternId } from '../movement/patterns';
import type { PlayerWeaponMode } from '../weapons/playerWeapons';
import type { EnemyArchetypeId } from '../content/enemyArchetypes';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Entity {
  id: number;
  type: EntityType;
  faction?: Faction;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  health: number;
  maxHealth: number;
  fireCooldownMs?: number;
  enemyFireIntervalMs?: number;
  lifetimeMs?: number;
  scoreValue?: number;
  movementPattern?: MovementPatternId;
  patternAmplitude?: number;
  patternFrequency?: number;
  enemyArchetype?: EnemyArchetypeId;
  spawnX?: number;
  spawnY?: number;
  ageMs?: number;
  movementParams?: Record<string, number>;
  weaponMode?: string;
  weaponLevel?: number;
  weaponEnergy?: number;
  weaponEnergyMax?: number;
  weaponEnergyRegenPerSecond?: number;
  weaponEnergyCost?: number;
  weaponFireIntervalMs?: number;
  weaponLevels?: Partial<Record<PlayerWeaponMode, number>>;
  unlockedWeaponModes?: PlayerWeaponMode[];
  weaponOscillator?: number;
  podCount?: number;
  podWeaponMode?: 'Auto Pulse' | 'Homing Missile';
  podIndex?: number;
  damage?: number;
  projectileKind?: 'standard' | 'missile' | 'laser';
  projectileSpeed?: number;
  homingTargetId?: number;
  homingTurnRate?: number;
  pickupKind?: 'score' | 'health' | 'energy' | 'weapon' | 'money' | 'card';
  pickupWeaponMode?: PlayerWeaponMode;
  pickupCardId?: string;
  pickupValue?: number;
  particleType?: string;
}
