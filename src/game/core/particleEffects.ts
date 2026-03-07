import type { EntityManager } from '../ecs/EntityManager';
import type { Entity } from '../ecs/components';
import { EntityType, Faction } from '../ecs/entityTypes';
import { createParticle } from '../factories/createParticle';
import type { ParticleEmitterConfig, ParticleSystem } from '../particles/particleSystem';
import { randomRange } from '../util/random';
import { gameSettings } from '../config/gameSettings';
import { particleTuning } from './gameTuning';
import { normalizeDirection } from './gameEntityHelpers';

export interface TrailSource {
  x: number;
  y: number;
  vx: number;
  vy: number;
  remainingMs: number;
}

export function tickTrailSources(trailSources: TrailSource[], deltaSeconds: number): TrailSource[] {
  if (trailSources.length === 0) {
    return trailSources;
  }

  const deltaMs = deltaSeconds * 1000;
  const next: TrailSource[] = [];
  for (const source of trailSources) {
    source.remainingMs -= deltaMs;
    if (source.remainingMs <= 0) {
      continue;
    }

    source.x += source.vx * deltaSeconds;
    source.y += source.vy * deltaSeconds;
    next.push(source);
  }

  return next;
}

export function spawnEnemyExplosionEffects(
  particles: ParticleSystem,
  trailSources: TrailSource[],
  x: number,
  y: number,
  scheduleEmitter: (delayMs: number, config: ParticleEmitterConfig) => void,
  emitOneShotParticle: (particle: Omit<Entity, 'id'>) => void
): void {
  const explosion = gameSettings.particles.explosion;
  const fireBurst = explosion.fireBurst;
  const smokeBurst = explosion.smokeBurst;
  const shards = explosion.shards;
  const trail = explosion.trail;

  particles.addEmitter({
    position: { x, y },
    direction: 0,
    spread: Math.PI * 2,
    directionRandomness: fireBurst.directionRandomness,
    lifetimeMs: fireBurst.emitterLifetimeMs,
    particleType: 'fire',
    emissionRatePerSecond: fireBurst.emissionRatePerSecond,
    particleLifetimeMs: fireBurst.particleLifetimeMs,
    particleSpeed: fireBurst.particleSpeed,
    lifetimeRandomness: fireBurst.lifetimeRandomness,
    velocityRandomness: fireBurst.velocityRandomness,
    particleRadius: fireBurst.particleRadius
  });

  scheduleEmitter(smokeBurst.delayMs, {
    position: { x, y },
    direction: 0,
    spread: Math.PI * 2,
    directionRandomness: smokeBurst.directionRandomness,
    lifetimeMs: smokeBurst.emitterLifetimeMs,
    particleType: 'smoke',
    emissionRatePerSecond: smokeBurst.emissionRatePerSecond,
    particleLifetimeMs: smokeBurst.particleLifetimeMs,
    particleSpeed: smokeBurst.particleSpeed,
    lifetimeRandomness: smokeBurst.lifetimeRandomness,
    velocityRandomness: smokeBurst.velocityRandomness,
    particleRadius: smokeBurst.particleRadius
  });

  for (let i = 0; i < shards.count; i += 1) {
    const angle = randomRange(0, Math.PI * 2);
    const speed = randomRange(shards.speedMin, shards.speedMax);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const shardLifetimeMs = randomRange(shards.lifetimeMinMs, shards.lifetimeMaxMs);

    emitOneShotParticle(
      createParticle(x, y, vx, vy, 'enemy-shard', shardLifetimeMs, randomRange(shards.radiusMin, shards.radiusMax))
    );

    const trailSource: TrailSource = { x, y, vx, vy, remainingMs: shardLifetimeMs };
    trailSources.push(trailSource);
    particles.addEmitter({
      position: { x, y },
      direction: Math.atan2(vy, vx),
      spread: trail.spreadRadians,
      directionRandomness: trail.directionRandomness,
      lifetimeMs: shardLifetimeMs,
      particleType: 'fire',
      emissionRatePerSecond: trail.emissionRatePerSecond,
      particleLifetimeMs: trail.particleLifetimeMs,
      particleSpeed: trail.particleSpeed,
      lifetimeRandomness: trail.lifetimeRandomness,
      velocityRandomness: trail.velocityRandomness,
      particleRadius: trail.particleRadius,
      positionProvider: () => ({ x: trailSource.x, y: trailSource.y }),
      velocityProvider: () => ({
        x: trailSource.vx * trail.inheritVelocityFactor,
        y: trailSource.vy * trail.inheritVelocityFactor
      })
    });
  }
}

export function emitMissileThrusterParticles(
  entityManager: EntityManager,
  deltaSeconds: number,
  currentAccumulator: number,
  emitOneShotParticle: (particle: Omit<Entity, 'id'>) => void
): number {
  const missileThruster = particleTuning.missileThruster;
  let accumulator = currentAccumulator + deltaSeconds * missileThruster.spawnRatePerSecond;
  const spawnSteps = Math.floor(accumulator);
  if (spawnSteps <= 0) {
    return accumulator;
  }
  accumulator -= spawnSteps;

  for (const missile of entityManager.values()) {
    if (missile.type !== EntityType.Bullet || missile.projectileKind !== 'missile' || missile.faction !== Faction.Player) {
      continue;
    }

    const velocity = normalizeDirection(missile.velocity.x, missile.velocity.y);
    for (let i = 0; i < spawnSteps; i += 1) {
      const spread = randomRange(missileThruster.spreadMin, missileThruster.spreadMax);
      const backwardX = -velocity.x + spread;
      const backwardY = -velocity.y + spread * missileThruster.spreadVerticalScale;
      const trailDirection = normalizeDirection(backwardX, backwardY);
      const spawnX = missile.position.x - velocity.x * missileThruster.spawnOffset;
      const spawnY = missile.position.y - velocity.y * missileThruster.spawnOffset;
      emitOneShotParticle(
        createParticle(
          spawnX,
          spawnY,
          trailDirection.x * missileThruster.particleSpeed + missile.velocity.x * missileThruster.inheritedVelocityFactor,
          trailDirection.y * missileThruster.particleSpeed + missile.velocity.y * missileThruster.inheritedVelocityFactor,
          'missile-thruster',
          randomRange(missileThruster.lifetimeMinMs, missileThruster.lifetimeMaxMs),
          randomRange(missileThruster.radiusMin, missileThruster.radiusMax)
        )
      );
    }
  }

  return accumulator;
}
