import type { EntityManager } from '../ecs/EntityManager';
import { clamp } from '../util/math';
import {
  createDefaultUnlockedWeapons,
  createDefaultWeaponLevels,
  isPlayerWeaponMode,
  type PlayerWeaponMode
} from '../weapons/playerWeapons';
import { resolveConditionalBonuses } from './playerWeaponConditionals';
import {
  fireAutoPulse,
  fireContinuousLaser,
  fireHeavyCannon,
  fireSineSmg,
  spawnLaserBeam
} from './playerWeaponFireModes';
import type { FireOutcome, PlayerEntity, PlayerWeaponResult, PlayerWeaponSystemOptions } from './playerWeaponTypes';

export type { PlayerWeaponResult, PlayerWeaponSystemOptions } from './playerWeaponTypes';

export function playerWeaponSystem(
  entityManager: EntityManager,
  playerId: number,
  deltaSeconds: number,
  options: PlayerWeaponSystemOptions = {}
): PlayerWeaponResult {
  const player = entityManager.get(playerId);
  if (!player) {
    return { fired: [], scoreDelta: 0 };
  }

  const fired = [] as PlayerWeaponResult['fired'];
  let scoreDelta = 0;
  const currentEnergy = player.weaponEnergy ?? 0;
  const maxEnergy = player.weaponEnergyMax ?? 0;
  const regen = player.weaponEnergyRegenPerSecond ?? 0;

  player.weaponEnergy = clamp(currentEnergy + regen * deltaSeconds, 0, maxEnergy);
  player.fireCooldownMs = (player.fireCooldownMs ?? 0) - deltaSeconds * 1000;

  const activeWeapon = ensurePlayerWeaponState(player);
  const weaponLevel = player.weaponLevels?.[activeWeapon] ?? 1;
  player.weaponLevel = weaponLevel;
  const conditionalBonuses = resolveConditionalBonuses(player, options);

  if ((player.fireCooldownMs ?? 0) > 0) {
    return { fired, scoreDelta };
  }

  if (
    conditionalBonuses.volatileMisfireChancePercent > 0
    && typeof options.volatileMisfireRoll === 'number'
    && options.volatileMisfireRoll <= Math.min(1, conditionalBonuses.volatileMisfireChancePercent / 100)
  ) {
    player.fireCooldownMs = 85;
    return { fired, scoreDelta };
  }

  if (activeWeapon === 'Continuous Laser') {
    const laserResult = fireContinuousLaser(entityManager, player, weaponLevel, options, conditionalBonuses);
    if (!laserResult.fired) {
      return { fired, scoreDelta };
    }

    applyFireOutcome(player, laserResult);
    spawnLaserBeam(entityManager, player, laserResult.intervalMs, laserResult.range, laserResult.halfWidth);
    fired.push({ weaponMode: activeWeapon });
    scoreDelta += laserResult.scoreDelta;
    return { fired, scoreDelta };
  }

  if (activeWeapon === 'Heavy Cannon') {
    const cannonResult = fireHeavyCannon(entityManager, player, weaponLevel, options, conditionalBonuses);
    if (!cannonResult.fired) {
      return { fired, scoreDelta };
    }

    applyFireOutcome(player, cannonResult);
    fired.push(...cannonResult.firedRecords);
    return { fired, scoreDelta };
  }

  if (activeWeapon === 'Sine SMG') {
    const smgResult = fireSineSmg(entityManager, player, weaponLevel, options, conditionalBonuses);
    if (!smgResult.fired) {
      return { fired, scoreDelta };
    }

    applyFireOutcome(player, smgResult);
    fired.push(...smgResult.firedRecords);
    return { fired, scoreDelta };
  }

  const pulseResult = fireAutoPulse(entityManager, player, weaponLevel, options, conditionalBonuses);
  if (!pulseResult.fired) {
    return { fired, scoreDelta };
  }

  applyFireOutcome(player, pulseResult);
  fired.push(...pulseResult.firedRecords);
  return { fired, scoreDelta };
}

function applyFireOutcome(player: PlayerEntity, outcome: FireOutcome) {
  player.weaponEnergy = (player.weaponEnergy ?? 0) - outcome.energyCost;
  player.weaponFireIntervalMs = outcome.intervalMs;
  player.weaponEnergyCost = outcome.energyCost;
  player.fireCooldownMs = outcome.intervalMs;
}

function ensurePlayerWeaponState(player: PlayerEntity): PlayerWeaponMode {
  const levels = player.weaponLevels ?? createDefaultWeaponLevels();
  player.weaponLevels = levels;

  const unlocked = player.unlockedWeaponModes ?? createDefaultUnlockedWeapons();
  player.unlockedWeaponModes = unlocked;

  const requested = player.weaponMode;
  if (requested && isPlayerWeaponMode(requested) && unlocked.includes(requested)) {
    return requested;
  }

  const fallback = unlocked[0] ?? 'Auto Pulse';
  player.weaponMode = fallback;
  return fallback;
}
