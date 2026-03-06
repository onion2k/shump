import { PLAYER_WEAPON_ORDER, type PlayerWeaponMode } from '../weapons/playerWeapons';
import { drawDropCard } from '../content/cards';
import type { RunProgress } from './RunProgress';

export const BASE_ACTIVE_PICKUP_CAP = 18;
export const FOUND_CARD_LIMIT = 12;

export function foundCardsFull(runProgress: RunProgress | undefined): boolean {
  if (!runProgress) {
    return false;
  }

  return runProgress.foundCards.length >= FOUND_CARD_LIMIT;
}

export function shouldSpawnDropPickup(
  entityId: number,
  modulo: number,
  activePickups: number,
  salt: number,
  densityScale: number
): boolean {
  if (entityId % modulo !== 0) {
    return false;
  }

  const activePickupCap = Math.max(3, Math.floor(BASE_ACTIVE_PICKUP_CAP * densityScale));
  if (activePickups >= activePickupCap) {
    return false;
  }

  if (densityScale >= 0.999) {
    return true;
  }

  return deterministicRoll(entityId, salt) <= densityScale;
}

export function pickWeaponPickupMode(seed: number): PlayerWeaponMode {
  const nonDefaultModes = PLAYER_WEAPON_ORDER.slice(1);
  return nonDefaultModes[seed % nonDefaultModes.length];
}

export function pickCardDropId(runProgress: RunProgress | undefined, seed: number): string {
  if (!runProgress) {
    return 'reinforced-hull';
  }

  const card = drawDropCard({
    seed: runProgress.seed + seed * 31,
    roundIndex: runProgress.roundIndex,
    foundCards: runProgress.foundCards,
    activeCards: runProgress.activeCards,
    consumedCards: runProgress.consumedCards ?? []
  });
  return card?.id ?? 'reinforced-hull';
}

function deterministicRoll(seed: number, salt: number): number {
  const mixed = Math.imul(seed ^ (salt * 0x9e3779b9), 0x85ebca6b) ^ 0xc2b2ae35;
  const scrambled = mixed ^ (mixed >>> 13);
  return (scrambled >>> 0) / 4294967296;
}
