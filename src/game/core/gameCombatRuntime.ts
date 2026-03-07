import type { CollisionPair } from '../systems/collisionSystem';
import type { CardBonuses } from '../systems/cardEffectSystem';
import type { CardRuntimeState } from './cardRuntimeState';
import type { EntityManager } from '../ecs/EntityManager';
import type { PointerState } from '../input/types';
import type { Entity } from '../ecs/components';
import { Faction } from '../ecs/entityTypes';
import { gameSettings } from '../config/gameSettings';
import { applyPlayerInput as applyPointerInputVelocity } from './playerMovement';
import { playerWeaponSystem } from '../systems/playerWeaponSystem';

interface ApplyPlayerInputRuntimeArgs {
  entities: EntityManager;
  playerId: number;
  pointer: PointerState;
  deltaSeconds: number;
  elapsedMs: number;
  bonuses: CardBonuses;
  runtimeState: CardRuntimeState;
}

export function applyPlayerInputRuntime({
  entities,
  playerId,
  pointer,
  deltaSeconds,
  elapsedMs,
  bonuses,
  runtimeState
}: ApplyPlayerInputRuntimeArgs): CardRuntimeState {
  const player = entities.get(playerId);
  if (!player) {
    return runtimeState;
  }

  const cooldowns = runtimeState.perCardProcCooldownUntilMs;
  let nextCooldowns: Map<string, number> | undefined;
  const getTrackedValue = (key: string): number => (nextCooldowns ?? cooldowns).get(key) ?? 0;
  const setTrackedValue = (key: string, value: number) => {
    if (!nextCooldowns) {
      nextCooldowns = new Map(cooldowns);
    }
    nextCooldowns.set(key, value);
  };

  const overclockedThrusters = bonuses.mobilityModifierBonus['overclocked-thrusters'] ?? 0;
  const stabilisedFlight = bonuses.mobilityModifierBonus['stabilised-flight'] ?? 0;
  const slipstreamDrive = bonuses.mobilityModifierBonus['slipstream-drive'] ?? 0;
  const microDash = bonuses.mobilityModifierBonus['micro-dash-system'] ?? 0;
  const chainMomentum = bonuses.conditionalModifierBonus['chain-momentum'] ?? 0;

  const baseMaxSpeed = Math.max(1, player.moveMaxSpeed ?? gameSettings.player.maxSpeed);
  const baseFollowGain = Math.max(0, player.moveFollowGain ?? gameSettings.player.followGain);
  const deltaMs = deltaSeconds * 1000;

  const intendsToMove = pointer.hasPosition && Math.hypot(pointer.x - player.position.x, pointer.y - player.position.y) > 0.45;
  const movingMsKey = '__condition-moving-ms';
  const stillMsKey = '__condition-still-ms';
  const movingMs = intendsToMove ? Math.min(7000, getTrackedValue(movingMsKey) + deltaMs) : Math.max(0, getTrackedValue(movingMsKey) - deltaMs * 1.2);
  const stillMs = intendsToMove ? 0 : Math.min(7000, getTrackedValue(stillMsKey) + deltaMs);
  setTrackedValue(movingMsKey, movingMs);
  setTrackedValue(stillMsKey, stillMs);

  const slipstreamKey = '__mobility-slipstream-ms';
  let slipstreamMs = getTrackedValue(slipstreamKey);
  if (slipstreamDrive > 0 && intendsToMove) {
    slipstreamMs = Math.min(5000, slipstreamMs + deltaMs);
  } else {
    slipstreamMs = Math.max(0, slipstreamMs - deltaMs * 1.6);
  }
  setTrackedValue(slipstreamKey, slipstreamMs);
  const slipstreamPercent = slipstreamDrive > 0 ? Math.min(34, (slipstreamMs / 1000) * 6 * slipstreamDrive) : 0;
  const chainMomentumSpeedPercent = chainMomentum > 0
    ? Math.min(30, runtimeState.chainKillStreak * chainMomentum * 0.5)
    : 0;

  player.moveMaxSpeed = baseMaxSpeed * Math.max(
    0.25,
    1 + (overclockedThrusters + slipstreamPercent + chainMomentumSpeedPercent) / 100
  );
  player.moveFollowGain = baseFollowGain * Math.max(0, 1 + stabilisedFlight / 100);

  if (microDash > 0 && pointer.rightButtonDown && pointer.hasPosition) {
    const dashReadyAtKey = '__mobility-micro-dash-ready-ms';
    const dashReadyAt = getTrackedValue(dashReadyAtKey);
    if (elapsedMs >= dashReadyAt) {
      const dx = pointer.x - player.position.x;
      const dy = pointer.y - player.position.y;
      const mag = Math.hypot(dx, dy) || 1;
      const nx = dx / mag;
      const ny = dy / mag;
      const dashDistance = 1.5 + microDash * 0.45;
      player.position.x += nx * dashDistance;
      player.position.y += ny * dashDistance;
      player.velocity.x += nx * baseMaxSpeed * 1.6;
      player.velocity.y += ny * baseMaxSpeed * 1.6;
      const dashCooldownMs = Math.max(420, 1200 - microDash * 180);
      setTrackedValue(dashReadyAtKey, elapsedMs + dashCooldownMs);
    }
  }

  applyPointerInputVelocity(player, pointer, deltaSeconds);
  player.moveMaxSpeed = baseMaxSpeed;
  player.moveFollowGain = baseFollowGain;

  if (!nextCooldowns) {
    return runtimeState;
  }

  return {
    ...runtimeState,
    perCardProcCooldownUntilMs: nextCooldowns
  };
}

export function applyCardDefenseBeforeDamageRuntime(
  collisions: CollisionPair[],
  entities: EntityManager,
  playerId: number,
  cardBonuses: CardBonuses
): void {
  if (collisions.length === 0) {
    return;
  }

  const player = entities.get(playerId);
  if (!player) {
    return;
  }

  const emergencyShieldActive = (player.statusEffects ?? []).some(
    (effect) => effect.effectId === 'emergency-shield-active' && effect.remainingMs > 0
  );
  const dampenerPercent = Math.max(0, cardBonuses.defenseModifierBonus['kinetic-dampeners'] ?? 0);
  const dampenerScale = Math.max(0.15, 1 - dampenerPercent / 100);

  for (const pair of collisions) {
    if (pair.b.id !== playerId || pair.a.faction !== Faction.Enemy) {
      continue;
    }

    if (emergencyShieldActive) {
      pair.a.damage = 0;
      continue;
    }

    if (dampenerPercent > 0) {
      pair.a.damage = (pair.a.damage ?? 1) * dampenerScale;
    }
  }
}

interface HandlePlayerWeaponsRuntimeArgs {
  entities: EntityManager;
  playerId: number;
  deltaSeconds: number;
  bonuses: CardBonuses;
  runtimeState: CardRuntimeState;
  elapsedMs: number;
  emitWeaponFiredEvent: (
    shooter: Pick<Entity, 'id' | 'faction'>,
    weaponMode: string,
    projectileEntityId?: number
  ) => void;
}

export function handlePlayerWeaponsRuntime({
  entities,
  playerId,
  deltaSeconds,
  bonuses,
  runtimeState,
  elapsedMs,
  emitWeaponFiredEvent
}: HandlePlayerWeaponsRuntimeArgs): { runtimeState: CardRuntimeState; scoreDelta: number } {
  const movingMs = runtimeState.perCardProcCooldownUntilMs.get('__condition-moving-ms') ?? 0;
  const stillMs = runtimeState.perCardProcCooldownUntilMs.get('__condition-still-ms') ?? 0;
  const volatileMisfire = bonuses.conditionalModifierBonus['volatile-ammunition-misfire'] ?? 0;
  let volatileMisfireRoll: number | undefined;
  const player = entities.get(playerId);
  if (player && volatileMisfire > 0 && (player.fireCooldownMs ?? 0) <= 0) {
    volatileMisfireRoll = runtimeState.rng.nextFloat('conditional:volatile-ammunition', Math.floor(elapsedMs));
  }

  const result = playerWeaponSystem(entities, playerId, deltaSeconds, {
    weaponTuningBonuses: bonuses.weaponTuningBonuses,
    weaponAmplifierBonus: bonuses.weaponAmplifierBonus,
    projectileModifierBonus: bonuses.projectileModifierBonus,
    patternModifierBonus: bonuses.patternModifierBonus,
    triggerModifierBonus: bonuses.triggerModifierBonus,
    conditionalModifierBonus: bonuses.conditionalModifierBonus,
    temporaryRoundEffects: runtimeState.temporaryRoundEffects,
    movingMs,
    stillMs,
    consecutiveShootingMs: runtimeState.consecutiveShootingMs,
    chainKillStreak: runtimeState.chainKillStreak,
    shotCounter: runtimeState.shotCounter,
    rapidVentingUntilMs: runtimeState.rapidVentingUntilMs,
    elapsedMs,
    volatileMisfireRoll,
    hitStreak: runtimeState.hitStreak
  });

  const nextPlayer = entities.get(playerId);
  if (nextPlayer) {
    for (const shot of result.fired) {
      emitWeaponFiredEvent(nextPlayer, shot.weaponMode, shot.projectileEntityId);
    }
  }

  return {
    runtimeState,
    scoreDelta: result.scoreDelta
  };
}
