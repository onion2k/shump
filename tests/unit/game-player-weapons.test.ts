import { describe, it, expect } from 'vitest';
import { Game } from '../../src/game/core/Game';
import { EntityType } from '../../src/game/ecs/entityTypes';
import { createEnemy } from '../../src/game/factories/createEnemy';
import { createPickup } from '../../src/game/factories/createPickup';

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

  it('fires homing missiles when Homing Missile mode is selected', () => {
    const game = new Game();
    game.start();

    const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(player).toBeTruthy();
    if (!player) {
      return;
    }

    player.weaponMode = 'Homing Missile';
    player.weaponEnergy = 100;
    player.weaponEnergyRegenPerSecond = 0;
    game.entities.create(createEnemy(2, -6, 'straight'));

    game.update(0.35, {
      hasPosition: true,
      x: 0,
      y: -9,
      leftButtonDown: false,
      rightButtonDown: false
    });

    const missiles = game.entities
      .all()
      .filter((entity) => entity.type === EntityType.Bullet && entity.projectileKind === 'missile');
    expect(missiles.length).toBeGreaterThan(0);
  });

  it('laser beam damages enemies directly', () => {
    const game = new Game();
    game.start();

    const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(player).toBeTruthy();
    if (!player) {
      return;
    }

    player.weaponMode = 'Laser Beam';
    player.weaponEnergy = 100;
    player.weaponEnergyRegenPerSecond = 0;
    const enemy = game.entities.create(createEnemy(0, -7, 'straight'));
    enemy.health = 4;
    enemy.velocity.y = 0;

    game.update(0.2, {
      hasPosition: true,
      x: 0,
      y: -9,
      leftButtonDown: false,
      rightButtonDown: false
    });

    expect(enemy.health).toBe(2);
  });

  it('collects health and score pickups', () => {
    const game = new Game();
    game.start();

    const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(player).toBeTruthy();
    if (!player) {
      return;
    }

    player.health = 5;
    const scoreBefore = game.snapshot().score;
    game.entities.create(createPickup(player.position.x, player.position.y, 'health', 3));
    game.entities.create(createPickup(player.position.x, player.position.y, 'score', 40));

    game.update(0.016, {
      hasPosition: false,
      x: 0,
      y: 0,
      leftButtonDown: false,
      rightButtonDown: false
    });

    expect(player.health).toBe(8);
    expect(game.snapshot().score).toBe(scoreBefore + 40);
  });
});
