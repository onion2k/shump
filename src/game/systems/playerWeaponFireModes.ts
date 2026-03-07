import type { EntityManager } from '../ecs/EntityManager';
import { BULLET_SPEED, PLAYER_MACHINE_GUN_INTERVAL_MS } from '../core/constants';
import { createBullet } from '../factories/createBullet';
import { createLaserBeam } from '../factories/createLaserBeam';
import { Faction } from '../ecs/entityTypes';
import {
  applyFireRate,
  applyPercent,
  buildProjectileMetadata,
  pickLaserTargets,
  resolveBonus,
  resolveKineticEscalationScale,
  resolveWeaponPercent
} from './playerWeaponHelpers';
import type {
  ConditionalDerivedBonuses,
  FireOutcome,
  PlayerEntity,
  PlayerWeaponSystemOptions,
  WeaponFireRecord
} from './playerWeaponTypes';

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

export interface ProjectileFireModeResult extends FireOutcome {
  firedRecords: WeaponFireRecord[];
}

export interface LaserFireModeResult extends FireOutcome {
  scoreDelta: number;
  range: number;
  halfWidth: number;
}

export function fireAutoPulse(
  entityManager: EntityManager,
  player: PlayerEntity,
  level: number,
  options: PlayerWeaponSystemOptions,
  conditionalBonuses: ConditionalDerivedBonuses
): ProjectileFireModeResult {
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

export function fireContinuousLaser(
  entityManager: EntityManager,
  player: PlayerEntity,
  level: number,
  options: PlayerWeaponSystemOptions,
  conditionalBonuses: ConditionalDerivedBonuses
): LaserFireModeResult {
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

export function spawnLaserBeam(
  entityManager: EntityManager,
  player: PlayerEntity,
  intervalMs: number,
  range: number,
  halfWidth: number
): void {
  entityManager.create(
    createLaserBeam(
      player.position.x,
      player.position.y + 0.95,
      range,
      halfWidth,
      Math.max(90, intervalMs * 0.65)
    )
  );
}

export function fireHeavyCannon(
  entityManager: EntityManager,
  player: PlayerEntity,
  level: number,
  options: PlayerWeaponSystemOptions,
  conditionalBonuses: ConditionalDerivedBonuses
): ProjectileFireModeResult {
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

export function fireSineSmg(
  entityManager: EntityManager,
  player: PlayerEntity,
  level: number,
  options: PlayerWeaponSystemOptions,
  conditionalBonuses: ConditionalDerivedBonuses
): ProjectileFireModeResult {
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
