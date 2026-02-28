import { describe, it, expect } from 'vitest';
import { Game } from '../../src/game/core/Game';
import { EntityType } from '../../src/game/ecs/entityTypes';
import { createEnemy } from '../../src/game/factories/createEnemy';

const idlePointer = {
  hasPosition: false,
  x: 0,
  y: 0,
  leftButtonDown: false,
  rightButtonDown: false
};

describe('game event emissions', () => {
  it('emits WeaponFired when the player autofires', () => {
    const game = new Game();
    const events: Array<{ projectileEntityId?: number; shooterId: number }> = [];

    game.events.on('WeaponFired', (event) => {
      events.push({ projectileEntityId: event.projectileEntityId, shooterId: event.shooterId });
    });

    game.start();
    game.update(0.11, idlePointer);

    expect(events.length).toBeGreaterThan(0);
    const first = events[0];
    expect(typeof first.projectileEntityId).toBe('number');
    if (typeof first.projectileEntityId !== 'number') {
      return;
    }
    const bullet = game.entities.get(first.projectileEntityId);

    expect(bullet?.type).toBe(EntityType.Bullet);
    expect(first.shooterId).toBeGreaterThan(0);
  });

  it('emits EntityDestroyed when a dead entity is removed', () => {
    const game = new Game();
    const destroyed: Array<{ entityId: number; reason: string }> = [];

    game.events.on('EntityDestroyed', (event) => {
      destroyed.push({ entityId: event.entityId, reason: event.reason });
    });

    game.start();

    const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(player).toBeTruthy();
    if (!player) {
      return;
    }

    player.weaponEnergy = 0;
    player.weaponEnergyRegenPerSecond = 0;

    const enemy = game.entities.create(createEnemy(0, 0, 'straight'));
    enemy.health = 0;

    game.update(0.016, idlePointer);

    expect(game.entities.get(enemy.id)).toBeUndefined();
    expect(destroyed).toContainEqual({ entityId: enemy.id, reason: 'health' });
  });
});
