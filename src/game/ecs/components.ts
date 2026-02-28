import { EntityType, Faction } from './entityTypes';
import type { MovementPatternId } from '../movement/patterns';

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
  movementPattern?: MovementPatternId;
  patternAmplitude?: number;
  patternFrequency?: number;
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
  damage?: number;
  projectileKind?: 'standard' | 'missile';
  projectileSpeed?: number;
  homingTargetId?: number;
  homingTurnRate?: number;
  pickupKind?: 'score' | 'health' | 'energy';
  pickupValue?: number;
  particleType?: string;
}
