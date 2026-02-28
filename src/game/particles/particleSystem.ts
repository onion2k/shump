import type { EntityManager } from '../ecs/EntityManager';
import type { Vec2 } from '../ecs/components';
import { createParticle } from '../factories/createParticle';
import { randomRange } from '../util/random';

export interface ParticleEmitterConfig {
  position: Vec2;
  direction: number;
  spread: number;
  lifetimeMs: number;
  particleType: string;
  emissionRatePerSecond: number;
  particleLifetimeMs: number;
  particleSpeed: number;
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

  clearEmitters() {
    this.emitters.clear();
  }

  tick(entityManager: EntityManager, deltaSeconds: number) {
    const deltaMs = deltaSeconds * 1000;

    for (const emitter of [...this.emitters.values()]) {
      const remainingMs = emitter.config.lifetimeMs - emitter.ageMs;
      const activeMs = Math.min(deltaMs, Math.max(remainingMs, 0));
      const spawnExact = activeMs * (emitter.config.emissionRatePerSecond / 1000) + emitter.spawnCarry;
      const spawnCount = Math.floor(spawnExact);
      emitter.spawnCarry = spawnExact - spawnCount;

      for (let i = 0; i < spawnCount; i += 1) {
        const angle =
          emitter.config.direction + randomRange(-emitter.config.spread / 2, emitter.config.spread / 2);
        const speed = emitter.config.particleSpeed;
        const inheritedVelocity = emitter.config.velocityProvider?.() ?? { x: 0, y: 0 };
        const position = emitter.config.positionProvider?.() ?? emitter.config.position;

        entityManager.create(
          createParticle(
            position.x,
            position.y,
            Math.cos(angle) * speed + inheritedVelocity.x,
            Math.sin(angle) * speed + inheritedVelocity.y,
            emitter.config.particleType,
            emitter.config.particleLifetimeMs,
            emitter.config.particleRadius
          )
        );
      }

      emitter.ageMs += deltaMs;
      if (emitter.ageMs >= emitter.config.lifetimeMs) {
        this.emitters.delete(emitter.id);
      }
    }
  }
}
