import type { Entity } from '../ecs/components';
import { PLAYER_WEAPON_ORDER } from '../weapons/playerWeapons';
import type { RunPlayerState } from '../core/RunProgress';
import { cardCatalogById, type PlayerStatCardStat } from '../content/cards';
import { gameSettings } from '../config/gameSettings';

const DEFAULT_PLAYER_STAT_VALUES: Record<PlayerStatCardStat, number> = {
  moveMaxSpeed: Math.max(1, gameSettings.player.maxSpeed),
  moveFollowGain: Math.max(0, gameSettings.player.followGain),
  pickupAttractRange: Math.max(0, gameSettings.player.pickupAttraction.range),
  pickupAttractPower: Math.max(0, gameSettings.player.pickupAttraction.power),
  shieldMax: Math.max(0, gameSettings.player.shield.max),
  shieldRechargeDelayMs: Math.max(0, gameSettings.player.shield.rechargeDelayMs),
  shieldRechargeTimeMs: Math.max(1, gameSettings.player.shield.rechargeTimeMs)
};

function clampPlayerStat(stat: PlayerStatCardStat, value: number): number {
  if (stat === 'moveMaxSpeed') {
    return Math.max(1, value);
  }

  if (stat === 'moveFollowGain' || stat === 'pickupAttractRange' || stat === 'pickupAttractPower' || stat === 'shieldMax' || stat === 'shieldRechargeDelayMs') {
    return Math.max(0, value);
  }

  return Math.max(1, value);
}

function playerStatWithBonus(baseValue: number, bonuses: CardBonuses, stat: PlayerStatCardStat): number {
  return clampPlayerStat(stat, baseValue + (bonuses.playerStatBonus[stat] ?? 0));
}

export interface CardBonuses {
  maxHealthBonus: number;
  weaponLevelBonus: Record<string, number>;
  moneyMultiplierPercent: number;
  killMoneyFlatBonus: number;
  podCountBonus: number;
  podWeaponModeOverride?: 'Auto Pulse' | 'Homing Missile';
  playerStatBonus: Partial<Record<PlayerStatCardStat, number>>;
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
    playerStatBonus: {},
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

      if (effect.kind === 'playerStat') {
        bonuses.playerStatBonus[effect.stat] = (bonuses.playerStatBonus[effect.stat] ?? 0) + effect.amount;
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
  player.moveMaxSpeed = playerStatWithBonus(baseState.moveMaxSpeed, bonuses, 'moveMaxSpeed');
  player.moveFollowGain = playerStatWithBonus(baseState.moveFollowGain, bonuses, 'moveFollowGain');
  player.pickupAttractRange = playerStatWithBonus(baseState.pickupAttractRange, bonuses, 'pickupAttractRange');
  player.pickupAttractPower = playerStatWithBonus(baseState.pickupAttractPower, bonuses, 'pickupAttractPower');
  player.shieldMax = playerStatWithBonus(baseState.shieldMax, bonuses, 'shieldMax');
  player.shieldCurrent = Math.max(0, Math.min(player.shieldMax, baseState.shieldCurrent));
  player.shieldRechargeDelayMs = playerStatWithBonus(baseState.shieldRechargeDelayMs, bonuses, 'shieldRechargeDelayMs');
  player.shieldRechargeTimeMs = playerStatWithBonus(baseState.shieldRechargeTimeMs, bonuses, 'shieldRechargeTimeMs');
  player.shieldRechargeDelayRemainingMs = Math.max(
    0,
    Math.min(player.shieldRechargeDelayMs, baseState.shieldRechargeDelayRemainingMs)
  );
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

  const effectiveMoveMaxSpeed = Math.max(1, player.moveMaxSpeed ?? DEFAULT_PLAYER_STAT_VALUES.moveMaxSpeed);
  const effectiveMoveFollowGain = Math.max(0, player.moveFollowGain ?? DEFAULT_PLAYER_STAT_VALUES.moveFollowGain);
  const effectivePickupAttractRange = Math.max(0, player.pickupAttractRange ?? DEFAULT_PLAYER_STAT_VALUES.pickupAttractRange);
  const effectivePickupAttractPower = Math.max(0, player.pickupAttractPower ?? DEFAULT_PLAYER_STAT_VALUES.pickupAttractPower);
  const effectiveShieldMax = Math.max(0, player.shieldMax ?? DEFAULT_PLAYER_STAT_VALUES.shieldMax);
  const effectiveShieldCurrent = Math.max(0, Math.min(effectiveShieldMax, player.shieldCurrent ?? effectiveShieldMax));
  const effectiveShieldRechargeDelayMs = Math.max(
    0,
    player.shieldRechargeDelayMs ?? DEFAULT_PLAYER_STAT_VALUES.shieldRechargeDelayMs
  );
  const effectiveShieldRechargeTimeMs = Math.max(
    1,
    player.shieldRechargeTimeMs ?? DEFAULT_PLAYER_STAT_VALUES.shieldRechargeTimeMs
  );
  const effectiveShieldRechargeDelayRemainingMs = Math.max(
    0,
    Math.min(effectiveShieldRechargeDelayMs, player.shieldRechargeDelayRemainingMs ?? 0)
  );

  return {
    health: baseHealth,
    maxHealth: baseMaxHealth,
    weaponLevels: baseLevels,
    podCount: basePodCount,
    podWeaponMode: basePodWeaponMode,
    moveMaxSpeed: clampPlayerStat('moveMaxSpeed', effectiveMoveMaxSpeed - (bonuses.playerStatBonus.moveMaxSpeed ?? 0)),
    moveFollowGain: clampPlayerStat(
      'moveFollowGain',
      effectiveMoveFollowGain - (bonuses.playerStatBonus.moveFollowGain ?? 0)
    ),
    pickupAttractRange: clampPlayerStat(
      'pickupAttractRange',
      effectivePickupAttractRange - (bonuses.playerStatBonus.pickupAttractRange ?? 0)
    ),
    pickupAttractPower: clampPlayerStat(
      'pickupAttractPower',
      effectivePickupAttractPower - (bonuses.playerStatBonus.pickupAttractPower ?? 0)
    ),
    shieldCurrent: Math.max(
      0,
      Math.min(
        clampPlayerStat('shieldMax', effectiveShieldMax - (bonuses.playerStatBonus.shieldMax ?? 0)),
        effectiveShieldCurrent
      )
    ),
    shieldMax: clampPlayerStat('shieldMax', effectiveShieldMax - (bonuses.playerStatBonus.shieldMax ?? 0)),
    shieldRechargeDelayMs: clampPlayerStat(
      'shieldRechargeDelayMs',
      effectiveShieldRechargeDelayMs - (bonuses.playerStatBonus.shieldRechargeDelayMs ?? 0)
    ),
    shieldRechargeTimeMs: clampPlayerStat(
      'shieldRechargeTimeMs',
      effectiveShieldRechargeTimeMs - (bonuses.playerStatBonus.shieldRechargeTimeMs ?? 0)
    ),
    shieldRechargeDelayRemainingMs: effectiveShieldRechargeDelayRemainingMs
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
