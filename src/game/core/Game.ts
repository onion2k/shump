import { EntityManager } from '../ecs/EntityManager';
import { EntityType } from '../ecs/entityTypes';
import { createPlayer } from '../factories/createPlayer';
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
import type { PointerState } from '../input/types';
import {
  PLAYER_FOLLOW_GAIN,
  PLAYER_MAX_SPEED,
  WORLD_SCROLL_SPEED,
  WORLD_BOUNDS,
  type WorldBounds
} from './constants';
import { clamp } from '../util/math';
import { GameEventBus } from './GameEventBus';
import { createPickup } from '../factories/createPickup';
import { ParticleSystem } from '../particles/particleSystem';

export interface GameSnapshot {
  state: GameState;
  score: number;
  playerHealth: number;
  playerMaxHealth: number;
  weaponMode: string;
  weaponLevel: number;
  weaponEnergyCurrent: number;
  weaponEnergyMax: number;
  weaponEnergyCost: number;
  weaponFireIntervalMs: number;
  distanceTraveled: number;
}

type SnapshotListener = (snapshot: GameSnapshot) => void;

export class Game {
  readonly entities = new EntityManager();
  readonly spawner = new SpawnSystem();
  readonly events = new GameEventBus();
  readonly particles = new ParticleSystem();
  state = GameState.Boot;
  score = 0;

  private playerId = 0;
  private listeners = new Set<SnapshotListener>();
  private playableBounds: WorldBounds = { ...WORLD_BOUNDS };
  private elapsedMs = 0;
  private distanceTraveled = 0;

  constructor() {
    this.bootstrap();
  }

  bootstrap() {
    this.entities.clear();
    this.particles.clearEmitters();
    this.score = 0;
    this.elapsedMs = 0;
    this.distanceTraveled = 0;
    const player = this.entities.create(createPlayer());
    this.playerId = player.id;
    this.particles.addEmitter({
      position: { x: player.position.x, y: player.position.y },
      direction: -Math.PI / 2,
      spread: Math.PI / 4,
      lifetimeMs: 60_000,
      particleType: 'thruster',
      emissionRatePerSecond: 40,
      particleLifetimeMs: 320,
      particleSpeed: 4,
      particleRadius: 0.09,
      positionProvider: () => {
        const currentPlayer = this.entities.get(this.playerId);
        if (!currentPlayer) {
          return { x: 0, y: 0 };
        }

        return {
          x: currentPlayer.position.x,
          y: currentPlayer.position.y - 0.45
        };
      },
      velocityProvider: () => {
        const currentPlayer = this.entities.get(this.playerId);
        return currentPlayer?.velocity ?? { x: 0, y: 0 };
      }
    });
    this.state = GameState.Boot;
    this.spawner.reset();
    this.playableBounds = { ...WORLD_BOUNDS };
    this.notify();
  }

  start() {
    this.state = GameState.Playing;
    this.notify();
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

  restart() {
    this.bootstrap();
    this.start();
  }

  update(deltaSeconds: number, pointer: PointerState) {
    if (this.state !== GameState.Playing) {
      return;
    }

    this.elapsedMs += deltaSeconds * 1000;
    this.distanceTraveled += WORLD_SCROLL_SPEED * deltaSeconds;
    this.applyPlayerInput(pointer, deltaSeconds);
    this.handlePlayerWeapons(deltaSeconds);
    this.spawner.tick(this.entities, deltaSeconds, this.playableBounds);
    this.particles.tick(this.entities, deltaSeconds);
    shootingSystem(this.entities, deltaSeconds);
    homingSystem(this.entities, deltaSeconds);
    movementSystem(this.entities.all(), deltaSeconds);
    this.clampPlayerToBounds();
    const collisions = collisionSystem(this.entities.all());
    this.score += damageSystem(collisions);
    const pickupResult = pickupSystem(this.entities, this.playerId);
    this.score += pickupResult.scoreDelta;
    for (const collection of pickupResult.collections) {
      this.events.emit({
        type: 'PickupCollected',
        atMs: this.elapsedMs,
        collectorId: this.playerId,
        pickupId: collection.pickupId,
        pickupKind: collection.pickupKind
      });
    }
    const despawned = despawnSystem(this.entities, deltaSeconds, this.playableBounds);

    for (const { entity, reason } of despawned) {
      if (reason === 'health' && entity.type === EntityType.Enemy) {
        if (entity.id % 5 === 0) {
          this.entities.create(createPickup(entity.position.x, entity.position.y, 'health', 2));
        }
      }

      this.events.emit({
        type: 'EntityDestroyed',
        atMs: this.elapsedMs,
        entityId: entity.id,
        entityType: entity.type,
        entityFaction: entity.faction,
        reason,
        scoreValue: entity.scoreValue
      });
    }

    const player = this.entities.get(this.playerId);
    if (!player || player.health <= 0) {
      this.state = GameState.GameOver;
    }

    this.notify();
  }

  snapshot(): GameSnapshot {
    const player = this.entities.get(this.playerId);
    return {
      state: this.state,
      score: this.score,
      playerHealth: player?.health ?? 0,
      playerMaxHealth: player?.maxHealth ?? 0,
      weaponMode: player?.weaponMode ?? 'Unknown',
      weaponLevel: player?.weaponLevel ?? 0,
      weaponEnergyCurrent: player?.weaponEnergy ?? 0,
      weaponEnergyMax: player?.weaponEnergyMax ?? 0,
      weaponEnergyCost: player?.weaponEnergyCost ?? 0,
      weaponFireIntervalMs: player?.weaponFireIntervalMs ?? 0,
      distanceTraveled: this.distanceTraveled
    };
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
      pickupKind: entity.pickupKind,
      particleType: entity.particleType,
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

  private handlePlayerWeapons(deltaSeconds: number) {
    const result = playerWeaponSystem(this.entities, this.playerId, deltaSeconds);
    this.score += result.scoreDelta;

    const player = this.entities.get(this.playerId);
    if (!player) {
      return;
    }

    for (const shot of result.fired) {
      this.events.emit({
        type: 'WeaponFired',
        atMs: this.elapsedMs,
        shooterId: player.id,
        shooterFaction: player.faction,
        weaponMode: shot.weaponMode,
        projectileEntityId: shot.projectileEntityId
      });
    }
  }

  private clampPlayerToBounds() {
    const player = this.entities.get(this.playerId);
    if (!player) {
      return;
    }

    player.position.x = clamp(player.position.x, this.playableBounds.left + 0.5, this.playableBounds.right - 0.5);
    player.position.y = clamp(player.position.y, this.playableBounds.bottom + 0.5, this.playableBounds.top - 0.5);
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
