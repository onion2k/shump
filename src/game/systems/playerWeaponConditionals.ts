import { clamp } from '../util/math';
import { resolveBonus } from './playerWeaponHelpers';
import type { ConditionalDerivedBonuses, PlayerEntity, PlayerWeaponSystemOptions } from './playerWeaponTypes';

export function resolveConditionalBonuses(player: PlayerEntity, options: PlayerWeaponSystemOptions): ConditionalDerivedBonuses {
  const conditional = options.conditionalModifierBonus;
  let damagePercent = 0;
  let fireRatePercent = 0;
  let precisionPercent = 0;
  let volatileMisfireChancePercent = 0;

  const glassReactor = resolveBonus(conditional, 'glass-reactor-damage');
  damagePercent += glassReactor;

  const lastStand = resolveBonus(conditional, 'last-stand-protocol');
  if (lastStand > 0) {
    const maxHealth = Math.max(1, player.maxHealth);
    const missingHealthRatio = clamp(1 - player.health / maxHealth, 0, 1);
    damagePercent += lastStand * missingHealthRatio;
  }

  const momentumDrive = resolveBonus(conditional, 'momentum-drive');
  if (momentumDrive > 0) {
    const movingMs = Math.max(0, options.movingMs ?? 0);
    const momentumScale = Math.min(1.5, movingMs / 2000);
    fireRatePercent += momentumDrive * momentumScale;
  }

  const riskProtocol = resolveBonus(conditional, 'risk-protocol');
  if (riskProtocol > 0 && (player.shieldCurrent ?? 0) <= 0) {
    damagePercent += riskProtocol;
  }

  const overheatReactor = resolveBonus(conditional, 'overheat-reactor');
  if (overheatReactor > 0) {
    const shootingMs = Math.max(0, options.consecutiveShootingMs ?? 0);
    const heatScale = Math.min(1.6, shootingMs / 1800);
    damagePercent += overheatReactor * heatScale;
  }

  const chainMomentum = resolveBonus(conditional, 'chain-momentum');
  if (chainMomentum > 0) {
    const streak = Math.max(0, options.chainKillStreak ?? 0);
    const streakScale = Math.min(1.8, streak / 3);
    damagePercent += chainMomentum * streakScale;
    fireRatePercent += chainMomentum * 0.65 * streakScale;
  }

  const stationaryTargeting = resolveBonus(conditional, 'stationary-targeting');
  if (stationaryTargeting > 0 && (options.stillMs ?? 0) >= 450) {
    damagePercent += stationaryTargeting;
    precisionPercent += stationaryTargeting * 0.9;
  }

  const volatileDamage = resolveBonus(conditional, 'volatile-ammunition-damage');
  if (volatileDamage > 0) {
    damagePercent += volatileDamage;
  }
  volatileMisfireChancePercent = Math.max(0, resolveBonus(conditional, 'volatile-ammunition-misfire'));

  for (const effect of options.temporaryRoundEffects ?? []) {
    if (effect.remainingMs <= 0) {
      continue;
    }
    if (effect.effectId === 'experimental-loadout-overdrive') {
      const stacks = Math.max(1, effect.stacks);
      damagePercent += 18 * stacks;
      fireRatePercent += 12 * stacks;
      precisionPercent += 8 * stacks;
    } else if (effect.effectId === 'perfect-timing-bonus') {
      const stacks = Math.max(1, effect.stacks);
      damagePercent += 9 * stacks;
      fireRatePercent += 6 * stacks;
    }
  }

  return {
    damagePercent,
    fireRatePercent,
    precisionPercent,
    volatileMisfireChancePercent
  };
}
