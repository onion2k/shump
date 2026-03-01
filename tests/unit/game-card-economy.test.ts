import { describe, expect, it } from 'vitest';
import { Game } from '../../src/game/core/Game';
import { EntityType, Faction } from '../../src/game/ecs/entityTypes';

const IDLE_POINTER = {
  hasPosition: false,
  x: 0,
  y: 0,
  leftButtonDown: false,
  rightButtonDown: false
};

describe('Game card economy effects', () => {
  it('applies kill-money flat bonus and pickup multipliers from active cards', () => {
    const game = new Game();
    game.startFromRunProgress({
      seed: 12,
      levelId: 'level-1',
      roundIndex: 2,
      inRunMoney: 0,
      foundCards: [],
      activeCards: ['salvage-contract', 'drone-salvager'],
      playerState: {
        health: 10,
        maxHealth: 10,
        weaponLevels: { 'Auto Pulse': 1 },
        podCount: 0,
        podWeaponMode: 'Auto Pulse'
      },
      elapsedMs: 0,
      distanceTraveled: 0,
      score: 0
    });

    game.entities.create({
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: 0.6,
      health: 0,
      maxHealth: 4
    });

    const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(player).toBeTruthy();
    game.entities.create({
      type: EntityType.Pickup,
      position: { x: player?.position.x ?? 0, y: player?.position.y ?? 0 },
      velocity: { x: 0, y: 0 },
      radius: 0.5,
      health: 1,
      maxHealth: 1,
      pickupKind: 'money',
      pickupValue: 6
    });

    game.update(0.016, IDLE_POINTER);

    // Economy tag synergy pushes multiplier to 35%.
    // Kill: round(2 * 1.35) + 1 = 4. Pickup: round(6 * 1.35) = 8.
    expect(game.snapshot().inRunMoney).toBe(12);
  });
});
