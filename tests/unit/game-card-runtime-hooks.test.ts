import { describe, expect, it, vi } from 'vitest';

const IDLE_POINTER = {
  hasPosition: false,
  x: 0,
  y: 0,
  leftButtonDown: false,
  rightButtonDown: false
};

async function runDeterministicScenario(GameCtor: new () => { startNewRun: (seed?: number) => void; update: (delta: number, pointer: typeof IDLE_POINTER) => void; snapshot: () => unknown }) {
  const game = new GameCtor();
  game.startNewRun(2468);
  for (let i = 0; i < 10; i += 1) {
    game.update(0.1, IDLE_POINTER);
  }
  return game.snapshot();
}

describe('card runtime hook scaffolding', () => {
  it('invokes prefire/post-hit/trigger/temporary hooks during update', async () => {
    vi.resetModules();
    const callOrder: string[] = [];

    vi.doMock('../../src/game/systems/cardProjectileResolver', async () => {
      const actual = await vi.importActual<typeof import('../../src/game/systems/cardProjectileResolver')>(
        '../../src/game/systems/cardProjectileResolver'
      );
      return {
        ...actual,
        runCardProjectilePrefireHooks: vi.fn((context: { runtimeState: unknown }) => {
          callOrder.push('prefire');
          return context.runtimeState;
        }),
        runCardProjectilePostHitHooks: vi.fn((context: { runtimeState: unknown; scoreDelta: number }) => {
          callOrder.push('posthit');
          return { runtimeState: context.runtimeState, scoreDelta: context.scoreDelta };
        })
      };
    });

    vi.doMock('../../src/game/systems/cardTriggerResolver', async () => {
      const actual = await vi.importActual<typeof import('../../src/game/systems/cardTriggerResolver')>(
        '../../src/game/systems/cardTriggerResolver'
      );
      return {
        ...actual,
        runCardWeaponFiredTriggerHooks: vi.fn((context: { runtimeState: unknown }) => {
          callOrder.push('weapon');
          return context.runtimeState;
        }),
        runCardPickupTriggerHooks: vi.fn((context: { runtimeState: unknown }) => {
          callOrder.push('pickup');
          return context.runtimeState;
        }),
        runCardEntityDestroyedTriggerHooks: vi.fn((context: { runtimeState: unknown }) => {
          callOrder.push('destroyed');
          return context.runtimeState;
        })
      };
    });

    vi.doMock('../../src/game/systems/cardTemporaryEffectResolver', async () => {
      const actual = await vi.importActual<typeof import('../../src/game/systems/cardTemporaryEffectResolver')>(
        '../../src/game/systems/cardTemporaryEffectResolver'
      );
      return {
        ...actual,
        tickCardTemporaryEffectHooks: vi.fn((context: { runtimeState: unknown }) => {
          callOrder.push('tick');
          return context.runtimeState;
        }),
        clearRoundTemporaryCardEffects: vi.fn((runtimeState: unknown) => {
          callOrder.push('clear');
          return runtimeState;
        })
      };
    });

    const { Game } = await import('../../src/game/core/Game');
    const { EntityType, Faction } = await import('../../src/game/ecs/entityTypes');

    const game = new Game();
    game.startNewRun(42);

    const player = game.entities.all().find((entity) => entity.type === EntityType.Player);
    expect(player).toBeTruthy();
    if (!player) {
      return;
    }

    game.entities.create({
      type: EntityType.Pickup,
      position: { x: player.position.x, y: player.position.y },
      velocity: { x: 0, y: 0 },
      radius: 0.45,
      health: 1,
      maxHealth: 1,
      pickupKind: 'money',
      pickupValue: 5
    });

    game.entities.create({
      type: EntityType.Enemy,
      faction: Faction.Enemy,
      position: { x: player.position.x + 0.2, y: player.position.y + 0.5 },
      velocity: { x: 0, y: 0 },
      radius: 0.6,
      health: 0,
      maxHealth: 1
    });

    game.update(0.016, IDLE_POINTER);

    expect(callOrder).toContain('tick');
    expect(callOrder).toContain('prefire');
    expect(callOrder).toContain('posthit');
    expect(callOrder).toContain('weapon');
    expect(callOrder).toContain('pickup');
    expect(callOrder).toContain('destroyed');

    expect(callOrder.indexOf('tick')).toBeLessThan(callOrder.indexOf('prefire'));
    expect(callOrder.indexOf('prefire')).toBeLessThan(callOrder.indexOf('posthit'));
  });

  it('preserves baseline snapshot output with no-op hooks', async () => {
    vi.resetModules();
    const { Game: BaselineGame } = await import('../../src/game/core/Game');
    const baselineSnapshot = await runDeterministicScenario(BaselineGame);

    vi.resetModules();
    vi.doMock('../../src/game/systems/cardProjectileResolver', async () => {
      const actual = await vi.importActual<typeof import('../../src/game/systems/cardProjectileResolver')>(
        '../../src/game/systems/cardProjectileResolver'
      );
      return {
        ...actual,
        runCardProjectilePrefireHooks: vi.fn((context: { runtimeState: unknown }) => context.runtimeState),
        runCardProjectilePostHitHooks: vi.fn((context: { runtimeState: unknown; scoreDelta: number }) => ({
          runtimeState: context.runtimeState,
          scoreDelta: context.scoreDelta
        }))
      };
    });
    vi.doMock('../../src/game/systems/cardTriggerResolver', async () => {
      const actual = await vi.importActual<typeof import('../../src/game/systems/cardTriggerResolver')>(
        '../../src/game/systems/cardTriggerResolver'
      );
      return {
        ...actual,
        runCardWeaponFiredTriggerHooks: vi.fn((context: { runtimeState: unknown }) => context.runtimeState),
        runCardPickupTriggerHooks: vi.fn((context: { runtimeState: unknown }) => context.runtimeState),
        runCardEntityDestroyedTriggerHooks: vi.fn((context: { runtimeState: unknown }) => context.runtimeState)
      };
    });
    vi.doMock('../../src/game/systems/cardTemporaryEffectResolver', async () => {
      const actual = await vi.importActual<typeof import('../../src/game/systems/cardTemporaryEffectResolver')>(
        '../../src/game/systems/cardTemporaryEffectResolver'
      );
      return {
        ...actual,
        tickCardTemporaryEffectHooks: vi.fn((context: { runtimeState: unknown }) => context.runtimeState),
        clearRoundTemporaryCardEffects: vi.fn((runtimeState: unknown) => runtimeState)
      };
    });

    const { Game: HookedGame } = await import('../../src/game/core/Game');
    const hookedSnapshot = await runDeterministicScenario(HookedGame);

    expect(hookedSnapshot).toEqual(baselineSnapshot);
  });
});
