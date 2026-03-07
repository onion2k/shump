import type { EntityManager } from '../ecs/EntityManager';
import { EntityType, Faction } from '../ecs/entityTypes';
import { BULLET_SPEED, PLAYER_MACHINE_GUN_INTERVAL_MS } from '../core/constants';
import { clamp } from '../util/math';
import { createBullet } from '../factories/createBullet';
import { createLaserBeam } from '../factories/createLaserBeam';
import {
  createDefaultUnlockedWeapons,
  createDefaultWeaponLevels,
  isPlayerWeaponMode,
  type PlayerWeaponMode
} from '../weapons/playerWeapons';
import type { WeaponTuningStat } from '../content/cards';
import type { WeaponTuningBonuses } from './cardEffectSystem';
import type { TemporaryRoundEffectState } from '../core/cardRuntimeState';

interface WeaponFireRecord {
  weaponMode: string;
  projectileEntityId?: number;
}

export interface PlayerWeaponResult {
  fired: WeaponFireRecord[];
  scoreDelta: number;
}

interface FireOutcome {
  fired: boolean;
  energyCost: number;
  intervalMs: number;
}

export interface PlayerWeaponSystemOptions {
  weaponTuningBonuses?: WeaponTuningBonuses;
  weaponAmplifierBonus?: Record<string, number>;
  projectileModifierBonus?: Record<string, number>;
  patternModifierBonus?: Record<string, number>;
  triggerModifierBonus?: Record<string, number>;
  conditionalModifierBonus?: Record<string, number>;
  temporaryRoundEffects?: TemporaryRoundEffectState[];
  movingMs?: number;
  stillMs?: number;
  consecutiveShootingMs?: number;
  chainKillStreak?: number;
  shotCounter?: number;
  rapidVentingUntilMs?: number;
  elapsedMs?: number;
  volatileMisfireRoll?: number;
  hitStreak?: number;
}

interface ConditionalDerivedBonuses {
  damagePercent: number;
  fireRatePercent: number;
  precisionPercent: number;
  volatileMisfireChancePercent: number;
}

const AUTO_PULSE_BASE_INTERVAL_MS = PLAYER_MACHINE_GUN_INTERVAL_MS;
const AUTO_PULSE_BASE_COST = 4;

const LASER_BASE_INTERVAL_MS = 55;
const LASER_BASE_COST = 3;
const LASER_BASE_RANGE = 32;
const LASER_BASE_HALF_WIDTH = 0.7;

const CANNON_BASE_INTERVAL_MS = 360;
const CANNON_BASE_COST = 14;

const SINE_SMG_BASE_INTERVAL_MS = 58;
const SINE_SMG_BASE_COST = 2;

const MIN_SCALE = 0.15;

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

  const fired: WeaponFireRecord[] = [];
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
    entityManager.create(
      createLaserBeam(
        player.position.x,
        player.position.y + 0.95,
        laserResult.range,
        laserResult.halfWidth,
        Math.max(90, laserResult.intervalMs * 0.65)
      )
    );
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

function applyFireOutcome(player: NonNullable<ReturnType<EntityManager['get']>>, outcome: FireOutcome) {
  player.weaponEnergy = (player.weaponEnergy ?? 0) - outcome.energyCost;
  player.weaponFireIntervalMs = outcome.intervalMs;
  player.weaponEnergyCost = outcome.energyCost;
  player.fireCooldownMs = outcome.intervalMs;
}

function ensurePlayerWeaponState(player: NonNullable<ReturnType<EntityManager['get']>>): PlayerWeaponMode {
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

function fireAutoPulse(
  entityManager: EntityManager,
  player: NonNullable<ReturnType<EntityManager['get']>>,
  level: number,
  options: PlayerWeaponSystemOptions,
  conditionalBonuses: ConditionalDerivedBonuses
): { fired: boolean; energyCost: number; intervalMs: number; firedRecords: WeaponFireRecord[] } {
  const tuningBonuses = options.weaponTuningBonuses;
  const extraStreams = Math.max(0, Math.round(resolveBonus(options.weaponAmplifierBonus, 'twin-mounts')));
  const helixPattern = resolveBonus(options.patternModifierBonus, 'helix-pattern');
  const triangularSpread = resolveBonus(options.patternModifierBonus, 'triangular-spread');
  const arcFan = resolveBonus(options.patternModifierBonus, 'arc-fan');
  const dualCalibration = resolveBonus(options.weaponAmplifierBonus, 'dual-calibration');
  const burstChamber = Math.max(0, Math.round(resolveBonus(options.triggerModifierBonus, 'burst-chamber')));
  const momentumTrigger = resolveBonus(options.triggerModifierBonus, 'momentum-trigger');
  const overdriveCycle = resolveBonus(options.triggerModifierBonus, 'overdrive-cycle');
  const rapidVentingActive = (options.rapidVentingUntilMs ?? 0) > (options.elapsedMs ?? 0);
  const pulseAmplifier = Math.max(0, Math.round(resolveBonus(options.weaponAmplifierBonus, 'pulse-amplifier')));
  const alternatingBarrels = resolveBonus(options.triggerModifierBonus, 'alternating-barrels');
  const baseShotCounter = Math.max(0, options.shotCounter ?? 0);
  let streamOffsets =
    level <= 1
      ? [0]
      : level === 2
        ? [-0.24, 0.24]
        : [-0.34, 0, 0.34];
  if (triangularSpread > 0) {
    streamOffsets = [-0.4, 0, 0.4];
  }
  if (dualCalibration > 0 && baseShotCounter % 2 === 1) {
    streamOffsets = streamOffsets.map((offset) => offset * -1);
  }
  if (extraStreams > 0) {
    streamOffsets = [...streamOffsets, -0.56, 0.56];
  }
  const baseIntervalMs = Math.max(56, AUTO_PULSE_BASE_INTERVAL_MS - (Math.min(level, 8) - 1) * 5);
  const coolingBonus = resolveBonus(options.weaponAmplifierBonus, 'accelerated-cooling');
  const momentumTriggerBonus = momentumTrigger > 0 ? Math.min(24, (options.consecutiveShootingMs ?? 0) / 1000 * momentumTrigger) : 0;
  const overdriveCycleBonus = overdriveCycle > 0 && (((options.elapsedMs ?? 0) % 7000) < 2400) ? overdriveCycle * 10 : 0;
  const rapidVentingBonus = rapidVentingActive ? 18 : 0;
  const intervalMs = Math.max(
    20,
    applyFireRate(
      baseIntervalMs,
      resolveWeaponPercent(tuningBonuses, 'Auto Pulse', 'fireRatePercent')
        + coolingBonus
        + conditionalBonuses.fireRatePercent
        + momentumTriggerBonus
        + overdriveCycleBonus
        + rapidVentingBonus
    )
  );
  const baseEnergyCost = AUTO_PULSE_BASE_COST + Math.max(0, streamOffsets.length - 1);
  const energyCost = Math.max(
    1,
    Math.round(applyPercent(baseEnergyCost, resolveWeaponPercent(tuningBonuses, 'Auto Pulse', 'energyCostPercent')))
  );
  const baseDamage = level >= 5 ? 2 : 1;
  const kineticScale = resolveKineticEscalationScale(options);
  const damage = Math.max(
    1,
    Math.round(
      applyPercent(
        baseDamage,
        resolveWeaponPercent(tuningBonuses, 'Auto Pulse', 'damagePercent') + conditionalBonuses.damagePercent
      ) * kineticScale
    )
  );
  const baseSpeed = BULLET_SPEED + Math.min(4, level - 1) * 0.7;
  const highVelocitySpeed = resolveBonus(options.projectileModifierBonus, 'high-velocity-rounds-speed');
  const speed = applyPercent(
    baseSpeed,
    resolveWeaponPercent(tuningBonuses, 'Auto Pulse', 'projectileSpeedPercent') + highVelocitySpeed
  );

  if ((player.weaponEnergy ?? 0) < energyCost) {
    return { fired: false, energyCost, intervalMs, firedRecords: [] };
  }

  const firedRecords: WeaponFireRecord[] = [];
  const burstCount = burstChamber > 0 ? 3 : 1;
  let shotIndex = baseShotCounter;
  for (let burst = 0; burst < burstCount; burst += 1) {
    for (const offset of streamOffsets) {
      shotIndex += 1;
      const isPulseAmpShot = pulseAmplifier > 0 && shotIndex % 3 === 0;
      const alternatingBoost = alternatingBarrels > 0 && shotIndex % 2 === 0 ? alternatingBarrels : 0;
      const shotDamage = Math.max(1, Math.round(damage * (isPulseAmpShot ? 1.6 : 1) * (1 + alternatingBoost / 100)));
      const fanVx = arcFan > 0 ? offset * BULLET_SPEED * 0.35 * arcFan : 0;
      const helixVx = helixPattern > 0
        ? Math.sin((player.weaponOscillator ?? 0) + offset * 7.5 + burst * 0.4) * BULLET_SPEED * 0.08 * helixPattern
        : 0;
      const bullet = entityManager.create(
        createBullet(
          player.position.x + offset,
          player.position.y + 0.7 + burst * 0.08,
          speed,
          Faction.Player,
          2000,
          shotDamage,
          isPulseAmpShot ? 0.25 : 0.22,
          helixVx + fanVx,
          buildProjectileMetadata(options, false)
        )
      );
      firedRecords.push({ weaponMode: 'Auto Pulse', projectileEntityId: bullet.id });
    }
  }

  player.weaponOscillator = ((player.weaponOscillator ?? 0) + 0.18 + helixPattern * 0.09) % (Math.PI * 2);
  return { fired: true, energyCost, intervalMs, firedRecords };
}

function fireContinuousLaser(
  entityManager: EntityManager,
  player: NonNullable<ReturnType<EntityManager['get']>>,
  level: number,
  options: PlayerWeaponSystemOptions,
  conditionalBonuses: ConditionalDerivedBonuses
): { fired: boolean; scoreDelta: number; energyCost: number; intervalMs: number; range: number; halfWidth: number } {
  const tuningBonuses = options.weaponTuningBonuses;
  const baseIntervalMs = Math.max(34, LASER_BASE_INTERVAL_MS - (Math.min(level, 8) - 1) * 2);
  const coolingBonus = resolveBonus(options.weaponAmplifierBonus, 'accelerated-cooling');
  const momentumTrigger = resolveBonus(options.triggerModifierBonus, 'momentum-trigger');
  const momentumTriggerBonus = momentumTrigger > 0 ? Math.min(24, (options.consecutiveShootingMs ?? 0) / 1000 * momentumTrigger) : 0;
  const overdriveCycle = resolveBonus(options.triggerModifierBonus, 'overdrive-cycle');
  const overdriveCycleBonus = overdriveCycle > 0 && (((options.elapsedMs ?? 0) % 7000) < 2400) ? overdriveCycle * 10 : 0;
  const rapidVentingBonus = (options.rapidVentingUntilMs ?? 0) > (options.elapsedMs ?? 0) ? 18 : 0;
  const intervalMs = Math.max(
    16,
    applyFireRate(
      baseIntervalMs,
      resolveWeaponPercent(tuningBonuses, 'Continuous Laser', 'fireRatePercent')
        + coolingBonus
        + conditionalBonuses.fireRatePercent
        + momentumTriggerBonus
        + overdriveCycleBonus
        + rapidVentingBonus
    )
  );
  const baseEnergyCost = LASER_BASE_COST + Math.floor((level - 1) / 2);
  const energyCost = Math.max(
    1,
    Math.round(applyPercent(baseEnergyCost, resolveWeaponPercent(tuningBonuses, 'Continuous Laser', 'energyCostPercent')))
  );
  const baseDamage = 1 + Math.floor((level - 1) / 2);
  const overchargeDamage = resolveBonus(options.weaponAmplifierBonus, 'overcharged-capacitors-damage');
  const kineticScale = resolveKineticEscalationScale(options);
  const damage = Math.max(
    1,
    Math.round(
      applyPercent(
        baseDamage,
        resolveWeaponPercent(tuningBonuses, 'Continuous Laser', 'damagePercent') + overchargeDamage + conditionalBonuses.damagePercent
      ) * kineticScale
    )
  );
  const range = applyPercent(
    LASER_BASE_RANGE + Math.min(level, 8) * 2,
    resolveWeaponPercent(tuningBonuses, 'Continuous Laser', 'projectileSpeedPercent')
  );
  const overchargeWidth = resolveBonus(options.weaponAmplifierBonus, 'overcharged-capacitors-width');
  const oscillatingLaser = resolveBonus(options.weaponAmplifierBonus, 'oscillating-laser');
  const halfWidth = (LASER_BASE_HALF_WIDTH + Math.min(level, 8) * 0.08) * Math.max(0.5, 1 + overchargeWidth / 100);
  const targetCount = 1 + Math.floor((level - 1) / 3);

  if ((player.weaponEnergy ?? 0) < energyCost) {
    return { fired: false, scoreDelta: 0, energyCost, intervalMs, range, halfWidth };
  }

  const sweepOffset = oscillatingLaser > 0
    ? Math.sin((player.weaponOscillator ?? 0) * (1 + oscillatingLaser * 0.25)) * 0.9 * oscillatingLaser
    : 0;
  const targets = pickLaserTargets(entityManager, player.position.x + sweepOffset, player.position.y, range, halfWidth, targetCount);
  let scoreDelta = 0;
  for (const target of targets) {
    target.health -= damage;
    if (target.health <= 0) {
      scoreDelta += target.scoreValue ?? 0;
    }
  }

  return { fired: true, scoreDelta, energyCost, intervalMs, range, halfWidth };
}

function fireHeavyCannon(
  entityManager: EntityManager,
  player: NonNullable<ReturnType<EntityManager['get']>>,
  level: number,
  options: PlayerWeaponSystemOptions,
  conditionalBonuses: ConditionalDerivedBonuses
): { fired: boolean; energyCost: number; intervalMs: number; firedRecords: WeaponFireRecord[] } {
  const tuningBonuses = options.weaponTuningBonuses;
  const compressionCannon = resolveBonus(options.weaponAmplifierBonus, 'compression-cannon');
  const baseIntervalMs = Math.max(180, CANNON_BASE_INTERVAL_MS - (Math.min(level, 8) - 1) * 24 + compressionCannon * 70);
  const coolingBonus = resolveBonus(options.weaponAmplifierBonus, 'accelerated-cooling');
  const momentumTrigger = resolveBonus(options.triggerModifierBonus, 'momentum-trigger');
  const momentumTriggerBonus = momentumTrigger > 0 ? Math.min(24, (options.consecutiveShootingMs ?? 0) / 1000 * momentumTrigger) : 0;
  const overdriveCycle = resolveBonus(options.triggerModifierBonus, 'overdrive-cycle');
  const overdriveCycleBonus = overdriveCycle > 0 && (((options.elapsedMs ?? 0) % 7000) < 2400) ? overdriveCycle * 10 : 0;
  const rapidVentingBonus = (options.rapidVentingUntilMs ?? 0) > (options.elapsedMs ?? 0) ? 18 : 0;
  const intervalMs = Math.max(
    70,
    applyFireRate(
      baseIntervalMs,
      resolveWeaponPercent(tuningBonuses, 'Heavy Cannon', 'fireRatePercent')
        + coolingBonus
        + conditionalBonuses.fireRatePercent
        + momentumTriggerBonus
        + overdriveCycleBonus
        + rapidVentingBonus
    )
  );
  const baseEnergyCost = CANNON_BASE_COST + Math.floor((level - 1) / 3);
  const energyCost = Math.max(
    1,
    Math.round(applyPercent(baseEnergyCost, resolveWeaponPercent(tuningBonuses, 'Heavy Cannon', 'energyCostPercent')))
  );
  const baseDamage = 6 + (level - 1) * 2;
  const kineticScale = resolveKineticEscalationScale(options);
  const damage = Math.max(
    1,
    Math.round(
      applyPercent(
        baseDamage,
        resolveWeaponPercent(tuningBonuses, 'Heavy Cannon', 'damagePercent') + conditionalBonuses.damagePercent
      ) * kineticScale * (compressionCannon > 0 ? 1 + compressionCannon * 0.45 : 1)
    )
  );
  const baseSpeed = 13 + Math.min(level, 8) * 0.8;
  const highVelocitySpeed = resolveBonus(options.projectileModifierBonus, 'high-velocity-rounds-speed');
  const speed = applyPercent(
    baseSpeed,
    resolveWeaponPercent(tuningBonuses, 'Heavy Cannon', 'projectileSpeedPercent') + highVelocitySpeed
  ) * (compressionCannon > 0 ? Math.max(0.25, 1 - compressionCannon * 0.4) : 1);
  const driftReduction = Math.min(
    0.8,
    Math.max(0, (resolveBonus(options.weaponAmplifierBonus, 'gyrostabilised-cannons') + conditionalBonuses.precisionPercent) / 100)
  );
  const twinMounts = Math.max(0, Math.round(resolveBonus(options.weaponAmplifierBonus, 'twin-mounts')));
  const offsets = level >= 3 || twinMounts > 0 ? [-0.22, 0.22] : [0];

  if ((player.weaponEnergy ?? 0) < energyCost) {
    return { fired: false, energyCost, intervalMs, firedRecords: [] };
  }

  const firedRecords: WeaponFireRecord[] = [];
  for (const offset of offsets) {
    const vx = offset * 1.8 * (1 - driftReduction);
    const bullet = entityManager.create(
      createBullet(
        player.position.x + offset,
        player.position.y + 0.75,
        speed,
        Faction.Player,
        2600,
        damage,
        0.3,
        vx,
        buildProjectileMetadata(options, true)
      )
    );
    firedRecords.push({ weaponMode: 'Heavy Cannon', projectileEntityId: bullet.id });
  }

  return { fired: true, energyCost, intervalMs, firedRecords };
}

function fireSineSmg(
  entityManager: EntityManager,
  player: NonNullable<ReturnType<EntityManager['get']>>,
  level: number,
  options: PlayerWeaponSystemOptions,
  conditionalBonuses: ConditionalDerivedBonuses
): { fired: boolean; energyCost: number; intervalMs: number; firedRecords: WeaponFireRecord[] } {
  const tuningBonuses = options.weaponTuningBonuses;
  const baseIntervalMs = Math.max(28, SINE_SMG_BASE_INTERVAL_MS - (Math.min(level, 10) - 1) * 3);
  const coolingBonus = resolveBonus(options.weaponAmplifierBonus, 'accelerated-cooling');
  const momentumTrigger = resolveBonus(options.triggerModifierBonus, 'momentum-trigger');
  const momentumTriggerBonus = momentumTrigger > 0 ? Math.min(24, (options.consecutiveShootingMs ?? 0) / 1000 * momentumTrigger) : 0;
  const overdriveCycle = resolveBonus(options.triggerModifierBonus, 'overdrive-cycle');
  const overdriveCycleBonus = overdriveCycle > 0 && (((options.elapsedMs ?? 0) % 7000) < 2400) ? overdriveCycle * 10 : 0;
  const rapidVentingBonus = (options.rapidVentingUntilMs ?? 0) > (options.elapsedMs ?? 0) ? 18 : 0;
  const intervalMs = Math.max(
    14,
    applyFireRate(
      baseIntervalMs,
      resolveWeaponPercent(tuningBonuses, 'Sine SMG', 'fireRatePercent')
        + coolingBonus
        + conditionalBonuses.fireRatePercent
        + momentumTriggerBonus
        + overdriveCycleBonus
        + rapidVentingBonus
    )
  );
  const baseEnergyCost = SINE_SMG_BASE_COST + Math.floor((level - 1) / 4);
  const energyCost = Math.max(
    1,
    Math.round(applyPercent(baseEnergyCost, resolveWeaponPercent(tuningBonuses, 'Sine SMG', 'energyCostPercent')))
  );
  const baseDamage = 1 + Math.floor((level - 1) / 5);
  const kineticScale = resolveKineticEscalationScale(options);
  const damage = Math.max(
    1,
    Math.round(
      applyPercent(baseDamage, resolveWeaponPercent(tuningBonuses, 'Sine SMG', 'damagePercent') + conditionalBonuses.damagePercent)
        * kineticScale
    )
  );
  const baseSpeed = BULLET_SPEED * 0.9;
  const highVelocitySpeed = resolveBonus(options.projectileModifierBonus, 'high-velocity-rounds-speed');
  const speed = applyPercent(
    baseSpeed,
    resolveWeaponPercent(tuningBonuses, 'Sine SMG', 'projectileSpeedPercent') + highVelocitySpeed
  );
  const driftReduction = Math.min(
    0.8,
    Math.max(0, (resolveBonus(options.weaponAmplifierBonus, 'gyrostabilised-cannons') + conditionalBonuses.precisionPercent) / 100)
  );
  const lateralAmplitude = Math.min(0.95, (0.32 + level * 0.07) * (1 - driftReduction));
  const twinMounts = Math.max(0, Math.round(resolveBonus(options.weaponAmplifierBonus, 'twin-mounts')));
  const streams = level >= 4 || twinMounts > 0 ? 2 : 1;
  const basePhase = player.weaponOscillator ?? 0;

  if ((player.weaponEnergy ?? 0) < energyCost) {
    return { fired: false, energyCost, intervalMs, firedRecords: [] };
  }

  const firedRecords: WeaponFireRecord[] = [];
  for (let stream = 0; stream < streams; stream += 1) {
    const streamPhase = basePhase + stream * (Math.PI / 5);
    const vx = Math.sin(streamPhase) * BULLET_SPEED * 0.45 * lateralAmplitude;
    const offset = streams === 2 ? (stream === 0 ? -0.14 : 0.14) : 0;
    const bullet = entityManager.create(
      createBullet(
        player.position.x + offset,
        player.position.y + 0.68,
        speed,
        Faction.Player,
        1800,
        damage,
        0.18,
        vx,
        buildProjectileMetadata(options, false)
      )
    );
    firedRecords.push({ weaponMode: 'Sine SMG', projectileEntityId: bullet.id });
  }

  player.weaponOscillator = (basePhase + 0.46 + level * 0.02) % (Math.PI * 2);
  return { fired: true, energyCost, intervalMs, firedRecords };
}

function resolveWeaponPercent(
  tuningBonuses: WeaponTuningBonuses | undefined,
  mode: PlayerWeaponMode,
  stat: WeaponTuningStat
): number {
  return (tuningBonuses?.all?.[stat] ?? 0) + (tuningBonuses?.[mode]?.[stat] ?? 0);
}

function applyFireRate(baseIntervalMs: number, fireRatePercent: number): number {
  const speedScale = Math.max(MIN_SCALE, 1 + fireRatePercent / 100);
  return Math.round(baseIntervalMs / speedScale);
}

function applyPercent(baseValue: number, percent: number): number {
  return baseValue * Math.max(MIN_SCALE, 1 + percent / 100);
}

function resolveBonus(source: Record<string, number> | undefined, key: string): number {
  return source?.[key] ?? 0;
}

function resolveKineticEscalationScale(options: PlayerWeaponSystemOptions): number {
  const perHitPercent = resolveBonus(options.weaponAmplifierBonus, 'kinetic-escalation');
  if (perHitPercent <= 0) {
    return 1;
  }

  const streak = Math.max(0, Math.min(20, options.hitStreak ?? 0));
  return Math.max(0.25, 1 + (perHitPercent * streak) / 100);
}

function resolveConditionalBonuses(
  player: NonNullable<ReturnType<EntityManager['get']>>,
  options: PlayerWeaponSystemOptions
): ConditionalDerivedBonuses {
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

function buildProjectileMetadata(options: PlayerWeaponSystemOptions, isHeavyCannon: boolean) {
  const highVelocityPierce = resolveBonus(options.projectileModifierBonus, 'high-velocity-rounds-pierce');
  const piercingArray = resolveBonus(options.projectileModifierBonus, 'piercing-array');
  const ricochet = resolveBonus(options.projectileModifierBonus, 'ricochet-rounds');
  const splashRadius = resolveBonus(options.projectileModifierBonus, 'explosive-payload-radius');
  const fragmenting = resolveBonus(options.projectileModifierBonus, 'fragmenting-shells');
  const scattercharge = resolveBonus(options.projectileModifierBonus, 'scattercharge');
  const shouldSplit = (isHeavyCannon && fragmenting > 0) || scattercharge > 0;
  return {
    pierceRemaining: Math.max(0, Math.round(highVelocityPierce + piercingArray)),
    ricochetRemaining: Math.max(0, Math.round(ricochet)),
    splashRadius: splashRadius > 0 ? splashRadius : undefined,
    splitOnImpact: shouldSplit ? true : undefined,
    splitSpec: shouldSplit
      ? {
          childCount: scattercharge > 0 ? 5 : 3,
          speedScale: scattercharge > 0 ? 0.55 : 0.75,
          damageScale: scattercharge > 0 ? 0.32 : 0.45
        }
      : undefined
  };
}

function pickLaserTargets(
  entityManager: EntityManager,
  x: number,
  y: number,
  range: number,
  halfWidth: number,
  targetCount: number
) {
  const candidates = entityManager
    .all()
    .filter((entity) => {
      if (entity.type !== EntityType.Enemy || entity.health <= 0) {
        return false;
      }

      const dy = entity.position.y - y;
      const dx = Math.abs(entity.position.x - x);
      return dy >= 0 && dy <= range && dx <= halfWidth;
    })
    .sort((a, b) => a.position.y - b.position.y);

  return candidates.slice(0, targetCount);
}
