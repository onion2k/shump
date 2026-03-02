import type { Entity } from '../ecs/components';

export interface RunPlayerState {
  health: number;
  maxHealth: number;
  weaponLevels: Record<string, number>;
  podCount: number;
  podWeaponMode: 'Auto Pulse' | 'Homing Missile';
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
  return {
    health: player?.health ?? 0,
    maxHealth: player?.maxHealth ?? 0,
    weaponLevels: { ...(player?.weaponLevels ?? {}) },
    podCount: Math.max(0, player?.podCount ?? 0),
    podWeaponMode: player?.podWeaponMode === 'Homing Missile' ? 'Homing Missile' : 'Auto Pulse'
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
      podWeaponMode: 'Auto Pulse'
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
      podWeaponMode: runProgress.playerState.podWeaponMode
    }
  };
}
