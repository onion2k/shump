import { describe, it, expect, vi, afterEach } from 'vitest';
import { ParticleSystem } from '../../src/game/particles/particleSystem';
import { EntityManager } from '../../src/game/ecs/EntityManager';
import { EntityType } from '../../src/game/ecs/entityTypes';

describe('ParticleSystem', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('spawns particles with emitter direction, spread and velocity', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const manager = new EntityManager();
    const particles = new ParticleSystem();
    particles.addEmitter({
      position: { x: 4, y: -3 },
      direction: Math.PI / 2,
      spread: 0,
      lifetimeMs: 1000,
      particleType: 'spark',
      emissionRatePerSecond: 10,
      particleLifetimeMs: 250,
      particleSpeed: 6,
      velocityProvider: () => ({ x: 1, y: -2 })
    });

    particles.tick(manager, 0.5);

    const spawned = manager.all();
    expect(spawned).toHaveLength(5);
    for (const entity of spawned) {
      expect(entity.type).toBe(EntityType.Particle);
      expect(entity.particleType).toBe('spark');
      expect(entity.velocity.x).toBeCloseTo(1);
      expect(entity.velocity.y).toBeCloseTo(4);
      expect(entity.lifetimeMs).toBe(250);
    }
  });

  it('stops emitting after emitter lifetime', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const manager = new EntityManager();
    const particles = new ParticleSystem();
    particles.addEmitter({
      position: { x: 0, y: 0 },
      direction: 0,
      spread: 0.8,
      lifetimeMs: 300,
      particleType: 'smoke',
      emissionRatePerSecond: 20,
      particleLifetimeMs: 120,
      particleSpeed: 3
    });

    particles.tick(manager, 0.1);
    particles.tick(manager, 0.2);
    particles.tick(manager, 0.4);

    expect(manager.all()).toHaveLength(6);
  });

  it('applies direction, velocity and lifetime randomness as +/- percentages', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5) // spread
      .mockReturnValueOnce(1) // direction +max
      .mockReturnValueOnce(0) // speed -max
      .mockReturnValueOnce(0); // lifetime -max

    const manager = new EntityManager();
    const particles = new ParticleSystem();
    particles.addEmitter({
      position: { x: 0, y: 0 },
      direction: 2,
      spread: 0,
      directionRandomness: 0.25,
      lifetimeMs: 1000,
      particleType: 'spark',
      emissionRatePerSecond: 1,
      particleLifetimeMs: 200,
      lifetimeRandomness: 0.5,
      particleSpeed: 10,
      velocityRandomness: 0.2
    });

    particles.tick(manager, 1);

    const [spawned] = manager.all();
    expect(spawned).toBeTruthy();
    expect(spawned.lifetimeMs).toBeCloseTo(100);
    expect(spawned.velocity.x).toBeCloseTo(Math.cos(2.5) * 8);
    expect(spawned.velocity.y).toBeCloseTo(Math.sin(2.5) * 8);
  });
});
