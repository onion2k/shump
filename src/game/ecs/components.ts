import { EntityType, Faction } from './entityTypes';

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
  lifetimeMs?: number;
  scoreValue?: number;
  movementPattern?: 'straight' | 'sine' | 'zigzag';
  patternAmplitude?: number;
  patternFrequency?: number;
  spawnX?: number;
  ageMs?: number;
  weaponMode?: string;
  weaponLevel?: number;
  weaponEnergy?: number;
  weaponEnergyMax?: number;
  weaponEnergyRegenPerSecond?: number;
  weaponEnergyCost?: number;
  weaponFireIntervalMs?: number;
  damage?: number;
}
