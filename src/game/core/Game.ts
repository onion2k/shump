import { EntityManager } from '../ecs/EntityManager';
import { EntityType } from '../ecs/entityTypes';
import { createPlayer } from '../factories/createPlayer';
import { SpawnSystem } from '../systems/spawnSystem';
import { movementSystem } from '../systems/movementSystem';
import { shootingSystem } from '../systems/shootingSystem';
import { collisionSystem } from '../systems/collisionSystem';
import { damageSystem } from '../systems/damageSystem';
import { despawnSystem } from '../systems/despawnSystem';
import { GameState } from './GameState';
import type { PointerState } from '../input/types';
import {
  BULLET_SPEED,
  PLAYER_FOLLOW_GAIN,
  PLAYER_MACHINE_GUN_INTERVAL_MS,
  PLAYER_MAX_SPEED,
  WORLD_BOUNDS,
  type WorldBounds
} from './constants';
import { clamp } from '../util/math';
import { Faction } from '../ecs/entityTypes';
import { createBullet } from '../factories/createBullet';
import { GameEventBus } from './GameEventBus';

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
}

type SnapshotListener = (snapshot: GameSnapshot) => void;

export class Game {
  readonly entities = new EntityManager();
  readonly spawner = new SpawnSystem();
  readonly events = new GameEventBus();
  state = GameState.Boot;
  score = 0;

  private playerId = 0;
  private listeners = new Set<SnapshotListener>();
  private playableBounds: WorldBounds = { ...WORLD_BOUNDS };
  private elapsedMs = 0;

  constructor() {
    this.bootstrap();
  }

  bootstrap() {
    this.entities.clear();
    this.score = 0;
    this.elapsedMs = 0;
    const player = this.entities.create(createPlayer());
    this.playerId = player.id;
    this.state = GameState.Boot;
    this.spawner.reset();
    this.playableBounds = { ...WORLD_BOUNDS };
    this.notify();
  }

  start() {
    this.state = GameState.Playing;
    this.notify();
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
    this.applyPlayerInput(pointer, deltaSeconds);
    this.handlePlayerWeapons(deltaSeconds);
    this.spawner.tick(this.entities, deltaSeconds, this.playableBounds);
    shootingSystem(this.entities, deltaSeconds);
    movementSystem(this.entities.all(), deltaSeconds);
    this.clampPlayerToBounds();
    const collisions = collisionSystem(this.entities.all());
    this.score += damageSystem(collisions);
    const despawned = despawnSystem(this.entities, deltaSeconds, this.playableBounds);

    for (const { entity, reason } of despawned) {
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
      weaponFireIntervalMs: player?.weaponFireIntervalMs ?? 0
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
    const player = this.entities.get(this.playerId);
    if (!player) {
      return;
    }

    const currentEnergy = player.weaponEnergy ?? 0;
    const maxEnergy = player.weaponEnergyMax ?? 0;
    const regen = player.weaponEnergyRegenPerSecond ?? 0;
    const shotCost = player.weaponEnergyCost ?? 0;
    const intervalMs = player.weaponFireIntervalMs ?? PLAYER_MACHINE_GUN_INTERVAL_MS;

    player.weaponMode = 'Auto Pulse';
    player.weaponEnergy = clamp(currentEnergy + regen * deltaSeconds, 0, maxEnergy);
    player.fireCooldownMs = (player.fireCooldownMs ?? 0) - deltaSeconds * 1000;

    if ((player.fireCooldownMs ?? 0) <= 0 && (player.weaponEnergy ?? 0) >= shotCost) {
      const projectile = this.entities.create(
        createBullet(player.position.x, player.position.y + 0.7, BULLET_SPEED, Faction.Player)
      );
      player.weaponEnergy = (player.weaponEnergy ?? 0) - shotCost;
      player.fireCooldownMs = intervalMs;
      this.events.emit({
        type: 'WeaponFired',
        atMs: this.elapsedMs,
        shooterId: player.id,
        shooterFaction: player.faction,
        weaponMode: player.weaponMode,
        projectileEntityId: projectile.id
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
