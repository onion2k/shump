import type { Entity } from '../ecs/components';
import { EntityType, Faction } from '../ecs/entityTypes';

export interface CreateFieldOptions {
  radius?: number;
  lifetimeMs?: number;
  damage?: number;
  fieldRadius?: number;
  fieldStrength?: number;
  slowPercent?: number;
  triggerRadius?: number;
  armDelayMs?: number;
  ownerId?: number;
  fieldVisualId?: string;
}

export function createField(
  x: number,
  y: number,
  kind: NonNullable<Entity['fieldKind']>,
  faction: Faction | undefined,
  options: CreateFieldOptions = {}
): Omit<Entity, 'id'> {
  const radius = options.radius ?? 0.8;
  return {
    type: EntityType.Field,
    faction,
    position: { x, y },
    velocity: { x: 0, y: 0 },
    radius,
    health: 1,
    maxHealth: 1,
    lifetimeMs: options.lifetimeMs ?? 900,
    damage: options.damage ?? 0,
    fieldKind: kind,
    fieldVisualId: options.fieldVisualId ?? kind,
    fieldRadius: options.fieldRadius ?? radius,
    fieldStrength: options.fieldStrength,
    slowPercent: options.slowPercent,
    triggerRadius: options.triggerRadius,
    armDelayMs: options.armDelayMs,
    ownerId: options.ownerId
  };
}
