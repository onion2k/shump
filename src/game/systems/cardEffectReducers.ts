import type { CardEffect } from '../content/cards';
import { PLAYER_STAT_TO_MODIFIER_KEY, addGameplayModifier } from '../content/gameplayModifiers';
import type { CardBonuses } from './cardEffectSystem';

type DirectCardEffect = Exclude<CardEffect, { kind: 'modifier' } | { kind: 'temporaryRoundModifier' }>;

type EffectKind = DirectCardEffect['kind'];
type EffectReducer<K extends EffectKind> = (bonuses: CardBonuses, effect: Extract<DirectCardEffect, { kind: K }>) => void;

type ReducerMap = {
  [K in EffectKind]: EffectReducer<K>;
};

const CARD_EFFECT_REDUCERS: ReducerMap = {
  maxHealth: (bonuses, effect) => {
    bonuses.maxHealthBonus += effect.amount;
    addGameplayModifier(bonuses.gameplayModifiers, 'player.maxHealth', effect.amount);
  },
  weaponLevel: (bonuses, effect) => {
    bonuses.weaponLevelBonus[effect.weaponMode] = (bonuses.weaponLevelBonus[effect.weaponMode] ?? 0) + effect.amount;
  },
  moneyMultiplier: (bonuses, effect) => {
    bonuses.moneyMultiplierPercent += effect.percent;
    addGameplayModifier(bonuses.gameplayModifiers, 'economy.moneyMultiplierPercent', effect.percent);
  },
  killMoneyFlat: (bonuses, effect) => {
    bonuses.killMoneyFlatBonus += effect.amount;
    addGameplayModifier(bonuses.gameplayModifiers, 'economy.killMoneyFlat', effect.amount);
  },
  podCount: (bonuses, effect) => {
    bonuses.podCountBonus += effect.amount;
    addGameplayModifier(bonuses.gameplayModifiers, 'player.podCount', effect.amount);
  },
  playerStat: (bonuses, effect) => {
    bonuses.playerStatBonus[effect.stat] = (bonuses.playerStatBonus[effect.stat] ?? 0) + effect.amount;
    addGameplayModifier(bonuses.gameplayModifiers, PLAYER_STAT_TO_MODIFIER_KEY[effect.stat], effect.amount);
  },
  podWeaponMode: (bonuses, effect) => {
    bonuses.podWeaponModeOverride = effect.mode;
  },
  weaponTuning: (bonuses, effect) => {
    const modeBonuses = bonuses.weaponTuningBonuses[effect.weaponMode] ?? {};
    modeBonuses[effect.stat] = (modeBonuses[effect.stat] ?? 0) + effect.amount;
    bonuses.weaponTuningBonuses[effect.weaponMode] = modeBonuses;
  },
  weaponAmplifier: (bonuses, effect) => {
    bonuses.weaponAmplifierBonus[effect.effectId] = (bonuses.weaponAmplifierBonus[effect.effectId] ?? 0) + effect.amount;
  },
  projectileModifier: (bonuses, effect) => {
    bonuses.projectileModifierBonus[effect.effectId] = (bonuses.projectileModifierBonus[effect.effectId] ?? 0) + effect.amount;
  },
  missileModifier: (bonuses, effect) => {
    bonuses.missileModifierBonus[effect.effectId] = (bonuses.missileModifierBonus[effect.effectId] ?? 0) + effect.amount;
  },
  patternModifier: (bonuses, effect) => {
    bonuses.patternModifierBonus[effect.effectId] = (bonuses.patternModifierBonus[effect.effectId] ?? 0) + effect.amount;
  },
  defenseModifier: (bonuses, effect) => {
    bonuses.defenseModifierBonus[effect.effectId] = (bonuses.defenseModifierBonus[effect.effectId] ?? 0) + effect.amount;
  },
  mobilityModifier: (bonuses, effect) => {
    bonuses.mobilityModifierBonus[effect.effectId] = (bonuses.mobilityModifierBonus[effect.effectId] ?? 0) + effect.amount;
  },
  droneModifier: (bonuses, effect) => {
    bonuses.droneModifierBonus[effect.effectId] = (bonuses.droneModifierBonus[effect.effectId] ?? 0) + effect.amount;
  },
  economyModifier: (bonuses, effect) => {
    bonuses.economyModifierBonus[effect.effectId] = (bonuses.economyModifierBonus[effect.effectId] ?? 0) + effect.amount;
  },
  conditionalModifier: (bonuses, effect) => {
    bonuses.conditionalModifierBonus[effect.effectId] = (bonuses.conditionalModifierBonus[effect.effectId] ?? 0) + effect.amount;
  },
  triggerModifier: (bonuses, effect) => {
    bonuses.triggerModifierBonus[effect.effectId] = (bonuses.triggerModifierBonus[effect.effectId] ?? 0) + effect.amount;
  }
};

export function applyDirectCardEffect(bonuses: CardBonuses, effect: CardEffect): boolean {
  if (effect.kind === 'modifier' || effect.kind === 'temporaryRoundModifier') {
    return false;
  }

  const reducer = CARD_EFFECT_REDUCERS[effect.kind] as (bonuses: CardBonuses, effect: DirectCardEffect) => void;
  reducer(bonuses, effect);
  return true;
}
