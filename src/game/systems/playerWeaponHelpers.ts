import type { EntityManager } from '../ecs/EntityManager';
import { EntityType } from '../ecs/entityTypes';
import type { PlayerWeaponMode } from '../weapons/playerWeapons';
import type { WeaponTuningStat } from '../content/cards';
import type { WeaponTuningBonuses } from './cardEffectSystem';
import type { PlayerWeaponSystemOptions } from './playerWeaponTypes';

const MIN_SCALE = 0.15;

export function resolveWeaponPercent(
  tuningBonuses: WeaponTuningBonuses | undefined,
  mode: PlayerWeaponMode,
  stat: WeaponTuningStat
): number {
  return (tuningBonuses?.all?.[stat] ?? 0) + (tuningBonuses?.[mode]?.[stat] ?? 0);
}

export function applyFireRate(baseIntervalMs: number, fireRatePercent: number): number {
  const speedScale = Math.max(MIN_SCALE, 1 + fireRatePercent / 100);
  return Math.round(baseIntervalMs / speedScale);
}

export function applyPercent(baseValue: number, percent: number): number {
  return baseValue * Math.max(MIN_SCALE, 1 + percent / 100);
}

export function resolveBonus(source: Record<string, number> | undefined, key: string): number {
  return source?.[key] ?? 0;
}

export function resolveKineticEscalationScale(options: PlayerWeaponSystemOptions): number {
  const perHitPercent = resolveBonus(options.weaponAmplifierBonus, 'kinetic-escalation');
  if (perHitPercent <= 0) {
    return 1;
  }

  const streak = Math.max(0, Math.min(20, options.hitStreak ?? 0));
  return Math.max(0.25, 1 + (perHitPercent * streak) / 100);
}

export function buildProjectileMetadata(options: PlayerWeaponSystemOptions, isHeavyCannon: boolean) {
  const highVelocityPierce = resolveBonus(options.projectileModifierBonus, 'high-velocity-rounds-pierce');
  const piercingArray = resolveBonus(options.projectileModifierBonus, 'piercing-array');
  const ricochet = resolveBonus(options.projectileModifierBonus, 'ricochet-rounds');
  const splashRadius = resolveBonus(options.projectileModifierBonus, 'explosive-payload-radius');
  const fragmenting = resolveBonus(options.projectileModifierBonus, 'fragmenting-shells');
  const scattercharge = resolveBonus(options.projectileModifierBonus, 'scattercharge');
  const shouldSplit = (isHeavyCannon && fragmenting > 0) || scattercharge > 0;
  return {
    pierceRemaining: Math.max(0, Math.round(highVelocityPierce + piercingArray)),
    ricochetRemaining: Math.max(0, Math.round(ricochet)),
    splashRadius: splashRadius > 0 ? splashRadius : undefined,
    splitOnImpact: shouldSplit ? true : undefined,
    splitSpec: shouldSplit
      ? {
          childCount: scattercharge > 0 ? 5 : 3,
          speedScale: scattercharge > 0 ? 0.55 : 0.75,
          damageScale: scattercharge > 0 ? 0.32 : 0.45
        }
      : undefined
  };
}

export function pickLaserTargets(
  entityManager: EntityManager,
  x: number,
  y: number,
  range: number,
  halfWidth: number,
  targetCount: number
) {
  if (targetCount <= 0) {
    return [];
  }

  const candidates: ReturnType<EntityManager['all']> = [];
  for (const entity of entityManager.values()) {
    if (entity.type !== EntityType.Enemy || entity.health <= 0) {
      continue;
    }

    const dy = entity.position.y - y;
    const dx = Math.abs(entity.position.x - x);
    if (dy < 0 || dy > range || dx > halfWidth) {
      continue;
    }

    let insertAt = candidates.length;
    while (insertAt > 0 && candidates[insertAt - 1].position.y > entity.position.y) {
      insertAt -= 1;
    }
    candidates.splice(insertAt, 0, entity);
    if (candidates.length > targetCount) {
      candidates.pop();
    }
  }

  return candidates;
}
