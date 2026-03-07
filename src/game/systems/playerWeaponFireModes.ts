import type { EntityManager } from '../ecs/EntityManager';
import { BULLET_SPEED, PLAYER_MACHINE_GUN_INTERVAL_MS } from '../core/constants';
import { createBullet } from '../factories/createBullet';
import { createLaserBeam } from '../factories/createLaserBeam';
import { createField } from '../factories/createField';
import { createDrone } from '../factories/createDrone';
import { createParticle } from '../factories/createParticle';
import { EntityType, Faction } from '../ecs/entityTypes';
import { applyDamage } from './damageSystem';
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
import type { PlayerWeaponMode } from '../weapons/playerWeapons';
import type { Entity } from '../ecs/components';

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

const WEAPON_PROJECTILE_VISUAL_ID: Record<PlayerWeaponMode, string> = {
  'Auto Pulse': 'auto-pulse',
  'Continuous Laser': 'continuous-laser',
  'Heavy Cannon': 'heavy-cannon',
  'Sine SMG': 'sine-smg',
  'Flak Cannon': 'flak-cannon',
  'Proximity Mines': 'proximity-mines',
  'Gravity Bomb': 'gravity-bomb',
  'Thermal Napalm Pods': 'thermal-napalm-pods',
  'Tesla Arc': 'tesla-arc',
  'Chain Laser': 'chain-laser',
  'Ion Burst': 'ion-burst',
  'Spread Shot': 'spread-shot',
  'Helix Blaster': 'helix-blaster',
  'Orbital Drones': 'orbital-drone-shot',
  'Rotary Disc Launcher': 'rotary-disc',
  'Energy Shield Projector': 'energy-shield-projector',
  'Reflector Pulse': 'reflector-pulse',
  'Time Distortion Pulse': 'time-distortion-pulse',
  'Attack Drone': 'attack-drone-shot',
  'Interceptor Drone': 'interceptor-drone-shot',
  'Salvage Drone': 'salvage-drone-shot',
  'Prism Splitter': 'prism-splitter',
  'Polygon Shredder': 'polygon-shredder',
  'Vector Beam': 'vector-beam'
};

const WEAPON_FIELD_VISUAL_ID: Partial<Record<PlayerWeaponMode, string>> = {
  'Thermal Napalm Pods': 'thermal-napalm-pods',
  'Ion Burst': 'ion-burst',
  'Energy Shield Projector': 'energy-shield-projector',
  'Reflector Pulse': 'reflector-pulse',
  'Time Distortion Pulse': 'time-distortion-pulse',
  'Polygon Shredder': 'polygon-shredder'
};

function setWeaponProjectileVisual(entity: Entity, weaponMode: PlayerWeaponMode): void {
  entity.projectileVisualId = WEAPON_PROJECTILE_VISUAL_ID[weaponMode];
}

function setWeaponFieldVisual(entity: Entity, weaponMode: PlayerWeaponMode): void {
  entity.fieldVisualId = WEAPON_FIELD_VISUAL_ID[weaponMode] ?? weaponMode.toLowerCase().replace(/\s+/g, '-');
}

function spawnWeaponParticles(entityManager: EntityManager, x: number, y: number, particleType: string, count: number): void {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / Math.max(1, count)) * Math.PI * 2;
    const speed = 2 + (i % 3);
    entityManager.create(createParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, particleType, 220 + (i % 4) * 40, 0.05));
  }
}

function spawnSegmentBeam(
  entityManager: EntityManager,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  projectileVisualId: string,
  lifetimeMs: number,
  jitter = 0
): void {
  const seed = Math.sin((x1 + y1 + x2 + y2) * 9.31);
  const jitterX = seed * jitter * 0.5;
  const jitterY = Math.cos(seed * 1.7) * jitter * 0.5;
  const dx = x2 - x1 + jitterX;
  const dy = y2 - y1 + jitterY;
  const length = Math.max(0.2, Math.hypot(dx, dy));
  const nx = dx / length;
  const ny = dy / length;
  const beam = entityManager.create(createLaserBeam(x1, y1, length, 0.15, lifetimeMs));
  beam.projectileKind = 'laser';
  beam.projectileVisualId = projectileVisualId;
  beam.velocity.x = nx;
  beam.velocity.y = ny;
  beam.faction = undefined;
}

export interface ModeFireResult extends FireOutcome {
  firedRecords: WeaponFireRecord[];
  scoreDelta: number;
}

export type WeaponModeHandler = (
  entityManager: EntityManager,
  player: PlayerEntity,
  level: number,
  options: PlayerWeaponSystemOptions,
  conditionalBonuses: ConditionalDerivedBonuses
) => ModeFireResult;

function noFire(intervalMs = 100, energyCost = 1): ModeFireResult {
  return { fired: false, intervalMs, energyCost, firedRecords: [], scoreDelta: 0 };
}

function minEnergy(player: PlayerEntity, energyCost: number): boolean {
  return (player.weaponEnergy ?? 0) >= energyCost;
}

function damageScale(options: PlayerWeaponSystemOptions): number {
  return resolveKineticEscalationScale(options);
}

function addStatus(entity: Entity, effectId: string, remainingMs: number, stacks = 1): void {
  const existing = entity.statusEffects?.find((effect) => effect.effectId === effectId);
  if (existing) {
    existing.remainingMs = Math.max(existing.remainingMs, remainingMs);
    existing.stacks = Math.max(existing.stacks ?? 1, stacks);
    return;
  }
  entity.statusEffects = [...(entity.statusEffects ?? []), { effectId, remainingMs, stacks }];
}

function nearestEnemies(entityManager: EntityManager, x: number, y: number, maxCount: number, maxRange = Number.POSITIVE_INFINITY): Entity[] {
  const maxRangeSq = maxRange * maxRange;
  const entries: { enemy: Entity; distSq: number }[] = [];
  for (const entity of entityManager.values()) {
    if (entity.type !== EntityType.Enemy || entity.health <= 0) {
      continue;
    }
    const dx = entity.position.x - x;
    const dy = entity.position.y - y;
    const distSq = dx * dx + dy * dy;
    if (distSq > maxRangeSq) {
      continue;
    }
    entries.push({ enemy: entity, distSq });
  }
  entries.sort((a, b) => a.distSq - b.distSq);
  return entries.slice(0, maxCount).map((entry) => entry.enemy);
}

function dealDamage(target: Entity, amount: number): number {
  const before = target.health;
  applyDamage(target, amount);
  if (before > 0 && target.health <= 0) {
    return target.scoreValue ?? 0;
  }
  return 0;
}

function fireMultiPellet(
  entityManager: EntityManager,
  player: PlayerEntity,
  count: number,
  spreadRadians: number,
  speed: number,
  damage: number,
  lifetimeMs: number,
  weaponMode: PlayerWeaponMode,
  projectileKind: Entity['projectileKind'] = 'standard',
  radius = 0.18,
  metadata?: ReturnType<typeof buildProjectileMetadata>
): WeaponFireRecord[] {
  const records: WeaponFireRecord[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : i / (count - 1);
    const angle = (t * 2 - 1) * spreadRadians * 0.5;
    const vx = Math.sin(angle) * speed;
    const vy = Math.cos(angle) * speed;
    const bullet = entityManager.create(
      createBullet(
        player.position.x,
        player.position.y + 0.74,
        vy,
        Faction.Player,
        lifetimeMs,
        damage,
        radius,
        vx,
        {
          ...(metadata ?? {})
        }
      )
    );
    if (projectileKind && projectileKind !== 'standard') {
      bullet.projectileKind = projectileKind;
    }
    setWeaponProjectileVisual(bullet, weaponMode);
    records.push({ weaponMode, projectileEntityId: bullet.id });
  }
  return records;
}

export function fireAutoPulse(
  entityManager: EntityManager,
  player: PlayerEntity,
  level: number,
  options: PlayerWeaponSystemOptions,
  conditionalBonuses: ConditionalDerivedBonuses
): ModeFireResult {
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

  let streamOffsets = level <= 1 ? [0] : level === 2 ? [-0.24, 0.24] : [-0.34, 0, 0.34];
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
  const overdriveCycleBonus = overdriveCycle > 0 && ((options.elapsedMs ?? 0) % 7000) < 2400 ? overdriveCycle * 10 : 0;
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
  const kineticScale = damageScale(options);
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

  if (!minEnergy(player, energyCost)) {
    return noFire(intervalMs, energyCost);
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
      const helixVx =
        helixPattern > 0
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
          0.25,
          helixVx + fanVx,
          buildProjectileMetadata(options, false)
        )
      );
      setWeaponProjectileVisual(bullet, 'Auto Pulse');
      firedRecords.push({ weaponMode: 'Auto Pulse', projectileEntityId: bullet.id });
    }
  }

  player.weaponOscillator = ((player.weaponOscillator ?? 0) + 0.18 + helixPattern * 0.09) % (Math.PI * 2);
  return { fired: true, energyCost, intervalMs, firedRecords, scoreDelta: 0 };
}

export function fireContinuousLaser(
  entityManager: EntityManager,
  player: PlayerEntity,
  level: number,
  options: PlayerWeaponSystemOptions,
  conditionalBonuses: ConditionalDerivedBonuses
): ModeFireResult {
  const tuningBonuses = options.weaponTuningBonuses;
  const baseIntervalMs = Math.max(34, LASER_BASE_INTERVAL_MS - (Math.min(level, 8) - 1) * 2);
  const coolingBonus = resolveBonus(options.weaponAmplifierBonus, 'accelerated-cooling');
  const momentumTrigger = resolveBonus(options.triggerModifierBonus, 'momentum-trigger');
  const momentumTriggerBonus = momentumTrigger > 0 ? Math.min(24, (options.consecutiveShootingMs ?? 0) / 1000 * momentumTrigger) : 0;
  const overdriveCycle = resolveBonus(options.triggerModifierBonus, 'overdrive-cycle');
  const overdriveCycleBonus = overdriveCycle > 0 && ((options.elapsedMs ?? 0) % 7000) < 2400 ? overdriveCycle * 10 : 0;
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
  if (!minEnergy(player, energyCost)) {
    return noFire(intervalMs, energyCost);
  }

  const baseDamage = 1 + Math.floor((level - 1) / 2);
  const overchargeDamage = resolveBonus(options.weaponAmplifierBonus, 'overcharged-capacitors-damage');
  const damage = Math.max(
    1,
    Math.round(
      applyPercent(
        baseDamage,
        resolveWeaponPercent(tuningBonuses, 'Continuous Laser', 'damagePercent') + overchargeDamage + conditionalBonuses.damagePercent
      ) * damageScale(options)
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

  const sweepOffset =
    oscillatingLaser > 0 ? Math.sin((player.weaponOscillator ?? 0) * (1 + oscillatingLaser * 0.25)) * 0.9 * oscillatingLaser : 0;
  const targets = pickLaserTargets(entityManager, player.position.x + sweepOffset, player.position.y, range, halfWidth, targetCount);
  let scoreDelta = 0;
  for (const target of targets) {
    scoreDelta += dealDamage(target, damage);
  }

  spawnLaserBeam(entityManager, player, intervalMs, range, halfWidth);
  return { fired: true, scoreDelta, energyCost, intervalMs, firedRecords: [{ weaponMode: 'Continuous Laser' }] };
}

export function spawnLaserBeam(
  entityManager: EntityManager,
  player: PlayerEntity,
  intervalMs: number,
  range: number,
  halfWidth: number,
  projectileKind: Entity['projectileKind'] = 'laser',
  projectileVisualId?: string
): void {
  const beamLifetimeMs = Math.max(90, Math.min(220, Math.round(intervalMs * 0.85)));
  const beam = entityManager.create(createLaserBeam(player.position.x, player.position.y + 0.95, range, halfWidth, beamLifetimeMs));
  beam.projectileKind = projectileKind;
  beam.projectileVisualId = projectileVisualId ?? (projectileKind === 'vector' ? 'vector-beam' : 'continuous-laser');
  beam.velocity.x = 0;
  beam.velocity.y = 1;
}

export function fireHeavyCannon(
  entityManager: EntityManager,
  player: PlayerEntity,
  level: number,
  options: PlayerWeaponSystemOptions,
  conditionalBonuses: ConditionalDerivedBonuses
): ModeFireResult {
  const tuningBonuses = options.weaponTuningBonuses;
  const compressionCannon = resolveBonus(options.weaponAmplifierBonus, 'compression-cannon');
  const baseIntervalMs = Math.max(180, CANNON_BASE_INTERVAL_MS - (Math.min(level, 8) - 1) * 24 + compressionCannon * 70);
  const coolingBonus = resolveBonus(options.weaponAmplifierBonus, 'accelerated-cooling');
  const momentumTrigger = resolveBonus(options.triggerModifierBonus, 'momentum-trigger');
  const momentumTriggerBonus = momentumTrigger > 0 ? Math.min(24, (options.consecutiveShootingMs ?? 0) / 1000 * momentumTrigger) : 0;
  const overdriveCycle = resolveBonus(options.triggerModifierBonus, 'overdrive-cycle');
  const overdriveCycleBonus = overdriveCycle > 0 && ((options.elapsedMs ?? 0) % 7000) < 2400 ? overdriveCycle * 10 : 0;
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
  if (!minEnergy(player, energyCost)) {
    return noFire(intervalMs, energyCost);
  }

  const baseDamage = 6 + (level - 1) * 2;
  const damage = Math.max(
    1,
    Math.round(
      applyPercent(
        baseDamage,
        resolveWeaponPercent(tuningBonuses, 'Heavy Cannon', 'damagePercent') + conditionalBonuses.damagePercent
      ) * damageScale(options) * (compressionCannon > 0 ? 1 + compressionCannon * 0.45 : 1)
    )
  );
  const baseSpeed = 13 + Math.min(level, 8) * 0.8;
  const highVelocitySpeed = resolveBonus(options.projectileModifierBonus, 'high-velocity-rounds-speed');
  const speed =
    applyPercent(baseSpeed, resolveWeaponPercent(tuningBonuses, 'Heavy Cannon', 'projectileSpeedPercent') + highVelocitySpeed)
    * (compressionCannon > 0 ? Math.max(0.25, 1 - compressionCannon * 0.4) : 1);
  const driftReduction = Math.min(
    0.8,
    Math.max(0, (resolveBonus(options.weaponAmplifierBonus, 'gyrostabilised-cannons') + conditionalBonuses.precisionPercent) / 100)
  );
  const twinMounts = Math.max(0, Math.round(resolveBonus(options.weaponAmplifierBonus, 'twin-mounts')));
  const offsets = level >= 3 || twinMounts > 0 ? [-0.22, 0.22] : [0];

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
    setWeaponProjectileVisual(bullet, 'Heavy Cannon');
    firedRecords.push({ weaponMode: 'Heavy Cannon', projectileEntityId: bullet.id });
  }

  return { fired: true, energyCost, intervalMs, firedRecords, scoreDelta: 0 };
}

export function fireSineSmg(
  entityManager: EntityManager,
  player: PlayerEntity,
  level: number,
  options: PlayerWeaponSystemOptions,
  conditionalBonuses: ConditionalDerivedBonuses
): ModeFireResult {
  const tuningBonuses = options.weaponTuningBonuses;
  const baseIntervalMs = Math.max(28, SINE_SMG_BASE_INTERVAL_MS - (Math.min(level, 10) - 1) * 3);
  const coolingBonus = resolveBonus(options.weaponAmplifierBonus, 'accelerated-cooling');
  const momentumTrigger = resolveBonus(options.triggerModifierBonus, 'momentum-trigger');
  const momentumTriggerBonus = momentumTrigger > 0 ? Math.min(24, (options.consecutiveShootingMs ?? 0) / 1000 * momentumTrigger) : 0;
  const overdriveCycle = resolveBonus(options.triggerModifierBonus, 'overdrive-cycle');
  const overdriveCycleBonus = overdriveCycle > 0 && ((options.elapsedMs ?? 0) % 7000) < 2400 ? overdriveCycle * 10 : 0;
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
  if (!minEnergy(player, energyCost)) {
    return noFire(intervalMs, energyCost);
  }

  const baseDamage = 1 + Math.floor((level - 1) / 5);
  const damage = Math.max(
    1,
    Math.round(
      applyPercent(baseDamage, resolveWeaponPercent(tuningBonuses, 'Sine SMG', 'damagePercent') + conditionalBonuses.damagePercent)
      * damageScale(options)
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
    setWeaponProjectileVisual(bullet, 'Sine SMG');
    firedRecords.push({ weaponMode: 'Sine SMG', projectileEntityId: bullet.id });
  }

  player.weaponOscillator = (basePhase + 0.46 + level * 0.02) % (Math.PI * 2);
  return { fired: true, energyCost, intervalMs, firedRecords, scoreDelta: 0 };
}

function fireFlakCannon(
  entityManager: EntityManager,
  player: PlayerEntity,
  level: number,
  options: PlayerWeaponSystemOptions,
  conditionalBonuses: ConditionalDerivedBonuses
): ModeFireResult {
  const intervalMs = Math.max(160, 420 - level * 24);
  const energyCost = 9 + Math.floor(level / 2);
  if (!minEnergy(player, energyCost)) {
    return noFire(intervalMs, energyCost);
  }
  const damage = Math.max(2, Math.round((4 + level * 1.4) * (1 + conditionalBonuses.damagePercent / 100) * damageScale(options)));
  const bullet = entityManager.create(
    createBullet(player.position.x, player.position.y + 0.74, BULLET_SPEED * 0.62, Faction.Player, 1600, damage, 0.3, 0, {
      sourceWeaponTag: 'flak-cannon-shell'
    })
  );
  setWeaponProjectileVisual(bullet, 'Flak Cannon');
  return { fired: true, intervalMs, energyCost, firedRecords: [{ weaponMode: 'Flak Cannon', projectileEntityId: bullet.id }], scoreDelta: 0 };
}

function fireProximityMines(
  entityManager: EntityManager,
  player: PlayerEntity,
  level: number
): ModeFireResult {
  const intervalMs = Math.max(260, 820 - level * 46);
  const energyCost = Math.max(4, 7 - Math.floor(level / 3));
  if (!minEnergy(player, energyCost)) {
    return noFire(intervalMs, energyCost);
  }
  const mine = entityManager.create(
    createBullet(player.position.x, player.position.y - 0.9, -3.2, Faction.Player, 4200, Math.max(2, 2 + Math.floor(level / 2)), 0.26, 0, {
      sourceWeaponTag: 'proximity-mine'
    })
  );
  mine.projectileKind = 'mine';
  setWeaponProjectileVisual(mine, 'Proximity Mines');
  mine.armDelayMs = 380;
  mine.triggerRadius = 1.2 + level * 0.08;
  mine.splashRadius = 1.4 + level * 0.12;
  return { fired: true, intervalMs, energyCost, firedRecords: [{ weaponMode: 'Proximity Mines', projectileEntityId: mine.id }], scoreDelta: 0 };
}

function fireGravityBomb(
  entityManager: EntityManager,
  player: PlayerEntity,
  level: number
): ModeFireResult {
  const intervalMs = Math.max(420, 980 - level * 42);
  const energyCost = 12 + Math.floor(level / 2);
  if (!minEnergy(player, energyCost)) {
    return noFire(intervalMs, energyCost);
  }
  const bomb = entityManager.create(
    createBullet(player.position.x, player.position.y + 0.9, BULLET_SPEED * 0.48, Faction.Player, 1700, 2 + Math.floor(level / 2), 0.3, 0, {
      sourceWeaponTag: 'gravity-bomb'
    })
  );
  setWeaponProjectileVisual(bomb, 'Gravity Bomb');
  bomb.splashRadius = 2 + level * 0.15;
  return { fired: true, intervalMs, energyCost, firedRecords: [{ weaponMode: 'Gravity Bomb', projectileEntityId: bomb.id }], scoreDelta: 0 };
}

function fireThermalNapalmPods(entityManager: EntityManager, player: PlayerEntity, level: number): ModeFireResult {
  const intervalMs = Math.max(260, 720 - level * 40);
  const energyCost = 7;
  if (!minEnergy(player, energyCost)) {
    return noFire(intervalMs, energyCost);
  }
  const field = entityManager.create(
    createField(player.position.x, player.position.y - 0.8, 'napalm-field', Faction.Player, {
      radius: 0.9 + level * 0.06,
      fieldRadius: 1.1 + level * 0.08,
      damage: 0.8 + level * 0.26,
      lifetimeMs: 2800,
      ownerId: player.id
    })
  );
  setWeaponFieldVisual(field, 'Thermal Napalm Pods');
  spawnWeaponParticles(entityManager, field.position.x, field.position.y, 'napalm-ember', 8);
  return { fired: true, intervalMs, energyCost, firedRecords: [{ weaponMode: 'Thermal Napalm Pods' }], scoreDelta: 0 };
}

function fireTeslaArc(entityManager: EntityManager, player: PlayerEntity, level: number, options: PlayerWeaponSystemOptions): ModeFireResult {
  const intervalMs = Math.max(130, 360 - level * 18);
  const energyCost = 8;
  if (!minEnergy(player, energyCost)) {
    return noFire(intervalMs, energyCost);
  }
  const chainTargets = nearestEnemies(entityManager, player.position.x, player.position.y, 2 + Math.floor(level / 2), 7 + level * 0.4);
  let damage = (2 + level * 0.8) * damageScale(options);
  let scoreDelta = 0;
  let sourceX = player.position.x;
  let sourceY = player.position.y + 0.74;
  for (const target of chainTargets) {
    scoreDelta += dealDamage(target, Math.max(1, damage));
    spawnSegmentBeam(entityManager, sourceX, sourceY, target.position.x, target.position.y, 'tesla-arc', 170, 0.22);
    spawnWeaponParticles(entityManager, target.position.x, target.position.y, 'tesla-spark', 4);
    sourceX = target.position.x;
    sourceY = target.position.y;
    damage *= 0.72;
  }
  const visuals = fireMultiPellet(
    entityManager,
    player,
    Math.max(1, chainTargets.length),
    Math.PI / 7,
    BULLET_SPEED * 0.9,
    1,
    280,
    'Tesla Arc',
    'arc',
    0.12
  );
  if (visuals.length === 0) {
    spawnSegmentBeam(entityManager, player.position.x, player.position.y + 0.74, player.position.x, player.position.y + 2.3, 'tesla-arc', 170, 0.12);
  }
  return { fired: true, intervalMs, energyCost, firedRecords: visuals, scoreDelta };
}

function fireChainLaser(
  entityManager: EntityManager,
  player: PlayerEntity,
  level: number,
  options: PlayerWeaponSystemOptions,
  conditionalBonuses: ConditionalDerivedBonuses
): ModeFireResult {
  const intervalMs = Math.max(84, 210 - level * 8);
  const energyCost = 7;
  if (!minEnergy(player, energyCost)) {
    return noFire(intervalMs, energyCost);
  }

  const baseDamage = (2.8 + level * 0.7) * damageScale(options) * (1 + conditionalBonuses.damagePercent / 100);
  const primary = nearestEnemies(entityManager, player.position.x, player.position.y, 1, 26)[0];
  let scoreDelta = 0;
  if (primary) {
    scoreDelta += dealDamage(primary, baseDamage);
    spawnSegmentBeam(entityManager, player.position.x, player.position.y + 0.92, primary.position.x, primary.position.y, 'chain-laser', 180);
    spawnWeaponParticles(entityManager, primary.position.x, primary.position.y, 'chain-impact', 5);
    const secondaryTargets = nearestEnemies(entityManager, primary.position.x, primary.position.y, 3, 5.2).filter((target) => target.id !== primary.id);
    let damage = baseDamage * 0.7;
    let sourceX = primary.position.x;
    let sourceY = primary.position.y;
    for (const target of secondaryTargets) {
      scoreDelta += dealDamage(target, damage);
      spawnSegmentBeam(entityManager, sourceX, sourceY, target.position.x, target.position.y, 'chain-laser', 180);
      spawnWeaponParticles(entityManager, target.position.x, target.position.y, 'chain-impact', 4);
      sourceX = target.position.x;
      sourceY = target.position.y;
      damage *= 0.72;
    }
  }

  spawnLaserBeam(entityManager, player, intervalMs, 34, 0.42, 'laser', 'chain-laser');
  return { fired: true, intervalMs, energyCost, firedRecords: [{ weaponMode: 'Chain Laser' }], scoreDelta };
}

function fireIonBurst(entityManager: EntityManager, player: PlayerEntity, level: number, options: PlayerWeaponSystemOptions): ModeFireResult {
  const intervalMs = Math.max(240, 640 - level * 24);
  const energyCost = 10;
  if (!minEnergy(player, energyCost)) {
    return noFire(intervalMs, energyCost);
  }
  const targets = nearestEnemies(entityManager, player.position.x, player.position.y + 0.6, 8, 2.2 + level * 0.16);
  let scoreDelta = 0;
  for (const target of targets) {
    scoreDelta += dealDamage(target, (1 + level * 0.4) * damageScale(options));
    addStatus(target, 'emp-disabled', 650 + level * 50);
  }
  const field = entityManager.create(
    createField(player.position.x, player.position.y + 0.6, 'time-distortion', Faction.Player, {
      radius: 0.9,
      fieldRadius: 2 + level * 0.1,
      slowPercent: 42,
      lifetimeMs: 220
    })
  );
  setWeaponFieldVisual(field, 'Ion Burst');
  spawnWeaponParticles(entityManager, field.position.x, field.position.y, 'ion-pulse', 8);
  return { fired: true, intervalMs, energyCost, firedRecords: [{ weaponMode: 'Ion Burst' }], scoreDelta };
}

function fireSpreadShot(
  entityManager: EntityManager,
  player: PlayerEntity,
  level: number,
  options: PlayerWeaponSystemOptions,
  conditionalBonuses: ConditionalDerivedBonuses
): ModeFireResult {
  const intervalMs = Math.max(70, 180 - level * 5);
  const energyCost = 5;
  if (!minEnergy(player, energyCost)) {
    return noFire(intervalMs, energyCost);
  }
  const pellets = 6 + Math.floor(level / 2);
  const damage = Math.max(1, (0.8 + level * 0.22) * damageScale(options) * (1 + conditionalBonuses.damagePercent / 100));
  const records = fireMultiPellet(entityManager, player, pellets, Math.PI / 3.6, BULLET_SPEED * 0.92, damage, 1200, 'Spread Shot');
  return { fired: true, intervalMs, energyCost, firedRecords: records, scoreDelta: 0 };
}

function fireHelixBlaster(
  entityManager: EntityManager,
  player: PlayerEntity,
  level: number,
  options: PlayerWeaponSystemOptions,
  conditionalBonuses: ConditionalDerivedBonuses
): ModeFireResult {
  const intervalMs = Math.max(34, 90 - level * 2);
  const energyCost = 3;
  if (!minEnergy(player, energyCost)) {
    return noFire(intervalMs, energyCost);
  }
  const phase = player.weaponOscillator ?? 0;
  const speed = BULLET_SPEED;
  const amp = 0.62 + level * 0.04;
  const damage = Math.max(1, (1 + level * 0.24) * damageScale(options) * (1 + conditionalBonuses.damagePercent / 100));
  const offsets = [0, Math.PI];
  const firedRecords: WeaponFireRecord[] = [];
  for (const offsetPhase of offsets) {
    const theta = phase + offsetPhase;
    const vx = Math.sin(theta) * speed * 0.3 * amp;
    const bullet = entityManager.create(createBullet(player.position.x, player.position.y + 0.7, speed * 0.95, Faction.Player, 1450, damage, 0.16, vx));
    setWeaponProjectileVisual(bullet, 'Helix Blaster');
    firedRecords.push({ weaponMode: 'Helix Blaster', projectileEntityId: bullet.id });
  }
  player.weaponOscillator = (phase + 0.42 + level * 0.012) % (Math.PI * 2);
  return { fired: true, intervalMs, energyCost, firedRecords, scoreDelta: 0 };
}

function ensureDrone(
  entityManager: EntityManager,
  player: PlayerEntity,
  droneKind: NonNullable<Entity['droneKind']>,
  level: number,
  orbit = false
): number {
  const existing = Array.from(entityManager.values()).find(
    (entity) => entity.type === EntityType.Drone && entity.ownerId === player.id && entity.droneKind === droneKind
  );
  if (existing) {
    existing.damage = Math.max(existing.damage ?? 1, 1 + Math.floor(level / 2));
    existing.droneVisualId =
      droneKind === 'attack' ? 'attack-drone' : droneKind === 'interceptor' ? 'interceptor-drone' : droneKind === 'salvage' ? 'salvage-drone' : 'orbital-drone';
    return existing.id;
  }

  const drone = entityManager.create(
    createDrone(player.position.x - 0.9, player.position.y + 0.45, droneKind, {
      ownerId: player.id,
      damage: 1 + Math.floor(level / 2),
      orbitRadius: orbit ? 1.25 + level * 0.05 : undefined,
      orbitAngularSpeed: orbit ? 1.2 + level * 0.08 : undefined,
      orbitAngle: orbit ? 0 : undefined
    })
  );
  drone.droneVisualId =
    droneKind === 'attack' ? 'attack-drone' : droneKind === 'interceptor' ? 'interceptor-drone' : droneKind === 'salvage' ? 'salvage-drone' : 'orbital-drone';
  drone.fireCooldownMs = 0;
  return drone.id;
}

function fireOrbitalDrones(entityManager: EntityManager, player: PlayerEntity, level: number): ModeFireResult {
  const intervalMs = 680;
  const energyCost = 6;
  if (!minEnergy(player, energyCost)) {
    return noFire(intervalMs, energyCost);
  }

  const existing = Array.from(entityManager.values()).filter(
    (entity) => entity.type === EntityType.Drone && entity.ownerId === player.id && entity.droneKind === 'orbital-attack'
  );
  if (existing.length < 2) {
    for (let i = existing.length; i < 2; i += 1) {
      const drone = entityManager.create(
        createDrone(player.position.x, player.position.y, 'orbital-attack', {
          ownerId: player.id,
          damage: 1 + Math.floor(level / 2),
          orbitRadius: 1.1 + i * 0.28,
          orbitAngularSpeed: 1.8 + i * 0.2,
          orbitAngle: i * Math.PI
        })
      );
      drone.droneVisualId = 'orbital-drone';
      drone.fireCooldownMs = i * 160;
    }
  }
  return { fired: true, intervalMs, energyCost, firedRecords: [{ weaponMode: 'Orbital Drones' }], scoreDelta: 0 };
}

function fireRotaryDiscLauncher(entityManager: EntityManager, player: PlayerEntity, level: number): ModeFireResult {
  const intervalMs = Math.max(200, 520 - level * 20);
  const energyCost = 9;
  if (!minEnergy(player, energyCost)) {
    return noFire(intervalMs, energyCost);
  }
  const disc = entityManager.create(
    createBullet(player.position.x, player.position.y + 0.82, BULLET_SPEED * 0.42, Faction.Player, 2600, 2 + level, 0.32, 0, {
      pierceRemaining: 2 + Math.floor(level / 2),
      sourceWeaponTag: 'rotary-disc'
    })
  );
  disc.projectileKind = 'disc';
  setWeaponProjectileVisual(disc, 'Rotary Disc Launcher');
  return {
    fired: true,
    intervalMs,
    energyCost,
    firedRecords: [{ weaponMode: 'Rotary Disc Launcher', projectileEntityId: disc.id }],
    scoreDelta: 0
  };
}

function fireEnergyShieldProjector(entityManager: EntityManager, player: PlayerEntity, level: number): ModeFireResult {
  const intervalMs = Math.max(320, 860 - level * 28);
  const energyCost = 10;
  if (!minEnergy(player, energyCost)) {
    return noFire(intervalMs, energyCost);
  }
  const field = entityManager.create(
    createField(player.position.x, player.position.y + 1.4, 'shield-barrier', Faction.Player, {
      radius: 0.65 + level * 0.05,
      fieldRadius: 0.9 + level * 0.06,
      lifetimeMs: 1000 + level * 90,
      damage: 0.7 + level * 0.2,
      ownerId: player.id
    })
  );
  setWeaponFieldVisual(field, 'Energy Shield Projector');
  spawnWeaponParticles(entityManager, field.position.x, field.position.y, 'shield-shimmer', 6);
  return { fired: true, intervalMs, energyCost, firedRecords: [{ weaponMode: 'Energy Shield Projector' }], scoreDelta: 0 };
}

function fireReflectorPulse(entityManager: EntityManager, player: PlayerEntity, level: number): ModeFireResult {
  const intervalMs = Math.max(220, 700 - level * 30);
  const energyCost = 9;
  if (!minEnergy(player, energyCost)) {
    return noFire(intervalMs, energyCost);
  }
  const field = entityManager.create(
    createField(player.position.x, player.position.y + 0.35, 'time-distortion', Faction.Player, {
      radius: 0.7,
      fieldRadius: 2.1 + level * 0.14,
      fieldStrength: 1 + level * 0.2,
      lifetimeMs: 200,
      ownerId: player.id
    })
  );
  field.sourceWeaponTag = 'reflector-pulse';
  setWeaponFieldVisual(field, 'Reflector Pulse');
  spawnWeaponParticles(entityManager, field.position.x, field.position.y, 'reflector-flash', 7);
  return { fired: true, intervalMs, energyCost, firedRecords: [{ weaponMode: 'Reflector Pulse' }], scoreDelta: 0 };
}

function fireTimeDistortionPulse(entityManager: EntityManager, player: PlayerEntity, level: number): ModeFireResult {
  const intervalMs = Math.max(240, 720 - level * 32);
  const energyCost = 8;
  if (!minEnergy(player, energyCost)) {
    return noFire(intervalMs, energyCost);
  }
  const field = entityManager.create(
    createField(player.position.x, player.position.y + 0.7, 'time-distortion', Faction.Player, {
      radius: 0.9,
      fieldRadius: 2.5 + level * 0.16,
      slowPercent: 26 + level * 4,
      lifetimeMs: 1050 + level * 80,
      ownerId: player.id
    })
  );
  setWeaponFieldVisual(field, 'Time Distortion Pulse');
  spawnWeaponParticles(entityManager, field.position.x, field.position.y, 'time-ripple', 7);
  return { fired: true, intervalMs, energyCost, firedRecords: [{ weaponMode: 'Time Distortion Pulse' }], scoreDelta: 0 };
}

function fireAttackDrone(entityManager: EntityManager, player: PlayerEntity, level: number): ModeFireResult {
  const intervalMs = 520;
  const energyCost = 5;
  if (!minEnergy(player, energyCost)) {
    return noFire(intervalMs, energyCost);
  }
  const id = ensureDrone(entityManager, player, 'attack', level);
  return { fired: true, intervalMs, energyCost, firedRecords: [{ weaponMode: 'Attack Drone', projectileEntityId: id }], scoreDelta: 0 };
}

function fireInterceptorDrone(entityManager: EntityManager, player: PlayerEntity, level: number): ModeFireResult {
  const intervalMs = 540;
  const energyCost = 5;
  if (!minEnergy(player, energyCost)) {
    return noFire(intervalMs, energyCost);
  }
  const id = ensureDrone(entityManager, player, 'interceptor', level);
  return { fired: true, intervalMs, energyCost, firedRecords: [{ weaponMode: 'Interceptor Drone', projectileEntityId: id }], scoreDelta: 0 };
}

function fireSalvageDrone(entityManager: EntityManager, player: PlayerEntity, level: number): ModeFireResult {
  const intervalMs = 560;
  const energyCost = 4;
  if (!minEnergy(player, energyCost)) {
    return noFire(intervalMs, energyCost);
  }
  const id = ensureDrone(entityManager, player, 'salvage', level);
  return { fired: true, intervalMs, energyCost, firedRecords: [{ weaponMode: 'Salvage Drone', projectileEntityId: id }], scoreDelta: 0 };
}

function firePrismSplitter(entityManager: EntityManager, player: PlayerEntity, level: number, options: PlayerWeaponSystemOptions): ModeFireResult {
  const intervalMs = Math.max(70, 170 - level * 4);
  const energyCost = 5;
  if (!minEnergy(player, energyCost)) {
    return noFire(intervalMs, energyCost);
  }
  const damage = Math.max(1, 1 + Math.floor(level / 2));
  const bullet = entityManager.create(
    createBullet(player.position.x, player.position.y + 0.74, BULLET_SPEED * 0.95, Faction.Player, 1700, damage, 0.18, 0, {
      ...buildProjectileMetadata(options, false),
      splitOnImpact: true,
      splitSpec: {
        childCount: 3 + Math.floor(level / 3),
        speedScale: 0.72,
        damageScale: 0.55
      },
      sourceWeaponTag: 'prism-splitter'
    })
  );
  setWeaponProjectileVisual(bullet, 'Prism Splitter');
  if ((options.shotCounter ?? 0) % 6 === 0) {
    const prism = entityManager.create(
      createField(player.position.x + (Math.sin((options.elapsedMs ?? 0) * 0.002) > 0 ? 1 : -1) * 1.2, player.position.y + 3.4, 'time-distortion',
        undefined,
        {
          radius: 0.42,
          lifetimeMs: 3200
        })
    );
    prism.pickupKind = 'prism';
    prism.fieldKind = undefined;
    prism.type = EntityType.Pickup;
    prism.pickupValue = 0;
    prism.velocity.y = -1.4;
  }
  return { fired: true, intervalMs, energyCost, firedRecords: [{ weaponMode: 'Prism Splitter', projectileEntityId: bullet.id }], scoreDelta: 0 };
}

function firePolygonShredder(entityManager: EntityManager, player: PlayerEntity, level: number): ModeFireResult {
  const intervalMs = Math.max(220, 620 - level * 24);
  const energyCost = 8;
  if (!minEnergy(player, energyCost)) {
    return noFire(intervalMs, energyCost);
  }
  const field = entityManager.create(
    createField(player.position.x, player.position.y + 0.2, 'polygon-shredder', Faction.Player, {
      radius: 0.3,
      fieldRadius: 0.8 + level * 0.2,
      fieldStrength: 1 + level * 0.1,
      damage: 2.2 + level * 0.4,
      lifetimeMs: 260,
      ownerId: player.id
    })
  );
  setWeaponFieldVisual(field, 'Polygon Shredder');
  spawnWeaponParticles(entityManager, field.position.x, field.position.y, 'polygon-shard', 8);
  return { fired: true, intervalMs, energyCost, firedRecords: [{ weaponMode: 'Polygon Shredder' }], scoreDelta: 0 };
}

function fireVectorBeam(
  entityManager: EntityManager,
  player: PlayerEntity,
  level: number,
  options: PlayerWeaponSystemOptions,
  conditionalBonuses: ConditionalDerivedBonuses
): ModeFireResult {
  const intervalMs = Math.max(94, 250 - level * 9);
  const energyCost = 6;
  if (!minEnergy(player, energyCost)) {
    return noFire(intervalMs, energyCost);
  }
  const damage = Math.max(1, (2 + level * 0.7) * (1 + conditionalBonuses.damagePercent / 100) * damageScale(options));
  const targets = pickLaserTargets(entityManager, player.position.x, player.position.y, 40, 0.34 + level * 0.03, 1 + Math.floor(level / 3));
  let scoreDelta = 0;
  for (const target of targets) {
    scoreDelta += dealDamage(target, damage);
  }
  spawnLaserBeam(entityManager, player, 120, 40, 0.22, 'vector', 'vector-beam');
  return { fired: true, intervalMs, energyCost, firedRecords: [{ weaponMode: 'Vector Beam' }], scoreDelta };
}

export const WEAPON_MODE_HANDLERS: Record<PlayerWeaponMode, WeaponModeHandler> = {
  'Auto Pulse': fireAutoPulse,
  'Continuous Laser': fireContinuousLaser,
  'Heavy Cannon': fireHeavyCannon,
  'Sine SMG': fireSineSmg,
  'Flak Cannon': fireFlakCannon,
  'Proximity Mines': fireProximityMines,
  'Gravity Bomb': fireGravityBomb,
  'Thermal Napalm Pods': fireThermalNapalmPods,
  'Tesla Arc': fireTeslaArc,
  'Chain Laser': fireChainLaser,
  'Ion Burst': fireIonBurst,
  'Spread Shot': fireSpreadShot,
  'Helix Blaster': fireHelixBlaster,
  'Orbital Drones': fireOrbitalDrones,
  'Rotary Disc Launcher': fireRotaryDiscLauncher,
  'Energy Shield Projector': fireEnergyShieldProjector,
  'Reflector Pulse': fireReflectorPulse,
  'Time Distortion Pulse': fireTimeDistortionPulse,
  'Attack Drone': fireAttackDrone,
  'Interceptor Drone': fireInterceptorDrone,
  'Salvage Drone': fireSalvageDrone,
  'Prism Splitter': firePrismSplitter,
  'Polygon Shredder': firePolygonShredder,
  'Vector Beam': fireVectorBeam
};
