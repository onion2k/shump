import { describe, it, expect } from 'vitest';
import { Game } from '../../src/game/core/Game';
import { EntityType } from '../../src/game/ecs/entityTypes';

describe('Game player controls', () => {
  it('autofires without button presses', () => {
    const game = new Game();
    game.start();

    game.update(0.11, {
      hasPosition: true,
      x: 0,
      y: -9,
      leftButtonDown: false,
      rightButtonDown: false
    });

    const bullets = game.entities.all().filter((entity) => entity.type === EntityType.Bullet);
    expect(bullets.length).toBeGreaterThan(0);
  });

  it('does not fire if energy is depleted and regen disabled', () => {
    const game = new Game();
    game.start();

    const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(player).toBeTruthy();
    if (!player) {
      return;
    }

    player.weaponEnergy = 0;
    player.weaponEnergyRegenPerSecond = 0;

    game.update(0.2, {
      hasPosition: true,
      x: 0,
      y: -9,
      leftButtonDown: false,
      rightButtonDown: false
    });

    const bullets = game.entities.all().filter((entity) => entity.type === EntityType.Bullet);
    expect(bullets.length).toBe(0);
  });

  it('moves faster when pointer is farther from the ship', () => {
    const game = new Game();
    game.start();

    const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(player).toBeTruthy();
    if (!player) {
      return;
    }

    game.update(0.016, {
      hasPosition: true,
      x: 0.2,
      y: -10,
      leftButtonDown: false,
      rightButtonDown: false
    });
    const nearSpeed = Math.hypot(player.velocity.x, player.velocity.y);

    game.update(0.016, {
      hasPosition: true,
      x: 6,
      y: -10,
      leftButtonDown: false,
      rightButtonDown: false
    });
    const farSpeed = Math.hypot(player.velocity.x, player.velocity.y);

    expect(farSpeed).toBeGreaterThan(nearSpeed);
  });
});
