import type { EntityManager } from '../ecs/EntityManager';
import type { Vec2 } from '../ecs/components';
import { createParticle } from '../factories/createParticle';
import { randomRange } from '../util/random';
import type { Entity } from '../ecs/components';

export interface ParticleEmitterConfig {
  position: Vec2;
  direction: number;
  spread: number;
  lifetimeMs: number;
  particleType: string;
  emissionRatePerSecond: number;
  particleLifetimeMs: number;
  particleSpeed: number;
  directionRandomness?: number;
  velocityRandomness?: number;
  lifetimeRandomness?: number;
  particleRadius?: number;
  positionProvider?: () => Vec2;
  velocityProvider?: () => Vec2;
}

interface ParticleEmitterRuntime {
  id: number;
  config: ParticleEmitterConfig;
  ageMs: number;
  spawnCarry: number;
}

export type ParticleSpawnHandler = (particle: Omit<Entity, 'id'>) => void;
export type ParticleEmitterTickFilter = (id: number, config: ParticleEmitterConfig) => boolean;

function applyRandomness(base: number, randomness = 0): number {
  if (randomness <= 0) {
    return base;
  }

  const delta = Math.abs(base) * randomness;
  return base + randomRange(-delta, delta);
}

export class ParticleSystem {
  private nextEmitterId = 1;
  private emitters = new Map<number, ParticleEmitterRuntime>();

  addEmitter(config: ParticleEmitterConfig): number {
    const id = this.nextEmitterId++;
    this.emitters.set(id, {
      id,
      config,
      ageMs: 0,
      spawnCarry: 0
    });
    return id;
  }

  removeEmitter(id: number) {
    this.emitters.delete(id);
  }

  hasEmitter(id: number): boolean {
    return this.emitters.has(id);
  }

  updateEmitter(id: number, config: ParticleEmitterConfig): boolean {
    const emitter = this.emitters.get(id);
    if (!emitter) {
      return false;
    }

    emitter.config = config;
    return true;
  }

  clearEmitters() {
    this.emitters.clear();
  }

  countEmitters(): number {
    return this.emitters.size;
  }

  tick(
    entityManager: EntityManager,
    deltaSeconds: number,
    onSpawn?: ParticleSpawnHandler,
    filter?: ParticleEmitterTickFilter,
    emissionScale = 1
  ) {
    const deltaMs = deltaSeconds * 1000;
    const clampedEmissionScale = clampEmissionScale(emissionScale);

    for (const emitter of [...this.emitters.values()]) {
      if (filter && !filter(emitter.id, emitter.config)) {
        continue;
      }

      const remainingMs = emitter.config.lifetimeMs - emitter.ageMs;
      const activeMs = Math.min(deltaMs, Math.max(remainingMs, 0));
      const spawnExact = activeMs * (emitter.config.emissionRatePerSecond / 1000) * clampedEmissionScale + emitter.spawnCarry;
      const spawnCount = Math.floor(spawnExact);
      emitter.spawnCarry = spawnExact - spawnCount;
      const inheritedVelocity = emitter.config.velocityProvider?.() ?? { x: 0, y: 0 };
      const position = emitter.config.positionProvider?.() ?? emitter.config.position;
      const spreadHalf = emitter.config.spread / 2;

      for (let i = 0; i < spawnCount; i += 1) {
        const baseAngle = emitter.config.direction + randomRange(-spreadHalf, spreadHalf);
        const angle = applyRandomness(baseAngle, emitter.config.directionRandomness);
        const speed = Math.max(0, applyRandomness(emitter.config.particleSpeed, emitter.config.velocityRandomness));
        const lifetimeMs = Math.max(
          1,
          applyRandomness(emitter.config.particleLifetimeMs, emitter.config.lifetimeRandomness)
        );

        const particle = createParticle(
          position.x,
          position.y,
          Math.cos(angle) * speed + inheritedVelocity.x,
          Math.sin(angle) * speed + inheritedVelocity.y,
          emitter.config.particleType,
          lifetimeMs,
          emitter.config.particleRadius
        );
        if (onSpawn) {
          onSpawn(particle);
        } else {
          entityManager.create(particle);
        }
      }

      emitter.ageMs += deltaMs;
      if (emitter.ageMs >= emitter.config.lifetimeMs) {
        this.emitters.delete(emitter.id);
      }
    }
  }
}

function clampEmissionScale(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(0, Math.min(1, value));
}
