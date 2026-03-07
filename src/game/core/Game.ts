import { EntityManager } from '../ecs/EntityManager';
import { EntityType } from '../ecs/entityTypes';
import { createPlayer } from '../factories/createPlayer';
import { SpawnSystem } from '../systems/spawnSystem';
import { movementSystem } from '../systems/movementSystem';
import { shootingSystem } from '../systems/shootingSystem';
import { weaponEffectSystem } from '../systems/weaponEffectSystem';
import { projectileInteractionSystem } from '../systems/projectileInteractionSystem';
import { collisionSystem } from '../systems/collisionSystem';
import type { CollisionPair } from '../systems/collisionSystem';
import { damageSystem } from '../systems/damageSystem';
import { despawnSystem } from '../systems/despawnSystem';
import { homingSystem } from '../systems/homingSystem';
import { pickupSystem } from '../systems/pickupSystem';
import { pickupAttractionSystem } from '../systems/pickupAttractionSystem';
import { shieldSystem } from '../systems/shieldSystem';
import { GameState } from './GameState';
import type { Entity } from '../ecs/components';
import type { PointerState } from '../input/types';
import {
  WORLD_SCROLL_SPEED,
  WORLD_BOUNDS,
  FIXED_TIMESTEP_MS,
  type WorldBounds
} from './constants';
import { clamp } from '../util/math';
import { GameEventBus } from './GameEventBus';
import { createPickup } from '../factories/createPickup';
import { ParticleSystem } from '../particles/particleSystem';
import type { ParticleEmitterConfig } from '../particles/particleSystem';
import { gameSettings } from '../config/gameSettings';
import {
  deriveUnlockedWeaponModesFromLevels,
  getPlayerWeaponMaxLevel,
  getPlayerWeaponMinimumLevel,
  isPlayerWeaponMode,
  PLAYER_WEAPON_ORDER,
  type PlayerWeaponMode
} from '../weapons/playerWeapons';
import { enemyDropTuning, playerTuning, podTuning } from './gameTuning';
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
  drawShopOffers,
  isConsumableUpgradeCard,
  resolveCard,
  type CardDefinition
} from '../content/cards';
import { LevelDirector } from './LevelDirector';
import { computeCardBonuses, type CardBonuses } from '../systems/cardEffectSystem';
import { getGameplayModifier } from '../content/gameplayModifiers';
import {
  applyConsumableCardUpgrade as applyConsumableCardUpgradeToRunProgress,
  applyRunPlayerState as applyRunPlayerStateToEntity,
  captureRunProgress as captureRunProgressFromPlayer,
  syncPlayerWithRunProgressCards as syncPlayerWithRunProgressCardsFromState
} from './playerProgress';
import {
  handlePodWeapons as handlePodWeaponFire,
  syncPodsWithPlayer as syncPodsWithPlayerOrbit
} from './podMechanics';
import {
  foundCardsFull as isFoundCardsFull,
  pickCardDropId as pickCardDropIdForRun,
  pickWeaponPickupMode as pickWeaponPickupModeBySeed,
  shouldSpawnDropPickup as shouldSpawnDropPickupByDensity
} from './dropLogic';
import {
  emitMissileThrusterParticles as emitMissileThrusterParticlesEffect,
  spawnEnemyExplosionEffects,
  tickTrailSources,
  type TrailSource
} from './particleEffects';
import { createCardRuntimeState, type CardRuntimeState } from './cardRuntimeState';
import {
  runCardProjectilePostHitHooks,
  runCardProjectilePrefireHooks
} from '../systems/cardProjectileResolver';
import {
  runCardEntityDestroyedTriggerHooks,
  runCardPickupTriggerHooks,
  runCardWeaponFiredTriggerHooks
} from '../systems/cardTriggerResolver';
import {
  clearRoundTemporaryCardEffects,
  tickCardTemporaryEffectHooks
} from '../systems/cardTemporaryEffectResolver';
import {
  applyCardDefenseBeforeDamageRuntime,
  applyPlayerInputRuntime,
  handlePlayerWeaponsRuntime
} from './gameCombatRuntime';

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
  selectedPrimaryWeaponMode: PlayerWeaponMode;
  weaponSlotIndex: number;
  weaponUnlockedCount: number;
  weaponLevel: number;
  weaponLevels: Record<PlayerWeaponMode, number>;
  weaponEnergyCurrent: number;
  weaponEnergyMax: number;
  weaponEnergyCost: number;
  weaponFireIntervalMs: number;
  shieldCurrent: number;
  shieldMax: number;
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

type SnapshotListener = (snapshot: GameSnapshot) => void;

const TARGET_FPS = 60;
const ADAPTIVE_MIN_DENSITY_SCALE = 0.4;
const ADAPTIVE_LOW_FPS_HOLD_MS = 800;
const ADAPTIVE_RECOVERY_HOLD_MS = 1800;
const ENEMY_MONEY_REWARD = 2;
const POD_CARD_IDS = ['satellite-bay', 'pulse-relay', 'missile-command'] as const;

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
  private cardRuntimeState: CardRuntimeState = createCardRuntimeState(0);
  private cachedCardBonuses: CardBonuses = computeCardBonuses([]);
  private cachedCardBonusesKey = '';
  private levelDirector = new LevelDirector();

  constructor() {
    this.bootstrap();
  }

  bootstrap() {
    this.runProgress = undefined;
    this.invalidateCardBonusCache();
    this.resetCardRuntimeState(0);
    this.syncLevelDirectorModifiersWithCards();
    this.resetWorld();
    this.state = GameState.Boot;
    this.notify();
  }

  startNewRun(seed?: number) {
    this.resetWorld();
    const player = this.entities.get(this.playerId);
    this.runProgress = createDefaultRunProgress(seed, createRunPlayerStateFromPlayerEntity(player));
    this.invalidateCardBonusCache();
    this.resetCardRuntimeState(this.runProgress.seed);
    this.levelDirector.configure(this.runProgress.levelId, this.runProgress.roundIndex);
    this.runProgress.levelId = this.levelDirector.currentLevelId();
    this.runProgress.roundIndex = this.levelDirector.currentRoundIndex();
    this.syncPlayerWithRunProgressCards();
    this.spawner.setScriptedWaves(this.levelDirector.currentRound().waves);
    this.state = GameState.Playing;
    this.notify();
  }

  startFromRunProgress(runProgress: RunProgress) {
    this.runProgress = cloneRunProgress(runProgress);
    this.invalidateCardBonusCache();
    this.resetCardRuntimeState(this.runProgress.seed);
    this.levelDirector.configure(this.runProgress.levelId, this.runProgress.roundIndex);
    this.runProgress.levelId = this.levelDirector.currentLevelId();
    this.runProgress.roundIndex = this.levelDirector.currentRoundIndex();
    this.resetWorld(this.runProgress.playerState);
    this.syncPlayerWithRunProgressCards();
    this.spawner.setScriptedWaves(this.levelDirector.currentRound().waves);
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
    this.invalidateCardBonusCache();
    this.resetCardRuntimeState(0);
    this.syncLevelDirectorModifiersWithCards();
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
      this.syncLevelDirectorModifiersWithCards();
      const nextRoundIndex = this.levelDirector.advanceRound();
      this.runProgress.levelId = this.levelDirector.currentLevelId();
      this.runProgress.roundIndex = nextRoundIndex;
      this.spawner.setScriptedWaves(this.levelDirector.currentRound().waves);
      this.resetCardRuntimeState(this.runProgress.seed);
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

    const efficientEngineering = this.currentCardBonuses().economyModifierBonus['efficient-engineering'] ?? 0;
    const discountScale = Math.max(0.5, 1 - Math.min(0.45, efficientEngineering * 0.12));
    const effectiveCost = Math.max(0, Math.round(card.cost * discountScale));

    if (this.runProgress.inRunMoney < effectiveCost) {
      return false;
    }

    this.runProgress.inRunMoney -= effectiveCost;
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
      this.invalidateCardBonusCache();
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
    this.invalidateCardBonusCache();
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

    const cardBonuses = this.currentCardBonuses();
    const spawnDensityScale = this.withCardPercentScale(
      this.getEnemyDensityScale(),
      getGameplayModifier(cardBonuses.gameplayModifiers, 'spawn.enemyDensityPercent'),
      0.25,
      2.4
    );

    this.elapsedMs += deltaSeconds * 1000;
    this.distanceTraveled += WORLD_SCROLL_SPEED * deltaSeconds;
    this.cardRuntimeState = tickCardTemporaryEffectHooks({
      runtimeState: this.cardRuntimeState,
      entityManager: this.entities,
      playerId: this.playerId,
      bonuses: cardBonuses,
      deltaSeconds,
      elapsedMs: this.elapsedMs
    });
    this.updateTrailSources(deltaSeconds);
    this.applyPlayerInput(pointer, deltaSeconds, cardBonuses);
    shieldSystem(this.entities.values(), deltaSeconds);
    this.cardRuntimeState = runCardProjectilePrefireHooks({
      entityManager: this.entities,
      playerId: this.playerId,
      deltaSeconds,
      elapsedMs: this.elapsedMs,
      bonuses: cardBonuses,
      runtimeState: this.cardRuntimeState
    });
    const lastShotAtMs = this.cardRuntimeState.perCardProcCooldownUntilMs.get('__last-shot-ms') ?? Number.NEGATIVE_INFINITY;
    const shootingGapMs = this.elapsedMs - lastShotAtMs;
    if (shootingGapMs > 280 && this.cardRuntimeState.consecutiveShootingMs > 0) {
      this.cardRuntimeState = {
        ...this.cardRuntimeState,
        consecutiveShootingMs: 0
      };
    }
    const killGapMs = this.elapsedMs - this.cardRuntimeState.lastEnemyKillAtMs;
    if (killGapMs > 3200 && this.cardRuntimeState.chainKillStreak > 0) {
      this.cardRuntimeState = {
        ...this.cardRuntimeState,
        chainKillStreak: 0
      };
    }
    this.handlePlayerWeapons(deltaSeconds, cardBonuses);
    this.spawner.tick(this.entities, deltaSeconds, this.playableBounds, this.distanceTraveled, {
      enemyDensityScale: spawnDensityScale,
      enemyHealthScale: this.cardPercentToScale(getGameplayModifier(cardBonuses.gameplayModifiers, 'enemy.healthPercent')),
      enemySpeedScale: this.cardPercentToScale(getGameplayModifier(cardBonuses.gameplayModifiers, 'enemy.speedPercent')),
      enemyFireIntervalScale: this.cardPercentToInverseScale(
        getGameplayModifier(cardBonuses.gameplayModifiers, 'enemy.fireRatePercent')
      ),
      enemyScoreScale: this.cardPercentToScale(getGameplayModifier(cardBonuses.gameplayModifiers, 'enemy.scorePercent'))
    });
    this.flushScheduledEmitters();
    this.syncDebugEmitter();
    const particleEmissionScale = this.getParticleEmissionScale();
    this.particles.tick(
      this.entities,
      deltaSeconds,
      this.useGpuParticles ? this.handleParticleSpawn : undefined,
      undefined,
      particleEmissionScale
    );
    shootingSystem(this.entities, deltaSeconds);
    homingSystem(this.entities, deltaSeconds);
    pickupAttractionSystem(this.entities, this.playerId);
    movementSystem(this.entities.values(), deltaSeconds);
    this.clampPlayerToBounds();
    this.syncPodsWithPlayer(deltaSeconds);
    this.handlePodWeapons(deltaSeconds, cardBonuses);
    this.emitMissileThrusterParticles(deltaSeconds);
    this.score += weaponEffectSystem(this.entities, this.playerId, deltaSeconds, this.elapsedMs);
    projectileInteractionSystem(this.entities, deltaSeconds);
    const collisions = collisionSystem(this.entities.values());
    this.applyCardDefenseBeforeDamage(collisions, cardBonuses);
    const collisionScoreDelta = damageSystem(collisions);
    const postHitResult = runCardProjectilePostHitHooks({
      entityManager: this.entities,
      playerId: this.playerId,
      collisions,
      scoreDelta: collisionScoreDelta,
      deltaSeconds,
      elapsedMs: this.elapsedMs,
      bonuses: cardBonuses,
      runtimeState: this.cardRuntimeState
    });
    this.cardRuntimeState = postHitResult.runtimeState;
    this.score += postHitResult.scoreDelta;
    const pickupResult = pickupSystem(this.entities, this.playerId);
    this.score += pickupResult.scoreDelta;
    for (const collection of pickupResult.collections) {
      this.handleProgressCollection(collection.pickupKind, collection.pickupValue, cardBonuses, collection.pickupCardId);
      const pickupEvent = {
        type: 'PickupCollected',
        atMs: this.elapsedMs,
        collectorId: this.playerId,
        pickupId: collection.pickupId,
        pickupKind: collection.pickupKind,
        pickupWeaponMode: collection.pickupWeaponMode,
        pickupCardId: collection.pickupCardId
      } as const;
      this.cardRuntimeState = runCardPickupTriggerHooks({
        event: pickupEvent,
        bonuses: cardBonuses,
        runtimeState: this.cardRuntimeState
      });
      this.events.emit(pickupEvent);
    }
    const despawned = despawnSystem(this.entities, deltaSeconds, this.playableBounds);

    let activePickups = this.countActivePickups();
    for (const { entity, reason } of despawned) {
      if (reason === 'health' && entity.type === EntityType.Enemy) {
        const salvageProtocols = cardBonuses.economyModifierBonus['salvage-protocols'] ?? 0;
        const healthDropModulo = this.adjustDropModulo(enemyDropTuning.healthDropModulo, salvageProtocols, 2);
        const weaponDropModulo = this.adjustDropModulo(enemyDropTuning.weaponDropModulo, salvageProtocols, 2);
        const moneyDropModulo = this.adjustDropModulo(3, salvageProtocols, 1);
        const cardDropModulo = this.adjustDropModulo(11, salvageProtocols, 2);
        this.addRunMoney(ENEMY_MONEY_REWARD, 'kill', cardBonuses);
        this.spawnEnemyExplosion(entity.position.x, entity.position.y);
        if (this.shouldSpawnDropPickup(entity.id, healthDropModulo, activePickups, 17)) {
          this.entities.create(
            createPickup(entity.position.x, entity.position.y, 'health', enemyDropTuning.healthPickupValue)
          );
          activePickups += 1;
        }
        if (this.shouldSpawnDropPickup(entity.id, weaponDropModulo, activePickups, 53)) {
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
        if (this.shouldSpawnDropPickup(entity.id, moneyDropModulo, activePickups, 91)) {
          this.entities.create(createPickup(entity.position.x, entity.position.y, 'money', 6, 6000));
          activePickups += 1;
        }
        if (this.shouldSpawnDropPickup(entity.id, cardDropModulo, activePickups, 113)) {
          this.entities.create(
            createPickup(entity.position.x, entity.position.y, 'card', 1, 7000, undefined, this.pickCardDropId(entity.id))
          );
          activePickups += 1;
        }
      }

      const destroyedEvent = {
        type: 'EntityDestroyed',
        atMs: this.elapsedMs,
        entityId: entity.id,
        entityType: entity.type,
        enemyArchetype: entity.enemyArchetype as EnemyArchetypeId | undefined,
        positionX: entity.position.x,
        positionY: entity.position.y,
        entityAgeMs: entity.ageMs,
        entityFaction: entity.faction,
        reason,
        scoreValue: entity.scoreValue
      } as const;
      this.cardRuntimeState = runCardEntityDestroyedTriggerHooks({
        event: destroyedEvent,
        bonuses: cardBonuses,
        runtimeState: this.cardRuntimeState
      });
      this.events.emit(destroyedEvent);
    }

    const player = this.entities.get(this.playerId);
    if (!player || player.health <= 0) {
      this.state = GameState.GameOver;
    }

    if (this.state === GameState.Playing && !this.spawner.hasPendingSpawns() && this.countLiveEnemies() === 0) {
      this.enterBetweenRounds();
    }

    this.refreshRunProgressMeta();
    this.notify();
  }

  snapshot(): GameSnapshot {
    const player = this.entities.get(this.playerId);
    const runProgress = this.runProgress;
    const playerWeaponLevels = player?.weaponLevels ?? {};
    const unlockedWeaponModes = player ? deriveUnlockedWeaponModesFromLevels(playerWeaponLevels) : [];
    const activeWeaponMode: PlayerWeaponMode | undefined =
      player && isPlayerWeaponMode(player.weaponMode ?? '') ? (player.weaponMode as PlayerWeaponMode) : undefined;
    const weaponSlotIndex = activeWeaponMode ? Math.max(0, unlockedWeaponModes.indexOf(activeWeaponMode)) + 1 : 0;
    const snapshotWeaponLevels = Object.fromEntries(
      PLAYER_WEAPON_ORDER.map((mode) => [mode, Math.max(getPlayerWeaponMinimumLevel(mode), playerWeaponLevels[mode] ?? getPlayerWeaponMinimumLevel(mode))])
    ) as Record<PlayerWeaponMode, number>;
    return {
      state: this.state,
      score: this.score,
      levelId: runProgress?.levelId ?? 'level-1',
      roundIndex: runProgress?.roundIndex ?? 0,
      totalRounds: this.levelDirector.totalRounds(),
      activeCardLimit: ACTIVE_CARD_LIMIT,
      inRunMoney: runProgress?.inRunMoney ?? 0,
      foundCards: runProgress?.foundCards ?? [],
      activeCards: runProgress?.activeCards ?? [],
      playerHealth: player?.health ?? 0,
      playerMaxHealth: player?.maxHealth ?? 0,
      weaponMode: player?.weaponMode ?? 'Unknown',
      selectedPrimaryWeaponMode: activeWeaponMode ?? 'Auto Pulse',
      weaponSlotIndex,
      weaponUnlockedCount: unlockedWeaponModes.length,
      weaponLevel: player?.weaponLevel ?? 0,
      weaponLevels: snapshotWeaponLevels,
      weaponEnergyCurrent: player?.weaponEnergy ?? 0,
      weaponEnergyMax: player?.weaponEnergyMax ?? 0,
      weaponEnergyCost: player?.weaponEnergyCost ?? 0,
      weaponFireIntervalMs: player?.weaponFireIntervalMs ?? 0,
      shieldCurrent: Math.max(0, player?.shieldCurrent ?? 0),
      shieldMax: Math.max(0, player?.shieldMax ?? 0),
      podCount: Math.max(0, player?.podCount ?? 0),
      podWeaponMode: player?.podWeaponMode === 'Homing Missile' ? 'Homing Missile' : 'Auto Pulse',
      distanceTraveled: this.distanceTraveled
    };
  }

  private applyRunPlayerState(player: Entity, playerState: RunPlayerState) {
    applyRunPlayerStateToEntity(player, playerState);
  }

  private resetCardRuntimeState(seed: number) {
    this.cardRuntimeState = createCardRuntimeState(seed);
  }

  private syncPlayerWithRunProgressCards() {
    this.syncLevelDirectorModifiersWithCards();
    syncPlayerWithRunProgressCardsFromState(this.entities, this.playerId, this.runProgress);
  }

  private refreshRunProgressMeta() {
    if (!this.runProgress) {
      return;
    }

    this.runProgress.elapsedMs = this.elapsedMs;
    this.runProgress.distanceTraveled = this.distanceTraveled;
    this.runProgress.score = this.score;
  }

  private captureRunProgress() {
    this.refreshRunProgressMeta();
    captureRunProgressFromPlayer(
      this.entities,
      this.playerId,
      this.runProgress,
      this.elapsedMs,
      this.distanceTraveled,
      this.score
    );
  }

  private applyPlayerInput(pointer: PointerState, deltaSeconds: number, cardBonuses: CardBonuses) {
    this.cardRuntimeState = applyPlayerInputRuntime({
      entities: this.entities,
      playerId: this.playerId,
      pointer,
      deltaSeconds,
      elapsedMs: this.elapsedMs,
      bonuses: cardBonuses,
      runtimeState: this.cardRuntimeState
    });
  }

  private applyCardDefenseBeforeDamage(collisions: CollisionPair[], cardBonuses: CardBonuses): void {
    applyCardDefenseBeforeDamageRuntime(collisions, this.entities, this.playerId, cardBonuses);
  }

  entitiesForRender() {
    return Array.from(this.entities.values(), (entity) => ({
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
        projectileVisualId: entity.projectileVisualId,
        projectileSpeed: entity.projectileSpeed,
        fieldKind: entity.fieldKind,
        fieldVisualId: entity.fieldVisualId,
        fieldRadius: entity.fieldRadius,
        droneKind: entity.droneKind,
        droneVisualId: entity.droneVisualId,
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
    let count = 0;
    for (const entity of this.entities.values()) {
      if (entity.type === type) {
        count += 1;
      }
    }
    return count;
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
      for (const entity of this.entities.values()) {
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

    const levels = player.weaponLevels ?? {};
    const unlocked = deriveUnlockedWeaponModesFromLevels(levels);
    player.unlockedWeaponModes = unlocked;
    if (!unlocked.includes(selectedMode)) {
      return false;
    }

    const maxLevel = getPlayerWeaponMaxLevel(selectedMode);
    const currentLevel = levels[selectedMode] ?? getPlayerWeaponMinimumLevel(selectedMode);
    if (currentLevel < 1) {
      return false;
    }

    if (player.weaponMode === selectedMode) {
      const nextLevel = currentLevel >= maxLevel ? getPlayerWeaponMinimumLevel(selectedMode) : currentLevel + 1;
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
    player.weaponLevel = Math.min(Math.max(getPlayerWeaponMinimumLevel(selectedMode), currentLevel), maxLevel);
    this.notify();
    return true;
  }

  selectPrimaryWeaponLoadout(mode: PlayerWeaponMode): boolean {
    if (this.state !== GameState.BetweenRounds && this.state !== GameState.Shop) {
      return false;
    }

    const player = this.entities.get(this.playerId);
    if (!player) {
      return false;
    }

    const levels = player.weaponLevels ?? {};
    const maxLevel = getPlayerWeaponMaxLevel(mode);
    const currentLevel = Math.max(getPlayerWeaponMinimumLevel(mode), Math.min(maxLevel, levels[mode] ?? getPlayerWeaponMinimumLevel(mode)));
    if (currentLevel < 1) {
      return false;
    }
    levels[mode] = currentLevel;

    player.unlockedWeaponModes = deriveUnlockedWeaponModesFromLevels(levels);

    player.weaponMode = mode;
    player.weaponLevel = currentLevel;
    player.weaponLevels = levels;
    player.fireCooldownMs = 0;
    this.notify();
    return true;
  }

  selectNextWeapon(): boolean {
    return this.stepWeaponSelection(1);
  }

  selectPreviousWeapon(): boolean {
    return this.stepWeaponSelection(-1);
  }

  private stepWeaponSelection(direction: -1 | 1): boolean {
    const player = this.entities.get(this.playerId);
    if (!player) {
      return false;
    }
    const levels = player.weaponLevels ?? {};
    const unlocked = deriveUnlockedWeaponModesFromLevels(levels);
    player.unlockedWeaponModes = unlocked;
    if (unlocked.length === 0) {
      return false;
    }
    const fallback = unlocked[0];
    if (!fallback) {
      return false;
    }
    const current: PlayerWeaponMode = isPlayerWeaponMode(player.weaponMode ?? '')
      ? (player.weaponMode as PlayerWeaponMode)
      : fallback;
    const currentIndex = Math.max(0, unlocked.indexOf(current));
    const nextIndex = (currentIndex + direction + unlocked.length) % unlocked.length;
    const next = unlocked[nextIndex];
    if (!next) {
      return false;
    }
    player.weaponMode = next;
    player.weaponLevel = player.weaponLevels?.[next] ?? getPlayerWeaponMinimumLevel(next);
    player.fireCooldownMs = 0;
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

  private handlePlayerWeapons(deltaSeconds: number, bonuses: CardBonuses) {
    const result = handlePlayerWeaponsRuntime({
      entities: this.entities,
      playerId: this.playerId,
      deltaSeconds,
      bonuses,
      runtimeState: this.cardRuntimeState,
      elapsedMs: this.elapsedMs,
      emitWeaponFiredEvent: (shooter, weaponMode, projectileEntityId) => {
        this.emitWeaponFiredEvent(shooter, weaponMode, bonuses, projectileEntityId);
      }
    });
    this.cardRuntimeState = result.runtimeState;
    this.score += result.scoreDelta;
  }

  private getEnemyDensityScale(): number {
    return this.adaptiveDensityEnabled ? this.enemyDensityScale : 1;
  }

  private getParticleEmissionScale(): number {
    const densityScale = this.getEnemyDensityScale();
    // Keep particles from overwhelming mobile/low-end devices during sustained load.
    return clamp(0.35 + densityScale * 0.65, 0.35, 1);
  }

  private invalidateCardBonusCache() {
    this.cachedCardBonusesKey = '';
  }

  private currentCardBonuses(): CardBonuses {
    const activeCards = this.runProgress?.activeCards ?? [];
    const key = activeCards.join('|');
    if (key === this.cachedCardBonusesKey) {
      return this.cachedCardBonuses;
    }

    this.cachedCardBonuses = computeCardBonuses(activeCards);
    this.cachedCardBonusesKey = key;
    return this.cachedCardBonuses;
  }

  private syncLevelDirectorModifiersWithCards() {
    const bonuses = this.currentCardBonuses();
    this.levelDirector.setRuntimeModifiers({
      enemyCountPercent: getGameplayModifier(bonuses.gameplayModifiers, 'director.enemyCountPercent'),
      enemyArchetypeUnlocks: getGameplayModifier(bonuses.gameplayModifiers, 'director.enemyArchetypeUnlocks'),
      patternUnlocks: getGameplayModifier(bonuses.gameplayModifiers, 'director.patternUnlocks')
    });
  }

  private cardPercentToScale(percent: number, minScale = 0.2): number {
    return Math.max(minScale, 1 + percent / 100);
  }

  private cardPercentToInverseScale(percent: number, minScale = 0.2): number {
    return Math.max(minScale, 1 / Math.max(0.1, 1 + percent / 100));
  }

  private withCardPercentScale(baseScale: number, percent: number, minScale: number, maxScale: number): number {
    return clamp(baseScale * this.cardPercentToScale(percent, minScale), minScale, maxScale);
  }

  private countLiveEnemies(): number {
    let count = 0;
    for (const entity of this.entities.values()) {
      if (entity.type === EntityType.Enemy && entity.health > 0) {
        count += 1;
      }
    }
    return count;
  }

  enterBetweenRounds(): boolean {
    if (!this.runProgress || this.state !== GameState.Playing) {
      return false;
    }

    const player = this.entities.get(this.playerId);
    const autoRepairStacks = this.currentCardBonuses().defenseModifierBonus['auto-repair-systems'] ?? 0;
    if (player && autoRepairStacks > 0) {
      const repairAmount = Math.max(1, Math.round(autoRepairStacks * 2));
      player.health = Math.min(player.maxHealth, player.health + repairAmount);
    }

    this.cardRuntimeState = clearRoundTemporaryCardEffects(this.cardRuntimeState);
    this.captureRunProgress();
    this.state = GameState.BetweenRounds;
    return true;
  }

  private addRunMoney(amount: number, source: 'kill' | 'pickup' = 'pickup', bonuses?: CardBonuses) {
    if (!this.runProgress || amount <= 0) {
      return;
    }

    const effectiveBonuses = bonuses ?? this.currentCardBonuses();
    const salvageProtocols = effectiveBonuses.economyModifierBonus['salvage-protocols'] ?? 0;
    const economyScale = 1 + effectiveBonuses.moneyMultiplierPercent / 100 + salvageProtocols * 0.2;
    const scaled = Math.round(amount * economyScale);
    const killBonus = source === 'kill' ? effectiveBonuses.killMoneyFlatBonus : 0;
    this.runProgress.inRunMoney += Math.max(1, scaled + killBonus);
  }

  private handleProgressCollection(kind: string, value: number, bonuses: CardBonuses, pickupCardId?: string) {
    if (!this.runProgress) {
      return;
    }

    if (kind === 'money') {
      this.addRunMoney(Math.max(0, value), 'pickup', bonuses);
      return;
    }

    if (
      kind === 'card'
      && pickupCardId
      && !this.foundCardsFull()
      && canAcquireCard(pickupCardId, this.runProgress.foundCards, this.runProgress.activeCards, this.runProgress.consumedCards ?? [])
    ) {
      this.runProgress.foundCards = [...this.runProgress.foundCards, pickupCardId];
      const duplicateChance = Math.max(0, bonuses.economyModifierBonus['duplicate-systems'] ?? 0);
      if (
        duplicateChance > 0
        && canAcquireCard(
          pickupCardId,
          this.runProgress.foundCards,
          this.runProgress.activeCards,
          this.runProgress.consumedCards ?? []
        )
      ) {
        const roll = this.cardRuntimeState.rng.nextFloat('economy:duplicate-systems', Math.floor(this.elapsedMs));
        if (roll <= Math.min(1, duplicateChance / 100) && !this.foundCardsFull()) {
          this.runProgress.foundCards = [...this.runProgress.foundCards, pickupCardId];
        }
      }
    }
  }

  private foundCardsFull(): boolean {
    return isFoundCardsFull(this.runProgress);
  }

  private applyConsumableCardUpgrade(card: CardDefinition) {
    applyConsumableCardUpgradeToRunProgress(this.runProgress, card);
  }

  private countActivePickups(): number {
    let count = 0;
    for (const entity of this.entities.values()) {
      if (entity.type === EntityType.Pickup) {
        count += 1;
      }
    }
    return count;
  }

  private shouldSpawnDropPickup(entityId: number, modulo: number, activePickups: number, salt: number): boolean {
    return shouldSpawnDropPickupByDensity(entityId, modulo, activePickups, salt, this.getEnemyDensityScale());
  }

  private adjustDropModulo(baseModulo: number, salvageProtocolStacks: number, minModulo = 1): number {
    if (salvageProtocolStacks <= 0) {
      return baseModulo;
    }
    const scale = 1 + salvageProtocolStacks * 0.35;
    return Math.max(minModulo, Math.round(baseModulo / scale));
  }

  private syncPodsWithPlayer(deltaSeconds: number) {
    syncPodsWithPlayerOrbit(this.entities, this.playerId, this.elapsedMs, deltaSeconds);
  }

  private handlePodWeapons(deltaSeconds: number, cardBonuses: CardBonuses) {
    handlePodWeaponFire(
      this.entities,
      this.playerId,
      deltaSeconds,
      (shooter, weaponMode, projectileEntityId) => {
        this.emitWeaponFiredEvent(shooter, weaponMode, cardBonuses, projectileEntityId);
      },
      { missileModifierBonus: cardBonuses.missileModifierBonus }
    );
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
    const player = this.entities.get(this.playerId);
    const unlocked = player?.unlockedWeaponModes ?? [];
    const locked = PLAYER_WEAPON_ORDER.filter((mode) => !unlocked.includes(mode));
    if (locked.length > 0) {
      return locked[seed % locked.length];
    }
    if (player?.weaponMode && isPlayerWeaponMode(player.weaponMode)) {
      return player.weaponMode;
    }
    return pickWeaponPickupModeBySeed(seed);
  }

  private pickCardDropId(seed: number): string {
    return pickCardDropIdForRun(this.runProgress, seed);
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
    this.trailSources = tickTrailSources(this.trailSources, deltaSeconds);
  }

  private spawnEnemyExplosion(x: number, y: number) {
    spawnEnemyExplosionEffects(
      this.particles,
      this.trailSources,
      x,
      y,
      (delayMs, config) => this.scheduleEmitter(delayMs, config),
      (particle) => this.emitOneShotParticle(particle)
    );
  }

  private emitMissileThrusterParticles(deltaSeconds: number) {
    this.missileThrusterAccumulator = emitMissileThrusterParticlesEffect(
      this.entities,
      deltaSeconds,
      this.missileThrusterAccumulator,
      (particle) => this.emitOneShotParticle(particle)
    );
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
    bonuses: CardBonuses,
    projectileEntityId?: number
  ) {
    const weaponFiredEvent = {
      type: 'WeaponFired',
      atMs: this.elapsedMs,
      shooterId: shooter.id,
      shooterFaction: shooter.faction,
      weaponMode,
      projectileEntityId
    } as const;
    this.cardRuntimeState = runCardWeaponFiredTriggerHooks({
      event: weaponFiredEvent,
      bonuses,
      runtimeState: this.cardRuntimeState
    });
    this.events.emit(weaponFiredEvent);
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
