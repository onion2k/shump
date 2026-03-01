import { describe, it, expect } from 'vitest';
import { movementSystem } from '../../src/game/systems/movementSystem';
import { EntityType, Faction } from '../../src/game/ecs/entityTypes';

describe('enemy movement patterns', () => {
  it('applies sine x-offset around spawnX', () => {
    const enemy = {
      id: 1,
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: 0, y: 10 },
      velocity: { x: 0, y: -1 },
      radius: 0.7,
      health: 2,
      maxHealth: 2,
      movementPattern: 'sine' as const,
      patternAmplitude: 2,
      patternFrequency: 2,
      spawnX: 0,
      ageMs: 0
    };

    movementSystem([enemy], 0.5);

    expect(enemy.position.x).toBeCloseTo(Math.sin(1) * 2, 3);
    expect(enemy.position.y).toBeCloseTo(9.5, 3);
  });

  it('applies zigzag x-offset around spawnX', () => {
    const enemy = {
      id: 2,
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: 1, y: 10 },
      velocity: { x: 0, y: -1 },
      radius: 0.7,
      health: 2,
      maxHealth: 2,
      movementPattern: 'zigzag' as const,
      patternAmplitude: 1.5,
      patternFrequency: 3,
      spawnX: 1,
      ageMs: 0
    };

    movementSystem([enemy], 0.25);

    expect(enemy.position.x).toBe(2.5);
    expect(enemy.position.y).toBeCloseTo(9.75, 3);
  });

  it('applies bezier x-curve from movement params', () => {
    const enemy = {
      id: 3,
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: 2, y: 10 },
      velocity: { x: 0, y: -1 },
      radius: 0.7,
      health: 2,
      maxHealth: 2,
      movementPattern: 'bezier' as const,
      patternAmplitude: 1.5,
      patternFrequency: 1,
      movementParams: {
        bezierStartX: 2,
        bezierControl1X: -2,
        bezierControl2X: 3,
        bezierEndX: -1
      },
      spawnX: 2,
      spawnY: 10,
      ageMs: 0
    };

    movementSystem([enemy], 0.5);

    expect(enemy.position.x).toBeCloseTo(0.5, 2);
    expect(enemy.position.y).toBeCloseTo(9.5, 3);
  });

  it('applies lissajous x-offset modulation', () => {
    const enemy = {
      id: 4,
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: -1, y: 9 },
      velocity: { x: 0, y: -1 },
      radius: 0.7,
      health: 2,
      maxHealth: 2,
      movementPattern: 'lissajous' as const,
      patternAmplitude: 2,
      patternFrequency: 1.5,
      movementParams: { lissajousA: 3, lissajousB: 2, lissajousPhase: 0.5 },
      spawnX: -1,
      spawnY: 9,
      ageMs: 0
    };

    movementSystem([enemy], 0.4);

    expect(enemy.position.x).toBeGreaterThan(-3.5);
    expect(enemy.position.x).toBeLessThan(1.5);
    expect(enemy.position.y).toBeCloseTo(8.6, 3);
  });

  it('applies curve movement toward the configured direction', () => {
    const enemy = {
      id: 5,
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: -4, y: 10 },
      velocity: { x: 0, y: -1 },
      radius: 0.7,
      health: 2,
      maxHealth: 2,
      movementPattern: 'curve' as const,
      patternAmplitude: 3,
      patternFrequency: 1,
      movementParams: { curveDirection: 1 },
      spawnX: -4,
      ageMs: 0
    };

    movementSystem([enemy], 0.8);

    expect(enemy.position.x).toBeGreaterThan(-2.5);
    expect(enemy.position.y).toBeCloseTo(9.2, 3);
  });

  it('applies spiral movement with damped horizontal radius', () => {
    const enemy = {
      id: 6,
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: 2, y: 11 },
      velocity: { x: 0, y: -1 },
      radius: 0.7,
      health: 2,
      maxHealth: 2,
      movementPattern: 'spiral' as const,
      patternAmplitude: 2.8,
      patternFrequency: 1,
      movementParams: { spiralTurns: 2, spiralDecay: 0.5 },
      spawnX: 2,
      ageMs: 0
    };

    movementSystem([enemy], 0.1);
    const earlyOffset = Math.abs(enemy.position.x - 2);
    movementSystem([enemy], 1);
    const lateOffset = Math.abs(enemy.position.x - 2);

    expect(earlyOffset).toBeGreaterThan(lateOffset);
    expect(enemy.position.y).toBeCloseTo(9.9, 3);
  });
});
