import type { Entity } from '../ecs/components';
import { EntityType, Faction } from '../ecs/entityTypes';

export interface CreateDroneOptions {
  radius?: number;
  health?: number;
  damage?: number;
  lifetimeMs?: number;
  ownerId?: number;
  orbitRadius?: number;
  orbitAngularSpeed?: number;
  orbitAngle?: number;
}

export function createDrone(
  x: number,
  y: number,
  kind: NonNullable<Entity['droneKind']>,
  options: CreateDroneOptions = {}
): Omit<Entity, 'id'> {
  return {
    type: EntityType.Drone,
    faction: Faction.Player,
    position: { x, y },
    velocity: { x: 0, y: 0 },
    radius: options.radius ?? 0.22,
    health: options.health ?? 1,
    maxHealth: options.health ?? 1,
    lifetimeMs: options.lifetimeMs,
    damage: options.damage ?? 1,
    ownerId: options.ownerId,
    droneKind: kind,
    orbitRadius: options.orbitRadius,
    orbitAngularSpeed: options.orbitAngularSpeed,
    orbitAngle: options.orbitAngle
  };
}
