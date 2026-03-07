import { describe, expect, it } from 'vitest';
import { createDeterministicRng } from '../../src/game/core/deterministicRng';

describe('deterministicRng', () => {
  it('produces identical sequences for same seed and stream', () => {
    const a = createDeterministicRng(42);
    const b = createDeterministicRng(42);

    const seqA = [
      a.nextFloat('weapon'),
      a.nextFloat('weapon'),
      a.nextInt('weapon', 100),
      a.nextFloat('drops', 7)
    ];
    const seqB = [
      b.nextFloat('weapon'),
      b.nextFloat('weapon'),
      b.nextInt('weapon', 100),
      b.nextFloat('drops', 7)
    ];

    expect(seqA).toEqual(seqB);
  });

  it('keeps streams independent', () => {
    const rng = createDeterministicRng(99);
    const firstWeapon = rng.nextFloat('weapon');
    const firstDrop = rng.nextFloat('drop');
    const secondWeapon = rng.nextFloat('weapon');

    const replay = createDeterministicRng(99);
    const replayWeapon = replay.nextFloat('weapon');
    const replayDrop = replay.nextFloat('drop');
    const replaySecondWeapon = replay.nextFloat('weapon');

    expect(firstWeapon).toBe(replayWeapon);
    expect(firstDrop).toBe(replayDrop);
    expect(secondWeapon).toBe(replaySecondWeapon);
  });

  it('restores sequence position from snapshot', () => {
    const rng = createDeterministicRng(777);
    const before = rng.nextFloat('combat');
    expect(before).toBeGreaterThanOrEqual(0);
    expect(before).toBeLessThan(1);

    const saved = rng.snapshot();
    const nextA = rng.nextFloat('combat');
    const nextB = rng.nextInt('combat', 1000);

    rng.restore(saved);
    expect(rng.nextFloat('combat')).toBe(nextA);
    expect(rng.nextInt('combat', 1000)).toBe(nextB);
  });
});
