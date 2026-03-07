import { createDeterministicRng, type DeterministicRng } from './deterministicRng';

export interface TemporaryRoundEffectState {
  cardId: string;
  effectId: string;
  stacks: number;
  remainingMs: number;
}

export interface CardRuntimeState {
  hitStreak: number;
  consecutiveShootingMs: number;
  perTargetHitMap: Map<number, number>;
  temporaryRoundEffects: TemporaryRoundEffectState[];
  perCardProcCooldownUntilMs: Map<string, number>;
  rng: DeterministicRng;
}

export function createCardRuntimeState(seed: number): CardRuntimeState {
  return {
    hitStreak: 0,
    consecutiveShootingMs: 0,
    perTargetHitMap: new Map<number, number>(),
    temporaryRoundEffects: [],
    perCardProcCooldownUntilMs: new Map<string, number>(),
    rng: createDeterministicRng(seed)
  };
}
