import { describe, it, expect } from 'vitest';
import { Game } from '../../src/game/core/Game';
import { EntityType, Faction } from '../../src/game/ecs/entityTypes';
import { createEnemy } from '../../src/game/factories/createEnemy';
import { createPickup } from '../../src/game/factories/createPickup';
import { cardCatalogById } from '../../src/game/content/cards';
import { getPlayerWeaponMaxLevel } from '../../src/game/weapons/playerWeapons';

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

    game.update(0.08, {
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

  it('caps movement speed using player maneuverability tuning', () => {
    const game = new Game();
    game.start();

    const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(player).toBeTruthy();
    if (!player) {
      return;
    }

    player.moveMaxSpeed = 3;
    player.moveFollowGain = 20;

    game.update(0.016, {
      hasPosition: true,
      x: 8,
      y: -10,
      leftButtonDown: false,
      rightButtonDown: false
    });

    const speed = Math.hypot(player.velocity.x, player.velocity.y);
    expect(speed).toBeLessThanOrEqual(3.001);
  });

  it('selects unlocked weapon slots by number', () => {
    const game = new Game();
    game.start();

    const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(player).toBeTruthy();
    if (!player) {
      return;
    }

    player.unlockedWeaponModes = ['Auto Pulse', 'Continuous Laser'];
    player.weaponLevels = {
      ...(player.weaponLevels ?? {}),
      'Continuous Laser': 1
    };
    const selectedUnlocked = game.selectWeaponBySlot(2);
    const selectedLocked = game.selectWeaponBySlot(4);

    expect(selectedUnlocked).toBe(true);
    expect(player.weaponMode).toBe('Continuous Laser');
    expect(selectedLocked).toBe(false);
    expect(player.weaponMode).toBe('Continuous Laser');
  });

  it('cycles weapon level with repeated presses and wraps back to level 1', () => {
    const game = new Game();
    game.start();

    const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(player).toBeTruthy();
    if (!player) {
      return;
    }

    const maxLevel = getPlayerWeaponMaxLevel('Auto Pulse');
    expect(player.weaponMode).toBe('Auto Pulse');
    expect(player.weaponLevel).toBe(1);

    for (let i = 0; i < maxLevel; i += 1) {
      game.selectWeaponBySlot(1);
    }

    expect(player.weaponLevel).toBe(1);
    expect(player.weaponLevels?.['Auto Pulse']).toBe(1);

    game.selectWeaponBySlot(1);
    expect(player.weaponLevel).toBe(2);
    expect(player.weaponLevels?.['Auto Pulse']).toBe(2);
  });

  it('cycles pod count from 0 to 3 and back to 0', () => {
    const game = new Game();
    game.start();

    const a = game.cyclePods();
    const b = game.cyclePods();
    const c = game.cyclePods();
    const d = game.cyclePods();

    expect(a).toBe(1);
    expect(b).toBe(2);
    expect(c).toBe(3);
    expect(d).toBe(0);
  });

  it('pods fire auto pulse at enemies by default', () => {
    const game = new Game();
    game.start();

    const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(player).toBeTruthy();
    if (!player) {
      return;
    }

    player.weaponEnergy = 0;
    player.weaponEnergyRegenPerSecond = 0;
    game.cyclePods();
    game.entities.create(createEnemy(2, -6, 'straight'));

    game.update(0.016, {
      hasPosition: false,
      x: 0,
      y: 0,
      leftButtonDown: false,
      rightButtonDown: false
    });

    const podBullets = game.entities
      .all()
      .filter((entity) => entity.type === EntityType.Bullet && entity.faction === Faction.Player && entity.projectileKind === 'standard');
    expect(podBullets.length).toBeGreaterThan(0);
  });

  it('pods fire homing missiles when pod mode is toggled', () => {
    const game = new Game();
    game.start();

    const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(player).toBeTruthy();
    if (!player) {
      return;
    }

    player.weaponEnergy = 0;
    player.weaponEnergyRegenPerSecond = 0;
    game.cyclePods();
    const enemy = game.entities.create(createEnemy(1, -7, 'straight'));
    const mode = game.togglePodWeaponMode();

    game.update(0.016, {
      hasPosition: false,
      x: 0,
      y: 0,
      leftButtonDown: false,
      rightButtonDown: false
    });

    expect(mode).toBe('Homing Missile');
    const podMissiles = game.entities
      .all()
      .filter((entity) => entity.type === EntityType.Bullet && entity.projectileKind === 'missile');
    expect(podMissiles.length).toBeGreaterThan(0);
    expect(podMissiles.some((missile) => missile.homingTargetId === enemy.id)).toBe(true);
  });

  it('fires heavy cannon rounds when Heavy Cannon mode is selected', () => {
    const game = new Game();
    game.start();

    const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(player).toBeTruthy();
    if (!player) {
      return;
    }

    player.unlockedWeaponModes = ['Auto Pulse', 'Heavy Cannon'];
    player.weaponLevels = {
      ...(player.weaponLevels ?? {}),
      'Heavy Cannon': 1
    };
    player.weaponMode = 'Heavy Cannon';
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

    const rounds = game.entities.all().filter((entity) => entity.type === EntityType.Bullet && (entity.damage ?? 0) >= 6);
    expect(rounds.length).toBeGreaterThan(0);
  });

  it('fires sine smg rounds when Sine SMG mode is selected', () => {
    const game = new Game();
    game.start();

    const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(player).toBeTruthy();
    if (!player) {
      return;
    }

    player.unlockedWeaponModes = ['Auto Pulse', 'Sine SMG'];
    player.weaponMode = 'Sine SMG';
    player.weaponEnergy = 100;
    player.weaponEnergyRegenPerSecond = 0;

    game.update(0.2, {
      hasPosition: true,
      x: 0,
      y: -9,
      leftButtonDown: false,
      rightButtonDown: false
    });

    const bullets = game.entities
      .all()
      .filter((entity) => entity.type === EntityType.Bullet && entity.faction === Faction.Player);
    expect(bullets.length).toBeGreaterThan(0);
  });

  it('applies weapon tuning cards to firing cadence', () => {
    const baseline = new Game();
    baseline.startFromRunProgress({
      seed: 101,
      levelId: 'level-1',
      roundIndex: 1,
      inRunMoney: 0,
      foundCards: [],
      activeCards: [],
      consumedCards: [],
      playerState: {
        health: 10,
        maxHealth: 10,
        weaponLevels: { 'Auto Pulse': 1 },
        podCount: 0,
        podWeaponMode: 'Auto Pulse',
        moveMaxSpeed: 24,
        moveFollowGain: 6,
        pickupAttractRange: 4.2,
        pickupAttractPower: 16,
        shieldCurrent: 10,
        shieldMax: 10,
        shieldRechargeDelayMs: 1400,
        shieldRechargeTimeMs: 3600,
        shieldRechargeDelayRemainingMs: 0
      },
      elapsedMs: 0,
      distanceTraveled: 0,
      score: 0
    });

    baseline.update(0.1, {
      hasPosition: true,
      x: 0,
      y: -9,
      leftButtonDown: false,
      rightButtonDown: false
    });
    const baselineInterval = baseline.snapshot().weaponFireIntervalMs;

    const tuned = new Game();
    tuned.startFromRunProgress({
      seed: 102,
      levelId: 'level-1',
      roundIndex: 1,
      inRunMoney: 0,
      foundCards: [],
      activeCards: ['tempo-injector'],
      consumedCards: [],
      playerState: {
        health: 10,
        maxHealth: 10,
        weaponLevels: { 'Auto Pulse': 1 },
        podCount: 0,
        podWeaponMode: 'Auto Pulse',
        moveMaxSpeed: 24,
        moveFollowGain: 6,
        pickupAttractRange: 4.2,
        pickupAttractPower: 16,
        shieldCurrent: 10,
        shieldMax: 10,
        shieldRechargeDelayMs: 1400,
        shieldRechargeTimeMs: 3600,
        shieldRechargeDelayRemainingMs: 0
      },
      elapsedMs: 0,
      distanceTraveled: 0,
      score: 0
    });

    tuned.update(0.1, {
      hasPosition: true,
      x: 0,
      y: -9,
      leftButtonDown: false,
      rightButtonDown: false
    });
    const tunedInterval = tuned.snapshot().weaponFireIntervalMs;

    expect(tunedInterval).toBeLessThan(baselineInterval);
  });

  it('applies heavy cannon damage and energy tuning from active cards', () => {
    const tuningCardId = 'test-heavy-cannon-tuning';
    cardCatalogById[tuningCardId] = {
      id: tuningCardId,
      name: 'Heavy Test',
      description: 'Heavy cannon tuning test.',
      rarity: 'rare',
      tags: ['weapon'],
      cost: 0,
      maxStacks: 1,
      unlockRound: 1,
      shopWeight: 0,
      dropWeight: 0,
      effects: [
        { kind: 'weaponTuning', weaponMode: 'Heavy Cannon', stat: 'damagePercent', amount: 50 },
        { kind: 'weaponTuning', weaponMode: 'Heavy Cannon', stat: 'energyCostPercent', amount: -35 }
      ]
    };

    try {
      const baseline = new Game();
      baseline.startFromRunProgress({
        seed: 300,
        levelId: 'level-1',
        roundIndex: 1,
        inRunMoney: 0,
        foundCards: [],
        activeCards: [],
        consumedCards: [],
        playerState: {
          health: 10,
          maxHealth: 10,
          weaponLevels: { 'Auto Pulse': 1, 'Heavy Cannon': 1, 'Sine SMG': 1 },
          podCount: 0,
          podWeaponMode: 'Auto Pulse',
          moveMaxSpeed: 24,
          moveFollowGain: 6,
          pickupAttractRange: 4.2,
          pickupAttractPower: 16,
          shieldCurrent: 10,
          shieldMax: 10,
          shieldRechargeDelayMs: 1400,
          shieldRechargeTimeMs: 3600,
          shieldRechargeDelayRemainingMs: 0
        },
        elapsedMs: 0,
        distanceTraveled: 0,
        score: 0
      });

      const baselinePlayer = baseline.entities.all().find((entity) => entity.type === EntityType.Player);
      expect(baselinePlayer).toBeTruthy();
      if (!baselinePlayer) {
        return;
      }
      baselinePlayer.unlockedWeaponModes = ['Auto Pulse', 'Heavy Cannon'];
      baselinePlayer.weaponMode = 'Heavy Cannon';
      baselinePlayer.weaponEnergy = 100;
      baselinePlayer.weaponEnergyRegenPerSecond = 0;

      baseline.update(0.4, {
        hasPosition: true,
        x: 0,
        y: -9,
        leftButtonDown: false,
        rightButtonDown: false
      });

      const baselineShot = baseline.entities
        .all()
        .find((entity) => entity.type === EntityType.Bullet && entity.faction === Faction.Player && entity.projectileKind === 'standard');
      expect(baselineShot).toBeTruthy();
      const baselineCost = baseline.snapshot().weaponEnergyCost;

      const tuned = new Game();
      tuned.startFromRunProgress({
        seed: 301,
        levelId: 'level-1',
        roundIndex: 1,
        inRunMoney: 0,
        foundCards: [],
        activeCards: [tuningCardId],
        consumedCards: [],
        playerState: {
          health: 10,
          maxHealth: 10,
          weaponLevels: { 'Auto Pulse': 1, 'Heavy Cannon': 1, 'Sine SMG': 1 },
          podCount: 0,
          podWeaponMode: 'Auto Pulse',
          moveMaxSpeed: 24,
          moveFollowGain: 6,
          pickupAttractRange: 4.2,
          pickupAttractPower: 16,
          shieldCurrent: 10,
          shieldMax: 10,
          shieldRechargeDelayMs: 1400,
          shieldRechargeTimeMs: 3600,
          shieldRechargeDelayRemainingMs: 0
        },
        elapsedMs: 0,
        distanceTraveled: 0,
        score: 0
      });

      const tunedPlayer = tuned.entities.all().find((entity) => entity.type === EntityType.Player);
      expect(tunedPlayer).toBeTruthy();
      if (!tunedPlayer) {
        return;
      }
      tunedPlayer.unlockedWeaponModes = ['Auto Pulse', 'Heavy Cannon'];
      tunedPlayer.weaponMode = 'Heavy Cannon';
      tunedPlayer.weaponEnergy = 100;
      tunedPlayer.weaponEnergyRegenPerSecond = 0;

      tuned.update(0.4, {
        hasPosition: true,
        x: 0,
        y: -9,
        leftButtonDown: false,
        rightButtonDown: false
      });

      const tunedShot = tuned.entities
        .all()
        .find((entity) => entity.type === EntityType.Bullet && entity.faction === Faction.Player && entity.projectileKind === 'standard');
      expect(tunedShot).toBeTruthy();
      const tunedCost = tuned.snapshot().weaponEnergyCost;

      expect((tunedShot?.damage ?? 0)).toBeGreaterThan((baselineShot?.damage ?? 0));
      expect(tunedCost).toBeLessThan(baselineCost);
    } finally {
      delete cardCatalogById[tuningCardId];
    }
  });

  it('applies projectile speed tuning cards to auto pulse shots', () => {
    const baseline = new Game();
    baseline.startFromRunProgress({
      seed: 410,
      levelId: 'level-1',
      roundIndex: 1,
      inRunMoney: 0,
      foundCards: [],
      activeCards: [],
      consumedCards: [],
      playerState: {
        health: 10,
        maxHealth: 10,
        weaponLevels: { 'Auto Pulse': 1, 'Heavy Cannon': 1, 'Sine SMG': 1 },
        podCount: 0,
        podWeaponMode: 'Auto Pulse',
        moveMaxSpeed: 24,
        moveFollowGain: 6,
        pickupAttractRange: 4.2,
        pickupAttractPower: 16,
        shieldCurrent: 10,
        shieldMax: 10,
        shieldRechargeDelayMs: 1400,
        shieldRechargeTimeMs: 3600,
        shieldRechargeDelayRemainingMs: 0
      },
      elapsedMs: 0,
      distanceTraveled: 0,
      score: 0
    });
    baseline.update(0.12, {
      hasPosition: true,
      x: 0,
      y: -9,
      leftButtonDown: false,
      rightButtonDown: false
    });
    const baselineBullet = baseline.entities
      .all()
      .find((entity) => entity.type === EntityType.Bullet && entity.faction === Faction.Player && entity.projectileKind === 'standard');
    expect(baselineBullet).toBeTruthy();

    const tuned = new Game();
    tuned.startFromRunProgress({
      seed: 411,
      levelId: 'level-1',
      roundIndex: 1,
      inRunMoney: 0,
      foundCards: [],
      activeCards: ['ballistics-lab'],
      consumedCards: [],
      playerState: {
        health: 10,
        maxHealth: 10,
        weaponLevels: { 'Auto Pulse': 1, 'Heavy Cannon': 1, 'Sine SMG': 1 },
        podCount: 0,
        podWeaponMode: 'Auto Pulse',
        moveMaxSpeed: 24,
        moveFollowGain: 6,
        pickupAttractRange: 4.2,
        pickupAttractPower: 16,
        shieldCurrent: 10,
        shieldMax: 10,
        shieldRechargeDelayMs: 1400,
        shieldRechargeTimeMs: 3600,
        shieldRechargeDelayRemainingMs: 0
      },
      elapsedMs: 0,
      distanceTraveled: 0,
      score: 0
    });
    tuned.update(0.12, {
      hasPosition: true,
      x: 0,
      y: -9,
      leftButtonDown: false,
      rightButtonDown: false
    });
    const tunedBullet = tuned.entities
      .all()
      .find((entity) => entity.type === EntityType.Bullet && entity.faction === Faction.Player && entity.projectileKind === 'standard');
    expect(tunedBullet).toBeTruthy();

  expect(Math.abs(tunedBullet?.velocity.y ?? 0)).toBeGreaterThan(Math.abs(baselineBullet?.velocity.y ?? 0));
  });

  it('assigns projectile visual IDs for primary weapon bullets', () => {
    const game = new Game();
    game.start();

    const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(player).toBeTruthy();
    if (!player) {
      return;
    }

    player.weaponMode = 'Heavy Cannon';
    player.weaponLevels = { ...(player.weaponLevels ?? {}), 'Heavy Cannon': 1 };
    player.unlockedWeaponModes = ['Auto Pulse', 'Heavy Cannon'];

    game.update(0.4, {
      hasPosition: true,
      x: 0,
      y: -9,
      leftButtonDown: false,
      rightButtonDown: false
    });

    const heavyBullet = game.entities.all().find((entity) => entity.type === EntityType.Bullet && entity.projectileVisualId === 'heavy-cannon');
    expect(heavyBullet).toBeTruthy();
  });

  it('assigns field visual IDs for field weapons', () => {
    const game = new Game();
    game.start();

    const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(player).toBeTruthy();
    if (!player) {
      return;
    }

    player.weaponMode = 'Thermal Napalm Pods';
    player.weaponLevels = { ...(player.weaponLevels ?? {}), 'Thermal Napalm Pods': 1 };
    player.unlockedWeaponModes = ['Auto Pulse', 'Thermal Napalm Pods'];

    game.update(0.8, {
      hasPosition: true,
      x: 0,
      y: -9,
      leftButtonDown: false,
      rightButtonDown: false
    });

    const napalmField = game.entities
      .all()
      .find((entity) => entity.type === EntityType.Field && entity.fieldVisualId === 'thermal-napalm-pods');
    expect(napalmField).toBeTruthy();
  });

  it('spawns tesla and chain beam segment visuals', () => {
    const game = new Game();
    game.start();

    const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(player).toBeTruthy();
    if (!player) {
      return;
    }

    game.entities.create(createEnemy(0.5, -6, 'straight'));
    game.entities.create(createEnemy(1.2, -5.5, 'straight'));

    player.weaponMode = 'Tesla Arc';
    player.weaponLevels = { ...(player.weaponLevels ?? {}), 'Tesla Arc': 1 };
    player.unlockedWeaponModes = ['Auto Pulse', 'Tesla Arc'];
    player.weaponLevel = 1;
    game.update(0.36, {
      hasPosition: true,
      x: 0,
      y: -9,
      leftButtonDown: false,
      rightButtonDown: false
    });

    const teslaBeam = game.entities.all().find(
      (entity) => entity.type === EntityType.Bullet && entity.projectileVisualId === 'tesla-arc'
    );
    expect(teslaBeam).toBeTruthy();

    player.weaponMode = 'Chain Laser';
    player.weaponLevels = { ...(player.weaponLevels ?? {}), 'Chain Laser': 1 };
    player.unlockedWeaponModes = ['Auto Pulse', 'Chain Laser'];
    player.weaponLevel = 1;
    game.update(0.5, {
      hasPosition: true,
      x: 0,
      y: -9,
      leftButtonDown: false,
      rightButtonDown: false
    });

    const chainBeam = game.entities.all().find(
      (entity) => entity.type === EntityType.Bullet && entity.projectileKind === 'laser' && entity.projectileVisualId === 'chain-laser'
    );
    expect(chainBeam).toBeTruthy();
  });

  it('assigns drone visual IDs when drones deploy', () => {
    const game = new Game();
    game.start();

    const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(player).toBeTruthy();
    if (!player) {
      return;
    }

    player.weaponMode = 'Attack Drone';
    player.weaponLevels = { ...(player.weaponLevels ?? {}), 'Attack Drone': 1 };
    player.unlockedWeaponModes = ['Auto Pulse', 'Attack Drone'];
    game.update(0.6, {
      hasPosition: true,
      x: 0,
      y: -9,
      leftButtonDown: false,
      rightButtonDown: false
    });

    const attackDrone = game.entities.all().find((entity) => entity.type === EntityType.Drone && entity.droneVisualId === 'attack-drone');
    expect(attackDrone).toBeTruthy();
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

  it('does not unlock level-0 weapons when collecting a weapon pickup', () => {
    const game = new Game();
    game.start();

    const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(player).toBeTruthy();
    if (!player) {
      return;
    }

    game.entities.create(createPickup(player.position.x, player.position.y, 'weapon', 1, 8000, 'Heavy Cannon'));

    game.update(0.016, {
      hasPosition: false,
      x: 0,
      y: 0,
      leftButtonDown: false,
      rightButtonDown: false
    });

    expect(player.weaponMode).toBe('Auto Pulse');
    expect(player.unlockedWeaponModes).not.toContain('Heavy Cannon');
    expect(player.weaponLevels?.['Heavy Cannon']).toBe(0);
  });

  it('powers up currently selected weapon when collecting matching weapon pickup', () => {
    const game = new Game();
    game.start();

    const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(player).toBeTruthy();
    if (!player) {
      return;
    }

    player.weaponMode = 'Auto Pulse';
    const beforeLevel = player.weaponLevels?.['Auto Pulse'] ?? 1;
    game.entities.create(createPickup(player.position.x, player.position.y, 'weapon', 1, 8000, 'Auto Pulse'));

    game.update(0.016, {
      hasPosition: false,
      x: 0,
      y: 0,
      leftButtonDown: false,
      rightButtonDown: false
    });

    const afterLevel = player.weaponLevels?.['Auto Pulse'] ?? 1;
    expect(afterLevel).toBe(beforeLevel + 1);
    expect(player.weaponLevel).toBe(afterLevel);
  });
});
