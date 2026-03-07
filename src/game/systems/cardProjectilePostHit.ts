import { EntityType, Faction } from '../ecs/entityTypes';
import { applyDamage } from './damageSystem';
import { createField } from '../factories/createField';
import type { CardProjectilePostHitContext, CardProjectilePostHitResult } from './cardProjectileTypes';
import {
  DELAYED_DETONATION_EFFECT_ID,
  DRILL_BORE_EFFECT_ID,
  THERMAL_BURN_EFFECT_ID,
  addOrRefreshStatusEffect,
  applyAreaDamage,
  applyShockwaveKnockback,
  armMissileForDelayedDetonation,
  hasStatusEffect,
  resolveMissileExplosionRadius,
  spawnRadialBloomProjectiles,
  spawnSplitProjectiles,
  tickDelayedDetonationMissiles
} from './cardProjectileHelpers';

export function runCardProjectilePostHitHooks(context: CardProjectilePostHitContext): CardProjectilePostHitResult {
  let runtimeState = context.runtimeState;
  const perTargetHitMap = new Map(runtimeState.perTargetHitMap);
  let scoreDelta = context.scoreDelta;
  let playerHits = 0;
  const chainReactionChance = Math.max(0, context.bonuses.triggerModifierBonus['chain-reaction'] ?? 0);
  const emergencyShieldBonus = Math.max(0, context.bonuses.defenseModifierBonus['emergency-shield'] ?? 0);
  const reactiveArmourBonus = Math.max(0, context.bonuses.defenseModifierBonus['reactive-armour'] ?? 0);
  const delayedDetonationBonus = Math.max(0, context.bonuses.missileModifierBonus['delayed-detonation'] ?? 0);
  const shockwaveBonus = Math.max(0, context.bonuses.missileModifierBonus['shockwave-payload'] ?? 0);
  const thermalRounds = Math.max(0, context.bonuses.projectileModifierBonus['thermal-rounds'] ?? 0);
  const drillRounds = Math.max(0, context.bonuses.projectileModifierBonus['drill-rounds'] ?? 0);
  const shockImpact = Math.max(0, context.bonuses.projectileModifierBonus['shock-impact'] ?? 0);
  const adaptiveTargeting = Math.max(0, context.bonuses.projectileModifierBonus['adaptive-targeting'] ?? 0);
  const targetLock = Math.max(0, context.bonuses.conditionalModifierBonus['target-lock'] ?? 0);
  const radialBloom = Math.max(0, context.bonuses.patternModifierBonus['radial-bloom'] ?? 0);

  scoreDelta += tickDelayedDetonationMissiles(context.entityManager, context.deltaSeconds, delayedDetonationBonus, shockwaveBonus);

  for (const pair of context.collisions) {
    const bullet = pair.a;
    const target = pair.b;
    if (target.id === context.playerId && bullet.faction === Faction.Enemy) {
      const incomingDamage = bullet.damage ?? 1;
      if (incomingDamage > 0 && emergencyShieldBonus > 0 && !hasStatusEffect(target, 'emergency-shield-active')) {
        addOrRefreshStatusEffect(target, 'emergency-shield-active', 550 + emergencyShieldBonus * 320);
      }
      if (incomingDamage > 0 && reactiveArmourBonus > 0) {
        const retaliateRadius = 1.5 + reactiveArmourBonus * 0.25;
        const retaliateDamage = Math.max(1, reactiveArmourBonus * 0.8);
        scoreDelta += applyAreaDamage(
          context.entityManager,
          target.position.x,
          target.position.y,
          retaliateRadius,
          retaliateDamage
        );
      }
      if (incomingDamage > 0 && runtimeState.chainKillStreak > 0) {
        runtimeState = { ...runtimeState, chainKillStreak: 0 };
      }
      continue;
    }

    if (bullet.faction !== Faction.Player || target.type !== EntityType.Enemy) {
      continue;
    }

    if (bullet.sourceWeaponTag === 'proximity-mine') {
      context.entityManager.create(
        createField(target.position.x, target.position.y, 'shrapnel-cloud', Faction.Player, {
          radius: bullet.splashRadius ?? 1.5,
          fieldRadius: bullet.splashRadius ?? 1.5,
          damage: Math.max(1, (bullet.damage ?? 1) * 1.1),
          lifetimeMs: 450
        })
      );
    }

    playerHits += 1;
    const bulletDamage = bullet.damage ?? 1;
    const targetHitCount = perTargetHitMap.get(target.id) ?? 0;
    if (adaptiveTargeting > 0 && targetHitCount > 0) {
      const adaptivePercent = Math.min(150, adaptiveTargeting * targetHitCount);
      const extraDamage = Math.max(1, (bulletDamage * adaptivePercent) / 100);
      applyDamage(target, extraDamage);
      if (target.health <= 0) {
        scoreDelta += target.scoreValue ?? 0;
      }
    }
    if (targetLock > 0 && targetHitCount > 0) {
      const targetLockPercent = Math.min(120, targetLock * targetHitCount);
      const extraDamage = Math.max(1, (bulletDamage * targetLockPercent) / 100);
      applyDamage(target, extraDamage);
      if (target.health <= 0) {
        scoreDelta += target.scoreValue ?? 0;
      }
    }
    perTargetHitMap.set(target.id, Math.min(30, targetHitCount + 1));

    if (thermalRounds > 0 && target.health > 0) {
      addOrRefreshStatusEffect(
        target,
        THERMAL_BURN_EFFECT_ID,
        1200 + thermalRounds * 260,
        Math.max(1, Math.round(thermalRounds))
      );
    }
    if (drillRounds > 0 && target.radius >= 0.75) {
      addOrRefreshStatusEffect(
        target,
        DRILL_BORE_EFFECT_ID,
        900 + drillRounds * 260,
        Math.max(1, Math.round(drillRounds))
      );
    }

    if (bullet.projectileKind === 'missile') {
      const shouldArmDelayedDetonation = delayedDetonationBonus > 0 && !hasStatusEffect(bullet, DELAYED_DETONATION_EFFECT_ID);
      if (shouldArmDelayedDetonation) {
        armMissileForDelayedDetonation(bullet, target.position.x, target.position.y, delayedDetonationBonus);
      } else {
        const missileExplosionRadius = resolveMissileExplosionRadius(bullet, delayedDetonationBonus, shockwaveBonus);
        if (missileExplosionRadius > 0) {
          scoreDelta += applyAreaDamage(
            context.entityManager,
            target.position.x,
            target.position.y,
            missileExplosionRadius,
            Math.max(1, bulletDamage * 0.6),
            target.id
          );
        }
        if (shockwaveBonus > 0) {
          applyShockwaveKnockback(context.entityManager, target.position.x, target.position.y, missileExplosionRadius, shockwaveBonus);
        }
        if (bullet.splitOnImpact && bullet.splitSpec) {
          spawnSplitProjectiles(context.entityManager, bullet, target.position.x, target.position.y);
          bullet.splitOnImpact = false;
        }
      }
    } else {
      const splashRadius = bullet.splashRadius ?? 0;
      if (splashRadius > 0) {
        scoreDelta += applyAreaDamage(
          context.entityManager,
          target.position.x,
          target.position.y,
          splashRadius,
          Math.max(1, bulletDamage * 0.45),
          target.id
        );
      }
      if (bullet.splitOnImpact && bullet.splitSpec) {
        spawnSplitProjectiles(context.entityManager, bullet, target.position.x, target.position.y);
        bullet.splitOnImpact = false;
      }
    }
    if (shockImpact > 0) {
      const impactRadius = 1 + shockImpact * 0.24;
      scoreDelta += applyAreaDamage(
        context.entityManager,
        target.position.x,
        target.position.y,
        impactRadius,
        Math.max(1, bulletDamage * 0.2 * shockImpact),
        target.id
      );
    }

    if (radialBloom > 0 && target.health <= 0) {
      spawnRadialBloomProjectiles(context.entityManager, target.position.x, target.position.y, radialBloom);
    }

    if (chainReactionChance > 0 && target.health <= 0) {
      const roll = runtimeState.rng.nextFloat('trigger:chain-reaction', target.id);
      if (roll <= Math.min(1, chainReactionChance / 100)) {
        scoreDelta += applyAreaDamage(
          context.entityManager,
          target.position.x,
          target.position.y,
          2.35,
          Math.max(1, bulletDamage * 0.7),
          target.id
        );
      }
    }
  }

  const kineticEscalation = context.bonuses.weaponAmplifierBonus['kinetic-escalation'] ?? 0;
  if (kineticEscalation > 0) {
    const lastShotAtMs = runtimeState.perCardProcCooldownUntilMs.get('__last-shot-ms') ?? Number.NEGATIVE_INFINITY;
    const firedThisFrame = lastShotAtMs > context.elapsedMs - context.deltaSeconds * 1000 - 1;
    if (playerHits > 0) {
      runtimeState = { ...runtimeState, hitStreak: Math.min(40, runtimeState.hitStreak + playerHits) };
    } else if (firedThisFrame) {
      runtimeState = { ...runtimeState, hitStreak: 0 };
    }
  }

  return {
    runtimeState: {
      ...runtimeState,
      perTargetHitMap
    },
    scoreDelta
  };
}
