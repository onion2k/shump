import { EntityManager } from '../ecs/EntityManager';
import { EntityType, Faction } from '../ecs/entityTypes';
import { createPlayer } from '../factories/createPlayer';
import { createPod } from '../factories/createPod';
import { SpawnSystem } from '../systems/spawnSystem';
import { movementSystem } from '../systems/movementSystem';
import { shootingSystem } from '../systems/shootingSystem';
import { collisionSystem } from '../systems/collisionSystem';
import { damageSystem } from '../systems/damageSystem';
import { despawnSystem } from '../systems/despawnSystem';
import { playerWeaponSystem } from '../systems/playerWeaponSystem';
import { homingSystem } from '../systems/homingSystem';
import { pickupSystem } from '../systems/pickupSystem';
import { GameState } from './GameState';
import type { Entity } from '../ecs/components';
import type { PointerState } from '../input/types';
import {
  PLAYER_FOLLOW_GAIN,
  PLAYER_MAX_SPEED,
  BULLET_SPEED,
  WORLD_SCROLL_SPEED,
  WORLD_BOUNDS,
  FIXED_TIMESTEP_MS,
  type WorldBounds
} from './constants';
import { clamp } from '../util/math';
import { GameEventBus } from './GameEventBus';
import { createPickup } from '../factories/createPickup';
import { createParticle } from '../factories/createParticle';
import { createBullet } from '../factories/createBullet';
import { createMissile } from '../factories/createMissile';
import { ParticleSystem } from '../particles/particleSystem';
import type { ParticleEmitterConfig } from '../particles/particleSystem';
import { randomRange } from '../util/random';
import { gameSettings } from '../config/gameSettings';
import { getPlayerWeaponMaxLevel, PLAYER_WEAPON_ORDER, type PlayerWeaponMode } from '../weapons/playerWeapons';
import { enemyDropTuning, particleTuning, playerTuning, podTuning } from './gameTuning';
import { findNearestEnemy, normalizeDirection } from './gameEntityHelpers';
import type { EnemyArchetypeId } from '../content/enemyArchetypes';
import type { MovementPatternId } from '../movement/patterns';
import {
  cloneRunProgress,
  createDefaultRunProgress,
  createRunPlayerStateFromPlayerEntity,
  type RunPlayerState,
  type RunProgress
} from './RunProgress';
import {
  ACTIVE_CARD_LIMIT,
  canAcquireCard,
  drawDropCard,
  drawShopOffers,
  isConsumableUpgradeCard,
  resolveCard,
  type CardDefinition
} from '../content/cards';
import { LevelDirector } from './LevelDirector';
import { applyCardsToPlayer, captureBaseStateFromPlayer, computeCardBonuses } from '../systems/cardEffectSystem';

export interface GameSnapshot {
  state: GameState;
  score: number;
  levelId: string;
  roundIndex: number;
  totalRounds: number;
  activeCardLimit: number;
  inRunMoney: number;
  foundCards: string[];
  activeCards: string[];
  playerHealth: number;
  playerMaxHealth: number;
  weaponMode: string;
  weaponLevel: number;
  weaponLevels: Record<PlayerWeaponMode, number>;
  weaponEnergyCurrent: number;
  weaponEnergyMax: number;
  weaponEnergyCost: number;
  weaponFireIntervalMs: number;
  podCount: number;
  podWeaponMode: 'Auto Pulse' | 'Homing Missile';
  distanceTraveled: number;
}

export interface DebugEmitterSettings {
  positionX: number;
  positionY: number;
  directionDegrees: number;
  spreadDegrees: number;
  emitterLifetimeMs: number;
  particleType: string;
  emissionRatePerSecond: number;
  particleLifetimeMs: number;
  particleSpeed: number;
  directionRandomness: number;
  velocityRandomness: number;
  lifetimeRandomness: number;
  particleRadius: number;
  velocityX: number;
  velocityY: number;
}

export interface GpuParticleSpawn {
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifetimeMs: number;
  radius: number;
  particleType: string;
}

export interface GameUpdateOptions {
  runGameplay?: boolean;
  runDebug?: boolean;
}

interface ScheduledEmitter {
  atMs: number;
  config: ParticleEmitterConfig;
}

interface TrailSource {
  x: number;
  y: number;
  vx: number;
  vy: number;
  remainingMs: number;
}

type SnapshotListener = (snapshot: GameSnapshot) => void;

const TARGET_FPS = 60;
const ADAPTIVE_MIN_DENSITY_SCALE = 0.4;
const ADAPTIVE_LOW_FPS_HOLD_MS = 800;
const ADAPTIVE_RECOVERY_HOLD_MS = 1800;
const BASE_ACTIVE_PICKUP_CAP = 18;
const ENEMY_MONEY_REWARD = 2;
const POD_CARD_IDS = ['satellite-bay', 'pulse-relay', 'missile-command'] as const;
const FOUND_CARD_LIMIT = 12;

export class Game {
  readonly entities = new EntityManager();
  readonly spawner = new SpawnSystem();
  readonly events = new GameEventBus();
  readonly particles = new ParticleSystem();
  state = GameState.Boot;
  score = 0;

  private playerId = 0;
  private useGpuParticles = false;
  private gpuParticleSpawns: GpuParticleSpawn[] = [];
  private scheduledEmitters: ScheduledEmitter[] = [];
  private trailSources: TrailSource[] = [];
  private debugEmitterId?: number;
  private debugEmitterEnabled = false;
  private debugModeActive = false;
  private debugEmitterSettings: DebugEmitterSettings = {
    ...gameSettings.particles.debugEmitterDefaults
  };
  private listeners = new Set<SnapshotListener>();
  private playableBounds: WorldBounds = { ...WORLD_BOUNDS };
  private elapsedMs = 0;
  private distanceTraveled = 0;
  private missileThrusterAccumulator = 0;
  private adaptiveDensityEnabled = false;
  private averageFrameMs = FIXED_TIMESTEP_MS;
  private lowFpsAccumulatedMs = 0;
  private recoveryAccumulatedMs = 0;
  private enemyDensityScale = 1;
  private runProgress?: RunProgress;
  private levelDirector = new LevelDirector();

  constructor() {
    this.bootstrap();
  }

  bootstrap() {
    this.runProgress = undefined;
    this.resetWorld();
    this.state = GameState.Boot;
    this.notify();
  }

  startNewRun(seed?: number) {
    this.resetWorld();
    const player = this.entities.get(this.playerId);
    this.runProgress = createDefaultRunProgress(seed, createRunPlayerStateFromPlayerEntity(player));
    this.levelDirector.configure(this.runProgress.levelId, this.runProgress.roundIndex);
    this.runProgress.levelId = this.levelDirector.currentLevelId();
    this.runProgress.roundIndex = this.levelDirector.currentRoundIndex();
    this.spawner.setScriptedWaves(this.levelDirector.currentRound().waves);
    this.syncPlayerWithRunProgressCards();
    this.state = GameState.Playing;
    this.notify();
  }

  startFromRunProgress(runProgress: RunProgress) {
    this.runProgress = cloneRunProgress(runProgress);
    this.levelDirector.configure(this.runProgress.levelId, this.runProgress.roundIndex);
    this.runProgress.levelId = this.levelDirector.currentLevelId();
    this.runProgress.roundIndex = this.levelDirector.currentRoundIndex();
    this.resetWorld(this.runProgress.playerState);
    this.spawner.setScriptedWaves(this.levelDirector.currentRound().waves);
    this.syncPlayerWithRunProgressCards();
    this.elapsedMs = this.runProgress.elapsedMs;
    this.distanceTraveled = this.runProgress.distanceTraveled;
    this.score = this.runProgress.score;
    this.state = GameState.Playing;
    this.notify();
  }

  exportRunProgress(): RunProgress | undefined {
    if (!this.runProgress) {
      return undefined;
    }

    this.captureRunProgress();
    return cloneRunProgress(this.runProgress);
  }

  clearRunProgress() {
    this.runProgress = undefined;
  }

  start() {
    if (this.state === GameState.Boot && !this.runProgress) {
      this.startNewRun();
      return;
    }

    this.state = GameState.Playing;
    this.notify();
  }

  private resetWorld(playerState?: RunPlayerState) {
    this.entities.clear();
    this.particles.clearEmitters();
    this.gpuParticleSpawns = [];
    this.scheduledEmitters = [];
    this.trailSources = [];
    this.debugEmitterId = undefined;
    this.score = 0;
    this.elapsedMs = 0;
    this.distanceTraveled = 0;
    this.missileThrusterAccumulator = 0;
    const player = this.entities.create(createPlayer());
    this.playerId = player.id;
    if (playerState) {
      this.applyRunPlayerState(player, playerState);
    }
    const thrusterSettings = gameSettings.particles.thrusterEmitter;
    this.particles.addEmitter({
      position: { x: player.position.x, y: player.position.y },
      direction: thrusterSettings.directionRadians,
      spread: thrusterSettings.spreadRadians,
      lifetimeMs: thrusterSettings.lifetimeMs,
      particleType: thrusterSettings.particleType,
      emissionRatePerSecond: thrusterSettings.emissionRatePerSecond,
      particleLifetimeMs: thrusterSettings.particleLifetimeMs,
      particleSpeed: thrusterSettings.particleSpeed,
      particleRadius: thrusterSettings.particleRadius,
      positionProvider: () => {
        const currentPlayer = this.entities.get(this.playerId);
        if (!currentPlayer) {
          return { x: 0, y: 0 };
        }

        return {
          x: currentPlayer.position.x,
          y: currentPlayer.position.y + thrusterSettings.offsetY
        };
      },
      velocityProvider: () => {
        const currentPlayer = this.entities.get(this.playerId);
        return currentPlayer?.velocity ?? { x: 0, y: 0 };
      }
    });
    this.spawner.reset();
    this.playableBounds = { ...WORLD_BOUNDS };
  }

  pause() {
    if (this.state !== GameState.Playing) {
      return;
    }

    this.state = GameState.Paused;
    this.notify();
  }

  resume() {
    if (this.state !== GameState.Paused) {
      return;
    }

    this.state = GameState.Playing;
    this.notify();
  }

  togglePause() {
    if (this.state === GameState.Playing) {
      this.pause();
    } else if (this.state === GameState.Paused) {
      this.resume();
    }
  }

  openShop() {
    if (this.state !== GameState.BetweenRounds) {
      return;
    }
    if (this.foundCardsFull()) {
      return;
    }

    this.state = GameState.Shop;
    this.notify();
  }

  closeShop() {
    if (this.state !== GameState.Shop) {
      return;
    }

    this.state = GameState.BetweenRounds;
    this.notify();
  }

  startNextRound() {
    if (this.state !== GameState.BetweenRounds && this.state !== GameState.Shop) {
      return;
    }

    if (this.runProgress) {
      const nextRoundIndex = this.levelDirector.advanceRound();
      this.runProgress.levelId = this.levelDirector.currentLevelId();
      this.runProgress.roundIndex = nextRoundIndex;
      this.spawner.setScriptedWaves(this.levelDirector.currentRound().waves);
    }

    this.state = GameState.Playing;
    this.notify();
  }

  buyCard(cardId: string): boolean {
    if (!this.runProgress) {
      return false;
    }
    if (this.foundCardsFull()) {
      return false;
    }

    const card = resolveCard(cardId);
    if (!card) {
      return false;
    }

    if (!canAcquireCard(cardId, this.runProgress.foundCards, this.runProgress.activeCards, this.runProgress.consumedCards ?? [])) {
      return false;
    }

    if (this.runProgress.inRunMoney < card.cost) {
      return false;
    }

    this.runProgress.inRunMoney -= card.cost;
    this.runProgress.foundCards = [...this.runProgress.foundCards, cardId];
    this.captureRunProgress();
    this.notify();
    return true;
  }

  activateFoundCard(cardId: string): boolean {
    if (!this.runProgress) {
      return false;
    }

    if (!this.runProgress.foundCards.includes(cardId)) {
      return false;
    }

    const card = resolveCard(cardId);
    if (!card) {
      return false;
    }

    const isConsumableUpgrade = isConsumableUpgradeCard(card);

    if (!isConsumableUpgrade && this.runProgress.activeCards.length >= ACTIVE_CARD_LIMIT) {
      return false;
    }

    const foundIndex = this.runProgress.foundCards.indexOf(cardId);
    if (foundIndex < 0) {
      return false;
    }

    this.runProgress.foundCards.splice(foundIndex, 1);
    if (isConsumableUpgrade) {
      this.applyConsumableCardUpgrade(card);
      this.runProgress.consumedCards = [...(this.runProgress.consumedCards ?? []), card.id];
    } else {
      this.runProgress.activeCards = [...this.runProgress.activeCards, cardId];
    }
    this.syncPlayerWithRunProgressCards();
    this.captureRunProgress();
    this.notify();
    return true;
  }

  discardFoundCard(cardId: string): boolean {
    if (!this.runProgress) {
      return false;
    }

    const foundIndex = this.runProgress.foundCards.indexOf(cardId);
    if (foundIndex < 0) {
      return false;
    }

    this.runProgress.foundCards.splice(foundIndex, 1);
    this.captureRunProgress();
    this.notify();
    return true;
  }

  discardActiveCard(cardId: string): boolean {
    if (!this.runProgress) {
      return false;
    }

    const activeIndex = this.runProgress.activeCards.indexOf(cardId);
    if (activeIndex < 0) {
      return false;
    }

    this.runProgress.activeCards.splice(activeIndex, 1);
    this.syncPlayerWithRunProgressCards();
    this.captureRunProgress();
    this.notify();
    return true;
  }

  shopOffers(): CardDefinition[] {
    if (!this.runProgress) {
      return [];
    }

    const offers = drawShopOffers(
      {
        seed: this.runProgress.seed,
        roundIndex: this.runProgress.roundIndex,
        foundCards: this.runProgress.foundCards,
        activeCards: this.runProgress.activeCards,
        consumedCards: this.runProgress.consumedCards ?? []
      },
      3
    );

    const ownsPodCard = [...this.runProgress.foundCards, ...this.runProgress.activeCards].some((cardId) =>
      resolveCard(cardId)?.tags.includes('pod')
    );
    const hasPodOffer = offers.some((card) => card.tags.includes('pod'));

    if (!ownsPodCard && !hasPodOffer) {
      const guaranteedPod = POD_CARD_IDS.map((cardId) => resolveCard(cardId))
        .find(
          (card) =>
            card
            && this.runProgress
            && this.runProgress.roundIndex >= card.unlockRound
            && canAcquireCard(card.id, this.runProgress.foundCards, this.runProgress.activeCards, this.runProgress.consumedCards ?? [])
        );

      if (guaranteedPod) {
        if (offers.length >= 3) {
          offers[offers.length - 1] = guaranteedPod;
        } else {
          offers.push(guaranteedPod);
        }
      }
    }

    return offers;
  }

  restart() {
    this.startNewRun();
  }

  reportFrameDelta(deltaSeconds: number) {
    if (!this.adaptiveDensityEnabled) {
      return;
    }

    const sampleMs = clamp(deltaSeconds * 1000, 1, 250);
    const smoothing = 0.08;
    this.averageFrameMs += (sampleMs - this.averageFrameMs) * smoothing;
    const fps = 1000 / Math.max(1, this.averageFrameMs);

    if (fps < TARGET_FPS) {
      this.lowFpsAccumulatedMs += sampleMs;
      this.recoveryAccumulatedMs = Math.max(0, this.recoveryAccumulatedMs - sampleMs * 0.25);
    } else if (fps > TARGET_FPS + 2) {
      this.recoveryAccumulatedMs += sampleMs;
      this.lowFpsAccumulatedMs = Math.max(0, this.lowFpsAccumulatedMs - sampleMs * 0.5);
    } else {
      this.lowFpsAccumulatedMs = Math.max(0, this.lowFpsAccumulatedMs - sampleMs * 0.2);
      this.recoveryAccumulatedMs = Math.max(0, this.recoveryAccumulatedMs - sampleMs * 0.2);
    }

    if (this.lowFpsAccumulatedMs >= ADAPTIVE_LOW_FPS_HOLD_MS && this.enemyDensityScale > ADAPTIVE_MIN_DENSITY_SCALE) {
      this.enemyDensityScale = Math.max(ADAPTIVE_MIN_DENSITY_SCALE, this.enemyDensityScale - 0.1);
      this.lowFpsAccumulatedMs = ADAPTIVE_LOW_FPS_HOLD_MS * 0.35;
      this.recoveryAccumulatedMs = 0;
    } else if (this.recoveryAccumulatedMs >= ADAPTIVE_RECOVERY_HOLD_MS && this.enemyDensityScale < 1) {
      this.enemyDensityScale = Math.min(1, this.enemyDensityScale + 0.08);
      this.recoveryAccumulatedMs = ADAPTIVE_RECOVERY_HOLD_MS * 0.35;
      this.lowFpsAccumulatedMs = 0;
    }
  }

  update(deltaSeconds: number, pointer: PointerState, options: GameUpdateOptions = {}) {
    const runGameplay = options.runGameplay ?? true;
    const runDebug = options.runDebug ?? true;

    if (!runGameplay && runDebug && this.debugModeActive) {
      this.syncDebugEmitter();
      this.tickDebugEmitter(deltaSeconds);
      this.notify();
      return;
    }

    if (this.state !== GameState.Playing) {
      if (runDebug && this.state === GameState.Paused && this.debugModeActive) {
        this.syncDebugEmitter();
        this.tickDebugEmitter(deltaSeconds);
        this.notify();
      }
      return;
    }

    this.elapsedMs += deltaSeconds * 1000;
    this.distanceTraveled += WORLD_SCROLL_SPEED * deltaSeconds;
    this.updateTrailSources(deltaSeconds);
    this.applyPlayerInput(pointer, deltaSeconds);
    this.handlePlayerWeapons(deltaSeconds);
    this.spawner.tick(this.entities, deltaSeconds, this.playableBounds, this.distanceTraveled, {
      enemyDensityScale: this.getEnemyDensityScale()
    });
    this.flushScheduledEmitters();
    this.syncDebugEmitter();
    this.particles.tick(this.entities, deltaSeconds, this.useGpuParticles ? this.handleParticleSpawn : undefined);
    shootingSystem(this.entities, deltaSeconds);
    homingSystem(this.entities, deltaSeconds);
    movementSystem(this.entities.all(), deltaSeconds);
    this.clampPlayerToBounds();
    this.syncPodsWithPlayer(deltaSeconds);
    this.handlePodWeapons(deltaSeconds);
    this.emitMissileThrusterParticles(deltaSeconds);
    const collisions = collisionSystem(this.entities.all());
    this.score += damageSystem(collisions);
    const pickupResult = pickupSystem(this.entities, this.playerId);
    this.score += pickupResult.scoreDelta;
    for (const collection of pickupResult.collections) {
      this.handleProgressCollection(collection.pickupKind, collection.pickupValue, collection.pickupCardId);
      this.events.emit({
        type: 'PickupCollected',
        atMs: this.elapsedMs,
        collectorId: this.playerId,
        pickupId: collection.pickupId,
        pickupKind: collection.pickupKind,
        pickupWeaponMode: collection.pickupWeaponMode,
        pickupCardId: collection.pickupCardId
      });
    }
    const despawned = despawnSystem(this.entities, deltaSeconds, this.playableBounds);

    let activePickups = this.countActivePickups();
    for (const { entity, reason } of despawned) {
      if (reason === 'health' && entity.type === EntityType.Enemy) {
        this.addRunMoney(ENEMY_MONEY_REWARD, 'kill');
        this.spawnEnemyExplosion(entity.position.x, entity.position.y);
        if (this.shouldSpawnDropPickup(entity.id, enemyDropTuning.healthDropModulo, activePickups, 17)) {
          this.entities.create(
            createPickup(entity.position.x, entity.position.y, 'health', enemyDropTuning.healthPickupValue)
          );
          activePickups += 1;
        }
        if (this.shouldSpawnDropPickup(entity.id, enemyDropTuning.weaponDropModulo, activePickups, 53)) {
          this.entities.create(
            createPickup(
              entity.position.x,
              entity.position.y,
              'weapon',
              enemyDropTuning.weaponPickupValue,
              enemyDropTuning.weaponPickupLifetimeMs,
              this.pickWeaponPickupMode(entity.id)
            )
          );
          activePickups += 1;
        }
        if (this.shouldSpawnDropPickup(entity.id, 3, activePickups, 91)) {
          this.entities.create(createPickup(entity.position.x, entity.position.y, 'money', 6, 6000));
          activePickups += 1;
        }
        if (this.shouldSpawnDropPickup(entity.id, 11, activePickups, 113)) {
          this.entities.create(
            createPickup(entity.position.x, entity.position.y, 'card', 1, 7000, undefined, this.pickCardDropId(entity.id))
          );
          activePickups += 1;
        }
      }

      this.events.emit({
        type: 'EntityDestroyed',
        atMs: this.elapsedMs,
        entityId: entity.id,
        entityType: entity.type,
        positionX: entity.position.x,
        positionY: entity.position.y,
        entityFaction: entity.faction,
        reason,
        scoreValue: entity.scoreValue
      });
    }

    const player = this.entities.get(this.playerId);
    if (!player || player.health <= 0) {
      this.state = GameState.GameOver;
    }

    if (this.state === GameState.Playing && !this.spawner.hasPendingSpawns() && this.countLiveEnemies() === 0) {
      this.enterBetweenRounds();
    }

    this.captureRunProgress();
    this.notify();
  }

  snapshot(): GameSnapshot {
    const player = this.entities.get(this.playerId);
    const runProgress = this.runProgress;
    const playerWeaponLevels = player?.weaponLevels ?? {};
    const snapshotWeaponLevels = Object.fromEntries(
      PLAYER_WEAPON_ORDER.map((mode) => [mode, Math.max(1, playerWeaponLevels[mode] ?? 1)])
    ) as Record<PlayerWeaponMode, number>;
    return {
      state: this.state,
      score: this.score,
      levelId: runProgress?.levelId ?? 'level-1',
      roundIndex: runProgress?.roundIndex ?? 0,
      totalRounds: this.levelDirector.totalRounds(),
      activeCardLimit: ACTIVE_CARD_LIMIT,
      inRunMoney: runProgress?.inRunMoney ?? 0,
      foundCards: runProgress ? [...runProgress.foundCards] : [],
      activeCards: runProgress ? [...runProgress.activeCards] : [],
      playerHealth: player?.health ?? 0,
      playerMaxHealth: player?.maxHealth ?? 0,
      weaponMode: player?.weaponMode ?? 'Unknown',
      weaponLevel: player?.weaponLevel ?? 0,
      weaponLevels: snapshotWeaponLevels,
      weaponEnergyCurrent: player?.weaponEnergy ?? 0,
      weaponEnergyMax: player?.weaponEnergyMax ?? 0,
      weaponEnergyCost: player?.weaponEnergyCost ?? 0,
      weaponFireIntervalMs: player?.weaponFireIntervalMs ?? 0,
      podCount: Math.max(0, player?.podCount ?? 0),
      podWeaponMode: player?.podWeaponMode === 'Homing Missile' ? 'Homing Missile' : 'Auto Pulse',
      distanceTraveled: this.distanceTraveled
    };
  }

  private applyRunPlayerState(player: Entity, playerState: RunPlayerState) {
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
  }

  private syncPlayerWithRunProgressCards() {
    if (!this.runProgress) {
      return;
    }

    const player = this.entities.get(this.playerId);
    if (!player) {
      return;
    }

    applyCardsToPlayer(player, this.runProgress.playerState, this.runProgress.activeCards);
  }

  private captureRunProgress() {
    if (!this.runProgress) {
      return;
    }

    this.runProgress.elapsedMs = this.elapsedMs;
    this.runProgress.distanceTraveled = this.distanceTraveled;
    this.runProgress.score = this.score;

    const player = this.entities.get(this.playerId);
    if (!player) {
      this.runProgress.playerState = {
        ...this.runProgress.playerState,
        health: 0
      };
      return;
    }

    this.runProgress.playerState = captureBaseStateFromPlayer(
      player,
      this.runProgress.activeCards,
      this.runProgress.playerState
    );
  }

  private applyPlayerInput(pointer: PointerState, deltaSeconds: number) {
    const player = this.entities.get(this.playerId);
    if (!player) {
      return;
    }

    if (!pointer.hasPosition) {
      player.velocity.x = 0;
      player.velocity.y = 0;
      return;
    }

    const dx = pointer.x - player.position.x;
    const dy = pointer.y - player.position.y;
    const mag = Math.hypot(dx, dy) || 1;
    const speedFromDistance = mag * PLAYER_FOLLOW_GAIN;
    const maxSpeedWithoutOvershoot = deltaSeconds > 0 ? mag / deltaSeconds : PLAYER_MAX_SPEED;
    const speed = Math.min(PLAYER_MAX_SPEED, speedFromDistance, maxSpeedWithoutOvershoot);

    player.velocity.x = clamp((dx / mag) * speed, -PLAYER_MAX_SPEED, PLAYER_MAX_SPEED);
    player.velocity.y = clamp((dy / mag) * speed, -PLAYER_MAX_SPEED, PLAYER_MAX_SPEED);
  }

  entitiesForRender() {
    return this.entities.all().map((entity) => ({
      id: entity.id,
      type: entity.type,
      faction: entity.faction,
      health: entity.health,
      maxHealth: entity.maxHealth,
      enemyArchetype: entity.enemyArchetype as EnemyArchetypeId | undefined,
      movementPattern: entity.movementPattern as MovementPatternId | undefined,
      patternAmplitude: entity.patternAmplitude,
      patternFrequency: entity.patternFrequency,
      movementParams: entity.movementParams,
      spawnX: entity.spawnX,
      spawnY: entity.spawnY,
      pickupKind: entity.pickupKind,
      pickupWeaponMode: entity.pickupWeaponMode,
      pickupCardId: entity.pickupCardId,
      projectileKind: entity.projectileKind,
      projectileSpeed: entity.projectileSpeed,
      radius: entity.radius,
      vx: entity.velocity.x,
      vy: entity.velocity.y,
      particleType: entity.particleType,
      ageMs: entity.ageMs,
      lifetimeMs: entity.lifetimeMs,
      x: entity.position.x,
      y: entity.position.y
    }));
  }

  countByType(type: EntityType): number {
    return this.entities.all().filter((entity) => entity.type === type).length;
  }

  setPlayableBounds(bounds: WorldBounds) {
    this.playableBounds = bounds;
  }

  setAdaptiveDensityEnabled(enabled: boolean) {
    this.adaptiveDensityEnabled = enabled;
    if (!enabled) {
      this.averageFrameMs = FIXED_TIMESTEP_MS;
      this.lowFpsAccumulatedMs = 0;
      this.recoveryAccumulatedMs = 0;
      this.enemyDensityScale = 1;
    }
  }

  setUseGpuParticles(enabled: boolean) {
    this.useGpuParticles = enabled;
    if (enabled) {
      for (const entity of this.entities.all()) {
        if (entity.type === EntityType.Particle) {
          this.entities.remove(entity.id);
        }
      }
    } else {
      this.gpuParticleSpawns = [];
    }
  }

  consumeGpuParticleSpawns(): GpuParticleSpawn[] {
    if (this.gpuParticleSpawns.length === 0) {
      return [];
    }

    const batch = this.gpuParticleSpawns;
    this.gpuParticleSpawns = [];
    return batch;
  }

  setDebugEmitterEnabled(enabled: boolean) {
    this.debugEmitterEnabled = enabled;
    this.syncDebugEmitter();
  }

  setDebugModeActive(active: boolean) {
    this.debugModeActive = active;
  }

  selectWeaponBySlot(slot: number): boolean {
    const player = this.entities.get(this.playerId);
    if (!player) {
      return false;
    }

    const selectedMode = PLAYER_WEAPON_ORDER[slot - 1];
    if (!selectedMode) {
      return false;
    }

    const unlocked = player.unlockedWeaponModes ?? [];
    if (!unlocked.includes(selectedMode)) {
      return false;
    }

    const levels = player.weaponLevels ?? {};
    const maxLevel = getPlayerWeaponMaxLevel(selectedMode);
    const currentLevel = levels[selectedMode] ?? 1;

    if (player.weaponMode === selectedMode) {
      const nextLevel = currentLevel >= maxLevel ? 1 : currentLevel + 1;
      levels[selectedMode] = nextLevel;
      player.weaponLevels = levels;
      player.weaponLevel = nextLevel;
      player.fireCooldownMs = 0;
      this.notify();
      return true;
    }

    player.weaponMode = selectedMode;
    player.fireCooldownMs = 0;
    player.weaponLevels = levels;
    player.weaponLevel = Math.min(currentLevel, maxLevel);
    this.notify();
    return true;
  }

  cyclePods(): number {
    const player = this.entities.get(this.playerId);
    if (!player) {
      return 0;
    }

    player.podCount = ((player.podCount ?? 0) + 1) % (podTuning.maxCount + 1);
    this.syncPodsWithPlayer(0);
    this.notify();
    return player.podCount;
  }

  togglePodWeaponMode(): 'Auto Pulse' | 'Homing Missile' {
    const player = this.entities.get(this.playerId);
    if (!player) {
      return 'Auto Pulse';
    }

    player.podWeaponMode = player.podWeaponMode === 'Homing Missile' ? 'Auto Pulse' : 'Homing Missile';
    this.notify();
    return player.podWeaponMode;
  }

  setDebugEmitterSettings(settings: Partial<DebugEmitterSettings>) {
    this.debugEmitterSettings = {
      ...this.debugEmitterSettings,
      ...settings
    };
    this.syncDebugEmitter();
  }

  private handlePlayerWeapons(deltaSeconds: number) {
    const result = playerWeaponSystem(this.entities, this.playerId, deltaSeconds);
    this.score += result.scoreDelta;

    const player = this.entities.get(this.playerId);
    if (!player) {
      return;
    }

    for (const shot of result.fired) {
      if (shot.weaponMode === 'Continuous Laser') {
        this.spawnLaserFocusEmitter(player.position.x, player.position.y + 0.95, player.velocity.x, player.velocity.y);
      }

      this.emitWeaponFiredEvent(player, shot.weaponMode, shot.projectileEntityId);
    }
  }

  private getEnemyDensityScale(): number {
    return this.adaptiveDensityEnabled ? this.enemyDensityScale : 1;
  }

  private countLiveEnemies(): number {
    return this.entities
      .all()
      .filter((entity) => entity.type === EntityType.Enemy && entity.health > 0).length;
  }

  enterBetweenRounds(): boolean {
    if (!this.runProgress || this.state !== GameState.Playing) {
      return false;
    }

    this.state = GameState.BetweenRounds;
    return true;
  }

  private addRunMoney(amount: number, source: 'kill' | 'pickup' = 'pickup') {
    if (!this.runProgress || amount <= 0) {
      return;
    }

    const bonuses = computeCardBonuses(this.runProgress.activeCards);
    const scaled = Math.round(amount * (1 + bonuses.moneyMultiplierPercent / 100));
    const killBonus = source === 'kill' ? bonuses.killMoneyFlatBonus : 0;
    this.runProgress.inRunMoney += Math.max(1, scaled + killBonus);
  }

  private handleProgressCollection(kind: string, value: number, pickupCardId?: string) {
    if (!this.runProgress) {
      return;
    }

    if (kind === 'money') {
      this.addRunMoney(Math.max(0, value), 'pickup');
      return;
    }

    if (
      kind === 'card'
      && pickupCardId
      && !this.foundCardsFull()
      && canAcquireCard(pickupCardId, this.runProgress.foundCards, this.runProgress.activeCards, this.runProgress.consumedCards ?? [])
    ) {
      this.runProgress.foundCards = [...this.runProgress.foundCards, pickupCardId];
    }
  }

  private foundCardsFull(): boolean {
    if (!this.runProgress) {
      return false;
    }
    return this.runProgress.foundCards.length >= FOUND_CARD_LIMIT;
  }

  private applyConsumableCardUpgrade(card: CardDefinition) {
    if (!this.runProgress) {
      return;
    }

    const nextPlayerState: RunPlayerState = {
      ...this.runProgress.playerState,
      weaponLevels: { ...this.runProgress.playerState.weaponLevels }
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

    this.runProgress.playerState = nextPlayerState;
  }

  private countActivePickups(): number {
    return this.entities.all().filter((entity) => entity.type === EntityType.Pickup).length;
  }

  private shouldSpawnDropPickup(entityId: number, modulo: number, activePickups: number, salt: number): boolean {
    if (entityId % modulo !== 0) {
      return false;
    }

    const densityScale = this.getEnemyDensityScale();
    const activePickupCap = Math.max(3, Math.floor(BASE_ACTIVE_PICKUP_CAP * densityScale));
    if (activePickups >= activePickupCap) {
      return false;
    }

    if (densityScale >= 0.999) {
      return true;
    }

    return deterministicRoll(entityId, salt) <= densityScale;
  }

  private syncPodsWithPlayer(deltaSeconds: number) {
    const player = this.entities.get(this.playerId);
    if (!player) {
      return;
    }

    const desiredCount = clamp(player.podCount ?? 0, 0, podTuning.maxCount);
    player.podCount = desiredCount;
    const existingPods = this.getEntitiesByType(EntityType.Pod);

    for (const pod of existingPods) {
      if ((pod.podIndex ?? -1) >= desiredCount) {
        this.entities.remove(pod.id);
      }
    }

    const activePods = this.getPodsSortedByIndex();

    for (let index = 0; index < desiredCount; index += 1) {
      if (activePods.some((pod) => pod.podIndex === index)) {
        continue;
      }
      this.entities.create(createPod(index, player.position.x, player.position.y));
    }

    if (desiredCount === 0) {
      return;
    }

    const pods = this.getPodsSortedByIndex();
    const orbitSeconds = this.elapsedMs * 0.001;
    const orbitAngularSpeed = podTuning.orbitAngularSpeed;
    const orbitRadius = podTuning.orbitRadius;

    for (const pod of pods) {
      const index = pod.podIndex ?? 0;
      const angle = orbitSeconds * orbitAngularSpeed + (index / desiredCount) * Math.PI * 2;
      pod.position.x = player.position.x + Math.cos(angle) * orbitRadius;
      pod.position.y = player.position.y + podTuning.orbitYOffset + Math.sin(angle) * orbitRadius * podTuning.orbitVerticalScale;
      pod.velocity.x = 0;
      pod.velocity.y = 0;
      pod.fireCooldownMs = (pod.fireCooldownMs ?? 0) - deltaSeconds * 1000;
    }
  }

  private handlePodWeapons(deltaSeconds: number) {
    if (deltaSeconds <= 0) {
      return;
    }

    const player = this.entities.get(this.playerId);
    if (!player) {
      return;
    }

    const podWeaponMode = player.podWeaponMode ?? 'Auto Pulse';
    const pods = this.getEntitiesByType(EntityType.Pod);
    if (pods.length === 0) {
      return;
    }

    for (const pod of pods) {
      if ((pod.fireCooldownMs ?? 0) > 0) {
        continue;
      }

      const target = findNearestEnemy(this.entities.all(), pod.position.x, pod.position.y);
      const direction = normalizeDirection(
        target ? target.position.x - pod.position.x : 0,
        target ? target.position.y - pod.position.y : 1
      );

      if (podWeaponMode === 'Homing Missile') {
        const missileSpeed = podTuning.homingMissileSpeed;
        const missile = this.entities.create(
          createMissile(
            pod.position.x,
            pod.position.y,
            direction.x * missileSpeed,
            direction.y * missileSpeed,
            Faction.Player,
            target?.id
          )
        );
        pod.fireCooldownMs = podTuning.homingMissileCooldownMs;
        this.emitWeaponFiredEvent(player, 'Pod Homing Missile', missile.id);
        continue;
      }

      const pulseSpeed = BULLET_SPEED * podTuning.pulseSpeedMultiplier;
      const bullet = this.entities.create(
        createBullet(
          pod.position.x,
          pod.position.y,
          direction.y * pulseSpeed,
          Faction.Player,
          podTuning.pulseLifetimeMs,
          podTuning.pulseDamage,
          podTuning.pulseRadius,
          direction.x * pulseSpeed
        )
      );
      pod.fireCooldownMs = podTuning.pulseCooldownMs;
      this.emitWeaponFiredEvent(player, 'Pod Auto Pulse', bullet.id);
    }
  }

  private clampPlayerToBounds() {
    const player = this.entities.get(this.playerId);
    if (!player) {
      return;
    }

    player.position.x = clamp(
      player.position.x,
      this.playableBounds.left + playerTuning.boundsPadding,
      this.playableBounds.right - playerTuning.boundsPadding
    );
    player.position.y = clamp(
      player.position.y,
      this.playableBounds.bottom + playerTuning.boundsPadding,
      this.playableBounds.top - playerTuning.boundsPadding
    );
  }

  private pickWeaponPickupMode(seed: number): PlayerWeaponMode {
    const nonDefaultModes = PLAYER_WEAPON_ORDER.slice(1);
    return nonDefaultModes[seed % nonDefaultModes.length];
  }

  private pickCardDropId(seed: number): string {
    if (!this.runProgress) {
      return 'reinforced-hull';
    }

    const card = drawDropCard({
      seed: this.runProgress.seed + seed * 31,
      roundIndex: this.runProgress.roundIndex,
      foundCards: this.runProgress.foundCards,
      activeCards: this.runProgress.activeCards,
      consumedCards: this.runProgress.consumedCards ?? []
    });
    return card?.id ?? 'reinforced-hull';
  }

  private getPodsSortedByIndex() {
    return this.getEntitiesByType(EntityType.Pod).sort((a, b) => (a.podIndex ?? 0) - (b.podIndex ?? 0));
  }

  private getEntitiesByType(type: EntityType) {
    return this.entities.all().filter((entity) => entity.type === type);
  }

  private syncDebugEmitter() {
    if (!this.debugEmitterEnabled) {
      if (typeof this.debugEmitterId === 'number') {
        this.particles.removeEmitter(this.debugEmitterId);
        this.debugEmitterId = undefined;
      }
      return;
    }

    const config = this.buildDebugEmitterConfig();
    if (typeof this.debugEmitterId === 'number') {
      const updated = this.particles.updateEmitter(this.debugEmitterId, config);
      if (updated) {
        return;
      }
    }

    this.debugEmitterId = this.particles.addEmitter(config);
  }

  private flushScheduledEmitters() {
    if (this.scheduledEmitters.length === 0) {
      return;
    }

    const remaining: ScheduledEmitter[] = [];
    for (const scheduled of this.scheduledEmitters) {
      if (scheduled.atMs <= this.elapsedMs) {
        this.particles.addEmitter(scheduled.config);
      } else {
        remaining.push(scheduled);
      }
    }
    this.scheduledEmitters = remaining;
  }

  private scheduleEmitter(delayMs: number, config: ParticleEmitterConfig) {
    this.scheduledEmitters.push({
      atMs: this.elapsedMs + delayMs,
      config
    });
  }

  private updateTrailSources(deltaSeconds: number) {
    if (this.trailSources.length === 0) {
      return;
    }

    const deltaMs = deltaSeconds * 1000;
    const next: TrailSource[] = [];
    for (const source of this.trailSources) {
      source.remainingMs -= deltaMs;
      if (source.remainingMs <= 0) {
        continue;
      }

      source.x += source.vx * deltaSeconds;
      source.y += source.vy * deltaSeconds;
      next.push(source);
    }

    this.trailSources = next;
  }

  private spawnEnemyExplosion(x: number, y: number) {
    const explosion = gameSettings.particles.explosion;
    const fireBurst = explosion.fireBurst;
    const smokeBurst = explosion.smokeBurst;
    const shards = explosion.shards;
    const trail = explosion.trail;

    this.particles.addEmitter({
      position: { x, y },
      direction: 0,
      spread: Math.PI * 2,
      directionRandomness: fireBurst.directionRandomness,
      lifetimeMs: fireBurst.emitterLifetimeMs,
      particleType: 'fire',
      emissionRatePerSecond: fireBurst.emissionRatePerSecond,
      particleLifetimeMs: fireBurst.particleLifetimeMs,
      particleSpeed: fireBurst.particleSpeed,
      lifetimeRandomness: fireBurst.lifetimeRandomness,
      velocityRandomness: fireBurst.velocityRandomness,
      particleRadius: fireBurst.particleRadius
    });

    this.scheduleEmitter(smokeBurst.delayMs, {
      position: { x, y },
      direction: 0,
      spread: Math.PI * 2,
      directionRandomness: smokeBurst.directionRandomness,
      lifetimeMs: smokeBurst.emitterLifetimeMs,
      particleType: 'smoke',
      emissionRatePerSecond: smokeBurst.emissionRatePerSecond,
      particleLifetimeMs: smokeBurst.particleLifetimeMs,
      particleSpeed: smokeBurst.particleSpeed,
      lifetimeRandomness: smokeBurst.lifetimeRandomness,
      velocityRandomness: smokeBurst.velocityRandomness,
      particleRadius: smokeBurst.particleRadius
    });

    for (let i = 0; i < shards.count; i += 1) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(shards.speedMin, shards.speedMax);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const shardLifetimeMs = randomRange(shards.lifetimeMinMs, shards.lifetimeMaxMs);

      this.emitOneShotParticle(
        createParticle(x, y, vx, vy, 'enemy-shard', shardLifetimeMs, randomRange(shards.radiusMin, shards.radiusMax))
      );

      const trailSource: TrailSource = { x, y, vx, vy, remainingMs: shardLifetimeMs };
      this.trailSources.push(trailSource);
      this.particles.addEmitter({
        position: { x, y },
        direction: Math.atan2(vy, vx),
        spread: trail.spreadRadians,
        directionRandomness: trail.directionRandomness,
        lifetimeMs: shardLifetimeMs,
        particleType: 'fire',
        emissionRatePerSecond: trail.emissionRatePerSecond,
        particleLifetimeMs: trail.particleLifetimeMs,
        particleSpeed: trail.particleSpeed,
        lifetimeRandomness: trail.lifetimeRandomness,
        velocityRandomness: trail.velocityRandomness,
        particleRadius: trail.particleRadius,
        positionProvider: () => ({ x: trailSource.x, y: trailSource.y }),
        velocityProvider: () => ({
          x: trailSource.vx * trail.inheritVelocityFactor,
          y: trailSource.vy * trail.inheritVelocityFactor
        })
      });
    }
  }

  private spawnLaserFocusEmitter(x: number, y: number, vx: number, vy: number) {
    const laserFocus = particleTuning.laserFocus;
    this.particles.addEmitter({
      position: { x, y },
      direction: laserFocus.directionRadians,
      spread: laserFocus.spreadRadians,
      directionRandomness: laserFocus.directionRandomness,
      lifetimeMs: laserFocus.lifetimeMs,
      particleType: 'laser-focus',
      emissionRatePerSecond: laserFocus.emissionRatePerSecond,
      particleLifetimeMs: laserFocus.particleLifetimeMs,
      particleSpeed: laserFocus.particleSpeed,
      lifetimeRandomness: laserFocus.lifetimeRandomness,
      velocityRandomness: laserFocus.velocityRandomness,
      particleRadius: laserFocus.particleRadius,
      velocityProvider: () => ({ x: vx * laserFocus.inheritedVelocityFactor, y: vy * laserFocus.inheritedVelocityFactor })
    });
  }

  private emitMissileThrusterParticles(deltaSeconds: number) {
    const missileThruster = particleTuning.missileThruster;
    this.missileThrusterAccumulator += deltaSeconds * missileThruster.spawnRatePerSecond;
    const spawnSteps = Math.floor(this.missileThrusterAccumulator);
    if (spawnSteps <= 0) {
      return;
    }
    this.missileThrusterAccumulator -= spawnSteps;

    const missiles = this.entities
      .all()
      .filter((entity) => entity.type === EntityType.Bullet && entity.projectileKind === 'missile' && entity.faction === Faction.Player);

    for (const missile of missiles) {
      const velocity = normalizeDirection(missile.velocity.x, missile.velocity.y);
      for (let i = 0; i < spawnSteps; i += 1) {
        const spread = randomRange(missileThruster.spreadMin, missileThruster.spreadMax);
        const backwardX = -velocity.x + spread;
        const backwardY = -velocity.y + spread * missileThruster.spreadVerticalScale;
        const trailDirection = normalizeDirection(backwardX, backwardY);
        const spawnX = missile.position.x - velocity.x * missileThruster.spawnOffset;
        const spawnY = missile.position.y - velocity.y * missileThruster.spawnOffset;
        this.emitOneShotParticle(
          createParticle(
            spawnX,
            spawnY,
            trailDirection.x * missileThruster.particleSpeed + missile.velocity.x * missileThruster.inheritedVelocityFactor,
            trailDirection.y * missileThruster.particleSpeed + missile.velocity.y * missileThruster.inheritedVelocityFactor,
            'missile-thruster',
            randomRange(missileThruster.lifetimeMinMs, missileThruster.lifetimeMaxMs),
            randomRange(missileThruster.radiusMin, missileThruster.radiusMax)
          )
        );
      }
    }
  }

  private emitOneShotParticle(particle: Omit<Entity, 'id'>) {
    if (this.useGpuParticles) {
      this.handleParticleSpawn(particle);
      return;
    }

    this.entities.create(particle);
  }

  private handleParticleSpawn = (particle: Omit<Entity, 'id'>) => {
    this.gpuParticleSpawns.push({
      x: particle.position.x,
      y: particle.position.y,
      vx: particle.velocity.x,
      vy: particle.velocity.y,
      lifetimeMs: particle.lifetimeMs ?? 300,
      radius: particle.radius,
      particleType: particle.particleType ?? 'default'
    });
  };

  private buildDebugEmitterConfig(): ParticleEmitterConfig {
    const toRadians = Math.PI / 180;
    const settings = this.debugEmitterSettings;

    return {
      position: { x: settings.positionX, y: settings.positionY },
      direction: settings.directionDegrees * toRadians,
      spread: Math.max(0, settings.spreadDegrees) * toRadians,
      directionRandomness: Math.max(0, settings.directionRandomness),
      lifetimeMs: Math.max(1, settings.emitterLifetimeMs),
      particleType: settings.particleType,
      emissionRatePerSecond: Math.max(0, settings.emissionRatePerSecond),
      particleLifetimeMs: Math.max(1, settings.particleLifetimeMs),
      lifetimeRandomness: Math.max(0, settings.lifetimeRandomness),
      particleSpeed: settings.particleSpeed,
      velocityRandomness: Math.max(0, settings.velocityRandomness),
      particleRadius: Math.max(0.01, settings.particleRadius),
      velocityProvider: () => ({ x: settings.velocityX, y: settings.velocityY })
    };
  }

  private tickDebugEmitter(deltaSeconds: number) {
    const debugEmitterId = this.debugEmitterId;
    if (typeof debugEmitterId !== 'number') {
      return;
    }

    this.particles.tick(
      this.entities,
      deltaSeconds,
      this.useGpuParticles ? this.handleParticleSpawn : undefined,
      (id) => id === debugEmitterId
    );
  }

  private emitWeaponFiredEvent(
    shooter: Pick<Entity, 'id' | 'faction'>,
    weaponMode: string,
    projectileEntityId?: number
  ) {
    this.events.emit({
      type: 'WeaponFired',
      atMs: this.elapsedMs,
      shooterId: shooter.id,
      shooterFaction: shooter.faction,
      weaponMode,
      projectileEntityId
    });
  }

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

function deterministicRoll(seed: number, salt: number): number {
  const mixed = Math.imul(seed ^ (salt * 0x9e3779b9), 0x85ebca6b) ^ 0xc2b2ae35;
  const scrambled = mixed ^ (mixed >>> 13);
  return (scrambled >>> 0) / 4294967296;
}
