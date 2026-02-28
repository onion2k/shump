import type { EntityManager } from '../ecs/EntityManager';
import { EntityType, Faction } from '../ecs/entityTypes';
import { BULLET_SPEED, PLAYER_MACHINE_GUN_INTERVAL_MS } from '../core/constants';
import { clamp, distanceSquared } from '../util/math';
import { createBullet } from '../factories/createBullet';
import { createMissile } from '../factories/createMissile';

interface WeaponFireRecord {
  weaponMode: string;
  projectileEntityId?: number;
}

export interface PlayerWeaponResult {
  fired: WeaponFireRecord[];
  scoreDelta: number;
}

const LASER_DAMAGE = 2;
const LASER_INTERVAL_MS = 140;
const LASER_ENERGY_COST = 8;
const LASER_RANGE = 32;
const LASER_HALF_WIDTH = 0.9;
const MISSILE_INTERVAL_MS = 300;
const MISSILE_ENERGY_COST = 12;
const MISSILE_SPEED = 20;

export function playerWeaponSystem(entityManager: EntityManager, playerId: number, deltaSeconds: number): PlayerWeaponResult {
  const player = entityManager.get(playerId);
  if (!player) {
    return { fired: [], scoreDelta: 0 };
  }

  const fired: WeaponFireRecord[] = [];
  let scoreDelta = 0;
  const currentEnergy = player.weaponEnergy ?? 0;
  const maxEnergy = player.weaponEnergyMax ?? 0;
  const regen = player.weaponEnergyRegenPerSecond ?? 0;
  const fallbackShotCost = player.weaponEnergyCost ?? 0;
  const fallbackIntervalMs = player.weaponFireIntervalMs ?? PLAYER_MACHINE_GUN_INTERVAL_MS;

  player.weaponMode = player.weaponMode ?? 'Auto Pulse';
  player.weaponEnergy = clamp(currentEnergy + regen * deltaSeconds, 0, maxEnergy);
  player.fireCooldownMs = (player.fireCooldownMs ?? 0) - deltaSeconds * 1000;

  if ((player.fireCooldownMs ?? 0) > 0) {
    return { fired, scoreDelta };
  }

  if (player.weaponMode === 'Laser Beam') {
    if ((player.weaponEnergy ?? 0) < LASER_ENERGY_COST) {
      return { fired, scoreDelta };
    }

    const laserHit = pickLaserTarget(entityManager, player.position.x, player.position.y);
    if (laserHit) {
      laserHit.health -= LASER_DAMAGE;
      if (laserHit.health <= 0) {
        scoreDelta += laserHit.scoreValue ?? 0;
      }
    }

    player.weaponEnergy = (player.weaponEnergy ?? 0) - LASER_ENERGY_COST;
    player.fireCooldownMs = LASER_INTERVAL_MS;
    fired.push({ weaponMode: player.weaponMode });
    return { fired, scoreDelta };
  }

  if (player.weaponMode === 'Homing Missile') {
    if ((player.weaponEnergy ?? 0) < MISSILE_ENERGY_COST) {
      return { fired, scoreDelta };
    }

    const target = pickNearestEnemy(entityManager, player.position.x, player.position.y);
    const direction = target
      ? normalize(target.position.x - player.position.x, target.position.y - player.position.y)
      : { x: 0, y: 1 };

    const missile = entityManager.create(
      createMissile(
        player.position.x,
        player.position.y + 0.7,
        direction.x * MISSILE_SPEED,
        direction.y * MISSILE_SPEED,
        Faction.Player,
        target?.id
      )
    );

    player.weaponEnergy = (player.weaponEnergy ?? 0) - MISSILE_ENERGY_COST;
    player.fireCooldownMs = MISSILE_INTERVAL_MS;
    fired.push({ weaponMode: player.weaponMode, projectileEntityId: missile.id });
    return { fired, scoreDelta };
  }

  if ((player.weaponEnergy ?? 0) < fallbackShotCost) {
    return { fired, scoreDelta };
  }

  const bullet = entityManager.create(createBullet(player.position.x, player.position.y + 0.7, BULLET_SPEED, Faction.Player));
  player.weaponEnergy = (player.weaponEnergy ?? 0) - fallbackShotCost;
  player.fireCooldownMs = fallbackIntervalMs;
  fired.push({ weaponMode: player.weaponMode, projectileEntityId: bullet.id });
  return { fired, scoreDelta };
}

function pickNearestEnemy(entityManager: EntityManager, x: number, y: number) {
  let nearest: ReturnType<EntityManager['all']>[number] | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const entity of entityManager.all()) {
    if (entity.type !== EntityType.Enemy || entity.health <= 0) {
      continue;
    }

    const dist = distanceSquared(x, y, entity.position.x, entity.position.y);
    if (dist < bestDistance) {
      bestDistance = dist;
      nearest = entity;
    }
  }

  return nearest;
}

function pickLaserTarget(entityManager: EntityManager, x: number, y: number) {
  let target: ReturnType<EntityManager['all']>[number] | undefined;
  let nearestAheadY = Number.POSITIVE_INFINITY;

  for (const entity of entityManager.all()) {
    if (entity.type !== EntityType.Enemy || entity.health <= 0) {
      continue;
    }

    const dy = entity.position.y - y;
    const dx = Math.abs(entity.position.x - x);
    if (dy < 0 || dy > LASER_RANGE || dx > LASER_HALF_WIDTH) {
      continue;
    }

    if (dy < nearestAheadY) {
      nearestAheadY = dy;
      target = entity;
    }
  }

  return target;
}

function normalize(x: number, y: number): { x: number; y: number } {
  const mag = Math.hypot(x, y);
  if (mag === 0) {
    return { x: 0, y: 1 };
  }

  return { x: x / mag, y: y / mag };
}
