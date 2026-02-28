import { describe, it, expect } from 'vitest';
import { GameEventBus } from '../../src/game/core/GameEventBus';
import { EntityType, Faction } from '../../src/game/ecs/entityTypes';

describe('GameEventBus', () => {
  it('delivers typed and global subscriptions', () => {
    const bus = new GameEventBus();
    const typedProjectileIds: number[] = [];
    const globalTypes: string[] = [];

    bus.on('WeaponFired', (event) => {
      typedProjectileIds.push(event.projectileEntityId);
    });

    bus.subscribe((event) => {
      globalTypes.push(event.type);
    });

    bus.emit({
      type: 'WeaponFired',
      atMs: 120,
      shooterId: 2,
      shooterFaction: Faction.Player,
      weaponMode: 'Auto Pulse',
      projectileEntityId: 10
    });

    expect(typedProjectileIds).toEqual([10]);
    expect(globalTypes).toEqual(['WeaponFired']);
  });

  it('supports unsubscribing listeners', () => {
    const bus = new GameEventBus();
    const types: string[] = [];

    const offTyped = bus.on('EntityDestroyed', (event) => {
      types.push(event.type);
    });
    const offGlobal = bus.subscribe((event) => {
      types.push(event.type);
    });

    bus.emit({
      type: 'EntityDestroyed',
      atMs: 16,
      entityId: 12,
      entityType: EntityType.Enemy,
      entityFaction: Faction.Enemy,
      reason: 'health',
      scoreValue: 100
    });

    offTyped();
    offGlobal();

    bus.emit({
      type: 'EntityDestroyed',
      atMs: 32,
      entityId: 13,
      entityType: EntityType.Enemy,
      entityFaction: Faction.Enemy,
      reason: 'bounds',
      scoreValue: 100
    });

    expect(types).toEqual(['EntityDestroyed', 'EntityDestroyed']);
  });
});
