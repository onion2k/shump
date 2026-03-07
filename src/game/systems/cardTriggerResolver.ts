import type { CardRuntimeState } from '../core/cardRuntimeState';
import type { EntityDestroyedEvent, PickupCollectedEvent, WeaponFiredEvent } from '../core/gameEvents';
import type { CardBonuses } from './cardEffectSystem';
import { EntityType, Faction } from '../ecs/entityTypes';

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

const SHOOT_CHAIN_GAP_MS = 260;
const KILL_CHAIN_GAP_MS = 2600;

export function runCardWeaponFiredTriggerHooks(context: CardWeaponFiredTriggerContext): CardRuntimeState {
  const isPrimaryWeaponShot = !context.event.weaponMode.startsWith('Pod ');
  if (!isPrimaryWeaponShot) {
    return context.runtimeState;
  }

  const nextCooldowns = new Map(context.runtimeState.perCardProcCooldownUntilMs);
  const lastShotAtMs = nextCooldowns.get('__last-shot-ms') ?? Number.NEGATIVE_INFINITY;
  const gapMs = context.event.atMs - lastShotAtMs;
  const chainedGapMs = gapMs > 0 ? gapMs : 16;
  const consecutiveShootingMs =
    Number.isFinite(lastShotAtMs) && gapMs <= SHOOT_CHAIN_GAP_MS
      ? Math.min(15000, context.runtimeState.consecutiveShootingMs + chainedGapMs)
      : 0;
  nextCooldowns.set('__last-shot-ms', context.event.atMs);

  return {
    ...context.runtimeState,
    consecutiveShootingMs,
    shotCounter: context.runtimeState.shotCounter + 1,
    perCardProcCooldownUntilMs: nextCooldowns
  };
}

export function runCardPickupTriggerHooks(context: CardPickupTriggerContext): CardRuntimeState {
  return context.runtimeState;
}

export function runCardEntityDestroyedTriggerHooks(context: CardEntityDestroyedTriggerContext): CardRuntimeState {
  if (context.event.entityType !== EntityType.Enemy || context.event.entityFaction !== Faction.Enemy) {
    return context.runtimeState;
  }

  let chainKillStreak = context.runtimeState.chainKillStreak;
  let lastEnemyKillAtMs = context.runtimeState.lastEnemyKillAtMs;
  let rapidVentingUntilMs = context.runtimeState.rapidVentingUntilMs;
  let temporaryRoundEffects = context.runtimeState.temporaryRoundEffects;

  if (context.event.reason === 'health') {
    const gapMs = context.event.atMs - lastEnemyKillAtMs;
    chainKillStreak = Number.isFinite(lastEnemyKillAtMs) && gapMs <= KILL_CHAIN_GAP_MS
      ? Math.min(30, chainKillStreak + 1)
      : 1;
    lastEnemyKillAtMs = context.event.atMs;

    const rapidVenting = Math.max(0, context.bonuses.triggerModifierBonus['rapid-venting'] ?? 0);
    if (rapidVenting > 0) {
      rapidVentingUntilMs = Math.max(rapidVentingUntilMs, context.event.atMs + 450 + rapidVenting * 220);
    }

    const perfectTiming = Math.max(0, context.bonuses.conditionalModifierBonus['perfect-timing'] ?? 0);
    if (perfectTiming > 0 && (context.event.entityAgeMs ?? Number.POSITIVE_INFINITY) <= 1500) {
      const existingIndex = temporaryRoundEffects.findIndex((effect) => effect.effectId === 'perfect-timing-bonus');
      if (existingIndex >= 0) {
        const existing = temporaryRoundEffects[existingIndex];
        const nextEffects = [...temporaryRoundEffects];
        nextEffects[existingIndex] = {
          ...existing,
          remainingMs: Math.max(existing.remainingMs, 2400 + perfectTiming * 280),
          stacks: Math.min(4, (existing.stacks ?? 1) + 1)
        };
        temporaryRoundEffects = nextEffects;
      } else {
        temporaryRoundEffects = [
          ...temporaryRoundEffects,
          {
            cardId: 'perfect-timing',
            effectId: 'perfect-timing-bonus',
            stacks: 1,
            remainingMs: 2400 + perfectTiming * 280
          }
        ];
      }
    }
  }

  const perTargetHitMap = new Map(context.runtimeState.perTargetHitMap);
  perTargetHitMap.delete(context.event.entityId);

  return {
    ...context.runtimeState,
    chainKillStreak,
    lastEnemyKillAtMs,
    rapidVentingUntilMs,
    temporaryRoundEffects,
    perTargetHitMap
  };
}
