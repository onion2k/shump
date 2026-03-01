import { describe, expect, it } from 'vitest';
import { Game } from '../../src/game/core/Game';

describe('game debug emitter', () => {
  it('adds and removes debug emitter when toggled', () => {
    const game = new Game();

    expect(game.particles.countEmitters()).toBe(1);
    game.setDebugEmitterEnabled(true);
    expect(game.particles.countEmitters()).toBe(2);
    game.setDebugEmitterEnabled(false);
    expect(game.particles.countEmitters()).toBe(1);
  });

  it('applies updated debug settings to newly spawned particles', () => {
    const game = new Game();
    game.setDebugEmitterSettings({
      positionX: 2.5,
      positionY: 1.25,
      directionDegrees: 0,
      spreadDegrees: 0,
      particleSpeed: 2,
      velocityX: 1,
      velocityY: 0,
      emissionRatePerSecond: 10,
      particleLifetimeMs: 250
    });
    game.setDebugEmitterEnabled(true);
    game.start();
    game.update(0.2, {
      hasPosition: false,
      x: 0,
      y: 0,
      leftButtonDown: false,
      rightButtonDown: false
    });

    const debugParticle = game
      .entities
      .all()
      .find((entity) => entity.particleType === 'debug');

    expect(debugParticle).toBeTruthy();
    expect(debugParticle?.position.x).toBeCloseTo(3.1);
    expect(debugParticle?.position.y).toBeCloseTo(1.25);
    expect(debugParticle?.velocity.x).toBeCloseTo(3);
    expect(debugParticle?.velocity.y).toBeCloseTo(0);
  });
});
