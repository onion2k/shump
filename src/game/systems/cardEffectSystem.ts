import type { Entity } from '../ecs/components';
import { PLAYER_WEAPON_ORDER } from '../weapons/playerWeapons';
import type { RunPlayerState } from '../core/RunProgress';
import { cardCatalogById } from '../content/cards';

export interface CardBonuses {
  maxHealthBonus: number;
  weaponLevelBonus: Record<string, number>;
  moneyMultiplierPercent: number;
  killMoneyFlatBonus: number;
  podCountBonus: number;
  podWeaponModeOverride?: 'Auto Pulse' | 'Homing Missile';
  tagCounts: Record<string, number>;
}

export function computeCardBonuses(activeCards: string[]): CardBonuses {
  const bonuses: CardBonuses = {
    maxHealthBonus: 0,
    weaponLevelBonus: {},
    moneyMultiplierPercent: 0,
    killMoneyFlatBonus: 0,
    podCountBonus: 0,
    podWeaponModeOverride: undefined,
    tagCounts: {}
  };

  for (const cardId of activeCards) {
    const card = cardCatalogById[cardId];
    if (!card) {
      continue;
    }

    for (const tag of card.tags) {
      bonuses.tagCounts[tag] = (bonuses.tagCounts[tag] ?? 0) + 1;
    }

    for (const effect of card.effects) {
      if (effect.kind === 'maxHealth') {
        bonuses.maxHealthBonus += effect.amount;
        continue;
      }

      if (effect.kind === 'weaponLevel') {
        bonuses.weaponLevelBonus[effect.weaponMode] = (bonuses.weaponLevelBonus[effect.weaponMode] ?? 0) + effect.amount;
        continue;
      }

      if (effect.kind === 'moneyMultiplier') {
        bonuses.moneyMultiplierPercent += effect.percent;
        continue;
      }

      if (effect.kind === 'killMoneyFlat') {
        bonuses.killMoneyFlatBonus += effect.amount;
        continue;
      }

      if (effect.kind === 'podCount') {
        bonuses.podCountBonus += effect.amount;
        continue;
      }

      bonuses.podWeaponModeOverride = effect.mode;
    }
  }

  applySynergyBonuses(bonuses);
  return bonuses;
}

export function applyCardsToPlayer(player: Entity, baseState: RunPlayerState, activeCards: string[]): void {
  const bonuses = computeCardBonuses(activeCards);
  const effectiveMaxHealth = Math.max(1, baseState.maxHealth + bonuses.maxHealthBonus);
  player.maxHealth = effectiveMaxHealth;
  player.health = Math.max(0, Math.min(effectiveMaxHealth, baseState.health));

  const nextLevels = { ...baseState.weaponLevels };
  for (const weapon of PLAYER_WEAPON_ORDER) {
    const baseLevel = nextLevels[weapon] ?? 1;
    const bonus = bonuses.weaponLevelBonus[weapon] ?? 0;
    nextLevels[weapon] = Math.max(1, baseLevel + bonus);
  }
  player.weaponLevels = nextLevels;
  if (player.weaponMode) {
    player.weaponLevel = nextLevels[player.weaponMode] ?? player.weaponLevel ?? 1;
  }

  player.podCount = Math.max(0, baseState.podCount + bonuses.podCountBonus);
  player.podWeaponMode = bonuses.podWeaponModeOverride ?? baseState.podWeaponMode;
}

export function captureBaseStateFromPlayer(
  player: Entity,
  activeCards: string[],
  previousBaseState?: RunPlayerState
): RunPlayerState {
  const bonuses = computeCardBonuses(activeCards);
  const baseMaxHealth = Math.max(1, player.maxHealth - bonuses.maxHealthBonus);
  const baseHealth = Math.max(0, Math.min(baseMaxHealth, player.health));

  const effectiveLevels = player.weaponLevels ?? {};
  const baseLevels: Record<string, number> = {};
  for (const [weapon, effectiveLevel] of Object.entries(effectiveLevels)) {
    const bonus = bonuses.weaponLevelBonus[weapon] ?? 0;
    baseLevels[weapon] = Math.max(1, effectiveLevel - bonus);
  }

  const effectivePodCount = Math.max(0, player.podCount ?? 0);
  const basePodCount = Math.max(0, effectivePodCount - bonuses.podCountBonus);

  const basePodWeaponMode = bonuses.podWeaponModeOverride
    ? (previousBaseState?.podWeaponMode ?? 'Auto Pulse')
    : (player.podWeaponMode === 'Homing Missile' ? 'Homing Missile' : 'Auto Pulse');

  return {
    health: baseHealth,
    maxHealth: baseMaxHealth,
    weaponLevels: baseLevels,
    podCount: basePodCount,
    podWeaponMode: basePodWeaponMode
  };
}

function applySynergyBonuses(bonuses: CardBonuses): void {
  const defenseCount = bonuses.tagCounts.defense ?? 0;
  const assaultCount = bonuses.tagCounts.assault ?? 0;
  const precisionCount = bonuses.tagCounts.precision ?? 0;
  const economyCount = bonuses.tagCounts.economy ?? 0;

  if (defenseCount >= 2) {
    bonuses.maxHealthBonus += 2;
  }

  if (assaultCount >= 2) {
    bonuses.weaponLevelBonus['Auto Pulse'] = (bonuses.weaponLevelBonus['Auto Pulse'] ?? 0) + 1;
  }

  if (precisionCount >= 2) {
    bonuses.weaponLevelBonus['Continuous Laser'] = (bonuses.weaponLevelBonus['Continuous Laser'] ?? 0) + 1;
  }

  if (economyCount >= 2) {
    bonuses.moneyMultiplierPercent += 15;
  }
}
