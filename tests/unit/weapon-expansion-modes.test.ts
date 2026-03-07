import { describe, expect, it } from 'vitest';
import { Game } from '../../src/game/core/Game';
import { EntityType, Faction } from '../../src/game/ecs/entityTypes';
import type { PlayerWeaponMode } from '../../src/game/weapons/playerWeapons';
import { createEnemy } from '../../src/game/factories/createEnemy';
import { createBullet } from '../../src/game/factories/createBullet';
import { createPickup } from '../../src/game/factories/createPickup';
import { weaponEffectSystem } from '../../src/game/systems/weaponEffectSystem';
import { projectileInteractionSystem } from '../../src/game/systems/projectileInteractionSystem';

const IDLE_POINTER = {
  hasPosition: false,
  x: 0,
  y: 0,
  leftButtonDown: false,
  rightButtonDown: false
};

function setupMode(game: Game, mode: PlayerWeaponMode) {
  const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
  expect(player).toBeTruthy();
  if (!player) {
    return undefined;
  }
  player.weaponLevels = {
    ...(player.weaponLevels ?? {}),
    [mode]: 1
  };
  player.unlockedWeaponModes = [mode];
  player.weaponMode = mode;
  player.weaponEnergy = 250;
  player.weaponEnergyRegenPerSecond = 0;
  player.fireCooldownMs = 0;
  return player;
}

describe('weapon expansion mode mechanics', () => {
  it('arms and detonates proximity mines when enemies enter range', () => {
    const game = new Game();
    game.start();
    const player = setupMode(game, 'Proximity Mines');
    if (!player) {
      return;
    }

    game.update(0.08, IDLE_POINTER);
    const mine = game.entities
      .all()
      .find((entity) => entity.type === EntityType.Bullet && entity.sourceWeaponTag === 'proximity-mine');
    expect(mine).toBeTruthy();
    if (!mine) {
      return;
    }
    mine.armDelayMs = 0;
    game.entities.create(createEnemy(mine.position.x, mine.position.y, 'straight'));
    weaponEffectSystem(game.entities, player.id, 0.016, 16);

    const shrapnelFields = game.entities
      .all()
      .filter((entity) => entity.type === EntityType.Field && entity.fieldKind === 'shrapnel-cloud');
    expect(shrapnelFields.length).toBeGreaterThan(0);
  });

  it('reflector pulse converts nearby enemy bullets to player bullets', () => {
    const game = new Game();
    game.start();
    const player = setupMode(game, 'Reflector Pulse');
    if (!player) {
      return;
    }

    const enemyBullet = game.entities.create(
      createBullet(player.position.x + 0.3, player.position.y + 0.4, -10, Faction.Enemy, 1200, 1, 0.2, 0)
    );

    game.update(0.05, IDLE_POINTER);
    expect(enemyBullet.faction).toBe(Faction.Player);
  });

  it('time distortion pulse slows enemy bullets in radius', () => {
    const game = new Game();
    game.start();
    const player = setupMode(game, 'Time Distortion Pulse');
    if (!player) {
      return;
    }

    const enemyBullet = game.entities.create(
      createBullet(player.position.x + 0.6, player.position.y + 1.1, -12, Faction.Enemy, 1200, 1, 0.2, 0.8)
    );

    const speedBefore = Math.hypot(enemyBullet.velocity.x, enemyBullet.velocity.y);
    game.update(0.05, IDLE_POINTER);
    const speedAfter = Math.hypot(enemyBullet.velocity.x, enemyBullet.velocity.y);

    expect(speedAfter).toBeLessThan(speedBefore);
  });

  it('interceptor drone prioritizes incoming enemy bullets', () => {
    const game = new Game();
    game.start();
    const player = setupMode(game, 'Interceptor Drone');
    if (!player) {
      return;
    }

    const incoming = game.entities.create(
      createBullet(player.position.x - 0.4, player.position.y + 1.2, -8, Faction.Enemy, 2000, 1, 0.2, 0)
    );

    game.update(0.5, IDLE_POINTER);
    expect(incoming.health).toBeLessThanOrEqual(0);
  });

  it('prism splitter shots split on prism pickups', () => {
    const game = new Game();
    game.start();
    const player = setupMode(game, 'Prism Splitter');
    if (!player) {
      return;
    }

    game.entities.create(createPickup(player.position.x, player.position.y + 1.1, 'prism', 0, 2200));
    game.entities.create(createBullet(player.position.x, player.position.y + 1.05, 8, Faction.Player, 900, 1, 0.16, 0));
    projectileInteractionSystem(game.entities, 0.016);

    const playerBullets = game.entities
      .all()
      .filter((entity) => entity.type === EntityType.Bullet && entity.faction === Faction.Player);
    expect(playerBullets.length).toBeGreaterThanOrEqual(3);
  });
});
