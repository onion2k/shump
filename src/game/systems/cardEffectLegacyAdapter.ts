import type { GameplayModifierKey } from '../content/gameplayModifiers';
import { PLAYER_STAT_TO_MODIFIER_KEY } from '../content/gameplayModifiers';
import type { PlayerStatCardStat } from '../content/cards';

const MODIFIER_KEY_TO_PLAYER_STAT: Partial<Record<GameplayModifierKey, PlayerStatCardStat>> = Object.fromEntries(
  Object.entries(PLAYER_STAT_TO_MODIFIER_KEY).map(([stat, key]) => [key, stat as PlayerStatCardStat])
) as Partial<Record<GameplayModifierKey, PlayerStatCardStat>>;

export interface LegacyCardBonusFields {
  maxHealthBonus: number;
  moneyMultiplierPercent: number;
  killMoneyFlatBonus: number;
  podCountBonus: number;
  playerStatBonus: Partial<Record<PlayerStatCardStat, number>>;
}

export function applyModifierToLegacyFields(
  bonuses: LegacyCardBonusFields,
  key: GameplayModifierKey,
  amount: number
): void {
  if (key === 'player.maxHealth') {
    bonuses.maxHealthBonus += amount;
    return;
  }

  if (key === 'economy.moneyMultiplierPercent') {
    bonuses.moneyMultiplierPercent += amount;
    return;
  }

  if (key === 'economy.killMoneyFlat') {
    bonuses.killMoneyFlatBonus += amount;
    return;
  }

  if (key === 'player.podCount') {
    bonuses.podCountBonus += amount;
    return;
  }

  const playerStat = MODIFIER_KEY_TO_PLAYER_STAT[key];
  if (playerStat) {
    bonuses.playerStatBonus[playerStat] = (bonuses.playerStatBonus[playerStat] ?? 0) + amount;
  }
}
