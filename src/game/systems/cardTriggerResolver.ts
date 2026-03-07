import type { CardRuntimeState } from '../core/cardRuntimeState';
import type { EntityDestroyedEvent, PickupCollectedEvent, WeaponFiredEvent } from '../core/gameEvents';
import type { CardBonuses } from './cardEffectSystem';

export interface CardWeaponFiredTriggerContext {
  event: WeaponFiredEvent;
  bonuses: CardBonuses;
  runtimeState: CardRuntimeState;
}

export interface CardPickupTriggerContext {
  event: PickupCollectedEvent;
  bonuses: CardBonuses;
  runtimeState: CardRuntimeState;
}

export interface CardEntityDestroyedTriggerContext {
  event: EntityDestroyedEvent;
  bonuses: CardBonuses;
  runtimeState: CardRuntimeState;
}

export function runCardWeaponFiredTriggerHooks(context: CardWeaponFiredTriggerContext): CardRuntimeState {
  const nextCooldowns = new Map(context.runtimeState.perCardProcCooldownUntilMs);
  nextCooldowns.set('__last-shot-ms', context.event.atMs);
  return {
    ...context.runtimeState,
    consecutiveShootingMs: context.runtimeState.consecutiveShootingMs + 1,
    perCardProcCooldownUntilMs: nextCooldowns
  };
}

export function runCardPickupTriggerHooks(context: CardPickupTriggerContext): CardRuntimeState {
  return context.runtimeState;
}

export function runCardEntityDestroyedTriggerHooks(context: CardEntityDestroyedTriggerContext): CardRuntimeState {
  return context.runtimeState;
}
