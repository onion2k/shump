import { describe, expect, it } from 'vitest';
import { EntityManager } from '../../src/game/ecs/EntityManager';
import { EntityType, Faction } from '../../src/game/ecs/entityTypes';
import { createPlayer } from '../../src/game/factories/createPlayer';
import { createBullet } from '../../src/game/factories/createBullet';
import { createField } from '../../src/game/factories/createField';
import { createDrone } from '../../src/game/factories/createDrone';
import { createPickup } from '../../src/game/factories/createPickup';
import { weaponEffectSystem } from '../../src/game/systems/weaponEffectSystem';
import { projectileInteractionSystem } from '../../src/game/systems/projectileInteractionSystem';

describe('weapon effect and interaction systems', () => {
  it('spawns flak shrapnel and gravity well from expiring special bullets', () => {
    const entities = new EntityManager();
    const player = entities.create(createPlayer());

    const flak = entities.create(createBullet(0, 0, 8, Faction.Player, 100, 2, 0.2));
    flak.sourceWeaponTag = 'flak-cannon-shell';
    flak.lifetimeMs = 180;

    const gravity = entities.create(createBullet(0.5, 0.5, 8, Faction.Player, 100, 2, 0.2));
    gravity.sourceWeaponTag = 'gravity-bomb';
    gravity.lifetimeMs = 200;

    weaponEffectSystem(entities, player.id, 0.016, 16);

    const fields = entities.all().filter((entity) => entity.type === EntityType.Field);
    expect(fields.some((entity) => entity.fieldKind === 'shrapnel-cloud')).toBe(true);
    expect(fields.some((entity) => entity.fieldKind === 'gravity-well')).toBe(true);
  });

  it('detonates armed proximity mines when enemies enter trigger radius', () => {
    const entities = new EntityManager();
    const player = entities.create(createPlayer());

    const mine = entities.create(createBullet(0, 0, 0, Faction.Player, 2000, 3, 0.22));
    mine.sourceWeaponTag = 'proximity-mine';
    mine.armDelayMs = 0;
    mine.triggerRadius = 1.5;
    mine.splashRadius = 1.6;

    entities.create({
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: 0.2, y: 0.1 },
      velocity: { x: 0, y: 0 },
      radius: 0.7,
      health: 5,
      maxHealth: 5
    });

    weaponEffectSystem(entities, player.id, 0.016, 16);

    expect(mine.health).toBeLessThanOrEqual(0);
    expect(entities.all().some((entity) => entity.type === EntityType.Field && entity.fieldKind === 'shrapnel-cloud')).toBe(true);
  });

  it('applies reflector pulse conversion and time distortion slow', () => {
    const entities = new EntityManager();
    const player = entities.create(createPlayer());

    const pulse = entities.create(createField(0, 0, 'time-distortion', Faction.Player, { fieldRadius: 2, lifetimeMs: 100 }));
    pulse.sourceWeaponTag = 'reflector-pulse';

    const slowed = entities.create(createField(0.2, 0.2, 'time-distortion', Faction.Player, { fieldRadius: 2.4, slowPercent: 40, lifetimeMs: 300 }));

    const enemyBulletA = entities.create(createBullet(0.4, 0.4, -8, Faction.Enemy, 900, 1, 0.2, 1));
    const enemyBulletB = entities.create(createBullet(0.3, 0.3, -10, Faction.Enemy, 900, 1, 0.2, 0.5));

    const speedBefore = Math.hypot(enemyBulletB.velocity.x, enemyBulletB.velocity.y);
    weaponEffectSystem(entities, player.id, 0.016, 16);
    const speedAfter = Math.hypot(enemyBulletB.velocity.x, enemyBulletB.velocity.y);

    expect(enemyBulletA.faction).toBe(Faction.Player);
    expect(pulse.health).toBeLessThanOrEqual(0);
    expect(slowed.health).toBeGreaterThan(0);
    expect(speedAfter).toBeLessThan(speedBefore);
  });

  it('drone branches: orbital attack fires and salvage attracts pickups', () => {
    const entities = new EntityManager();
    const player = entities.create(createPlayer());

    const orbital = entities.create(createDrone(player.position.x, player.position.y, 'orbital-attack', { ownerId: player.id, damage: 2, orbitRadius: 1.2, orbitAngularSpeed: 1.4, orbitAngle: 0 }));
    orbital.fireCooldownMs = 0;

    const salvage = entities.create(createDrone(player.position.x, player.position.y, 'salvage', { ownerId: player.id, damage: 1 }));
    salvage.fireCooldownMs = 0;

    const pickup = entities.create(createPickup(player.position.x + 0.8, player.position.y + 0.8, 'money', 1, 2000));

    entities.create({
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: player.position.x + 1.5, y: player.position.y + 1.8 },
      velocity: { x: 0, y: 0 },
      radius: 0.7,
      health: 6,
      maxHealth: 6
    });

    weaponEffectSystem(entities, player.id, 0.2, 200);

    expect(entities.all().some((entity) => entity.type === EntityType.Bullet && entity.faction === Faction.Player)).toBe(true);
    expect(Math.hypot(pickup.velocity.x, pickup.velocity.y)).toBeGreaterThan(0);
  });

  it('projectile interaction absorbs on shield barrier and splits on prism', () => {
    const entities = new EntityManager();

    entities.create(createField(0, 0, 'shield-barrier', Faction.Player, { fieldRadius: 1.2, damage: 1, lifetimeMs: 400 }));

    const enemyBullet = entities.create(createBullet(0.2, 0.1, -6, Faction.Enemy, 1200, 1, 0.2));
    const prism = entities.create(createPickup(0.6, 0.6, 'prism', 0, 1000));
    const playerBullet = entities.create(createBullet(0.6, 0.6, 6, Faction.Player, 1200, 1, 0.2));

    entities.create({
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: 0.2, y: 0.2 },
      velocity: { x: 0, y: 0 },
      radius: 0.7,
      health: 3,
      maxHealth: 3
    });

    projectileInteractionSystem(entities, 0.016);

    expect(enemyBullet.health).toBeLessThanOrEqual(0);
    expect(prism.health).toBeLessThanOrEqual(0);
    expect(playerBullet.health).toBeLessThanOrEqual(0);
    const splitChildren = entities
      .all()
      .filter((entity) => entity.type === EntityType.Bullet && entity.faction === Faction.Player && entity.id !== playerBullet.id);
    expect(splitChildren.length).toBeGreaterThanOrEqual(2);
  });
});
