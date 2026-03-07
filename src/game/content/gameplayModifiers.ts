export const PLAYER_STAT_TO_MODIFIER_KEY = {
  moveMaxSpeed: 'player.moveMaxSpeed',
  moveFollowGain: 'player.moveFollowGain',
  pickupAttractRange: 'player.pickupAttractRange',
  pickupAttractPower: 'player.pickupAttractPower',
  shieldMax: 'player.shieldMax',
  shieldRechargeDelayMs: 'player.shieldRechargeDelayMs',
  shieldRechargeTimeMs: 'player.shieldRechargeTimeMs'
} as const;

export type PlayerStatCardStat = keyof typeof PLAYER_STAT_TO_MODIFIER_KEY;

export const GAMEPLAY_MODIFIER_KEYS = [
  'player.maxHealth',
  'player.podCount',
  'player.moveMaxSpeed',
  'player.moveFollowGain',
  'player.pickupAttractRange',
  'player.pickupAttractPower',
  'player.shieldMax',
  'player.shieldRechargeDelayMs',
  'player.shieldRechargeTimeMs',
  'economy.moneyMultiplierPercent',
  'economy.killMoneyFlat',
  'director.enemyCountPercent',
  'director.enemyArchetypeUnlocks',
  'director.patternUnlocks',
  'spawn.enemyDensityPercent',
  'enemy.healthPercent',
  'enemy.speedPercent',
  'enemy.fireRatePercent',
  'enemy.scorePercent'
] as const;

export type GameplayModifierKey = (typeof GAMEPLAY_MODIFIER_KEYS)[number];

export type GameplayModifierMap = Partial<Record<GameplayModifierKey, number>>;

export function addGameplayModifier(modifiers: GameplayModifierMap, key: GameplayModifierKey, amount: number): void {
  modifiers[key] = (modifiers[key] ?? 0) + amount;
}

export function getGameplayModifier(modifiers: GameplayModifierMap, key: GameplayModifierKey): number {
  return modifiers[key] ?? 0;
}
