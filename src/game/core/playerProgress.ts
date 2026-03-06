import type { EntityManager } from '../ecs/EntityManager';
import type { Entity } from '../ecs/components';
import type { RunPlayerState, RunProgress } from './RunProgress';
import { applyCardsToPlayer, captureBaseStateFromPlayer } from '../systems/cardEffectSystem';
import { clamp } from '../util/math';
import { getPlayerWeaponMaxLevel, type PlayerWeaponMode } from '../weapons/playerWeapons';
import type { CardDefinition } from '../content/cards';

export function applyRunPlayerState(player: Entity, playerState: RunPlayerState): void {
  const nextMaxHealth = Math.max(1, playerState.maxHealth);
  player.maxHealth = nextMaxHealth;
  player.health = clamp(playerState.health, 0, nextMaxHealth);

  const mergedWeaponLevels = {
    ...(player.weaponLevels ?? {}),
    ...playerState.weaponLevels
  };
  player.weaponLevels = mergedWeaponLevels;
  if (player.weaponMode) {
    player.weaponLevel = mergedWeaponLevels[player.weaponMode as PlayerWeaponMode] ?? player.weaponLevel ?? 1;
  }

  player.podCount = Math.max(0, playerState.podCount);
  player.podWeaponMode = playerState.podWeaponMode;
  player.moveMaxSpeed = Math.max(1, playerState.moveMaxSpeed);
  player.moveFollowGain = Math.max(0, playerState.moveFollowGain);
  player.pickupAttractRange = Math.max(0, playerState.pickupAttractRange);
  player.pickupAttractPower = Math.max(0, playerState.pickupAttractPower);
  player.shieldMax = Math.max(0, playerState.shieldMax);
  player.shieldCurrent = Math.max(0, Math.min(player.shieldMax, playerState.shieldCurrent));
  player.shieldRechargeDelayMs = Math.max(0, playerState.shieldRechargeDelayMs);
  player.shieldRechargeTimeMs = Math.max(1, playerState.shieldRechargeTimeMs);
  player.shieldRechargeDelayRemainingMs = Math.max(
    0,
    Math.min(player.shieldRechargeDelayMs, playerState.shieldRechargeDelayRemainingMs)
  );
}

export function syncPlayerWithRunProgressCards(
  entities: EntityManager,
  playerId: number,
  runProgress?: RunProgress
): void {
  if (!runProgress) {
    return;
  }

  const player = entities.get(playerId);
  if (!player) {
    return;
  }

  applyCardsToPlayer(player, runProgress.playerState, runProgress.activeCards);
}

export function captureRunProgress(
  entities: EntityManager,
  playerId: number,
  runProgress: RunProgress | undefined,
  elapsedMs: number,
  distanceTraveled: number,
  score: number
): void {
  if (!runProgress) {
    return;
  }

  runProgress.elapsedMs = elapsedMs;
  runProgress.distanceTraveled = distanceTraveled;
  runProgress.score = score;

  const player = entities.get(playerId);
  if (!player) {
    runProgress.playerState = {
      ...runProgress.playerState,
      health: 0
    };
    return;
  }

  runProgress.playerState = captureBaseStateFromPlayer(player, runProgress.activeCards, runProgress.playerState);
}

export function applyConsumableCardUpgrade(runProgress: RunProgress | undefined, card: CardDefinition): void {
  if (!runProgress) {
    return;
  }

  const nextPlayerState: RunPlayerState = {
    ...runProgress.playerState,
    weaponLevels: { ...runProgress.playerState.weaponLevels }
  };

  for (const effect of card.effects) {
    if (effect.kind === 'maxHealth') {
      const nextMaxHealth = Math.max(1, nextPlayerState.maxHealth + effect.amount);
      nextPlayerState.maxHealth = nextMaxHealth;
      nextPlayerState.health = Math.min(nextMaxHealth, nextPlayerState.health + effect.amount);
    }

    if (effect.kind === 'weaponLevel') {
      const currentLevel = nextPlayerState.weaponLevels[effect.weaponMode] ?? 1;
      nextPlayerState.weaponLevels[effect.weaponMode] = Math.min(
        getPlayerWeaponMaxLevel(effect.weaponMode),
        Math.max(1, currentLevel + effect.amount)
      );
    }
  }

  runProgress.playerState = nextPlayerState;
}
