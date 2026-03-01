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

    expect(enemy.position.x).toBeGreaterThan(1.6);
    expect(enemy.position.x).toBeLessThan(2.5);
    expect(enemy.position.y).toBeGreaterThan(9.75);
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
    expect(enemy.position.y).toBeCloseTo(9.5, 1);
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
    expect(enemy.position.y).toBeGreaterThan(7.8);
    expect(enemy.position.y).toBeLessThan(10.2);
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

    expect(enemy.position.x).toBeGreaterThan(-3.2);
    expect(enemy.position.y).toBeGreaterThan(8.2);
    expect(enemy.position.y).toBeLessThan(10.2);
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
    expect(enemy.position.y).toBeLessThan(12);
  });

  it('allows patterned enemies to move both forward and backward on y', () => {
    const enemy = {
      id: 7,
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: 0, y: 8 },
      velocity: { x: 0, y: -0.8 },
      radius: 0.7,
      health: 2,
      maxHealth: 2,
      movementPattern: 'sine' as const,
      patternAmplitude: 2.6,
      patternFrequency: 3.2,
      movementParams: { yAmplitude: 1.25, yFrequency: 2.8 },
      spawnX: 0,
      spawnY: 8,
      ageMs: 0
    };

    const ys: number[] = [];
    for (let i = 0; i < 10; i += 1) {
      movementSystem([enemy], 0.15);
      ys.push(enemy.position.y);
    }

    const deltas = ys.slice(1).map((value, index) => value - ys[index]);
    expect(deltas.some((delta) => delta > 0)).toBe(true);
    expect(deltas.some((delta) => delta < 0)).toBe(true);
  });

  it('applies sweep pattern from right-down-up-left', () => {
    const enemy = {
      id: 8,
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: 5.2, y: 14.8 },
      velocity: { x: 0, y: -2 },
      radius: 0.7,
      health: 2,
      maxHealth: 2,
      movementPattern: 'sweep' as const,
      patternAmplitude: 5,
      patternFrequency: 0.2,
      movementParams: { sweepStartX: 5.2, sweepEndX: -5.2, sweepDepth: 24, periodSeconds: 5 },
      spawnX: 5.2,
      spawnY: 14.8,
      ageMs: 0
    };

    movementSystem([enemy], 2.5);

    expect(enemy.position.x).toBeCloseTo(0, 1);
    expect(enemy.position.y).toBeLessThan(-7);
  });

  it('applies shallow-zigzag while continuing downward drift', () => {
    const enemy = {
      id: 9,
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: 0, y: 10 },
      velocity: { x: 0, y: -2 },
      radius: 0.7,
      health: 2,
      maxHealth: 2,
      movementPattern: 'shallow-zigzag' as const,
      patternAmplitude: 1.8,
      patternFrequency: 1.4,
      movementParams: { xScale: 0.55 },
      spawnX: 0,
      spawnY: 10,
      ageMs: 0
    };

    movementSystem([enemy], 0.8);
    const x1 = enemy.position.x;
    const y1 = enemy.position.y;
    movementSystem([enemy], 0.8);
    const x2 = enemy.position.x;
    const y2 = enemy.position.y;

    expect(Math.abs(x1)).toBeLessThan(2);
    expect(Math.abs(x2)).toBeLessThan(2);
    expect(y2).toBeLessThan(y1);
  });

  it('applies horseshoe path from bottom up and down opposite side', () => {
    const enemy = {
      id: 10,
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: 4.8, y: -15.2 },
      velocity: { x: 0, y: -1.2 },
      radius: 0.7,
      health: 2,
      maxHealth: 2,
      movementPattern: 'horseshoe' as const,
      patternAmplitude: 4.2,
      patternFrequency: 0.23,
      movementParams: { radiusX: 4.8, riseHeight: 26, periodSeconds: 5 },
      spawnX: 4.8,
      spawnY: -15.2,
      ageMs: 0
    };

    movementSystem([enemy], 2.5);
    expect(enemy.position.x).toBeCloseTo(0, 1);
    const topY = enemy.position.y;
    expect(topY).toBeGreaterThan(9);
    movementSystem([enemy], 1.25);
    expect(enemy.position.x).toBeLessThan(-3);
    expect(enemy.position.y).toBeLessThan(topY);
  });
});
