import {
  cardCatalog,
  cardCatalogById,
  type CardDefinition,
  type CardRollContext
} from './cardsCatalog';

export function resolveCard(cardId: string): CardDefinition | undefined {
  return cardCatalogById[cardId];
}

export function countCardCopies(
  cardId: string,
  foundCards: string[],
  activeCards: string[],
  consumedCards: string[] = []
): number {
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

export function canAcquireCard(
  cardId: string,
  foundCards: string[],
  activeCards: string[],
  consumedCards: string[] = []
): boolean {
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
