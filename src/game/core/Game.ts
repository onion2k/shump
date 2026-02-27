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
import { PLAYER_SPEED } from './constants';
import { clamp } from '../util/math';

export interface GameSnapshot {
  state: GameState;
  score: number;
  playerHealth: number;
}

type SnapshotListener = (snapshot: GameSnapshot) => void;

export class Game {
  readonly entities = new EntityManager();
  readonly spawner = new SpawnSystem();
  state = GameState.Boot;
  score = 0;

  private playerId = 0;
  private listeners = new Set<SnapshotListener>();

  constructor() {
    this.bootstrap();
  }

  bootstrap() {
    this.entities.clear();
    this.score = 0;
    const player = this.entities.create(createPlayer());
    this.playerId = player.id;
    this.state = GameState.Boot;
    this.spawner.reset();
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

    this.applyPlayerInput(pointer, deltaSeconds);
    this.spawner.tick(this.entities, deltaSeconds);
    shootingSystem(this.entities, deltaSeconds);
    movementSystem(this.entities.all(), deltaSeconds);
    const collisions = collisionSystem(this.entities.all());
    this.score += damageSystem(collisions);
    despawnSystem(this.entities, deltaSeconds);

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
      playerHealth: player?.health ?? 0
    };
  }

  private applyPlayerInput(pointer: PointerState, deltaSeconds: number) {
    const player = this.entities.get(this.playerId);
    if (!player) {
      return;
    }

    if (!pointer.active) {
      player.velocity.x = 0;
      player.velocity.y = 0;
      return;
    }

    const dx = pointer.x - player.position.x;
    const dy = pointer.y - player.position.y;
    const mag = Math.hypot(dx, dy) || 1;
    const maxSpeedWithoutOvershoot = deltaSeconds > 0 ? mag / deltaSeconds : PLAYER_SPEED;
    const speed = Math.min(PLAYER_SPEED, maxSpeedWithoutOvershoot);

    player.velocity.x = clamp((dx / mag) * speed, -PLAYER_SPEED, PLAYER_SPEED);
    player.velocity.y = clamp((dy / mag) * speed, -PLAYER_SPEED, PLAYER_SPEED);
  }

  entitiesForRender() {
    return this.entities.all().map((entity) => ({
      id: entity.id,
      type: entity.type,
      x: entity.position.x,
      y: entity.position.y
    }));
  }

  countByType(type: EntityType): number {
    return this.entities.all().filter((entity) => entity.type === type).length;
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
