import type { CardRuntimeState } from '../core/cardRuntimeState';
import type { CardBonuses } from './cardEffectSystem';
import type { EntityManager } from '../ecs/EntityManager';
import { EntityType } from '../ecs/entityTypes';
import { applyDamage } from './damageSystem';

const THERMAL_BURN_EFFECT_ID = 'thermal-rounds-burn';
const DRILL_BORE_EFFECT_ID = 'drill-rounds-bore';
const NAPALM_BURN_EFFECT_ID = 'napalm-burn';
const TIME_SLOWED_EFFECT_ID = 'time-slowed';
const GRAVITY_PULLED_EFFECT_ID = 'gravity-pulled';

export interface CardTemporaryEffectTickContext {
  runtimeState: CardRuntimeState;
  entityManager: EntityManager;
  playerId: number;
  bonuses: CardBonuses;
  deltaSeconds: number;
  elapsedMs: number;
}

export function tickCardTemporaryEffectHooks(context: CardTemporaryEffectTickContext): CardRuntimeState {
  const player = context.entityManager.get(context.playerId);
  if (!player) {
    return context.runtimeState;
  }

  const deltaMs = context.deltaSeconds * 1000;
  let runtimeState = context.runtimeState;

  if (player.statusEffects && player.statusEffects.length > 0) {
    player.statusEffects = player.statusEffects
      .map((effect) => ({ ...effect, remainingMs: effect.remainingMs - deltaMs }))
      .filter((effect) => effect.remainingMs > 0);
  }

  for (const entity of context.entityManager.values()) {
    if (entity.type !== EntityType.Enemy || !entity.statusEffects || entity.statusEffects.length === 0) {
      continue;
    }

    let pendingDamage = 0;
    for (const effect of entity.statusEffects) {
      if (effect.effectId === THERMAL_BURN_EFFECT_ID) {
        pendingDamage += Math.max(0.15, 0.85 * Math.max(1, effect.stacks ?? 1) * context.deltaSeconds);
      } else if (effect.effectId === DRILL_BORE_EFFECT_ID) {
        pendingDamage += Math.max(0.2, 1.1 * Math.max(1, effect.stacks ?? 1) * context.deltaSeconds);
      } else if (effect.effectId === NAPALM_BURN_EFFECT_ID) {
        pendingDamage += Math.max(0.2, 1.2 * Math.max(1, effect.stacks ?? 1) * context.deltaSeconds);
      } else if (effect.effectId === 'emp-disabled') {
        entity.velocity.x *= 0.4;
        entity.velocity.y *= 0.4;
      } else if (effect.effectId === TIME_SLOWED_EFFECT_ID) {
        entity.velocity.x *= 0.7;
        entity.velocity.y *= 0.7;
      } else if (effect.effectId === GRAVITY_PULLED_EFFECT_ID) {
        entity.velocity.x *= 0.82;
        entity.velocity.y *= 0.82;
      }
      effect.remainingMs -= deltaMs;
    }

    if (pendingDamage > 0) {
      applyDamage(entity, pendingDamage);
    }

    entity.statusEffects = entity.statusEffects.filter((effect) => effect.remainingMs > 0);
  }

  if (runtimeState.temporaryRoundEffects.length > 0) {
    runtimeState = {
      ...runtimeState,
      temporaryRoundEffects: runtimeState.temporaryRoundEffects
        .map((effect) => ({
          ...effect,
          remainingMs: effect.remainingMs - deltaMs
        }))
        .filter((effect) => effect.remainingMs > 0)
    };
  }

  const salvageDrone = context.bonuses.droneModifierBonus['salvage-drone'] ?? 0;
  if (salvageDrone > 0) {
    const attractRange = 3.8 + salvageDrone * 1.4;
    const attractPower = 12 + salvageDrone * 5;
    for (const entity of context.entityManager.values()) {
      if (entity.type !== EntityType.Pickup) {
        continue;
      }
      const dx = player.position.x - entity.position.x;
      const dy = player.position.y - entity.position.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 0 || dist > attractRange) {
        continue;
      }
      const nx = dx / dist;
      const ny = dy / dist;
      entity.velocity.x += nx * attractPower * context.deltaSeconds;
      entity.velocity.y += ny * attractPower * context.deltaSeconds;
    }
  }

  const energyBarrier = context.bonuses.defenseModifierBonus['energy-barrier'] ?? 0;
  if (energyBarrier > 0) {
    const key = 'defense:energy-barrier-next-ms';
    const cooldowns = runtimeState.perCardProcCooldownUntilMs;
    const nextAt = cooldowns.get(key) ?? 0;
    if (context.elapsedMs >= nextAt) {
      const shieldMax = Math.max(0, player.shieldMax ?? 0);
      if (shieldMax > 0) {
        const currentShield = Math.max(0, Math.min(shieldMax, player.shieldCurrent ?? 0));
        const pulseAmount = Math.max(1, Math.round(energyBarrier * 2));
        player.shieldCurrent = Math.min(shieldMax, currentShield + pulseAmount);
      }

      const cooldownMs = Math.max(1800, 4200 - energyBarrier * 320);
      const nextCooldowns = new Map(cooldowns);
      nextCooldowns.set(key, context.elapsedMs + cooldownMs);
      runtimeState = {
        ...runtimeState,
        perCardProcCooldownUntilMs: nextCooldowns
      };
    }
  }

  const experimentalLoadout = context.bonuses.economyModifierBonus['experimental-loadout'] ?? 0;
  if (experimentalLoadout > 0) {
    const cooldowns = runtimeState.perCardProcCooldownUntilMs;
    const nextAt = cooldowns.get('economy:experimental-loadout-next-ms') ?? 0;
    if (context.elapsedMs >= nextAt) {
      const nextCooldowns = new Map(cooldowns);
      nextCooldowns.set('economy:experimental-loadout-next-ms', context.elapsedMs + 5200);
      runtimeState = {
        ...runtimeState,
        perCardProcCooldownUntilMs: nextCooldowns
      };

      const chance = Math.min(0.45, 0.16 * experimentalLoadout);
      const roll = runtimeState.rng.nextFloat('economy:experimental-loadout', Math.floor(context.elapsedMs));
      if (roll <= chance) {
        runtimeState = {
          ...runtimeState,
          temporaryRoundEffects: [
            ...runtimeState.temporaryRoundEffects,
            {
              cardId: 'experimental-loadout',
              effectId: 'experimental-loadout-overdrive',
              stacks: 1,
              remainingMs: 6800
            }
          ]
        };
      }
    }
  }

  return runtimeState;
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
