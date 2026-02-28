import type { EntityType, Faction } from '../ecs/entityTypes';

export type DestroyReason = 'health' | 'bounds' | 'lifetime';

export interface WeaponFiredEvent {
  type: 'WeaponFired';
  atMs: number;
  shooterId: number;
  shooterFaction?: Faction;
  weaponMode: string;
  projectileEntityId: number;
}

export interface EntityDestroyedEvent {
  type: 'EntityDestroyed';
  atMs: number;
  entityId: number;
  entityType: EntityType;
  entityFaction?: Faction;
  reason: DestroyReason;
  scoreValue?: number;
}

export interface PickupCollectedEvent {
  type: 'PickupCollected';
  atMs: number;
  collectorId: number;
  pickupId: number;
  pickupKind: string;
}

export interface BiomeChangedEvent {
  type: 'BiomeChanged';
  atMs: number;
  fromBiome: string;
  toBiome: string;
}

export interface GameEventMap {
  WeaponFired: WeaponFiredEvent;
  EntityDestroyed: EntityDestroyedEvent;
  PickupCollected: PickupCollectedEvent;
  BiomeChanged: BiomeChangedEvent;
}

export type GameEventType = keyof GameEventMap;
export type GameEvent = GameEventMap[GameEventType];
