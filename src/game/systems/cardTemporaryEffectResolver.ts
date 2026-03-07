import type { CardRuntimeState } from '../core/cardRuntimeState';
import type { CardBonuses } from './cardEffectSystem';

export interface CardTemporaryEffectTickContext {
  runtimeState: CardRuntimeState;
  bonuses: CardBonuses;
  deltaSeconds: number;
  elapsedMs: number;
}

export function tickCardTemporaryEffectHooks(context: CardTemporaryEffectTickContext): CardRuntimeState {
  return context.runtimeState;
}

export function clearRoundTemporaryCardEffects(runtimeState: CardRuntimeState): CardRuntimeState {
  if (runtimeState.temporaryRoundEffects.length === 0) {
    return runtimeState;
  }

  return {
    ...runtimeState,
    temporaryRoundEffects: []
  };
}
