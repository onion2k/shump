import type { EntityManager } from '../ecs/EntityManager';
import type { Entity } from '../ecs/components';
import { EntityType, Faction } from '../ecs/entityTypes';
import { createPod } from '../factories/createPod';
import { createBullet } from '../factories/createBullet';
import { createMissile } from '../factories/createMissile';
import { BULLET_SPEED } from './constants';
import { podTuning } from './gameTuning';
import { findNearestEnemy, normalizeDirection } from './gameEntityHelpers';
import { clamp } from '../util/math';

function getEntitiesByType(entityManager: EntityManager, type: EntityType): Entity[] {
  const entities: Entity[] = [];
  for (const entity of entityManager.values()) {
    if (entity.type === type) {
      entities.push(entity);
    }
  }
  return entities;
}

function getPodsSortedByIndex(entityManager: EntityManager): Entity[] {
  return getEntitiesByType(entityManager, EntityType.Pod).sort((a, b) => (a.podIndex ?? 0) - (b.podIndex ?? 0));
}

interface PodWeaponOptions {
  missileModifierBonus?: Record<string, number>;
}

export function syncPodsWithPlayer(
  entityManager: EntityManager,
  playerId: number,
  elapsedMs: number,
  deltaSeconds: number
): void {
  const player = entityManager.get(playerId);
  if (!player) {
    return;
  }

  const desiredCount = clamp(player.podCount ?? 0, 0, podTuning.maxCount);
  player.podCount = desiredCount;
  const existingPods = getEntitiesByType(entityManager, EntityType.Pod);

  for (const pod of existingPods) {
    if ((pod.podIndex ?? -1) >= desiredCount) {
      entityManager.remove(pod.id);
    }
  }

  const activePods = getPodsSortedByIndex(entityManager);

  for (let index = 0; index < desiredCount; index += 1) {
    if (activePods.some((pod) => pod.podIndex === index)) {
      continue;
    }
    entityManager.create(createPod(index, player.position.x, player.position.y));
  }

  if (desiredCount === 0) {
    return;
  }

  const pods = getPodsSortedByIndex(entityManager);
  const orbitSeconds = elapsedMs * 0.001;
  const orbitAngularSpeed = podTuning.orbitAngularSpeed;
  const orbitRadius = podTuning.orbitRadius;

  for (const pod of pods) {
    const index = pod.podIndex ?? 0;
    const angle = orbitSeconds * orbitAngularSpeed + (index / desiredCount) * Math.PI * 2;
    pod.position.x = player.position.x + Math.cos(angle) * orbitRadius;
    pod.position.y = player.position.y + podTuning.orbitYOffset + Math.sin(angle) * orbitRadius * podTuning.orbitVerticalScale;
    pod.velocity.x = 0;
    pod.velocity.y = 0;
    pod.fireCooldownMs = (pod.fireCooldownMs ?? 0) - deltaSeconds * 1000;
  }
}

export function handlePodWeapons(
  entityManager: EntityManager,
  playerId: number,
  deltaSeconds: number,
  emitWeaponFiredEvent: (shooter: Pick<Entity, 'id' | 'faction'>, weaponMode: string, projectileEntityId?: number) => void,
  options: PodWeaponOptions = {}
): void {
  if (deltaSeconds <= 0) {
    return;
  }

  const player = entityManager.get(playerId);
  if (!player) {
    return;
  }

  const podWeaponMode = player.podWeaponMode ?? 'Auto Pulse';
  const missileBonuses = options.missileModifierBonus ?? {};
  const pods = getEntitiesByType(entityManager, EntityType.Pod);
  const enemies = getEntitiesByType(entityManager, EntityType.Enemy);
  if (pods.length === 0) {
    return;
  }

  for (const pod of pods) {
    if ((pod.fireCooldownMs ?? 0) > 0) {
      continue;
    }

    const target = findNearestEnemy(enemies, pod.position.x, pod.position.y);
    const direction = normalizeDirection(
      target ? target.position.x - pod.position.x : 0,
      target ? target.position.y - pod.position.y : 1
    );

    if (podWeaponMode === 'Homing Missile') {
      const missileSpeed = podTuning.homingMissileSpeed;
      const swarmStacks = Math.max(0, Math.round(missileBonuses['swarm-missiles'] ?? 0));
      const missileCount = 1 + swarmStacks * 2;
      const guidanceBonus = Math.max(0, missileBonuses['guidance-upgrade'] ?? 0);
      const delayedDetonation = Math.max(0, missileBonuses['delayed-detonation'] ?? 0);
      const clusterWarheads = Math.max(0, Math.round(missileBonuses['cluster-warheads'] ?? 0));
      const shockwavePayload = Math.max(0, missileBonuses['shockwave-payload'] ?? 0);

      for (let missileIndex = 0; missileIndex < missileCount; missileIndex += 1) {
        const angleOffset = missileCount === 1 ? 0 : (missileIndex - (missileCount - 1) * 0.5) * 0.14;
        const rotated = rotate(direction.x, direction.y, angleOffset);
        const damageScale = missileCount > 1 ? 0.58 : 1;
        const speedScale = missileCount > 1 ? 0.92 : 1;
        const missile = entityManager.create(
          createMissile(
            pod.position.x,
            pod.position.y,
            rotated.x * missileSpeed * speedScale,
            rotated.y * missileSpeed * speedScale,
              Faction.Player,
              target?.id,
              {
              damage: Math.max(1, Math.round(3 * damageScale)),
              homingTurnRate: 7.5 * Math.max(0.35, 1 + guidanceBonus / 100),
              metadata: {
                splashRadius: delayedDetonation > 0 ? 1.9 + delayedDetonation * 0.55 : undefined,
                splitOnImpact: clusterWarheads > 0 ? true : undefined,
                splitSpec: clusterWarheads > 0
                  ? {
                      childCount: 3 + clusterWarheads,
                      speedScale: 0.72,
                      damageScale: 0.45
                    }
                  : undefined,
                knockbackScale: shockwavePayload > 0 ? 1 + shockwavePayload * 0.32 : undefined
              }
            }
          )
        );
        emitWeaponFiredEvent(player, 'Pod Homing Missile', missile.id);
      }

      pod.fireCooldownMs = podTuning.homingMissileCooldownMs + Math.max(0, missileCount - 1) * 70;
      continue;
    }

    const pulseSpeed = BULLET_SPEED * podTuning.pulseSpeedMultiplier;
    const bullet = entityManager.create(
      createBullet(
        pod.position.x,
        pod.position.y,
        direction.y * pulseSpeed,
        Faction.Player,
        podTuning.pulseLifetimeMs,
        podTuning.pulseDamage,
        podTuning.pulseRadius,
        direction.x * pulseSpeed
      )
    );
    pod.fireCooldownMs = podTuning.pulseCooldownMs;
    emitWeaponFiredEvent(player, 'Pod Auto Pulse', bullet.id);
  }
}

function rotate(x: number, y: number, radians: number): { x: number; y: number } {
  if (radians === 0) {
    return { x, y };
  }
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos
  };
}
