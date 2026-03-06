import { describe, expect, it } from 'vitest';
import { SaveService } from '../../src/game/persistence/SaveService';

class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key) ?? null : null;
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe('SaveService', () => {
  it('returns a default save when storage has no entry', () => {
    const service = new SaveService({
      storage: new MemoryStorage(),
      now: () => new Date('2026-03-01T10:00:00.000Z')
    });

    const result = service.load();
    expect(result.hadCorruptPrimary).toBe(false);
    expect(result.recoveredFromBackup).toBe(false);
    expect(result.save.version).toBe(1);
    expect(result.save.meta.bankMoney).toBe(0);
    expect(result.save.meta.unlockedLevels).toEqual(['level-1']);
    expect(result.save.activeRun).toBeUndefined();
  });

  it('saves and loads active run state', () => {
    const storage = new MemoryStorage();
    const service = new SaveService({
      storage,
      now: () => new Date('2026-03-01T10:00:00.000Z')
    });

    const saved = service.saveActiveRun({
      seed: 42,
      levelId: 'level-1',
      roundIndex: 2,
      inRunMoney: 175,
      foundCards: ['card-a'],
      activeCards: ['card-b'],
      consumedCards: ['card-c'],
      playerState: {
        health: 6,
        maxHealth: 10,
        weaponLevels: {
          'Auto Pulse': 2
        },
        podCount: 1,
        podWeaponMode: 'Homing Missile',
        moveMaxSpeed: 24,
        moveFollowGain: 6,
        pickupAttractRange: 4.2,
        pickupAttractPower: 16,
        shieldCurrent: 10,
        shieldMax: 10,
        shieldRechargeDelayMs: 1400,
        shieldRechargeTimeMs: 3600,
        shieldRechargeDelayRemainingMs: 0
      },
      elapsedMs: 12345,
      distanceTraveled: 210,
      score: 900
    });

    expect(saved.activeRun?.seed).toBe(42);

    const loaded = service.load();
    expect(loaded.save.activeRun?.levelId).toBe('level-1');
    expect(loaded.save.activeRun?.roundIndex).toBe(2);
    expect(loaded.save.activeRun?.inRunMoney).toBe(175);
    expect(loaded.save.activeRun?.distanceTraveled).toBe(210);
    expect(loaded.save.activeRun?.score).toBe(900);
    expect(loaded.save.activeRun?.playerState.podCount).toBe(1);
    expect(loaded.save.activeRun?.playerState.podWeaponMode).toBe('Homing Missile');
    expect(loaded.save.activeRun?.playerState.weaponLevels['Auto Pulse']).toBe(2);
    expect(loaded.save.activeRun?.consumedCards).toEqual(['card-c']);
  });

  it('migrates legacy v0 shape into v1', () => {
    const storage = new MemoryStorage();
    const now = '2026-03-01T10:00:00.000Z';
    storage.setItem(
      'shump.save.v1',
      JSON.stringify({
        bankMoney: 500,
        ownedCards: ['starter-card'],
        unlockedLevels: ['level-2'],
        lifetimeStats: { runs: 3 },
        updatedAt: now
      })
    );

    const service = new SaveService({
      storage,
      now: () => new Date(now)
    });

    const loaded = service.load();
    expect(loaded.save.version).toBe(1);
    expect(loaded.save.meta.bankMoney).toBe(500);
    expect(loaded.save.meta.ownedCards).toEqual(['starter-card']);
    expect(loaded.save.meta.unlockedLevels).toEqual(['level-2']);
    expect(loaded.save.meta.lifetimeStats.runs).toBe(3);
  });

  it('recovers from backup when primary save is corrupted', () => {
    const storage = new MemoryStorage();
    storage.setItem('shump.save.v1', '{not-valid-json');
    storage.setItem(
      'shump.save.v1.bak',
      JSON.stringify({
        version: 1,
        meta: {
          bankMoney: 77,
          ownedCards: [],
          unlockedLevels: ['level-1'],
          lifetimeStats: {}
        },
        updatedAt: '2026-03-01T10:00:00.000Z'
      })
    );

    const service = new SaveService({
      storage,
      now: () => new Date('2026-03-01T11:00:00.000Z')
    });

    const loaded = service.load();
    expect(loaded.hadCorruptPrimary).toBe(true);
    expect(loaded.recoveredFromBackup).toBe(true);
    expect(loaded.save.meta.bankMoney).toBe(77);

    const persisted = storage.getItem('shump.save.v1');
    expect(persisted).toBeTruthy();
    expect(() => JSON.parse(persisted ?? '')).not.toThrow();
  });
});
