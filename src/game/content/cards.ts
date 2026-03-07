import type { PlayerWeaponMode } from '../weapons/playerWeapons';
import type { GameplayModifierKey, PlayerStatCardStat } from './gameplayModifiers';

export type { PlayerStatCardStat } from './gameplayModifiers';

export type CardRarity = 'common' | 'uncommon' | 'rare';

export type WeaponCardMode = PlayerWeaponMode;
export type WeaponTuningMode = PlayerWeaponMode | 'all';

export type WeaponTuningStat =
  | 'damagePercent'
  | 'fireRatePercent'
  | 'energyCostPercent'
  | 'projectileSpeedPercent';

export type CardEffect =
  | { kind: 'maxHealth'; amount: number }
  | { kind: 'weaponLevel'; weaponMode: WeaponCardMode; amount: number }
  | { kind: 'moneyMultiplier'; percent: number }
  | { kind: 'killMoneyFlat'; amount: number }
  | { kind: 'podCount'; amount: number }
  | { kind: 'podWeaponMode'; mode: 'Auto Pulse' | 'Homing Missile' }
  | { kind: 'playerStat'; stat: PlayerStatCardStat; amount: number }
  | { kind: 'modifier'; key: GameplayModifierKey; amount: number }
  | { kind: 'weaponTuning'; weaponMode: WeaponTuningMode; stat: WeaponTuningStat; amount: number };

export interface CardDefinition {
  id: string;
  name: string;
  description: string;
  rarity: CardRarity;
  tags: string[];
  cost: number;
  maxStacks: number;
  unlockRound: number;
  shopWeight: number;
  dropWeight: number;
  effects: CardEffect[];
}

export interface CardTagRequirement {
  tag: string;
  minCount: number;
}

export interface CardTagSynergyDefinition {
  id: string;
  requirements: CardTagRequirement[];
  effects: CardEffect[];
}

export interface CardRollContext {
  seed: number;
  roundIndex: number;
  foundCards: string[];
  activeCards: string[];
  consumedCards?: string[];
}

export const ACTIVE_CARD_LIMIT = 4;

export const cardCatalog: CardDefinition[] = [
  {
    id: 'reinforced-hull',
    name: 'Reinforced Hull',
    description: '+3 max health.',
    rarity: 'common',
    tags: ['defense', 'hull'],
    cost: 36,
    maxStacks: 2,
    unlockRound: 1,
    shopWeight: 1.35,
    dropWeight: 1.2,
    effects: [{ kind: 'maxHealth', amount: 3 }]
  },
  {
    id: 'pulse-overclock',
    name: 'Pulse Overclock',
    description: '+1 Auto Pulse level.',
    rarity: 'common',
    tags: ['weapon', 'pulse', 'assault'],
    cost: 44,
    maxStacks: 2,
    unlockRound: 1,
    shopWeight: 1.25,
    dropWeight: 1.05,
    effects: [{ kind: 'weaponLevel', weaponMode: 'Auto Pulse', amount: 1 }]
  },
  {
    id: 'shield-capacitor',
    name: 'Shield Capacitor',
    description: '+2 max health.',
    rarity: 'common',
    tags: ['defense', 'utility'],
    cost: 30,
    maxStacks: 2,
    unlockRound: 1,
    shopWeight: 1.25,
    dropWeight: 1.1,
    effects: [{ kind: 'maxHealth', amount: 2 }]
  },
  {
    id: 'salvage-contract',
    name: 'Salvage Contract',
    description: '+20% money from all sources.',
    rarity: 'common',
    tags: ['economy', 'utility'],
    cost: 34,
    maxStacks: 2,
    unlockRound: 1,
    shopWeight: 1.15,
    dropWeight: 1,
    effects: [{ kind: 'moneyMultiplier', percent: 20 }]
  },
  {
    id: 'laser-calibrator',
    name: 'Laser Calibrator',
    description: '+1 Continuous Laser level.',
    rarity: 'uncommon',
    tags: ['weapon', 'laser', 'precision'],
    cost: 58,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 1,
    dropWeight: 0.85,
    effects: [{ kind: 'weaponLevel', weaponMode: 'Continuous Laser', amount: 1 }]
  },
  {
    id: 'cannon-breach',
    name: 'Cannon Breach',
    description: '+1 Heavy Cannon level.',
    rarity: 'uncommon',
    tags: ['weapon', 'cannon', 'assault'],
    cost: 58,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 1,
    dropWeight: 0.85,
    effects: [{ kind: 'weaponLevel', weaponMode: 'Heavy Cannon', amount: 1 }]
  },
  {
    id: 'drone-salvager',
    name: 'Drone Salvager',
    description: '+1 money on each enemy kill.',
    rarity: 'uncommon',
    tags: ['economy', 'drone'],
    cost: 50,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 0.95,
    dropWeight: 0.8,
    effects: [{ kind: 'killMoneyFlat', amount: 1 }]
  },
  {
    id: 'satellite-bay',
    name: 'Satellite Bay',
    description: '+1 satellite pod.',
    rarity: 'uncommon',
    tags: ['pod', 'utility'],
    cost: 52,
    maxStacks: 2,
    unlockRound: 1,
    shopWeight: 1.35,
    dropWeight: 1.15,
    effects: [{ kind: 'podCount', amount: 1 }]
  },
  {
    id: 'pulse-relay',
    name: 'Pulse Relay',
    description: 'Set pods to Auto Pulse mode.',
    rarity: 'common',
    tags: ['pod', 'pulse', 'assault'],
    cost: 26,
    maxStacks: 1,
    unlockRound: 1,
    shopWeight: 1.2,
    dropWeight: 1.05,
    effects: [{ kind: 'podWeaponMode', mode: 'Auto Pulse' }]
  },
  {
    id: 'missile-command',
    name: 'Missile Command',
    description: 'Set pods to Homing Missile mode and +1 pod.',
    rarity: 'rare',
    tags: ['pod', 'missile', 'precision'],
    cost: 74,
    maxStacks: 1,
    unlockRound: 2,
    shopWeight: 0.78,
    dropWeight: 0.62,
    effects: [
      { kind: 'podWeaponMode', mode: 'Homing Missile' },
      { kind: 'podCount', amount: 1 }
    ]
  },
  {
    id: 'harmonic-tuner',
    name: 'Harmonic Tuner',
    description: '+1 Sine SMG level.',
    rarity: 'rare',
    tags: ['weapon', 'sine', 'precision'],
    cost: 72,
    maxStacks: 2,
    unlockRound: 3,
    shopWeight: 0.72,
    dropWeight: 0.62,
    effects: [{ kind: 'weaponLevel', weaponMode: 'Sine SMG', amount: 1 }]
  },
  {
    id: 'bastion-core',
    name: 'Bastion Core',
    description: '+5 max health.',
    rarity: 'rare',
    tags: ['defense', 'hull', 'core'],
    cost: 78,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.62,
    dropWeight: 0.52,
    effects: [{ kind: 'maxHealth', amount: 5 }]
  },
  {
    id: 'executive-salvage',
    name: 'Executive Salvage',
    description: '+40% money from all sources.',
    rarity: 'rare',
    tags: ['economy', 'core'],
    cost: 76,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.58,
    dropWeight: 0.48,
    effects: [{ kind: 'moneyMultiplier', percent: 40 }]
  },
  {
    id: 'tempo-injector',
    name: 'Tempo Injector',
    description: '+14% fire rate across all player weapons.',
    rarity: 'uncommon',
    tags: ['weapon', 'utility', 'assault'],
    cost: 64,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 0.92,
    dropWeight: 0.74,
    effects: [{ kind: 'weaponTuning', weaponMode: 'all', stat: 'fireRatePercent', amount: 14 }]
  },
  {
    id: 'ballistics-lab',
    name: 'Ballistics Lab',
    description: '+20% Auto Pulse projectile speed and +16% Heavy Cannon damage.',
    rarity: 'uncommon',
    tags: ['weapon', 'pulse', 'cannon'],
    cost: 68,
    maxStacks: 1,
    unlockRound: 2,
    shopWeight: 0.84,
    dropWeight: 0.68,
    effects: [
      { kind: 'weaponTuning', weaponMode: 'Auto Pulse', stat: 'projectileSpeedPercent', amount: 20 },
      { kind: 'weaponTuning', weaponMode: 'Heavy Cannon', stat: 'damagePercent', amount: 16 }
    ]
  },
  {
    id: 'signal-jammer',
    name: 'Signal Jammer',
    description: 'Future rounds unlock one extra enemy archetype and movement pattern.',
    rarity: 'uncommon',
    tags: ['utility', 'precision'],
    cost: 62,
    maxStacks: 1,
    unlockRound: 2,
    shopWeight: 0.88,
    dropWeight: 0.7,
    effects: [
      { kind: 'modifier', key: 'director.enemyArchetypeUnlocks', amount: 1 },
      { kind: 'modifier', key: 'director.patternUnlocks', amount: 1 }
    ]
  },
  {
    id: 'danger-hub',
    name: 'Danger Hub',
    description: '+25% enemies per round and +35% money from all sources.',
    rarity: 'rare',
    tags: ['economy', 'core', 'assault'],
    cost: 84,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.5,
    dropWeight: 0.42,
    effects: [
      { kind: 'modifier', key: 'director.enemyCountPercent', amount: 25 },
      { kind: 'modifier', key: 'economy.moneyMultiplierPercent', amount: 35 }
    ]
  },
  {
    id: 'hazard-beacon',
    name: 'Hazard Beacon',
    description: '+10% live spawn density and +25% enemy score value.',
    rarity: 'rare',
    tags: ['utility', 'economy', 'precision'],
    cost: 80,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.46,
    dropWeight: 0.4,
    effects: [
      { kind: 'modifier', key: 'spawn.enemyDensityPercent', amount: 10 },
      { kind: 'modifier', key: 'enemy.scorePercent', amount: 25 }
    ]
  }
];

export const cardTagSynergies: CardTagSynergyDefinition[] = [
  {
    id: 'defense-shell',
    requirements: [{ tag: 'defense', minCount: 2 }],
    effects: [{ kind: 'maxHealth', amount: 2 }]
  },
  {
    id: 'assault-tempo',
    requirements: [{ tag: 'assault', minCount: 2 }],
    effects: [{ kind: 'weaponLevel', weaponMode: 'Auto Pulse', amount: 1 }]
  },
  {
    id: 'precision-lens',
    requirements: [{ tag: 'precision', minCount: 2 }],
    effects: [{ kind: 'weaponLevel', weaponMode: 'Continuous Laser', amount: 1 }]
  },
  {
    id: 'economy-chain',
    requirements: [{ tag: 'economy', minCount: 2 }],
    effects: [{ kind: 'moneyMultiplier', percent: 15 }]
  }
];

export const cardCatalogById: Record<string, CardDefinition> = Object.fromEntries(
  cardCatalog.map((card) => [card.id, card])
);

export function resolveCard(cardId: string): CardDefinition | undefined {
  return cardCatalogById[cardId];
}

export function countCardCopies(cardId: string, foundCards: string[], activeCards: string[], consumedCards: string[] = []): number {
  let count = 0;
  for (const id of foundCards) {
    if (id === cardId) {
      count += 1;
    }
  }
  for (const id of activeCards) {
    if (id === cardId) {
      count += 1;
    }
  }
  for (const id of consumedCards) {
    if (id === cardId) {
      count += 1;
    }
  }
  return count;
}

export function canAcquireCard(cardId: string, foundCards: string[], activeCards: string[], consumedCards: string[] = []): boolean {
  const card = resolveCard(cardId);
  if (!card) {
    return false;
  }
  return countCardCopies(cardId, foundCards, activeCards, consumedCards) < card.maxStacks;
}

export function isConsumableUpgradeCard(card: CardDefinition): boolean {
  return card.effects.length > 0 && card.effects.every((effect) => effect.kind === 'maxHealth' || effect.kind === 'weaponLevel');
}

export function drawShopOffers(context: CardRollContext, count = 3): CardDefinition[] {
  return drawWeightedCards(context, 'shop', count);
}

export function drawDropCard(context: CardRollContext, salt = 0): CardDefinition | undefined {
  const cards = drawWeightedCards(context, 'drop', 1, salt);
  return cards[0];
}

function drawWeightedCards(
  context: CardRollContext,
  source: 'shop' | 'drop',
  count: number,
  salt = 0
): CardDefinition[] {
  const pool = cardCatalog
    .filter((card) => context.roundIndex >= card.unlockRound)
    .filter((card) => canAcquireCard(card.id, context.foundCards, context.activeCards, context.consumedCards ?? []));

  if (pool.length === 0 || count <= 0) {
    return [];
  }

  const picked: CardDefinition[] = [];
  const mutablePool = [...pool];
  for (let pickIndex = 0; pickIndex < count && mutablePool.length > 0; pickIndex += 1) {
    const totalWeight = mutablePool.reduce((sum, card) => sum + (source === 'shop' ? card.shopWeight : card.dropWeight), 0);
    const roll = deterministicRoll(context.seed, context.roundIndex, salt + pickIndex) * totalWeight;

    let cursor = 0;
    let selectedIndex = 0;
    for (let i = 0; i < mutablePool.length; i += 1) {
      cursor += source === 'shop' ? mutablePool[i].shopWeight : mutablePool[i].dropWeight;
      if (roll <= cursor) {
        selectedIndex = i;
        break;
      }
    }

    picked.push(mutablePool[selectedIndex]);
    mutablePool.splice(selectedIndex, 1);
  }

  return picked;
}

function deterministicRoll(seed: number, roundIndex: number, salt: number): number {
  const mixed = Math.imul((seed ^ (roundIndex * 0x9e3779b9)) + salt * 17, 0x85ebca6b) ^ 0xc2b2ae35;
  const scrambled = mixed ^ (mixed >>> 13);
  return (scrambled >>> 0) / 4294967296;
}
