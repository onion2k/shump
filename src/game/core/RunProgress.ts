import type { Entity } from '../ecs/components';
import { gameSettings } from '../config/gameSettings';

export interface RunPlayerState {
  health: number;
  maxHealth: number;
  weaponLevels: Record<string, number>;
  podCount: number;
  podWeaponMode: 'Auto Pulse' | 'Homing Missile';
  moveMaxSpeed: number;
  moveFollowGain: number;
  pickupAttractRange: number;
  pickupAttractPower: number;
  shieldCurrent: number;
  shieldMax: number;
  shieldRechargeDelayMs: number;
  shieldRechargeTimeMs: number;
  shieldRechargeDelayRemainingMs: number;
}

export interface RunProgress {
  seed: number;
  levelId: string;
  roundIndex: number;
  inRunMoney: number;
  foundCards: string[];
  activeCards: string[];
  consumedCards?: string[];
  playerState: RunPlayerState;
  elapsedMs: number;
  distanceTraveled: number;
  score: number;
}

function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

export function createRunPlayerStateFromPlayerEntity(player?: Entity): RunPlayerState {
  const fallbackShieldMax = Math.max(0, gameSettings.player.shield.max);
  const fallbackShieldCurrent = Math.max(0, Math.min(fallbackShieldMax, gameSettings.player.shield.start));
  const fallbackShieldDelay = Math.max(0, gameSettings.player.shield.rechargeDelayMs);

  return {
    health: player?.health ?? 0,
    maxHealth: player?.maxHealth ?? 0,
    weaponLevels: { ...(player?.weaponLevels ?? {}) },
    podCount: Math.max(0, player?.podCount ?? 0),
    podWeaponMode: player?.podWeaponMode === 'Homing Missile' ? 'Homing Missile' : 'Auto Pulse',
    moveMaxSpeed: Math.max(1, player?.moveMaxSpeed ?? gameSettings.player.maxSpeed),
    moveFollowGain: Math.max(0, player?.moveFollowGain ?? gameSettings.player.followGain),
    pickupAttractRange: Math.max(0, player?.pickupAttractRange ?? gameSettings.player.pickupAttraction.range),
    pickupAttractPower: Math.max(0, player?.pickupAttractPower ?? gameSettings.player.pickupAttraction.power),
    shieldCurrent: Math.max(0, Math.min(player?.shieldMax ?? fallbackShieldMax, player?.shieldCurrent ?? fallbackShieldCurrent)),
    shieldMax: Math.max(0, player?.shieldMax ?? fallbackShieldMax),
    shieldRechargeDelayMs: Math.max(0, player?.shieldRechargeDelayMs ?? fallbackShieldDelay),
    shieldRechargeTimeMs: Math.max(1, player?.shieldRechargeTimeMs ?? gameSettings.player.shield.rechargeTimeMs),
    shieldRechargeDelayRemainingMs: Math.max(
      0,
      Math.min(
        player?.shieldRechargeDelayMs ?? fallbackShieldDelay,
        player?.shieldRechargeDelayRemainingMs ?? 0
      )
    )
  };
}

export function createDefaultRunProgress(seed = randomSeed(), playerState?: RunPlayerState): RunProgress {
  return {
    seed,
    levelId: 'level-1',
    roundIndex: 1,
    inRunMoney: 0,
    foundCards: [],
    activeCards: [],
    consumedCards: [],
    playerState: playerState ?? {
      health: 0,
      maxHealth: 0,
      weaponLevels: {},
      podCount: 0,
      podWeaponMode: 'Auto Pulse',
      moveMaxSpeed: Math.max(1, gameSettings.player.maxSpeed),
      moveFollowGain: Math.max(0, gameSettings.player.followGain),
      pickupAttractRange: Math.max(0, gameSettings.player.pickupAttraction.range),
      pickupAttractPower: Math.max(0, gameSettings.player.pickupAttraction.power),
      shieldCurrent: Math.max(0, Math.min(gameSettings.player.shield.max, gameSettings.player.shield.start)),
      shieldMax: Math.max(0, gameSettings.player.shield.max),
      shieldRechargeDelayMs: Math.max(0, gameSettings.player.shield.rechargeDelayMs),
      shieldRechargeTimeMs: Math.max(1, gameSettings.player.shield.rechargeTimeMs),
      shieldRechargeDelayRemainingMs: 0
    },
    elapsedMs: 0,
    distanceTraveled: 0,
    score: 0
  };
}

export function cloneRunProgress(runProgress: RunProgress): RunProgress {
  return {
    ...runProgress,
    foundCards: [...runProgress.foundCards],
    activeCards: [...runProgress.activeCards],
    consumedCards: [...(runProgress.consumedCards ?? [])],
    playerState: {
      health: runProgress.playerState.health,
      maxHealth: runProgress.playerState.maxHealth,
      weaponLevels: { ...runProgress.playerState.weaponLevels },
      podCount: runProgress.playerState.podCount,
      podWeaponMode: runProgress.playerState.podWeaponMode,
      moveMaxSpeed: runProgress.playerState.moveMaxSpeed,
      moveFollowGain: runProgress.playerState.moveFollowGain,
      pickupAttractRange: runProgress.playerState.pickupAttractRange,
      pickupAttractPower: runProgress.playerState.pickupAttractPower,
      shieldCurrent: runProgress.playerState.shieldCurrent,
      shieldMax: runProgress.playerState.shieldMax,
      shieldRechargeDelayMs: runProgress.playerState.shieldRechargeDelayMs,
      shieldRechargeTimeMs: runProgress.playerState.shieldRechargeTimeMs,
      shieldRechargeDelayRemainingMs: runProgress.playerState.shieldRechargeDelayRemainingMs
    }
  };
}
