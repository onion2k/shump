import type { EntityManager } from '../ecs/EntityManager';
import type { WeaponTuningBonuses } from './cardEffectSystem';
import type { TemporaryRoundEffectState } from '../core/cardRuntimeState';

export interface WeaponFireRecord {
  weaponMode: string;
  projectileEntityId?: number;
}

export interface PlayerWeaponResult {
  fired: WeaponFireRecord[];
  scoreDelta: number;
}

export interface FireOutcome {
  fired: boolean;
  energyCost: number;
  intervalMs: number;
}

export interface PlayerWeaponSystemOptions {
  weaponTuningBonuses?: WeaponTuningBonuses;
  weaponAmplifierBonus?: Record<string, number>;
  projectileModifierBonus?: Record<string, number>;
  patternModifierBonus?: Record<string, number>;
  triggerModifierBonus?: Record<string, number>;
  conditionalModifierBonus?: Record<string, number>;
  temporaryRoundEffects?: TemporaryRoundEffectState[];
  movingMs?: number;
  stillMs?: number;
  consecutiveShootingMs?: number;
  chainKillStreak?: number;
  shotCounter?: number;
  rapidVentingUntilMs?: number;
  elapsedMs?: number;
  volatileMisfireRoll?: number;
  hitStreak?: number;
}

export interface ConditionalDerivedBonuses {
  damagePercent: number;
  fireRatePercent: number;
  precisionPercent: number;
  volatileMisfireChancePercent: number;
}

export type PlayerEntity = NonNullable<ReturnType<EntityManager['get']>>;
