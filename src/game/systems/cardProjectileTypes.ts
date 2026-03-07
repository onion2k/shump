import type { CollisionPair } from './collisionSystem';
import type { CardBonuses } from './cardEffectSystem';
import type { EntityManager } from '../ecs/EntityManager';
import type { CardRuntimeState } from '../core/cardRuntimeState';

export interface CardProjectilePrefireContext {
  entityManager: EntityManager;
  playerId: number;
  deltaSeconds: number;
  elapsedMs: number;
  bonuses: CardBonuses;
  runtimeState: CardRuntimeState;
}

export interface CardProjectilePostHitContext {
  entityManager: EntityManager;
  playerId: number;
  collisions: CollisionPair[];
  scoreDelta: number;
  deltaSeconds: number;
  elapsedMs: number;
  bonuses: CardBonuses;
  runtimeState: CardRuntimeState;
}

export interface CardProjectilePostHitResult {
  runtimeState: CardRuntimeState;
  scoreDelta: number;
}
